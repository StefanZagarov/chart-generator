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

// Optional per-sign colors (toggle in the options drawer), by classical element.
// A sign's element cycles every 4 signs: Aries=fire, Taurus=earth, Gemini=air,
// Cancer=water, then repeat — so element = signIndex % 4.
const ELEMENT_COLOR = [
  "#b32d14", // fire  — red
  "#1d8a44", // earth — green
  "#e0851f", // air   — orange
  "#1d4e89", // water — blue
];

export function Zodiac({
  polarPoint,
  colors,
}: {
  polarPoint: Polar;
  /** tint each sign glyph by its element instead of plain ink */
  colors: boolean;
}) {
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
            fill={colors ? ELEMENT_COLOR[signIndex % 4] : "#4a3826"}
          >
            {glyph}
          </text>
        );
      })}
    </g>
  );
}
