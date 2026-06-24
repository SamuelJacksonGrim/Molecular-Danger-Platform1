// src/rdkit/moleculeParser.js
//
// Thin wrapper around RDKit molecule parsing with explicit error handling.
// The rdkit instance is injected so this module stays testable outside a browser.
// NOTE: the returned mol owns WASM memory — the caller must call mol.delete().

export function parseMolecule(rdkit, smiles) {
  if (!rdkit) throw new Error('RDKit instance not provided');
  if (!smiles || typeof smiles !== 'string') throw new Error('SMILES string required');

  let mol;
  try {
    mol = rdkit.get_mol(smiles.trim());
  } catch (err) {
    throw new Error(`Invalid SMILES: ${smiles}`);
  }

  if (!mol || (typeof mol.is_valid === 'function' && !mol.is_valid())) {
    if (mol && mol.delete) mol.delete();
    throw new Error(`Invalid SMILES: ${smiles}`);
  }

  return mol;
}
