# Architecture

System architecture for the Molecular Danger Assessment Platform: principles,
layers, runtime flows, module interfaces, data contracts, type schemas, the
dependency graph, and the implementation status of every part. All interfaces and
data shapes below are transcribed from the verified source in `src/`.

This is the trunk document. It depends on `smarts-library.md` (the `HazardPattern`
contract and matching semantics) and `oxygen-balance.md` (the OB contract), and it
defines the contracts that `hazard-engine.md`, `pubchem-integration.md`,
`validation-methodology.md`, and the (planned) UI layer build on.

> **Status convention.** Each component is tagged **[BUILT]** (implemented in `src/`
> and verified against RDKit 2025.03.4) or **[PLANNED]** (contract specified here,
> code pending). The platform's engine, pattern, RDKit-adapter, service, and utility
> layers are built and verified; the UI, persistence, and worker layers are planned.

---

## 1. Architectural principles

1. **Client-side only.** No backend. All computation runs in the browser (or in Node
   for tests). The only network call is an optional, best-effort PubChem lookup. There
   is no server attack surface and no user data leaves the device by default.
2. **Engine decoupled from UI.** The chemistry — parsing, matching, scoring, oxygen
   balance, report assembly — lives in pure modules under `src/engine`, `src/patterns`,
   `src/rdkit`, `src/services`, and `src/utils`, with **no React or DOM dependency**.
   The UI is a consumer of the engine, not intertwined with it.
3. **Dependency injection over globals.** The RDKit WASM instance is **passed as an
   argument** to every function that needs it; logic modules never reach for
   `window.RDKit`. Only `rdkit/rdkitLoader.js` touches `window`. This is what makes the
   entire pipeline unit-testable in Node (see `validation-methodology.md`).
4. **Degrade, don't fabricate.** Every layer prefers an explicit "unavailable" result
   over a guessed one — invalid SMILES throws, oxygen balance returns `available:false`,
   PubChem returns an empty record on any failure. See §10.
5. **Recognition, not generation.** The system identifies hazards in user-supplied
   structures. It contains no synthesis information and no optimization surface. The
   exposure layer reports *handling stringency*, never a harm-maximization score
   (see §7, §12 of `smarts-library.md`, and `ethics-and-safety.md`).

---

## 2. Layered architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  PRESENTATION  [PLANNED]                                              │
│  React pages (Assess · Batch · Database · Compare · Analytics ·       │
│  History) · components · hooks · 2D render (SmilesDrawer) · charts    │
│  (Recharts)                                                           │
└───────────────────────────────┬─────────────────────────────────────┘
                                 │ calls loadRDKit() once, then
                                 │ assessMolecule(rdkit, smiles, exposure)
┌───────────────────────────────▼─────────────────────────────────────┐
│  ORCHESTRATION  [BUILT]                                               │
│  engine/assessMolecule.js   — runs the pipeline, owns mol lifecycle   │
└───────┬─────────────┬──────────────┬───────────────┬─────────────────┘
        │             │              │               │
┌───────▼──────┐ ┌────▼───────┐ ┌────▼─────────┐ ┌───▼──────────────┐
│ DOMAIN LOGIC │ │  PATTERNS  │ │ RDKit ADAPTER│ │   SERVICES       │
│  [BUILT]     │ │  [BUILT]   │ │  [BUILT]     │ │  pubchem [BUILT] │
│ hazardScoring│ │ explosives │ │ moleculeParser│ │ export   [PLANNED]│
│ oxygenBalance│ │ cwcAgents  │ │ smartsMatcher │ │ storage  [PLANNED]│
│ exposureCtx  │ │ toxicophore│ │ descriptors   │ └──────────────────┘
│ reportBuilder│ │ index      │ │ rdkitLoader   │
└───────┬──────┘ └────────────┘ └───────────────┘
        │
