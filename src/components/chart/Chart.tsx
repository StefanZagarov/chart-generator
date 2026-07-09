import type { Chart } from "../../types/";

// Drawing pictures in the form of circles and lines
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

const RN = [
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

export function Chart({ chart }: { chart: Chart }) {
  const asc = chart.asc;

  const P = (lon: number, r: number): [number, number] => {
    const a = ((180 - (lon - asc)) * Math.PI) / 180;
    return [r * Math.cos(a), r * Math.sin(a)];
  };

  let d1 = "";
  let d5 = "";
  let d10 = "";
  // Ticks
  for (let deg = 0; deg < 360; deg++) {
    const rIn = deg % 10 === 0 ? 402 : deg % 5 === 0 ? 407 : 411.5;
    const [x1, y1] = P(deg, rIn);
    const [x2, y2] = P(deg, 418);
    const seg = `M${x1} ${y1}L${x2} ${y2}`;

    if (deg % 10 == 0) d10 += seg;
    else if (deg % 5 === 0) d5 += seg;
    else d1 += seg;
  }

  // ASC
  const [ax1, ay1] = P(asc, 240);
  const [ax2, ay2] = P(asc, 402);
  // DESC
  const [dx1, dy1] = P(asc + 180, 240);
  const [dx2, dy2] = P(asc + 180, 402);

  return (
    <svg
      viewBox="-515 -515 1030 1030"
      className="block h-[88svh] aspect-square mx-auto"
    >
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

      {/* ASC — points outward, arrowhead at the outer end */}
      <line
        x1={ax1}
        y1={ay1}
        x2={ax2}
        y2={ay2}
        stroke="#4a3826"
        strokeWidth={1.7}
        markerEnd="url(#arrow)"
      />

      {/* DESC — same axis, opposite side, no arrow */}
      <line
        x1={dx1}
        y1={dy1}
        x2={dx2}
        y2={dy2}
        stroke="#4a3826"
        strokeWidth={1.7}
      />

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

      {/* Zodiac separators */}
      {Array.from({ length: 12 }, (_, i) => {
        const [x1, y1] = P(i * 30, 418);
        const [x2, y2] = P(i * 30, 478);
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={"#4a3826"}
            strokeWidth={0.7}
          />
        );
      })}

      {/* Zodiac signs */}
      {SIGN_GLYPHS.map((glyph, i) => {
        const lon = i * 30 + 15;
        const [x, y] = P(lon, 449);
        return (
          <text
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={33}
            fill="#4a3826"
          >
            {glyph}
          </text>
        );
      })}

      {/* Measurement lines */}
      <path d={d1} stroke="#4a3826" strokeWidth={0.45} fill="none" />
      <path d={d5} stroke="#4a3826" strokeWidth={0.7} fill="none" />
      <path d={d10} stroke="#4a3826" strokeWidth={1.1} fill="none" />

      {/* The twelve cusp lines */}
      {chart.cusps.map((lon, i) => {
        const angular = i === 0 || i === 3 || i === 6 || i === 9; // asc, ic, desc, mc
        const [x1, y1] = P(lon, 240);
        const [x2, y2] = P(lon, 402);

        const next = chart.cusps[(i + 1) % 12];
        let span = (((next - lon) % 360) + 360) % 360;
        if (span < 1) span = 30;
        const [nx, ny] = P(lon + span / 2, 258);

        return (
          <g key={i}>
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#4a3826"
              strokeWidth={angular ? 1.7 : 0.6}
              markerEnd={i === 0 || i === 9 ? "url(#arrow)" : undefined}
            />
            <text
              x={nx}
              y={ny}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={12.5}
              fontStyle="italic"
              fill="#8a7658"
            >
              {RN[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
