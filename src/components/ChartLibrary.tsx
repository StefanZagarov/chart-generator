import { Modal } from "./Modal";
import { MiniWheel } from "./chart/MiniWheel";
import { prettyDate, wallClock } from "../engine/almanac";
import type { Numerals, SavedChart } from "../types/";

/** The Load window: one box per saved chart, each holding that chart's actual
 * rendered wheel. Clicking a box loads it into the app (App closes this modal
 * in its onLoad); the ✕ deletes without loading (stopPropagation keeps the two
 * gestures apart, same as the old list rows). */
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
  return (
    <Modal title="Saved Charts" onClose={onClose}>
      {charts.length === 0 && (
        <div className="italic text-bronze text-center py-8">
          Nothing saved yet — cast a chart and press Save, or Import an AAF
          export.
        </div>
      )}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
        {charts.map((c) => (
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