┌───────▼──────────────┐   ┌──────────────────┐   ┌────────────────────┐
│  UTILITIES  [BUILT]  │   │ PERSISTENCE       │   │ CONCURRENCY        │
│ riskLevels           │   │  [PLANNED]        │   │  [PLANNED]         │
│ validation           │   │ storage/ (forage) │   │ workers/batchWorker│
└──────────────────────┘   └──────────────────┘   └────────────────────┘
```

**Dependency rule:** arrows point downward only. Presentation may call
Orchestration; Orchestration composes Domain/Patterns/RDKit/Services; Domain uses
Utilities. Nothing below Presentation imports anything from Presentation.

---

## 3. Directory map

Target structure; status per node.

```
src/
├── app/                      [PLANNED]  React shell, routing, providers
├── pages/                    [PLANNED]  one per tab (Assess/Batch/Database/Compare/Analytics/History)
├── components/               [PLANNED]  molecule render, reports, charts, common UI
├── hooks/                    [PLANNED]  useAssessment, useHistory, usePubChem
│
├── engine/                   [BUILT]
│   ├── assessMolecule.js     orchestrator (pipeline entry point)
│   ├── hazardScoring.js      matched patterns + OB → score, level, alerts, flags
│   ├── oxygenBalance.js      OB% from atom counts (handling flag)
│   ├── exposureContext.js    exposure → handling stringency + notes
│   └── reportBuilder.js      component outputs → final report object
│
├── patterns/                 [BUILT]
│   ├── explosives.js         energetic SMARTS
│   ├── cwcAgents.js          CWC-scheduled-agent SMARTS
│   ├── toxicophores.js       toxicophore SMARTS
│   └── index.js              aggregates → allPatterns
│
├── rdkit/                    [BUILT]
│   ├── rdkitLoader.js        browser WASM singleton loader (only window-touching module)
│   ├── moleculeParser.js     get_mol wrapper, validity + error handling
│   ├── smartsMatcher.js      get_qmol + get_substruct_matches, minForCat gate
│   └── descriptors.js        amw + atom counts (copy/add_hs/get_json)
│
├── services/
│   ├── pubchem.js            [BUILT]    PUG REST lookup (best-effort)
│   ├── exportCsv.js          [PLANNED]  history → CSV
│   ├── exportJson.js         [PLANNED]  history → JSON
│   └── localDatabase.js      [PLANNED]  reference-compound store
│
├── storage/                  [PLANNED]  historyStore, databaseStore, settingsStore (localforage)
├── workers/                  [PLANNED]  batchWorker.js (off-thread batch screening)
│
└── utils/                    [BUILT]
    ├── riskLevels.js         score → danger level + color
    └── validation.js         format-level SMILES validation

tests/                        [BUILT]    fixtures + pattern suites (see validation-methodology.md)
docs/                         [BUILT]    this file and siblings
SECURITY.md                   [BUILT]
LICENSE · TERMS.md            [BUILT]
```

---

## 4. Runtime flow — single assessment  [BUILT]

```
SMILES string + exposure context
        │
        ▼
 (UI) isPlausibleSmiles(input)            utils/validation        [format gate]
        │
        ▼
 loadRDKit()  ── once, cached singleton ─ rdkit/rdkitLoader        [WASM init]
        │  rdkit instance
        ▼
 assessMolecule(rdkit, smiles, exposure, options)   engine/assessMolecule
        │
        ├─► parseMolecule(rdkit, smiles)            rdkit/moleculeParser  → mol  (throws if invalid)
        │
        ├─► matchPatterns(rdkit, mol, patterns)     rdkit/smartsMatcher   → HazardPattern[]
        │        └─ uses get_substruct_matches + minForCat gate
        │
        ├─► oxygenBalance(rdkit, mol)               engine/oxygenBalance  → { available, percent, nearZero, reliable, limitations? }
        │        └─ descriptors.getAtomCounts + getMolWeight
        │
        ├─► scoreHazards(matched, ob)               engine/hazardScoring  → { score, dangerLevel, categories, alerts, triggersEthicalWarning }
        │        └─ riskLevels.dangerLevelFor
        │
        ├─► exposureContext(exposure)               engine/exposureContext → { stringency, notes, route, population, ventilation }
        │
        ├─► lookupPubChem(smiles)  [async, optional] services/pubchem      → { available, cid, iupacName, molecularWeight, ld50 }
        │        └─ skipped if options.skipPubChem
        │
        └─► buildReport({...})                      engine/reportBuilder  → Report
        │
   finally: mol.delete()  ── always frees WASM memory
        │
        ▼
     Report  ──►  (UI) render report + 2D structure + (if triggersEthicalWarning) Schedule-1 modal + audit log
