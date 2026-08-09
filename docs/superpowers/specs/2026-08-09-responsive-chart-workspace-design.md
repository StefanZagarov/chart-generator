# Responsive chart workspace design

## Goal

Make the existing desktop and browser UI usable at every viewport size without shrinking the natal wheel until its labels and controls become unreadable. Both runtimes use the same responsive breakpoint and behavior. The astrological calculations, time controls, vault, and visual language remain unchanged.

## Responsive layout

The responsive layout activates at viewport widths of 1000px and below. Tauri's configured `minWidth` and `minHeight` constraints will be removed so its viewport can follow the same behavior as the browser at the same dimensions.

Above 1000px, the existing 332px sidebar remains permanently visible. At 1000px and below, the sidebar is removed from document flow and opened with a `Chart data` control. It appears as a fixed left drawer over the chart, keeps the existing 332px width where space allows, and uses 88vw on narrower screens. The drawer scrolls independently.

An open drawer places a translucent ink backdrop with backdrop blur over the remaining interface. The backdrop blocks chart interaction and underlying page scrolling. The drawer closes from its toggle, a backdrop press, or Escape. Resizing above 1000px restores the permanent sidebar without leaving a backdrop or blocked page behind.

The chart footer remains outside the chart viewport and wraps naturally. At 1000px and below, the chart viewport keeps a minimum height of 420px. Short landscape windows therefore scroll the page vertically instead of collapsing the chart viewport.

## Chart sizing and overflow

The wheel lives inside a bounded, independently scrollable viewport. At 100% zoom, its square side length is the larger of 680px and the smaller available chart-viewport dimension. The selected zoom percentage multiplies that base size. This keeps glyphs, degrees, houses, and aspect lines legible at the default while overflow exposes clipped regions.

The wheel starts centered when it first overflows. Resizing and zooming preserve the currently viewed center where possible, then clamp scroll offsets to the new valid bounds. Panning is a no-op on an axis that has no overflow.

## Controls and visual direction

The existing parchment, ink, bronze, gold, Garamond, and IM Fell English system remains unchanged. Responsive controls form a compact instrument rail that uses the project's hairline borders, uppercase tracking, and ink-filled active state rather than generic mobile styling.

Above 1000px, the rail exposes zoom controls while the sidebar remains permanent. At 1000px and below, it also contains the `Chart data` control, existing Save/Load/Import and Options access, and the Rotate/Pan control. When those controls do not fit on one row, the rail wraps them into two rows rather than compressing labels or allowing overlap.

The active Rotate/Pan mode uses the same visual weight as an active aspect toggle. All new controls have accessible names and pressed or expanded states. Drawer and control transitions respect reduced-motion preferences.

## Rotation, panning, and zoom

Rotate remains the default interaction mode.

At 1000px and below, a visible `Rotate · Pan` control selects the meaning of an ordinary drag for mouse and touch. Rotate uses the existing time-scrubbing pipeline. Pan moves only the chart viewport's scroll position; it does not move the sidebar, rail, footer, or page.

Above 1000px, ordinary drag continues to rotate and Shift+drag temporarily pans. The drag behavior is chosen and locked on pointer-down, so pressing or releasing Shift during a gesture cannot switch its meaning midway through the drag.

Mouse-wheel input continues to wind chart time. It does not become viewport scrolling.

Zoom controls appear in both layouts as `− 100% +`. Zoom changes in 10% increments, is clamped from 70% through 200%, and defaults to 100%. Pressing the percentage resets it to 100%. Zooming preserves the currently viewed chart center.

## Component responsibilities

- `App` owns whether the responsive sidebar is open and composes the permanent or drawer presentation of the existing `SidePanel`.
- A focused chart-viewport component owns zoom, Rotate/Pan mode, the overflow element, centering, scroll offsets, and the responsive instrument rail.
- `Chart` retains wheel rendering and its existing rotation gesture. It gains a pan path that reports pointer movement rather than changing chart time when Pan mode or Shift+drag was selected at pointer-down.
- Existing sidebar children, ephemeris calculation, saved-chart data, imports, and persistence remain unchanged.

## Boundary behavior

- Opening the drawer cancels or prevents chart gestures beneath it.
- Closing the drawer restores the prior chart view without recentering it.
- Zoom cannot exceed 70–200%, including rapid repeated presses.
- Pointer cancellation and release always end the active rotate or pan gesture and restore the correct cursor.
- Responsive controls cannot overlap the existing options panel, vault naming field, or modal layer.
- Native overflow remains available as a fallback through scrollbars or platform scrolling, even though drag panning is the primary navigation gesture.

## Verification

No test framework or dependency will be added because the project currently has none and this work is primarily layout and pointer interaction.

Run the existing build and lint commands, then manually verify at widths 360, 390, 768, 1000, 1001, and a normal desktop width. Include a short landscape viewport and both browser and Tauri runtimes where applicable.

The interaction matrix covers:

- permanent versus drawer sidebar behavior at the breakpoint;
- drawer toggle, backdrop, Escape, blur, independent scrolling, and blocked background input;
- unchanged rotation, mouse-wheel winding, planet selection, aspect selection, and double-click return;
- Shift+drag panning above 1000px;
- Rotate and Pan modes with mouse and touch emulation at 1000px and below;
- initial centering, pan limits, resize preservation, and both overflow axes;
- zoom increments, reset, 70% and 200% boundaries, and center preservation;
- utility-rail wrapping, options drawer, vault naming, modals, and footer wrapping;
- reduced-motion behavior and accessible control states.
