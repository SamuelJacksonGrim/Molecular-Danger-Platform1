// tests/setup/rdkit.js
//
// Initializes RDKit once for the Node test environment.
//
// NOTE: the exact init form depends on your @rdkit/rdkit version and bundler.
// Install with:  npm i -D @rdkit/rdkit vitest
// If the WASM file isn't found at runtime, pass a locateFile that points at
// node_modules/@rdkit/rdkit/dist/RDKit_minimal.wasm. Adjust for your setup.

import initRDKitModule from '@rdkit/rdkit';

let instance = null;

export async function getTestRDKit() {
  if (instance) return instance;
  instance = await initRDKitModule();
  return instance;
}
