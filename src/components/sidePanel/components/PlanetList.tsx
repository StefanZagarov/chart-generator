import { houseLabel } from "../../chart/components/Houses";
import type { Numerals, Planet } from "../../../types/";

// One row per body: glyph | name (+ ℞ when retrograde) | position | house numeral.
// Everything shown comes pre-formatted from the engine (posLabel, retro, house),
// so this list live-updates for free as the wheel is dragged through time.
// Logic: zero state, zero callbacks — yet it animates during a drag. It doesn't know
// it does: drag → setUtcMs → App re-renders → new chart → new planets array flows in →
// new rows. Same reason the wheel "rotates": everything is a pure function of utcMs,
// and this list is just another projection of it — the wheel projects the chart into
// polar coordinates, this projects it into rows.
export function PlanetList({
  planets,
  ascLabel,
  mcLabel,
  numerals,
  selected,
  onSelect,
}: {
  planets: Planet[];
  ascLabel: string;
  mcLabel: string;
  numerals: Numerals;
  selected: string | null;
  onSelect: (name: string | null) => void;
}) {
  return (
    <div>
      {/* The two angles first — not planets, but they live on the same wheel:
          ascLabel/mcLabel come pre-formatted from the engine like posLabel does.
          Their houses are definitional (ASC begins house I, MC begins house X). */}
      {[
        { key: "Ascendant", short: "Asc", label: ascLabel, house: houseLabel(0, numerals) },
        { key: "Midheaven", short: "MC", label: mcLabel, house: houseLabel(9, numerals) },
      ].map((angle) => (
        <div
          key={angle.key}
          className="grid grid-cols-[24px_1fr_auto_34px] gap-2 items-baseline px-1 py-1 border-b border-umber/20 hover:bg-umber/5"
        >
          <span className="text-[11px] tracking-wide text-bronze">
            {angle.short}
          </span>
          <span className="text-[14.5px]">{angle.key}</span>
          <span className="text-[14.5px]">{angle.label}</span>
          <span className="text-[12.5px] italic text-bronze text-right">
            {angle.house}
          </span>
        </div>
      ))}

      {/* Rows are the same selection surface as the wheel's glyphs: clicking one
          toggles that planet, and the selected row gets a faint rust wash */}
      {planets.map((planet) => (
        <div
          key={planet.name}
          onClick={() => onSelect(planet.name)}
          className={`grid grid-cols-[24px_1fr_auto_34px] gap-2 items-baseline px-1 py-1 border-b border-umber/20 cursor-pointer hover:bg-umber/5 ${
            selected === planet.name ? "bg-rust/10" : ""
          }`}
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
            {houseLabel(planet.house - 1, numerals)}
          </span>
        </div>
      ))}
    </div>
  );
}
