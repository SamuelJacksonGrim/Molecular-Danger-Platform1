# Molecular Danger Assessment Platform

**A client-side cheminformatics tool for chemical hazard recognition and safety education.**

Author: Samuel Jackson Grim ("Architect of Resonance") · License: see [`LICENSE`](./LICENSE) · Terms of use: see [`TERMS.md`](./TERMS.md)

---

## What it is

The Molecular Danger Assessment Platform takes a chemical structure (as a SMILES string) and returns a structured hazard assessment: which known hazardous substructures it contains, an oxygen-balance estimate for energetic materials, a context-adjusted risk level, and — where a connection is available — experimental data pulled from PubChem.

It is built for chemistry students, teaching labs, and safety officers who need fast, free structural-hazard recognition without server-side software or per-seat licensing. All computation runs locally in the browser; nothing leaves the device except the optional PubChem lookup.

It is a **recognition and classification** tool. It identifies and explains hazards in structures you provide. It does not generate structures, propose syntheses, or supply procedures.

## How it works

The assessment runs in three layers.

**1. Structural-alert recognition (SMARTS).** The engine uses RDKit.js (compiled to WebAssembly) to perform substructure matching against a library of SMARTS patterns for known hazard classes — energetic/explosive functional groups and the publicly scheduled chemical-warfare-agent signatures defined under the Chemical Weapons Convention. A match flags the class, a severity, and a one-line mechanism. Every recognized signature corresponds to a structure already enumerated in the public literature, and for the scheduled agents, in the CWC schedules themselves. The patterns are recognition keys, not synthesis information.

**2. Oxygen-balance heuristic.** For compounds carrying energetic groups, the engine estimates oxygen balance (OB%) from RDKit-derived atom counts and reports a near-zero balance as a stability/handling flag.

**3. Exposure context.** The structural hazard is presented alongside an exposure scenario (route, quantity, population sensitivity, environment) so the same compound reads differently across handling situations — communicating *how stringent the handling precautions should be*, not ranking harm.

