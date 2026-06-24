// src/rdkit/descriptors.js
//
// Molecular descriptors via RDKit. The rdkit instance is injected for testability.
//
// NOTE: RDKit.js exposes molecular weight reliably (get_exact_mw). Per-element
// atom counts are read from get_descriptors(), whose exact key names depend on
// the RDKit build. getAtomCounts() returns null if it cannot obtain reliable
// counts, and oxygenBalance() treats null counts as "unavailable" rather than
// guessing. Verify the descriptor keys against your bundled RDKit version.

export function getMolWeight(rdkit, mol) {
  try {
    const mw = typeof mol.get_exact_mw === 'function' ? mol.get_exact_mw() : 0;
    return mw && mw > 0 ? mw : null;
  } catch {
    return null;
  }
}

export function getAtomCounts(rdkit, mol) {
  try {
    const desc = JSON.parse(mol.get_descriptors());
    const C = desc.NumCarbon ?? desc.NumCarbons ?? null;
    const N = desc.NumNitrogen ?? desc.NumNitrogens ?? null;
    const O = desc.NumOxygen ?? desc.NumOxygens ?? null;
    const H = desc.NumHydrogen ?? desc.NumHydrogens ?? desc.NumHs ?? null;
    if ([C, H, O].some((v) => v === null || Number.isNaN(v))) return null;
    return { C, H, N: N ?? 0, O };
  } catch {
    return null;
  }
}
