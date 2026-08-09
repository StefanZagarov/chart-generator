import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { ComponentProps, ReactNode } from "react";
import { Chart } from "./Chart";

type ChartProps = ComponentProps<typeof Chart>;
type ChartViewportProps = Omit<ChartProps, "interactionMode" | "onPan"> & {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  actions: ReactNode;
};

const MIN_WHEEL_SIZE = 680;
const MIN_ZOOM = 70;
const MAX_ZOOM = 200;
const ZOOM_STEP = 10;

const railButton =
  "border border-gold bg-cream/35 px-3 py-1 text-[10px] tracking-[0.2em] uppercase text-bronze hover:border-ink hover:text-ink disabled:opacity-35 disabled:cursor-default cursor-pointer transition-colors motion-reduce:transition-none";
const activeRailButton = "bg-ink text-parchment-100 border-ink";

export function ChartViewport({
  sidebarOpen,
  onToggleSidebar,
  actions,
  ...chartProps
}: ChartViewportProps) {
  const [zoom, setZoom] = useState(100);
  const [mode, setMode] = useState<"rotate" | "pan">("rotate");
  const [baseSize, setBaseSize] = useState(MIN_WHEEL_SIZE);
  const viewportRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<{ x: number; y: number } | null>(null);

  const rememberCenter = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport || !viewport.scrollWidth || !viewport.scrollHeight) return;
    centerRef.current = {
      x:
        (viewport.scrollLeft + viewport.clientWidth / 2) /
        viewport.scrollWidth,
      y:
        (viewport.scrollTop + viewport.clientHeight / 2) /
        viewport.scrollHeight,
    };
  }, []);

  // The wheel's 100% size follows the smaller viewport dimension, but never
  // falls below the legibility floor. Record the viewed center before resizing.
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const observer = new ResizeObserver(() => {
      rememberCenter();
      const next = Math.max(
        MIN_WHEEL_SIZE,
        Math.min(viewport.clientWidth, viewport.clientHeight),
      );
      setBaseSize((current) => (current === next ? current : next));
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [rememberCenter]);

  // Apply the stored normalized center after React lays out a new wheel size.
  // On first render there is no stored view, so start at the wheel's center.
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const center = centerRef.current ?? { x: 0.5, y: 0.5 };
    viewport.scrollLeft =
      center.x * viewport.scrollWidth - viewport.clientWidth / 2;
    viewport.scrollTop =
      center.y * viewport.scrollHeight - viewport.clientHeight / 2;
  }, [baseSize, zoom]);

  // Pan is a responsive explicit mode. Returning to desktop restores the
  // desktop contract: ordinary drag rotates and Shift+drag pans temporarily.
  useEffect(() => {
    const responsive = window.matchMedia("(max-width: 1000px)");
    const restoreDesktopMode = () => {
      if (!responsive.matches) setMode("rotate");
    };
    responsive.addEventListener("change", restoreDesktopMode);
    return () => responsive.removeEventListener("change", restoreDesktopMode);
  }, []);

  const changeZoom = (next: number) => {
    rememberCenter();
    setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next)));
  };

  const pan = (deltaX: number, deltaY: number) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.scrollLeft -= deltaX;
    viewport.scrollTop -= deltaY;
  };

  const wheelSize = baseSize * (zoom / 100);

  return (
    <section className="flex-1 min-h-0 min-w-0 flex flex-col">
      <div className="flex-none flex flex-wrap items-center gap-x-4 gap-y-2 pb-2 border-b border-gold/45">
        <button
          type="button"
          aria-expanded={sidebarOpen}
          aria-controls="chart-data-panel"
          onClick={onToggleSidebar}
          className={`${railButton} hidden max-[1000px]:inline-flex`}
        >
          Chart data
        </button>

        <div className="flex flex-1 min-w-0 items-start gap-4">{actions}</div>

        <div className="ml-auto flex items-center gap-3 max-[1000px]:basis-full max-[1000px]:justify-between">
          <div
            role="group"
            aria-label="Chart drag mode"
            className="hidden max-[1000px]:flex"
          >
            <button
              type="button"
              aria-pressed={mode === "rotate"}
              onClick={() => setMode("rotate")}
              className={`${railButton} border-r-0 ${
                mode === "rotate" ? activeRailButton : ""
              }`}
            >
              Rotate
            </button>
            <button
              type="button"
              aria-pressed={mode === "pan"}
              onClick={() => setMode("pan")}
              className={`${railButton} ${
                mode === "pan" ? activeRailButton : ""
              }`}
            >
              Pan
            </button>
          </div>

          <div role="group" aria-label="Chart zoom" className="flex">
            <button
              type="button"
              aria-label="Zoom out"
              disabled={zoom === MIN_ZOOM}
              onClick={() => changeZoom(zoom - ZOOM_STEP)}
              className={`${railButton} border-r-0 px-2.5 text-[14px] leading-none`}
            >
              −
            </button>
            <button
              type="button"
              aria-label="Reset zoom"
              onClick={() => changeZoom(100)}
              className={`${railButton} border-r-0 w-[58px] px-1 tracking-[0.08em]`}
            >
              {zoom}%
            </button>
            <button
              type="button"
              aria-label="Zoom in"
              disabled={zoom === MAX_ZOOM}
              onClick={() => changeZoom(zoom + ZOOM_STEP)}
              className={`${railButton} px-2.5 text-[14px] leading-none`}
            >
              +
            </button>
          </div>
        </div>
      </div>

      <div
        ref={viewportRef}
        className="chart-viewport flex-1 min-h-0 min-w-0 overflow-auto max-[1000px]:h-[calc(100svh-9rem)] max-[1000px]:min-h-[420px] max-[1000px]:flex-none"
      >
        <div
          className="grid min-w-full min-h-full place-items-center"
          style={{ width: wheelSize, height: wheelSize }}
        >
          <div style={{ width: wheelSize, height: wheelSize }}>
            <Chart
              {...chartProps}
              interactionMode={mode}
              onPan={pan}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