Where a connection is available, results are cross-referenced against PubChem (IUPAC name, molecular weight, and experimental LD50 from the compound's toxicity record) so heuristic estimates can be checked against real data.

## Detection categories (shipped library)

| Category | Recognized |
| --- | --- |
| Energetics / explosives | Nitro, peroxide, and azide groups |
| CWC-scheduled agents | G-series (Sarin-like), V-series (VX-like), and mustard-class signatures |

Additional toxicophore patterns (isocyanate, nitrosamine, organophosphate, and others) are documented below as extension examples and are not part of the default array.

## Features

| Tab | Function |
| --- | --- |
| **Assess** | Single-molecule analysis with 2D structure rendering and a full hazard report |
| **Batch** | Bulk screening of multiple SMILES via a Web Worker (keeps the UI responsive) |
| **Database** | Local reference set of pre-loaded comparison structures |
| **History** | Persistent scan history with search/filter and CSV/JSON export |
| **Compare** | Side-by-side radar-chart comparison of up to three structures |
| **Analytics** | Trends across your scan history |

## Tech stack

- **UI:** React 18 + Tailwind CSS
- **Cheminformatics:** RDKit.js (WebAssembly) for parsing and SMARTS matching
- **2D rendering:** SmilesDrawer
- **Charts:** Recharts
- **Persistence:** IndexedDB via `localforage` (history + local database)
- **External data:** PubChem PUG REST API

No backend. All processing is client-side.

## Setup

```bash
npm create vite@latest molecular-danger-platform -- --template react
cd molecular-danger-platform
npm install lucide-react recharts localforage
```

Add the WASM kernels to `index.html`:

```html
<script src="https://unpkg.com/@rdkit/rdkit@2024.9.6/dist/RDKit_minimal.js"></script>
<script src="https://unpkg.com/smiles-drawer@2.1.0/dist/smiles-drawer.min.js"></script>
```

Drop `MolecularDangerPlatform.jsx` into `src/`, render it, and run `npm run dev`.

## Extending the pattern library

New structural alerts are added as objects in the `patterns` array inside `assessMolecule`:

```javascript
{
  smarts: '[N+](=O)[O-]',   // recognition pattern
  label: 'Nitro group',      // display name
  countMult: 0.20,           // contribution to the risk score
  cat: 'explosive',          // category
  severity: 'high',          // low | moderate | high | critical
  mech: 'Energy-dense -NO₂'  // one-line mechanism
}
```

```text
molecular-danger-platform/
│
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   └── feature_request.md
│   ├── workflows/
│   │   ├── lint.yml
│   │   ├── test.yml
│   │   └── build.yml
│   └── CODEOWNERS
│
├── docs/
│   ├── architecture.md
│   ├── hazard-engine.md
│   ├── smarts-library.md
│   ├── oxygen-balance.md
│   ├── pubchem-integration.md
│   ├── ethics-and-safety.md
│   ├── validation-methodology.md
│   └── screenshots/
│
├── public/
│   ├── favicon.ico
│   ├── logo.svg
│   └── sample-data/
│       ├── demo_smiles.json
│       └── reference_molecules.json
│
├── src/
│   │
│   ├── app/
│   │   ├── App.jsx
│   │   ├── routes.jsx
│   │   └── providers.jsx
│   │
│   ├── pages/
│   │   ├── AssessPage.jsx
│   │   ├── BatchPage.jsx
│   │   ├── DatabasePage.jsx
│   │   ├── ComparePage.jsx
│   │   ├── AnalyticsPage.jsx
│   │   └── HistoryPage.jsx
│   │
│   ├── components/
│   │   ├── common/
│   │   │   ├── Card.jsx
│   │   │   ├── Badge.jsx
│   │   │   └── Modal.jsx
│   │   │
│   │   ├── molecule/
│   │   │   ├── MoleculeRenderer.jsx
│   │   │   ├── SmilesInput.jsx
│   │   │   ├── HazardRadar.jsx
│   │   │   └── StructureSummary.jsx
│   │   │
│   │   ├── reports/
│   │   │   ├── HazardReport.jsx
│   │   │   ├── RiskScoreCard.jsx
│   │   │   ├── AlertTable.jsx
│   │   │   └── ExposureContext.jsx
│   │   │
│   │   └── analytics/
│   │       ├── TrendChart.jsx
│   │       ├── CategoryBreakdown.jsx
│   │       └── ScanHeatmap.jsx
│   │
│   ├── engine/
│   │   ├── assessMolecule.js
│   │   ├── hazardScoring.js
│   │   ├── oxygenBalance.js
│   │   ├── exposureContext.js
│   │   └── reportBuilder.js
│   │
│   ├── patterns/
│   │   ├── explosives.js
│   │   ├── cwcAgents.js
│   │   ├── toxicophores.js
│   │   └── index.js
│   │
│   ├── rdkit/
│   │   ├── rdkitLoader.js
│   │   ├── moleculeParser.js
│   │   ├── smartsMatcher.js
│   │   └── descriptors.js
│   │
│   ├── services/
│   │   ├── pubchem.js
│   │   ├── exportCsv.js
│   │   ├── exportJson.js
│   │   └── localDatabase.js
│   │
│   ├── storage/
│   │   ├── historyStore.js
│   │   ├── databaseStore.js
│   │   └── settingsStore.js
│   │
│   ├── workers/
│   │   └── batchWorker.js
│   │
│   ├── hooks/
│   │   ├── useAssessment.js
│   │   ├── useHistory.js
│   │   └── usePubChem.js
│   │
│   ├── utils/
│   │   ├── riskLevels.js
│   │   ├── formatters.js
│   │   ├── constants.js
│   │   └── validation.js
│   │
│   ├── styles/
│   │   └── globals.css
│   │
│   └── main.jsx
│
├── tests/
│   ├── patterns/
│   │   ├── explosives.test.js
│   │   ├── cwc.test.js
│   │   └── toxicophores.test.js
│   │
│   ├── engine/
│   │   ├── assessMolecule.test.js
│   │   ├── oxygenBalance.test.js
│   │   └── scoring.test.js
│   │
│   └── fixtures/
│       ├── knownSafe.json
│       ├── knownEnergetics.json
│       └── scheduledAgents.json
│
├── LICENSE
├── TERMS.md
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── SECURITY.md
├── CHANGELOG.md
├── README.md
├── package.json
├── vite.config.js
└── .gitignore
```

```text
User Input
    ↓
RDKit Parser
    ↓
SMARTS Matcher
    ↓
Hazard Engine
    ↓
Risk Scoring
    ↓
Report Builder
    ↓
React UI
```

SMARTS is case-sensitive (lowercase = aromatic, uppercase = aliphatic; `.` separates fragments, `()` denotes branches). Validate any new pattern against a set of known positive and negative structures before relying on it.

## Scope and limitations

- This is a **heuristic recognition and education tool**, not a certified regulatory instrument. It does not replace formal safety training, SDS review, or institutional oversight.
- Risk scores are structural-alert estimates. They are checked against PubChem where possible but are not authoritative toxicology.
- The tool recognizes hazards in structures you supply. It does not generate hazardous structures or procedures.
- Coverage is limited to the patterns in the library; the absence of an alert is **not** a guarantee of safety.

## Safety and ethics

See [`TERMS.md`](./TERMS.md). In brief: this tool is for chemical-safety education, laboratory risk assessment, and legitimate research only. The hazard-detection logic must not be modified to obscure or bypass recognition of high-risk signatures. CWC-scheduled detections trigger an explicit warning, and users remain bound by all applicable laws and by the Chemical Weapons Convention.

---

*Built with RDKit.js, SmilesDrawer, and PubChem.*
