import type { Numerals, Polar } from "../../../types/";

const ROMAN_NUMERALS = [
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
  "X",
  "XI",
  "XII",
];

// The one home of house-number formatting — the wheel and the side panel's
// planet list both call this, so the roman/arabic toggle can't half-apply.
// Takes the 0-based house INDEX (callers with 1-based `planet.house` pass -1).
export const houseLabel = (index: number, numerals: Numerals) =>
  numerals === "roman" ? ROMAN_NUMERALS[index] : String(index + 1);

export function Houses({
  polarPoint,
  cusps,
  ascendant,
  numerals,
}: {
  polarPoint: Polar;
  cusps: number[];
  ascendant: number;
  numerals: Numerals;
}) {
  // ASC
  const [ascInnerX, ascInnerY] = polarPoint(ascendant, 240);
  const [ascOuterX, ascOuterY] = polarPoint(ascendant, 402);
  // DESC
  const [descInnerX, descInnerY] = polarPoint(ascendant + 180, 240);
  const [descOuterX, descOuterY] = polarPoint(ascendant + 180, 402);

  return (
    <g>
      {/* ASC — points outward, arrowhead at the outer end */}
      <line
        x1={ascInnerX}
        y1={ascInnerY}
        x2={ascOuterX}
        y2={ascOuterY}
        stroke="#4a3826"
        strokeWidth={1.7}
        markerEnd="url(#arrow)"
      />

      {/* DESC — same axis, opposite side, no arrow */}
      <line
        x1={descInnerX}
        y1={descInnerY}
        x2={descOuterX}
        y2={descOuterY}
        stroke="#4a3826"
        strokeWidth={1.7}
      />

      {/* The twelve cusp lines */}
      {cusps.map((cuspLon, houseIndex) => {
        // asc, ic, desc, mc
        const isAngular =
          houseIndex === 0 ||
          houseIndex === 3 ||
          houseIndex === 6 ||
          houseIndex === 9;
        const [innerX, innerY] = polarPoint(cuspLon, 240);
        const [outerX, outerY] = polarPoint(cuspLon, 402);

        const nextCuspLon = cusps[(houseIndex + 1) % 12];
        let houseSpan = (((nextCuspLon - cuspLon) % 360) + 360) % 360;
        if (houseSpan < 1) houseSpan = 30;
        const [numeralX, numeralY] = polarPoint(cuspLon + houseSpan / 2, 258);

        return (
          <g key={houseIndex}>
            <line
              x1={innerX}
              y1={innerY}
              x2={outerX}
              y2={outerY}
              stroke="#4a3826"
              strokeWidth={isAngular ? 1.7 : 0.6}
              markerEnd={
                houseIndex === 0 || houseIndex === 9 ? "url(#arrow)" : undefined
              }
            />
            <text
              x={numeralX}
              y={numeralY}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={12.5}
              fontStyle="italic"
              fill="#8a7658"
            >
              {houseLabel(houseIndex, numerals)}
            </text>
          </g>
        );
      })}
    </g>
  );
}
