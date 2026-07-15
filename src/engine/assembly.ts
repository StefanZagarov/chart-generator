import { SIGN_NAMES, SIGN_GLYPHS, fmtDM, dAng } from "./almanac";
import type {
  Aspect,
  AspectType,
  Chart,
  Planet,
  PlanetName,
} from "../types/";

/** Chart assembly — the astrological half of the old engine, ported as-is.
 * Takes raw sky numbers (whatever engine produced them) and builds the app's
 * Chart: signs, houses, labels, and the aspect web. Pure functions, no WASM. */

/** one body as the raw engine hands it over: just a name, a longitude, a speed */
export interface RawBody {
  name: PlanetName;
  lon: number;
  /** degrees per day; negative = moving backwards through the zodiac */
  speed: number;
}

/** display glyph per body, in the app's canonical order (copied verbatim) */
export const BODY_GLYPHS: Record<PlanetName, string> = {
  Sun: "☉︎",
  Moon: "☽︎",
  Mercury: "☿︎",
  Venus: "♀︎",
  Mars: "♂︎",
  Jupiter: "♃︎",
  Saturn: "♄︎",
  Uranus: "♅︎",
  Neptune: "♆︎",
  Pluto: "♇︎",
  Node: "☊︎",
};

/** [type, glyph, exact angle, base orb] — the app's astrological opinions, verbatim */
const ASPECTS: [AspectType, string, number, number][] = [
  ["Conjunction", "☌︎", 0, 8],
  ["Sextile", "⚹︎", 60, 5],
  ["Square", "□︎", 90, 7],
  ["Trine", "△︎", 120, 7],
  ["Opposition", "☍︎", 180, 8],
  // minor aspects — tight orbs, no luminary bonus
  ["Semisextile", "⚺︎", 30, 2],
  ["Quincunx", "⚻︎", 150, 3],
  ["Quintile", "Q", 72, 2],
  ["Biquintile", "bQ", 144, 2],
];
const MINOR: Partial<Record<AspectType, 1>> = {
  Semisextile: 1,
  Quincunx: 1,
  Quintile: 1,
  Biquintile: 1,
};

/** Which house a longitude falls in, 1–12.
 * Logic: each house is the arc from its cusp to the next cusp (wrapping past 360).
 * Measure both the house's span and the planet's offset from the cusp as forward
 * distances; the planet lives in the first house whose span contains its offset.
 * `|| 30` guards a degenerate zero-span cusp pair (equal cusps at extreme latitudes). */
export function houseOf(lonP: number, cusps: number[]): number {
  for (let i = 0; i < 12; i++) {
    const a = cusps[i],
      b = cusps[(i + 1) % 12];
    const span = (((b - a) % 360) + 360) % 360 || 30;
    const off = (((lonP - a) % 360) + 360) % 360;
    if (off < span) return i + 1;
  }
  return 12;
}

/** dress up one raw body: sign, house, labels, retrograde flag */
function buildPlanet(raw: RawBody, cusps: number[]): Planet {
  const sign = Math.floor(raw.lon / 30);
  const inSign = raw.lon % 30;
  return {
    name: raw.name,
    glyph: BODY_GLYPHS[raw.name],
    lon: raw.lon,
    speed: raw.speed,
    // the mean node always drifts backwards (~-0.05°/day) — flagging it ℞ forever
    // would be noise, so the Node is exempt from the retrograde mark by convention
    retro: raw.name === "Node" ? false : raw.speed < 0,
    sign,
    signName: SIGN_NAMES[sign],
    signGlyph: SIGN_GLYPHS[sign],
    degLabel: fmtDM(inSign),
    posLabel: fmtDM(inSign) + " " + SIGN_GLYPHS[sign],
    house: houseOf(raw.lon, cusps),
  };
}

/** The aspect web.
 * Logic: every unordered pair of bodies, except pairs involving the Node — it
 * makes no aspects by this app's convention (checked by name, so the rule holds
 * no matter what order the bodies arrive in). The pair's separation is the
 * shortest angular distance between them; each aspect type matches if the
 * separation sits within `orb` degrees of the type's exact angle — widened by
 * 1.5° when the Sun or Moon is involved (luminaries get looser orbs by
 * tradition), except for MINOR aspects, which stay tight. If several types
 * match, the tightest (smallest deviation) wins. The final list is sorted
 * tightest-first so the panel reads strongest to weakest. */
function findAspects(planets: Planet[]): Aspect[] {
  const aspects: Aspect[] = [];
  for (let i = 0; i < planets.length; i++)
    for (let j = i + 1; j < planets.length; j++) {
      const a = planets[i],
        b = planets[j];
      if (a.name === "Node" || b.name === "Node") continue;
      const sep = Math.abs(dAng(a.lon, b.lon));
      const lum =
        a.name === "Sun" ||
        a.name === "Moon" ||
        b.name === "Sun" ||
        b.name === "Moon"
          ? 1.5
          : 0;
      let best: { type: AspectType; glyph: string; orb: number } | null = null;
      for (const [type, glyph, angle, orb] of ASPECTS) {
        const d = Math.abs(sep - angle);
        if (d <= orb + (MINOR[type] ? 0 : lum) && (!best || d < best.orb))
          best = { type, glyph, orb: d };
      }
      if (best)
        aspects.push({
          p1: a.name,
          p2: b.name,
          g1: a.glyph,
          g2: b.glyph,
          type: best.type,
          glyph: best.glyph,
          orb: best.orb,
          orbLabel: fmtDM(best.orb),
          lon1: a.lon,
          lon2: b.lon,
        });
    }
  aspects.sort((x, y) => x.orb - y.orb);
  return aspects;
}

/** Raw sky numbers in, the app's Chart out. `bodies` must arrive in BODY_GLYPHS
 * order (Sun…Pluto, Node last); `cusps` is 12 longitudes with cusps[0] = asc. */
export function assembleChart(
  jdUT: number,
  bodies: RawBody[],
  asc: number,
  mc: number,
  cusps: number[],
): Chart {
  const planets = bodies.map((raw) => buildPlanet(raw, cusps));
  return {
    jdUT,
    asc,
    mc,
    cusps,
    planets,
    aspects: findAspects(planets),
    ascLabel: fmtDM(asc % 30) + " " + SIGN_GLYPHS[Math.floor(asc / 30)],
    mcLabel: fmtDM(mc % 30) + " " + SIGN_GLYPHS[Math.floor(mc / 30)],
  };
}
