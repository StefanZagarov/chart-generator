import { renderToStaticMarkup } from "react-dom/server";
import { MiniWheel } from "../components/chart/MiniWheel";
import type { Numerals, SavedChart } from "../types/";

/** The save-time image cache: render the save's MiniWheel once, keep the SVG
 * markup string in the save itself. The library then just injects the string —
 * no computeChart per box. Same component in, same pixels out; the only thing
 * frozen is the moment of rendering (a cached image keeps the numeral style
 * and wheel styling it was saved with). */
export function wheelImage(
  saved: Pick<SavedChart, "castMs" | "city" | "houseSystem">,
  numerals: Numerals,
): string {
  return renderToStaticMarkup(<MiniWheel saved={saved} numerals={numerals} />);
}
