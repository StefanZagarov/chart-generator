import type { City, WallClock } from "../types/";

/** The engine-independent half of the old ephemeris.js, extracted verbatim:
 * zodiac tables, angle/format helpers, timezone math (browser tzdb via Intl),
 * and the city catalog. No astronomy in here — this file survives any engine swap. */

// ---- Time range ----

// The built-in Moshier ephemeris has no data outside roughly 3000 BCE–3000 CE;
// past the edge it returns garbage/NaN positions and the chart render dies.
// Every time change routes through clampTime, so no instant outside this window
// ever reaches computeChart. Bounds sit a full year inside the documented edge
// (…–3000 CE) so the boundary itself is never in question. The BCE end is
// nowhere near real use, so year 1 CE is a safe, simple floor.
// (Date.UTC maps years 0–99 to 1900s, so year 1 is built via setUTCFullYear.)
export const MIN_UTC_MS = (() => {
  const d = new Date(0);
  d.setUTCFullYear(1, 0, 1);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
})();
export const MAX_UTC_MS = Date.UTC(2999, 11, 31, 23, 59, 59, 999);

/** keep an instant inside the ephemeris's supported range */
export const clampTime = (ms: number): number =>
  ms < MIN_UTC_MS ? MIN_UTC_MS : ms > MAX_UTC_MS ? MAX_UTC_MS : ms;

// ---- Angles & formatting ----

/** normalize any angle into [0, 360) */
export const norm = (a: number): number => ((a % 360) + 360) % 360;

/** signed shortest angular distance a→b, in (-180, 180] */
export const dAng = (a: number, b: number): number =>
  ((b - a + 540) % 360) - 180;

const pad2 = (n: number): string => (n < 10 ? "0" : "") + n;

/** degrees+minutes label: 24.2 → "24°12′" (rounding 60′ carries into the degree) */
export function fmtDM(x: number): string {
  let d = Math.floor(x),
    m = Math.round((x - d) * 60);
  if (m === 60) {
    d += 1;
    m = 0;
  }
  return d + "°" + pad2(m) + "′";
}

export const SIGN_NAMES = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
];

export const SIGN_GLYPHS = [
  "♈︎",
  "♉︎",
  "♊︎",
  "♋︎",
  "♌︎",
  "♍︎",
  "♎︎",
  "♏︎",
  "♐︎",
  "♑︎",
  "♒︎",
  "♓︎",
];

// ---- Time zones (browser tzdb via Intl) ----
// Logic: JS has no timezone database of its own, but Intl.DateTimeFormat does —
// so "what do the clocks in tz show at instant utcMs?" is answered by formatting
// the instant in that zone and reading the pieces back as numbers.

function wallParts(tz: string, utcMs: number) {
  const p = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date(utcMs));
  const g = (t: string) => +p.find((x) => x.type === t)!.value;
  let h = g("hour");
  if (h === 24) h = 0; // some engines report midnight as 24
  return {
    y: g("year"),
    mo: g("month"),
    d: g("day"),
    h,
    mi: g("minute"),
    s: g("second"),
  };
}

function tzOffsetMin(tz: string, utcMs: number): number {
  const w = wallParts(tz, utcMs);
  return (Date.UTC(w.y, w.mo - 1, w.d, w.h, w.mi, w.s) - utcMs) / 60000;
}

/** "when the wall clocks in tz showed this date+time, what instant was it globally?"
 * Logic: the offset itself depends on the answer (DST!), so guess with the offset
 * at the target reading, then correct once with the offset at the guessed instant. */
export function localToUTC(
  dateStr: string,
  timeStr: string,
  tz: string,
): { utcMs: number; offsetMin: number } {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const [h, mi] = timeStr.split(":").map(Number);
  const target = Date.UTC(y, mo - 1, d, h, mi || 0);
  let utc = target - tzOffsetMin(tz, target) * 60000;
  utc = target - tzOffsetMin(tz, utc) * 60000;
  return { utcMs: utc, offsetMin: tzOffsetMin(tz, utc) };
}

/** "UTC+02:00" — the zone's offset at that instant (so DST is reflected).
 * Round BEFORE splitting into h:mm — tzOffsetMin is fractional whenever utcMs
 * isn't a whole second (drags, Date.now()), and flooring 179.99 min gave the
 * infamous "UTC+02:60". One rounded integer can't disagree with itself. */
