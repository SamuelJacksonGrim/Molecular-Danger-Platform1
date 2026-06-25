// src/engine/exposureContext.js
//
// Exposure-context handling guidance.
//
// DESIGN NOTE — this module was deliberately rewritten during extraction.
// The original monolith multiplied the molecular hazard score by exposure
// route and population vulnerability (e.g. injection 1.5x, heavier weights for
// children), which turns the tool into a "which route/population maximizes
// harm" surface. That optimization framing has been removed. Exposure context
// now outputs HANDLING STRINGENCY — how careful to be — and never re-ranks the
// molecule's hazard by who might be exposed. The hazard score is a property of
// the structure; this layer is about precautions.

const ROUTE_STRINGENCY = {
  inhalation: {
    level: 'high',
    note: 'Airborne route — use a fume hood / respiratory protection and contain vapors and aerosols.',
  },
  injection: {
    level: 'high',
    note: 'Parenteral route — handle sharps and pressurized transfers with maximum care.',
  },
  ingestion: {
    level: 'moderate',
    note: 'Ingestion route — strict no food/drink, wash hands, avoid surface contamination.',
  },
  dermal: {
    level: 'moderate',
    note: 'Dermal route — appropriate gloves and skin protection; check material compatibility.',
  },
};

const DEFAULT_ROUTE = { level: 'moderate', note: 'Use standard laboratory precautions.' };

export function exposureContext(exposure = {}) {
  const {
    route = 'inhalation',
    population = 'adult_healthy',
    ventilation = 'moderate',
  } = exposure;

  const routeInfo = ROUTE_STRINGENCY[route] || DEFAULT_ROUTE;
  const notes = [routeInfo.note];

  // Population sensitivity raises PRECAUTION, not a harm score. It appends an
  // advisory; it does not rank vulnerable people as a hazard multiplier.
  const sensitive = population && population !== 'adult_healthy';
  if (sensitive) {
    notes.push(
      'Context includes sensitive individuals — apply additional containment and exposure controls.'
    );
  }

  if (ventilation === 'poor' || ventilation === 'none') {
    notes.push('Limited ventilation — increase engineering controls before handling volatile hazards.');
  }

  // Stringency is reported as a handling tier, never as a multiplier on hazard.
  let stringency = routeInfo.level;
  if (sensitive && stringency !== 'high') stringency = 'high';

  // Echo the resolved exposure scenario so the report (and UI) can show what
  // generated the guidance — not just the resulting stringency.
  return { stringency, notes, route, population, ventilation };
}