```

Key invariants:
- The **mol lifecycle is owned by `assessMolecule`** — it is created once and freed in
  a `finally`, regardless of success or error. No other layer deletes it.
- PubChem is the **only** asynchronous step and the only network call. Everything else
  is synchronous, in-process, and deterministic.
- `triggersEthicalWarning` is computed in scoring (`categories` contains
  `chemical_weapon`) and surfaced on the report; the UI is responsible for acting on it.

---

## 5. Runtime flow — batch  [PLANNED]

```
SMILES[]
   │
   │  (1) UI spawns worker; worker loads RDKit WASM, then  ── { type:'ready' } ─►  UI
   │      UI does NOT dispatch work until 'ready' arrives (avoids the cold-start race)
   ▼
   (2) UI  ── { type:'assess', smilesList, exposure } ─►  workers/batchWorker
                   │  for each SMILES: assessMolecule(rdkit, smiles, exposure, { skipPubChem:true })
                   │  ── { type:'progress', done, total } ─►  (streamed)
                   ▼
              ── { type:'result', reports: Report[] } ─►  UI (Batch tab) renders table
```

Contract (planned):
- **Handshake first.** RDKit WASM must download, instantiate, and allocate before the
  worker can accept work. The worker emits `{ type:'ready' }` only after its RDKit
  instance is compiled; the main thread holds all `assess` messages until then.
  Dispatching before `ready` would queue or drop silently — a cold-start race.
- The worker initializes its **own** RDKit instance (WASM is per-context).
- PubChem is skipped by default in batch (`skipPubChem:true`) to avoid rate limits and
  keep batch deterministic; the UI may offer opt-in enrichment.
- Progress is streamed via incremental `postMessage` so the UI thread stays responsive.

---

## 6. Module interfaces

Exact signatures, by layer. `rdkit` denotes an initialized RDKit MinimalLib instance;
`mol`/`qmol` denote RDKit molecule/query handles (WASM-backed; see §9).

### 6.1 Orchestration — `engine/assessMolecule.js`  [BUILT]

```ts
assessMolecule(
  rdkit: RDKit,
  smiles: string,
  exposure?: ExposureContext,          // default {}
  options?: {
    patterns?: HazardPattern[];        // default: allPatterns
    pubchemLookup?: (smiles: string) => Promise<PubChemResult>;  // default: lookupPubChem
    skipPubChem?: boolean;             // default: false
  }
): Promise<Report>
```

Throws if `smiles` is invalid (propagated from `parseMolecule`). Always frees the
parsed molecule.

### 6.2 Domain logic — `engine/`  [BUILT]

```ts
// hazardScoring.js
scoreHazards(matchedPatterns: HazardPattern[], ob: OxygenBalanceResult): ScoringResult

// oxygenBalance.js
oxygenBalance(rdkit: RDKit, mol: Mol): OxygenBalanceResult

// exposureContext.js
exposureContext(exposure?: ExposureContext): HandlingResult   // default {}

// reportBuilder.js
buildReport(parts: {
  smiles: string;
  scoring: ScoringResult;
  oxygenBalance: OxygenBalanceResult;
  exposure: HandlingResult;
  pubchem: PubChemResult;
}): Report
```

### 6.3 RDKit adapter — `rdkit/`  [BUILT]

```ts
// rdkitLoader.js  (the only window-touching module)
loadRDKit(): Promise<RDKit>     // cached singleton; rejects if window.initRDKitModule absent
getRDKit(): RDKit | null        // synchronous accessor; null until loaded

// moleculeParser.js
parseMolecule(rdkit: RDKit, smiles: string): Mol   // throws on invalid; caller must mol.delete()

// smartsMatcher.js
countSmartsMatches(rdkit: RDKit, mol: Mol, smarts: string): number
matchesSmarts(rdkit: RDKit, mol: Mol, smarts: string): boolean
matchPatterns(rdkit: RDKit, mol: Mol, patterns: HazardPattern[]): HazardPattern[]
  // includes a pattern iff countSmartsMatches >= (pattern.minForCat || 1)

// descriptors.js
getMolWeight(rdkit: RDKit, mol: Mol): number | null          // amw, fallback exactmw
getAtomCounts(rdkit: RDKit, mol: Mol): { C, H, N, O, other: string[] } | null
  // `other` = element symbols outside C/H/N/O (drives OB reliability)
