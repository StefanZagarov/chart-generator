# Swiss Ephemeris Swap — Implementation Plan (Step 7)

**Goal:** Replace the bundled `ephemeris.js` astronomy math with Swiss Ephemeris (WASM) behind the existing `computeChart(utcMs, lat, lon, houseSystem): Chart` seam, so the entire visual layer keeps working untouched.

**Architecture:** Three new modules replace the one old file. `almanac.ts` keeps the engine-independent helpers (cities, timezones, formatting) — mechanical copy. `assembly.ts` is the chart-building logic (aspects, houses-of-planets, labels) — ported by hand, this is the learning piece. `swiss.ts` is the adapter: it owns the WASM instance and produces the same `Chart` shape the app already consumes. WASM init is async, so `main.tsx` waits for it once before mounting React; after init every call is synchronous, so nothing else changes.

**Tech stack:** `@swisseph/browser` (AGPL-3.0, TypeScript API, built-in Moshier ephemeris ≈250 KB gzipped — no data files needed, works offline; optional real Swiss data files later for maximum precision).

**Why this package:** AGPL matches the license we already planned for the repo; it's browser-first with typed enums and object returns; Moshier fallback means no ephemeris-file hosting. Fallback candidate if the smoke test fails: `swisseph-wasm` (prolaxu, v0.0.4, GPL wording, rawer API).

---

## The seam, precisely

The app imports from `engine/ephemeris` in exactly four places:

| Importer | Imports | After the swap |
|---|---|---|
| `App.tsx` | `computeChart`, `findCity`, `prettyDate`, `wallClock` | `swiss.ts` / `almanac.ts` |
| `CastForm.tsx` | `CITIES`, `findCity`, `localToUTC`, `wallClock` | `almanac.ts` |
| `SidePanel.tsx` | `offsetLabel` | `almanac.ts` |
| `scrubTime.ts` | `computeChart` (asc only, up to 6×/frame) | new `ascAt()` fast path |

`Chart` shape stays identical, with one deletion: `eps` is used nowhere outside the old engine — drop it from the type.

Behavioral parity notes (things Swiss does *differently* that we must pin down):

