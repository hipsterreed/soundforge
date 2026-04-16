import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const DATA_DIR = "./data";

function ensureDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function read<T>(file: string): T[] {
  ensureDir();
  const p = join(DATA_DIR, file);
  if (!existsSync(p)) return [];
  try {
    return JSON.parse(readFileSync(p, "utf-8")) as T[];
  } catch {
    return [];
  }
}

function write<T>(file: string, data: T[]): void {
  ensureDir();
  writeFileSync(join(DATA_DIR, file), JSON.stringify(data, null, 2), "utf-8");
}

// ── Types ───────────────────────────────────────────────────────────────────

export interface AudioClip {
  id: string;
  label: string;
  prompt: string;
  url: string;
  duration: number;
  tags: string[];
  createdAt: string;
}

export interface VoiceLine {
  id: string;
  text: string;
  label: string;
  url: string;
  tags: string[];
  createdAt: string;
}

export interface Sprite {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  imagePath: string;
  frameWidth: number;
  frameHeight: number;
  columns: number;
  rows: number;
  totalFrames: number;
  scale: number;
  animFps: number;
  audioClips: AudioClip[];
  voiceLines: VoiceLine[];
  music: MapMusic | null;
  tags: string[];
  createdAt: string;
}

export interface MapMusic {
  url: string;
  prompt: string;
  createdAt: string;
}

export interface MapTrack {
  id: string;
  url: string;
  prompt: string;
  createdAt: string;
}

export interface GameMap {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  imagePath: string;
  tracks: MapTrack[];
  tags: string[];
  createdAt: string;
}

// ── Sprites ─────────────────────────────────────────────────────────────────

export function getSprite(id: string): Sprite | null {
  const s = read<Sprite>("sprites.json").find((s) => s.id === id) ?? null;
  if (s) {
    if (!s.voiceLines) s.voiceLines = [];
    if (!s.tags) s.tags = [];
    s.audioClips = (s.audioClips ?? []).map((c) => ({ ...c, tags: c.tags ?? [] }));
    s.voiceLines = s.voiceLines.map((l) => ({ ...l, tags: l.tags ?? [] }));
  }
  return s;
}

