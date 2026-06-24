// src/rdkit/smartsMatcher.js
//
// Substructure matching: does a molecule contain a given SMARTS pattern?
// rdkit instance injected for testability. Query molecules are freed after use.

export function matchesSmarts(rdkit, mol, smarts) {
  if (!rdkit) throw new Error('RDKit instance not provided');
  if (!mol) throw new Error('Molecule required');

  let qmol;
  try {
    qmol = rdkit.get_qmol(smarts);
    if (!qmol || (typeof qmol.is_valid === 'function' && !qmol.is_valid())) return false;
    return mol.has_substruct_match(qmol);
  } catch (err) {
    return false;
  } finally {
    if (qmol && qmol.delete) qmol.delete();
  }
}

// Runs a pattern library against a molecule, returning the matched entries.
export function matchPatterns(rdkit, mol, patterns) {
  return patterns.filter((p) => matchesSmarts(rdkit, mol, p.smarts));
}
