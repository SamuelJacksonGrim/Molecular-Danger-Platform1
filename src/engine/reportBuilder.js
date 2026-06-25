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

    // Full oxygen-balance result: the UI sees the nearZero flag that drove the
    // scoring alert, and can distinguish "unavailable" from a real value.
    oxygenBalance: {
      available: oxygenBalance.available,
      percent: oxygenBalance.percent,
      nearZero: oxygenBalance.nearZero,
    },

    // Handling guidance — how careful to be — kept separate from the hazard score.
    // Echoes the resolved exposure scenario so the UI can show what generated it.
    handling: {
      stringency: exposure.stringency,
      notes: exposure.notes,
      route: exposure.route,
      population: exposure.population,
      ventilation: exposure.ventilation,
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
