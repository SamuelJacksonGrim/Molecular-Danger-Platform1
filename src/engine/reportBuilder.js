// src/engine/reportBuilder.js
//
// Assembles the final assessment object from the engine's component outputs.

export function buildReport({ smiles, scoring, oxygenBalance, exposure, pubchem }) {
  return {
    smiles,
    timestamp: new Date().toISOString(),

    dangerLevel: scoring.dangerLevel,
    score: scoring.score,
    categories: scoring.categories,
    alerts: scoring.alerts,
    triggersEthicalWarning: scoring.triggersEthicalWarning,

    oxygenBalance: oxygenBalance.available ? oxygenBalance.percent : null,

    // Handling guidance — how careful to be — kept separate from the hazard score.
    handling: {
      stringency: exposure.stringency,
      notes: exposure.notes,
    },

    reference: {
      cid: pubchem.cid,
      iupacName: pubchem.iupacName,
      molecularWeight: pubchem.molecularWeight,
      ld50: pubchem.ld50,
      source: pubchem.available ? 'PubChem' : null,
    },
  };
}
