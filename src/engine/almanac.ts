import type { City, WallClock } from "../types/";

/** The engine-independent half of the old ephemeris.js, extracted verbatim:
 * zodiac tables, angle/format helpers, timezone math (browser tzdb via Intl),
 * and the city catalog. No astronomy in here — this file survives any engine swap. */

// ---- Time range ----

// The built-in Moshier ephemeris throws for any date outside its Julian-day
// range — past the edge computeChart dies mid-render and blanks the app. These
// are the engine's EXACT limits (it reports "Moshier planet range 625000.5 ..
// 2818000.5"), both empirically verified to compute a full chart inclusively:
// 3002-02-03 BCE to 3003-04-29 CE. Every time change routes through clampTime,
// so no instant outside this window ever reaches computeChart.
const JD_EPOCH = 2440587.5; // Unix epoch as a Julian day (matches swiss.ts toJd)
const jdToMs = (jd: number) => (jd - JD_EPOCH) * 86_400_000;
export const MIN_UTC_MS = jdToMs(625000.5);
export const MAX_UTC_MS = jdToMs(2818000.5);

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
    era: "short", // needed to un-collapse BCE years — see below
  }).formatToParts(new Date(utcMs));
  const g = (t: string) => +p.find((x) => x.type === t)!.value;
  let h = g("hour");
  if (h === 24) h = 0; // some engines report midnight as 24
  // Intl reports BCE years as positive HISTORICAL numbers with a "BC" era and
  // no sign (astronomical 0 → "1 BC", -50 → "51 BC"). Convert back to the
  // signed astronomical year the rest of the app uses: N BC → (1 - N), so
  // "1 BC" → 0 and "51 BC" → -50. Without this the tz math and display would
  // read every pre-1-CE date as a wrong positive year.
  const era = p.find((x) => x.type === "era")?.value;
  const histYear = g("year");
  const y = era === "BC" ? 1 - histYear : histYear;
  return { y, mo: g("month"), d: g("day"), h, mi: g("minute"), s: g("second") };
}

function tzOffsetMin(tz: string, utcMs: number): number {
  const w = wallParts(tz, utcMs);
  // utcFromParts, not Date.UTC: the wall year can be 1–99 CE (or negative when
  // winding into BCE), which Date.UTC would remap to the 1900s — a ~1900-year
  // bogus offset that threw localToUTC wildly off for ancient dates.
  return (utcFromParts(w.y, w.mo - 1, w.d, w.h, w.mi, w.s) - utcMs) / 60000;
}

/** Date.UTC-from-parts WITHOUT its legacy 0–99 → 1900s remap, so years 1–99 CE
 * build the instant they actually name (Date.UTC(1,…) would be 1901). month0 is
 * 0-indexed like Date.UTC; overflow still rolls over (Feb 31 → March) so the
 * cast's round-trip validation keeps working. */
export function utcFromParts(
  y: number,
  month0: number,
  d: number,
  h = 0,
  mi = 0,
  s = 0,
): number {
  const dt = new Date(0);
  dt.setUTCFullYear(y, month0, d);
  dt.setUTCHours(h, mi, s, 0);
  return dt.getTime();
}

/** days in a given month, year-correct for years < 100 too (day 0 of the next
 * month is the last day of this one) */
export const daysInMonth = (y: number, month1: number): number =>
  new Date(utcFromParts(y, month1, 0)).getUTCDate();

/** "when the wall clocks in tz showed this date+time, what instant was it globally?"
 * Logic: the offset itself depends on the answer (DST!), so guess with the offset
 * at the target reading, then correct once with the offset at the guessed instant. */
export function localToUTC(
  y: number,
  mo: number,
  d: number,
  h: number,
  mi: number,
  tz: string,
): { utcMs: number; offsetMin: number } {
  const target = utcFromParts(y, mo - 1, d, h, mi || 0);
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

/** A signed astronomical year as text: 1992 → "1992", 0 → "0", -50 → "50 BCE".
 * (Matches the year field's convention: negative = BCE, 0 and up = CE.) */
export const formatYear = (y: number): string => (y < 0 ? -y + " BCE" : "" + y);

/** "14 March 1992" / "15 June 50 BCE" from numeric parts */
export const formatDate = (y: number, mo: number, d: number): string =>
  d + " " + MONTHS[mo - 1] + " " + formatYear(y);

/** local date/time in tz at instant utcMs, in the formats the app uses */
export function wallClock(tz: string, utcMs: number): WallClock {
  const w = wallParts(tz, utcMs);
  return {
    y: w.y,
    mo: w.mo,
    d: w.d,
    h: w.h,
    mi: w.mi,
    time: pad2(w.h) + ":" + pad2(w.mi),
    pretty:
      formatDate(w.y, w.mo, w.d) +
      ", " +
      pad2(w.h) +
      ":" +
      pad2(w.mi) +
      ":" +
      pad2(w.s),
  };
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
