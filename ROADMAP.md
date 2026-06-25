# Roadmap

The single source of truth for what's done, what's next, and where this is going. This
supersedes the scattered `[PLANNED]` / `READY` / `§9` notes across the other docs —
those remain the *specifications*; this is the *checklist*. Items link to the doc that
specifies them.

Legend: `[x]` done · `[ ]` planned · ★ = competitive hinge / high-leverage.

---

## 0. Vision

A **free, open, structure-driven chemical-safety tool** for education — high-school and
college chemistry, down to careful middle-school demonstrations. Where the paid
incumbents (Beyond Labz, Labster, PhET, ChemCollective) are scenario-scripted and
license-gated, this computes hazard and (eventually) reactivity from the molecules
themselves, runs client-side on a Chromebook with no seat license, and is auditable and
extensible by the teacher. Ambitious end state: the open engine that an under-resourced
classroom can run, read, trust, and extend — including an open reactivity/mixture engine
for "experiment virtually first."

---

## 1. Status snapshot — done

**Verified engine core**
- [x] Engine extracted from the monolith into modular `src/` (engine, patterns, rdkit, services, utils)
- [x] Dependency-injected RDKit (testable in Node; no `window` in logic)
- [x] WASM memory management (`.delete()` everywhere; monolith leak closed)
- [x] 9 live SMARTS signatures + aggregator, detection verified 14/14 — `smarts-library.md`
- [x] RDKit adapter with the verified MinimalLib API (no `has_substruct_match`/`get_exact_mw`) — `architecture.md` §9
- [x] Oxygen balance, calibrated to literature ±0.1%, with the `reliable` flag for non-CHNO — `oxygen-balance.md`
- [x] Scoring pipeline (additive score, danger level, ethical-warning flag) — `hazard-engine.md`
- [x] PubChem enrichment (best-effort, offline-safe) — `pubchem-integration.md`
- [x] Report contract settled: context propagation, full OB object, reliability, history-key uniqueness, worker handshake, widened `Stringency` — `architecture.md` §7

**Tests & docs**
- [x] Fixtures (known-safe, energetics, scheduled-agents) + pattern test suites
- [x] `SECURITY.md`
- [x] Docs: `smarts-library`, `oxygen-balance`, `architecture`, `hazard-engine`, `pubchem-integration`
- [x] This roadmap

---

## 2. Phase 1 — complete the verified core  *(build-now, won't churn)*

**Scoring calibration**
- [ ] Implement the severity floor + `chemical_weapon → CRITICAL` floor in `scoreHazards` — `hazard-engine.md` §4.2 *(TNT → MODERATE, sarin → CRITICAL)*  ★
- [ ] Decide/lock the severity→floor mapping with review (the one debatable calibration knob)

**Pattern library depth** — promote verified `READY` signatures with fixtures — `smarts-library.md` §10
- [ ] Nitramine `N[N+](=O)[O-]` (closes the RDX/HMX gap)  ★
- [ ] Broad G/V `P(=O)([C,N])…` (replace narrow in-code forms)
- [ ] Cyanide `[C,c]#[N]`
- [ ] Aliphatic nitrate, Fulminate
- [ ] PAH, Dithiocarbamate
- [ ] (Hold) Novichok — until a canonical target verifies it

**Services & persistence** — `architecture.md` §6.4, §11
- [ ] `storage/historyStore` (localforage; `history:<timestamp>:<uuid>` keys)
- [ ] `storage/databaseStore`, `storage/settingsStore`
- [ ] `services/exportCsv`, `services/exportJson`
- [ ] `services/localDatabase` (reference-compound set, the 15 CAS-tagged standards) — `smarts-library.md` §6

**Tests & runnability** — `validation-methodology.md`
- [ ] `tests/engine/` unit suites (scoring, OB, assessMolecule) — lock in verified behavior as regression tests
- [ ] Promote toxicophore positives to a `knownToxicophores.json` fixture (currently inline)
- [ ] `package.json` test script + Vitest config + `.gitignore` (runnable `npm test`)
- [ ] Wire the existing verification harnesses into committed CI-able tests

**Remaining chain docs**
- [ ] `ethics-and-safety.md` — *write after §3 reactivity scope is set* (the dual-use line depends on it)
- [ ] `validation-methodology.md` — fixtures, RDKit-in-Node setup, the pre-declare-success-and-failure discipline

---

## 3. Phase 2 — UI layer  *(the rewire; renders the §7.3 Report contract)*

