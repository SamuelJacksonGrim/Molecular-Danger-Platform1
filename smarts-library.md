# SMARTS Library

Complete recognition-pattern catalog for the Molecular Danger Assessment Platform.
This document is self-contained: every signature, weight, reference compound, and
matching rule the platform uses is defined here. Every SMARTS pattern below has
been verified against **RDKit 2025.03.4**.

> **Posture.** This is the platform's *recognition* layer. Every pattern is a
> substructure **query** that identifies a known hazardous motif in a structure the
> user supplies. Patterns recognize; they do not generate, propose, or optimize
> anything. All signatures correspond to structures already enumerated in public
> literature, and for the CWC entries, in the public Chemical Weapons Convention
> schedules. See `ethics-and-safety.md` and `TERMS.md`.

---

## 1. Status tokens

Each catalog entry carries one status:

| Token | Meaning |
| --- | --- |
| `IN CODE` | Implemented in `src/patterns/` now; verified to match its target. |
| `READY` | Verified working SMARTS; not yet in code. Drop-in candidate (add with fixtures, §11). |
| `UNVERIFIED` | Parses, but not confirmed against a canonical target. Do not rely on coverage. |

Source files: patterns in `src/patterns/{explosives,cwcAgents,toxicophores}.js`,
aggregated by `src/patterns/index.js`; matching in `src/rdkit/smartsMatcher.js`.

---

## 2. The `HazardPattern` contract

Every catalog entry is one object of this shape:

```ts
interface HazardPattern {
  smarts: string;          // SMARTS recognition pattern (substructure query)
  label: string;           // human-readable display name
  cat: HazardCategory;     // category this motif belongs to
  severity: Severity;      // qualitative severity of the motif
  countMult: number;       // 0–1 contribution to the hazard score when it registers
  mech: string;            // one-line mechanism / why the motif is hazardous
  minForCat?: number;      // min occurrences required to register (default 1)
}

type HazardCategory = 'explosive' | 'chemical_weapon' | 'toxin';
type Severity        = 'low' | 'moderate' | 'high' | 'critical';
```

| Field | Required | Semantics |
| --- | --- | --- |
| `smarts` | yes | The query. Must parse under `get_qmol`. **No whitespace** (§4). |
| `label` | yes | Shown in the report; used as the test assertion key. |
| `cat` | yes | Drives categorization and downstream triggers (§3). |
| `severity` | yes | Display/sort signal. Does **not** itself change the score. |
| `countMult` | yes | Added **once** to the score when the pattern registers (not multiplied by occurrence count). Score clamped ≤ 1.0 in `hazardScoring.js`. |
| `mech` | yes | Plain-language mechanism for the report. |
| `minForCat` | no | Occurrence threshold; the pattern registers only if it matches **at least** this many times. Default `1`. |

> **Contract note for `architecture.md`:** `countMult` is additive and
> register-once; occurrence count feeds **only** the `minForCat` gate, never a score
> multiplier.

---

## 3. Category taxonomy

### Engine categories (acted upon)

| `cat` | Meaning | Downstream effect |
| --- | --- | --- |
| `explosive` | Energetic / detonation-capable motif | Contributes to score; eligible for the oxygen-balance handling flag. |
| `chemical_weapon` | CWC-scheduled agent core | Contributes to score **and** sets `triggersEthicalWarning: true` → Schedule-1 warning modal + audit-log entry. The only category that does this. |
| `toxin` | Toxicophore / toxic functional group | Contributes to score. |

The reference-compound set (§6) also uses display-only tags — `safe`, `low_risk`,
`moderate`, `carcinogen`, `toxic_acute` — that classify whole molecules but do **not**
drive the scoring engine. A pattern must use one of the three engine categories
above. If `carcinogen`/`toxic_acute` granularity is wanted for patterns later,
`architecture.md` must define a downstream effect for each before it means anything;
until then, map such motifs to `toxin`.

`severity` (`low`→`moderate`→`high`→`critical`) is a separate display/sort signal; the
numeric danger **level** (`MINIMAL`…`CRITICAL`) is derived from the summed `countMult`
by `src/utils/riskLevels.js`. See `hazard-engine.md`.

---

## 4. SMARTS syntax reference

| Construct | Meaning | Example |
| --- | --- | --- |
| Uppercase element | **Aliphatic** atom | `C` = aliphatic carbon |
| Lowercase element | **Aromatic** atom | `c` = aromatic carbon |
| `[ ]` | Atom with constraints | `[N+]` = positively charged N |
| `+` / `-` | Formal charge | `[O-]` |
| `=` `#` | Double / triple bond | `C=O`, `C#N` |
| `[NX3]` | Atom with N **connections** (degree) | `[NX3]` = 3-connected N |
| `[N;!R]` | N **not** in a ring | excludes ring nitrogens |
| `[C,N]` | C **or** N (atom list) | matches either |
| `[O;H0]` | O with **zero** attached H | excludes O–H |
| `( )` | Branch | `P(=O)(C)F` |

