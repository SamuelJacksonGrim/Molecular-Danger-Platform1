// tests/patterns/cwc.test.js
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { getTestRDKit } from '../setup/rdkit.js';
import { parseMolecule } from '../../src/rdkit/moleculeParser.js';
import { matchPatterns } from '../../src/rdkit/smartsMatcher.js';
import { cwcAgents } from '../../src/patterns/cwcAgents.js';

const scheduled = JSON.parse(readFileSync(new URL('../fixtures/scheduledAgents.json', import.meta.url)));

describe('CWC-scheduled agent detection (regression set)', () => {
  let rdkit;
  beforeAll(async () => { rdkit = await getTestRDKit(); });

  for (const m of scheduled.molecules) {
    it(`flags ${m.name} as a chemical weapon`, () => {
      const mol = parseMolecule(rdkit, m.smiles);
      try {
        const cats = matchPatterns(rdkit, mol, cwcAgents).map((p) => p.cat);
        expect(cats).toContain('chemical_weapon');
      } finally {
        mol.delete();
      }
    });
  }
});
