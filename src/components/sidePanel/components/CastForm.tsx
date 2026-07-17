import { useRef, useState } from "react";
import type { RefObject } from "react";
import {
  CITIES,
  findCity,
  localToUTC,
  nearestCity,
  wallClock,
} from "../../../engine/almanac";
import type { City } from "../../../types/";

// The birth-data form. Owns its field strings locally — they're just text until
// the user casts; only then does the result get lifted up to App as (utcMs, city).
// Logic: the form is a gate between "text" and "truth". While typing, the strings are
// possibly nonsense and touch nothing. Cast converts in two steps — findCity resolves
// the name to coordinates + IANA timezone or fails visibly (the app never receives a
// half-valid cast), then localToUTC answers "when the wall clocks in that place showed
// this date+time, what instant was it globally?". That instant, utcMs, is the only
// currency the rest of the app accepts. Date and time are typed as segments
// (DD / MM / YYYY and HH : MM) that auto-advance; the engine's "YYYY-MM-DD" / "HH:MM"
// forms are assembled only at the cast boundary.

// One digit-segment of the date/time: keeps only digits, caps the length, and when
// the segment is full, jumps focus to the next one. Focusing a segment (by click,
// tab, or auto-advance) selects its whole content, so typing replaces instead of
// appending — that's what makes "12" land as day and the "0" of "03" start the month.
function Segment({
  value,
  onChange,
  length,
  placeholder,
  inputRef,
  nextRef,
  clamp,
  wide,
}: {
  value: string;
  onChange: (v: string) => void;
  length: number;
  placeholder: string;
  inputRef: RefObject<HTMLInputElement | null>;
  nextRef?: RefObject<HTMLInputElement | null>;
  /** applied only when the segment is full, so a lone "0" (on its way to "07") survives */
  clamp?: (full: string) => string;
  wide?: boolean;
}) {
  return (
    <input
      type="text"
      inputMode="numeric"
      placeholder={placeholder}
      value={value}
      ref={inputRef}
      onFocus={(e) => e.target.select()}
      onChange={(e) => {
        let digits = e.target.value.replace(/\D/g, "").slice(0, length);
        // clamp out-of-range values the moment the segment completes: "45" → "31",
        // "00" → "01" — never mid-typing, or the first "0" of "07" would be mangled
        if (digits.length === length && clamp) digits = clamp(digits);
        onChange(digits);
        // segment full → move on; focus() fires onFocus, which selects the target
        if (digits.length === length) nextRef?.current?.focus();
      }}
      className={`${wide ? "w-[5ch]" : "w-[3ch]"} text-center bg-transparent border-0 px-0 py-1 text-[15.5px] outline-none`}
    />
  );
}

// clamp helpers: pull a number into [min, max] and re-pad it to two digits
const clampNum = (v: string, min: number, max: number) =>
  String(Math.min(Math.max(Number(v), min), max)).padStart(2, "0");