**The whitespace footgun:** a space terminates a SMARTS string — everything after the
first space is discarded. This bit the mustard signature (`ClCCSC CCl` was parsed as
just `ClCCSC`, which still matched mustard but as a shorter, over-broad fragment).
Keep every pattern whitespace-free; `src/utils/validation.js` rejects whitespace in
user input for the same reason.

---

## 5. Signature catalog

All patterns verified against RDKit 2025.03.4. Weights marked *(suggested)* on
`READY` entries are starting values — tune against your scoring goals.

### 5.1 Explosives — `cat: 'explosive'`

| Motif | SMARTS | severity | `countMult` | `minForCat` | Status | Verified against |
| --- | --- | --- | --- | --- | --- | --- |
| Nitro group | `[N+](=O)[O-]` | high | 0.20 | 2 | `IN CODE` | TNT (3), nitroglycerin (3); matches neutral `N(=O)=O` too |
| Peroxide | `[O][O]` | high | 0.30 | 1 | `IN CODE` | hydrogen peroxide (1) |
| Azide | `[N-]=[N+]=[N]` | critical | 0.40 | 1 | `IN CODE` | organic/inorganic azides |
| Nitramine | `N[N+](=O)[O-]` | high | 0.35 *(suggested)* | 1 | `READY` | RDX (3), HMX (4) |
| Polynitro (aromatic) | `c[N+](=O)[O-]` | high | 0.30 *(suggested)* | 2 | `READY` | TNT (3), picric acid (3); mononitro excluded by threshold |
| Aliphatic nitrate | `CO[N+](=O)[O-]` | high | 0.30 *(suggested)* | 1 | `READY` | nitroglycerin, PETN |
| Fulminate | `[C-]#[N+][O-]` | critical | 0.45 *(suggested)* | 1 | `READY` | metal fulminates |
| Organic peroxide | `[O;H0][O;H0]` | high | 0.30 *(suggested)* | 1 | `READY` | R-O-O-R peroxides — **not** H₂O₂ (the O–H disqualifies it) |

Notes:
- **Nitro** matches both charge-separated and neutral input; RDKit normalizes nitro on
  sanitization. `minForCat: 2` means a single nitro does not register — polynitro does.
- **Polynitro (aromatic)** is more specific than nitro-with-threshold: it fires only on
  *aromatic*-ring nitro groups, so it won't trigger on aliphatic polynitro. The live
  nitro pattern already flags TNT via its own `minForCat: 2`, so this entry is optional
  precision, not a gap-filler.
- **Organic peroxide** and the live **Peroxide** cover different scopes: `[O][O]` catches
  H₂O₂ and organic peroxides; `[O;H0][O;H0]` catches only substituted peroxides. Keep
  both only if you want to distinguish them.

### 5.2 CWC-scheduled agents — `cat: 'chemical_weapon'`

All entries set `triggersEthicalWarning`.

| Motif | SMARTS | severity | `countMult` | Status | Verified against |
| --- | --- | --- | --- | --- | --- |
| G-agent core | `P(=O)(C)F` | critical | 0.60 | `IN CODE` | Sarin (1) |
| V-agent | `P(=O)(C)SCCN` | critical | 0.70 | `IN CODE` | VX (1) |
| Mustard (vesicant) | `ClCCSCCCl` | critical | 0.50 | `IN CODE` | sulfur mustard (1) |
| G-agent core (broad) | `P(=O)([C,N])F` | critical | 0.65 *(suggested)* | `READY` | Sarin (1); superset — also catches N-substituted phosphoramidofluoridates |
| V-agent (broad) | `P(=O)([C,N])SCCN` | critical | 0.70 *(suggested)* | `READY` | VX (1); superset of the in-code V pattern |
| Novichok (A-series) | `N=P(F)(O)[C,N]` | critical | 0.70 *(suggested)* | `UNVERIFIED` | parses; no confirmed canonical target — A-series structures are contested and sensitive |

Note: the broad G/V variants are strict supersets of the in-code forms. If you adopt
them, replace the narrow versions rather than running both (they would double-count).

### 5.3 Toxicology — `cat: 'toxin'`

