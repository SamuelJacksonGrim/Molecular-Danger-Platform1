// src/engine/hazardScoring.js
//
// Combines matched structural alerts into a hazard score and danger level.
// The score reflects the molecule's intrinsic structural hazard only — it is
// NOT scaled by who might be exposed or by what route (see exposureContext.js).

import { dangerLevelFor } from '../utils/riskLevels.js';

export function scoreHazards(matchedPatterns, ob) {
  const categories = new Set();
  const alerts = [];
  let score = 0;

  for (const p of matchedPatterns) {
    score += p.countMult ?? 0;
    if (p.cat) categories.add(p.cat);
    alerts.push({ label: p.label, cat: p.cat, severity: p.severity, mech: p.mech });
  }

  // Near-zero oxygen balance on an energetic is an additional handling flag.
  if (ob?.available && ob.nearZero && categories.has('explosive')) {
    alerts.push({
      label: 'Near-zero oxygen balance',
      cat: 'explosive',
      severity: 'high',
      mech: 'Self-oxidizing — store and handle as a sensitive energetic',
    });
    score += 0.15;
  }

  score = Math.min(score, 1.0);

  return {
    score: Number(score.toFixed(3)),
    dangerLevel: dangerLevelFor(score),
    categories: Array.from(categories),
    alerts,
    triggersEthicalWarning: categories.has('chemical_weapon'),
  };
}
