// src/patterns/cwcAgents.js
//
// CWC-scheduled chemical-warfare-agent recognition patterns.
// Recognition SMARTS for the structural cores of agents already enumerated
// in the public Chemical Weapons Convention schedules. These flag matching
// structures and trigger the ethical-warning modal; they are recognition
// keys only and contain no synthesis information.
//
// A match in this category sets `cat: 'chemical_weapon'`, which the engine
// uses to raise the Schedule-1 warning and write an audit-log entry.

export const cwcAgents = [
  {
    smarts: 'P(=O)(C)F',
    label: 'G-agent core (Sarin-like)',
    countMult: 0.60,
    cat: 'chemical_weapon',
    severity: 'critical',
    mech: 'Acetylcholinesterase inhibitor',
  },
  {
    smarts: 'P(=O)(C)SCCN',
    label: 'V-agent pattern (VX-like)',
    countMult: 0.70,
    cat: 'chemical_weapon',
    severity: 'critical',
    mech: 'Persistent nerve agent',
  },
  {
    smarts: 'ClCCSCCCl',
    label: 'Mustard-like (vesicant)',
    countMult: 0.50,
    cat: 'chemical_weapon',
    severity: 'critical',
    mech: 'Vesicant alkylating agent',
  },
];
