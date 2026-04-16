/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck – @huggingface/transformers exports a very large union type
//               that exceeds TypeScript's complexity limit; suppress all errors.

import { pipeline, env } from "@huggingface/transformers";

// Cache downloaded model files locally so second start is instant
(env as any).cacheDir = "./.cache/transformers";
(env as any).allowLocalModels = false;

let embedder: any = null;

async function getEmbedder(): Promise<any> {
  if (!embedder) {
    console.log("⚡ Loading embedding model (first run downloads ~23MB)...");
    embedder = await (pipeline as any)(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2",
      { dtype: "fp32" }
    );
    console.log("✅ Embedding model ready");
  }
  return embedder;
}

export async function getEmbedding(text: string): Promise<number[]> {
  const embed = await getEmbedder();
  const output = await embed(text, { pooling: "mean", normalize: true });
  return Array.from(output.data as Float32Array);
}

export async function warmUpEmbedder(): Promise<void> {
  await getEmbedder();
}
