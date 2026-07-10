// ◀ label ▶ pairs that wind time by calendar units.
// Logic: fixed-length units (minute → week) are plain millisecond addition.
// Month and Year go through Date instead, because their length varies — "one
// month forward" from 31 Jan means 28 Feb-ish, and only the calendar knows;
// setUTCMonth handles the rollover rules for us.
const FIXED_MS: Record<string, number> = {
  Minute: 60_000,
  Hour: 3_600_000,
  Day: 86_400_000,
  Week: 604_800_000,
};

const UNITS = ["Minute", "Hour", "Day", "Week", "Month", "Year"];

export function WindTheClock({
  utcMs,
  onSetTime,
}: {
  utcMs: number;
  onSetTime: (ms: number) => void;
}) {
  const step = (unit: string, direction: 1 | -1) => {
    if (unit === "Month" || unit === "Year") {
      const d = new Date(utcMs);
      if (unit === "Month") d.setUTCMonth(d.getUTCMonth() + direction);
      else d.setUTCFullYear(d.getUTCFullYear() + direction);
      onSetTime(d.getTime());
    } else {
      onSetTime(utcMs + direction * FIXED_MS[unit]);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-1.5">
      {UNITS.map((unit) => (
        <div
          key={unit}
          className="flex items-stretch border border-gold bg-cream/35"
        >
          <button
            onClick={() => step(unit, -1)}
            title={`Back one ${unit.toLowerCase()}`}
            className="flex-none w-[30px] border-r border-gold/50 text-umber text-xs py-1.5 cursor-pointer hover:bg-ink hover:text-parchment-100 transition-colors"
          >
            ◀
          </button>
          <div className="flex-1 text-center text-[13px] tracking-[0.08em] py-1.5">
            {unit}
          </div>
          <button
            onClick={() => step(unit, 1)}
            title={`Forward one ${unit.toLowerCase()}`}
            className="flex-none w-[30px] border-l border-gold/50 text-umber text-xs py-1.5 cursor-pointer hover:bg-ink hover:text-parchment-100 transition-colors"
          >
            ▶
          </button>
        </div>
      ))}
    </div>
  );
}
