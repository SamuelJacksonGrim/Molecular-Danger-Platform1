// src/rdkit/rdkitLoader.js
//
// Browser-side loader for the RDKit WebAssembly module.
// Expects the RDKit script tag in index.html, which exposes
// window.initRDKitModule. Caches and returns a singleton instance.

let rdkitInstance = null;
let rdkitPromise = null;

export function loadRDKit() {
  if (rdkitInstance) return Promise.resolve(rdkitInstance);
  if (rdkitPromise) return rdkitPromise;

  if (typeof window === 'undefined' || typeof window.initRDKitModule !== 'function') {
    return Promise.reject(
      new Error('RDKit WASM not found. Add RDKit_minimal.js to index.html.')
    );
  }

  rdkitPromise = window
    .initRDKitModule()
    .then((instance) => {
      rdkitInstance = instance;
      return instance;
    })
    .catch((err) => {
      rdkitPromise = null;
      throw err;
    });

  return rdkitPromise;
}

export function getRDKit() {
  return rdkitInstance;
}
