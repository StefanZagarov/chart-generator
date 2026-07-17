# Features guide: display toggles, startup at now, save/load

**Mode:** you code, this document guides. Snippets show the key moves, not whole
files — assembly and styling are yours. Verify each task before starting the next.

**Decisions locked in:** a saved chart = date + time + city + house system
(a complete cast). Storage: **disk is the source of truth** (Tauri store plugin,
a real JSON file in the app's data dir), localStorage is a mirror/fallback so the
future browser cascade inherits the feature. Load flow and drift rule in Task 4.

**Practical note:** tasks 1–3 verify fine in the plain browser (`npm run dev`).
Task 4's disk path needs the desktop shell: install `webkit2gtk-4.1`, then
`npm run tauri dev`.

---

## Task 1 — Start the app at the computer's date & time

Two problems hide in this "small" task:

**a) The chart itself.** `App.tsx:11` pins `CAST_MS` to the 1992 anchor. The
computer's current instant is just `Date.now()`. For the *place*, "the
computer's date and time" really means the computer's timezone — the machine
already knows it:

```ts
const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
const HOME_CITY =
  CITIES.find((c) => c.tz === localTz) ?? (findCity("New York, USA") as City);
const CAST_MS = Date.now();
```

Reading it: the browser/webview exposes the OS timezone as an IANA name
(`Europe/Sofia`-style) — exactly what `City.tz` holds, so a simple `.find`
matches your machine to a listed city. No geolocation prompt at boot; if no
listed city lives in your timezone, the old New York fallback keeps the app
deterministic.

**b) The form must show what the chart shows.** `CastForm` hardcodes
`useState("14")` etc. — with (a) alone, the wheel would show 2026 while the form
still says 1992. Give `CastForm` the cast it should display:

```tsx
// CastForm props: add
initialMs: number;
// field initialisation: derive the strings once, from the same source of truth
const wc = wallClock(city.tz, initialMs); // "YYYY-MM-DD", "HH:MM"
const [day, setDay] = useState(wc.date.split("-")[2]);
// …month, year, hour, minute follow the same split; place: useState(city.label)
```

Reading it: `useState(x)` reads `x` on the **first render only** — these are
initializers, not bindings. That's fine (Task 5 exploits it), and it means the
form no longer stores its own idea of the default; it renders whatever cast App
booted with.

