import { useEffect, useState } from "react";
import { Chart } from "./components/chart/Chart";
import { SidePanel } from "./components/sidePanel/SidePanel";
import { OptionsPanel } from "./components/OptionsPanel";
import { VaultActions } from "./components/VaultActions";
import { ChartLibrary } from "./components/ChartLibrary";
import { ImportDialog } from "./components/ImportDialog";
import { computeChart } from "./engine/swiss";
import { CITIES, clampTime, formatDate, wallClock } from "./engine/almanac";
import { deleteChart, importCharts, listCharts, saveChart } from "./lib/chartVault";
import { parseAAF } from "./lib/aaf";
import { wheelImage } from "./lib/wheelImage";
import { scrub } from "./lib/scrubTime";
import { useTween } from "./hooks/useTween";
import type {
  City,
  HouseSystem,
  Numerals,
  PlanetName,
  SavedChart,
} from "./types/";

// Startup anchor: the moment the app was opened, placed in the machine's own
// timezone — the OS already knows its IANA zone, and City.tz holds the same
// names, so a plain find matches this computer to a listed city (rows are
// population-sorted, so it finds the zone's biggest city). LAZY on purpose:
// this module is imported before the boot gate fills CITIES, so resolving at
// module level would read an empty atlas — a null city, a white screen. As a
// useState initializer it runs at first render, safely after the gate.
const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
const homeCity = () =>
  CITIES.find((c) => c.tz === localTz) ?? CITIES[0]; // [0] = Earth's biggest city
const CAST_MS = Date.now();

// one home for the house system — becomes state the day a selector exists
const HOUSE_SYSTEM: HouseSystem = "Placidus";

// Scroll steps land on whole-minute boundaries (drag deliberately doesn't — see
// the onScrub comment: per-frame snapping stalls slow drags)
const snapToMinute = (ms: number) => Math.round(ms / 60_000) * 60_000;

