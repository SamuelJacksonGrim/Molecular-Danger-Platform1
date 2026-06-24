// tests/patterns/explosives.test.js
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { getTestRDKit } from '../setup/rdkit.js';
import { parseMolecule } from '../../src/rdkit/moleculeParser.js';
import { matchPatterns } from '../../src/rdkit/smartsMatcher.js';
import { explosives } from '../../src/patterns/explosives.js';
import { allPatterns } from '../../src/patterns/index.js';

const energetics = JSON.parse(readFileSync(new URL('../fixtures/knownEnergetics.json', import.meta.url)));
const safe = JSON.parse(readFileSync(new URL('../fixtures/knownSafe.json', import.meta.url)));

describe('explosive / energetic detection', () => {
  let rdkit;
  beforeAll(async () => { rdkit = await getTestRDKit(); });

  for (const m of energetics.molecules) {
    it(`flags ${m.name} as explosive`, () => {
      const mol = parseMolecule(rdkit, m.smiles);
      try {
        const cats = matchPatterns(rdkit, mol, explosives).map((p) => p.cat);
        expect(cats).toContain('explosive');
      } finally {
        mol.delete();
      }
    });
  }

  for (const m of safe.molecules) {
    it(`does NOT flag ${m.name}`, () => {
      const mol = parseMolecule(rdkit, m.smiles);
      try {
        const matches = matchPatterns(rdkit, mol, allPatterns);
        expect(matches.length).toBe(0);
      } finally {
        mol.delete();
      }
    });
  }
});