**Verify:** `npm run dev` → the app opens on today's date, your local time, your
city (or New York if your tz isn't listed), and the form fields agree with the
footer.

---

## Task 2 — Zodiac signs toggle

State lives in App (the wheel reads it, the panel writes it — same reasoning as
`aspectsOff` in `App.tsx:25`):

```ts
const [showSigns, setShowSigns] = useState(true);
```

In `Chart.tsx`, rendering becomes conditional — one line:

```tsx
{showSigns && <Zodiac polarPoint={polarPoint} />}
```

Reading it: `Zodiac` draws the 12 separator ticks *and* the glyphs. Hiding the
whole group leaves the outer band as a clean empty ring. If you'd rather keep
the separators and hide only the glyphs, move the conditional inside
`Zodiac.tsx` around the `SIGN_GLYPHS.map` instead — both are one-liners, pick by
eye.

Panel side: a new `DisplayToggles.tsx` in `sidePanel/components/`, rendered
under a `<Divider label="DISPLAY" />` (SidePanel already exports the Divider
pattern at `SidePanel.tsx:14`). Model the buttons on `AspectToggles` — same
pill styling, pressed state = toggle on. It will hold this toggle and Task 3's.

**Verify:** toggling off removes the sign band; drag still works (the toggle
must not touch `chartView`/aspect filtering).

---

## Task 3 — Roman/arabic house numerals

App state again, a two-value union rather than a boolean (self-documenting, and
a third style later costs nothing):

```ts
const [numerals, setNumerals] = useState<"roman" | "arabic">("roman");
```

The numerals render in **two places** — `Houses.tsx:96` (the wheel) and
`PlanetList` (the panel's house column; that's why `ROMAN_NUMERALS` is exported
at `Houses.tsx:4`). Grep for `ROMAN_NUMERALS` to catch them all. Rather than
duplicating a ternary in each, give the label one home, next to the array it
uses:

```ts
// Houses.tsx — replaces the bare ROMAN_NUMERALS export as the public face
export const houseLabel = (index: number, numerals: "roman" | "arabic") =>
  numerals === "roman" ? ROMAN_NUMERALS[index] : String(index + 1);
```

Reading it: callers pass the *house index* (0-based) and the current style;
nobody else owns numeral logic. `Houses` and `PlanetList` each take a
`numerals` prop (threaded from App through Chart / SidePanel) and call
`houseLabel`. Note `PlanetList` receives `planet.house` which is 1-based —
mind the `- 1`.

Add the second pill to `DisplayToggles`.

**Verify:** toggle flips VIII↔8 in both the wheel and the planet list at once.

---

## Task 4 — The chart vault (disk-first save/load storage)

### The shape

In `types/index.ts` — a save is a complete, self-contained cast:

```ts
export interface SavedChart {
  id: string;            // crypto.randomUUID()
  name: string;          // what the user typed
  castMs: number;        // the instant
  city: City;            // full snapshot, not a lookup key
  houseSystem: HouseSystem;
  savedAt: number;
}
```

Reading it: storing the whole `City` (not its label) means a saved chart still
loads correctly even if the city list is edited later — the save carries its
own coordinates and timezone. `houseSystem` is always `"Placidus"` today; the
field exists so old saves stay valid the day a selector appears. Related
cleanup while you're in App: the string `"Placidus"` appears three times
(`App.tsx:36,123,141`) — hoist `const HOUSE_SYSTEM: HouseSystem = "Placidus"`
and use it in all three plus the save path, so a future selector changes one line.

### Rust-side wiring (boilerplate — copy exactly)

```toml
# src-tauri/Cargo.toml, [dependencies]
tauri-plugin-store = "2"
```

```rust
// src-tauri/src/lib.rs — chain after the window-state plugin
.plugin(tauri_plugin_store::Builder::default().build())
```

```json
// src-tauri/capabilities/default.json — add to "permissions"
"store:default"
```

```sh
npm i @tauri-apps/plugin-store
```

### The adapter — `src/lib/chartVault.ts`

One module owns storage; the UI never knows which backend answered.

```ts
import { isTauri } from "@tauri-apps/api/core";
import { load } from "@tauri-apps/plugin-store";

const KEY = "savedCharts"; // same key both backends

async function readDisk(): Promise<SavedChart[]> {
  const store = await load("charts.json");
  return (await store.get<SavedChart[]>(KEY)) ?? [];
}
```

Reading it: `load("charts.json")` opens (or creates) a real file in the app's
data directory — `~/.local/share/com.zagarov.natalchart/` on Linux, `%APPDATA%`
on Windows. `isTauri()` is the branch point: true in the desktop webview, false
in a plain browser tab.

The three public functions the UI calls — each returns the fresh list so React
state updates in one assignment:

```ts
export async function listCharts(): Promise<SavedChart[]>
export async function saveChart(c: Omit<SavedChart, "id" | "savedAt">): Promise<SavedChart[]>
export async function deleteChart(id: string): Promise<SavedChart[]>
```

**The drift rule** (your "disk is the source of truth" decision, made
mechanical):

- **Boot (`listCharts`)**, desktop: read disk. If disk has charts → overwrite
  the localStorage mirror with them and return them. If disk is *empty* but the
  mirror has charts (first desktop run after using the browser version, or a
  reinstall) → seed disk from the mirror, then return. Disk wins every
  conflict; the mirror is never merged, only replaced or promoted wholesale.
- **Every write** (`saveChart`/`deleteChart`), desktop: write disk first
  (`store.set` + `store.save`), then mirror the same list to localStorage.
- **Browser** (`isTauri()` false): localStorage is all there is — read and
  write it directly. Same functions, same key, zero desktop imports executed.

Reading it: "look at it and update difference" collapses to *wholesale
replacement in one direction at a time*. Per-chart merging would need conflict
rules (same id, different name?) for no real gain — the mirror isn't a second
library, it's a shadow of the disk.

For `saveChart`: treat `name` as the natural key — if a chart with the same
name exists, replace it (keep its `id`), else append with `crypto.randomUUID()`.
Saving "Mom" twice updates it; no duplicate rows.

**Verify:** in `npm run tauri dev`, save a chart, then
`cat ~/.local/share/com.zagarov.natalchart/charts.json` — your chart is there.
Delete the localStorage entry via devtools, relaunch: the list survives (disk
truth). In plain `npm run dev`, the same UI works off localStorage.

---

## Task 5 — Saved charts UI + loading

### The missing primitive: resetting CastForm from outside

Loading must update the chart *and* the form fields — but the fields are
`CastForm`'s local state, and Task 1 made them **initializers** (first render
only). React's idiom for "re-run the initializers" is changing the component's
`key`:

```tsx
<CastForm
  key={`${castMs}-${city.label}`}
  initialMs={castMs}
  city={city}
  …
/>
```

Reading it: a changed `key` tells React this is a *different* form — unmount,
mount fresh, initializers run against the new `initialMs`/`city`. Typing never
changes `castMs`, so the form is never reset mid-edit; casting, Now, and
loading all move `castMs`, so all three snap the fields — which is exactly the
"form always displays what was cast" contract from `CastForm.tsx:6`.

### The section

`SavedCharts.tsx` in `sidePanel/components/`, under
`<Divider label="SAVED CHARTS" />`:

- a name input + Save button → `onSave(name)` → App calls
  `saveChart({ name, castMs, city, houseSystem })` and stores the returned list;
- one row per saved chart: name + its pretty date
  (`prettyDate(wallClock(c.city.tz, c.castMs).date)` — the city's own wall
  clock, same as the footer), click → `onLoad(c)`;
- a small ✕ per row → `onDelete(c.id)`.

App holds `const [saved, setSaved] = useState<SavedChart[]>([])`, filled once:

```ts
useEffect(() => {
  listCharts().then(setSaved);
}, []);
```

Reading it: storage is async (a real file read), so the list arrives after
first paint — starting from `[]` renders an empty section for a frame, which is
fine. This is the app's first `useEffect`; data fetching on mount is its
legitimate use.

`onLoad` mirrors `onCast` (`App.tsx:81`) plus the tween cancel:

```ts
returnTween.cancel();
setCity(c.city);
setUtcMs(c.castMs);
setCastMs(c.castMs); // moves the double-click anchor; also re-keys CastForm
```

**Verify:** save the current chart under a name → drag time away → click the
row → wheel snaps back, form fields show the saved date, footer shows the saved
city. Relaunch the app: the list is still there. Delete a row: gone from
`charts.json` too.

---

## Suggested commit points

One commit per task, verified before each. After Task 5, run the full
desktop check (`npm run tauri build`, install locally) before we tag a release.
