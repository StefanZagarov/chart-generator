/** Declarations for ephemeris.js — the engine from the original Natal Chart bundle,
 * kept verbatim. The data shapes themselves live in src/types (the swap seam);
 * this file only declares what the old engine exports.
 * (Runtime charts also carry an `eps` field the app never uses — untyped on purpose.) */

import type { Chart, City, HouseSystem, WallClock } from "../types/";

export const SIGN_NAMES: string[];
export const SIGN_GLYPHS: string[];
export const CITIES: City[];
export function findCity(query: string): City | null;
export function localToUTC(
  date: string,
  time: string,
  tz: string,
): { utcMs: number; offsetMin: number };
export function offsetLabel(tz: string, utcMs: number): string;
export function wallClock(tz: string, utcMs: number): WallClock;
export function prettyDate(date: string): string;
export function computeChart(
  utcMs: number,
  lat: number,
  lon: number,
  houseSystem?: HouseSystem,
): Chart;

declare const Astro: {
  SIGN_NAMES: typeof SIGN_NAMES;
  SIGN_GLYPHS: typeof SIGN_GLYPHS;
  CITIES: typeof CITIES;
  findCity: typeof findCity;
  localToUTC: typeof localToUTC;
  offsetLabel: typeof offsetLabel;
  wallClock: typeof wallClock;
  prettyDate: typeof prettyDate;
  computeChart: typeof computeChart;
};
export default Astro;
