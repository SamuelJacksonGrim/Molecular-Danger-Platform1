// src/patterns/toxicophores.js
//
// Toxicophore structural-alert patterns.
// Recognition SMARTS for well-established toxic functional groups drawn from
// the public structural-alert / toxicophore literature. These flag matching
// groups in user-supplied structures so a teaching lab or safety officer can
// see them; they are recognition keys only and generate nothing.
//
// Not part of the original shipped array — these are the documented extension
// set referenced in the README. Add or prune per your curriculum.

export const toxicophores = [
  {
    smarts: 'N=C=O',
    label: 'Isocyanate',
    countMult: 0.30,
    cat: 'toxin',
    severity: 'high',
    mech: 'Respiratory sensitizer (MIC / Bhopal class)',
  },
  {
    smarts: '[NX3][NX2]=O',
    label: 'N-Nitrosamine',
    countMult: 0.25,
    cat: 'toxin',
    severity: 'high',
    mech: 'Carcinogen; DNA alkylation',
  },
  {
    smarts: 'P(=S)(O)O',
    label: 'Organophosphate / thiophosphate',
    countMult: 0.30,
    cat: 'toxin',
    severity: 'high',
    mech: 'Cholinesterase-inhibiting neurotoxin (OP pesticide core)',
  },
];
