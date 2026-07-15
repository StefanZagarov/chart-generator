import { useState } from "react";
import { Chart } from "./components/chart/Chart";
import { SidePanel } from "./components/sidePanel/SidePanel";
// TODO: Replace with Swiss Ephemeris WASM
import { computeChart } from "./engine/ephemeris";
import { findCity, prettyDate, wallClock } from "./engine/almanac";
import { scrub } from "./lib/scrubTime";
import { useTween } from "./hooks/useTween";
import type { City } from "./types/";

// Time and date - anchor for the calculations
const CAST_MS = Date.UTC(1992, 2, 14, 12, 45);
const HOME_CITY = findCity("New York, USA") as City;

// Scroll steps land on whole-minute boundaries (drag deliberately doesn't — see
// the onScrub comment: per-frame snapping stalls slow drags)
const snapToMinute = (ms: number) => Math.round(ms / 60_000) * 60_000;

function App() {
  const [utcMs, setUtcMs] = useState(CAST_MS);
  // The natal anchor: what the form last cast. Double-click tweens utcMs back here
  const [castMs, setCastMs] = useState(CAST_MS);
  // Where on Earth the chart is cast from — the form can change it, so it's state
  const [city, setCity] = useState<City>(HOME_CITY);
  // Aspect types the user has toggled off in the panel, e.g. { Square: true }
  const [aspectsOff, setAspectsOff] = useState<Record<string, boolean>>({});
  // The clicked planet (wheel glyph or panel row), or null
  const [selected, setSelected] = useState<string | null>(null);
  // The clicked aspect line as a "p1|p2" key, or null. Planet and aspect
  // selection are mutually exclusive — picking one clears the other
  const [selectedAspect, setSelectedAspect] = useState<string | null>(null);

  // Double-click homing animation: eases utcMs back to castMs. Any manual input
  // (drag, scroll, steppers) cancels it so the user's hand always wins
  const returnTween = useTween(setUtcMs);

  const chart = computeChart(utcMs, city.lat, city.lon, "Placidus");

  // Everything that should stay bright while a selection is active: a selected
  // planet keeps itself + every aspect partner; a selected line keeps exactly
  // its two endpoints. The wheel dims all other planets
  const related = selected
    ? new Set(
        [selected].concat(
          chart.aspects
            .filter((a) => a.p1 === selected || a.p2 === selected)
            .map((a) => (a.p1 === selected ? a.p2 : a.p1)),
        ),
      )
    : selectedAspect
      ? new Set(selectedAspect.split("|"))
      : null;

  // Selecting a planet clears any line selection and vice versa; passing null
  // (tap on empty wheel) clears both
  const selectPlanet = (name: string | null) => {
    setSelectedAspect(null);
    setSelected((cur) => (name === null || cur === name ? null : name));
  };
  const selectAspect = (key: string | null) => {
    setSelected(null);
    setSelectedAspect((cur) => (key === null || cur === key ? null : key));
  };
  // The wheel gets a view of the chart with the toggled-off aspect types removed;
  // the panel keeps the full chart (its list shows everything regardless).
  // Logic: spread the real chart into a copy, replacing only aspects with a filtered
  // list. The wheel's Aspects component draws whatever list it's given — it has no
  // idea toggles exist. Hiding stays a presentation concern, owned here.
  const chartView = {
    ...chart,
    aspects: chart.aspects.filter((a) => !aspectsOff[a.type]),
  };

  return (
    <div className="w-full h-svh flex">
      <SidePanel
        chart={chart}
        utcMs={utcMs}
        city={city}
        aspectsOff={aspectsOff}
        selected={selected}
        onCast={(ms, castCity) => {
          returnTween.cancel();
          // Setters batch into one render: there's never an intermediate frame
          // with the new time but the old coordinates
          setCity(castCity);
          setUtcMs(ms);
          setCastMs(ms); // casting moves the anchor double-click returns to
        }}
        onToggleAspect={(type) =>
          setAspectsOff((off) => ({ ...off, [type]: !off[type] }))
        }
        onSelect={selectPlanet}
        onSetTime={(ms) => {
          returnTween.cancel();
          setUtcMs(ms);
        }}
      />
      <main className="flex-1 min-w-0 flex flex-col items-center justify-center">
        {/* The drag pipeline: Chart reports "user swept delta degrees" → scrub solves
            "at what time has the ascendant moved that far?" → setUtcMs stores it →
            re-render → computeChart → every polarPoint lands differently → the wheel
            has "rotated". Nothing ever rotates; only time changes. */}
        {/* Drag (onScrub) stays CONTINUOUS — no snapping. Snapping per frame
            discards sub-minute progress (slow drags stall, mid drags stutter as
            frames hover around the rounding threshold). The footer shows no
            seconds, so minute granularity is a display fact already.
            Scroll (onWind) is stepwise by nature, so it does snap — and thereby
            re-aligns time to clean minute boundaries after any drag.
            onReturn (double-click) coasts home to the cast moment over ~0.8s. */}
        <Chart
          chart={chartView}
          selected={selected}
          selectedAspect={selectedAspect}
          related={related}
          onScrub={(delta) => {
            returnTween.cancel();
            setUtcMs(
              scrub(
                delta,
                { utcMs, asc: chart.asc },
                city.lat,
                city.lon,
                "Placidus",
              ),
            );
          }}
          onWind={(deltaMs) => {
            returnTween.cancel();
            setUtcMs(snapToMinute(utcMs + deltaMs));
          }}
          onSelect={selectPlanet}
          onSelectAspect={selectAspect}
          onReturn={() => returnTween.start(utcMs, castMs, 800)}
        />
        {/* Live caption: wallClock re-derives the city's local date & time from
            utcMs every render, so this line follows the wheel as it's dragged.
            prettyDate + time instead of .pretty: same text minus the seconds. */}
        <footer className="italic text-[20px] text-umber text-center">
          {city.name}, {city.label.split(", ")[1]} ·{" "}
          {prettyDate(wallClock(city.tz, utcMs).date)} at{" "}
          {wallClock(city.tz, utcMs).time} · Placidus houses
        </footer>
      </main>
    </div>
  );
}

export default App;