```

### 6.4 Services — `services/`

```ts
// pubchem.js  [BUILT]
lookupPubChem(
  smiles: string,
  opts?: { fetchImpl?: typeof fetch }   // injectable for tests
): Promise<PubChemResult>

// exportCsv.js / exportJson.js  [PLANNED]
exportCsv(history: Report[]): string
exportJson(history: Report[]): string

// localDatabase.js  [PLANNED]
listReferenceCompounds(): ReferenceCompound[]
```

### 6.5 Utilities — `utils/`  [BUILT]

```ts
// riskLevels.js
DANGER_LEVELS: readonly ['MINIMAL','LOW','MODERATE','HIGH','CRITICAL']
dangerLevelFor(score: number): DangerLevel
dangerColorFor(score: number): string   // Tailwind bg-* class

// validation.js
isPlausibleSmiles(input: string): boolean   // non-empty, ≤1000 chars, no whitespace
```

### 6.6 Patterns — `patterns/`  [BUILT]

```ts
allPatterns: HazardPattern[]                 // default export + named
explosives | cwcAgents | toxicophores: HazardPattern[]
```

### 6.7 Persistence & concurrency — `storage/`, `workers/`  [PLANNED]

```ts
// storage/historyStore.js
addHistoryEntry(report: Report): Promise<void>
getHistory(): Promise<Report[]>
clearHistory(): Promise<void>

// storage/settingsStore.js
getSettings(): Promise<Settings>
saveSettings(s: Settings): Promise<void>

// workers/batchWorker.js   (message protocol)
// ← { type: 'ready' }                                            (worker: WASM compiled)
// → { type: 'assess', smilesList: string[], exposure: ExposureContext }
// ← { type: 'progress', done: number, total: number }
// ← { type: 'result', reports: Report[] }
```

---

## 7. Core types & schemas

The canonical data contracts. These are the source of truth for the UI and for any
external contributor.

### 7.1 Inputs

```ts
type HazardCategory = 'explosive' | 'chemical_weapon' | 'toxin';
type Severity       = 'low' | 'moderate' | 'high' | 'critical';
type DangerLevel    = 'MINIMAL' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
type Stringency     = 'minimal' | 'moderate' | 'high' | 'critical';
// NOTE: exposureContext currently emits only 'moderate' | 'high'. The wider domain
// is declared now so adding handling levels later is not a breaking schema change.

interface HazardPattern {          // see smarts-library.md §2 for full semantics
  smarts: string;
  label: string;
  cat: HazardCategory;
  severity: Severity;
  countMult: number;               // additive, register-once (NOT × occurrence count)
  mech: string;
  minForCat?: number;              // occurrence threshold, default 1
}

interface ExposureContext {
  route?: 'inhalation' | 'injection' | 'ingestion' | 'dermal';  // default 'inhalation'
  population?: string;             // 'adult_healthy' (default) or any sensitive-population label
  ventilation?: 'moderate' | 'poor' | 'none' | string;          // default 'moderate'
}
```

### 7.2 Intermediate results

```ts
interface OxygenBalanceResult {    // engine/oxygenBalance.js
  available: boolean;              // false ⇒ counts/MW unavailable
  percent: number | null;         // OB% to 1 decimal, or null
  nearZero: boolean;              // |percent| < 60 when available, else false
  reliable: boolean;              // false ⇒ molecule has non-CHNO atoms the formula ignores
  limitations?: string[];         // present iff !reliable; explains why
}

interface Alert {
  label: string;
  cat: HazardCategory;
  severity: Severity;
  mech: string;
}

interface ScoringResult {          // engine/hazardScoring.js
  score: number;                   // 0–1, 3 decimals, clamped ≤ 1.0
  dangerLevel: DangerLevel;
  categories: HazardCategory[];
  alerts: Alert[];
  triggersEthicalWarning: boolean; // true iff categories includes 'chemical_weapon'
}

interface HandlingResult {         // engine/exposureContext.js
  stringency: Stringency;
  notes: string[];
  route: string;                   // resolved exposure scenario, echoed into the Report
  population: string;
  ventilation: string;
}

