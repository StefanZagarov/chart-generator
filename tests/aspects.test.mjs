import assert from "node:assert/strict";
import test, { before } from "node:test";
import { runnerImport } from "vite";

let assembleChart;
let ASPECT_DEFINITIONS;
let ASP_COLOR;

before(async () => {
  const [assembly, presentation] = await Promise.all([
    runnerImport("./src/engine/assembly.ts"),
    runnerImport("./src/components/chart/chartPresentation.ts"),
  ]);
  ({ assembleChart, ASPECT_DEFINITIONS } = assembly.module);
  ({ ASP_COLOR } = presentation.module);
});

const cusps = Array.from({ length: 12 }, (_, index) => index * 30);

function aspectAt(separation, first = "Mercury") {
  return assembleChart(
    0,
    [
      { name: first, lon: 0, speed: 1 },
      { name: "Venus", lon: separation, speed: 1 },
    ],
    0,
    0,
    cusps,
  ).aspects[0];
}

test("calculates semisquare and sesquisquare as two-degree minor aspects", () => {
  assert.equal(aspectAt(45)?.type, "Semisquare");
  assert.equal(aspectAt(135)?.type, "Sesquisquare");
  assert.equal(aspectAt(47)?.type, "Semisquare");
  assert.equal(aspectAt(47.5, "Sun"), undefined);
});

test("derives an aspect-free South Node opposite the mean North Node", () => {
  const chart = assembleChart(
    0,
    [
      { name: "Sun", lon: 250, speed: 1 },
      { name: "North Node", lon: 250, speed: -0.05 },
    ],
    0,
    0,
    cusps,
  );
  const north = chart.planets.find(({ name }) => name === "North Node");
  const south = chart.planets.find(({ name }) => name === "South Node");

  assert.equal(north?.lon, 250);
  assert.equal(north?.glyph, "☊︎");
  assert.equal(north?.retro, false);
  assert.equal(south?.lon, 70);
  assert.equal(south?.glyph, "☋︎");
  assert.equal(south?.retro, false);
  assert.equal(south?.signName, "Gemini");
  assert.equal(south?.house, 3);
  assert.deepEqual(chart.aspects, []);
});

test("presents both new aspects in darker red", () => {
  assert.equal(ASP_COLOR.Semisquare, "#7f1d1d");
  assert.equal(ASP_COLOR.Sesquisquare, "#7f1d1d");
});

test("orders aspect controls canonically", () => {
  const expected = [
    "Conjunction",
    "Opposition",
    "Square",
    "Trine",
    "Sextile",
    "Semisextile",
    "Quincunx",
    "Semisquare",
    "Sesquisquare",
    "Quintile",
    "Biquintile",
  ];
  assert.deepEqual(Object.keys(ASP_COLOR), expected);
  assert.deepEqual(
    ASPECT_DEFINITIONS.map(({ type }) => type),
    expected,
  );
});
