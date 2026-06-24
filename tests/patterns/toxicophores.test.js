// tests/patterns/toxicophores.test.js
import { describe, it, expect, beforeAll } from 'vitest';
import { getTestRDKit } from '../setup/rdkit.js';
import { parseMolecule } from '../../src/rdkit/moleculeParser.js';
import { matchPatterns } from '../../src/rdkit/smartsMatcher.js';
import { toxicophores } from '../../src/patterns/toxicophores.js';

// Known positives for each toxicophore (public, common reference structures).
const positives = [
  { name: 'Methyl isocyanate', smiles: 'CN=C=O', expect: 'Isocyanate' },
  { name: 'NDMA (nitrosamine)', smiles: 'CN(C)N=O', expect: 'N-Nitrosamine' },
  { name: 'Diethyl thiophosphate core', smiles: 'CCOP(=S)(OCC)O', expect: 'Organophosphate / thiophosphate' },
];

describe('toxicophore detection', () => {
  let rdkit;
  beforeAll(async () => { rdkit = await getTestRDKit(); });

  for (const m of positives) {
    it(`flags ${m.name} (${m.expect})`, () => {
      const mol = parseMolecule(rdkit, m.smiles);
      try {
        const labels = matchPatterns(rdkit, mol, toxicophores).map((p) => p.label);
        expect(labels).toContain(m.expect);
      } finally {
        mol.delete();
      }
    });
  }
});
