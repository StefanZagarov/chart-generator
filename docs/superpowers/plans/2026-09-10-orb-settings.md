# Orb Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add independently controlled, globally persisted orb settings that update live aspect calculation while cached chart previews continue to use canonical defaults.

**Architecture:** `App` owns one explicit `OrbConfig` and passes it through `computeChart` to pure aspect calculation. A focused persistence adapter loads disk-first Tauri settings with a localStorage mirror/browser backend, while an independent action-rail panel edits the accepted configuration live.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Tailwind CSS 4, Tauri 2 store plugin, Swiss Ephemeris

**Spec:** `docs/superpowers/specs/2026-09-10-orb-settings-design.md`

## Global Constraints

- Add no runtime or development dependencies and no automated test framework.
- Accepted values are finite numbers from `0` through `15`, aligned to `0.5` increments.
- Canonical defaults are Conjunction `8`, Sextile `6`, Square `7`, Trine `7`, Opposition `8`, Semisextile `2`, Quincunx `3`, Quintile `2`, Biquintile `2`, and luminary bonus `2`.
- The luminary bonus applies once to major aspects involving the Sun or Moon and never to minor aspects.
- Cached and fallback library previews use canonical defaults; live charts use the active global configuration.
- The Orbs panel and existing right settings panel remain independent.
- Do not create commits; the user controls repository history.
- Do not refactor or reformat unrelated code.

---

### Task 1: Make orb configuration an explicit engine input

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/engine/assembly.ts`
- Modify: `src/engine/swiss.ts`
- Modify: `src/components/chart/MiniWheel.tsx`

**Interfaces:**
- Produces: `OrbConfig`, `DEFAULT_ORB_CONFIG`, `ASPECT_DEFINITIONS`
- Changes: `computeChart(utcMs, lat, lon, houseSystem, orbConfig)`
- Changes: `assembleChart(jdUT, bodies, asc, mc, cusps, orbConfig)`
- Preserves: default arguments keep existing callers valid until App integration

- [x] **Step 1: Add the configuration type**

Add this type beside `AspectType` in `src/types/index.ts`:

```ts
export interface OrbConfig {
  aspects: Record<AspectType, number>;
  luminaryBonus: number;
}
```

- [x] **Step 2: Separate aspect geometry from canonical orb defaults**

In `src/engine/assembly.ts`, replace the four-value `ASPECTS` tuples with exported immutable definitions containing only `type`, `glyph`, and `angle`, then add the one canonical configuration:

```ts
export const ASPECT_DEFINITIONS = [
  { type: "Conjunction", glyph: "☌︎", angle: 0 },
  { type: "Sextile", glyph: "⚹︎", angle: 60 },
  { type: "Square", glyph: "□︎", angle: 90 },
  { type: "Trine", glyph: "△︎", angle: 120 },
  { type: "Opposition", glyph: "☍︎", angle: 180 },
  { type: "Semisextile", glyph: "⚺︎", angle: 30 },
  { type: "Quincunx", glyph: "⚻︎", angle: 150 },
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
    Quincunx: 3,
    Quintile: 2,
    Biquintile: 2,
  },
  luminaryBonus: 2,
};
```

Keep the existing minor-aspect classification. Change `findAspects` to accept `orbConfig: OrbConfig`, read `orbConfig.aspects[type]`, and add `orbConfig.luminaryBonus` only when the aspect is not minor and either body is the Sun or Moon.

- [x] **Step 3: Thread configuration through assembly and Swiss Ephemeris**

Add `orbConfig: OrbConfig = DEFAULT_ORB_CONFIG` as the final parameter of `assembleChart`. Pass it to `findAspects`.

Add `orbConfig: OrbConfig = DEFAULT_ORB_CONFIG` as the final parameter of `computeChart`. Pass it as the final argument to `assembleChart`. Do not change `ascAt`, because house rotation does not calculate aspects.

- [x] **Step 4: Make the preview policy explicit**

Import `DEFAULT_ORB_CONFIG` into `MiniWheel.tsx` and pass it as the final `computeChart` argument. This covers both newly cached images and the live fallback used by old saves without an `image`.

- [x] **Step 5: Check the calculation boundary**

Run:

```bash
npm run lint
npm run build
```

Expected: both commands exit successfully; the existing chart still renders from the default argument before App supplies a custom configuration.

---

### Task 2: Add disk-first global orb persistence

**Files:**
- Create: `src/lib/orbSettings.ts`
- Modify: `src/main.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `OrbConfig`, `DEFAULT_ORB_CONFIG`, existing Tauri `load` and `isTauri`
- Produces: `loadOrbConfig(): Promise<OrbConfig>`
- Produces: `saveOrbConfig(config: OrbConfig): Promise<boolean>`
- Changes: `App({ initialOrbConfig }: { initialOrbConfig: OrbConfig })`

