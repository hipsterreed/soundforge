import { existsSync } from "node:fs";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import Turbopuffer from "@turbopuffer/turbopuffer";
import { getEmbedding } from "./embeddings";

const tpuf = new Turbopuffer({
  apiKey: process.env.TURBOPUFFER_API_KEY ?? "",
  region: process.env.TURBOPUFFER_REGION ?? "aws-us-east-1",
});

const VECTOR_DIM = 384;
const ns = tpuf.namespace("motif-library");
const LIB_PATH = join("./tmp", "motif-library.json");

export interface LibraryItem {
  id: string;           // UUID string
  tpufId: number;       // numeric id for turbopuffer
  description: string;  // user's prompt
  matchedScene: string; // resonance blueprint match
  musicUrl: string;
  sfx1Url: string | null;
  sfx2Url: string | null;
  mood: string;
  energy: number;
  tags: string[];
  createdAt: number;    // unix ms
}

// ── JSON file ────────────────────────────────────────────────

async function readLibrary(): Promise<LibraryItem[]> {
  if (!existsSync(LIB_PATH)) return [];
  try {
    const raw = await readFile(LIB_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeLibrary(items: LibraryItem[]): Promise<void> {
  if (!existsSync("./tmp")) await mkdir("./tmp", { recursive: true });
  await writeFile(LIB_PATH, JSON.stringify(items, null, 2));
}

export async function getAllItems(): Promise<LibraryItem[]> {
  const items = await readLibrary();
  return items.sort((a, b) => b.createdAt - a.createdAt);
}

export async function addItem(item: LibraryItem): Promise<void> {
  const items = await readLibrary();
  items.unshift(item);
  await writeLibrary(items);
}

export async function removeItem(id: string): Promise<void> {
  const items = await readLibrary();
  await writeLibrary(items.filter((i) => i.id !== id));
  // Also remove from turbopuffer
  const item = items.find((i) => i.id === id);
  if (item) {
    await ns.write({ delete_ids: [item.tpufId] } as any);
  }
}

// ── Turbopuffer ──────────────────────────────────────────────

export async function indexItem(item: LibraryItem): Promise<void> {
  const vector = await getEmbedding(item.description);
  await ns.write({
    upsert_rows: [{
      id: item.tpufId,
      vector,
      description: item.description,
      mood: item.mood,
      energy: item.energy,
      tags: item.tags.join(", "),
    }],
    distance_metric: "cosine_distance",
    schema: {
      vector: { type: `[${VECTOR_DIM}]f32`, ann: true },
      description: { type: "string", full_text_search: true },
      mood: { type: "string" },
      energy: { type: "float" },
      tags: { type: "string" },
    },
  } as any);
}

export async function searchLibrary(query: string, limit = 20): Promise<LibraryItem[]> {
  let vector: number[];
  try {
    vector = await getEmbedding(query);
  } catch {
    return [];
  }

  let result: any;
  try {
    result = await ns.query({
      rank_by: ["vector", "ANN", vector],
      top_k: limit,
      include_attributes: false,
      distance_metric: "cosine_distance",
    });
  } catch {
    return [];
  }

  if (!result?.rows?.length) return [];

  const ids = new Set<number>(result.rows.map((r: any) => Number(r.id)));
  const all = await readLibrary();
  const ordered: LibraryItem[] = [];
  for (const row of result.rows) {
    const item = all.find((i) => i.tpufId === Number(row.id));
    if (item) ordered.push(item);
  }
  return ordered;
}

export async function findSimilar(description: string, excludeId: string, limit = 6): Promise<LibraryItem[]> {
  const results = await searchLibrary(description, limit + 1);
  return results.filter((r) => r.id !== excludeId).slice(0, limit);
}
