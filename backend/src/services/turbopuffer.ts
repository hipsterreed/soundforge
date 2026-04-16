import Turbopuffer from "@turbopuffer/turbopuffer";

const tpuf = new Turbopuffer({
  apiKey: process.env.TURBOPUFFER_API_KEY ?? "",
  region: process.env.TURBOPUFFER_REGION ?? "aws-us-east-1",
});

// Embedding dimension for Xenova/all-MiniLM-L6-v2
const VECTOR_DIM = 384;

// ─── RESONANCE namespace ───────────────────────────────────────

const resonanceNs = tpuf.namespace("resonance-blueprints");

export interface SearchResult {
  id: number;
  dist: number;
  description: string;
  music_prompt: string;
  sfx_prompt_1: string;
  sfx_prompt_2: string;
  mood: string;
  energy: number;
  tags: string;
}

export async function searchSonicBlueprints(
  vector: number[],
  limit = 5
): Promise<SearchResult[]> {
  const result = await resonanceNs.query({
    rank_by: ["vector", "ANN", vector],
    top_k: limit,
    include_attributes: true,
    distance_metric: "cosine_distance",
  });

  return (result.rows ?? []).map((row: any) => ({
    id: Number(row.id),
    dist: row.$dist ?? 0,
    description: String(row.description ?? ""),
    music_prompt: String(row.music_prompt ?? ""),
    sfx_prompt_1: String(row.sfx_prompt_1 ?? ""),
    sfx_prompt_2: String(row.sfx_prompt_2 ?? ""),
    mood: String(row.mood ?? ""),
    energy: Number(row.energy ?? 0.5),
    tags: String(row.tags ?? ""),
  }));
}

export async function upsertBlueprints(
  rows: {
    id: number;
    vector: number[];
    description: string;
    music_prompt: string;
    sfx_prompt_1: string;
    sfx_prompt_2: string;
    mood: string;
    energy: number;
    tags: string;
  }[]
): Promise<void> {
  await resonanceNs.write({
    upsert_rows: rows.map((r) => ({
      id: r.id,
      vector: r.vector,
      description: r.description,
      music_prompt: r.music_prompt,
      sfx_prompt_1: r.sfx_prompt_1,
      sfx_prompt_2: r.sfx_prompt_2,
      mood: r.mood,
      energy: r.energy,
      tags: r.tags,
    })),
    distance_metric: "cosine_distance",
    schema: {
      vector: { type: `[${VECTOR_DIM}]f32`, ann: true },
      description: { type: "string", full_text_search: true },
      mood: { type: "string" },
      energy: { type: "float" },
      tags: { type: "string" },
      music_prompt: { type: "string" },
      sfx_prompt_1: { type: "string" },
      sfx_prompt_2: { type: "string" },
    },
  } as any);
}

export async function namespaceExists(): Promise<boolean> {
  return resonanceNs.exists();
}

// ─── SAGA namespace ────────────────────────────────────────────

const sagaNs = tpuf.namespace("saga-blueprints");

export interface SagaSearchResult {
  id: number;
  dist: number;
  description: string;
  campaign_type: string;
  music_prompt: string;
  sfx_prompt_1: string;
  sfx_prompt_2: string;
  mood: string;
  energy: number;
  tags: string;
}

export async function searchSagaBlueprints(
  vector: number[],
  campaignType: string | null = null,
  limit = 5
): Promise<SagaSearchResult[]> {
  const query: any = {
    rank_by: ["vector", "ANN", vector],
    top_k: limit,
    include_attributes: true,
    distance_metric: "cosine_distance",
  };

  if (campaignType) {
    query.filters = ["campaign_type", "Eq", campaignType];
  }

  const result = await sagaNs.query(query);

  return (result.rows ?? []).map((row: any) => ({
    id: Number(row.id),
    dist: row.$dist ?? 0,
    description: String(row.description ?? ""),
    campaign_type: String(row.campaign_type ?? ""),
    music_prompt: String(row.music_prompt ?? ""),
    sfx_prompt_1: String(row.sfx_prompt_1 ?? ""),
    sfx_prompt_2: String(row.sfx_prompt_2 ?? ""),
    mood: String(row.mood ?? ""),
    energy: Number(row.energy ?? 0.5),
    tags: String(row.tags ?? ""),
  }));
}

export async function upsertSagaBlueprints(
  rows: {
    id: number;
    vector: number[];
    description: string;
    campaign_type: string;
    music_prompt: string;
    sfx_prompt_1: string;
    sfx_prompt_2: string;
    mood: string;
    energy: number;
    tags: string;
  }[]
): Promise<void> {
  await sagaNs.write({
    upsert_rows: rows.map((r) => ({
      id: r.id,
      vector: r.vector,
      description: r.description,
      campaign_type: r.campaign_type,
      music_prompt: r.music_prompt,
      sfx_prompt_1: r.sfx_prompt_1,
      sfx_prompt_2: r.sfx_prompt_2,
      mood: r.mood,
      energy: r.energy,
      tags: r.tags,
    })),
    distance_metric: "cosine_distance",
    schema: {
      vector: { type: `[${VECTOR_DIM}]f32`, ann: true },
      description: { type: "string", full_text_search: true },
      campaign_type: { type: "string" },
      mood: { type: "string" },
      energy: { type: "float" },
      tags: { type: "string" },
      music_prompt: { type: "string" },
      sfx_prompt_1: { type: "string" },
      sfx_prompt_2: { type: "string" },
    },
  } as any);
}

export async function sagaNamespaceExists(): Promise<boolean> {
  return sagaNs.exists();
}
