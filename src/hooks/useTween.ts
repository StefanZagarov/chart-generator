import { useEffect, useRef } from "react";

// Animates a number from → to, calling onFrame with the in-between values.
// Logic: each animation frame computes progress k (0 → 1), runs it through an
// ease-out cubic (fast start, gentle landing — the wheel "coasts home"), and
// reports the interpolated value. Starting a new tween cancels the previous
// one, and unmounting cancels whatever is running (the useEffect cleanup), so
// a stale frame can never write into a dead component.
export function useTween(onFrame: (value: number) => void) {
  const rafId = useRef(0);

  useEffect(() => () => cancelAnimationFrame(rafId.current), []);

  const cancel = () => cancelAnimationFrame(rafId.current);

  const start = (from: number, to: number, durationMs: number) => {
    cancel();
    const t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / durationMs);
      const eased = 1 - Math.pow(1 - k, 3);
      onFrame(from + (to - from) * eased);
      if (k < 1) rafId.current = requestAnimationFrame(step);
    };
    rafId.current = requestAnimationFrame(step);
  };

  return { start, cancel };
}
