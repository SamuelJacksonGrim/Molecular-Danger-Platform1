// src/rdkit/smartsMatcher.js
//
// Substructure matching against SMARTS patterns. The rdkit instance is injected
// for testability. Query molecules are freed after use.
//
// Verified against RDKit 2025.03.x: the MinimalLib mol API has NO
// has_substruct_match(). The available calls are get_substruct_match() (returns
// a JSON string, "{}" when there is no match) and get_substruct_matches()
// (returns a JSON array of all matches). We use the plural form so pattern
// occurrence counts are available for thresholds like `minForCat`.

export function countSmartsMatches(rdkit, mol, smarts) {
  if (!rdkit) throw new Error('RDKit instance not provided');
  if (!mol) throw new Error('Molecule required');

  let qmol;
  try {
    qmol = rdkit.get_qmol(smarts);
    if (!qmol || (typeof qmol.is_valid === 'function' && !qmol.is_valid())) return 0;
    const arr = JSON.parse(mol.get_substruct_matches(qmol));
    return Array.isArray(arr) ? arr.length : 0;
  } catch (err) {
    return 0;
  } finally {
    if (qmol && qmol.delete) qmol.delete();
  }
}

export function matchesSmarts(rdkit, mol, smarts) {
  return countSmartsMatches(rdkit, mol, smarts) > 0;
}

// Returns the pattern entries that match the molecule. A pattern only counts if
// its occurrence count meets its `minForCat` threshold (default 1) — so, e.g., a
// lone nitro group does not register as an explosive, but polynitro does.
export function matchPatterns(rdkit, mol, patterns) {
  return patterns.filter(
    (p) => countSmartsMatches(rdkit, mol, p.smarts) >= (p.minForCat || 1)
  );
}
