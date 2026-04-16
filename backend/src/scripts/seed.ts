#!/usr/bin/env bun
/**
 * Seed script: computes embeddings for all 70 sonic blueprints
 * and upserts them into turbopuffer.
 *
 * Run: bun run seed
 */
import { config } from "../config";
import { blueprints } from "../data/blueprints";
import { getEmbedding } from "../services/embeddings";
import { upsertBlueprints } from "../services/turbopuffer";

const BATCH_SIZE = 10;

async function seed() {
  console.log("🌱 Resonance seed script starting...\n");
  console.log(`📦 ${blueprints.length} sonic blueprints to embed and index\n`);

  const rows: Parameters<typeof upsertBlueprints>[0] = [];

  for (let i = 0; i < blueprints.length; i++) {
    const bp = blueprints[i];
    process.stdout.write(
      `[${i + 1}/${blueprints.length}] Embedding: "${bp.description.slice(0, 50)}..." `
    );

    const vector = await getEmbedding(bp.description);
    rows.push({
      id: bp.id,
      vector,
      description: bp.description,
      music_prompt: bp.music_prompt,
      sfx_prompt_1: bp.sfx_prompt_1,
      sfx_prompt_2: bp.sfx_prompt_2,
      mood: bp.mood,
      energy: bp.energy,
      tags: bp.tags,
    });

    process.stdout.write("✓\n");

    // Batch upsert every BATCH_SIZE rows
    if (rows.length === BATCH_SIZE || i === blueprints.length - 1) {
      process.stdout.write(`  → Upserting batch of ${rows.length} to turbopuffer... `);
      await upsertBlueprints(rows);
      rows.length = 0;
      process.stdout.write("✓\n\n");
    }
  }

  console.log("✅ Seed complete! Turbopuffer namespace: resonance-blueprints");
  console.log("🚀 You can now run: bun run dev");
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
