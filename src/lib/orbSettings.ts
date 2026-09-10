import { isTauri } from "@tauri-apps/api/core";
import { load } from "@tauri-apps/plugin-store";
import { ASPECT_DEFINITIONS, DEFAULT_ORB_CONFIG } from "../engine/assembly";
import type { OrbConfig } from "../types/";

const FILE = "settings.json";
const KEY = "orbConfig";

export const defaultOrbConfig = (): OrbConfig => ({
  aspects: { ...DEFAULT_ORB_CONFIG.aspects },
  luminaryBonus: DEFAULT_ORB_CONFIG.luminaryBonus,
});

export const validOrb = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= 0 &&
  value <= 15 &&
  Number.isInteger(value * 2);

const record = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;

export function normalizeOrbConfig(value: unknown): OrbConfig {
  const normalized = defaultOrbConfig();
  const raw = record(value);
  const aspects = record(raw?.aspects);

  for (const { type } of ASPECT_DEFINITIONS) {
    const candidate = aspects?.[type];
    if (validOrb(candidate)) normalized.aspects[type] = candidate;
  }
  if (validOrb(raw?.luminaryBonus))
    normalized.luminaryBonus = raw.luminaryBonus;

  return normalized;
}

function readMirror(): OrbConfig | null {
  try {
    const value = localStorage.getItem(KEY);
    return value === null ? null : normalizeOrbConfig(JSON.parse(value));
  } catch {
    return null;
  }
}

function writeMirror(config: OrbConfig): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(config));
    return true;
  } catch {
    return false;
  }
}

export async function loadOrbConfig(): Promise<OrbConfig> {
  const mirrored = readMirror();
  if (!isTauri()) {
    const config = mirrored ?? defaultOrbConfig();
    writeMirror(config);
    return config;
  }

  try {
    const store = await load(FILE);
    const stored = await store.get<unknown>(KEY);
    const config =
      stored === null || stored === undefined
        ? (mirrored ?? defaultOrbConfig())
        : normalizeOrbConfig(stored);

    try {
      await store.set(KEY, config);
      await store.save();
    } catch {
      // The validated value is still usable for this session and its mirror.
    }
    writeMirror(config);
    return config;
  } catch {
    const config = mirrored ?? defaultOrbConfig();
    writeMirror(config);
    return config;
  }
}

async function persist(config: OrbConfig): Promise<boolean> {
  let diskSaved = true;
  if (isTauri()) {
    try {
      const store = await load(FILE);
      await store.set(KEY, config);
      await store.save();
    } catch {
      diskSaved = false;
    }
  }

  const mirrorSaved = writeMirror(config);
  return diskSaved && mirrorSaved;
}

let writeQueue: Promise<boolean> = Promise.resolve(true);

export function saveOrbConfig(config: OrbConfig): Promise<boolean> {
  const snapshot = normalizeOrbConfig(config);
  const write = () => persist(snapshot);
  writeQueue = writeQueue.then(write, write);
  return writeQueue;
}
