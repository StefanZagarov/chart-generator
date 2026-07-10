import type { Planet, Polar } from "../../../types/";

export function Planets({
  polarPoint,
  planets,
}: {
  polarPoint: Polar;
  planets: Planet[];
}) {
  // Planet position logic
  // Logic: Sort planets by longitude, walk them in order; each starts at level 0, but if it sits less than 8.5° after the previous one, it takes the previous level + 1 (wrapping 2 → 0). previousLon = -999 is just "no previous planet yet" for the first iteration. Result: stackLevel["Sun"] etc. → 0, 1, or 2, used as glyphRadius = 374 - stackLevel[planet.name] * 48
  const sortedByLon = [...planets].sort((a, b) => a.lon - b.lon);
  const stackLevel: Record<string, number> = {};
  let previousLon = -999;
  let previousLevel = 0;
  for (const planet of sortedByLon) {
    let level = 0;
    if (previousLon > -900 && planet.lon - previousLon < 8.5)
      level = (previousLevel + 1) % 3;
    stackLevel[planet.name] = level;
    previousLon = planet.lon;
    previousLevel = level;
  }

  // Logic: For each of the 11 bodies, pick its ring depth from the stacking map (374 / 326 / 278), convert its zodiac longitude to screen x,y with the same polarPoint() everything else uses, and drop its glyph there, centered — exactly like the sign glyphs, just at a chart-dependent angle instead of i*30+15.
  return (
    <g>
      {planets.map((planet) => {
        const glyphRadius = 374 - stackLevel[planet.name] * 48; // level 0/1/2 → 374/326/278
        const [glyphX, glyphY] = polarPoint(planet.lon, glyphRadius);
        const [markerInnerX, markerInnerY] = polarPoint(planet.lon, 402); // marker: inner edge of tick band
        const [markerOuterX, markerOuterY] = polarPoint(planet.lon, 418); // marker: outer edge
        const [guideStartX, guideStartY] = polarPoint(
          planet.lon,
          glyphRadius + 16,
        ); // guide: just above the glyph
        const [guideEndX, guideEndY] = polarPoint(planet.lon, 398); // guide: up to the tick band
        const [dotX, dotY] = polarPoint(planet.lon, 240); // dot on the aspect circle
        const [labelX, labelY] = polarPoint(planet.lon, glyphRadius - 26); // degree label below the glyph
        return (
          <g key={planet.name}>
            {/* Planet glyph */}
            <text
              x={glyphX}
              y={glyphY}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={30}
              fill="#4a3826"
            >
              {planet.glyph}
            </text>

            {/* Degree marker — rust stripe crossing the tick band */}
            {/* Logic: Every element sits on the same ray from the center at the planet's longitude, just at different radii — a solid rust stripe crossing the tick band (402→418) marks the exact degree; a faint dashed thread connects the glyph's neighborhood (glyphRadius+16) up to that band (398) so your eye can follow it when planets are stacked at different depths; the dot at 240 is where aspect lines will attach later; and the label (planet.degLabel, e.g. "24°12′") hangs 26px inside the glyph. */}
            <line
              x1={markerInnerX}
              y1={markerInnerY}
              x2={markerOuterX}
              y2={markerOuterY}
              stroke="#8f3b2c"
              strokeWidth={1.2}
            />
            {/* Dashed guide — ties the glyph to its degree marker */}
            <line
              x1={guideStartX}
              y1={guideStartY}
              x2={guideEndX}
              y2={guideEndY}
              stroke="#4a3826"
              strokeWidth={0.6}
              strokeDasharray="3 3"
              opacity={0.5}
            />
            {/* Dot on the aspect circle — where aspect lines will attach */}
            <circle cx={dotX} cy={dotY} r={2.3} fill="#4a3826" />
            {/* Degree label, e.g. "24°12′" */}
            <text
              x={labelX}
              y={labelY}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={12.5}
              fill="#6b573d"
            >
              {planet.degLabel}
            </text>

            {/* Retrograde mark */}
            {/* Logic: Only rendered when the engine flagged the planet retrograde — a small italic ℞ pinned to the glyph's upper-right corner, fixed offset in screen pixels rather than polar coords so it always sits the same way relative to the symbol. */}
            {planet.retro && (
              <text
                x={glyphX + 14}
                y={glyphY - 8}
                textAnchor="middle"
                fontSize={12}
                fontStyle="italic"
                fill="#8f3b2c"
              >
                {"℞"}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}