export function CastForm({
  city,
  initialMs,
  coordsLabel,
  onCast,
}: {
  city: City;
  /** the cast this form should display — fields are derived from it ONCE */
  initialMs: number;
  /** "42°42′N, 23°19′E" — the cast city's coordinates, shown under the place */
  coordsLabel: string;
  onCast: (utcMs: number, city: City) => void;
}) {
  // The fields are useState INITIALIZERS, not bindings: they read initialMs on
  // the first render only, then typing owns them. Resetting the form from
  // outside (loading a saved chart, casting, Now) happens by remount — App keys
  // this component on (castMs, city), so any moved anchor is a "new" form whose
  // initializers re-run. That keeps the contract above: the form always
  // displays what was cast, yet is never reset mid-edit by a render.
  const wc = wallClock(city.tz, initialMs); // "YYYY-MM-DD" / "HH:MM"
  const [initYear, initMonth, initDay] = wc.date.split("-");
  const [initHour, initMinute] = wc.time.split(":");
  const [day, setDay] = useState(initDay);
  const [month, setMonth] = useState(initMonth);
  const [year, setYear] = useState(initYear);
  const [hour, setHour] = useState(initHour);
  const [minute, setMinute] = useState(initMinute);
  const [place, setPlace] = useState(city.label);
  const [error, setError] = useState("");

  // Place autocomplete over the 170k-place atlas. CITIES is population-sorted,
  // so the first 8 prefix hits are automatically the 8 biggest matches.
  const [suggestions, setSuggestions] = useState<City[]>([]);
  const [highlighted, setHighlighted] = useState(-1);
  // The city the user actually clicked/chose in the dropdown. This beats
  // findCity at cast time: with a global atlas, one label can name several
  // places ("Springfield, United States"…) and findCity would return the
  // biggest — picking from the dropdown must mean THAT one.
  const pickedCity = useRef<City | null>(null);

  // Word-order-free matching: the query is split into tokens and each token
  // must start one of the label's words — so "sofia bulgaria", "bulgaria sofia"
  // and "bulg sof" all land on "Sofia, Bulgaria". The cheap substring test
  // prescreens before the word-split so the 170k scan stays a few ms.
  // An empty query matches everything → the first 8 rows, i.e. the world's
  // biggest cities: that's what makes focusing the empty/selected field behave
  // like opening a combobox.
  const suggest = (q: string): City[] => {
    const tokens = q.trim().toLowerCase().split(/[\s,]+/).filter(Boolean);
    const out: City[] = [];
    for (const c of CITIES) {
      const label = c.label.toLowerCase();
      if (tokens.every((t) => label.includes(t))) {
        const words = label.split(/[\s,]+/);
        if (tokens.every((t) => words.some((w) => w.startsWith(t)))) {
          out.push(c);
          if (out.length === 8) break;
        }
      }
    }
    return out;
  };

  const pick = (c: City) => {
    pickedCity.current = c;
    setPlace(c.label);
    setSuggestions([]);
    setHighlighted(-1);
  };

  const dayRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);
  const hourRef = useRef<HTMLInputElement>(null);
  const minuteRef = useRef<HTMLInputElement>(null);

  // Per-segment clamps, applied when the segment completes.
  // Day's max is month-aware: days in the currently typed month (Date.UTC with
  // day 0 = last day of the previous month, hence `month` not `month - 1`).
  // While month/year are still empty, fall back to the loosest bounds (31; leap
  // year 2000) — the cast validation still catches leftovers like 31/02.
  const clampDay = (v: string) => {
    const m = Number(month);
    const y = year.length === 4 ? Number(year) : 2000;
    const max =
      m >= 1 && m <= 12 ? new Date(Date.UTC(y, m, 0)).getUTCDate() : 31;
    return clampNum(v, 1, max);
  };
  // Month also re-checks the day already sitting in its box: typing runs day →
  // month, so day was clamped while month was unknown (fallback max 31). Once the
  // month is known, shrink the day to that month's length: 31 then 02 → day 28/29.
  const clampMonth = (v: string) => {
    const clamped = clampNum(v, 1, 12);
    if (day) {
      const y = year.length === 4 ? Number(year) : 2000;
      const max = new Date(Date.UTC(y, Number(clamped), 0)).getUTCDate();
      if (Number(day) > max) setDay(String(max));
    }
    return clamped;
  };
  // Year clamps to whole years the ephemeris fully covers (its range ends
  // mid-3003, so 3002 is the last complete year; earlier years back to the
  // engine's 3002-BCE floor are only reachable by winding, not this CE field),
  // then re-checks the one date case only it can decide: 29/02 in a non-leap year
  const clampYear = (v: string) => {
    const n = Math.min(3002, Math.max(1, Number(v)));
    const clamped = String(n).padStart(4, "0");
    if (day && month === "02") {
      const max = new Date(Date.UTC(n, 2, 0)).getUTCDate();
      if (Number(day) > max) setDay(String(max));
    }
    return clamped;
  };
  const clampHour = (v: string) => clampNum(v, 0, 23);
  const clampMinute = (v: string) => clampNum(v, 0, 59);

  const cast = () => {
    // a dropdown pick wins while the field still shows it; edited text falls
    // back to findCity (which resolves same-label homonyms to the biggest)
    const found =
      pickedCity.current && pickedCity.current.label === place
        ? pickedCity.current
        : findCity(place);
    if (!found) {
      setError("Unknown city");
      return;
    }

    // Assemble and validate the segments. The Date.UTC round-trip catches
    // impossible dates: 31/02 rolls over to March, so reading the parts back
    // reveals the mismatch.
    const [d, mo, y] = [Number(day), Number(month), Number(year)];
    const roundTrip = new Date(Date.UTC(y, mo - 1, d));
    if (
      year.length !== 4 ||
      !day ||
      !month ||
      roundTrip.getUTCFullYear() !== y ||
      roundTrip.getUTCMonth() !== mo - 1 ||
      roundTrip.getUTCDate() !== d
    ) {
      setError("Invalid date");
      return;
    }

    const [h, min] = [Number(hour), Number(minute)];
    if (!hour || !minute || h > 23 || min > 59) {
      setError("Invalid time");
      return;
    }

    // normalize the display (1/3 → 01/03) and build the engine's formats
    const dd = day.padStart(2, "0");
    const mm = month.padStart(2, "0");
    const hh = hour.padStart(2, "0");
    const mi = minute.padStart(2, "0");
    setDay(dd);
    setMonth(mm);
    setHour(hh);
    setMinute(mi);
    setError("");

    const { utcMs } = localToUTC(`${year}-${mm}-${dd}`, `${hh}:${mi}`, found.tz);
    onCast(utcMs, found);
  };

  // "Now" = the cast gate driven backwards: take the current instant, ask wallClock
  // what the clocks show there right now, write that INTO the form fields (so the
  // form always displays what was cast), and cast immediately.
  const castNowAt = (nowCity: City) => {
    const nowMs = Date.now();
    const wc = wallClock(nowCity.tz, nowMs); // wc.date "YYYY-MM-DD", wc.time "HH:MM"
    const [y, mo, d] = wc.date.split("-");
    const [h, min] = wc.time.split(":");
    setDay(d);
    setMonth(mo);
    setYear(y);
    setHour(h);
    setMinute(min);
    setPlace(nowCity.label);
    setError("");
    onCast(nowMs, nowCity);
  };

  // Logic: getCurrentPosition triggers the browser's native permission prompt.
  // GPS only hands us coordinates, but a City needs a timezone and a name too —
  // so the cast uses the EXACT coords, the browser's own IANA timezone (correct
  // for wherever the user physically is, unlike the nearest city's tz), and the
  // nearest listed city purely as the display label. Denied / unavailable / slow
  // (>5s) falls back to the currently selected city — the old behavior.
  const setNow = () => {
    if (!navigator.geolocation) {
      castNowAt(city);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const near = nearestCity(latitude, longitude);
        castNowAt({
          ...near,
          lat: latitude,
          lon: longitude,
          tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
      },
      () => castNowAt(city),
      { timeout: 5000 },
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="block min-w-0">
          <div className="text-[10.5px] tracking-[0.26em] uppercase text-bronze mb-1">
            Date of birth
          </div>
          <div className="flex items-baseline border-b border-gold focus-within:border-ink">
            <Segment value={day} onChange={setDay} length={2} placeholder="DD" inputRef={dayRef} nextRef={monthRef} clamp={clampDay} />
            <span className="text-bronze">/</span>
            <Segment value={month} onChange={setMonth} length={2} placeholder="MM" inputRef={monthRef} nextRef={yearRef} clamp={clampMonth} />
            <span className="text-bronze">/</span>
            <Segment value={year} onChange={setYear} length={4} placeholder="YYYY" inputRef={yearRef} nextRef={hourRef} clamp={clampYear} wide />
          </div>
        </label>
        <label className="block min-w-0">
          <div className="text-[10.5px] tracking-[0.26em] uppercase text-bronze mb-1">
            Hour
          </div>
          <div className="flex items-baseline border-b border-gold focus-within:border-ink">
            <Segment value={hour} onChange={setHour} length={2} placeholder="HH" inputRef={hourRef} nextRef={minuteRef} clamp={clampHour} />
            <span className="text-bronze">:</span>
            <Segment value={minute} onChange={setMinute} length={2} placeholder="MM" inputRef={minuteRef} clamp={clampMinute} />
          </div>
        </label>
      </div>

      <label className="block">
        <div className="text-[10.5px] tracking-[0.26em] uppercase text-bronze mb-1">
          Place of birth
        </div>
        <div className="relative">
          <input
            type="text"
            value={place}
            onChange={(e) => {
              setPlace(e.target.value);
              pickedCity.current = null; // typing invalidates the pick
              setSuggestions(suggest(e.target.value));
              setHighlighted(-1);
            }}
            onKeyDown={(e) => {
              if (suggestions.length === 0) return;
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setHighlighted((h) => (h + 1) % suggestions.length);
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setHighlighted(
                  (h) => (h - 1 + suggestions.length) % suggestions.length,
                );
              } else if (e.key === "Enter" && highlighted >= 0) {
                pick(suggestions[highlighted]);
              } else if (e.key === "Escape") {
                setSuggestions([]);
              }
            }}
            // combobox feel: focusing opens the list (matches for the current
            // text) and selects the text so typing starts a fresh search
            onFocus={(e) => {
              e.target.select();
              setSuggestions(suggest(e.target.value));
            }}
            onBlur={() => setSuggestions([])}
            placeholder="Choose a city…"
            className="w-full bg-transparent border-0 border-b border-gold px-0.5 py-1 text-[15.5px] outline-none focus:border-ink"
          />
          {suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-10 border border-gold bg-parchment-50 shadow-md">
              {suggestions.map((c, i) => (
                <div
                  key={`${c.label}-${c.lat}-${c.lon}`}
                  // mousedown fires before the input's blur — a click always lands
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(c);
                  }}
                  onMouseEnter={() => setHighlighted(i)}
                  className={`px-2 py-1 text-[13.5px] cursor-pointer ${
                    i === highlighted ? "bg-umber/10" : ""
                  }`}
                >
                  {c.label}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-between mt-1">
          <div className="text-[12.5px] italic text-bronze">{coordsLabel}</div>
          <div className="text-[12.5px] italic text-rust">{error}</div>
        </div>
      </label>

      <div className="flex gap-2.5">
        <button
          onClick={cast}
          className="flex-1 border border-ink bg-transparent py-2 text-[11.5px] tracking-[0.28em] uppercase cursor-pointer hover:bg-ink hover:text-parchment-100 transition-colors"
        >
          Cast chart
        </button>
        <button
          onClick={setNow}
          className="flex-none w-[88px] border border-gold text-umber bg-transparent py-2 text-[11.5px] tracking-[0.28em] uppercase cursor-pointer hover:bg-gold hover:text-parchment-100 transition-colors"
        >
          Now
        </button>
      </div>
    </div>
  );
}
