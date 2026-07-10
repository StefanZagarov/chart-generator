import type { Polar } from "../../../types/";

const SIGN_GLYPHS = [
  "♈︎",
  "♉︎",
  "♊︎",
  "♋︎",
  "♌︎",
  "♍︎",
  "♎︎",
  "♏︎",
  "♐︎",
  "♑︎",
  "♒︎",
  "♓︎",
];

export function Zodiac({ polarPoint }: { polarPoint: Polar }) {
  return (
    <g>
      {/* Zodiac separators */}
      {Array.from({ length: 12 }, (_, signIndex) => {
        const [innerX, innerY] = polarPoint(signIndex * 30, 418);
        const [outerX, outerY] = polarPoint(signIndex * 30, 478);
        return (
          <line
            key={signIndex}
            x1={innerX}
            y1={innerY}
            x2={outerX}
            y2={outerY}
            stroke={"#4a3826"}
            strokeWidth={0.7}
          />
        );
      })}

      {/* Zodiac signs */}
      {SIGN_GLYPHS.map((glyph, signIndex) => {
        const signMidLon = signIndex * 30 + 15;
        const [glyphX, glyphY] = polarPoint(signMidLon, 449);
        return (
          <text
            key={glyph}
            x={glyphX}
            y={glyphY}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={33}
            fill="#4a3826"
          >
            {glyph}
          </text>
        );
      })}
    </g>
  );
}
