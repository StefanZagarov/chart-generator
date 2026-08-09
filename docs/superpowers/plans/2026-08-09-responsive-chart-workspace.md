# Responsive Chart Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a shared responsive workspace for Tauri and browsers with a toggleable blurred sidebar, a legible overflowed chart, drag panning, and 70–200% button zoom.

**Architecture:** `App` continues to own application and drawer state. A new `ChartViewport` owns presentation-only chart navigation state and the instrument rail, while `Chart` remains responsible for interpreting a pointer gesture as rotation or panning. Existing ephemeris, chart data, selection, vault, and form flows remain unchanged.

**Tech Stack:** React 19, TypeScript 6, Tailwind CSS 4, Vite 8, Tauri 2.

## Global Constraints

- Use one responsive breakpoint: `@media (max-width: 1000px)` semantics in both Tauri and browsers.
- Remove Tauri `minWidth` and `minHeight`; do not replace them with another application-level minimum.
- At 100% zoom, wheel side length is `max(680px, min(chartViewportWidth, chartViewportHeight))`.
- Zoom defaults to 100%, changes by 10%, clamps to 70–200%, and resets when the percentage is pressed.
- Default drag mode is Rotate; at 1000px and below the user can select Rotate or Pan; above 1000px Shift+drag pans temporarily.
- Mouse-wheel input continues to wind chart time.
- Preserve the existing palette, typography, chart calculation, time scrubbing, vault, imports, and persistence.
- Do not add dependencies or a test framework.

---

### Task 1: Responsive sidebar shell

**Files:**
- Modify: `src-tauri/tauri.conf.json:14-20`
- Modify: `src/App.tsx:1-305`
- Modify: `src/components/sidePanel/SidePanel.tsx:24-112`
- Modify: `src/components/Modal.tsx:25-52`

**Interfaces:**
- Consumes: the existing `SidePanel` props.
- Produces: `SidePanel` additionally accepts `drawerOpen: boolean` and `onClose: () => void`; `App` owns `sidebarOpen`.

- [ ] **Step 1: Record the current verification baseline**

Run:

```bash
npm run build
npm run lint
```

Expected: both commands pass before responsive source changes. If dependencies are absent, run `npm install` once and repeat the commands.

- [ ] **Step 2: Remove the Tauri-only size floor**

Change the main window entry to keep only its initial size:

```json
{
  "title": "Natal Chart",
  "width": 1280,
  "height": 860
}
```

- [ ] **Step 3: Add drawer state, dismissal, and scroll locking to App**

Add `sidebarOpen` beside the other UI state. Add one effect which listens to Escape and a `(max-width: 1000px)` media query, closes the drawer when leaving responsive mode, and restores `document.body.style.overflow` in cleanup. The resulting state contract is:

```ts
const [sidebarOpen, setSidebarOpen] = useState(false);

useEffect(() => {
  const responsive = window.matchMedia("(max-width: 1000px)");
  const closeOnDesktop = () => {
    if (!responsive.matches) setSidebarOpen(false);
  };
  const closeOnEscape = (event: KeyboardEvent) => {
    if (event.key === "Escape") setSidebarOpen(false);
  };

  document.body.style.overflow = sidebarOpen ? "hidden" : "";
  responsive.addEventListener("change", closeOnDesktop);
  window.addEventListener("keydown", closeOnEscape);
  return () => {
    document.body.style.overflow = "";
    responsive.removeEventListener("change", closeOnDesktop);
    window.removeEventListener("keydown", closeOnEscape);
  };
}, [sidebarOpen]);
```

Change the root from a fixed-height row to a desktop row/responsive page:

```tsx
<div className="w-full h-svh flex max-[1000px]:h-auto max-[1000px]:min-h-svh max-[1000px]:block">
```

Render a responsive backdrop immediately after `SidePanel`:

```tsx
{sidebarOpen && (
  <button
    type="button"
    aria-label="Close chart data"
    onClick={() => setSidebarOpen(false)}
    className="hidden max-[1000px]:block fixed inset-0 z-30 bg-ink/35 backdrop-blur-sm"
  />
)}
```

- [ ] **Step 4: Convert SidePanel into a permanent panel or responsive drawer**

Add the two props and render an internal responsive close control. Use this class contract on the `<aside>`:

```tsx
id="chart-data-panel"
className={`flex-none w-[332px] max-w-[88vw] h-full overflow-y-auto border-r-[3px] border-double border-gold bg-parchment-50 px-6 pt-6 pb-4 flex flex-col gap-4
  max-[1000px]:fixed max-[1000px]:inset-y-0 max-[1000px]:left-0 max-[1000px]:z-40
  max-[1000px]:transition-transform max-[1000px]:duration-200 max-[1000px]:ease-out
  motion-reduce:transition-none
  ${drawerOpen ? "max-[1000px]:translate-x-0" : "max-[1000px]:-translate-x-full"}`}
```

