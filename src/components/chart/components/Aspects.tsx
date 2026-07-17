import type { Aspect, Polar } from "../../../types";

// Aspect family colors (exported: the side panel's toggle chips reuse them).
// Color now carries the family alone; line weight and dashing carry strength
// (see below), so the two members that share a color are told apart by their
// geometry — an opposition is a full diameter, a square a shorter chord; a
// trine spans wider than a sextile; and so on.
export const ASP_COLOR: Record<string, string> = {
  Conjunction: "#e0851f", // orange
  Opposition: "#b32d14", // red
  Square: "#b32d14", // red
  Trine: "#1d4e89", // blue
  Sextile: "#1d4e89", // blue
  Semisextile: "#1d8a44", // green
  Quincunx: "#1d8a44", // green
  Quintile: "#00b8d9", // light neon blue
  Biquintile: "#00b8d9", // light neon blue
};

// Strength encoding, from the aspect's orb (degrees off exact) measured against
// the orb it was allowed (maxOrb — wider for luminaries):
//   exact  (< 1° off)          → thick solid, it's a real hit
//   partile-ish → edge         → a plain thin solid line in the middle
//   near the edge of the orb    → thin dotted, it barely qualifies
const EXACT = 1; // degrees: under this, the aspect is "exact"
const EDGE_RATIO = 0.8; // orb/maxOrb at/above which it's "on the edge"

function strokeFor(aspect: Aspect): { width: number; dash: string } {
  if (aspect.orb < EXACT) return { width: 2.8, dash: "" }; // thick
  const ratio = aspect.maxOrb > 0 ? aspect.orb / aspect.maxOrb : 0;
  if (ratio >= EDGE_RATIO) return { width: 1, dash: "1.5 3.5" }; // dotted
  return { width: 1, dash: "" }; // thin
}

// Logic: each aspect is a chord across the inner circle between the two planets'
// rays at radius 237 (3px inside the r-240 ring so the ends tuck under the
// planet dots). A conjunction is a short chord near the rim (its planets sit
// within the conjunction orb of each other), drawn like any other.
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
        const color = ASP_COLOR[aspect.type];
        if (!color) return null;

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

        const { width, dash } = strokeFor(aspect);

        return (
          // data-aspect is what Chart's tap detection looks for via closest()
          <g key={key} data-aspect={key} className="cursor-pointer">
            <line
              x1={fromX}
              y1={fromY}
              x2={toX}
              y2={toY}
              stroke={color}
              strokeWidth={involved ? width + 0.8 : width}
              strokeDasharray={dash}
              // round caps: dotted edges read as dots, and a partile
              // conjunction (near-zero-length chord) still shows as a dot
              strokeLinecap="round"
              opacity={dimming ? (involved ? 0.95 : 0.08) : 0.65}
              className="transition-opacity duration-300"
            />
            {/* invisible fat twin: a 1px line is unclickable, so this
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
