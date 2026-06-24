// src/utils/validation.js
//
// Lightweight SMILES input validation (format-level, before RDKit parsing).
// Note the whitespace check: an embedded space silently truncates a SMILES/
// SMARTS string and was the cause of a detection pattern not matching.

export function isPlausibleSmiles(input) {
  if (!input || typeof input !== 'string') return false;
  const s = input.trim();
  if (s.length === 0 || s.length > 1000) return false;
  if (/\s/.test(s)) return false;
  return true;
}