The close control belongs at the top of the drawer and is absent from desktop layout:

```tsx
<button
  type="button"
  onClick={onClose}
  className="hidden max-[1000px]:block self-end text-[10px] tracking-[0.22em] uppercase text-bronze hover:text-ink"
>
  Close
</button>
```

Pass `drawerOpen={sidebarOpen}` and `onClose={() => setSidebarOpen(false)}` from `App`.

- [ ] **Step 5: Keep modals above the responsive drawer**

Raise the modal backdrop from `z-20` to `z-50`. No modal behavior changes.

- [ ] **Step 6: Verify and commit the responsive shell**

Run:

```bash
npm run build
npm run lint
```

Expected: both pass; at widths above 1000px the sidebar remains in flow, while the responsive closed state is translated offscreen.

Commit:

```bash
git add src-tauri/tauri.conf.json src/App.tsx src/components/sidePanel/SidePanel.tsx src/components/Modal.tsx
git commit -m "feat: add responsive sidebar drawer"
```

### Task 2: Gesture-locked chart panning

**Files:**
- Modify: `src/components/chart/Chart.tsx:1-201`
- Modify: `src/App.tsx:217-245`

**Interfaces:**
- Consumes: `interactionMode: "rotate" | "pan"` and `onPan(deltaX: number, deltaY: number): void`.
- Produces: ordinary rotation remains unchanged; Pan mode or Shift held at pointer-down reports pixel deltas through `onPan`.

- [ ] **Step 1: Extend the Chart input contract**

Add and destructure:

```ts
interactionMode: "rotate" | "pan";
onPan: (deltaX: number, deltaY: number) => void;
```

Temporarily pass `interactionMode="rotate"` and `onPan={() => {}}` from `App` so this task stays independently buildable.

- [ ] **Step 2: Lock gesture intent at pointer-down**

Add refs:

```ts
const gesture = useRef<"rotate" | "pan">("rotate");
const prevPointer = useRef({ x: 0, y: 0 });
const pendingPan = useRef({ x: 0, y: 0 });
```

At pointer-down, choose once and remember both coordinate systems:

```ts
gesture.current = interactionMode === "pan" || e.shiftKey ? "pan" : "rotate";
prevAngle.current = angleOf(e);
prevPointer.current = { x: e.clientX, y: e.clientY };
```

- [ ] **Step 3: Bank pan deltas through the existing animation-frame gate**

In `onPointerMove`, branch before angular rotation:

```ts
if (gesture.current === "pan") {
  const dx = e.clientX - prevPointer.current.x;
  const dy = e.clientY - prevPointer.current.y;
  prevPointer.current = { x: e.clientX, y: e.clientY };
  moved.current += Math.hypot(dx, dy);
  pendingPan.current.x += dx;
  pendingPan.current.y += dy;
} else {
  // retain the current wrapped-angle calculation and pendingDelta update
}
```

Generalize the existing `requestAnimationFrame` callback so it drains exactly one pending gesture path:

```ts
const pan = pendingPan.current;
pendingPan.current = { x: 0, y: 0 };
if (pan.x || pan.y) onPan(pan.x, pan.y);
else if (total) onScrub(total);
```

Do not change mouse-wheel winding.

- [ ] **Step 4: End both pointer-up and pointer-cancel cleanly**

Extract the current release cleanup into one function and attach it to both events. Only pointer-up performs tap selection:

```tsx
onPointerUp={(event) => endGesture(event, true)}
onPointerCancel={(event) => endGesture(event, false)}
```

The cleanup sets `dragging.current = false`, removes `wheel-dragging`, and releases pointer capture when held. Pointer-up leaves already banked deltas for the scheduled animation-frame callback to flush; pointer-cancel discards them. Tap selection runs only when `allowTap && moved.current < 3`.

- [ ] **Step 5: Verify and commit gesture behavior**

Run:

```bash
npm run build
npm run lint
```

Expected: both pass; ordinary drag and mouse-wheel behavior are unchanged with the temporary Rotate props.

Commit:

```bash
git add src/components/chart/Chart.tsx src/App.tsx
git commit -m "feat: add chart pan gesture path"
```

### Task 3: Overflow viewport, zoom, and instrument rail

**Files:**
- Create: `src/components/chart/ChartViewport.tsx`
- Modify: `src/components/VaultActions.tsx:33-69`
- Modify: `src/components/OptionsPanel.tsx:101-153`
- Modify: `src/App.tsx:2-292`

