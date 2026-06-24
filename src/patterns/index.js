// src/patterns/index.js
//
// Aggregates all structural-alert categories into a single pattern library
// for the hazard engine. Import `allPatterns` for the full set, or a single
// category module directly if you want a narrower scan.

import { explosives } from './explosives.js';
import { cwcAgents } from './cwcAgents.js';
import { toxicophores } from './toxicophores.js';

export const allPatterns = [...explosives, ...cwcAgents, ...toxicophores];

export { explosives, cwcAgents, toxicophores };
export default allPatterns;
