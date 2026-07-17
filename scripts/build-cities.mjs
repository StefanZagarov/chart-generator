// Regenerates public/cities.json from the GeoNames dump (CC BY 4.0).
// Usage:
//   curl -sLO https://download.geonames.org/export/dump/cities1000.zip && unzip cities1000.zip
//   curl -sLO https://download.geonames.org/export/dump/countryInfo.txt
//   node scripts/build-cities.mjs path/to/cities1000.txt path/to/countryInfo.txt
//
// Output shape (compact on purpose — 170k rows):
//   { zones: ["Europe/Sofia", ...],            // tz strings, dictionary-coded
//     countries: { BG: "Bulgaria", ... },
//     rows: [[name, countryCode, lat, lon, zoneIndex], ...] }  // population-sorted
// Population sorting is the ranking: the app's autocomplete and same-name
// lookups take the first match, which this makes "the biggest one".
import { readFileSync, writeFileSync } from "node:fs";

const [citiesPath, countriesPath] = process.argv.slice(2);
if (!citiesPath || !countriesPath) {
  console.error("usage: node scripts/build-cities.mjs cities1000.txt countryInfo.txt");
  process.exit(1);
}

const countries = {};
for (const line of readFileSync(countriesPath, "utf8").split("\n")) {
  if (!line || line.startsWith("#")) continue;
  const f = line.split("\t");
  if (f[0] && f[4]) countries[f[0]] = f[4];
}

const zones = [];
const zoneIndex = new Map();
const rows = [];
for (const line of readFileSync(citiesPath, "utf8").split("\n")) {
  if (!line) continue;
  const f = line.split("\t");
  // fields: 1 name, 4 lat, 5 lon, 8 country code, 14 population, 17 timezone
  const [name, cc, tz] = [f[1], f[8], f[17]];
  if (!name || !cc || !tz || !countries[cc]) continue;
  let zi = zoneIndex.get(tz);
  if (zi === undefined) {
    zi = zones.length;
    zones.push(tz);
    zoneIndex.set(tz, zi);
  }
  rows.push({
    pop: Number(f[14]) || 0,
    // 4 decimals ≈ 11 m — far beyond what a natal chart can resolve
    row: [name, cc, Number(Number(f[4]).toFixed(4)), Number(Number(f[5]).toFixed(4)), zi],
  });
}

rows.sort((a, b) => b.pop - a.pop);
writeFileSync(
  new URL("../public/cities.json", import.meta.url),
  JSON.stringify({ zones, countries, rows: rows.map((r) => r.row) }),
);
console.log(`${rows.length} places, ${zones.length} zones, ${Object.keys(countries).length} countries`);