- [x] **Step 1: Implement normalization and localStorage access**

Create `src/lib/orbSettings.ts` with `FILE = "settings.json"` and `KEY = "orbConfig"`. Clone defaults rather than returning the exported nested object directly:

```ts
const defaults = (): OrbConfig => ({
  aspects: { ...DEFAULT_ORB_CONFIG.aspects },
  luminaryBonus: DEFAULT_ORB_CONFIG.luminaryBonus,
});

const validOrb = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= 0 &&
  value <= 15 &&
  Number.isInteger(value * 2);
```

Implement `normalizeOrbConfig(value: unknown)` by starting from `defaults()`, visiting only `ASPECT_DEFINITIONS`, accepting each valid known value, accepting a valid `luminaryBonus`, and discarding all unknown properties. Implement guarded `readMirror` and `writeMirror`; storage exceptions return `null`/`false` rather than escaping.

- [x] **Step 2: Implement disk-first loading**

`loadOrbConfig` must follow this exact order:

```text
browser -> normalized mirror, or defaults written to mirror
Tauri with disk value -> normalized disk value, then replace mirror
Tauri without disk value -> normalized mirror or defaults, then seed disk and mirror
Tauri read/write failure -> normalized mirror or defaults, without throwing
```

Use the already configured Tauri store plugin; do not add Cargo, capability, or npm entries.

- [x] **Step 3: Serialize writes and return persistence status**

Keep a module-level `Promise<boolean>` queue. Each `saveOrbConfig` call captures a normalized snapshot and chains its write after the preceding operation, including after a preceding rejection. In Tauri, write and save `settings.json` first, then mirror the same value. If disk persistence fails, still attempt the mirror and resolve `false`. In the browser, resolve with the mirror write result.

- [x] **Step 4: Load preferences before React mounts**

Add `loadOrbConfig()` to the existing `Promise.all` in `main.tsx`. Read the third resolved value and render:

```tsx
<App initialOrbConfig={initialOrbConfig} />
```

The preference adapter must absorb storage failures, so only ephemeris or city-atlas failures reach the existing fatal-load branch.

- [x] **Step 5: Establish App ownership**

Change App's signature to accept `initialOrbConfig`, create `orbConfig` state from it, and pass `orbConfig` as the fifth argument to the live `computeChart` call. Add `orbSaveFailed` state and one update function that sets the accepted React value first, calls `saveOrbConfig`, and sets failure state from the returned boolean.

Do not yet add UI; the default and persisted configurations should already reach the engine.

- [x] **Step 6: Check boot and compilation**

Run:

```bash
npm run lint
npm run build
```

Expected: both commands exit successfully and App receives a validated configuration before its first render.

---

### Task 3: Build and connect the independent orb panel

