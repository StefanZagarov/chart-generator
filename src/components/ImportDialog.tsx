import { useState } from "react";
import { Modal } from "./Modal";

/** Paste-an-AAF-export window. The parsing itself lives in lib/aaf.ts and the
 * writing in the vault — this dialog only carries text up and shows what came
 * back: it closes itself on a clean import, stays open to show errors (with
 * the partial-success count) so a half-good paste isn't silently half-lost. */
export function ImportDialog({
  onImport,
  onClose,
}: {
  /** returns how many charts landed and what refused to parse */
  onImport: (text: string) => Promise<{ added: number; errors: string[] }>;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<{
    added: number;
    errors: string[];
  } | null>(null);

  return (
    <Modal title="Import Charts" onClose={onClose}>
      <div className="text-[13px] italic text-umber mb-3">
        Paste an AAF export (astro.com → My Astro → Import/Export) — one or
        more #A/#B line pairs. Existing charts with the same name are updated;
        an unknown birth time (“*”) imports as a noon chart.
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={
          "#A93:*,Albena Slavova,f,23.2.1968,20:16,Samokov, Bulgaria\n#B93:*,42n20,23e33,2he00,0"
        }
        spellCheck={false}
        className="w-full h-[220px] resize-y bg-cream/60 border border-gold focus:border-ink outline-none px-3 py-2 text-[13px] font-mono"
      />

      {result && (
        <div className="mt-3 text-[13px]">
          {result.added > 0 && (
            <div className="italic text-umber">
              Imported {result.added} chart{result.added === 1 ? "" : "s"}.
            </div>
          )}
          {result.errors.map((err) => (
            <div key={err} className="text-rust">
              {err}
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end mt-4">
        <button
          onClick={async () => {
            const r = await onImport(text);
            if (r.errors.length === 0 && r.added > 0) onClose();
            else setResult(r); // keep the window: show what didn't make it
          }}
          className="border border-ink bg-transparent px-6 py-2 text-[11.5px] tracking-[0.28em] uppercase cursor-pointer hover:bg-ink hover:text-parchment-100 transition-colors"
        >
          Import
        </button>
      </div>
    </Modal>
  );
}
