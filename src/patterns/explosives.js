// src/patterns/explosives.js
//
// Energetic / explosive structural-alert patterns.
// Recognition SMARTS for publicly known energetic functional groups.
// These flag hazards in user-supplied structures; they do not generate anything.

export const explosives = [
  {
    smarts: '[N+](=O)[O-]',
    label: 'Nitro group',
    countMult: 0.20,
    minForCat: 2,
    cat: 'explosive',
    severity: 'high',
    mech: 'Energy-dense -NO2 substituent',
  },
  {
    smarts: '[O][O]',
    label: 'Peroxide',
    countMult: 0.30,
    cat: 'explosive',
    severity: 'high',
    mech: 'Weak O-O bond, susceptible to cleavage',
  },
  {
    smarts: '[N-]=[N+]=[N]',
    label: 'Azide',
    countMult: 0.40,
    cat: 'explosive',
    severity: 'critical',
    mech: 'High-nitrogen chain; shock/friction sensitive',
  },
];
