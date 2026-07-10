import { ROMAN_NUMERALS } from "../../chart/components/Houses";
import type { Aspect, Planet } from "../../../types/";

// Detail card for the selected planet: name line, position line, then one row
// per aspect it makes — the same data the wheel is highlighting at this moment,
// in words (g1/g2 are the two planets' glyphs, orbLabel the distance from exact).
export function SelectedCard({
  planet,
  aspects,
}: {
  planet: Planet;
  aspects: Aspect[];
}) {
  return (
    <div className="border border-gold bg-cream/50 px-3.5 py-3">
      <div className="font-fell text-[19px]">
        {planet.glyph} {planet.name}
        {planet.retro && <span className="text-rust text-sm"> ℞</span>}
      </div>
      <div className="italic text-umber text-sm mt-0.5 mb-2">
        In {planet.signName} · House {ROMAN_NUMERALS[planet.house - 1]} ·{" "}
        {planet.degLabel}
      </div>
      {/* One row per aspect: the aspect's own glyph (☌, □, △…), its name, then
          the OTHER planet — the engine gives p1/p2 in fixed order, so figure out
          which side the selected planet is on and show the opposite one */}
      {aspects.map((aspect) => {
        const partnerName =
          aspect.p1 === planet.name ? aspect.p2 : aspect.p1;
        const partnerGlyph =
          aspect.p1 === planet.name ? aspect.g2 : aspect.g1;
        return (
          <div
            key={aspect.p1 + aspect.p2}
            className="flex justify-between gap-2 text-sm py-0.5 border-t border-gold/35"
          >
            <span>
              {aspect.glyph} {aspect.type} — {partnerGlyph} {partnerName}
            </span>
            <span className="text-bronze">orb {aspect.orbLabel}</span>
          </div>
        );
      })}
      {aspects.length === 0 && (
        <div className="italic text-[13px] text-bronze">No major aspects.</div>
      )}
    </div>
  );
}
