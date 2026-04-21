import { Elysia, t } from "elysia";
import { getEmbedding } from "../services/embeddings";
import { searchSonicBlueprints } from "../services/turbopuffer";
import { generateMusic, generateSFX } from "../services/elevenlabs";
import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const TMP_DIR = "./tmp";

async function ensureTmpDir() {
  if (!existsSync(TMP_DIR)) {
    await mkdir(TMP_DIR, { recursive: true });
  }
}

const BlockInput = t.Object({
  id: t.String(),
  category: t.String(),
  descriptor: t.String(),
  isSFX: t.Boolean(),
});

type BlockIn = {
  id: string;
  category: string;
  descriptor: string;
  isSFX: boolean;
};

function buildMusicPrompt(
  blocks: BlockIn[],
  matchedPrompts: string[],
  matchedMoods: string[],
  matchedEnergies: number[]
): string {
  const avgEnergy =
    matchedEnergies.reduce((a, b) => a + b, 0) /
    Math.max(matchedEnergies.length, 1);
  const energyWord =
    avgEnergy > 0.7
      ? "high-energy, intense"
      : avgEnergy > 0.4
        ? "medium-tempo, flowing"
        : "slow, contemplative";

  const moodSet = [
    ...new Set(
      matchedMoods.flatMap((m) => m.split(",").map((s) => s.trim()))
    ),
  ].slice(0, 6);

  const uniquePrompts = [...new Set(matchedPrompts)].slice(0, 3);

  const blockDesc = blocks
    .filter((b) => !b.isSFX)
    .map((b) => `${b.descriptor} ${b.category}`)
    .join(", ");

  const parts = [
    uniquePrompts[0] ?? "Immersive atmospheric music",
    uniquePrompts.slice(1).join(". "),
    blockDesc ? `A ${energyWord} composition featuring ${blockDesc}.` : "",
    moodSet.length > 0 ? `Mood: ${moodSet.join(", ")}.` : "",
  ].filter(Boolean);

  return parts.join(" ").replace(/\s+/g, " ").trim();
}

const GENERATION_DISABLED = process.env.GENERATION_ENABLED !== "true";

export const composeRoute = new Elysia().post(
  "/api/compose",
  async ({ body }) => {
    if (GENERATION_DISABLED) {
      return new Response(
        JSON.stringify({
          error:
            "New audio generation is disabled while this project is in showcase mode.",
        }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }
    try {
      await ensureTmpDir();
      const { blocks } = body as { blocks: BlockIn[] };

      if (blocks.length === 0) {
        return new Response(
          JSON.stringify({ error: "Add at least one block to compose." }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      console.log(`\n🧱 Composing from ${blocks.length} blocks...`);

      // Embed each block in parallel
      const embeddings = await Promise.all(
        blocks.map((b) => getEmbedding(`${b.category} ${b.descriptor} sound music`))
      );

      // Search turbopuffer for each block
      const searchResults = await Promise.all(
        embeddings.map((v) => searchSonicBlueprints(v, 2))
      );

      // Collect matched prompts by type
      const musicPrompts: string[] = [];
      const musicMoods: string[] = [];
      const musicEnergies: number[] = [];
      const sfxPrompts: string[] = [];

      blocks.forEach((block, i) => {
        const top = searchResults[i][0];
        if (!top) return;
        if (block.isSFX) {
          sfxPrompts.push(top.sfx_prompt_1);
        } else {
          musicPrompts.push(top.music_prompt);
          musicMoods.push(top.mood);
          musicEnergies.push(top.energy);
        }
      });

      const musicBlocks = blocks.filter((b) => !b.isSFX);
      const composedPrompt = buildMusicPrompt(
        musicBlocks,
        musicPrompts,
        musicMoods,
        musicEnergies
      );

      console.log(`🎵 Prompt: "${composedPrompt.slice(0, 120)}..."`);
      console.log(`🌊 SFX blocks: ${sfxPrompts.length}`);

      // Generate everything in parallel
      const [musicBuffer, ...sfxBuffers] = await Promise.all([
        generateMusic(composedPrompt, 45_000),
        ...sfxPrompts.slice(0, 3).map((p) => generateSFX(p, 18)),
      ]);

      const id = crypto.randomUUID();
      const writes: Promise<number>[] = [];
      const sfxUrls: string[] = [];

      writes.push(Bun.write(join(TMP_DIR, `${id}-music.mp3`), musicBuffer));

      for (let i = 0; i < sfxBuffers.length; i++) {
        const buf = sfxBuffers[i];
        if (buf) {
          writes.push(Bun.write(join(TMP_DIR, `${id}-sfx${i}.mp3`), buf));
          sfxUrls.push(`/audio/${id}-sfx${i}.mp3`);
        }
      }

      await Promise.all(writes);
      console.log(`✅ Composition ready! ID: ${id}`);

      return {
        id,
        musicUrl: `/audio/${id}-music.mp3`,
        sfxUrls,
        metadata: {
          blocks: blocks.map((b, i) => ({
            id: b.id,
            category: b.category,
            descriptor: b.descriptor,
            matched: searchResults[i][0]?.description ?? null,
          })),
          musicPrompt: composedPrompt,
        },
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("❌ Compose error:", msg);
      return new Response(JSON.stringify({ error: msg }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
  {
    body: t.Object({
      blocks: t.Array(BlockInput),
    }),
  }
);
