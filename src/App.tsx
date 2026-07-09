import { Chart } from "./components/chart/Chart";
import { computeChart } from "./engine/ephemeris";

const chart = computeChart(
  Date.UTC(1992, 2, 14, 12, 45),
  40.7128,
  -74.006,
  "Placidus",
);
// TODO: Check if the engine is pure (no edits from Claude besides the raw city data)
// TODO: Check if there are any better engines
function App() {
  return (
    <div className="w-full h-svh">
      <h1 className="">Natal Chart</h1>
      <Chart chart={chart} />
    </div>
  );
}

export default App;