interface PubChemResult {          // services/pubchem.js
  available: boolean;
  cid: number | null;
  iupacName: string | null;
  molecularWeight: number | string | null;
  ld50: string | null;
}
```

### 7.3 The Report (central output schema)

The single object the engine produces and the UI consumes. Produced by
`buildReport`; this is the contract the entire UI layer renders against.

```ts
interface Report {
  smiles: string;                  // trimmed input
  timestamp: string;               // ISO 8601

  // --- intrinsic molecular hazard ---
  dangerLevel: DangerLevel;
  score: number;                   // 0–1
  categories: HazardCategory[];
  alerts: Alert[];
  triggersEthicalWarning: boolean;

  oxygenBalance: {                 // full OB result — UI sees the flag that drove scoring
    available: boolean;            // false ⇒ counts/MW unavailable
    percent: number | null;
    nearZero: boolean;
    reliable: boolean;             // false ⇒ non-CHNO molecule; percent is approximate
    limitations: string[] | null;  // reason when !reliable, else null
  };

  // --- handling guidance (separate from hazard score) ---
  handling: {
    stringency: Stringency;
    notes: string[];
    route: string;                 // resolved exposure scenario that generated the guidance
    population: string;
    ventilation: string;
  };

  // --- external cross-reference ---
  reference: {
    cid: number | null;
    iupacName: string | null;
    molecularWeight: number | string | null;
    ld50: string | null;
    source: 'PubChem' | null;      // null when no PubChem record
  };
}
```

> **Design note (carried from `smarts-library.md`):** `score`/`dangerLevel` are
> properties of the **molecule**. `handling` is a property of the **exposure
> scenario**. They are deliberately separate fields — exposure never modifies the
> hazard score. This is the structural guarantee that the tool reports "how careful to
> be," not "how to do the most harm."

> **Schema note (deferred, per review):** the hazard fields (`dangerLevel`, `score`,
> `categories`, `alerts`, `triggersEthicalWarning`) sit at the top level while
> `oxygenBalance`, `handling`, and `reference` are nested objects. The asymmetry is
> **intentional for now**. Grouping the hazard fields under a `hazard: {…}` block would
> be cleaner, but it is a breaking change reserved for a deliberate **schema-version
> pass**, not a silent edit — the current shape is internally consistent and the UI is
> not yet built against it. The `oxygenBalance.limitations` field is `string[] | null`
> on the Report (always present) even though the internal `OxygenBalanceResult` makes
> it optional, so the UI can read it without an existence check.

### 7.4 Reference compound (Database tab)

```ts
interface ReferenceCompound {      // see smarts-library.md §6 for the full set
  name: string;
  smiles: string;
  cas: string;
  tag: 'safe' | 'low_risk' | 'moderate' | 'carcinogen' | 'toxic_acute'
     | 'explosive' | 'chemical_weapon';   // display tag; not an engine category
}
```

---

## 8. Dependency graph

### 8.1 Internal module DAG  [BUILT]

```
assessMolecule
   ├── moleculeParser            (rdkit/)
   ├── smartsMatcher             (rdkit/)
   ├── oxygenBalance  ──► descriptors   (rdkit/)
   ├── hazardScoring  ──► riskLevels    (utils/)
   ├── exposureContext           (pure)
   ├── reportBuilder             (pure)
   ├── pubchem                   (services/)
   └── patterns/index ──► explosives, cwcAgents, toxicophores

