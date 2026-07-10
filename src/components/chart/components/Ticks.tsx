import type { Polar } from "../../../types/";

export function Ticks({ polarPoint }: { polarPoint: Polar }) {
  let minorTicksPath = ""; // every 1°
  let mediumTicksPath = ""; // every 5°
  let majorTicksPath = ""; // every 10°
  // Ticks
  for (let deg = 0; deg < 360; deg++) {
    const innerRadius = deg % 10 === 0 ? 402 : deg % 5 === 0 ? 407 : 411.5;
    const [innerX, innerY] = polarPoint(deg, innerRadius);
    const [outerX, outerY] = polarPoint(deg, 418);
    const segment = `M${innerX} ${innerY}L${outerX} ${outerY}`;

    if (deg % 10 == 0) majorTicksPath += segment;
    else if (deg % 5 === 0) mediumTicksPath += segment;
    else minorTicksPath += segment;
  }

  return (
    <g>
      {/* Measurement lines */}
      <path d={minorTicksPath} stroke="#4a3826" strokeWidth={0.45} fill="none" />
      <path d={mediumTicksPath} stroke="#4a3826" strokeWidth={0.7} fill="none" />
      <path d={majorTicksPath} stroke="#4a3826" strokeWidth={1.1} fill="none" />
    </g>
  );
}
