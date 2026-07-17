/** The app's data contracts. computeChart() produces a Chart; everything above
 * the engine consumes these shapes and nothing else — this file IS the seam that
 * lets the engine underneath be swapped without touching the visual layer. */

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
  /** the widest orb this aspect was allowed (base orb + any luminary bonus) —
   * so the renderer can tell how close to the edge `orb` sits, per aspect */
  maxOrb: number;
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

/** The polar→screen helper: (ecliptic longitude, radius) → [x, y]. Defined in Chart, passed to every wheel component. */
export type Polar = (longitude: number, radius: number) => [number, number];

/** house numbering style, switchable in the options panel */
export type Numerals = "roman" | "arabic";

/** One saved cast. Carries a full City snapshot (not a lookup key) so the save
 * still loads correctly even if the city list changes; houseSystem is always
 * "Placidus" today but stored so old saves stay valid once a selector exists. */
export interface SavedChart {
  id: string;
  /** what the user named it */
  name: string;
  /** the saved instant */
  castMs: number;
  city: City;
  houseSystem: HouseSystem;
  savedAt: number;
  /** the wheel as rendered at save time — SVG markup cached so the library
   * shows saves without recomputing them. Optional: absent on old saves and
   * in the localStorage mirror (it would blow the quota); the library then
   * computes the preview live instead. */
  image?: string;
}
