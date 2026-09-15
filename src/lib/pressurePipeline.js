import { applyPressureCurve } from './curveMath';
import { SMOOTHING_ORDER, SMOOTHING_TYPE } from './uiConstants';

export const EMPTY_POINTER_INFO = Object.freeze({
  type: '---',
  pressureRaw: '---',
  pressureCurved: '---',
  pressureSmoothed: '---',
  pressureOutput: '---',
  smoothingOrder: SMOOTHING_ORDER.SMOOTH_THEN_CURVE,
  tiltX: '---',
  tiltY: '---',
  azimuth: '---',
  altitude: '---',
});

// Holds the EMA state for one input surface. Each view that accepts pen input
// makes its own, so switching views starts from a clean smoothing state
// instead of carrying a stale value across.
/**
 * Holds the EMA state for one input surface.
 * @returns {{ reset(): void, process(rawPressure: number, params: import('./curveTypes').Params): object }}
 */
export function createPressureProcessor() {
  let smoothedPressure = null;

  function smooth(rawPressure, params) {
    const type = params.smoothingType ?? SMOOTHING_TYPE.EMA;
    if (type === SMOOTHING_TYPE.PASSTHROUGH) {
      smoothedPressure = rawPressure;
      return rawPressure;
    }

    const smoothing = Math.min(0.99, Math.max(0, Number(params.emaSmoothing ?? 0)));

    if (smoothing <= 0 || smoothedPressure === null) {
      smoothedPressure = rawPressure;
      return rawPressure;
    }

    const alpha = 1 - smoothing;
    smoothedPressure = smoothedPressure + alpha * (rawPressure - smoothedPressure);
    return smoothedPressure;
  }

  return {
    reset() {
      smoothedPressure = null;
    },

    process(rawPressure, params) {
      const order = params.smoothingOrder ?? SMOOTHING_ORDER.SMOOTH_THEN_CURVE;

      if (order === SMOOTHING_ORDER.CURVE_THEN_SMOOTH) {
        const curved = applyPressureCurve(rawPressure, params);
        const smoothed = smooth(curved, params);
        return {
          order,
          preCurvePressure: rawPressure,
          curvedPressure: curved,
          smoothedPressure: smoothed,
          outputPressure: smoothed,
        };
      }

      const smoothed = smooth(rawPressure, params);
      const curved = applyPressureCurve(smoothed, params);
      return {
        order: SMOOTHING_ORDER.SMOOTH_THEN_CURVE,
        preCurvePressure: smoothed,
        curvedPressure: curved,
        smoothedPressure: smoothed,
        outputPressure: curved,
      };
    },
  };
}

const toRadians = (degrees) => degrees * Math.PI / 180;

/**
 * The pen's compass direction, in radians.
 *
 * `azimuthAngle` and `altitudeAngle` are newer than the rest of PointerEvent: Safari
 * only grew them in 18.2. Read straight they come out `undefined`, and a `?? 0` then
 * reports a pen lying flat on the tablet and pointing due east -- a reading, rather
 * than the absence of one, which is exactly the fault this app exists to help people
 * rule out.
 *
 * Both can be derived from `tiltX` and `tiltY`, which every implementation reports, so
 * the numbers stay true instead of being invented. The conversion is the one in the
 * Pointer Events specification.
 *
 * @param {PointerEvent} pointerEvent
 * @returns {number}
 */
export function azimuthOf(pointerEvent) {
  if (typeof pointerEvent.azimuthAngle === 'number') return pointerEvent.azimuthAngle;

  const x = toRadians(pointerEvent.tiltX ?? 0);
  const y = toRadians(pointerEvent.tiltY ?? 0);

  if (x === 0) return y > 0 ? Math.PI / 2 : (y < 0 ? 3 * Math.PI / 2 : 0);
  if (y === 0) return x > 0 ? 0 : Math.PI;

  const azimuth = Math.atan2(Math.tan(y), Math.tan(x));
  return azimuth < 0 ? azimuth + 2 * Math.PI : azimuth;
}

/**
 * How upright the pen is, in radians: 0 is flat on the tablet, pi/2 is vertical.
 *
 * @param {PointerEvent} pointerEvent
 * @returns {number}
 */
export function altitudeOf(pointerEvent) {
  if (typeof pointerEvent.altitudeAngle === 'number') return pointerEvent.altitudeAngle;

  const x = toRadians(pointerEvent.tiltX ?? 0);
  const y = toRadians(pointerEvent.tiltY ?? 0);

  // No tilt reported is an upright pen, which is the specification's own default.
  // Reading it as zero would say the opposite: flat on the tablet.
  if (x === 0 && y === 0) return Math.PI / 2;

  return Math.atan(1 / Math.hypot(Math.tan(x), Math.tan(y)));
}

export function buildPointerInfo(pointerEvent, rawPressure, processed) {
  const toDegrees = (radians) => (radians * 180 / Math.PI).toFixed(1);

  return {
    type: pointerEvent.pointerType || '---',
    pressureRaw: rawPressure.toFixed(3),
    pressureCurved: processed.curvedPressure.toFixed(3),
    pressureSmoothed: processed.smoothedPressure.toFixed(3),
    pressureOutput: processed.outputPressure.toFixed(3),
    smoothingOrder: processed.order,
    tiltX: `${Number(pointerEvent.tiltX ?? 0).toFixed(1)}°`,
    tiltY: `${Number(pointerEvent.tiltY ?? 0).toFixed(1)}°`,
    azimuth: `${toDegrees(azimuthOf(pointerEvent))}°`,
    altitude: `${toDegrees(altitudeOf(pointerEvent))}°`,
  };
}

/**
 * One pointer sample turned into everything the live indicators and readouts
 * need. Both input surfaces do exactly this, so they share it rather than
 * each assigning the same four fields.
 */
export function readPointerSample(processor, event, params) {
  const rawPressure = Number(event.pressure ?? 0);
  const processed = processor.process(rawPressure, params);

  return {
    liveRawPressure: rawPressure,
    livePressure: processed.preCurvePressure,
    liveOutputPressure: processed.outputPressure,
    info: buildPointerInfo(event, rawPressure, processed),
    processed,
  };
}

/** The idle counterpart, for when the pointer lifts or leaves. */
export function clearPointerSample(processor) {
  processor.reset();

  return {
    liveRawPressure: null,
    livePressure: null,
    liveOutputPressure: null,
    info: { ...EMPTY_POINTER_INFO },
  };
}