**Files:**
- Create: `src/components/OrbSettingsPanel.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `ASPECT_DEFINITIONS`, `DEFAULT_ORB_CONFIG`, `OrbConfig`
- Props: `config`, `saveFailed`, `onChange(next: OrbConfig)`, `onReset()`
- Produces: independent Orbs trigger and left-opening settings panel

- [x] **Step 1: Build the panel shell**

Create `OrbSettingsPanel` with local `open` state. Match the action text styling used by `VaultActions` for the **Orbs** trigger. Use a `relative` left-aligned wrapper and an absolute panel below the trigger.

Keep the panel mounted. When closed, apply `invisible`, `opacity-0`, `-translate-x-[140px]`, and `aria-hidden`; when open, apply `visible`, `opacity-100`, and `translate-x-0`. Match the existing panel's `duration-200`, easing, parchment surface, gold border, and reduced-motion behavior. Do not read or control the right settings panel.

- [x] **Step 2: Implement one reusable numeric row**

Inside the component file, add a focused row component receiving `label`, `glyph`, `value`, and `onChange`. It keeps a text draft synchronized when the accepted `value` prop changes.

The decrement and increment buttons call `onChange(Math.max(0, value - 0.5))` and `onChange(Math.min(15, value + 0.5))`, and disable at their respective boundaries. The text input uses `inputMode="decimal"`.

On text change, retain the draft and call `onChange(parsed)` only when the non-empty text parses to a finite `0–15` number with `Number.isInteger(parsed * 2)`. Mark all other drafts invalid. On blur or Escape, replace the draft with the accepted value; Escape must also blur or otherwise end the edit predictably.

- [x] **Step 3: Render all controls and Reset**

Map `ASPECT_DEFINITIONS` in canonical order. For each valid change, create a new configuration with a copied `aspects` record and only that aspect replaced. Render the shared Luminary bonus through the same numeric row and replace only `luminaryBonus` on change.

Add one **Reset defaults** button at the bottom. Show a compact persistence warning only when `saveFailed` is true. Do not add per-row resets, presets, profiles, applying/separating controls, or import/export.

- [x] **Step 4: Place the panel before Save and wire updates**

In App's `ChartViewport` `actions` content, render `OrbSettingsPanel` immediately before `VaultActions`. Pass `orbConfig`, `orbSaveFailed`, the App update function, and a reset callback that supplies a fresh nested copy of `DEFAULT_ORB_CONFIG` through the same update function.

Keep the components as siblings; do not add orb responsibilities to `VaultActions` or change its save-name behavior.

- [x] **Step 5: Check the integrated UI**

Run:

```bash
npm run lint
npm run build
```

Expected: both commands exit successfully with no new lint suppressions.

---

### Task 4: Verify behavior and close the planning checklist

**Files:**
- Modify after successful verification: `docs/plans/2026-09-10-release-todo.md`

**Interfaces:**
- Consumes: completed Tasks 1–3
- Produces: verified end result and accurate TODO status

- [ ] **Step 1: Verify the browser result**

Run the browser app and check:

```bash
npm run dev
```

- Orbs appears immediately before Save.
- Its panel animates from the left and remains independent of the right settings panel.
- Closed panel controls cannot be clicked or reached with Tab.
- Buttons move values by exactly `0.5°`, disable at `0°`/`15°`, and aspect lines update live.
- Valid typed half-degree values update live; empty, out-of-range, and non-half-degree drafts do not affect the chart and restore on blur/Escape.
- Luminary bonus changes only major aspects involving Sun or Moon.
- Reset restores every canonical default.
- Reloading retains the current global values through localStorage.

- [~] **Step 2: Verify the desktop result**

Run:

```bash
npm run tauri dev
```

Change values, close and relaunch, and confirm they return from `settings.json`. Verify an absent disk entry promotes the browser mirror and an existing disk entry replaces a conflicting mirror. A simulated invalid stored field must normalize to its individual default without discarding valid sibling fields.

- [ ] **Step 3: Verify preview policy**

With non-default live values, save a chart and open the library. Confirm its cached image uses canonical default orbs. Load that chart and confirm the live wheel uses the current global settings.

- [ ] **Step 4: Record only verified completion**

After all relevant checks pass, mark the seven Task 9 checklist items `[x]` in `docs/plans/2026-09-10-release-todo.md`. Leave any item unchecked if its verification could not be completed, and state that limitation in the handoff.

- [x] **Step 5: Review the final diff**

Run:

```bash
git diff --check
git status --short
git diff --stat
```

Expected: no whitespace errors; only the orb feature, its approved documents, and pre-existing user changes appear. Do not commit.