| Motif | SMARTS | severity | `countMult` | Status | Verified against |
| --- | --- | --- | --- | --- | --- |
| Isocyanate | `N=C=O` | high | 0.30 | `IN CODE` | methyl isocyanate (1) |
| N-Nitrosamine | `[NX3][NX2]=O` | high | 0.25 | `IN CODE` | NDMA (1) |
| Organophosphate / thiophosphate | `P(=S)(O)O` | high | 0.30 | `IN CODE` | diethyl thiophosphate (3) |
| Cyanide / nitrile | `[C,c]#[N]` | high | 0.30 *(suggested)* | `READY` | hydrogen cyanide (1), nitriles |
| Polycyclic aromatic (PAH) | `c1ccc2c(c1)ccc3ccccc23` | moderate | 0.20 *(suggested)* | `READY` | benzo[a]pyrene (3); does **not** match 3-ring PAHs (anthracene) |
| Dithiocarbamate | `[S,N,O]C(=S)N` | moderate | 0.20 *(suggested)* | `READY` | thiram-class chelators (2) |

Note: `N-N=O` is a simpler equivalent of the in-code nitrosamine pattern
`[NX3][NX2]=O`; both match NDMA. Cyanide can also be treated as a CWC Schedule-3 agent;
it is catalogued here as a metabolic toxin.

---

## 6. Reference compound database

The platform's curated reference standards — full molecules (not SMARTS queries) that
populate the **Database** tab and the comparison reference set.

| Compound | SMILES | CAS | Tag |
| --- | --- | --- | --- |
| Water | `O` | 7732-18-5 | safe |
| Ethanol | `CCO` | 64-17-5 | low_risk |
| Glucose | `C(C1C(C(C(C(O1)O)O)O)O)O` | 50-99-7 | safe |
| Caffeine | `CN1C=NC2=C1C(=O)N(C(=O)N2C)C` | 58-08-2 | low_risk |
| Benzene | `c1ccccc1` | 71-43-2 | carcinogen |
| Formaldehyde | `C=O` | 50-00-0 | carcinogen |
| Toluene | `Cc1ccccc1` | 108-88-3 | moderate |
| Acrolein | `C=CC=O` | 107-02-8 | toxic_acute |
| TNT | `Cc1c(cc(cc1[N+](=O)[O-])[N+](=O)[O-])[N+](=O)[O-]` | 118-96-7 | explosive |
| RDX | `[O-][N+](=O)N1CN([N+](=O)[O-])CN([N+](=O)[O-])C1` | 121-82-4 | explosive |
| Nitroglycerin | `C(CO[N+](=O)[O-])(CO[N+](=O)[O-])O[N+](=O)[O-]` | 55-63-0 | explosive |
| Hydrogen cyanide | `C#N` | 74-90-8 | toxic_acute |
| Mustard gas | `ClCCSCCCl` | 505-60-2 | chemical_weapon |
| Sarin | `CC(C)OP(=O)(C)F` | 107-44-8 | chemical_weapon |
| VX | `CCOP(=O)(C)SCCN(C(C)C)C(C)C` | 50782-69-9 | chemical_weapon |

> RDX and nitroglycerin SMILES above are the **corrected** forms — RDX as a fully
> charge-separated cyclic nitramine (matches the nitramine pattern, 3×), and
> nitroglycerin as glyceryl trinitrate with all three groups as O-nitrate esters
> (matches the aliphatic-nitrate pattern, 3×). The original prototype encoded RDX with
> neutral nitro and nitroglycerin with one carbon-bonded nitro; both are fixed here.

---

## 7. Matching semantics (verified RDKit.js API)

`src/rdkit/smartsMatcher.js` runs the catalog. Behavior confirmed against RDKit
2025.03.4:

- **`has_substruct_match()` does not exist** on the MinimalLib mol object — calling it
  throws. (The original matcher did this and silently returned `false` for everything.)
- Real calls: `mol.get_substruct_match(qmol)` → JSON string (`"{}"` = no match);
  `mol.get_substruct_matches(qmol)` → JSON array of all matches (`"{}"` = none).

The matcher uses the **plural** form so occurrence counts drive `minForCat`:

```js
function countSmartsMatches(rdkit, mol, smarts) {
  const qmol = rdkit.get_qmol(smarts);
  // validity check; return 0 if invalid
  const arr = JSON.parse(mol.get_substruct_matches(qmol));
  return Array.isArray(arr) ? arr.length : 0;   // "{}" → 0
  // qmol.delete() in finally
}

matchPatterns = patterns.filter(
  (p) => countSmartsMatches(rdkit, mol, p.smarts) >= (p.minForCat || 1)
);
```

