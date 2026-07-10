export type {
  Chart,
  Planet,
  Aspect,
  HouseSystem,
  City,
  WallClock,
} from "../engine/ephemeris";

/** The polar→screen helper: (ecliptic longitude, radius) → [x, y]. Defined in Chart, passed to every wheel component. */
export type Polar = (longitude: number, radius: number) => [number, number];
