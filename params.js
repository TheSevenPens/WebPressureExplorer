// ── Shared Parameters & DOM Refs ─────────────────────────────
// Loaded first. Everything else reads `params`, `sliders`,
// `valueEls`, and `formatValue` as globals.

const DEFAULT_PARAMS = {
  softness:        0.0,
  inputMinimum:    0,
  inputMaximum:    1,
  minimum:         0,
  maximum:         1,
  curveType:       'power',
  transitionWidth: 0,
  flatLevel:       0.5,
};

const params = { ...DEFAULT_PARAMS };

// Slider elements — referenced by both curve-editor (drag) and controls (input events)
const sliders = {
  softness:        document.getElementById('slider-softness'),
  transitionWidth: document.getElementById('slider-transition-width'),
  inputMinimum:    document.getElementById('slider-input-minimum'),
  inputMaximum:    document.getElementById('slider-input-maximum'),
  minimum:         document.getElementById('slider-minimum'),
  maximum:         document.getElementById('slider-maximum'),
  flatLevel:       document.getElementById('slider-flat-level'),
};

// Numeric value display elements
const valueEls = {
  softness:        document.getElementById('val-softness'),
  transitionWidth: document.getElementById('val-transition-width'),
  inputMinimum:    document.getElementById('val-input-minimum'),
  inputMaximum:    document.getElementById('val-input-maximum'),
  minimum:         document.getElementById('val-minimum'),
  maximum:         document.getElementById('val-maximum'),
  flatLevel:       document.getElementById('val-flat-level'),
};

function formatValue(val) {
  return parseFloat(val).toFixed(2);
}
