import { useState } from "react";
import type { Numerals } from "../types/";

/** The cog-wheel options drawer, top right — the Hyprtimer mechanic in parchment
 * clothes. Closed: cog + "−". Open: cog + "<", and the panel slides in from the
 * right. Logic: the panel is always mounted; hidden it sits 140px off to the
 * right at opacity 0 with visibility:hidden (so it's untabbable and unclickable),
 * and .open just returns it home — the transition on transform+opacity is what
 * reads as "sliding in". Same trick as Hyprtimer's #settings-panel, done with
 * Tailwind classes instead of an .open class toggle. */

// stroke-style icons matching the wheel's line work (Phosphor, 256 viewBox)
const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  strokeWidth: 16,
} as const;

function Cog() {
  return (
    <svg viewBox="0 0 256 256" className="w-5 h-5">
      <circle cx="128" cy="128" r="40" {...stroke} />
      <path
        d="M130.05,206.11c-1.34,0-2.69,0-4,0L94,224a104.61,104.61,0,0,1-34.11-19.2l-.12-36c-.71-1.12-1.38-2.25-2-3.41L25.9,147.24a99.15,99.15,0,0,1,0-38.46l31.84-18.1c.65-1.15,1.32-2.29,2-3.41l.16-36A104.58,104.58,0,0,1,94,32l32,17.89c1.34,0,2.69,0,4,0L162,32a104.61,104.61,0,0,1,34.11,19.2l.12,36c.71,1.12,1.38,2.25,2,3.41l31.85,18.14a99.15,99.15,0,0,1,0,38.46l-31.84,18.1c-.65,1.15-1.32,2.29-2,3.41l-.16,36A104.58,104.58,0,0,1,162,224Z"
        {...stroke}
      />
    </svg>
  );
}

// the state indicator next to the cog: "−" invites opening, "<" shows the
// panel is out (and points back the way it came)
function Indicator({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 256 256" className="w-3.5 h-3.5">
      {open ? (
        <polyline points="160 48 80 128 160 208" {...stroke} />
      ) : (
        <line x1="40" y1="128" x2="216" y2="128" {...stroke} />
      )}
    </svg>
  );
}

// label + one cycle-through button; fixed button width so toggling
// Roman ↔ Arabic doesn't make the row breathe
function Row({
  label,
  value,
  onClick,
}: {
  label: string;
  value: string;
  onClick: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-5">
      <div className="text-[10.5px] tracking-[0.26em] uppercase text-bronze">
        {label}
      </div>
      <button
        onClick={onClick}
        className="w-[84px] border border-ink bg-transparent py-1 text-[10.5px] tracking-[0.22em] uppercase cursor-pointer hover:bg-ink hover:text-parchment-100 transition-colors"
      >
        {value}
      </button>
    </div>
  );
}

export function OptionsPanel({
  showSigns,
  numerals,
  onToggleSigns,
  onToggleNumerals,
}: {
  showSigns: boolean;
  numerals: Numerals;
  onToggleSigns: () => void;
  onToggleNumerals: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="fixed top-4 right-4 z-10 flex flex-col items-end">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Options"
        aria-expanded={open}
        className="flex items-center gap-1.5 p-1.5 text-ink bg-transparent border-0 cursor-pointer hover:bg-umber/10 transition-colors"
      >
        <Cog />
        <Indicator open={open} />
      </button>

      <div
        aria-hidden={!open}
        className={`mt-2 flex flex-col gap-3 border border-gold bg-cream/85 px-4 py-3.5 transition-all duration-200 ease-out ${
          open
            ? "visible opacity-100 translate-x-0"
            : "invisible opacity-0 translate-x-[140px]"
        }`}
      >
        <Row
          label="Zodiac signs"
          value={showSigns ? "Shown" : "Hidden"}
          onClick={onToggleSigns}
        />
        <Row
          label="House numerals"
          value={numerals === "roman" ? "Roman" : "Arabic"}
          onClick={onToggleNumerals}
        />
      </div>
    </div>
  );
}
