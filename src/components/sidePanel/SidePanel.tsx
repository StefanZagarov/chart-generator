import { offsetLabel } from "../../engine/ephemeris";
import type { Chart, City } from "../../types/";
import { CastForm } from "./components/CastForm";
import { AspectToggles } from "./components/AspectToggles";
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
  city,
  aspectsOff,
  onCast,
  onToggleAspect,
}: {
  chart: Chart;
  utcMs: number;
  city: City;
  aspectsOff: Record<string, boolean>;
  onCast: (utcMs: number, city: City) => void;
  onToggleAspect: (type: string) => void;
}) {
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

      <CastForm
        city={city}
        tzLabel={`${city.tz} · ${offsetLabel(city.tz, utcMs)}`}
        onCast={onCast}
      />

      <Divider label="ASPECTS" />
      <AspectToggles aspectsOff={aspectsOff} onToggle={onToggleAspect} />

      <Divider label="PLANETS" />
      <PlanetList planets={chart.planets} />
    </aside>
  );
}