- [ ] `app/` shell, routing, providers — `architecture.md` §3
- [ ] `pages/`: Assess · Batch · Database · Compare · Analytics · History
- [ ] `components/`: molecule render (SmilesDrawer), hazard report, charts (Recharts), common UI
- [ ] `hooks/`: `useAssessment`, `useHistory`, `usePubChem`
- [ ] `workers/batchWorker` with the `ready` handshake — `architecture.md` §5, §12  ★
- [ ] Gut `MolecularDangerPlatform.jsx` → thin presentation calling `loadRDKit()` → `assessMolecule()`
- [ ] Render `oxygenBalance.reliable` / `limitations` honestly (approximate vs authoritative)
- [ ] Ethical-warning modal as a *teaching moment*, not just a gate — `hazard-engine.md` §6
- [ ] Educational output polish: plain-language mechanisms, age-appropriate phrasing/cues — `hazard-engine.md` §7

---

## 4. Phase 3 — ★ Reactivity / mixture engine  *(the competitive hinge)*

The "warn me before I mix bleach and ammonia" capability — the soul of "experiment
virtually first," and the thing the paid incumbents charge for. Composes on top of the
single-compound engine; does **not** churn it. — `hazard-engine.md` §9

- [ ] Scope it: `reactivity-engine.md` design doc + multi-compound output contract  ★
- [ ] Incompatibility matrix (oxidizer × reductant, acid × base, hypochlorite × amine, …)
- [ ] Curated reaction-rule base — broad where verified, honest at the edges (SMARTS-library discipline)
- [ ] Multi-compound flow + mixture-result schema (extends, not replaces, the Report)
- [ ] Mixture fixtures: bleach+ammonia → chloramine, bleach+acid → Cl₂, oxidizer+fuel, nitric acid+organics
- [ ] UI: multi-compound "bench" — add reagents, see the combined hazard/incompatibility read
- [ ] Honest scope boundary: curated rules, **not** general reaction prediction (that's research, §5)

---

## 5. Phase 4 — ambitious / future vision

**Deeper chemistry** *(research-grade; bounded honesty required)*
- [ ] Reaction-product prediction (gas evolution, energetics) beyond the curated rule base
- [ ] Macroscopic ↔ microscopic split-view: show the reaction *and* the atomic/electron truth (the PhET/Beyond Labz signature)
- [ ] 2D → 3D structure rendering
- [ ] Quantitative energetic-potential metric (separate field from handling `score` — `hazard-engine.md` §5)

**Classroom platform**
- [ ] Teacher dashboard + student sessions
- [ ] Curriculum presets by grade level (6th-grade "loud and simple" → college "precise mechanism")
- [ ] Exportable lesson reports (per-student PDF)
- [ ] LMS integration (Google Classroom, Canvas)
- [ ] Community pattern-sharing — teachers contribute/share SMARTS sets and reference compounds

**Reach & robustness**
- [ ] Offline reference cache / local toxicology DB (reduce PubChem dependence)
- [ ] Domain pattern packs (pharma toxicophores, environmental, industrial)
- [ ] Accessibility: text labels alongside the color danger scale, screen-reader support
- [ ] i18n for non-English classrooms

---

## 6. Deferred — infra & quality  *(adopt when the project earns it)*

- [ ] CI workflows (lint, test, build)
- [ ] `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `CHANGELOG.md`
- [ ] `CODEOWNERS`, issue/PR templates
- [ ] Performance pass (large-batch throughput, WASM cold-start UX)
- [ ] **Versioned schema pass** — the `hazard: {…}` Report nesting, done deliberately with a version bump — `architecture.md` §7.3

---

## 7. Spec cross-reference index

Where each area is fully specified:

| Area | Spec doc |
| --- | --- |
| Pattern catalog, `severity`, weights | `smarts-library.md` |
| Oxygen balance, reliability | `oxygen-balance.md` |
| System layers, contracts, types, dependency graph | `architecture.md` |
| Scoring, danger levels, floors, occurrence semantics | `hazard-engine.md` |
| PubChem enrichment | `pubchem-integration.md` |
| Reactivity/mixtures | `reactivity-engine.md` *(to be written, §4)* |
| Validation, fixtures, test setup | `validation-methodology.md` *(to be written, §2)* |
| Recognition-not-generation posture, dual-use, Schedule-1 | `ethics-and-safety.md` *(to be written, §2)* |
| Responsible disclosure | `SECURITY.md` |

---

## 8. Near-term ordering (suggested)

1. `reactivity-engine.md` scope (§4) — unblocks the two remaining chain docs without rework
2. `ethics-and-safety.md` + `validation-methodology.md` (§2) — written once, covering single-compound *and* reactivity
3. Implement Phase 1 scoring floors + pattern promotions (§2) — the cheap, verified wins
4. Phase 2 UI rewire — once CC has an executing environment

> Sequencing principle (applied throughout): build the verified, won't-churn layers
> first; defer anything that a later layer would force a rewrite of; document before
> implementing where it reduces churn. The UI sits on top of everything, so it is last.
