import { ASP_STYLE } from "../../chart/components/Aspects";

// One chip per aspect type, colored like its lines on the wheel. Clicking a chip
// toggles that type off/on; an off chip renders faded and struck through, and the
// wheel stops drawing those chords (App filters them out of the chart it passes down).
// Logic: this component hides nothing itself — it reports "the user clicked Square"
// upward, exactly like Chart's onScrub reports degrees without knowing about time.
// The hiding happens in App's chartView filter; the wheel's Aspects component is
// completely unaware toggles exist, and the panel's planet/aspect data reads the
// unfiltered chart — hiding lines never hides information.
export function AspectToggles({
  aspectsOff,
  onToggle,
}: {
  aspectsOff: Record<string, boolean>;
  onToggle: (type: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {Object.entries(ASP_STYLE).map(([type, style]) => {
        const off = aspectsOff[type];
        return (
          <button
            key={type}
            onClick={() => onToggle(type)}
            style={{
              borderColor: off ? "#a5906c" : style.color,
              color: off ? "#a5906c" : style.color,
            }}
            className={`flex items-center gap-1.5 border bg-cream/35 px-2 py-1 text-[11px] tracking-[0.06em] cursor-pointer ${
              off ? "opacity-50 line-through" : ""
            }`}
          >
            {/* little line swatch matching the chord's color */}
            <span
              className="inline-block w-3.5 border-t-2"
              style={{ borderColor: off ? "#a5906c" : style.color }}
            />
            {type}
          </button>
        );
      })}
    </div>
  );
}
