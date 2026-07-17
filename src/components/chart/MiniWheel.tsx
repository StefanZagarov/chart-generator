import { computeChart } from "../../engine/swiss";
import { Zodiac } from "./components/Zodiac";
import { Ticks } from "./components/Ticks";
import { Houses } from "./components/Houses";
import { Planets } from "./components/Planets";
import { Aspects } from "./components/Aspects";
import type { Numerals, Polar, SavedChart } from "../../types/";

/** A saved chart as a picture: the real wheel, computed from the save's own
 * data, minus every interaction — no drag, no selection, no handlers. It reuses
 * the same presentational components the live wheel uses, so a saved chart's
 * box always looks exactly like what loading it will show. Cheap enough to
 * render a gallery of them: one computeChart is ~0.3 ms. Also serialized to
 * markup at save time (lib/wheelImage) to become the save's cached image. */
export function MiniWheel({
  saved,
  numerals,
}: {
  /** only the cast fields — callers may not have a full SavedChart yet */
  saved: Pick<SavedChart, "castMs" | "city" | "houseSystem">;
  numerals: Numerals;
}) {
  const chart = computeChart(
    saved.castMs,
    saved.city.lat,
    saved.city.lon,
    saved.houseSystem,
  );
  const polarPoint: Polar = (longitude, radius) => {
    const angleRad = ((180 - (longitude - chart.asc)) * Math.PI) / 180;
    return [radius * Math.cos(angleRad), radius * Math.sin(angleRad)];
  };

  return (
    <svg viewBox="-515 -515 1030 1030" className="block w-full aspect-square">
      {/* Houses' ASC/MC arrowheads reference #arrow — an SVG resolves marker
          ids inside itself, so each MiniWheel carries its own copy.
          React scopes nothing here; duplicate ids across svgs are fine. */}
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
      <circle r={478} fill="none" stroke="#4a3826" strokeWidth={0.8} />
      <circle r={418} fill="none" stroke="#4a3826" strokeWidth={0.8} />
      <circle r={402} fill="none" stroke="#4a3826" strokeWidth={0.5} />
      <circle r={240} fill="none" stroke="#4a3826" strokeWidth={0.9} />
      <Zodiac polarPoint={polarPoint} colors={false} />
      <Ticks polarPoint={polarPoint} />
      <Houses
        polarPoint={polarPoint}
        cusps={chart.cusps}
        ascendant={chart.asc}
        numerals={numerals}
      />
      <Aspects
        polarPoint={polarPoint}
        aspects={chart.aspects}
        selected={null}
        selectedAspect={null}
      />
      <Planets
        polarPoint={polarPoint}
        planets={chart.planets}
        colors={false}
        selected={null}
        related={null}
      />
    </svg>
  );
}
