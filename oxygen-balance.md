# Oxygen Balance

Reference for the oxygen-balance (OB%) computation in the Molecular Danger
Assessment Platform. Self-contained: definition, formula, interpretation,
implementation, calibration, and limits. All computed values below are verified
against **RDKit 2025.03.4** and reconcile with published literature to ±0.1%.

> **Posture.** Oxygen balance is reported as a **storage and handling signal** — an
> indicator of a compound's self-oxidizing capacity — **not** as an energetics
> design, ranking, or optimization output. It tells a handler how cautious to be
> with a *known* energetic; it is not a tool for tuning one. See
> `ethics-and-safety.md`.

---

## 1. What oxygen balance is

Oxygen balance is the mass of oxygen, expressed as a percentage of the compound's
own mass, that the compound has in **excess** (positive) or **deficit** (negative)
relative to the amount needed to fully oxidize it — all carbon to CO₂, all hydrogen
to H₂O, with nitrogen released as N₂.

- **OB < 0** — oxygen-**deficient** (fuel-rich). Oxidation is incomplete; CO and
  soot form. Strongly negative for hydrocarbon-rich compounds.
- **OB ≈ 0** — oxygen-**balanced**. The molecule carries close to the oxygen needed
  to oxidize itself. For energetics this is where the simple model predicts maximum
  heat/gas output.
- **OB > 0** — oxygen-**rich** (oxidizer). Surplus oxygen; characteristic of
  oxidizer salts, which are typically paired with separate fuels in a formulation.

---

## 2. Formula

The platform computes **oxygen balance to CO₂** (OB_CO₂), the standard convention.
For a compound CₐHᵦNᵧOᵟ with molar mass *M*:

```
OB% = ( -1600 / M ) × ( 2a + b/2 − δ )
```

| Term | Meaning |
| --- | --- |
| `2a` | each carbon consumes 2 oxygen atoms (→ CO₂) |
| `b/2` | each 2 hydrogens consume 1 oxygen atom (→ H₂O) |
| `−δ` | oxygen already present in the molecule |
| `1600` | `16.00 × 100` — oxygen's atomic mass, scaled to a mass percentage |
| `M` | average molar mass (g·mol⁻¹) |

The bracket `(2a + b/2 − δ)` is the net **oxygen-atom deficit**: positive when the
molecule lacks oxygen, which the leading `−1600` converts into a **negative** OB.

**Nitrogen is excluded from the bracket** — it is assumed to leave as N₂ and consumes
no oxygen — but it still contributes to *M*.

> **Variant:** *oxygen balance to CO* uses `(a + b/2 − δ)` (carbon only to CO). The
> platform uses OB_CO₂ (the `2a` term), which is the more common reporting basis.

---

## 3. Interpretation

| OB% range | Reading | Examples |
| --- | --- | --- |
| Strongly positive (> +20) | Oxidizer; oxygen surplus | Ammonium nitrate (+20) |
| Near zero (≈ −40 to +5) | Well-balanced energetic | Nitroglycerin (+3.5), PETN (−10), RDX (−22) |
| Strongly negative (< −60) | Fuel-rich; incomplete oxidation | TNT (−74), aromatics |

OB correlates *loosely* with detonation performance and sensitivity **within** a
compound family, but it is **not** a reliable predictor across classes and must never
be treated as one. The platform uses OB only as a coarse handling signal (below).

### Handling flag (`nearZero`)

When OB is available and `|OB%| < 60`, the platform marks the compound `nearZero`. On
a structure that also matches an **explosive** pattern, this raises a "near-zero
oxygen balance" handling alert (and a small score increment; see §8).

Rationale: a compound in this band carries enough internal oxygen to sustain rapid
self-oxidation **without atmospheric oxygen** — the property most relevant to safe
storage and handling of a known energetic. The 60% threshold is deliberately broad
and conservative; it is a handling heuristic, **not** a sensitivity prediction, and is
tunable in `oxygenBalance.js`.

---

## 4. Calibration table (verified)

Computed by the platform vs. published OB_CO₂ values. Δ = platform − literature.

| Compound | Formula | M (g·mol⁻¹) | OB% (platform) | OB% (literature) | Δ |
| --- | --- | --- | --- | --- | --- |
| Ammonium nitrate | H₄N₂O₃ | 80.04 | +20.0 | +20 | 0.0 |
| Nitroglycerin | C₃H₅N₃O₉ | 227.08 | +3.5 | +3.5 | 0.0 |
| PETN | C₅H₈N₄O₁₂ | 316.13 | −10.1 | −10.1 | 0.0 |
| RDX | C₃H₆N₆O₆ | 222.12 | −21.6 | −21.6 | 0.0 |
| HMX | C₄H₈N₈O₈ | 296.16 | −21.6 | −21.6 | 0.0 |
| TNT | C₇H₅N₃O₆ | 227.13 | −74.0 | −74 | 0.0 |

Non-energetic references (illustrating strongly oxygen-deficient organics, no
literature OB applicable): ethanol −208.4, benzene −307.2, glucose −106.6.

Use this table as a regression check: any change to the descriptor pipeline or
atom-counting method should reproduce these values.

---

## 5. Computation method

