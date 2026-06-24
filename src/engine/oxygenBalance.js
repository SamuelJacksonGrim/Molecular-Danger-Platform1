// src/engine/oxygenBalance.js
//
// Oxygen balance (OB%) heuristic for energetic materials.
//   OB% = -1600 * (2*C + H/2 - O) / MW
//
// Reported purely as a stability / handling flag: a value near zero indicates a
// compound that can self-oxidize, which is relevant to how carefully a known
// energetic must be stored and handled. This is a recognition/handling signal,
// not a design or optimization tool. Returns { available:false } when atom
// counts cannot be obtained, rather than emitting a wrong number.

import { getAtomCounts, getMolWeight } from '../rdkit/descriptors.js';

export function oxygenBalance(rdkit, mol) {
  const counts = getAtomCounts(rdkit, mol);
  const mw = getMolWeight(rdkit, mol);

  if (!counts || !mw) {
    return { available: false, percent: null, nearZero: false };
  }

  const { C, H, O } = counts;
  const percent = (-1600 * (2 * C + H / 2 - O)) / mw;

  return {
    available: true,
    percent: Number(percent.toFixed(1)),
    nearZero: Math.abs(percent) < 60, // handling-relevant flag for a known energetic
  };
}
