import Turbopuffer from "@turbopuffer/turbopuffer";
import { getEmbedding } from "./embeddings";

const VECTOR_DIM = 384;

const tpuf = new Turbopuffer({
  apiKey: process.env.TURBOPUFFER_API_KEY ?? "",
  region: process.env.TURBOPUFFER_REGION ?? "aws-us-east-1",
});

const ns = tpuf.namespace("game-assets");

// ── Index ────────────────────────────────────────────────────────────────────

export async function indexAsset(
  id: string,
  type: "sprite" | "map",
  name: string,
  description: string,
  tags: string[]
): Promise<void> {
  const text = `${name}. ${description}. Tags: ${tags.join(", ")}`;
  const vector = await getEmbedding(text);

  await (ns.write as any)({
    upsert_rows: [
      {
        id,
        vector,
        type,
        name,
        description,
        tags: tags.join(", "),
      },
    ],
    distance_metric: "cosine_distance",
    schema: {
      vector: { type: `[${VECTOR_DIM}]f32`, ann: true },
      type: { type: "string" },
      name: { type: "string" },
      description: { type: "string" },
      tags: { type: "string" },
    },
  });
}

// ── Remove ───────────────────────────────────────────────────────────────────

export async function removeFromIndex(id: string): Promise<void> {
  try {
    await (ns.write as any)({ delete_ids: [id] });
  } catch {
    // swallow errors — namespace may not exist yet
  }
}

// ── Related ──────────────────────────────────────────────────────────────────

export interface RelatedAsset {
  id: string;
  type: "sprite" | "map";
  name: string;
  tags: string[];
  score: number;
}

export async function findRelated(
  currentId: string,
  name: string,
  description: string,
  tags: string[],
  limit = 6
): Promise<RelatedAsset[]> {
  try {
    const text = `${name}. ${description}. Tags: ${tags.join(", ")}`;
    const vector = await getEmbedding(text);

    const result = await ns.query({
      rank_by: ["vector", "ANN", vector],
      top_k: limit + 1,
      include_attributes: true,
      distance_metric: "cosine_distance",
    } as any);

    const rows = (result.rows ?? []) as any[];

    return rows
      .filter((row: any) => String(row.id) !== currentId)
      .slice(0, limit)
      .map((row: any) => ({
        id: String(row.id),
        type: (row.type ?? "sprite") as "sprite" | "map",
        name: String(row.name ?? ""),
        tags: String(row.tags ?? "")
          .split(",")
          .map((t: string) => t.trim())
          .filter(Boolean),
        // cosine_distance: 0 = identical, 2 = opposite; convert to similarity score
        score: Math.max(0, 1 - (row.$dist ?? 1)),
      }));
  } catch {
    return [];
  }
}

// ── Graph ────────────────────────────────────────────────────────────────────

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
  description: string;
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

function tagOverlapScore(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a.map((t) => t.toLowerCase()));
  const shared = b.filter((t) => setA.has(t.toLowerCase())).length;
  return shared / Math.max(a.length, b.length);
}

export function computeGraph(
  nodes: GraphNode[],
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  if (nodes.length === 0) return { nodes: [], edges: [] };

  // Parent-child edges (clip → sprite)
  const parentEdges: GraphEdge[] = nodes
    .filter((n) => n.parentId)
    .map((n) => ({ from: n.parentId!, to: n.id, score: 1, isParent: true }));

  // Tag-overlap edges between non-clip nodes
  const similarityNodes = nodes.filter((n) => !n.parentId);
  const tagEdges: GraphEdge[] = [];

  for (let i = 0; i < similarityNodes.length; i++) {
    for (let j = i + 1; j < similarityNodes.length; j++) {
      const score = tagOverlapScore(similarityNodes[i].tags, similarityNodes[j].tags);
      if (score > 0) {
        tagEdges.push({ from: similarityNodes[i].id, to: similarityNodes[j].id, score });
      }
    }
  }

  return { nodes, edges: [...parentEdges, ...tagEdges] };
}
