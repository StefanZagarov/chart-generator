import type { Chart, Numerals, Polar } from "../../types/";
import { Zodiac } from "./components/Zodiac";
import { Ticks } from "./components/Ticks";
import { Houses } from "./components/Houses";
import { Planets } from "./components/Planets";
import { Aspects } from "./components/Aspects";
import { useEffect, useRef } from "react";

// Drawing pictures in the form of circles and lines
export function Chart({
  chart,
  showSigns,
  numerals,
  planetColors,
  zodiacColors,
  selected,
  selectedAspect,
  related,
  interactionMode,
  onScrub,
  onPan,
  onWind,
  onSelect,
  onSelectAspect,
  onReturn,
}: {
  chart: Chart;
  /** options-panel toggle: draw the zodiac band's glyphs and separators? */
  showSigns: boolean;
  /** options-panel toggle: house numbering style */
  numerals: Numerals;
  /** options-panel toggle: tint planet glyphs by PLANET_COLOR */
  planetColors: boolean;
  /** options-panel toggle: tint sign glyphs by element */
  zodiacColors: boolean;
  /** name of the selected planet, or null */
  selected: string | null;
  /** "p1|p2" key of the selected aspect line, or null */
  selectedAspect: string | null;
  /** the planets to keep bright while a selection is active — everything else dims */
  related: ReadonlySet<string> | null;
  /** what an ordinary pointer drag does; Shift locks any gesture to pan */
  interactionMode: "rotate" | "pan";
  onScrub: (deltaDeg: number) => void;
  onPan: (deltaX: number, deltaY: number) => void;
  onWind: (deltaMs: number) => void;
  onSelect: (name: string | null) => void;
  onSelectAspect: (key: string | null) => void;
  onReturn: () => void;
}) {
  // Wheel dragging
  // Logic: angleOf measures where the pointer is on a clock face centered on the SVG, via atan2 on the pixel offsets from the center of the element's bounding box. Each move event reports only the change since the last event; the ((delta + 540) % 360) - 180 line fixes the seam where atan2 jumps from +179° to −179° — without it, dragging across the left horizontal would register as a violent 358° spin. setPointerCapture tells the browser "keep sending me this pointer's events even if it leaves the SVG" — that's what makes dragging feel solid instead of dying at the edge. touch-none (CSS touch-action: none) stops mobile browsers from hijacking the gesture to scroll the page.
  // Drag bookkeeping lives in refs, not state: it changes on every mousemove and
  // must not cause a render by itself — only the resulting time change does.
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false); // is a drag in progress right now?
  const gesture = useRef<"rotate" | "pan">("rotate");
  const prevAngle = useRef(0); // pointer angle at the previous move event
  const prevPointer = useRef({ x: 0, y: 0 });

  // Tap vs drag
  // Logic: press and release are the same events for both gestures — what separates
  // them is how far the pointer swept in between. moved accumulates the absolute
  // sweep; under 3° at release it was a tap, and the element remembered from
  // pointer-down (not pointer-up, which may have slid elsewhere) tells us what was
  // tapped: a planet group toggles selection, empty wheel clears it.
  const moved = useRef(0); // total degrees swept during this press
  const downTarget = useRef<EventTarget | null>(null); // what the press started on

  // Drag render optimisation
  // Logic: a mouse fires move events at 125–1000 Hz while the screen paints at ~60. If every event called onScrub directly, React would only commit the last one per frame and the deltas in between would evaporate — the wheel would lag behind a fast drag. Instead every event just adds its sweep to pendingDelta (banked, not overwritten), and requestAnimationFrame — "call me right before the next paint" — flushes the total as a single onScrub. The rafPending flag ensures only one flush is scheduled per frame no matter how many events land in it. Net effect: no delta is ever lost, and the expensive part (the secant solver with its up-to-6 computeChart calls) runs at most once per painted frame instead of once per mouse twitch.
  const pendingDelta = useRef(0); // degrees swept since the last flush
  const pendingPan = useRef({ x: 0, y: 0 }); // pixels dragged since the last flush
  const rafPending = useRef(false); // is a flush already scheduled this frame?

  // Dev-only drag profiler: frame-to-frame gaps and onScrub (solver) cost,
  // rolling last 120 frames, written straight into a plain DOM node — no React,
  // so the meter can't distort what it measures. Flip the flag to investigate
  // drag stutter; measured 2026-07-17: scrub ~0 ms, frames avg 21 ms on a
  // 180 Hz panel in dev — the cost is React dev-mode render + WebKit paint.
  const PROFILE_DRAG = false;
  const perf = useRef({ prev: 0, gaps: [] as number[], costs: [] as number[] });
  const meter = (gap: number, cost: number) => {
    const p = perf.current;
    if (gap < 1000) p.gaps.push(gap); // ignore the pause between drags
    p.costs.push(cost);
    if (p.gaps.length > 120) p.gaps.shift();
    if (p.costs.length > 120) p.costs.shift();
    if (p.gaps.length % 10 !== 0 || p.gaps.length === 0) return;
    const stats = (a: number[]) => {
      const s = [...a].sort((x, y) => x - y);
      return `avg ${(a.reduce((t, v) => t + v, 0) / a.length).toFixed(1)} p95 ${s[Math.floor(s.length * 0.95)].toFixed(1)} max ${s[s.length - 1].toFixed(1)}`;
    };
    let el = document.getElementById("perf-meter");
    if (!el) {
      el = document.createElement("div");
      el.id = "perf-meter";
      el.style.cssText =
        "position:fixed;bottom:8px;right:8px;z-index:99;background:#222;color:#0f0;font:11px monospace;padding:6px 8px;white-space:pre;pointer-events:none";
      document.body.appendChild(el);
    }
    el.textContent = `frame ms: ${stats(p.gaps)}\nscrub ms: ${stats(p.costs)}\nframes >20ms: ${p.gaps.filter((g) => g > 20).length}/${p.gaps.length}`;
  };

  // Pointer's angle around the SVG's center, in degrees
  const angleOf = (e: React.PointerEvent) => {
    const rect = svgRef.current!.getBoundingClientRect();
    // pixel offsets from the center of the SVG's box...
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    // ...turned into a clock-face angle by atan2
    return (Math.atan2(dy, dx) * 180) / Math.PI;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    // stop the native selection gesture before it starts: WebKitGTK (unlike
    // Chrome) happily begins marking text mid-drag even under pointer capture
    e.preventDefault();
    dragging.current = true;
    moved.current = 0;
    downTarget.current = e.target;
    // Lock the meaning of this gesture now. Releasing Shift or changing the
    // responsive mode mid-drag cannot turn a pan into a rotation (or vice versa).
    gesture.current = interactionMode === "pan" || e.shiftKey ? "pan" : "rotate";
    // remember where the drag starts — deltas are measured from here
    prevAngle.current = angleOf(e);
    prevPointer.current = { x: e.clientX, y: e.clientY };
    // keep receiving this pointer's events even when it leaves the SVG,
    // so the drag doesn't die at the edge
    e.currentTarget.setPointerCapture(e.pointerId);
    // closed fist while dragging — the class (styled in index.css) forces
    // grabbing on every child too, overriding their cursor-pointer
    svgRef.current?.classList.add("wheel-dragging");
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return; // hover, not drag
    if (gesture.current === "pan") {
      const deltaX = e.clientX - prevPointer.current.x;
      const deltaY = e.clientY - prevPointer.current.y;
      prevPointer.current = { x: e.clientX, y: e.clientY };
      moved.current += Math.hypot(deltaX, deltaY);
      pendingPan.current.x += deltaX;
      pendingPan.current.y += deltaY;
    } else {
      const angle = angleOf(e);
      // how far the pointer swept since the last event...
      let delta = angle - prevAngle.current;
      // ...wrapped to [-180, 180) so crossing atan2's +179°→−179° seam
      // doesn't read as a violent 358° spin
      delta = ((delta + 540) % 360) - 180;
      prevAngle.current = angle;
      moved.current += Math.abs(delta);

      // bank the sweep instead of reporting it immediately
      pendingDelta.current += delta;
    }

    // schedule one flush for this frame (if none is scheduled yet)
    if (!rafPending.current) {
      rafPending.current = true;
      requestAnimationFrame(() => {
        rafPending.current = false;
        const total = pendingDelta.current;
        pendingDelta.current = 0;
        const pan = pendingPan.current;
        pendingPan.current = { x: 0, y: 0 };
        if (pan.x || pan.y) onPan(pan.x, pan.y);
        if (import.meta.env.DEV && PROFILE_DRAG) {
          const now = performance.now();
          const gap = perf.current.prev ? now - perf.current.prev : 0;
          perf.current.prev = now;
          const t0 = performance.now();
          if (total) onScrub(total);
          if (gap) meter(gap, performance.now() - t0);
        } else if (total) onScrub(total);
      });
    }
  };

  const endGesture = (e: React.PointerEvent, allowTap: boolean) => {
    dragging.current = false;
    svgRef.current?.classList.remove("wheel-dragging");
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
    if (!allowTap) {
      if (gesture.current === "pan") pendingPan.current = { x: 0, y: 0 };
      else pendingDelta.current = 0;
    }
    // a still press-and-release is a tap: planet beats aspect line beats empty
    // wheel (which clears every selection — App's onSelect(null) resets both)
    if (allowTap && moved.current < 3) {
      const target = downTarget.current as Element | null;
      const planetGroup = target?.closest?.("[data-planet]");
      const aspectGroup = planetGroup ? null : target?.closest?.("[data-aspect]");
      if (planetGroup) onSelect(planetGroup.getAttribute("data-planet"));
      else if (aspectGroup)
        onSelectAspect(aspectGroup.getAttribute("data-aspect"));
      else onSelect(null);
    }
  };

  // Scroll winds time directly — no solver needed, unlike drag which speaks
  // degrees. Mouse wheels report deltaY in ~100-per-notch steps, trackpads in a
  // smooth stream of small values; dividing by 100 normalizes both into
  // "notches", and the clamp stops a hard trackpad fling from teleporting.
  // One notch = 1 minute; scrolling down winds forward.
  // React delegates wheel events through a passive root listener, where
  // preventDefault cannot stop an overflowing viewport from scrolling. Attach
  // this one listener directly so wheel input keeps its established meaning:
  // winding chart time, never moving the viewport.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const wind = (e: WheelEvent) => {
      e.preventDefault();
      const notches = Math.max(-8, Math.min(8, e.deltaY / 100));
      onWind(notches * 60_000);
    };
    svg.addEventListener("wheel", wind, { passive: false });
    return () => svg.removeEventListener("wheel", wind);
  }, [onWind]);

  // Ascendant position
  const ascendant = chart.asc;

  const polarPoint: Polar = (longitude, radius) => {
    const angleRad = ((180 - (longitude - ascendant)) * Math.PI) / 180;
    return [radius * Math.cos(angleRad), radius * Math.sin(angleRad)];
  };

  return (
    <svg
      ref={svgRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(e) => endGesture(e, true)}
      onPointerCancel={(e) => endGesture(e, false)}
      onDoubleClick={onReturn}
      viewBox="-515 -515 1030 1030"
      className="block h-full w-full cursor-grab touch-none"
    >
      {/* ASC and MC lines */}
      <defs>
        <marker
          id="arrow"
          viewBox="0 0 10 10"
          refX={8}
          refY={5}
          markerWidth={9}
          markerHeight={9}
          orient="auto-start-reverse"
        >
          <path
            d="M0 1.5 L9 5 L0 8.5"
            fill="none"
            stroke="#4a3826"
            strokeWidth={1.1}
          />
        </marker>
      </defs>

      {/* Circle */}
      {/* Outside ring */}
      {/* <circle r={497} fill="none" stroke="#4a3826" strokeWidth={0.6} /> */}
      {/* The heavy outer line */}
      {/* <circle r={491} fill="none" stroke="#4a3826" strokeWidth={1.7} /> */}
      {/* Sign band outer */}
      <circle r={478} fill="none" stroke="#4a3826" strokeWidth={0.8} />
      {/* Sign band inner / tick outer */}
      <circle r={418} fill="none" stroke="#4a3826" strokeWidth={0.8} />
      {/* Tick inner */}
      <circle r={402} fill="none" stroke="#4a3826" strokeWidth={0.5} />
      {/* House band inner */}
      <circle r={240} fill="none" stroke="#4a3826" strokeWidth={0.9} />
      {/* Center */}
      {/* <circle r={234} fill="none" stroke="#4a3826" strokeWidth={0.5} /> */}
      {/* <circle r={5.5} fill="none" stroke="#4a3826" strokeWidth={0.8} /> */}
      {/* <circle r={1.8} fill="#4a3826" /> */}

      {/* toggled off, the whole band (glyphs + separators) goes — the ring
          circles above stay, so the wheel keeps its silhouette */}
      {showSigns && <Zodiac polarPoint={polarPoint} colors={zodiacColors} />}
      <Ticks polarPoint={polarPoint} />
      <Houses
        polarPoint={polarPoint}
        cusps={chart.cusps}
        ascendant={ascendant}
        numerals={numerals}
      />
      <Aspects
        polarPoint={polarPoint}
        aspects={chart.aspects}
        selected={selected}
        selectedAspect={selectedAspect}
      />
      <Planets
        polarPoint={polarPoint}
        planets={chart.planets}
        colors={planetColors}
        selected={selected}
        related={related}
      />
    </svg>
  );
}
