import type { City, WallClock } from "../types/";

/** The engine-independent half of the old ephemeris.js, extracted verbatim:
 * zodiac tables, angle/format helpers, timezone math (browser tzdb via Intl),
 * and the city catalog. No astronomy in here — this file survives any engine swap. */

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
// TODO: Make it its own config variable
const RAW: [string, number, number, string][] = [
  ["New York, USA", 40.7128, -74.006, "America/New_York"],
  ["Los Angeles, USA", 34.0522, -118.2437, "America/Los_Angeles"],
  ["Chicago, USA", 41.8781, -87.6298, "America/Chicago"],
  ["Houston, USA", 29.7604, -95.3698, "America/Chicago"],
  ["Denver, USA", 39.7392, -104.9903, "America/Denver"],
  ["Phoenix, USA", 33.4484, -112.074, "America/Phoenix"],
  ["Seattle, USA", 47.6062, -122.3321, "America/Los_Angeles"],
  ["San Francisco, USA", 37.7749, -122.4194, "America/Los_Angeles"],
  ["Miami, USA", 25.7617, -80.1918, "America/New_York"],
  ["Boston, USA", 42.3601, -71.0589, "America/New_York"],
  ["Atlanta, USA", 33.749, -84.388, "America/New_York"],
  ["New Orleans, USA", 29.9511, -90.0715, "America/Chicago"],
  ["Honolulu, USA", 21.3069, -157.8583, "Pacific/Honolulu"],
  ["Anchorage, USA", 61.2181, -149.9003, "America/Anchorage"],
  ["Toronto, Canada", 43.6532, -79.3832, "America/Toronto"],
  ["Montreal, Canada", 45.5017, -73.5673, "America/Toronto"],
  ["Vancouver, Canada", 49.2827, -123.1207, "America/Vancouver"],
  ["Mexico City, Mexico", 19.4326, -99.1332, "America/Mexico_City"],
  ["Havana, Cuba", 23.1136, -82.3666, "America/Havana"],
  ["Bogota, Colombia", 4.711, -74.0721, "America/Bogota"],
  ["Lima, Peru", -12.0464, -77.0428, "America/Lima"],
  ["Santiago, Chile", -33.4489, -70.6693, "America/Santiago"],
  [
    "Buenos Aires, Argentina",
    -34.6037,
    -58.3816,
    "America/Argentina/Buenos_Aires",
  ],
  ["Sao Paulo, Brazil", -23.5505, -46.6333, "America/Sao_Paulo"],
  ["Rio de Janeiro, Brazil", -22.9068, -43.1729, "America/Sao_Paulo"],
  ["Reykjavik, Iceland", 64.1466, -21.9426, "Atlantic/Reykjavik"],
  ["Dublin, Ireland", 53.3498, -6.2603, "Europe/Dublin"],
  ["London, UK", 51.5074, -0.1278, "Europe/London"],
  ["Lisbon, Portugal", 38.7223, -9.1393, "Europe/Lisbon"],
  ["Madrid, Spain", 40.4168, -3.7038, "Europe/Madrid"],
  ["Paris, France", 48.8566, 2.3522, "Europe/Paris"],
  ["Amsterdam, Netherlands", 52.3676, 4.9041, "Europe/Amsterdam"],
  ["Brussels, Belgium", 50.8503, 4.3517, "Europe/Brussels"],
  ["Zurich, Switzerland", 47.3769, 8.5417, "Europe/Zurich"],
  ["Rome, Italy", 41.9028, 12.4964, "Europe/Rome"],
  ["Berlin, Germany", 52.52, 13.405, "Europe/Berlin"],
  ["Vienna, Austria", 48.2082, 16.3738, "Europe/Vienna"],
  ["Prague, Czechia", 50.0755, 14.4378, "Europe/Prague"],
  ["Warsaw, Poland", 52.2297, 21.0122, "Europe/Warsaw"],
  ["Budapest, Hungary", 47.4979, 19.0402, "Europe/Budapest"],
  ["Stockholm, Sweden", 59.3293, 18.0686, "Europe/Stockholm"],
  ["Oslo, Norway", 59.9139, 10.7522, "Europe/Oslo"],
  ["Copenhagen, Denmark", 55.6761, 12.5683, "Europe/Copenhagen"],
  ["Helsinki, Finland", 60.1699, 24.9384, "Europe/Helsinki"],
  ["Athens, Greece", 37.9838, 23.7275, "Europe/Athens"],
  ["Sofia, Bulgaria", 42.6977, 23.3219, "Europe/Sofia"],
  ["Plovdiv, Bulgaria", 42.1354, 24.7453, "Europe/Sofia"],
  ["Varna, Bulgaria", 43.2141, 27.9147, "Europe/Sofia"],
  ["Burgas, Bulgaria", 42.5048, 27.4626, "Europe/Sofia"],
  ["Ruse, Bulgaria", 43.8356, 25.9657, "Europe/Sofia"],
  ["Stara Zagora, Bulgaria", 42.4258, 25.6345, "Europe/Sofia"],
  ["Istanbul, Turkiye", 41.0082, 28.9784, "Europe/Istanbul"],
  ["Moscow, Russia", 55.7558, 37.6173, "Europe/Moscow"],
  ["Kyiv, Ukraine", 50.4501, 30.5234, "Europe/Kyiv"],
  ["Cairo, Egypt", 30.0444, 31.2357, "Africa/Cairo"],
  ["Casablanca, Morocco", 33.5731, -7.5898, "Africa/Casablanca"],
  ["Lagos, Nigeria", 6.5244, 3.3792, "Africa/Lagos"],
  ["Nairobi, Kenya", -1.2921, 36.8219, "Africa/Nairobi"],
  ["Johannesburg, South Africa", -26.2041, 28.0473, "Africa/Johannesburg"],
  ["Cape Town, South Africa", -33.9249, 18.4241, "Africa/Johannesburg"],
  ["Tel Aviv, Israel", 32.0853, 34.7818, "Asia/Jerusalem"],
  ["Dubai, UAE", 25.2048, 55.2708, "Asia/Dubai"],
  ["Tehran, Iran", 35.6892, 51.389, "Asia/Tehran"],
  ["Karachi, Pakistan", 24.8607, 67.0011, "Asia/Karachi"],
  ["Mumbai, India", 19.076, 72.8777, "Asia/Kolkata"],
  ["Delhi, India", 28.7041, 77.1025, "Asia/Kolkata"],
  ["Bangalore, India", 12.9716, 77.5946, "Asia/Kolkata"],
  ["Kathmandu, Nepal", 27.7172, 85.324, "Asia/Kathmandu"],
  ["Colombo, Sri Lanka", 6.9271, 79.8612, "Asia/Colombo"],
  ["Dhaka, Bangladesh", 23.8103, 90.4125, "Asia/Dhaka"],
  ["Bangkok, Thailand", 13.7563, 100.5018, "Asia/Bangkok"],
  ["Kuala Lumpur, Malaysia", 3.139, 101.6869, "Asia/Kuala_Lumpur"],
  ["Singapore, Singapore", 1.3521, 103.8198, "Asia/Singapore"],
  ["Jakarta, Indonesia", -6.2088, 106.8456, "Asia/Jakarta"],
  ["Ho Chi Minh City, Vietnam", 10.8231, 106.6297, "Asia/Ho_Chi_Minh"],
  ["Hong Kong, China", 22.3193, 114.1694, "Asia/Hong_Kong"],
  ["Taipei, Taiwan", 25.033, 121.5654, "Asia/Taipei"],
  ["Shanghai, China", 31.2304, 121.4737, "Asia/Shanghai"],
  ["Beijing, China", 39.9042, 116.4074, "Asia/Shanghai"],
  ["Seoul, South Korea", 37.5665, 126.978, "Asia/Seoul"],
  ["Tokyo, Japan", 35.6762, 139.6503, "Asia/Tokyo"],
  ["Manila, Philippines", 14.5995, 120.9842, "Asia/Manila"],
  ["Perth, Australia", -31.9505, 115.8605, "Australia/Perth"],
  ["Adelaide, Australia", -34.9285, 138.6007, "Australia/Adelaide"],
  ["Brisbane, Australia", -27.4698, 153.0251, "Australia/Brisbane"],
  ["Sydney, Australia", -33.8688, 151.2093, "Australia/Sydney"],
  ["Melbourne, Australia", -37.8136, 144.9631, "Australia/Melbourne"],
  ["Auckland, New Zealand", -36.8485, 174.7633, "Pacific/Auckland"],
  ["Wellington, New Zealand", -41.2866, 174.7756, "Pacific/Auckland"],
];

export const CITIES: City[] = RAW.map(([label, lat, lon, tz]) => ({
  label,
  name: label.split(",")[0],
  lat,
  lon,
  tz,
}));

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
