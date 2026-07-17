import { coordLabel } from "../../engine/almanac";
import type { Chart, City, Numerals } from "../../types/";
import { CastForm } from "./components/CastForm";
import { AspectToggles } from "./components/AspectToggles";
import { WindTheClock } from "./components/WindTheClock";
import { SelectedCard } from "./components/SelectedCard";
import { PlanetList } from "./components/PlanetList";

// The side panel logic
// Logic: the panel owns no chart state at all — it's one more projection of the same chart the wheel draws, plus controls that report upward. State lives as low as possible but high enough that every reader sits below it: city and aspectsOff went to App (the wheel reads them), while the form's raw text strings stay inside CastForm (nothing outside cares what's typed, only what's cast). SidePanel itself is pure composition, like Chart.tsx: it computes one derived string (the tz label — offsetLabel needs utcMs because a city's UTC offset changes with DST) and passes each child its slice.

// A horizontal rule with a small-caps label in the middle: ——— ASPECTS ———
// (too small for its own file, used three times, so it lives where it's used)
function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex-1 border-t border-gold" />
      <div className="text-[10.5px] tracking-[0.3em] text-bronze">{label}</div>
      <div className="flex-1 border-t border-gold" />
    </div>
  );
}

export function SidePanel({
  chart,
  utcMs,
  castMs,
  city,
  aspectsOff,
  numerals,
  planetColors,
  selected,
  onCast,
  onToggleAspect,
  onSelect,
  onSetTime,
}: {
  chart: Chart;
  utcMs: number;
  /** the anchor the form displays — also its remount key, see CastForm */
  castMs: number;
  city: City;
  aspectsOff: Record<string, boolean>;
  numerals: Numerals;
  planetColors: boolean;
  selected: string | null;
  onCast: (utcMs: number, city: City) => void;
  onToggleAspect: (type: string) => void;
  onSelect: (name: string | null) => void;
  onSetTime: (ms: number) => void;
}) {
  // the selected planet's full record + the aspects it participates in —
  // derived here so SelectedCard stays a dumb display component
  const selectedPlanet = selected
    ? chart.planets.find((p) => p.name === selected)
    : undefined;
  const selectedAspects = selected
    ? chart.aspects.filter((a) => a.p1 === selected || a.p2 === selected)
    : [];
  return (
    <aside className="flex-none w-[332px] h-full overflow-y-auto border-r-[3px] border-double border-gold px-6 pt-6 pb-4 flex flex-col gap-4">
      {/* Header */}
      <div className="text-center">
        <div className="text-xs tracking-[0.5em] text-bronze">✦ ✦ ✦</div>
        <h1 className="font-fell font-normal text-[31px] mt-1.5 mb-0.5 tracking-[0.02em]">
          Natal Chart
        </h1>
        <div className="text-[11px] tracking-[0.34em] uppercase text-bronze">
          Horoscopium
        </div>
        {/* double rule: two 1px gold lines 5px apart */}
        <div className="border-t border-b border-gold h-[5px] mt-3" />
      </div>

      {/* the key is the reset mechanism: casting, Now, or loading a saved chart
          all move castMs (or city) → new key → remount → field initializers
          re-run against the new anchor. Typing changes neither, so the form is
          never reset under the user's hands. */}
      <CastForm
        key={`${castMs}-${city.label}`}
        city={city}
        initialMs={castMs}
        coordsLabel={coordLabel(city.lat, city.lon)}
        onCast={onCast}
      />

      <Divider label="ASPECTS" />
      <AspectToggles aspectsOff={aspectsOff} onToggle={onToggleAspect} />

      <Divider label="WIND THE CLOCK" />
      <WindTheClock utcMs={utcMs} onSetTime={onSetTime} />

      {selectedPlanet && (
        <SelectedCard
          planet={selectedPlanet}
          aspects={selectedAspects}
          numerals={numerals}
        />
      )}

      <Divider label="PLANETS" />
      <PlanetList
        planets={chart.planets}
        ascLabel={chart.ascLabel}
        mcLabel={chart.mcLabel}
        numerals={numerals}
        planetColors={planetColors}
        selected={selected}
        onSelect={onSelect}
      />
    </aside>
  );
}
