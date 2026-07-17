import { nearestCity, utcFromParts } from "../engine/almanac";
import type { HouseSystem, SavedChart } from "../types/";

/** Parser for the AAF chart-exchange format (astro.com "Database AAF export").
 * One person = a pair of lines:
 *   #A93:*,Albena Slavova,f,23.2.1968,20:16,Samokov, Bulgaria
 *   #B93:*,42n20,23e33,2he00,0
 * A-line: name, sex (ignored), D.M.YYYY, HH:MM, place (may itself contain commas).
 * B-line: latitude 42n20 = 42°20′N, longitude 23e33 = 23°33′E, timezone 2he00 =
 * 2h00m east of Greenwich (east = UTC+, west = UTC−), then a DST flag adding 1h.
 * Logic: the B-line's offset is EXPLICIT and historical (Bulgaria 1944 exports as
 * 1he00 — it really was UTC+1 then), so the UTC instant is computed from it
 * directly rather than through IANA data: utc = wall time − offset. The IANA
 * zone we can't get from the file is filled from the nearest listed city — it
 * only drives display formatting after import, never the imported instant. */

const parseCoord = (s: string, axis: "ns" | "ew"): number | null => {
  const m = s.trim().toLowerCase().match(/^(\d+)([nsew])(\d+)$/);
  if (!m || !axis.includes(m[2])) return null;
  const deg = Number(m[1]) + Number(m[3]) / 60;
  // south and west are the negative halves of their axes
  return m[2] === "s" || m[2] === "w" ? -deg : deg;
};

/** "2he00" (+DST flag) → total offset in minutes east of Greenwich */
const parseOffset = (zone: string, dstFlag: string): number | null => {
  const m = zone.trim().toLowerCase().match(/^(\d+)h([ew])(\d+)$/);
  if (!m) return null;
  const min = Number(m[1]) * 60 + Number(m[3]);
  const signed = m[2] === "w" ? -min : min;
  return signed + (dstFlag.trim() === "1" ? 60 : 0);
};

export function parseAAF(
  text: string,
  houseSystem: HouseSystem,
): { charts: Omit<SavedChart, "id" | "savedAt">[]; errors: string[] } {
  const charts: Omit<SavedChart, "id" | "savedAt">[] = [];
  const errors: string[] = [];

  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("#"));

  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].startsWith("#A")) continue; // B-lines are consumed by their A
    const aLine = lines[i];
    const bLine = lines[i + 1]?.startsWith("#B") ? lines[i + 1] : null;

    // strip the "#A93:" prefix, then split — the place keeps its inner commas
    // (filtering empties: ",, US, IL" means "no city, state IL", not ", US, IL")
    const a = aLine.slice(aLine.indexOf(":") + 1).split(",");
    const [, name, , date, time, ...placeParts] = a.map((f) => f.trim());
    const place = placeParts.filter(Boolean).join(", ");

    const [d, mo, y] = (date ?? "").split(".").map(Number);
    // "*" is astro.com's "birth time unknown" — the convention is a noon
    // chart: houses are meaningless either way, noon halves the planet error
    const [hh, mi] =
      time === "*" || time === "" ? [12, 0] : (time ?? "").split(":").map(Number);

    if (!bLine) {
      errors.push(`${name || aLine}: missing #B line`);
      continue;
    }
    const b = bLine.slice(bLine.indexOf(":") + 1).split(",");
    const lat = parseCoord(b[1] ?? "", "ns");
    const lon = parseCoord(b[2] ?? "", "ew");
    const offsetMin = parseOffset(b[3] ?? "", b[4] ?? "0");

    if (!name || !y || !mo || !d || Number.isNaN(hh) || Number.isNaN(mi)) {
      errors.push(`${name || aLine}: unreadable date/time`);
      continue;
    }
    if (lat === null || lon === null || offsetMin === null) {
      errors.push(`${name}: unreadable coordinates/timezone`);
      continue;
    }

    charts.push({
      name,
      // wall time minus the explicit east-positive offset = the UTC instant
      castMs: utcFromParts(y, mo - 1, d, hh, mi) - offsetMin * 60_000,
      city: {
        label: place || `${b[1]}, ${b[2]}`,
        name: place.split(",")[0] || b[1],
        lat,
        lon,
        tz: nearestCity(lat, lon).tz,
      },
      houseSystem,
    });
  }

  if (charts.length === 0 && errors.length === 0)
    errors.push("No #A/#B line pairs found in the pasted text");
  return { charts, errors };
}
