import type { Aspect, Polar } from "../../../types";

// Color for the aspects (exported: the side panel's toggle chips reuse it)
export const ASP_STYLE: Record<string, { color: string; dash: string }> = {
  Opposition: { color: "#b32d14", dash: "" },
  // dashed to tell it apart from Opposition (same family red; oppositions are
  // full diameters, squares shorter chords — the dash removes any doubt)
  Square: { color: "#b32d14", dash: "6 4" },
  Trine: { color: "#1d4e89", dash: "" },
  Sextile: { color: "#1d4e89", dash: "5 5" },
  Semisextile: { color: "#1d8a44", dash: "3 4" },
  // solid: the stronger of the two green minors, like Trine vs Sextile in blue
  Quincunx: { color: "#1d8a44", dash: "" },
  Quintile: { color: "#00b8d9", dash: "2 3" },
  Biquintile: { color: "#00b8d9", dash: "7 3" },
};

// Logic: Each aspect is a chord across the inner circle between the two planets' rays at radius 237 (3px inside the r-240 ring so the ends tuck under the planet dots). Color says the aspect family. The width encodes strength: orb is degrees-from-exact, so tightness runs 1 (exact) → 0 (barely counts), and squaring it makes exact aspects bold (~3.2px) while weak ones stay hairline. Conjunctions draw nothing — their two endpoints coincide.
export function Aspects({
  polarPoint,
  aspects,
  selected,
  selectedAspect,
}: {
  polarPoint: Polar;
  aspects: Aspect[];
  selected: string | null;
  /** "p1|p2" key of a clicked line, or null */
  selectedAspect: string | null;
}) {
  return (
    <g>
      {aspects.map((aspect) => {
        const style = ASP_STYLE[aspect.type];
        if (!style) return null; // Conjunction: both ends are the same point, nothing to draw

        const key = aspect.p1 + "|" + aspect.p2;
        const [fromX, fromY] = polarPoint(aspect.lon1, 237); // one planet's spot on the inner circle
        const [toX, toY] = polarPoint(aspect.lon2, 237); // the other planet's spot

        // Selection dimming: a clicked line highlights exactly itself; a selected
        // planet highlights all of its chords. Either way the involved lines pop
        // to near-full opacity (and gain a little width) while every unrelated
        // chord recedes to a ghost; with nothing selected, all sit at 0.65
        const involved = selectedAspect
          ? key === selectedAspect
          : selected !== null &&
            (aspect.p1 === selected || aspect.p2 === selected);
        const dimming = selectedAspect !== null || selected !== null;

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
          // data-aspect is what Chart's tap detection looks for via closest()
          <g key={key} data-aspect={key} className="cursor-pointer">
            <line
              x1={fromX}
              y1={fromY}
              x2={toX}
              y2={toY}
              stroke={style.color}
              strokeWidth={involved ? lineWidth + 0.8 : lineWidth}
              strokeDasharray={style.dash}
              opacity={dimming ? (involved ? 0.95 : 0.08) : 0.65}
              className="transition-opacity duration-300"
            />
            {/* invisible fat twin: a 0.6px hairline is unclickable, so this
                10px transparent stroke is the actual tap target */}
            <line
              x1={fromX}
              y1={fromY}
              x2={toX}
              y2={toY}
              stroke="rgba(0,0,0,0)"
              strokeWidth={10}
            />
          </g>
        );
      })}
    </g>
  );
}
