import { ROMAN_NUMERALS } from "../../chart/components/Houses";
import type { Planet } from "../../../types/";

// One row per body: glyph | name (+ ℞ when retrograde) | position | house numeral.
// Everything shown comes pre-formatted from the engine (posLabel, retro, house),
// so this list live-updates for free as the wheel is dragged through time.
// Logic: zero state, zero callbacks — yet it animates during a drag. It doesn't know
// it does: drag → setUtcMs → App re-renders → new chart → new planets array flows in →
// new rows. Same reason the wheel "rotates": everything is a pure function of utcMs,
// and this list is just another projection of it — the wheel projects the chart into
// polar coordinates, this projects it into rows.
export function PlanetList({ planets }: { planets: Planet[] }) {
  return (
    <div>
      {planets.map((planet) => (
        <div
          key={planet.name}
          className="grid grid-cols-[24px_1fr_auto_34px] gap-2 items-baseline px-1 py-1 border-b border-umber/20 hover:bg-umber/5"
        >
          <span className="text-[17px]">{planet.glyph}</span>
          <span className="text-[14.5px]">
            {planet.name}{" "}
            {planet.retro && (
              <span className="text-rust text-[12px]">{"℞"}</span>
            )}
          </span>
          <span className="text-[14.5px]">{planet.posLabel}</span>
          <span className="text-[12.5px] italic text-bronze text-right">
            {ROMAN_NUMERALS[planet.house - 1]}
          </span>
        </div>
      ))}
    </div>
  );
}
