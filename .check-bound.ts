import { readFile } from "node:fs/promises";
import { initEngine, computeChart } from "./src/engine/swiss";
import { MIN_UTC_MS, MAX_UTC_MS } from "./src/engine/almanac";
const orig = globalThis.fetch;
globalThis.fetch = (async (u: any, o?: any) => {
  const s = String(u);
  if (s.startsWith("file://")) return new Response(await readFile(new URL(s)), { headers: { "content-type": "application/wasm" } });
  return orig(u, o);
}) as any;
await initEngine();
const test = (label: string, ms: number) => {
  try {
    const c = computeChart(ms, 42.7, 23.3, "Placidus");
    const bad = Number.isNaN(c.asc) || c.planets.some((p: any) => Number.isNaN(p.lon));
    console.log(label, bad ? "NaN!!" : "OK", "sun=", c.planets[0].lon.toFixed(2), c.planets[0].signName, "asc=", c.asc.toFixed(2));
  } catch (e: any) { console.log(label, "THREW:", e.message); }
};
test("MIN(yr1)  ", MIN_UTC_MS);
test("MAX(3000) ", MAX_UTC_MS);
test("under MIN ", MIN_UTC_MS - 86400000 * 400);
test("over MAX  ", MAX_UTC_MS + 86400000 * 400);
