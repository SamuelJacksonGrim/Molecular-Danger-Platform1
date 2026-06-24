// src/engine/assessMolecule.js
//
// Top-level orchestration: parse -> match patterns -> oxygen balance -> score
// -> exposure handling guidance -> PubChem cross-reference -> assembled report.
//
// The rdkit instance and (optionally) a PubChem lookup function are injected,
// so the whole pipeline is unit-testable outside the browser.

import { parseMolecule } from '../rdkit/moleculeParser.js';
import { matchPatterns } from '../rdkit/smartsMatcher.js';
import { oxygenBalance as computeOxygenBalance } from './oxygenBalance.js';
import { scoreHazards } from './hazardScoring.js';
import { exposureContext } from './exposureContext.js';
import { buildReport } from './reportBuilder.js';
import { lookupPubChem } from '../services/pubchem.js';
import { allPatterns } from '../patterns/index.js';

const EMPTY_PUBCHEM = {
  available: false,
  cid: null,
  iupacName: null,
  molecularWeight: null,
  ld50: null,
};

export async function assessMolecule(rdkit, smiles, exposure = {}, options = {}) {
  const {
    patterns = allPatterns,
    pubchemLookup = lookupPubChem,
    skipPubChem = false,
  } = options;

  let mol;
  try {
    mol = parseMolecule(rdkit, smiles);

    const matched = matchPatterns(rdkit, mol, patterns);
    const ob = computeOxygenBalance(rdkit, mol);
    const scoring = scoreHazards(matched, ob);
    const handling = exposureContext(exposure);

    const pubchem = skipPubChem ? EMPTY_PUBCHEM : await pubchemLookup(smiles.trim());

    return buildReport({
      smiles: smiles.trim(),
      scoring,
      oxygenBalance: ob,
      exposure: handling,
      pubchem,
    });
  } finally {
    if (mol && mol.delete) mol.delete(); // free WASM memory (the monolith leaked here)
  }
}
