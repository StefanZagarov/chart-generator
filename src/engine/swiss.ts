import {
  SwissEphemeris,
  Planet as SwePlanet,
  LunarPoint,
  HouseSystem as SweHouseSystem,
} from "@swisseph/browser";
import { assembleChart } from "./assembly";
import type { RawBody } from "./assembly";
import { norm } from "./almanac";
import type { Chart, HouseSystem, PlanetName } from "../types/";

/** The Swiss Ephemeris adapter — the only file that talks to the WASM engine.
 * initEngine() must resolve once (main.tsx awaits it before mounting React);
 * after that computeChart/ascAt are synchronous, so nothing above this file
 * knows the engine changed. Uses the built-in Moshier ephemeris: no data files,
 * works offline, sub-arcsecond planet positions. */

// our body order (Sun…Pluto, Node last — assembly and the wheel rely on it),
// each mapped to its Swiss Ephemeris body id. Node = MEAN node, matching the
// old engine; the true node wobbles daily and would flicker on the wheel.
const BODY_IDS: [PlanetName, number][] = [
  ["Sun", SwePlanet.Sun],
  ["Moon", SwePlanet.Moon],
  ["Mercury", SwePlanet.Mercury],
  ["Venus", SwePlanet.Venus],
  ["Mars", SwePlanet.Mars],
  ["Jupiter", SwePlanet.Jupiter],
  ["Saturn", SwePlanet.Saturn],
  ["Uranus", SwePlanet.Uranus],
  ["Neptune", SwePlanet.Neptune],
  ["Pluto", SwePlanet.Pluto],
  ["Node", LunarPoint.MeanNode],
];

// our house-system names → Swiss Ephemeris system letters
const HOUSE_IDS: Record<HouseSystem, SweHouseSystem> = {
  Placidus: SweHouseSystem.Placidus,
  "Whole Sign": SweHouseSystem.WholeSign,
  Equal: SweHouseSystem.Equal,
  Porphyry: SweHouseSystem.Porphyrius,
  Koch: SweHouseSystem.Koch,
};

let swe: SwissEphemeris | null = null;
let ready: Promise<void> | null = null;

/** Load + compile the WASM module. Idempotent: every caller shares one promise —
 * but a FAILED load is not cached, so calling initEngine() again retries. */
export function initEngine(): Promise<void> {
  if (!ready) {
    const instance = new SwissEphemeris();
    ready = instance.init().then(
      () => {
        swe = instance;
      },
      (err) => {
        ready = null;
        throw err;
      },
    );
  }
  return ready;
}

// Unix epoch (1970-01-01 00:00 UTC) as a Julian day; +ms/day converts utcMs → jdUT.
// Swiss's *_ut calls take UT directly and apply ΔT internally — no correction here.
const toJd = (utcMs: number) => utcMs / 86400000 + 2440587.5;

function engine(): SwissEphemeris {
  if (!swe) throw new Error("Swiss Ephemeris not initialized — await initEngine() first");
  return swe;
}

/** The seam. Same signature and Chart shape as the old engine; synchronous. */
export function computeChart(
  utcMs: number,
  lat: number,
  lon: number,
  houseSystem: HouseSystem = "Placidus",
): Chart {
  const s = engine();
  const jd = toJd(utcMs);

  // positions come with speed included (degrees/day, negative = retrograde).
  // norm() re-establishes the [0, 360) invariant at the seam — assembly's
  // sign math (floor(lon/30)) breaks on a longitude of exactly 360
  const bodies: RawBody[] = BODY_IDS.map(([name, id]) => {
    const pos = s.calculatePosition(jd, id);
    return { name, lon: norm(pos.longitude), speed: pos.longitudeSpeed };
  });

  // Swiss returns cusps 1-indexed (cusps[1] = 1st house = asc);
  // the app's Chart wants a 12-slot array with cusps[0] = asc
  const h = s.calculateHouses(jd, lat, lon, HOUSE_IDS[houseSystem]);
  return assembleChart(
    jd,
    bodies,
    norm(h.ascendant),
    norm(h.mc),
    h.cusps.slice(1, 13).map(norm),
  );
}

/** Fast path for the drag solver: just the ascendant, no planets, no assembly —
 * scrub() calls this up to 6× per frame while inverting asc(t). */
export function ascAt(
  utcMs: number,
  lat: number,
  lon: number,
  houseSystem: HouseSystem = "Placidus",
): number {
  return norm(
    engine().calculateHouses(toJd(utcMs), lat, lon, HOUSE_IDS[houseSystem])
      .ascendant,
  );
}
