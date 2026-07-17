import { useRef, useState } from "react";

/** The vault's doorway: Save / Load / Import in the chart area's top-left,
 * just past the sidebar's border (the cog drawer mirrors it on the far right).
 * Load and Import just open their windows (App owns the modals); Save expands
 * into a name field right here — Enter saves, Esc backs out — because a save
 * isn't a save until it has a name, and a whole dialog for one word is
 * ceremony. */
export function VaultActions({
  onSave,
  onOpenLibrary,
  onOpenImport,
}: {
  onSave: (name: string) => void;
  onOpenLibrary: () => void;
  onOpenImport: () => void;
}) {
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const commit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed);
    setName("");
    setNaming(false);
  };

  const action =
    "text-[10px] tracking-[0.22em] uppercase text-bronze hover:text-ink bg-transparent border-0 p-0 cursor-pointer transition-colors";

  return (
    // 332px panel + 3px double border + breathing room = the wheel side's
    // left corner; fixed like the cog so the wheel scrolls under neither
    <div className="fixed top-4 left-[352px] z-10 flex flex-col items-start gap-1.5">
      <div className="flex items-center gap-2.5">
        <button className={action} onClick={() => setNaming((n) => !n)}>
          Save
        </button>
        <span className="text-gold text-[9px]">·</span>
        <button className={action} onClick={onOpenLibrary}>
          Load
        </button>
        <span className="text-gold text-[9px]">·</span>
        <button className={action} onClick={onOpenImport}>
          Import
        </button>
      </div>

      {naming && (
        <input
          ref={inputRef}
          autoFocus
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setName("");
              setNaming(false);
            }
          }}
          placeholder="Name, then Enter"
          className="w-[160px] bg-parchment-50 border border-gold focus:border-ink outline-none px-2 py-1 text-[12.5px] shadow-md"
        />
      )}
    </div>
  );
}