export function offsetLabel(tz: string, utcMs: number): string {
  const m = Math.round(tzOffsetMin(tz, utcMs)),
    s = m < 0 ? "−" : "+",
    am = Math.abs(m);
  return "UTC" + s + pad2(Math.floor(am / 60)) + ":" + pad2(am % 60);
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** local date/time in tz at instant utcMs, in the three formats the app uses */
export function wallClock(tz: string, utcMs: number): WallClock {
  const w = wallParts(tz, utcMs);
  return {
    date: w.y + "-" + pad2(w.mo) + "-" + pad2(w.d),
    time: pad2(w.h) + ":" + pad2(w.mi),
    pretty:
      w.d +
      " " +
      MONTHS[w.mo - 1] +
      " " +
      w.y +
      ", " +
      pad2(w.h) +
      ":" +
      pad2(w.mi) +
      ":" +
      pad2(w.s),
  };
}

/** "1992-03-14" → "14 March 1992" */
export function prettyDate(dateStr: string): string {
  const [y, mo, d] = dateStr.split("-").map(Number);
  return d + " " + MONTHS[mo - 1] + " " + y;
}

// ---- Cities ----
// The atlas: every place on Earth with 1,000+ people (GeoNames cities1000,
// CC BY 4.0 — see scripts/build-cities.mjs to regenerate public/cities.json).
// Rows arrive population-sorted, so "first match" always means "biggest" —
// the autocomplete, findCity, and the boot-time timezone match all lean on it.
// Loaded ONCE before React mounts (main.tsx gates on loadCities alongside the
// WASM engine), so everything below stays synchronous.
export const CITIES: City[] = [];

export async function loadCities(): Promise<void> {
  if (CITIES.length > 0) return;
  const res = await fetch(`${import.meta.env.BASE_URL}cities.json`);
  if (!res.ok) throw new Error(`cities.json failed: HTTP ${res.status}`);
  const data = (await res.json()) as {
    zones: string[];
    countries: Record<string, string>;
    rows: [string, string, number, number, number][];
  };
  for (const [name, cc, lat, lon, zi] of data.rows)
    CITIES.push({
      label: `${name}, ${data.countries[cc]}`,
      name,
      lat,
      lon,
      tz: data.zones[zi],
    });
}

/** "42°42′N, 23°19′E" — degree-and-minute coordinates with hemisphere letters.
 * Minutes are rounded, and 60′ carries into the degree (the offsetLabel lesson:
 * never split a fractional value and round the halves separately). */
export function coordLabel(lat: number, lon: number): string {
  const part = (v: number, pos: string, neg: string) => {
    const a = Math.abs(v);
    let d = Math.floor(a);
    let m = Math.round((a - d) * 60);
    if (m === 60) {
      d += 1;
      m = 0;
    }
    return `${d}°${pad2(m)}′${v < 0 ? neg : pos}`;
  };
  return `${part(lat, "N", "S")}, ${part(lon, "E", "W")}`;
}

/** Nearest listed city to a coordinate — for display labels and tz guesses.
 * Squared equirectangular distance is plenty to pick a winner: latitude
 * degrees are constant-size, longitude degrees shrink by cos(lat), and the
 * wrap at ±180° is folded to the short way around. */
export function nearestCity(lat: number, lon: number): City {
  const cosLat = Math.cos((lat * Math.PI) / 180);
  let best = CITIES[0];
  let bestDist = Infinity;
  for (const c of CITIES) {
    const dLat = c.lat - lat;
    let dLon = Math.abs(c.lon - lon);
    if (dLon > 180) dLon = 360 - dLon;
    const dist = dLat * dLat + dLon * cosLat * (dLon * cosLat);
    if (dist < bestDist) {
      bestDist = dist;
      best = c;
    }
  }
  return best;
}

/** exact label match first, then prefix, then substring — first hit wins */
export function findCity(q: string): City | null {
  if (!q) return null;
  const s = q.trim().toLowerCase();
  return (
    CITIES.find((c) => c.label.toLowerCase() === s) ||
    CITIES.find((c) => c.label.toLowerCase().startsWith(s)) ||
    CITIES.find((c) => c.label.toLowerCase().includes(s)) ||
    null
  );
}
