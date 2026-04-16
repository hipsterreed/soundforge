import type { Sprite, GameMap, MapTrack, AudioClip, VoiceLine, SpriteFormData, MapFormData } from "../types";

export interface RelatedAsset {
  id: string;
  type: "sprite" | "map";
  name: string;
  tags: string[];
  score: number;
}

export interface SpriteFrameData {
  frameWidth: number;
  frameHeight: number;
  columns: number;
  rows: number;
  previewCol: number;
  previewRow: number;
}

export interface GraphNode {
  id: string;
  type: "sprite" | "map" | "clip";
  name: string;
  tags: string[];
  imageUrl?: string;
  parentId?: string;
  spriteFrame?: SpriteFrameData;
}

export interface GraphEdge {
  from: string;
  to: string;
  score: number;
  isParent?: boolean;
}

export const apiBase = (import.meta.env.VITE_API_BASE as string) || "";

async function api<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(apiBase + path, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

function json(body: unknown): RequestInit {
  return {
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

// ── Sprites ──────────────────────────────────────────────────────────────────

export async function getSprites(): Promise<Sprite[]> {
  return api<Sprite[]>("/api/game/sprites");
}

export async function getSprite(id: string): Promise<Sprite | null> {
  const res = await fetch(apiBase + `/api/game/sprites/${id}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to fetch sprite (${res.status})`);
  return res.json() as Promise<Sprite>;
}

export async function createSprite(
  data: Omit<SpriteFormData, "file"> & { imageUrl: string; imagePath: string }
): Promise<string> {
  const { id } = await api<{ id: string }>("/api/game/sprites", {
    method: "POST",
    ...json(data),
  });
  return id;
}

export async function updateSprite(
  id: string,
  data: Partial<Sprite>
): Promise<void> {
  await api(`/api/game/sprites/${id}`, { method: "PUT", ...json(data) });
}

export async function deleteSprite(id: string): Promise<void> {
  await api(`/api/game/sprites/${id}`, { method: "DELETE" });
}

export async function addAudioClip(
  spriteId: string,
  clip: Omit<AudioClip, "id" | "createdAt">
): Promise<void> {
  await api(`/api/game/sprites/${spriteId}/clips`, {
    method: "POST",
    ...json(clip),
  });
}

export async function deleteAudioClip(
  spriteId: string,
  clipId: string
): Promise<void> {
  await api(`/api/game/sprites/${spriteId}/clips/${clipId}`, {
    method: "DELETE",
  });
}

// ── Maps ─────────────────────────────────────────────────────────────────────

export async function getMaps(): Promise<GameMap[]> {
  return api<GameMap[]>("/api/game/maps");
}

export async function getMap(id: string): Promise<GameMap | null> {
  const res = await fetch(apiBase + `/api/game/maps/${id}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to fetch map (${res.status})`);
  return res.json() as Promise<GameMap>;
}

export async function createMap(
  data: Omit<MapFormData, "file"> & { imageUrl: string; imagePath: string }
): Promise<string> {
  const { id } = await api<{ id: string }>("/api/game/maps", {
    method: "POST",
    ...json(data),
  });
  return id;
}

export async function updateMap(
  id: string,
  data: Partial<Pick<GameMap, "name" | "description">>
): Promise<void> {
  await api(`/api/game/maps/${id}`, { method: "PUT", ...json(data) });
}

export async function deleteMap(id: string): Promise<void> {
  await api(`/api/game/maps/${id}`, { method: "DELETE" });
}

export async function addVoiceLine(
  spriteId: string,
  line: Omit<VoiceLine, "id" | "createdAt">
): Promise<void> {
  await api(`/api/game/sprites/${spriteId}/voice-lines`, {
    method: "POST",
    ...json(line),
  });
}

export async function deleteVoiceLine(
  spriteId: string,
  lineId: string
): Promise<void> {
  await api(`/api/game/sprites/${spriteId}/voice-lines/${lineId}`, {
    method: "DELETE",
  });
}

export async function setSpriteMusic(
  spriteId: string,
  music: { url: string; prompt: string } | null
): Promise<void> {
  await api(`/api/game/sprites/${spriteId}/music`, {
    method: "PUT",
    ...json({ music }),
  });
}

export async function addMapTrack(
  mapId: string,
  track: Pick<MapTrack, "url" | "prompt">
): Promise<MapTrack> {
  return api<MapTrack>(`/api/game/maps/${mapId}/tracks`, {
    method: "POST",
    ...json(track),
  });
}

export async function removeMapTrack(mapId: string, trackId: string): Promise<void> {
  await api(`/api/game/maps/${mapId}/tracks/${trackId}`, { method: "DELETE" });
}

// ── Tags ─────────────────────────────────────────────────────────────────────

export async function updateTags(
  assetId: string,
  type: "sprite" | "map",
  tags: string[]
): Promise<void> {
  const base = type === "sprite" ? "sprites" : "maps";
  await api(`/api/game/${base}/${assetId}/tags`, {
    method: "PUT",
    ...json({ tags }),
  });
}

export async function getExistingTags(): Promise<string[]> {
  const { tags } = await api<{ tags: string[] }>("/api/game/tags");
  return tags;
}

export async function suggestTags(
  label: string,
  prompt: string,
  spriteName: string,
  spriteDescription: string
): Promise<string[]> {
  const { tags } = await api<{ tags: string[] }>("/api/game/suggest-tags", {
    method: "POST",
    ...json({ label, prompt, spriteName, spriteDescription }),
  });
  return tags;
}

export async function updateAudioClipTags(
  spriteId: string,
  clipId: string,
  tags: string[]
): Promise<void> {
  await api(`/api/game/sprites/${spriteId}/clips/${clipId}/tags`, {
    method: "PUT",
    ...json({ tags }),
  });
}

// ── Related assets ────────────────────────────────────────────────────────────

export async function getRelated(
  assetId: string,
  type: "sprite" | "map"
): Promise<RelatedAsset[]> {
  const base = type === "sprite" ? "sprites" : "maps";
  const { related } = await api<{ related: RelatedAsset[] }>(
    `/api/game/${base}/${assetId}/related`
  );
  return related;
}

// ── Graph ─────────────────────────────────────────────────────────────────────

export async function getGraph(): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  return api<{ nodes: GraphNode[]; edges: GraphEdge[] }>("/api/game/graph");
}
