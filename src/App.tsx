import { useState } from "react";
import { Chart } from "./components/chart/Chart";
import { SidePanel } from "./components/sidePanel/SidePanel";
// TODO: Replace with Swiss Ephemeris WASM
import { computeChart, findCity, wallClock } from "./engine/ephemeris";
import { scrub } from "./lib/scrubTime";
import type { City } from "./types/";

// Time and date - anchor for the calculations
const CAST_MS = Date.UTC(1992, 2, 14, 12, 45);
const HOME_CITY = findCity("New York, USA") as City;

function App() {
  const [utcMs, setUtcMs] = useState(CAST_MS);
  // Where on Earth the chart is cast from — the form can change it, so it's state
  const [city, setCity] = useState<City>(HOME_CITY);
  // Aspect types the user has toggled off in the panel, e.g. { Square: true }
  const [aspectsOff, setAspectsOff] = useState<Record<string, boolean>>({});

  const chart = computeChart(utcMs, city.lat, city.lon, "Placidus");
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
        onCast={(ms, castCity) => {
          // Two setters, one render: React batches them, so there's never an
          // intermediate frame with the new time but the old coordinates
          setCity(castCity);
          setUtcMs(ms);
        }}
        onToggleAspect={(type) =>
          setAspectsOff((off) => ({ ...off, [type]: !off[type] }))
        }
      />
      <main className="flex-1 min-w-0 flex flex-col items-center justify-center">
        {/* The drag pipeline: Chart reports "user swept delta degrees" → scrub solves
            "at what time has the ascendant moved that far?" → setUtcMs stores it →
            re-render → computeChart → every polarPoint lands differently → the wheel
            has "rotated". Nothing ever rotates; only time changes. */}
        <Chart
          chart={chartView}
          onScrub={(delta) =>
            setUtcMs(
              scrub(
                delta,
                { utcMs, asc: chart.asc },
                city.lat,
                city.lon,
                "Placidus",
              ),
            )
          }
        />
        {/* Live caption: wallClock re-derives the city's local date & time from
            utcMs every render, so this line follows the wheel as it's dragged */}
        <footer className="italic text-[20px] text-umber text-center">
          {city.name}, {city.label.split(", ")[1]} · {wallClock(city.tz, utcMs).pretty} · Placidus houses
        </footer>
      </main>
    </div>
  );
}

export default App;