**Interfaces:**
- Consumes: all existing `Chart` props except `interactionMode` and `onPan`, plus `sidebarOpen`, `onToggleSidebar`, and `actions: React.ReactNode`.
- Produces: `ChartViewport` owns `zoom: number`, `mode: "rotate" | "pan"`, overflow scrolling, base sizing, and responsive controls.

- [ ] **Step 1: Create the ChartViewport state and sizing contract**

Define props from the existing component so Chart prop names cannot drift:

```ts
import type { ComponentProps, ReactNode } from "react";
import { useLayoutEffect, useRef, useState } from "react";
import { Chart } from "./Chart";

type ChartProps = ComponentProps<typeof Chart>;
type ChartViewportProps = Omit<ChartProps, "interactionMode" | "onPan"> & {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  actions: ReactNode;
};
```

Use these constants and state:

```ts
const MIN_WHEEL_SIZE = 680;
const MIN_ZOOM = 70;
const MAX_ZOOM = 200;
const ZOOM_STEP = 10;

const [zoom, setZoom] = useState(100);
const [mode, setMode] = useState<"rotate" | "pan">("rotate");
const [baseSize, setBaseSize] = useState(MIN_WHEEL_SIZE);
const viewportRef = useRef<HTMLDivElement>(null);
const centerRef = useRef<{ x: number; y: number } | null>(null);
```

- [ ] **Step 2: Measure the viewport and preserve its visual center**

Attach a `ResizeObserver` in `useLayoutEffect`. Before changing `baseSize`, store normalized content-center coordinates:

```ts
const rememberCenter = () => {
  const el = viewportRef.current;
  if (!el || !el.scrollWidth || !el.scrollHeight) return;
  centerRef.current = {
    x: (el.scrollLeft + el.clientWidth / 2) / el.scrollWidth,
    y: (el.scrollTop + el.clientHeight / 2) / el.scrollHeight,
  };
};
```

The observer sets:

```ts
setBaseSize(Math.max(MIN_WHEEL_SIZE, Math.min(el.clientWidth, el.clientHeight)));
```

After `baseSize` or `zoom` changes, a layout effect restores `scrollLeft` and `scrollTop` from `centerRef`; when no center has been recorded, use `{ x: 0.5, y: 0.5 }` so initial overflow is centered.

- [ ] **Step 3: Implement bounded zoom and viewport panning**

Use a single setter which remembers center before clamping:

```ts
const changeZoom = (next: number) => {
  rememberCenter();
  setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next)));
};
```

Pass this pan callback to `Chart`:

```ts
const pan = (deltaX: number, deltaY: number) => {
  const el = viewportRef.current;
  if (!el) return;
  el.scrollLeft -= deltaX;
  el.scrollTop -= deltaY;
};
```

Render the wheel in a centered square sized by:

```ts
const wheelSize = baseSize * (zoom / 100);
```

The viewport classes are:

```tsx
className="chart-viewport flex-1 min-h-0 min-w-0 overflow-auto max-[1000px]:min-h-[420px]"
```

Place the wheel inside a grid content wrapper with `min-w-full min-h-full place-items-center`. Give both the content wrapper and its square child explicit `wheelSize` width and height; the minimums center a smaller zoom while the explicit size creates complete scroll extents for an oversized zoom. `Chart` remains `h-full w-full` inside the square child.

- [ ] **Step 4: Build the responsive instrument rail**

Render a wrapping rail immediately above the viewport. It contains:

```tsx
<button
  type="button"
  aria-expanded={sidebarOpen}
  aria-controls="chart-data-panel"
  onClick={onToggleSidebar}
  className="hidden max-[1000px]:inline-flex ..."
>
  Chart data
</button>
{actions}
<div className="ml-auto max-[1000px]:basis-full ...">
  <div className="hidden max-[1000px]:flex" aria-label="Chart drag mode">
    <button aria-pressed={mode === "rotate"} onClick={() => setMode("rotate")}>Rotate</button>
    <button aria-pressed={mode === "pan"} onClick={() => setMode("pan")}>Pan</button>
  </div>
  <div aria-label="Chart zoom">
    <button aria-label="Zoom out" disabled={zoom === MIN_ZOOM} onClick={() => changeZoom(zoom - ZOOM_STEP)}>−</button>
    <button aria-label="Reset zoom" onClick={() => changeZoom(100)}>{zoom}%</button>
    <button aria-label="Zoom in" disabled={zoom === MAX_ZOOM} onClick={() => changeZoom(zoom + ZOOM_STEP)}>+</button>
  </div>
</div>
```

Use existing bronze uppercase labels, gold hairlines, ink-filled active buttons, and `motion-reduce:transition-none`.

