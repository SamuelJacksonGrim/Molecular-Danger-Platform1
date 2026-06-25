# PubChem Integration

How the platform cross-references a user-supplied structure against PubChem for real,
experimentally-grounded data — IUPAC name, molecular weight, and an LD50 toxicity value
— to supplement the structural assessment. Implemented in `src/services/pubchem.js`.

> **Posture.** This is the platform's **only** network call and its **only** non-local
> data path. It is **best-effort and optional**: every failure degrades to an empty
> record and the assessment proceeds offline. The structural hazard assessment never
> depends on PubChem being reachable.

---

## 1. Purpose

The recognition engine works from structure alone. PubChem adds a layer of measured,
external ground truth so that heuristic outputs can be checked against reality:

- a human-readable **IUPAC name** for the structure the user drew,
- the **molecular weight** from PubChem's record (independent of the RDKit-computed
  value),
- an experimental **LD50** where PubChem has one — the closest thing to a hard
  toxicity datum the tool surfaces.

This is enrichment, not a dependency. With no connection, the structural assessment
(danger level, alerts, oxygen balance, handling notes) is fully intact; only the
`reference` block of the Report is empty.

---

## 2. Endpoints

All calls hit PubChem's PUG REST / PUG-View services under:

```
BASE = https://pubchem.ncbi.nlm.nih.gov/rest/pug
```

The lookup is a three-step chain. Each step is conditional on the previous succeeding.

### Step 1 — SMILES → CID

```
GET {BASE}/compound/smiles/{encodeURIComponent(smiles)}/cids/JSON
```

Resolves the structure to a PubChem Compound ID. Extracted as
`IdentifierList.CID[0]`. **If no CID is found, the lookup stops** and returns the empty
record — an unknown structure simply has no PubChem reference.

### Step 2 — CID → properties

```
GET {BASE}/compound/cid/{cid}/property/IUPACName,MolecularWeight/JSON
```

Extracted from `PropertyTable.Properties[0]`:
- `IUPACName` → `iupacName`
- `MolecularWeight` → `molecularWeight`

### Step 3 — CID → toxicity (LD50)

```
GET {BASE}_view/data/compound/{cid}/JSON?heading=Toxicity
```

This uses **PUG-View** (the annotated-data service, note `pug_view`, not `pug`). The
response is walked:
- find the section with `TOCHeading === 'Toxicity'`,
- within it, the `Information` entry whose `Name` includes `'LD50'`,
- take `Value.StringWithMarkup[0].String` → `ld50`.

LD50 is a free-text string (e.g. a dose with units and species), not a normalized
number — it is surfaced for reference, not computed against. **This step is wrapped
independently**: if the toxicity section is missing or malformed, `ld50` stays `null`
and the rest of the record (CID, name, MW) is still returned.

---

## 3. The `PubChemResult` contract

```ts
// returned by lookupPubChem; see architecture.md §7.2
interface PubChemResult {
  available: boolean;                       // true once a CID is resolved
  cid: number | null;
  iupacName: string | null;
  molecularWeight: number | string | null;  // PubChem returns this as a string
  ld50: string | null;                       // free-text dose, not normalized
}
```

The empty record (every failure path) is:

```ts
{ available: false, cid: null, iupacName: null, molecularWeight: null, ld50: null }
```

`buildReport` maps this into `Report.reference`, setting `source: 'PubChem'` when
`available`, else `source: null` (`architecture.md` §7.3).

---

## 4. Failure & degradation behavior

Consistent with the platform's "degrade, don't fabricate" principle (`architecture.md`
§1.4, §10):

| Condition | Behavior |
| --- | --- |
| No network / fetch throws | Entire lookup returns the empty record; assessment proceeds offline. |
| No CID for the structure | Stops after Step 1; empty record (no reference exists). |
| Properties call fails | Returns with `available:true`, `cid` set, name/MW `null`. |
| Toxicity section missing/malformed | `ld50` stays `null`; CID, name, MW preserved. |
| No `fetch` available in the runtime | Returns the empty record immediately. |

There is **no throw path** out of `lookupPubChem` — it always resolves to a record.
The only way PubChem affects the assessment is by populating (or not) the `reference`
block.

---

## 5. Rate limits, batch, and network considerations

- **Rate limits.** PubChem enforces a usage policy (commonly cited as ~5 requests/second
  and a per-minute cap; verify against PubChem's current
  [usage policy](https://pubchem.ncbi.nlm.nih.gov/docs/programmatic-access)). A single
  assessment makes **up to 3 calls** (CID, properties, toxicity).
- **Batch skips PubChem by default.** The batch path passes `skipPubChem: true`
  (`architecture.md` §5), so a large screen does not fan out into hundreds of network
  calls and trip the rate limit. The UI may offer opt-in enrichment for a selected
  subset.
- **Latency.** Because this is the only async/network step in the pipeline
  (`architecture.md` §4), it is also the only part with variable latency. The UI should
  render the structural assessment immediately and fill the `reference` block when the
  lookup resolves, rather than blocking on it.

---

## 6. Privacy

This lookup **sends the user's SMILES string to PubChem** (NIH) to resolve the CID. It
is the only point at which any input leaves the device. This is worth stating plainly
for an educational deployment:

- Everything else — parsing, matching, scoring, oxygen balance — is fully local.
- The structure (not the student, not any account) is what's transmitted, and only to
  PubChem, and only to fetch public reference data.
- `skipPubChem: true` runs the entire assessment with **zero** network egress, which is
  a reasonable default for a classroom that prefers no outbound calls at all.

---

## 7. Testing

`lookupPubChem` accepts an injectable fetch implementation so the chain can be tested
offline without hitting PubChem:

```ts
lookupPubChem(smiles, { fetchImpl?: typeof fetch }): Promise<PubChemResult>
```

A test passes a stub `fetchImpl` returning canned PUG REST/PUG-View JSON to exercise
each branch (CID hit/miss, property parse, toxicity present/absent, network error).
This keeps the service deterministic in CI. See `validation-methodology.md`.

---

## 8. Cross-references

- **`architecture.md`** — the `PubChemResult` type, the `Report.reference` shape, and where the lookup sits in the pipeline (the single async/network step).
- **`hazard-engine.md`** — the structural assessment that PubChem supplements (and never gates).
- **`validation-methodology.md`** *(next)* — stubbing PubChem for deterministic tests.
- **`ethics-and-safety.md`** *(next)* — the local-first / minimal-egress posture.
