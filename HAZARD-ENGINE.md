# Hazard Engine

How the Molecular Danger Assessment Platform turns recognized structural alerts and
oxygen balance into a hazard assessment: what `dangerLevel` means, how the score is
built, how the danger level and the ethical-warning trigger are derived, and how to
tune it. This document writes against the settled data contracts in `architecture.md`
(§7) and consumes the recognition layer from `smarts-library.md` and the OB layer from
`oxygen-balance.md`.

> **Status convention.** **[BUILT]** = in `src/engine/hazardScoring.js` and verified.
> **[SPECIFIED]** = the calibration design defined in this document, pending
> implementation. Where current behavior and the specification differ, both are shown.

---

## 1. What the engine is for

The engine answers exactly one question:

> **If a person handles, encounters, or is exposed to this compound as given, how
> careful do they need to be?**

It is a **safe-handling** assessment, built so a chemistry class — high-school,
college, or a careful middle-school demonstration — can see a compound's hazards
*before* anyone touches a reagent. The output is meant to be read by a learner: the
alert mechanisms and handling notes are the teaching payload, not metadata.

It is **not**:

- a **weaponization** or threat-potential ranking (that surface was deliberately
  removed from this platform — see `ethics-and-safety.md`),
- an **energetic-performance** estimate (brisance, yield, detonation velocity),
- a **mixture/reactivity** predictor (single compound only — see §9, the next module).

---

## 2. What `dangerLevel` means (the load-bearing definition)

`dangerLevel` is the **intrinsic handling and exposure hazard of the compound as
given** — its toxicity, corrosivity, sensitivity, and reactivity-to-the-handler — not
its potential if weaponized or its performance if deployed.

This definition is the spine of the engine, and it resolves the one case that exposes
every other meaning as wrong: **TNT.**

- Under a *weaponization* lens, TNT is maximal — it's a high explosive.
- Under a *handling* lens, TNT is **moderate**, and for a reason that has nothing to do
  with detonation: TNT is a **secondary explosive** — chemically stable, insensitive to
  friction, shock, and ordinary heat, and inert without a detonator's shockwave. It
  will not "go off" on a bench. What actually endangers a handler is that **TNT is
  toxic** — hepatotoxic, causes anemia and methemoglobinemia, irritates skin and eyes
  ("TNT sickness" was a real munitions-worker illness).

So TNT's handling hazard is real but **toxicological, not explosive**, and "moderate"
is the correct read. A tool that flagged TNT as a top hazard *because it's an
explosive* would be crying wolf — and would desensitize a user to the compounds that
are dangerous to touch *right now*. The engine therefore separates two ideas the word
"explosive" usually conflates:

| | Conditional hazard | Intrinsic hazard |
| --- | --- | --- |
| Needs initiation? | Yes (detonator, spark, reaction) | No |
| Example | Stable secondary explosive (TNT) | Acute toxin / nerve agent (sarin) |
| Handling read | Driven by *toxicity/sensitivity*, not blast potential | Driven by the compound itself |

This distinction is why the calibration below floors chemical weapons but **not**
explosives (§4).

---

## 3. The scoring pipeline  [BUILT]

`scoreHazards(matchedPatterns, oxygenBalanceResult)` runs after the recognition and OB
layers. Current implemented behavior:

```
matched patterns ─┐
                  ├─► score = Σ (pattern.countMult)        [register-once per pattern]
oxygen balance ───┘        + 0.15  if (ob.available && ob.reliable
                                        && ob.nearZero && categories has 'explosive')
                           clamp to ≤ 1.0, round to 3 dp
                  └─► categories = unique pattern.cat
                  └─► alerts     = [{ label, cat, severity, mech }, …] (+ OB alert if added)
                  └─► triggersEthicalWarning = categories includes 'chemical_weapon'
                  └─► dangerLevel = dangerLevelFor(score)        ← see §4
```

The OB contribution is gated on `reliable` so an approximate oxygen balance on a
non-CHNO compound never silently inflates the score (see `oxygen-balance.md` §8).

### Output shape

`ScoringResult` (consumed by `reportBuilder`; see `architecture.md` §7.2):

```ts
{
  score: number;                   // 0–1, 3 decimals
  dangerLevel: DangerLevel;        // MINIMAL | LOW | MODERATE | HIGH | CRITICAL
  categories: HazardCategory[];
  alerts: Alert[];                 // { label, cat, severity, mech }
  triggersEthicalWarning: boolean;
}
```

---

## 4. Danger level derivation

### 4.1 Score thresholds  [BUILT]

`dangerLevelFor(score)` in `utils/riskLevels.js`:

| Score | Level |
| --- | --- |
| ≥ 0.80 | CRITICAL |
| ≥ 0.60 | HIGH |
| ≥ 0.40 | MODERATE |
| ≥ 0.20 | LOW |
| < 0.20 | MINIMAL |

`dangerColorFor(score)` maps the same bands to display colors (red / orange / yellow /
blue / green).

### 4.2 Floors — making severity load-bearing  [SPECIFIED]

The additive score alone mis-reads two kinds of compound, so the final danger level is
the **highest** of three signals:

