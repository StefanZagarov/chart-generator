# Natal Chart release TODO

Implement and verify one item at a time. Do not start the next unchecked item until the current item meets its acceptance criteria.

Status: `[ ]` not started · `[~]` partially present · `[x]` already implemented

## Current baseline

- [x] Planet colors can be toggled in the options panel.
- [x] Zodiac colors can be toggled in the options panel.
- [x] Zodiac display can be toggled in the options panel.
- [x] Chart zoom controls exist from 70% to 200%.
- [x] Touch/mobile interaction can switch between Rotate and Pan.
- [~] Koch is supported by the calculation engine, but the active house system is still fixed to Placidus and has no selector.
- [~] The left panel is a collapsible drawer at widths of 1000px and below, but cannot be collapsed on desktop.

## Release 1 implementation order

### 1. Hold-to-repeat calendar winding

- [ ] Holding either arrow in **Wind The Clock** repeatedly advances or reverses the selected unit.
- [ ] A normal click still changes the time exactly once.
- [ ] Repeating stops on pointer release, pointer cancellation, lost focus, or component unmount.
- [ ] Month and year repeats retain the existing calendar-aware behavior.
- [ ] Keyboard activation remains usable and does not create a stuck repeat.

### 2. Select the mouse-wheel time frame

- [ ] Add a selector for the unit changed by wheel scrolling: Minute, Hour, Day, Week, Month, or Year.
- [ ] A wheel notch changes the selected unit in the direction already used by the chart.
- [ ] Month and year scrolling uses calendar arithmetic rather than fixed millisecond durations.
- [ ] The selected unit is visible before the user scrolls.
- [ ] Trackpad input remains controlled and does not produce accidental large jumps.

### 3. Scroll rotation toggle and scroll zoom

- [ ] Add a setting that enables or disables wheel-to-time rotation.
- [ ] When rotation is enabled, ordinary scroll winds time using Task 2's selected unit.
- [ ] `Shift` + scroll zooms the chart without changing time.
- [ ] When rotation is disabled, ordinary scroll retains normal viewport/page behavior.
- [ ] Zoom remains clamped to the existing 70%–200% range.

### 4. Complete house-system selection

- [ ] Replace the fixed Placidus constant with app state and a Placidus/Koch selector.
- [ ] Changing the system recalculates cusps, house placements, ASC, and MC immediately.
- [ ] New saves record the selected house system.
- [ ] Loading a saved chart restores its house system.
- [ ] Imports use the selected or imported house system consistently.
- [ ] The footer displays the active system.

### 5. Desktop side-panel collapse

- [ ] The left data panel can be hidden and restored on desktop as well as mobile.
- [ ] The chart expands into the released space when the panel is hidden.
- [ ] The restore control stays visible and keyboard accessible.
- [ ] Existing mobile drawer, backdrop, Escape-key, and body-scroll behavior remains intact.

### 6. Local and universal time listing

- [ ] Display the cast's local time for the selected birthplace.
- [ ] Display Universal Time (UTC) beside it with an unambiguous label.
- [ ] Both values update while casting, winding, dragging, loading, and returning to the natal time.
- [ ] Local time reflects daylight-saving rules for the place and date.

### 7. House-cusp list

- [ ] Add all twelve house cusps to the side panel in house order.
- [ ] Each row shows the house number and formatted zodiac position.
- [ ] Numerals follow the existing Roman/Arabic setting.
- [ ] Values update for time, place, and house-system changes.

### 8. Stationary planets

- [ ] Define and document the absolute speed threshold used to classify a planet as stationary.
- [ ] Add a stationary flag to calculated planet data without treating the mean node as permanently stationary or retrograde by accident.
- [ ] Mark stationary planets coherently on the wheel and in the planet list.
- [ ] Verify the transition on both sides of at least one known station.

Decision required before implementation: whether one threshold applies to every planet or each planet has its own threshold.

### 9. Aspect-orb settings

- [x] Add an independent angle/degree icon before Save with an orb-settings panel animated from the left.
- [x] List all nine aspect orbs plus one shared major-aspect luminary bonus.
- [x] Allow values from `0°` through `15°` in `0.5°` steps with live recalculation, validation, and Reset defaults.
- [x] Use one inclusive orb threshold; do not add separate applying/separating values or hysteresis.
- [x] Persist one global configuration to a Tauri settings file with localStorage as mirror, fallback, and browser storage.
- [x] Use canonical defaults for cached saved-chart images and current global values for loaded live charts.
- [x] Follow the approved design in `docs/superpowers/specs/2026-09-10-orb-settings-design.md`.

