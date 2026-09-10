import { useState } from "react";
import { ASPECT_DEFINITIONS } from "../engine/assembly";
import { validOrb } from "../lib/orbSettings";
import type { OrbConfig } from "../types/";

const formatOrb = (value: number) => value.toFixed(1);

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  strokeWidth: 16,
} as const;

function OrbIcon() {
  return (
    <svg viewBox="0 0 256 256" className="w-5 h-5">
      <path d="M36 184H216 M36 184L174 50" {...stroke} />
      <path d="M66 72C118 110 136 178 106 226" {...stroke} />
      <circle cx="230" cy="48" r="18" {...stroke} strokeWidth={12} />
    </svg>
  );
}

function Indicator({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 256 256" className="w-4 h-4">
      {open ? (
        <polyline points="96 48 176 128 96 208" {...stroke} />
      ) : (
        <line x1="40" y1="128" x2="216" y2="128" {...stroke} />
      )}
    </svg>
  );
}

function OrbRow({
  label,
  glyph,
  value,
  onChange,
}: {
  label: string;
  glyph?: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const displayed = draft ?? formatOrb(value);
  const parsed = displayed.trim() === "" ? Number.NaN : Number(displayed);
  const valid = validOrb(parsed);

  const edit = (next: string) => {
    setDraft(next);
    const candidate = next.trim() === "" ? Number.NaN : Number(next);
    if (validOrb(candidate)) onChange(candidate);
  };

  const restore = () => setDraft(null);

  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-3">
      <div className="min-w-0 text-[11px] tracking-[0.08em] text-umber">
        {glyph && (
          <span className="font-symbol inline-block w-5 text-center text-ink">
            {glyph}
          </span>
        )}
        {label}
      </div>
      <div className="flex items-stretch border border-gold">
        <button
          type="button"
          aria-label={`Decrease ${label} orb`}
          disabled={value === 0}
          onClick={() => {
            restore();
            onChange(Math.max(0, value - 0.5));
          }}
          className="w-7 border-r border-gold/50 text-umber cursor-pointer hover:bg-ink hover:text-parchment-100 disabled:opacity-35 disabled:cursor-default transition-colors"
        >
          −
        </button>
        <input
          type="text"
          inputMode="decimal"
          aria-label={`${label} orb in degrees`}
          aria-invalid={!valid}
          value={displayed}
          onChange={(event) => edit(event.target.value)}
          onBlur={restore}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              restore();
              event.currentTarget.blur();
            }
          }}
          className={`w-12 bg-cream/45 px-1 py-1 text-center text-[11px] tabular-nums outline-none ${
            valid ? "" : "text-rust"
          }`}
        />
        <button
          type="button"
          aria-label={`Increase ${label} orb`}
          disabled={value === 15}
          onClick={() => {
            restore();
            onChange(Math.min(15, value + 0.5));
          }}
          className="w-7 border-l border-gold/50 text-umber cursor-pointer hover:bg-ink hover:text-parchment-100 disabled:opacity-35 disabled:cursor-default transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );
}

export function OrbSettingsPanel({
  config,
  saveFailed,
  onChange,
  onReset,
}: {
  config: OrbConfig;
  saveFailed: boolean;
  onChange: (config: OrbConfig) => void;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [resetVersion, setResetVersion] = useState(0);

  return (
    <div className="relative z-30 flex flex-col items-start">
      <button
        type="button"
        aria-label="Orb settings"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex items-center gap-1.5 border-0 bg-transparent p-1.5 text-ink cursor-pointer hover:bg-umber/10 transition-colors"
      >
        <OrbIcon />
        <Indicator open={open} />
      </button>

      <div
        aria-hidden={!open}
        inert={!open}
        className={`absolute left-0 top-full mt-2 w-[286px] max-w-[calc(100vw-1.5rem)] space-y-2 border border-gold bg-cream/95 px-4 py-3.5 shadow-md transition-all duration-200 ease-out motion-reduce:transition-none ${
          open
            ? "visible opacity-100 translate-x-0"
            : "invisible opacity-0 -translate-x-[140px]"
        }`}
      >
        <div className="pb-1 text-[10.5px] tracking-[0.24em] uppercase text-bronze">
          Aspect orbs
        </div>
        {ASPECT_DEFINITIONS.map(({ type, glyph }) => (
          <OrbRow
            key={`${resetVersion}-${type}`}
            label={type}
            glyph={glyph}
            value={config.aspects[type]}
            onChange={(value) =>
              onChange({
                ...config,
                aspects: { ...config.aspects, [type]: value },
              })
            }
          />
        ))}
        <div className="border-t border-gold/50 pt-2">
          <OrbRow
            key={`${resetVersion}-luminary`}
            label="Luminary bonus"
            value={config.luminaryBonus}
            onChange={(value) => onChange({ ...config, luminaryBonus: value })}
          />
        </div>
        <button
          type="button"
          onClick={() => {
            setResetVersion((version) => version + 1);
            onReset();
          }}
          className="mt-1 w-full border border-ink bg-transparent py-1 text-[10.5px] tracking-[0.2em] uppercase cursor-pointer hover:bg-ink hover:text-parchment-100 transition-colors"
        >
          Reset defaults
        </button>
        {saveFailed && (
          <div role="status" className="text-[11px] italic text-rust">
            Settings could not be saved. Current values remain active.
          </div>
        )}
      </div>
    </div>
  );
}
