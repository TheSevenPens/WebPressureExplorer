import { describe, it, expect } from 'vitest';
import { azimuthOf, altitudeOf, buildPointerInfo } from './pressurePipeline';

/**
 * A pointer event as an older browser hands it over: tilt, and nothing else.
 *
 * Safari only grew `azimuthAngle` and `altitudeAngle` in 18.2, so a plain object with
 * neither is a fair stand-in for one that has not.
 */
function tiltOnly(tiltX, tiltY) {
  return { tiltX, tiltY, pointerType: 'pen' };
}

const HALF_PI = Math.PI / 2;

describe('azimuthOf / altitudeOf', () => {
  it('takes the browser’s own values when it has them', () => {
    const event = { azimuthAngle: 1.25, altitudeAngle: 0.5, tiltX: 40, tiltY: -40 };

    expect(azimuthOf(event)).toBe(1.25);
    expect(altitudeOf(event)).toBe(0.5);
  });

  it('reads no tilt as an upright pen, not a flat one', () => {
    // The distinction this test exists for. The specification's default altitude is
    // pi/2 -- vertical -- and reporting 0 instead says the pen is lying on the tablet,
    // which is a hardware fault someone could spend an afternoon chasing.
    expect(altitudeOf(tiltOnly(0, 0))).toBeCloseTo(HALF_PI, 10);
  });

  it('derives altitude from tilt', () => {
    // Leaning 60 degrees in one axis alone leaves the pen 30 degrees off the tablet.
    expect(altitudeOf(tiltOnly(60, 0))).toBeCloseTo(Math.PI / 6, 6);
    expect(altitudeOf(tiltOnly(0, -60))).toBeCloseTo(Math.PI / 6, 6);

    // Equal tilt in both axes leans further than either one alone.
    expect(altitudeOf(tiltOnly(45, 45))).toBeLessThan(altitudeOf(tiltOnly(45, 0)));
  });

  it('derives azimuth from tilt, all the way round', () => {
    const quarter = HALF_PI;

    expect(azimuthOf(tiltOnly(30, 0))).toBeCloseTo(0, 10);
    expect(azimuthOf(tiltOnly(30, 30))).toBeCloseTo(quarter / 2, 6);
    expect(azimuthOf(tiltOnly(0, 30))).toBeCloseTo(quarter, 10);
    expect(azimuthOf(tiltOnly(-30, 0))).toBeCloseTo(Math.PI, 10);
    expect(azimuthOf(tiltOnly(0, -30))).toBeCloseTo(3 * quarter, 10);
  });

  it('never reports an angle outside its own range', () => {
    for (let x = -60; x <= 60; x += 15) {
      for (let y = -60; y <= 60; y += 15) {
        const azimuth = azimuthOf(tiltOnly(x, y));
        const altitude = altitudeOf(tiltOnly(x, y));

        expect(Number.isFinite(azimuth)).toBe(true);
        expect(azimuth).toBeGreaterThanOrEqual(0);
        expect(azimuth).toBeLessThan(2 * Math.PI);

        expect(Number.isFinite(altitude)).toBe(true);
        expect(altitude).toBeGreaterThanOrEqual(0);
        expect(altitude).toBeLessThanOrEqual(HALF_PI);
      }
    }
  });
});

describe('buildPointerInfo', () => {
  const processed = {
    order: 'smooth-then-curve',
    preCurvePressure: 0.4,
    curvedPressure: 0.3,
    smoothedPressure: 0.4,
    outputPressure: 0.3,
  };

  it('shows the derived angles where the browser reports none', () => {
    const info = buildPointerInfo(tiltOnly(0, 0), 0.5, processed);

    // Upright, and pointing nowhere in particular because it is not leaning.
    expect(info.altitude).toBe('90.0°');
    expect(info.azimuth).toBe('0.0°');
    expect(info.tiltX).toBe('0.0°');
  });

  it('shows the browser’s own angles where it reports them', () => {
    const info = buildPointerInfo(
      { tiltX: 0, tiltY: 0, azimuthAngle: Math.PI, altitudeAngle: 0, pointerType: 'pen' },
      0.5,
      processed,
    );

    expect(info.azimuth).toBe('180.0°');
    expect(info.altitude).toBe('0.0°');
  });
});