rdkitLoader        (standalone; called by UI/entry, not imported by logic modules)
validation         (standalone; called by UI input layer)
```

Acyclic. Leaf, pure modules: `exposureContext`, `reportBuilder`, `descriptors`,
`riskLevels`, `validation`, and all `patterns/*`. The graph has a single entry point
(`assessMolecule`) for the full pipeline, and the `rdkit/*` helpers can also be used
individually.

### 8.2 The injection seam

The RDKit instance is **threaded through as a parameter**, never imported by logic:

```
rdkitLoader.loadRDKit()  ──► rdkit instance ──► assessMolecule(rdkit, …)
                                                     └─► parseMolecule(rdkit, …)
                                                     └─► matchPatterns(rdkit, …)
                                                     └─► oxygenBalance(rdkit, …) ─► descriptors(rdkit, …)
```

Consequence: in tests, a Node-initialized RDKit instance is passed in directly — no
browser, no `window`, no mocking. `pubchem.lookupPubChem` similarly accepts an injected
`fetchImpl`. This is the property that let the engine be verified end-to-end in Node
(see `validation-methodology.md`).

### 8.3 External dependencies

| Dependency | Layer | Role | Status |
| --- | --- | --- | --- |
| RDKit.js (WASM) | rdkit/ | Parsing, SMARTS matching, descriptors | [BUILT] |
| SmilesDrawer | presentation | 2D structure rendering | [PLANNED] |
| Recharts | presentation | Radar/trend charts | [PLANNED] |
| localforage | storage/ | IndexedDB persistence | [PLANNED] |
| PubChem PUG REST | services/ | External compound data (best-effort) | [BUILT] |
| React + Tailwind | presentation | UI | [PLANNED] |
| Vite | build | Dev server / bundler | n/a |
| Vitest + @rdkit/rdkit | tests | Node test runner + RDKit-in-Node | [BUILT] |

---

## 9. RDKit adapter contract

The RDKit.js MinimalLib API differs from the Python RDKit API. These behaviors are
**verified against RDKit 2025.03.4** and are the reason the adapter layer exists as a
thin, single point of contact.

| Need | Correct RDKit.js call | Notes / pitfalls |
| --- | --- | --- |
| Parse SMILES | `rdkit.get_mol(smiles)` | Returns a mol; check `is_valid()`. Sanitizes (normalizes nitro groups). |
| Compile SMARTS | `rdkit.get_qmol(smarts)` | Query molecule; check `is_valid()`. |
| Substructure test | `mol.get_substruct_matches(qmol)` | **`has_substruct_match()` does not exist.** Returns a JSON array string; `"{}"` when none. |
| Molecular weight | `JSON.parse(mol.get_descriptors()).amw` | **`get_exact_mw()` does not exist.** `amw` = average; `exactmw` = monoisotopic. |
| Atom counts | `mol.copy()` → `add_hs_in_place()` → `get_json()` | `get_descriptors()` has **no per-element counts**. Carbon atoms omit `z`; fall back to `defaults.atom.z = 6`. |

### Memory management

RDKit.js objects are WASM-backed and **must be explicitly freed**:
- `parseMolecule` returns a mol the **caller** must `delete()`. `assessMolecule` does
  this in a `finally`.
- `smartsMatcher` frees every `get_qmol` result in a `finally`.
- `descriptors.getAtomCounts` frees its working **copy** (`mol.copy()`) in a `finally`,
  leaving the caller's mol untouched.

The original monolith leaked molecules (never called `delete`); the adapter closes that.

---

## 10. Error handling & degradation contracts

System-wide posture: **prefer an explicit absence over a fabricated value.**

| Layer | Failure | Behavior |
| --- | --- | --- |
| Input | Whitespace / empty / >1000 chars | `isPlausibleSmiles` returns `false`; UI blocks before parsing. |
| Parse | Invalid SMILES | `parseMolecule` **throws** `Invalid SMILES: …`; `assessMolecule` propagates (and still frees any partial mol). |
| Match | Bad SMARTS / invalid qmol | `countSmartsMatches` returns `0` (pattern simply doesn't register). |
| Oxygen balance | Counts/MW unobtainable | `oxygenBalance` returns `{ available:false, … reliable:false }`; report carries the object (UI keys off `available`). |
| Oxygen balance | Non-CHNO molecule (S, P, halogens, metals) | Value is computed but `reliable:false` with a `limitations` reason; the score flag is **not** applied (scoring requires `reliable`). UI shows it as approximate, not authoritative. |
| PubChem | Any network/parse error, or no CID | `lookupPubChem` returns the empty record (`available:false`); assessment proceeds offline. Toxicity sub-lookup failure is swallowed (LD50 stays `null`). |
| Scoring | (none — pure) | Score clamped to ≤ 1.0. |

The orchestrator surfaces only one failure mode to the caller: a thrown error for an
unparseable structure. Everything else degrades gracefully into a complete report with
`null`/`unavailable` fields.

---

## 11. State & persistence  [PLANNED]

No global application state in the engine — it is pure and stateless. Persistence is a
UI/storage concern, planned via `localforage` (IndexedDB):

| Store | Contents | Key shape (proposed) |
| --- | --- | --- |
| `historyStore` | Past `Report` objects | `history:<timestamp>:<uuid>` |
| `databaseStore` | User-added `ReferenceCompound`s | `compound:<cas>` |
| `settingsStore` | UI/scan preferences | `settings:current` |

History is exportable to CSV/JSON via the planned `services/export*`. All persistence
is local to the device; nothing is uploaded.

> **Key uniqueness (per review):** history keys carry a `<uuid>` suffix because batch
> screening writes many reports within the same millisecond — a bare `<timestamp>` key
> would overwrite and silently lose entries. A UUID (not a SMILES hash) is used so that
> assessing the *same* compound twice yields two distinct history entries.

---

## 12. Concurrency model  [PLANNED]

The single-assessment pipeline is synchronous apart from the optional PubChem call.
Batch screening (the **Batch** tab) is offloaded to a Web Worker (`workers/batchWorker`)
so large datasets do not block the UI thread. WASM instances are per-context, so the
worker initializes its own RDKit. See §5 for the message protocol.

---

## 13. Build, runtime & deployment

- **Build:** Vite + React. `npm i lucide-react recharts localforage`; dev/test add
  `@rdkit/rdkit vitest`.
- **RDKit/SmilesDrawer in the browser:** loaded via `<script>` tags in `index.html`
  (RDKit exposes `window.initRDKitModule`, consumed by `rdkitLoader`).
- **Runtime:** a static single-page app. No server, no database, no auth. Deployable to
  any static host or CDN.
- **Tests:** Vitest in Node, with RDKit initialized via `@rdkit/rdkit`
  (`import initRDKitModule from '@rdkit/rdkit'; await initRDKitModule()` — verified
  working in Node 22). See `validation-methodology.md`.

---

## 14. Extension points

| To extend… | Where | Reference |
| --- | --- | --- |
| Add/edit a hazard signature | `src/patterns/*` + fixtures | `smarts-library.md` §11 |
| Tune scoring weights / level thresholds | pattern `countMult`; `utils/riskLevels.js` | `hazard-engine.md` |
| Add a hazard category | engine categories + downstream effect | `smarts-library.md` §3 (decision noted there) |
| Adjust the OB handling threshold | `engine/oxygenBalance.js` (`nearZero`) | `oxygen-balance.md` §3 |
| Add reference compounds | `services/localDatabase.js` / Database tab | `smarts-library.md` §6 |
| Change exposure handling guidance | `engine/exposureContext.js` | this doc §7.2 |

The engine is deliberately small and stable so these extensions are local changes, not
rewrites — the chemistry engine never becomes a monolith again.

---

## 15. Implementation status matrix

| Layer / module | Status | Verified |
| --- | --- | --- |
| `engine/*` (orchestrator, scoring, OB, exposure, report) | **BUILT** | end-to-end against RDKit 2025.03.4 |
| `patterns/*` (9 live signatures + aggregator) | **BUILT** | detection + no-false-positive checks pass |
| `rdkit/*` (loader, parser, matcher, descriptors) | **BUILT** | API + memory behavior verified |
| `services/pubchem.js` | **BUILT** | injectable fetch; best-effort contract |
| `utils/*` (riskLevels, validation) | **BUILT** | used across the pipeline |
| `tests/*` (fixtures + pattern suites) | **BUILT** | calibration + detection verified |
| `services/export*`, `services/localDatabase` | **PLANNED** | contracts specified §6.4 |
| `storage/*` | **PLANNED** | contracts specified §6.7, §11 |
| `workers/batchWorker` | **PLANNED** | protocol specified §5, §6.7 |
| `app/`, `pages/`, `components/`, `hooks/` (UI) | **PLANNED** | renders the §7.3 Report contract |

---

## 16. Cross-references

- **`smarts-library.md`** — `HazardPattern` contract, full signature catalog, matching semantics, reference compounds.
- **`oxygen-balance.md`** — OB formula, calibration, computation method, degradation contract.
- **`hazard-engine.md`** *(next)* — scoring path, danger-level derivation, the ethical-warning trigger, weight tuning.
- **`pubchem-integration.md`** *(next)* — PUG REST endpoints, response shapes, failure modes.
- **`validation-methodology.md`** *(next)* — fixtures, RDKit-in-Node setup, the pre-declare-success-and-failure discipline.
- **`ethics-and-safety.md`** *(next)* — recognition-not-generation posture, the exposure-layer rewrite, Schedule-1 handling.
- **`SECURITY.md`** — responsible disclosure; detection-gap reporting.
