/** Types for ephemeris.js — the engine from the original Natal Chart bundle, kept verbatim. */

export type HouseSystem =
  | "Placidus"
  | "Whole Sign"
  | "Equal"
  | "Porphyry"
  | "Koch";

export type PlanetName =
  | "Sun"
  | "Moon"
  | "Mercury"
  | "Venus"
  | "Mars"
  | "Jupiter"
  | "Saturn"
  | "Uranus"
  | "Neptune"
  | "Pluto"
  | "Node";

export type AspectType =
  | "Conjunction"
  | "Sextile"
  | "Square"
  | "Trine"
  | "Opposition"
  | "Semisextile"
  | "Quincunx"
  | "Quintile"
  | "Biquintile";

export interface Planet {
  name: PlanetName;
  glyph: string;
  /** ecliptic longitude, degrees [0, 360) */
  lon: number;
  /** degrees per day; negative = retrograde */
  speed: number;
  retro: boolean;
  /** sign index 0-11, Aries = 0 */
  sign: number;
  signName: string;
  signGlyph: string;
  /** degrees within the sign, e.g. "24°12′" */
  degLabel: string;
  /** e.g. "24°12′ ♓︎" */
  posLabel: string;
  /** house number 1-12 */
  house: number;
}

export interface Aspect {
  p1: PlanetName;
  p2: PlanetName;
  g1: string;
  g2: string;
  type: AspectType;
  glyph: string;
  /** deviation from exact, degrees */
  orb: number;
  orbLabel: string;
  lon1: number;
  lon2: number;
}

export interface Chart {
  jdUT: number;
  /** ascendant longitude, degrees */
  asc: number;
  /** midheaven longitude, degrees */
  mc: number;
  /** true obliquity of the ecliptic, degrees */
  eps: number;
  /** 12 house cusp longitudes; cusps[0] = 1st house = asc */
  cusps: number[];
  planets: Planet[];
  aspects: Aspect[];
  ascLabel: string;
  mcLabel: string;
}

export interface City {
  /** "New York, USA" */
  label: string;
  /** "New York" */
  name: string;
  lat: number;
  lon: number;
  /** IANA zone, e.g. "America/New_York" */
  tz: string;
}

export interface WallClock {
  /** "YYYY-MM-DD" */
  date: string;
  /** "HH:MM" 24h */
  time: string;
  /** "14 March 1992, 07:45:00" */
  pretty: string;
}

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