Implemented in `src/engine/oxygenBalance.js` and `src/rdkit/descriptors.js`. Two RDKit
specifics, both verified, that differ from the Python API:

### Molar mass

```js
const M = JSON.parse(mol.get_descriptors()).amw;   // average molecular weight
```

RDKit.js has **no `get_exact_mw()` method** — molar mass is read from the descriptor
JSON. `amw` (average molecular weight) is the correct quantity for a mass-fraction
property like OB. `exactmw` (monoisotopic) is available as a fallback but is not the
intended basis.

### Atom counts

Per-element counts are **not** exposed by `get_descriptors()`. They are obtained by:

1. **Clone** the molecule (`mol.copy()`) — so the caller's molecule is never mutated.
2. **Add explicit hydrogens** (`add_hs_in_place()`) — hydrogen is implicit in
   SMILES/RDKit by default and must be made explicit before it can be counted.
3. **Serialize** to commonchem JSON (`get_json()`) and **tally by atomic number**.
   Carbon atoms omit their `z` field, so atoms without `z` fall back to the
   commonchem default (`defaults.atom.z`, which is `6` = carbon).
4. **Free** the clone (`.delete()`).

Atomic numbers tracked: H (1), C (6), N (7), O (8). Others are recognized but do not
enter the OB formula (see §6).

### Degradation contract

If reliable C/H/O counts cannot be obtained, `getAtomCounts` returns `null`,
`oxygenBalance` returns `{ available: false, percent: null, nearZero: false }`, and the
report shows OB as **unavailable**. The module never emits a fabricated value — an
unavailable result is always preferable to a wrong one.

---

## 6. Scope and limitations

1. **CHNO only.** The implemented bracket sums carbon, hydrogen, and oxygen, and
   correctly excludes nitrogen (→ N₂). It does **not** account for the oxygen demand of
   other elements:
   - **Sulfur** (→ SO₂), **phosphorus** (→ P₂O₅), **boron**, and **metals** (→ metal
     oxides) all change the true oxygen balance and are ignored.
   - **Halogens** consume hydrogen (forming HX), reducing the hydrogen available for
     H₂O — also ignored.

   For compounds with significant non-CHNO content (organophosphates, perchlorates,
   organometallics, halogenated energetics), the computed OB is **approximate or
   invalid**. The general OB formula extends with element-specific oxide terms; the
   platform implements only the CHNO core.
2. **First-order indicator.** OB is computed from molecular formula alone. It ignores
   crystal form, polymorphism, particle size, and confinement, and it is **not** a
   substitute for measured impact / friction / electrostatic sensitivity or for an SDS.
3. **Not a design output.** See the posture note — OB here gauges handling stringency
   for a known compound, not energetic performance to be optimized.

---

## 7. API contract

```ts
// src/engine/oxygenBalance.js
oxygenBalance(rdkit, mol): {
  available: boolean;      // false if counts/MW could not be obtained
  percent: number | null;  // OB% to one decimal, or null when unavailable
  nearZero: boolean;       // |percent| < 60 when available, else false
}

// src/rdkit/descriptors.js
getMolWeight(rdkit, mol): number | null            // amw, or null
getAtomCounts(rdkit, mol): { C, H, N, O } | null    // explicit-H counts, or null
```

The `rdkit` instance is injected (not pulled from `window`), so the whole computation
is unit-testable outside the browser. See `architecture.md` for the dependency graph.

---

## 8. Integration with the hazard engine

`src/engine/hazardScoring.js` consumes the OB result:

- If a molecule matches an `explosive` pattern **and** `oxygenBalance.available &&
  oxygenBalance.nearZero`, an alert "Near-zero oxygen balance — self-oxidizing, store
  and handle as a sensitive energetic" is appended and **+0.15** is added to the hazard
  score (before the ≤ 1.0 clamp).
- OB has **no effect** on non-energetic compounds — a near-zero OB on a molecule with
  no explosive match contributes nothing.

OB feeds the report as `report.oxygenBalance` (the percent, or `null`). See
`hazard-engine.md` for the full scoring path and `smarts-library.md` §8 for the
pattern-side view.

---

## 9. Worked examples

**TNT** — C₇H₅N₃O₆, M = 227.13:

```
OB% = (-1600 / 227.13) × (2·7 + 5/2 − 6)
    = (-1600 / 227.13) × (14 + 2.5 − 6)
    = (-1600 / 227.13) × 10.5
    = −73.97%   ≈ −74%        → strongly fuel-rich; not nearZero
```

**Nitroglycerin** — C₃H₅N₃O₉, M = 227.08:

```
OB% = (-1600 / 227.08) × (2·3 + 5/2 − 9)
    = (-1600 / 227.08) × (6 + 2.5 − 9)
    = (-1600 / 227.08) × (−0.5)
    = +3.52%    ≈ +3.5%       → near-balanced; nearZero flag set
```

---

## 10. Provenance and safety

Oxygen balance is a textbook quantity computed from a structure the user supplies; the
formula and constants are standard energetic-materials chemistry. The platform reports
it as a handling/storage signal for known compounds and never as a route to designing,
ranking, or optimizing energetics. See `ethics-and-safety.md` and `TERMS.md`.
