import type { Numerals, PlanetName } from "../../types/";

const INK = "#4a3826";

export const ASP_COLOR: Record<string, string> = {
  Conjunction: "#e0851f",
  Opposition: "#b32d14",
  Square: "#b32d14",
  Trine: "#1d4e89",
  Sextile: "#1d4e89",
  Semisextile: "#1d8a44",
  Quincunx: "#1d8a44",
  Semisquare: "#7f1d1d",
  Sesquisquare: "#7f1d1d",
  Quintile: "#00b8d9",
  Biquintile: "#00b8d9",
};

export const PLANET_COLOR: Record<PlanetName, string> = {
  Sun: "#b32d14",
  Mars: "#b32d14",
  Jupiter: "#b32d14",
  Moon: "#1d4e89",
  Neptune: "#1d4e89",
  Pluto: "#1d4e89",
  Mercury: "#e0851f",
  Venus: "#e0851f",
  Uranus: "#e0851f",
  Saturn: "#185c34",
  "North Node": INK,
  "South Node": INK,
};

const ROMAN_NUMERALS = [
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
  "X",
  "XI",
  "XII",
];

export const houseLabel = (index: number, numerals: Numerals) =>
  numerals === "roman" ? ROMAN_NUMERALS[index] : String(index + 1);
