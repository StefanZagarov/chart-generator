# Orb settings design

## Scope

Add one global, persistent orb configuration that controls live aspect calculation. The configuration is edited from an independent animated panel in the chart action rail. Saved-chart data does not carry orb settings; per-chart orb settings remain deferred.

Cached library images always use canonical default orbs. Loading a saved chart calculates its live aspects with the currently active global configuration.

## Orb model

```ts
interface OrbConfig {
  aspects: Record<AspectType, number>;
  luminaryBonus: number;
}
```

Every value is expressed in degrees, ranges from `0` through `15`, and must be aligned to `0.5` increments.

The canonical defaults are:

| Aspect | Default orb |
| --- | ---: |
| Conjunction | 8° |
| Sextile | 6° |
| Square | 7° |
| Trine | 7° |
| Opposition | 8° |
| Semisextile | 2° |
| Quincunx | 3° |
| Quintile | 2° |
| Biquintile | 2° |
| Luminary bonus | 2° |

The configured value is one inclusive threshold: an aspect exists when its deviation from the exact aspect angle is less than or equal to its allowed orb. There are no separate applying and separating values and no history-dependent connection or disconnection behavior.

The shared luminary bonus is added when either body is the Sun or Moon and the aspect is major: Conjunction, Sextile, Square, Trine, or Opposition. It is not added to minor aspects. A Sun–Moon pair receives the bonus once, not once per luminary.

If more than one aspect type qualifies for a pair, the existing rule remains: use the aspect with the smallest absolute deviation from exactness.

## Calculation flow

`App` owns the active `OrbConfig`. The dependency remains explicit through the full calculation path:

```text
App
  -> computeChart
    -> assembleChart
      -> findAspects
```

`computeChart` accepts the orb configuration after the existing house-system argument and forwards it without reading UI or storage state. `assembleChart` forwards it to aspect calculation. The calculation stays pure: the same planetary positions and orb configuration always produce the same aspect set.

The aspect definitions retain the glyph and exact angle metadata, but their default orb values come from the single exported canonical configuration. The old embedded values and `1.5°` luminary constant are removed so there is no second source of truth.

`MiniWheel` explicitly supplies the canonical default configuration to `computeChart`. Both newly cached previews and uncached fallback previews therefore use defaults regardless of the user's active global values. Existing cached images remain unchanged.

## Persistence

Create an orb-preferences adapter backed by `settings.json` through the existing Tauri store plugin and by localStorage under the `orbConfig` key.

The storage policy matches the chart vault:

- In Tauri, disk is authoritative. When disk contains a configuration, validate it, return it, and replace the localStorage mirror with the normalized result.
- When the desktop disk value is absent, validate the localStorage value, promote it to disk, and return it.
- In the browser, localStorage is the source of truth.
- When neither backend contains a usable value, return and persist the canonical defaults.

Validation is field-by-field. Each known field must be a finite number from `0` through `15` and an exact multiple of `0.5`. Missing, unknown, or invalid data never reaches the engine. Missing or invalid known fields are replaced by their canonical defaults; unknown fields are discarded. The normalized shape is written back so partial or older stored data migrates without a separate migration routine.

Orb settings load before React mounts, in parallel with the ephemeris and city atlas. `main.tsx` passes the resulting initial configuration to `App`, preventing a first render with defaults followed by a visible aspect change.

Changing a valid value updates React state immediately. Persistence operations enter one serialized queue so rapid changes cannot finish out of order. Reset uses the same state and persistence path.

If disk persistence fails, the current in-memory configuration remains active. The adapter attempts to retain the normalized configuration in the localStorage fallback and returns a failure result. The panel shows a compact save-failure message; it clears after a later successful persistence operation. A storage failure never prevents chart calculation or interaction.

## User interface

Add an icon-only **Orbs** button immediately before Save in the chart's top-left action rail. Its SVG combines an angle mark, a curved crossing stroke, and a detached degree circle. A `−`/direction indicator communicates closed/open state in the same style as the Settings control. The orb control and `VaultActions` remain separate components; their shared parent determines placement.

The button independently toggles its own panel. It does not open, close, or otherwise coordinate with the existing right-side settings panel, so both may be open simultaneously.

The orb panel follows the existing settings panel's mounted-but-hidden transition pattern. Its closed position is translated to the left; opening brings it into place from left to right with the same duration and easing as the current settings panel. Closed content is invisible, cannot receive pointer input, and is removed from keyboard navigation.

Both toolbar icon sets use 20px primary icons and 16px state indicators. The Save, Load, and Import labels use 13px text with a fixed line height inside the same 32px action row, keeping them vertically centered without moving the rail divider.

The panel contains one row for each of the nine aspect types followed by a Luminary bonus row. Each aspect row shows its existing glyph, name, and a compact numeric control with decrement, value, and increment controls. The minimum and maximum controls disable at `0°` and `15°` respectively. Each button changes the value by `0.5°` and applies it immediately.

The value can also be typed. The input keeps a temporary text draft so clearing or partially editing a value does not send invalid data to the engine. A finite value is applied live only when it is in range and aligned to `0.5`. Invalid temporary input is visibly marked and restores the last accepted value on blur. Pressing Escape also restores the accepted value.

A single **Reset defaults** action replaces all ten active values with the canonical configuration and persists them immediately. No per-row reset, profiles, import/export, or per-chart override is included.

## Component responsibilities

- `OrbSettingsPanel` owns only its open state and temporary input drafts. It receives the accepted configuration, change callback, reset callback, and persistence status.
- `App` owns the accepted configuration, applies valid changes to chart calculation, and initiates persistence.
- The orb-preferences adapter owns validation, normalization, backend selection, mirroring, serialized writes, and failure reporting.
- The engine owns aspect definitions and pure aspect calculation. It does not read localStorage, Tauri state, or React state.
- `MiniWheel` owns the explicit default-orb policy for cached and fallback preview rendering.

## End-result verification

No automated test framework or new test dependency is added in this iteration.

- Run `npm run lint` and `npm run build`.
- Confirm the panel opens from the left, remains independent of the right settings panel, and is unavailable to pointer and keyboard input while closed.
- Confirm every increment and decrement moves exactly `0.5°`, respects `0°` and `15°`, and updates live aspect lines.
- Confirm valid typed values apply live and invalid, out-of-range, or non-step-aligned values never reach the chart and restore on blur or Escape.
- Confirm the luminary bonus affects major Sun/Moon aspects once and does not affect minor aspects or non-luminary pairs.
- Confirm Reset restores all canonical values, including Sextile `6°` and luminary bonus `2°`.
- Reload the browser build and Tauri app to confirm persistence.
- Confirm Tauri disk values replace the mirror, an absent disk value is seeded from the mirror, and invalid stored fields normalize to defaults.
- Save a chart while custom orbs are active and confirm its cached preview uses canonical defaults while loading it uses the current global configuration.

## Deferred

- Per-chart orb configurations or overrides.
- Multiple named orb profiles.
- Separate applying and separating orbs.
- History-dependent connection and disconnection thresholds.
