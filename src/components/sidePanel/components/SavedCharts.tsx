import { useState } from "react";
import { prettyDate, wallClock } from "../../../engine/almanac";
import type { SavedChart } from "../../../types/";

/** The saved-charts shelf: name the current moment, keep it, click it back.
 * Logic: this component owns only the name being typed — the list itself lives
 * in App (filled from the vault), because loading a chart has to reach the same
 * state onCast reaches, and only App holds that. Rows follow PlanetList's
 * grammar: the whole row is the click surface, the ✕ opts out via
 * stopPropagation so deleting never also loads. */
export function SavedCharts({
  charts,
  onSave,
  onLoad,
  onDelete,
}: {
  charts: SavedChart[];
  onSave: (name: string) => void;
  onLoad: (chart: SavedChart) => void;
  onDelete: (id: string) => void;
}) {
  const [name, setName] = useState("");

  return (
    <div className="flex flex-col gap-2">
      {/* a form, so Enter in the input saves too */}
      <form
        className="flex gap-2.5"
        onSubmit={(e) => {
          e.preventDefault();
          const trimmed = name.trim();
          if (!trimmed) return;
          onSave(trimmed);
          setName(""); // saved — clear the way for the next name
        }}
      >
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name this chart…"
          className="flex-1 min-w-0 bg-transparent border-0 border-b border-gold px-0.5 py-1 text-[14.5px] outline-none focus:border-ink"
        />
        <button
          type="submit"
          className="flex-none w-[72px] border border-ink bg-transparent py-1.5 text-[10.5px] tracking-[0.24em] uppercase cursor-pointer hover:bg-ink hover:text-parchment-100 transition-colors"
        >
          Save
        </button>
      </form>

      {charts.length === 0 && (
        <div className="text-[12.5px] italic text-bronze text-center py-1">
          No saved charts yet
        </div>
      )}

      {charts.map((c) => (
        <div
          key={c.id}
          onClick={() => onLoad(c)}
          className="flex items-baseline gap-2 px-1 py-1 border-b border-umber/20 cursor-pointer hover:bg-umber/5"
        >
          <span className="flex-1 min-w-0 truncate text-[14.5px]">{c.name}</span>
          {/* the saved city's own wall clock — same projection the footer uses */}
          <span className="text-[12px] italic text-bronze whitespace-nowrap">
            {prettyDate(wallClock(c.city.tz, c.castMs).date)}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation(); // delete must not also load
              onDelete(c.id);
            }}
            aria-label={`Delete ${c.name}`}
            className="flex-none px-1 text-[12.5px] text-bronze bg-transparent border-0 cursor-pointer hover:text-rust"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
