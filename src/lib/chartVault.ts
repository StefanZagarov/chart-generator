import { isTauri } from "@tauri-apps/api/core";
import { load } from "@tauri-apps/plugin-store";
import type { Store } from "@tauri-apps/plugin-store";
import type { SavedChart } from "../types/";

/** Saved-chart storage. On desktop the DISK is the source of truth — a real
 * JSON file in the app's data dir (~/.local/share/com.zagarov.natalchart on
 * Linux, %APPDATA% on Windows) via the Tauri store plugin — and localStorage
 * is a wholesale mirror. In a plain browser (isTauri() false) the mirror is
 * the only backend, which is what lets the web build share this code untouched.
 * Logic: the mirror is never merged, only replaced (disk → mirror on every read
 * and write) or promoted (mirror → disk once, when the disk starts out empty —
 * the first desktop run after browser use, or after a reinstall). Sync flows in
 * one direction at a time, so there are no per-chart conflict rules to hold. */

const KEY = "savedCharts";
const FILE = "charts.json";

const readMirror = (): SavedChart[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return []; // a hand-mangled mirror must not brick the app
  }
};
const writeMirror = (charts: SavedChart[]) =>
  localStorage.setItem(KEY, JSON.stringify(charts));

// load() opens the file on first call and returns the same cached resource
// after — calling it per operation costs nothing and dodges init-order issues
async function readDisk(): Promise<{ store: Store; charts: SavedChart[] }> {
  const store = await load(FILE);
  return { store, charts: (await store.get<SavedChart[]>(KEY)) ?? [] };
}

async function writeDisk(store: Store, charts: SavedChart[]) {
  await store.set(KEY, charts);
  await store.save();
}

/** The list, per the drift rule: disk wins; an empty disk gets seeded from the
 * mirror once; the mirror always ends up equal to what this returns. */
export async function listCharts(): Promise<SavedChart[]> {
  if (!isTauri()) return readMirror();
  const { store, charts } = await readDisk();
  if (charts.length === 0) {
    const mirrored = readMirror();
    if (mirrored.length > 0) {
      await writeDisk(store, mirrored); // promote the mirror to disk
      return mirrored;
    }
  }
  writeMirror(charts);
  return charts;
}

// every mutation goes disk first, then mirror — both now hold `next`
async function persist(next: SavedChart[]): Promise<SavedChart[]> {
  if (isTauri()) {
    const { store } = await readDisk();
    await writeDisk(store, next);
  }
  writeMirror(next);
  return next;
}

/** Upsert by name: saving "Mom" twice updates the existing entry (same id)
 * instead of growing a duplicate row. Returns the fresh list. */
export async function saveChart(
  c: Omit<SavedChart, "id" | "savedAt">,
): Promise<SavedChart[]> {
  const charts = await listCharts();
  const existing = charts.find((s) => s.name === c.name);
  const entry: SavedChart = {
    ...c,
    id: existing?.id ?? crypto.randomUUID(),
    savedAt: Date.now(),
  };
  const next = existing
    ? charts.map((s) => (s.id === entry.id ? entry : s))
    : [...charts, entry];
  return persist(next);
}

/** Returns the fresh list. */
export async function deleteChart(id: string): Promise<SavedChart[]> {
  const charts = await listCharts();
  return persist(charts.filter((s) => s.id !== id));
}