**Memory:** every `get_qmol` result and parsed `mol` is freed with `.delete()`; RDKit.js
objects hold WASM memory and leak otherwise.

---

## 8. Oxygen-balance interaction

Energetic (`explosive`) matches are eligible for an oxygen-balance handling flag.
Oxygen balance is computed from atom counts, and a near-zero value is reported as a
storage/handling signal (a self-oxidizing energetic), **not** as an energetics design
output. Full method, formula, and worked examples are in `oxygen-balance.md`.

---

## 9. Corrections (verified former errors)

Captured here so the history lives in the document, not in version control:

1. **Nitro is not charge-form-sensitive.** `[N+](=O)[O-]` matches both charge-separated
   and neutral `N(=O)=O` input — RDKit normalizes nitro on sanitization. (An earlier
   "charge-separated only" claim was wrong.)
2. **The mustard space bug was a specificity loss, not a miss.** `ClCCSC CCl` truncated
   to `ClCCSC`, which still matched mustard (2×) and would false-positive on any
   Cl-C-C-S-C fragment. Closing the space restored the specific match (1×).
3. **Nitramine — fixed.** The form `[N;!R]-[N+](=O)[O-]` (originally labeled "RDX/HMX")
   excludes ring nitrogens and therefore **misses cyclic nitramines** — i.e. RDX and HMX
   themselves (0 matches). Replaced with `N[N+](=O)[O-]`, which matches RDX (3) and
   HMX (4).
4. **Polynitro aromatic — fixed.** A hard-coded trinitrobenzene ring
   (`c1(N(=O)=O)cc(N(=O)=O)cc(N(=O)=O)c1`) **misses TNT** (the methyl breaks the ring
   match). Replaced with `c[N+](=O)[O-]` + `minForCat: 2`, which matches TNT and picric
   acid (3 each) and excludes mononitroaromatics.

### Standing limitations

- **`minForCat: 2` on nitro misses mononitro.** Nitromethane (1 nitro) won't register as
  explosive. Lower to `1` to catch them, at a precision cost.
- **Coarse substructure recognition.** A match means the motif is present; a benign
  molecule embedding a recognized fragment can false-positive, and **absence of a match
  is not a guarantee of safety** — coverage is limited to this catalog.

---

## 10. Promotion roadmap

`READY` entries verified above, recommended for implementation in priority order:

1. **Nitramine** `N[N+](=O)[O-]` — closes the RDX/HMX gap (high-value, common energetics).
2. **Broad G/V** `P(=O)([C,N])…` — replace the narrow in-code forms for better recall.
3. **Cyanide** `[C,c]#[N]` — common acute toxin, cheap and reliable.
4. **Aliphatic nitrate**, **Fulminate**, **PAH**, **Dithiocarbamate** — solid, lower urgency.
5. **Polynitro (aromatic)** — optional precision over the existing nitro+threshold.
6. **Novichok** — hold until a canonical target verifies it.

Each promotion follows §11 (object + fixtures + run suite).

---

## 11. Adding or editing a pattern

1. Choose the right `src/patterns/` file (or add a category module + wire `index.js`).
2. Author the `HazardPattern` object (§2). Whitespace-free `smarts`.
3. **Add validation fixtures (mandatory):** a known **positive** that must match, and
   confirmation the safe set still yields zero matches.
4. Run the suite (see `validation-methodology.md`). A signature without a known-positive
   fixture is treated like an untested control.

> Discipline: pre-declare what the pattern **must** match *and* **must not**. A green
> result only means something if a red one was possible — §9 shows that several
> originally-documented patterns were red.

---

## 12. Validation cross-reference

| Pattern set | Fixture | Expectation |
| --- | --- | --- |
| Explosives (live) | `tests/fixtures/knownEnergetics.json` | flag `cat: 'explosive'` |
| CWC (live) | `tests/fixtures/scheduledAgents.json` | flag `cat: 'chemical_weapon'` |
| Toxicophores (live) | inline in `tests/patterns/toxicophores.test.js` | flag expected `label` |
| Negative controls | `tests/fixtures/knownSafe.json` | **zero** matches across `allPatterns` |

Runner setup and the RDKit-in-Node init form live in `validation-methodology.md`.

---

## 13. Provenance and safety

Every signature is a recognition key for an already-public structure — energetic groups
from general chemistry, toxicophores from the published structural-alert literature, CWC
cores from the public Convention schedules. The catalog contains **no synthesis
information**, no routes, and no optimization surface; it answers only "is this
known-hazardous motif present?" Edits that weaken or obscure recognition, or repurpose
the catalog toward anything other than hazard detection, are out of scope. See
`ethics-and-safety.md` and `TERMS.md`.