export function getSprites(): Sprite[] {
  return read<Sprite>("sprites.json")
    .map((s) => ({
      ...s,
      voiceLines: (s.voiceLines ?? []).map((l) => ({ ...l, tags: l.tags ?? [] })),
      tags: s.tags ?? [],
      audioClips: (s.audioClips ?? []).map((c) => ({ ...c, tags: c.tags ?? [] })),
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function createSprite(
  data: Omit<Sprite, "id" | "audioClips" | "voiceLines" | "music" | "createdAt">
): string {
  const sprites = read<Sprite>("sprites.json");
  const sprite: Sprite = {
    id: crypto.randomUUID(),
    ...data,
    audioClips: [],
    voiceLines: [],
    music: null,
    createdAt: new Date().toISOString(),
  };
  sprites.push(sprite);
  write("sprites.json", sprites);
  return sprite.id;
}

export function updateSprite(
  id: string,
  data: Partial<Omit<Sprite, "id" | "createdAt">>
): void {
  const sprites = read<Sprite>("sprites.json");
  const idx = sprites.findIndex((s) => s.id === id);
  if (idx === -1) return;
  sprites[idx] = { ...sprites[idx], ...data };
  write("sprites.json", sprites);
}

export function deleteSprite(id: string): void {
  write(
    "sprites.json",
    read<Sprite>("sprites.json").filter((s) => s.id !== id)
  );
}

export function addAudioClip(
  spriteId: string,
  clip: Omit<AudioClip, "id" | "createdAt">
): AudioClip {
  const sprites = read<Sprite>("sprites.json");
  const idx = sprites.findIndex((s) => s.id === spriteId);
  if (idx === -1) throw new Error("Sprite not found");
  const newClip: AudioClip = {
    id: crypto.randomUUID(),
    ...clip,
    tags: clip.tags ?? [],
    createdAt: new Date().toISOString(),
  };
  sprites[idx].audioClips = [...sprites[idx].audioClips, newClip];
  write("sprites.json", sprites);
  return newClip;
}

export function addVoiceLine(
  spriteId: string,
  line: Omit<VoiceLine, "id" | "createdAt">
): VoiceLine {
  const sprites = read<Sprite>("sprites.json");
  const idx = sprites.findIndex((s) => s.id === spriteId);
  if (idx === -1) throw new Error("Sprite not found");
  const newLine: VoiceLine = {
    id: crypto.randomUUID(),
    ...line,
    tags: line.tags ?? [],
    createdAt: new Date().toISOString(),
  };
  sprites[idx].voiceLines = [...(sprites[idx].voiceLines ?? []), newLine];
  write("sprites.json", sprites);
  return newLine;
}

export function removeVoiceLine(spriteId: string, lineId: string): void {
  const sprites = read<Sprite>("sprites.json");
  const idx = sprites.findIndex((s) => s.id === spriteId);
  if (idx === -1) return;
  sprites[idx].voiceLines = (sprites[idx].voiceLines ?? []).filter((l) => l.id !== lineId);
  write("sprites.json", sprites);
}

export function removeAudioClip(spriteId: string, clipId: string): void {
  const sprites = read<Sprite>("sprites.json");
  const idx = sprites.findIndex((s) => s.id === spriteId);
  if (idx === -1) return;
  sprites[idx].audioClips = sprites[idx].audioClips.filter(
    (c) => c.id !== clipId
  );
  write("sprites.json", sprites);
}

// ── Maps ────────────────────────────────────────────────────────────────────

type RawMap = Omit<GameMap, "tracks" | "tags"> & { tracks?: MapTrack[]; music?: MapMusic | null; tags?: string[] };

function migrateMap(raw: RawMap): GameMap {
  const tracks = raw.tracks ?? (raw.music ? [{ id: crypto.randomUUID(), ...raw.music }] : []);
  const tags = raw.tags ?? [];
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { music: _m, ...rest } = raw as RawMap & { music?: unknown };
  return { ...rest, tracks, tags };
}

export function getMaps(): GameMap[] {
  return read<RawMap>("maps.json")
    .map(migrateMap)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getMap(id: string): GameMap | null {
  const raw = read<RawMap>("maps.json").find((m) => m.id === id);
  return raw ? migrateMap(raw) : null;
}

export function createMap(
  data: Omit<GameMap, "id" | "tracks" | "createdAt">
): string {
  const maps = read<RawMap>("maps.json");
  const map: GameMap = {
    id: crypto.randomUUID(),
    ...data,
    tracks: [],
    createdAt: new Date().toISOString(),
  };
  maps.push(map);
  write("maps.json", maps);
  return map.id;
}

export function updateMap(id: string, data: Partial<Pick<GameMap, "name" | "description" | "tags">>): void {
  const maps = read<RawMap>("maps.json");
  const idx = maps.findIndex((m) => m.id === id);
  if (idx === -1) return;
  maps[idx] = { ...maps[idx], ...data };
  write("maps.json", maps);
}

export function deleteMap(id: string): void {
  write(
    "maps.json",
    read<RawMap>("maps.json").filter((m) => m.id !== id)
  );
}

export function addMapTrack(mapId: string, track: Omit<MapTrack, "id" | "createdAt">): MapTrack {
  const maps = read<RawMap>("maps.json");
  const idx = maps.findIndex((m) => m.id === mapId);
  if (idx === -1) throw new Error("Map not found");
  const newTrack: MapTrack = { id: crypto.randomUUID(), ...track, createdAt: new Date().toISOString() };
  const migrated = migrateMap(maps[idx]);
  maps[idx] = { ...migrated, tracks: [...migrated.tracks, newTrack] };
  write("maps.json", maps);
  return newTrack;
}

export function removeMapTrack(mapId: string, trackId: string): void {
  const maps = read<RawMap>("maps.json");
  const idx = maps.findIndex((m) => m.id === mapId);
  if (idx === -1) return;
  const migrated = migrateMap(maps[idx]);
  maps[idx] = { ...migrated, tracks: migrated.tracks.filter((t) => t.id !== trackId) };
  write("maps.json", maps);
}

export function setSpriteMusic(id: string, music: MapMusic | null): void {
  updateSprite(id, { music });
}

/** @deprecated use addMapTrack / removeMapTrack */
export function setMapMusic(id: string, music: MapMusic | null): void {
  if (music) {
    addMapTrack(id, music);
  }
}

// ── Tags ─────────────────────────────────────────────────────────────────────

export function getAllTags(): string[] {
  const sprites = getSprites();
  const maps = getMaps();
  const tagSet = new Set<string>();

  for (const sprite of sprites) {
    for (const t of sprite.tags ?? []) tagSet.add(t);
    for (const clip of sprite.audioClips ?? []) {
      for (const t of clip.tags ?? []) tagSet.add(t);
    }
    for (const line of sprite.voiceLines ?? []) {
      for (const t of line.tags ?? []) tagSet.add(t);
    }
  }
  for (const map of maps) {
    for (const t of map.tags ?? []) tagSet.add(t);
  }

  return Array.from(tagSet).sort();
}

export function updateAudioClipTags(spriteId: string, clipId: string, tags: string[]): void {
  const sprites = read<Sprite>("sprites.json");
  const idx = sprites.findIndex((s) => s.id === spriteId);
  if (idx === -1) return;
  const clipIdx = sprites[idx].audioClips.findIndex((c) => c.id === clipId);
  if (clipIdx === -1) return;
  sprites[idx].audioClips[clipIdx] = { ...sprites[idx].audioClips[clipIdx], tags };
  write("sprites.json", sprites);
}
