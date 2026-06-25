// src/engine/oxygenBalance.js
//
// Oxygen balance (OB%) heuristic for energetic materials.
//   OB% = -1600 * (2*C + H/2 - O) / MW
//
// Reported purely as a stability / handling flag: a value near zero indicates a
// compound that can self-oxidize, which is relevant to how carefully a known
// energetic must be stored and handled. This is a recognition/handling signal,
// not a design or optimization tool. Returns { available:false } when atom
// counts cannot be obtained, and { reliable:false, limitations:[...] } when the
// molecule contains non-CHNO atoms the formula cannot account for — the value is
// still computed but flagged, rather than presented as authoritative.

import { getAtomCounts, getMolWeight } from '../rdkit/descriptors.js';

export function oxygenBalance(rdkit, mol) {
  const counts = getAtomCounts(rdkit, mol);
  const mw = getMolWeight(rdkit, mol);

  if (!counts || !mw) {
    return { available: false, percent: null, nearZero: false, reliable: false };
  }

  const { C, H, O, other } = counts;
  const percent = Number(((-1600 * (2 * C + H / 2 - O)) / mw).toFixed(1));

  // The CHNO formula ignores the oxygen demand of other elements (S, P, halogens,
  // metals). If any are present, the value is computed but flagged unreliable
  // rather than presented as authoritative — "degrade, don't fabricate."
  const reliable = other.length === 0;

  const result = {
    available: true,
    percent,
    nearZero: Math.abs(percent) < 60, // handling-relevant flag for a known energetic
    reliable,
  };
  if (!reliable) {
    result.limitations = [
      `Contains non-CHNO atoms (${other.join(', ')}); the CHNO oxygen-balance formula ` +
        `does not account for their oxygen demand, so this value is approximate.`,
    ];
  }
  return result;
}
