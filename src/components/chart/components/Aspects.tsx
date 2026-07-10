import type { Aspect, Polar } from "../../../types";

// Color for the aspects (exported: the side panel's toggle chips reuse it)
export const ASP_STYLE: Record<string, { color: string; dash: string }> = {
  Opposition: { color: "#b32d14", dash: "" },
  Square: { color: "#b32d14", dash: "" },
  Trine: { color: "#1d4e89", dash: "" },
  Sextile: { color: "#1d4e89", dash: "5 5" },
  Semisextile: { color: "#1d8a44", dash: "3 4" },
  Quincunx: { color: "#1d8a44", dash: "8 4" },
  Quintile: { color: "#00b8d9", dash: "2 3" },
  Biquintile: { color: "#00b8d9", dash: "7 3" },
};

// Logic: Each aspect is a chord across the inner circle between the two planets' rays at radius 237 (3px inside the r-240 ring so the ends tuck under the planet dots). Color says the aspect family. The width encodes strength: orb is degrees-from-exact, so tightness runs 1 (exact) → 0 (barely counts), and squaring it makes exact aspects bold (~3.2px) while weak ones stay hairline. Conjunctions draw nothing — their two endpoints coincide.
export function Aspects({
  polarPoint,
  aspects,
}: {
  polarPoint: Polar;
  aspects: Aspect[];
}) {
  return (
    <g>
      {aspects.map((aspect) => {
        const style = ASP_STYLE[aspect.type];
        if (!style) return null; // Conjunction: both ends are the same point, nothing to draw

        const [fromX, fromY] = polarPoint(aspect.lon1, 237); // one planet's spot on the inner circle
        const [toX, toY] = polarPoint(aspect.lon2, 237); // the other planet's spot

        // Chord thin/wide logic — tighter orb = stronger aspect = fatter line.
        // orb is degrees-from-exact (0 = perfect aspect, ~8 = barely counts), so
        // 1 - orb/8 flips it into tightness: 1 at exact, falling to 0 at max orb
        // (Math.max clamps the rare orb > 8 to 0 instead of going negative).
        const tightness = Math.max(0, 1 - aspect.orb / 8);
        // Width = hairline base 0.6px + up to 2.6px of bonus. Squaring tightness
        // makes the bonus drop fast: exact ≈ 3.2px, half-tight ≈ 1.25px, weak ≈ 0.6px —
        // so only genuinely close aspects stand out instead of everything looking mid.
        const lineWidth = 0.6 + tightness * tightness * 2.6;

        return (
          <line
            key={aspect.p1 + aspect.p2}
            x1={fromX}
            y1={fromY}
            x2={toX}
            y2={toY}
            stroke={style.color}
            strokeWidth={lineWidth}
            strokeDasharray={style.dash}
            opacity={0.65}
          />
        );
      })}
    </g>
  );
}