Completed 2026-09-10. The final toolbar uses 20px primary icons, 16px state indicators, and vertically centered 13px Save/Load/Import labels. Scoped lint, production build, Tauri launch/default-file creation, and whitespace checks passed; automated browser interaction was unavailable.

### 10. Lunar nodes

- [x] Derive the South Node exactly 180° from the mean North Node.
- [x] Show both nodes on the wheel and in the side list with distinct names, glyphs, signs, degrees, and houses.
- [x] Let either node use the existing planet-selection behavior.
- [x] Keep both nodes aspect-free until optional node aspects are implemented separately.
- [ ] Add independent North Node and South Node visibility controls.
- [ ] Decide whether to offer mean-node versus true-node calculation before adding a node-mode setting.

### 11. Optional node aspects

- [ ] Add independent toggles for aspects to the North Node and South Node.
- [ ] Both are off by default unless a different release default is chosen explicitly.
- [ ] Enabled node aspects use the active orb settings and existing aspect-type filters.
- [ ] Selected node aspects participate in highlighting and detail display.

### 12. Optional ASC and MC aspects

- [ ] Make the ASC and MC rows in the side list selectable.
- [ ] Clicking ASC or MC enables its aspects; clicking again disables them.
- [ ] Angle aspects use the active orb settings and existing aspect-type filters.
- [ ] Lines, selection highlighting, labels, and aspect details work without pretending ASC/MC are planets.

### 13. Distribution tables

- [ ] Add counts of planets by element: Fire, Earth, Air, and Water.
- [ ] Add counts by sign modality: Cardinal, Fixed, and Mutable.
- [ ] Add counts by house type: Angular, Succedent, and Cadent.
- [ ] Totals are internally consistent and update with the chart.
- [ ] Hidden-planet display settings do not silently change analytical totals.

Decision required before implementation: which bodies count in distributions, especially the lunar nodes and angles.

### 14. Dispositor chain visualization

- [ ] Calculate each included planet's sign ruler and follow the ruler chain.
- [ ] Display final dispositor(s), mutual receptions/cycles, or the explicit absence of a final dispositor.
- [ ] The visualization remains readable when several planets share a chain.
- [ ] Results update with the chart and respect the agreed rulership scheme.

Decision required before implementation: traditional rulers, modern rulers, or a user-selectable scheme; also whether nodes participate.

### 15. “No house” / Aries-at-ascendant mode

- [ ] Add **No house** as a distinct display/calculation mode.
- [ ] Place 0° Aries at the chart's ascendant position.
- [ ] Define which house lines, cusp list, planet-house values, ASC, and MC values are hidden or replaced.
- [ ] Switching back restores the previously selected real house system.
- [ ] Saving and loading preserve this mode.

Decision required before implementation: whether this is purely a rotated zodiac display or also removes all house-derived data.

### 16. Planet glyph artwork

- [ ] Redraw Moon, Venus, and Mars to match the other planet glyphs.
- [ ] Use thicker strokes and a more compact footprint without reducing legibility.
- [ ] Check normal, colored, selected, dimmed, and saved-preview rendering.
- [ ] Verify alignment at the closest supported zoom and on a narrow viewport.

### 17. Startup jingle

- [ ] Add the approved short cosmic audio asset.
- [ ] Play it once per application startup at a restrained volume.
- [ ] Add a sound setting and persist the user's choice.
- [ ] Failure or browser autoplay blocking must not delay or break startup.

Constraint: browser autoplay policies may prevent sound before the first user interaction; desktop and browser behavior must be tested separately.

## Deferred

- [ ] Support per-chart orb settings or overrides. Release 1 uses one global persisted orb configuration, so loading a saved chart uses the currently active global values.

## Release verification

- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] Browser smoke test at desktop and mobile widths.
- [ ] Tauri smoke test for startup sound, saved-chart house systems, and persisted settings.
- [ ] Confirm every completed item above has a focused behavioral check before marking it `[x]`.
