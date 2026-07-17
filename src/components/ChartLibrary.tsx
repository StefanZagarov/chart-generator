import { useState } from "react";
import { Modal } from "./Modal";
import { MiniWheel } from "./chart/MiniWheel";
import { prettyDate, wallClock } from "../engine/almanac";
import type { Numerals, SavedChart } from "../types/";

/** The Load window: one box per saved chart, each holding that chart's actual
 * rendered wheel. Boxes come alphabetically (the vault keeps insertion order —
 * an ordering fact of storage, not of reading) and the search field narrows by
 * name or place as you type. Clicking a box loads it into the app (App closes
 * this modal in its onLoad); the ✕ deletes without loading (stopPropagation
 * keeps the two gestures apart, same as the old list rows). */
export function ChartLibrary({
  charts,
  numerals,
  onLoad,
  onDelete,
  onClose,
}: {
  charts: SavedChart[];
  numerals: Numerals;
  onLoad: (chart: SavedChart) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim();
  // The query is a case-insensitive regex when it compiles ("^An", "ova$",
  // "Sofia|Athens") and a plain substring when it doesn't — so a half-typed
  // "[" never breaks the search, it just matches nothing-special literally.
  let matches = (s: string) => s.toLowerCase().includes(q.toLowerCase());
  try {
    const re = new RegExp(q, "i");
    matches = (s: string) => re.test(s);
  } catch {
    /* invalid regex → the substring fallback above stands */
  }
  const shown = charts
    .filter((c) => !q || matches(c.name) || matches(c.city.label))
    // localeCompare so "Ángela" files under A, not after Z
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Modal
      // "Saved Charts · 131", or "· 7 of 131" while a search narrows the grid
      title={`Saved Charts · ${
        shown.length === charts.length
          ? charts.length
          : `${shown.length} of ${charts.length}`
      }`}
      onClose={onClose}
    >
      {charts.length === 0 ? (
        <div className="italic text-bronze text-center py-8">
          Nothing saved yet — cast a chart and press Save, or Import an AAF
          export.
        </div>
      ) : (
        <input
          autoFocus
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or place… (regex works)"
          className="w-full mb-4 bg-cream/60 border-0 border-b border-gold focus:border-ink outline-none px-1 py-1.5 text-[14.5px]"
        />
      )}
      {charts.length > 0 && shown.length === 0 && (
        <div className="italic text-bronze text-center py-8">
          Nothing matches “{query.trim()}”.
        </div>
      )}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
        {shown.map((c) => (
          <div
            key={c.id}
            onClick={() => onLoad(c)}
            className="group relative border border-gold bg-cream/60 p-2.5 cursor-pointer hover:border-ink transition-colors"
          >
            <MiniWheel saved={c} numerals={numerals} />
            <div className="mt-2 text-center">
              <div className="text-[14.5px] truncate">{c.name}</div>
              <div className="text-[11.5px] italic text-bronze truncate">
                {prettyDate(wallClock(c.city.tz, c.castMs).date)} at{" "}
                {wallClock(c.city.tz, c.castMs).time} · {c.city.name}
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation(); // delete must not also load
                onDelete(c.id);
              }}
              aria-label={`Delete ${c.name}`}
              className="absolute top-1.5 right-2 text-bronze hover:text-rust bg-transparent border-0 cursor-pointer text-[13px] opacity-0 group-hover:opacity-100 transition-opacity"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </Modal>
  );
}