- **Node:** old engine uses the **mean** lunar node and forces `retro: false`. Use Swiss `MEAN_NODE` and keep forcing `retro: false` (the mean node's speed is always negative — without the override every chart shows ℞ on it).
- **Speed:** Swiss returns `longitudeSpeed` directly — the old finite-difference dance (three `bodyLonsRaw` calls) disappears.
- **Aspect scan excludes Node:** the old loops run `i < 10` over 11 bodies — Node makes no aspects. Preserve that.
- **jdUT:** `utcMs / 86400000 + 2440587.5`. Swiss's `*_ut` calls take UT and handle ΔT internally — delete our `deltaT()` approximation, don't re-apply it.
- **Positions will differ** from the old engine by up to ~1° (Pluto) — that's the accuracy we're buying. Aspects near an orb boundary may appear/disappear. Different numbers ≠ bug; see Task 8.

---

## File structure

- Create: `src/engine/almanac.ts` — SIGN_NAMES, SIGN_GLYPHS, CITIES, findCity, localToUTC, offsetLabel, wallClock, prettyDate, plus the small math/format helpers assembly needs (`norm`, `dAng`, `fmtDM`). Mechanical copy from `ephemeris.js`.
- Create: `src/engine/assembly.ts` — BODIES/ASPECTS tables, `houseOf`, aspect scan, planet/label building. Pure functions, no WASM, no I/O.
- Create: `src/engine/swiss.ts` — `initEngine()`, `computeChart()`, `ascAt()`. The only file that touches the WASM instance.
- Modify: `src/types/index.ts` — own the `Chart`/`Planet`/`Aspect`/`City`… types directly instead of re-exporting from `ephemeris.d.ts`.
- Modify: `src/main.tsx` — gate `root.render` on `initEngine()`.
- Modify: `src/App.tsx`, `src/lib/scrubTime.ts`, `CastForm.tsx`, `SidePanel.tsx` — import switches only.
- Delete (last): `src/engine/ephemeris.js`, `src/engine/ephemeris.d.ts`.

---

### Task 1: Smoke-test spike (decision gate — no commit)

Prove the package works in *our* toolchain before building on it. In a scratch file (e.g. `src/spike.ts` imported temporarily from `main.tsx`):

- [ ] `npm install @swisseph/browser`
- [ ] Init and compute one known position:

```ts
import { SwissEphemeris, Planet, HouseSystem } from "@swisseph/browser";

const swe = new SwissEphemeris();
await swe.init();
// 1992-03-14 12:45 UTC → jdUT
const jd = Date.UTC(1992, 2, 14, 12, 45) / 86400000 + 2440587.5;
console.log(swe.calculatePosition(jd, Planet.Sun));       // expect lon ≈ 353.9° (24° Pisces)
console.log(swe.calculateHouses(jd, 40.7128, -74.006, HouseSystem.Placidus));
```

(Exact method/enum names may differ slightly from this sketch — the package README is authority. That's part of what the spike verifies.)

- [ ] Check the result object exposes **longitude AND speed** (needed for `retro`), and houses expose **12 cusps + asc + mc**.
- [ ] Verify Sun lon against the old engine in the console: `computeChart(Date.UTC(1992,2,14,12,45), 40.7128, -74.006).planets[0].lon` — agreement within ~0.01° expected.
- [ ] **Critical:** repeat in `npm run build && npx vite preview`, not just dev — WASM asset loading is the classic dev/build divergence.
- [ ] Time 7 chart computations in a loop (the worst per-frame case during drag: 1 render + 6 scrub iterations). Budget: well under 16 ms total.
- [ ] Delete the spike file. **Gate:** if the package fails any of the above, evaluate `swisseph-wasm` (prolaxu) before proceeding.

### Task 2: License housekeeping

AGPL obligations start when the dependency ships, so do this first.

- [ ] Add `LICENSE` — full AGPL-3.0 text (gnu.org/licenses/agpl-3.0.txt).
- [ ] `package.json`: `"license": "AGPL-3.0-only"`.
- [ ] README: short license section — code AGPL-3.0; Swiss Ephemeris © Astrodienst AG, used under AGPL; commercial licensing exists at astro.com.
- [ ] Commit: `chore: AGPL-3.0 license ahead of Swiss Ephemeris dependency`

### Task 3: Types move home

- [ ] Copy the type declarations from `ephemeris.d.ts` (HouseSystem, PlanetName, AspectType, Planet, Aspect, Chart, City, WallClock) into `src/types/index.ts` as real exports; **drop `eps` from `Chart`**.
- [ ] Remove the `export type { … } from "../engine/ephemeris"` re-export; keep the `Polar` type.
- [ ] `ephemeris.d.ts` shrinks to just the function/const declarations, now importing types from `../types/`.
- [ ] `npx tsc -b --force` clean; app runs unchanged.
- [ ] Commit.

### Task 4: Extract `almanac.ts` (mechanical copy)

- [ ] Move from `ephemeris.js` into `src/engine/almanac.ts`, typed: `SIGN_NAMES`, `SIGN_GLYPHS`, `CITIES`, `findCity`, `localToUTC`, `offsetLabel`, `wallClock` (+ its private `wallParts`), `prettyDate`, and the helpers `norm`, `dAng`, `fmtDM`.
- [ ] Switch `CastForm.tsx` and `SidePanel.tsx` imports to `almanac`; `App.tsx` takes `prettyDate`/`wallClock`/`findCity` from `almanac` too (only `computeChart` still comes from `ephemeris` for now).
- [ ] App runs identically — this commit changes zero behavior.
- [ ] Commit.

### Task 5: Write `assembly.ts` (the hand-written piece)

Pure function from raw sky numbers to the app's `Chart`. Everything here is ported from `ephemeris.js` — the tables **verbatim** (they define the app's astrological opinions), the logic re-written by you with the original as reference.

```ts
export interface RawBody { name: PlanetName; lon: number; speed: number; }

export function assembleChart(
  jdUT: number,
  bodies: RawBody[],          // all 11, in BODIES order
  asc: number, mc: number,
  cusps: number[],            // 12, cusps[0] = asc
): Chart
```

Port checklist (source line refs into current `ephemeris.js`):

- [ ] `BODIES` glyph table (l.373–385) and `ASPECTS` table `[type, glyph, angle, orb]` (l.386–397) + `MINOR` set (l.398) — verbatim.
- [ ] `houseOf(lon, cusps)` — wrap-aware "which cusp interval contains this longitude".
- [ ] Planet building (l.488–506): sign = `floor(lon/30)`, `degLabel = fmtDM(lon % 30)`, `posLabel`, `retro = name === "Node" ? false : speed < 0`, house.
- [ ] Aspect scan (l.508–541): pairs over the **first 10** bodies only; luminary bonus `+1.5°` orb when Sun or Moon is involved, **except** for MINOR aspects; best (tightest) match wins per pair; sort by orb ascending.
- [ ] `ascLabel` / `mcLabel` (l.551–552).
- [ ] Sanity: feed it fake inputs in a scratch call and eyeball one aspect + one house assignment.
- [ ] Commit.

### Task 6: Write `swiss.ts` (the adapter)

```ts
let swe: SwissEphemeris | null = null;

export async function initEngine(): Promise<void>   // create + await init(), idempotent
export function computeChart(
  utcMs: number, lat: number, lon: number, houseSystem?: HouseSystem,
): Chart                                            // throws if initEngine hasn't resolved
export function ascAt(utcMs: number, lat: number, lon: number,
  houseSystem?: HouseSystem): number                // houses call only — scrub's fast path
```

- [ ] `jdUT = utcMs / 86400000 + 2440587.5`.
- [ ] Map our `HouseSystem` strings → the package's enum (Placidus, Whole Sign, Equal, Porphyry, Koch).
- [ ] 11 bodies: Sun…Pluto + **MEAN_NODE**; take `longitude` + `longitudeSpeed` from each result; build `RawBody[]` in BODIES order.
- [ ] Houses call → asc, mc, cusps → `assembleChart(...)`.
- [ ] Commit.

### Task 7: Async boot + import switch

- [ ] `main.tsx`:

```tsx
initEngine().then(() => {
  createRoot(document.getElementById("root")!).render(/* as before */);
});
```

(Optionally set a "Consulting the ephemeris…" line in `index.html`'s `#root` as the pre-init placeholder — it gets replaced on mount.)

- [ ] `App.tsx`: `computeChart` from `./engine/swiss`; delete the `// TODO: Replace with Swiss Ephemeris WASM` comment.
- [ ] `scrubTime.ts`: replace `computeChart(t, …).asc` with `ascAt(t, lat, lon, houseSystem)`.
- [ ] `npx tsc -b --force` clean; app renders.
- [ ] Commit.

### Task 8: Parity + feel check (old engine still on disk)

- [ ] Temporary console script: for 4 dates (1950-01-01, 1992-03-14 12:45, today, 2100-01-01), log per-planet `Δlon = dAng(old, new)`, `Δasc`, `Δmc`. Expected: ≤ ~0.1° for most bodies, up to ~1° for Pluto/Moon — Swiss is the correct one. Anything ≥ several degrees or a wrong *sign* for a planet = mapping bug (usual suspects: node choice, radians vs degrees, jd conversion).
- [ ] Compare the aspect lists for the natal date: same majors expected; a minor aspect flickering in/out near its orb edge is fine.
- [ ] `npm run build && npx vite preview`: drag the wheel — smoothness must match the current build (Task 1 timed this, this confirms it end-to-end).
- [ ] Verify house numbers in the side panel against the old build for the natal chart.

### Task 9: Delete the old engine

- [ ] Delete `src/engine/ephemeris.js` + `ephemeris.d.ts`; `tsc` proves nothing still imports them.
- [ ] Commit: `feat: Swiss Ephemeris engine behind computeChart seam; remove bundled engine`

### Task 10 (later, optional): precision upgrade

Moshier is already ≈0.1″ for planets. If/when wanted: `loadStandardEphemeris()` pulls real Swiss data files (~2 MB) from CDN + switch the calc flag. For the Tauri desktop build the files must be **self-hosted/bundled** (no CDN offline). Not part of this swap.

---

## Self-review notes

- Every current `engine/ephemeris` import site is covered (App, CastForm, SidePanel, scrubTime — Task 4/7).
- `eps` removal is the only intentional type change; everything else keeps the shape the wheel and panel already consume.
- Order is deliberately risk-first: the spike (Task 1) can kill the package choice before any real work; the old engine survives until parity passes (Task 8 → 9).