```
dangerLevel = max(
   scoreThreshold(score),          // §4.1
   severityFloor(highestMatchedSeverity),
   chemicalWeaponFloor             // CRITICAL if any 'chemical_weapon' match, else none
)
```

**Chemical-weapon floor → CRITICAL.** Any `chemical_weapon` match floors the level at
CRITICAL. This is the one floor that survives the TNT critique, because a nerve/blister
agent's hazard is **intrinsic and contact-borne** — sarin needs no detonator and no
reaction; contact alone harms. Acute agents are not conditional, so they are never
allowed to read below the maximum.

**Severity floor.** Each pattern already carries a `severity` (`smarts-library.md` §2),
which until now was display-only. It becomes load-bearing here — the highest severity
among matched motifs sets a minimum level:

| Highest matched `severity` | Danger-level floor |
| --- | --- |
| `critical` | HIGH |
| `high` | MODERATE |
| `moderate` | LOW |
| `low` | (no floor) |

Why this is the right mechanism: it uses the chemistry already encoded per motif rather
than a blunt per-category rule. A sensitive primary (azide, fulminate — `critical`
severity) floors at HIGH because it can initiate *on the handler*; a stable energetic
motif (nitro — `high` severity) floors at MODERATE; benign structures float free.

### 4.3 Current vs. specified — worked cases

| Compound | Matched motif(s) | Score → threshold | Severity floor | CWC floor | **Current [BUILT]** | **Specified [4.2]** |
| --- | --- | --- | --- | --- | --- | --- |
| Benign (ethanol) | none | 0.0 → MINIMAL | — | — | MINIMAL | MINIMAL |
| TNT | Nitro (`high`) | 0.20 → LOW | MODERATE | — | **LOW** | **MODERATE** |
| Hydrogen peroxide | Peroxide (`high`) | 0.30 → LOW | MODERATE | — | LOW | MODERATE |
| Sodium azide | Azide (`critical`) | 0.40 → MODERATE | HIGH | — | MODERATE | **HIGH** |
| Sarin | G-core (`critical`, CWC) | 0.60 → HIGH | HIGH | CRITICAL | HIGH | **CRITICAL** |

The **Current** column is today's un-floored behavior (verified). The **Specified**
column is §4.2 once implemented. TNT moving LOW → MODERATE, and sarin HIGH → CRITICAL,
are the headline corrections.

> **Implementation note.** §4.2 is a post-processing step on the existing score: add a
> `severityFloor` map and a CWC check to the end of `scoreHazards`, then take the max of
> the three. It does not change the additive score itself, only the level derived from
> it. This keeps `score` as a stable, continuous quantity and `dangerLevel` as the
> human-facing band.

---

## 5. Occurrence semantics (why count doesn't accumulate)  [BUILT]

This is the behavior that makes people think TNT is "mis-scored," so it is stated
explicitly:

- **Occurrence count gates *detection*.** A pattern registers only if it matches at
  least `minForCat` times (default 1). This is how a lone nitro is distinguished from
  polynitro (`smarts-library.md` §5.1).
- **Occurrence count does *not* accumulate score.** Once a pattern registers, it
  contributes its `countMult` **once**, regardless of how many times the motif appears.
  TNT's three nitro groups contribute the same as one.
- **Therefore `score` represents *presence and severity* of hazard motifs, not
  *quantity*.** Three nitro groups do not make TNT three times more dangerous to handle;
  they make it the same *kind* of hazard. Quantity (and concentration, and amount) are
  handling variables the engine cannot see from structure alone (§8).

If a future revision wants quantitative energetic potential, that is a *different
metric* from handling hazard and should be a separate field, not a reinterpretation of
`score`.

---

## 6. The ethical-warning trigger  [BUILT]

`triggersEthicalWarning` is `true` iff a matched motif's category is `chemical_weapon`.
It is the only category that sets it. Downstream (UI), this raises the Schedule-1
warning modal and writes an audit-log entry (`architecture.md` §4).

In a classroom, this is not just a gate — it is a **teaching moment**: the point where
the instructor explains why some chemistry is regulated under international convention.
The modal should inform, not merely block.

---

## 7. The report as teaching payload

For the educational use case, the engine's *legibility* matters as much as its
correctness. The pieces a learner reads:

- **`dangerLevel`** — the at-a-glance band (with `dangerColorFor` providing the
  red→green cue).
- **`alerts[].mech`** — the *why*. "Energy-dense -NO₂ substituent," "Acetylcholinesterase
  inhibitor." These plain-language mechanisms are the lesson; keep them readable by a
  student, not just a chemist.
- **`alerts[].severity`** — per-motif seriousness, now also driving the floor (§4.2).
- **`handling.notes`** — the actionable safe-handling guidance (`architecture.md` §7.3),
  the practical takeaway a teacher wants students to internalize.

Design guidance for adopters: mechanism strings should be written at the reading level
of the intended class. A 6th-grade deployment may favor simpler phrasing and louder
visual cues; a college lab may want the precise mechanism. The strings live in the
pattern data (`smarts-library.md`) and are editable per curriculum.

---

