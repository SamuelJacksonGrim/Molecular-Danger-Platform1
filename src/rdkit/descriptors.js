// src/rdkit/descriptors.js
//
// Molecular descriptors via RDKit.js. The rdkit instance is injected for testability.
//
// Verified against RDKit 2025.03.x: get_descriptors() exposes molecular weight
// (amw) but NOT per-element atom counts, and there is no get_exact_mw() method.
// So molecular weight is read from the descriptor JSON, and elemental counts are
// obtained by adding explicit hydrogens to a COPY of the molecule and tallying
// atoms from the commonchem JSON (carbon atoms omit their z field and fall back
// to defaults.atom.z = 6). getAtomCounts() returns null if anything is
// unavailable, so oxygenBalance() degrades to "unavailable" rather than guessing.

const ATOMIC_SYMBOL = {
  1: 'H', 6: 'C', 7: 'N', 8: 'O', 9: 'F',
  15: 'P', 16: 'S', 17: 'Cl', 35: 'Br', 53: 'I',
};

export function getMolWeight(rdkit, mol) {
  try {
    const d = JSON.parse(mol.get_descriptors());
    const mw = d.amw ?? d.exactmw ?? null;
    return mw && mw > 0 ? mw : null;
  } catch {
    return null;
  }
}

export function getAtomCounts(rdkit, mol) {
  let molH;
  try {
    molH = mol.copy();
    molH.add_hs_in_place();

    const j = JSON.parse(molH.get_json());
    const m = j.molecules && j.molecules[0];
    if (!m || !Array.isArray(m.atoms)) return null;

    const defaultZ = (j.defaults && j.defaults.atom && j.defaults.atom.z) || 6;
    const counts = { C: 0, H: 0, N: 0, O: 0 };
    for (const atom of m.atoms) {
      const z = atom.z !== undefined ? atom.z : defaultZ;
      const sym = ATOMIC_SYMBOL[z];
      if (sym && counts[sym] !== undefined) counts[sym] += 1;
    }
    return counts;
  } catch {
    return null;
  } finally {
    if (molH && molH.delete) molH.delete();
  }
}
