// ── Pressure Curve Math ──────────────────────────────────────
// Pure functions — no DOM access. Reads `params` from params.js.
//
// x is remapped from [inputMinimum, inputMaximum] → [0, 1],
// then a curve is applied (power or sigmoid),
// then mapped to [outputMinimum, outputMaximum].
//
// Curve formula reference: https://www.desmos.com/calculator/97s6f0yhlb


// Cubic Hermite spline on t ∈ [0,1].
// y0/y1 are values, m0/m1 are slopes (in t-space) at each endpoint.
// Guarantees exact values and exact slopes at both ends (G1 continuity).
function cubicHermite(t, y0, m0, y1, m1) {
  const t2 = t * t, t3 = t2 * t;
  return (2*t3 - 3*t2 + 1)*y0 + (t3 - 2*t2 + t)*m0
       + (-2*t3 + 3*t2)   *y1 + (t3 - t2)      *m1;
}

// Raw curve output for xNorm ∈ [0,1] — no transition blending applied.
// Used both for the main curve and for slope estimation at zone boundaries.
function rawCurveOutput(xNorm) {
  const { softness, minimum, maximum, curveType } = params;
  let curved;
  if (curveType === 'sigmoid') {
    // Logistic sigmoid normalized to pass through (0,0) and (1,1).
    // CurveAmount (softness) controls steepness; 0 → linear.
    const k = softness * 14;
    if (Math.abs(k) < 0.01) {
      curved = xNorm;
    } else {
      const sig   = t => 1 / (1 + Math.exp(-k * (t - 0.5)));
      const s0    = sig(0), s1 = sig(1), range = s1 - s0;
      curved = Math.abs(range) < 1e-10 ? xNorm : (sig(xNorm) - s0) / range;
    }
  } else {
    // Power curve (default)
    // softness >= 0: exponent = 1 - softness  (concave, 1.0 → 0.1)
    // softness <  0: exponent = 1/(1+softness) (convex,  1.0 → 10)
    const exp = softness >= 0 ? 1 - softness : 1 / (1 + softness);
    curved = Math.pow(Math.max(0, xNorm), exp);
  }
  return minimum + curved * (maximum - minimum);
}

// Numerical slope of rawCurveOutput at xNorm (dy/dxNorm).
function rawCurveSlope(xNorm) {
  const eps = 0.0005;
  return (rawCurveOutput(Math.min(1, xNorm + eps)) - rawCurveOutput(Math.max(0, xNorm - eps)))
       / (Math.min(1, xNorm + eps) - Math.max(0, xNorm - eps));
}

function applyPressureCurve(x) {
  const { inputMinimum, inputMaximum, minimum, maximum, curveType, transitionWidth } = params;

  // Null curve: identity passthrough — output equals input with no remapping
  if (curveType === 'null') return x;

  // Flat curve: constant output regardless of input
  if (curveType === 'flat') return params.flatLevel;

  // Remap x from [inputMinimum, inputMaximum] to [0, 1]
  const inRange = inputMaximum - inputMinimum;
  const xNorm   = inRange > 0 ? Math.min(1, Math.max(0, (x - inputMinimum) / inRange)) : 0;

  const baseOut = rawCurveOutput(xNorm);

  // Transition blending — cubic Hermite spline at each flat→curve junction.
  // transitionWidth is a fraction [0, 0.5] of the middle segment in xNorm space.
  // At each zone boundary the Hermite matches the raw curve's exact slope,
  // giving smooth G1 continuity with no kink where the zones meet the curve.
  if (transitionWidth > 0) {
    const tw = transitionWidth;

    if (xNorm < tw) {
      // Start zone: Hermite from (xNorm=0, y=minimum, slope=0) → (xNorm=tw, raw curve)
      const t  = xNorm / tw;
      const y1 = rawCurveOutput(tw);
      const m1 = rawCurveSlope(tw) * tw;  // slope scaled to t-space
      return cubicHermite(t, minimum, 0, y1, m1);
    }

    if (xNorm > 1 - tw) {
      // End zone: Hermite from (xNorm=1-tw, raw curve) → (xNorm=1, y=maximum, slope=0)
      const s  = (xNorm - (1 - tw)) / tw;
      const y0 = rawCurveOutput(1 - tw);
      const m0 = rawCurveSlope(1 - tw) * tw;  // slope scaled to s-space
      return cubicHermite(s, y0, m0, maximum, 0);
    }
  }

  return baseOut;
}