## 8. Limitations — what structure alone cannot tell you

A single-structure engine is blind to several things that determine real-world danger.
These are **mandatory caveats** for any educational deployment, because they are
exactly the gap between a dialog box and a lab accident:

1. **Initiation.** It cannot see whether an energetic is primed. Stable TNT and a TNT
   charge with a detonator are the same molecule to the engine.
2. **Sensitivity, purity, and age.** Impact/friction/ESD sensitivity, contamination, and
   degradation are not visible. (Note: this is compound-specific — *picric acid* forms
   friction-sensitive metal picrates as it ages against its container, and *nitrate
   esters* like dynamite degrade dangerously; *TNT* does not. The engine cannot
   distinguish these from structure.)
3. **Concentration and amount.** A dilute solution and a neat reagent share a SMILES.
   Dose makes the poison; the engine sees neither dose nor quantity (§5).
4. **Confinement and conditions.** Temperature, pressure, and containment change hazard
   and are out of scope.
5. **Mixtures and reactions — the big one (§9).** The engine assesses one compound. It
   cannot tell you what happens when you *combine* two.

---

## 9. Roadmap: the mixture / reactivity engine  [NEXT CAPABILITY]

The flagship classroom scenario — *"warn me before I mix bleach and ammonia"* — is
**not** something this engine does, and it is important to be honest that it is the
heart of the "experiment virtually first" promise.

Why it's a separate module: the hazard engine takes **one** SMILES and recognizes
motifs *within that molecule*. Bleach + ammonia → chloramine vapor (the eyes-burning
part) requires knowing that NaOCl and NH₃ **react** — a reaction-rule / incompatibility
problem, not a substructure scan. The same is true of every kitchen-chemistry classic:

| Combination | Product | Why structure-scan can't catch it |
| --- | --- | --- |
| Bleach + ammonia | Chloramines | Reaction between two species |
| Bleach + acid | Chlorine gas | Reaction between two species |
| Oxidizer + fuel | Combustion / energetic mix | Cross-species reactivity |
| Nitric acid + organics | Nitration / fire | Cross-species reactivity |

This calls for a distinct **reactivity/incompatibility module**: an engine that takes a
*set* of compounds and consults a reaction-rule base or incompatibility matrix (e.g.
oxidizer × reductant, acid × base, hypochlorite × amine). It composes with this engine
(each compound still gets its single-compound assessment) but adds the cross-species
layer. It is the recommended next capability after the single-compound platform and its
UI are complete, and given the classroom mission, it may eventually be the center of
gravity. Designing it is its own pass; this document scopes the engine as
single-compound and flags the mixture engine as the explicit next step.

---

## 10. Tuning guide

Everything an adopting lab or teacher can adjust, and where:

| Knob | Where | Effect |
| --- | --- | --- |
| Per-motif weight | `countMult` in `src/patterns/*` | How much a motif contributes to `score`. |
| Detection threshold | `minForCat` in `src/patterns/*` | How many occurrences before a motif registers (§5). |
| Per-motif severity | `severity` in `src/patterns/*` | Now drives both display and the danger floor (§4.2). |
| Score → level bands | `utils/riskLevels.js` | Where MINIMAL/LOW/MODERATE/HIGH/CRITICAL fall. |
| Severity-floor map | `scoreHazards` (per §4.2) | Minimum level per highest matched severity. |
| OB handling threshold | `oxygenBalance.js` (`nearZero`, 60%) | When a near-zero OB raises the energetic handling flag. |

Tuning is expected, not exceptional — a teaching deployment will reasonably want
different weights and louder warnings than a research lab. The engine is small and the
knobs are data, so curriculum-level adjustments are edits, not rewrites.

---

## 11. API contract

```ts
// src/engine/hazardScoring.js
scoreHazards(
  matchedPatterns: HazardPattern[],   // from rdkit/smartsMatcher.matchPatterns
  ob: OxygenBalanceResult             // from engine/oxygenBalance
): ScoringResult

// src/utils/riskLevels.js
dangerLevelFor(score: number): DangerLevel
dangerColorFor(score: number): string
DANGER_LEVELS: readonly ['MINIMAL','LOW','MODERATE','HIGH','CRITICAL']
```

`scoreHazards` is pure and synchronous. Its output flows directly into `buildReport`,
which surfaces `dangerLevel`, `score`, `categories`, `alerts`, and
`triggersEthicalWarning` onto the Report (`architecture.md` §7.3). Type definitions
(`HazardCategory`, `Severity`, `DangerLevel`, `Alert`, `ScoringResult`,
`OxygenBalanceResult`) are canonical in `architecture.md` §7.

---

## 12. Cross-references

- **`architecture.md`** — data contracts, the Report schema, the dependency graph.
- **`smarts-library.md`** — pattern catalog, `severity` per motif, `countMult`/`minForCat`.
- **`oxygen-balance.md`** — OB computation, reliability, and the scoring-flag gate.
- **`ethics-and-safety.md`** *(next)* — why the weaponization/performance surfaces are out of scope, and the Schedule-1 posture.
- **`validation-methodology.md`** *(next)* — how scoring and floors should be regression-tested.