- [ ] **Step 5: Move vault and options controls into document flow**

Change `VaultActions` root from fixed coordinates to:

```tsx
<div className="relative z-10 flex flex-col items-start gap-1.5">
```

Change `OptionsPanel` root to a relative container and its panel to an absolute right-aligned dropdown:

```tsx
<div className="relative z-20 ml-auto flex flex-col items-end">
```

```tsx
className={`absolute right-0 top-full mt-2 ... ${open ? ... : ...}`}
```

Keep all save, naming, and option behavior unchanged.

- [ ] **Step 6: Integrate ChartViewport in App**

Replace the existing chart wrapper and direct `Chart` with `ChartViewport`. Pass the current Chart props unchanged, pass `sidebarOpen`, and toggle through `setSidebarOpen`.

Pass this fragment as `actions`:

```tsx
<>
  <VaultActions {...existingVaultProps} />
  <OptionsPanel {...existingOptionsProps} />
</>
```

Remove the old fixed `VaultActions` and `OptionsPanel` siblings. Keep the footer after `ChartViewport` and use compact responsive spacing/text:

```tsx
<footer className="flex-none text-center pt-2 px-2">
```

```tsx
<div className="italic text-[20px] max-[600px]:text-[16px] leading-snug text-umber">
```

- [ ] **Step 7: Verify and commit the chart workspace**

Run:

```bash
npm run build
npm run lint
```

Expected: both pass with no new dependencies; the app has one in-flow toolbar and no fixed vault/options collision.

Commit:

```bash
git add src/App.tsx src/components/chart/ChartViewport.tsx src/components/VaultActions.tsx src/components/OptionsPanel.tsx
git commit -m "feat: add responsive chart viewport controls"
```

### Task 4: Responsive and interaction verification

**Files:**
- Modify only if a verification failure requires a scoped correction: `src/App.tsx`, `src/index.css`, `src/components/chart/Chart.tsx`, `src/components/chart/ChartViewport.tsx`, `src/components/sidePanel/SidePanel.tsx`, `src/components/VaultActions.tsx`, `src/components/OptionsPanel.tsx`, `src/components/Modal.tsx`

**Interfaces:**
- Consumes: the completed responsive workspace.
- Produces: verified behavior across the approved viewport and input matrix.

- [ ] **Step 1: Run static verification**

Run:

```bash
npm run build
npm run lint
git diff --check HEAD~3..HEAD
```

Expected: all commands exit successfully with no whitespace errors.

- [ ] **Step 2: Verify the browser viewport matrix**

Run `npm run dev`, then inspect widths `360`, `390`, `768`, `1000`, `1001`, and `1366`, plus a short landscape viewport. At each applicable width verify:

```text
1001+: permanent sidebar; ordinary drag rotates; Shift+drag pans; zoom works.
1000 and below: sidebar is initially closed; Chart data opens it; backdrop blur,
backdrop click, Close, and Escape dismiss it; Rotate is default; Pan moves only
the chart viewport; controls wrap without overlap; footer remains outside.
All widths: wheel starts centered, mouse wheel winds time, zoom changes by 10%,
70% and 200% disable the respective button, percentage resets to 100%, and the
viewed center survives zoom and resize.
```

Also verify planet selection, aspect selection, double-click return, Save naming, Load, Import, Options, and modal stacking.

- [ ] **Step 3: Verify touch and cancellation paths**

With browser touch emulation enabled, verify Rotate and Pan at 390px. Start a gesture and trigger pointer cancellation by leaving emulation or switching focus; the cursor and next gesture must recover. Enable reduced-motion emulation and confirm the drawer no longer animates.

- [ ] **Step 4: Verify the Tauri runtime**

Run:

```bash
npm run tauri dev
```

Resize through both sides of 1000px and repeat sidebar, Rotate, Pan, Shift+drag, zoom, wheel winding, options, and vault checks. Confirm the OS permits resizing below the former 1000×700 floor.

- [ ] **Step 5: Correct only observed failures and re-run verification**

For each observed failure, make the smallest scoped correction in the listed files, then repeat Steps 1–4 for the affected behavior. Do not change ephemeris, vault data, imports, or unrelated styling.

- [ ] **Step 6: Commit verification corrections if any**

If Step 5 changed files:

```bash
git add src/App.tsx src/index.css src/components/chart/Chart.tsx src/components/chart/ChartViewport.tsx src/components/sidePanel/SidePanel.tsx src/components/VaultActions.tsx src/components/OptionsPanel.tsx src/components/Modal.tsx
git commit -m "fix: polish responsive chart interactions"
```

If Step 5 changed nothing, do not create an empty commit.
