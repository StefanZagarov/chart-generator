import { ascAt } from "../engine/swiss";
import type { HouseSystem } from "../types";

// ms for the sky to turn 1° (sidereal day / 360)
// A sidereal day (86164090.5 ms ≈ 23h 56m 4s) is one full rotation of the Earth
// relative to the stars — the time it takes the whole wheel to come back around.
const SID_MS = 86164090.5 / 360;

// Turn the wheel by deltaDeg = find the time when the ascendant has moved by deltaDeg.
// Logic: we can't invert asc(t) algebraically, so we guess a time and correct the guess
// against the real engine — secant iteration: estimate the ascendant's local speed from
// the last two guesses and use it to convert "degrees still missing" into "ms to add".
export function scrub(
  deltaDeg: number,
  from: { utcMs: number; asc: number }, // where the wheel is now
  lat: number,
  lon: number,
  houseSystem: HouseSystem,
): number {
  // shortest signed distance from angle a to angle b, in (-180, 180] — so an error
  // across the 360→0 seam reads as e.g. -2°, not +358°
  const angleDiff = (a: number, b: number) => ((b - a + 540) % 360) - 180;

  // the ascendant we're hunting for: current asc + the angle the user swept,
  // normalized into [0, 360)
  const target = (((from.asc + deltaDeg) % 360) + 360) % 360;

  // the last guess and its resulting asc — the "previous point" of the secant
  let tPrev = from.utcMs;
  let ascPrev = from.asc;
  // first guess: assume the ascendant moves at the average sky rate, 1° per SID_MS
  let t = from.utcMs + deltaDeg * SID_MS;

  for (let i = 0; i < 6; i++) {
    // ask the engine where the ascendant actually is at the guessed time —
    // ascAt is the adapter's fast path: a houses call only, no planets built
    const asc = ascAt(t, lat, lon, houseSystem);
    // how far off we still are, in degrees
    const err = angleDiff(asc, target);
    if (Math.abs(err) < 0.01) break; // close enough: within 0.01°
    // measured speed of the ascendant between the last two guesses, in °/ms —
    // the slope of the secant line through those two points
    let rate = angleDiff(ascPrev, asc) / (t - tPrev);
    // guard: on the very first loop tPrev === t is impossible but rate can still be
    // degenerate (near-polar charts where the ascendant stalls or leaps); fall back
    // to the average sky rate rather than dividing by ~0
    if (!isFinite(rate) || Math.abs(rate) < 1e-9) rate = 1 / SID_MS;
    // this guess becomes the "previous point" for the next secant
    tPrev = t;
    ascPrev = asc;
    // correct the guess: "err degrees short at rate °/ms" → move err/rate ms
    t += err / rate;
  }
  // the time at which the ascendant sits (within 0.01°) where the user dragged it
  return t;
}