function App() {
  const [utcMs, setUtcMsRaw] = useState(CAST_MS);
  // The natal anchor: what the form last cast. Double-click tweens utcMs back here
  const [castMs, setCastMsRaw] = useState(CAST_MS);

  // Every instant is clamped to the ephemeris's supported range on the way in —
  // one gate for the form, the steppers, drag/scroll, loads, and the tween — so
  // computeChart below can never be handed a date it has no data for (which
  // returned NaN positions and blanked the app). scrub/wind just stall at the
  // boundary, which is the right feel: you can't wind past the edge of time.
  const setUtcMs = (ms: number) => setUtcMsRaw(clampTime(ms));
  const setCastMs = (ms: number) => setCastMsRaw(clampTime(ms));
  // Where on Earth the chart is cast from — the form can change it, so it's state
  const [city, setCity] = useState<City>(homeCity);
  // Aspect types the user has toggled off in the panel, e.g. { Square: true }
  const [aspectsOff, setAspectsOff] = useState<Record<string, boolean>>({});
  // Options-panel display toggles: zodiac band on/off, house numbering style,
  // glyph coloring, and which outer planets are hidden
  const [showSigns, setShowSigns] = useState(true);
  const [numerals, setNumerals] = useState<Numerals>("roman");
  const [planetColors, setPlanetColors] = useState(false);
  const [zodiacColors, setZodiacColors] = useState(false);
  const [hidden, setHidden] = useState<ReadonlySet<PlanetName>>(new Set());
  const togglePlanet = (name: PlanetName) =>
    setHidden((h) => {
      const next = new Set(h);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  // The vault's list — starts empty, filled from storage once on mount (a real
  // file read on desktop, so it's async and arrives just after first paint)
  const [saved, setSaved] = useState<SavedChart[]>([]);
  useEffect(() => {
    listCharts().then(setSaved);
  }, []);
  // which vault window is open: the gallery (Load), the AAF paste (Import), or none
  const [dialog, setDialog] = useState<"library" | "import" | null>(null);
  // whose chart the wheel is showing — the name of the loaded (or just-saved)
  // save. Casting fresh from the form clears it: that chart belongs to no save.
  const [loadedName, setLoadedName] = useState<string | null>(null);
  // The clicked planet (wheel glyph or panel row), or null
  const [selected, setSelected] = useState<string | null>(null);
  // The clicked aspect line as a "p1|p2" key, or null. Planet and aspect
  // selection are mutually exclusive — picking one clears the other
  const [selectedAspect, setSelectedAspect] = useState<string | null>(null);

  // Double-click homing animation: eases utcMs back to castMs. Any manual input
  // (drag, scroll, steppers) cancels it so the user's hand always wins
  const returnTween = useTween(setUtcMs);

  const chart = computeChart(utcMs, city.lat, city.lon, HOUSE_SYSTEM);

  // Hidden outer planets drop out entirely — off the wheel, out of the aspect
  // web, and out of the panel list. Unlike aspectsOff (which hides lines but
  // keeps the data), a hidden planet is gone everywhere, so this filtering
  // happens once here and both the wheel and the panel read the result.
  const visible =
    hidden.size === 0
      ? chart
      : {
          ...chart,
          planets: chart.planets.filter((p) => !hidden.has(p.name)),
          aspects: chart.aspects.filter(
            (a) => !hidden.has(a.p1) && !hidden.has(a.p2),
          ),
        };

  // Loading reaches exactly the state casting reaches (city + both times),
  // plus the tween cancel every manual input performs. Moving castMs re-keys
  // CastForm, which is how the form fields snap to the loaded chart.
  const loadChart = (c: SavedChart) => {
    returnTween.cancel();
    setCity(c.city);
    setUtcMs(c.castMs);
    setCastMs(c.castMs);
    setLoadedName(c.name);
    setDialog(null); // picking a chart is what the library window is FOR
  };

  // Import window plumbing: parse the paste, vault whatever parsed, and hand
  // the dialog its report — it decides whether to close (clean) or show errors
  const importText = async (text: string) => {
    const { charts, errors } = parseAAF(text, HOUSE_SYSTEM);
    if (charts.length > 0)
      setSaved(
        await importCharts(
          // bake each import's preview now — ~0.5 ms per chart, once
          charts.map((c) => ({ ...c, image: wheelImage(c, numerals) })),
        ),
      );
    return { added: charts.length, errors };
  };

  // Everything that should stay bright while a selection is active: a selected
  // planet keeps itself + every aspect partner; a selected line keeps exactly
  // its two endpoints. The wheel dims all other planets
  const related = selected
    ? new Set(
        [selected].concat(
          visible.aspects
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
    ...visible,
    aspects: visible.aspects.filter((a) => !aspectsOff[a.type]),
  };

  return (
    <div className="w-full h-svh flex">
      <SidePanel
        chart={visible}
        utcMs={utcMs}
        castMs={castMs}
        city={city}
        aspectsOff={aspectsOff}
        numerals={numerals}
        planetColors={planetColors}
        selected={selected}
        onCast={(ms, castCity) => {
          returnTween.cancel();
          // Setters batch into one render: there's never an intermediate frame
          // with the new time but the old coordinates
          setCity(castCity);
          setUtcMs(ms);
          setCastMs(ms); // casting moves the anchor double-click returns to
          setLoadedName(null); // a fresh cast belongs to no saved chart
        }}
        onToggleAspect={(type) =>
          setAspectsOff((off) => ({ ...off, [type]: !off[type] }))
        }
        onSelect={selectPlanet}
        onSetTime={(ms) => {
          returnTween.cancel();
          setUtcMs(ms);
        }}
        // saves capture utcMs — the moment on the wheel RIGHT NOW, wound or
        // dragged included — not just the last formal cast
      />
      {/* select-none: belt to the preventDefault suspenders in Chart — the
          wheel's numerals/labels and the footer must never highlight mid-drag */}
      <main className="flex-1 min-w-0 flex flex-col select-none p-4">
        {/* The wheel fills whatever space the window leaves (its container is
            flex-1, the footer is pinned below). The SVG is h-full w-full and its
            viewBox is square with the default preserveAspectRatio, so the drawing
            scales to the SMALLER of the box's width/height and stays centered —
            the chart grows and shrinks with the window, never clipping. */}
        <div className="flex-1 min-h-0 min-w-0 flex items-center justify-center">
          {/* The drag pipeline: Chart reports "user swept delta degrees" → scrub
              solves "at what time has the ascendant moved that far?" → setUtcMs →
              re-render → computeChart → every polarPoint lands differently → the
              wheel has "rotated". Nothing ever rotates; only time changes.
              Drag (onScrub) stays CONTINUOUS; scroll (onWind) snaps to minutes;
              onReturn (double-click) coasts home to the cast moment over ~0.8s. */}
          <Chart
            chart={chartView}
            showSigns={showSigns}
            numerals={numerals}
            planetColors={planetColors}
            zodiacColors={zodiacColors}
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
                  HOUSE_SYSTEM,
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
        </div>
        {/* Live caption: wallClock re-derives the city's local date & time from
            utcMs every render, so this line follows the wheel as it's dragged.
            formatDate + time (no seconds); formatDate labels BCE years. */}
        <footer className="flex-none text-center pt-2">
          {loadedName && (
            <div className="font-fell text-[24px] tracking-[0.02em]">
              {loadedName}
            </div>
          )}
          <div className="italic text-[20px] text-umber">
            {city.name}, {city.label.split(", ")[1]} ·{" "}
            {(() => {
              const wc = wallClock(city.tz, utcMs);
              return `${formatDate(wc.y, wc.mo, wc.d)} at ${wc.time}`;
            })()}{" "}
            · {HOUSE_SYSTEM} houses
          </div>
        </footer>
      </main>
      <VaultActions
        onSave={(name) => {
          const cast = { castMs: utcMs, city, houseSystem: HOUSE_SYSTEM };
          saveChart({
            name,
            ...cast,
            image: wheelImage(cast, numerals), // bake the preview at save time
          }).then(setSaved);
          setLoadedName(name); // what's on the wheel now answers to this name
        }}
        onOpenLibrary={() => setDialog("library")}
        onOpenImport={() => setDialog("import")}
      />
      <OptionsPanel
        showSigns={showSigns}
        numerals={numerals}
        planetColors={planetColors}
        zodiacColors={zodiacColors}
        hidden={hidden}
        onToggleSigns={() => setShowSigns((s) => !s)}
        onToggleNumerals={() =>
          setNumerals((n) => (n === "roman" ? "arabic" : "roman"))
        }
        onTogglePlanetColors={() => setPlanetColors((c) => !c)}
        onToggleZodiacColors={() => setZodiacColors((c) => !c)}
        onTogglePlanet={togglePlanet}
      />
      {dialog === "library" && (
        <ChartLibrary
          charts={saved}
          numerals={numerals}
          onLoad={loadChart}
          onDelete={(id) => deleteChart(id).then(setSaved)}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === "import" && (
        <ImportDialog onImport={importText} onClose={() => setDialog(null)} />
      )}
    </div>
  );
}

export default App;
