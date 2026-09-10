import { SIGN_NAMES, SIGN_GLYPHS, fmtDM, dAng } from "./almanac";
import type {
  Aspect,
  AspectType,
  Chart,
  OrbConfig,
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
  "North Node": "☊︎",
  "South Node": "☋︎",
};

/** Aspect geometry and display metadata; orb widths live in OrbConfig. */
export const ASPECT_DEFINITIONS = [
  { type: "Conjunction", glyph: "☌︎", angle: 0 },
  { type: "Opposition", glyph: "☍︎", angle: 180 },
  { type: "Square", glyph: "□︎", angle: 90 },
  { type: "Trine", glyph: "△︎", angle: 120 },
  { type: "Sextile", glyph: "⚹︎", angle: 60 },
  { type: "Semisextile", glyph: "⚺︎", angle: 30 },
  { type: "Quincunx", glyph: "⚻︎", angle: 150 },
  { type: "Semisquare", glyph: "∠", angle: 45 },
  { type: "Sesquisquare", glyph: "⚼︎", angle: 135 },
  { type: "Quintile", glyph: "Q", angle: 72 },
  { type: "Biquintile", glyph: "bQ", angle: 144 },
] as const;

export const DEFAULT_ORB_CONFIG: OrbConfig = {
  aspects: {
    Conjunction: 8,
    Sextile: 6,
    Square: 7,
    Trine: 7,
    Opposition: 8,
    Semisextile: 2,
    Semisquare: 2,
    Sesquisquare: 2,
    Quincunx: 3,
    Quintile: 2,
    Biquintile: 2,
  },
  luminaryBonus: 2,
};
const MINOR: Partial<Record<AspectType, 1>> = {
  Semisextile: 1,
  Semisquare: 1,
  Sesquisquare: 1,
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
    // the mean nodes always drift backwards (~-0.05°/day) — flagging them ℞
    // forever would be noise, so both are exempt by convention
    retro:
      raw.name === "North Node" || raw.name === "South Node"
        ? false
        : raw.speed < 0,
    sign,
    signName: SIGN_NAMES[sign],
    signGlyph: SIGN_GLYPHS[sign],
    degLabel: fmtDM(inSign),
    posLabel: fmtDM(inSign) + " " + SIGN_GLYPHS[sign],
    house: houseOf(raw.lon, cusps),
  };
}

/** The aspect web.
 * Logic: every unordered pair of bodies, except pairs involving either lunar
 * node — they make no aspects by this app's current convention. The pair's separation is the
 * shortest angular distance between them; each aspect type matches if the
 * separation sits within the configured degrees of the type's exact angle —
 * widened by the shared bonus when the Sun or Moon is involved, except for
 * MINOR aspects, which stay tight. If several types
 * match, the tightest (smallest deviation) wins. The final list is sorted
 * tightest-first so the panel reads strongest to weakest. */
function findAspects(planets: Planet[], orbConfig: OrbConfig): Aspect[] {
  const aspects: Aspect[] = [];
  for (let i = 0; i < planets.length; i++)
    for (let j = i + 1; j < planets.length; j++) {
      const a = planets[i],
        b = planets[j];
      if (
        a.name === "North Node" ||
        a.name === "South Node" ||
        b.name === "North Node" ||
        b.name === "South Node"
      )
        continue;
      const sep = Math.abs(dAng(a.lon, b.lon));
      const hasLuminary =
        a.name === "Sun" ||
        a.name === "Moon" ||
        b.name === "Sun" ||
        b.name === "Moon";
      let best:
        | { type: AspectType; glyph: string; orb: number; maxOrb: number }
        | null = null;
      for (const { type, glyph, angle } of ASPECT_DEFINITIONS) {
        const d = Math.abs(sep - angle);
        const maxOrb =
          orbConfig.aspects[type] +
          (MINOR[type] || !hasLuminary ? 0 : orbConfig.luminaryBonus);
        if (d <= maxOrb && (!best || d < best.orb))
          best = { type, glyph, orb: d, maxOrb };
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
          maxOrb: best.maxOrb,
          orbLabel: fmtDM(best.orb),
          lon1: a.lon,
          lon2: b.lon,
        });
    }
  aspects.sort((x, y) => x.orb - y.orb);
  return aspects;
}

/** Raw sky numbers in, the app's Chart out. The South Node is derived exactly
 * opposite the North Node; `cusps` is 12 longitudes with cusps[0] = asc. */
export function assembleChart(
  jdUT: number,
  bodies: RawBody[],
  asc: number,
  mc: number,
  cusps: number[],
  orbConfig: OrbConfig = DEFAULT_ORB_CONFIG,
): Chart {
  const northNode = bodies.find(({ name }) => name === "North Node");
  const chartBodies =
    northNode && !bodies.some(({ name }) => name === "South Node")
      ? [
          ...bodies,
          {
            name: "South Node" as const,
            lon: (northNode.lon + 180) % 360,
            speed: northNode.speed,
          },
        ]
      : bodies;
  const planets = chartBodies.map((raw) => buildPlanet(raw, cusps));
  return {
    jdUT,
    asc,
    mc,
    cusps,
    planets,
    aspects: findAspects(planets, orbConfig),
    ascLabel: fmtDM(asc % 30) + " " + SIGN_GLYPHS[Math.floor(asc / 30)],
    mcLabel: fmtDM(mc % 30) + " " + SIGN_GLYPHS[Math.floor(mc / 30)],
  };
}
