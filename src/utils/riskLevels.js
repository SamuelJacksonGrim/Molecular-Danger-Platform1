// src/utils/riskLevels.js
//
// Maps a 0–1 hazard score to a danger level and a display color.

export const DANGER_LEVELS = ['MINIMAL', 'LOW', 'MODERATE', 'HIGH', 'CRITICAL'];

export function dangerLevelFor(score) {
  if (score >= 0.8) return 'CRITICAL';
  if (score >= 0.6) return 'HIGH';
  if (score >= 0.4) return 'MODERATE';
  if (score >= 0.2) return 'LOW';
  return 'MINIMAL';
}

export function dangerColorFor(score) {
  if (score >= 0.8) return 'bg-red-600';
  if (score >= 0.6) return 'bg-orange-600';
  if (score >= 0.4) return 'bg-yellow-600';
  if (score >= 0.2) return 'bg-blue-600';
  return 'bg-green-600';
}
