import { Elysia, t } from "elysia";
import { getEmbedding } from "../services/embeddings";
import { searchSagaBlueprints } from "../services/turbopuffer";
import { generateMusic, generateSFX, buildMusicPrompt } from "../services/elevenlabs";
import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const TMP_DIR = "./tmp";

async function ensureTmpDir() {
  if (!existsSync(TMP_DIR)) await mkdir(TMP_DIR, { recursive: true });
}

export const sagaRoute = new Elysia().post(
  "/api/saga",
  async ({ body }) => {
    try {
      return await handleSaga(body.prompt, body.campaignType ?? null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("❌ SAGA error:", msg);
      return new Response(JSON.stringify({ error: msg }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
  {
    body: t.Object({
      prompt: t.String({ minLength: 3, maxLength: 500 }),
      campaignType: t.Optional(t.String()),
    }),
  }
);

async function handleSaga(prompt: string, campaignType: string | null) {
  await ensureTmpDir();
  console.log(`\n🗡️  SAGA scene: "${prompt}" [${campaignType ?? "any"}]`);

  const vector = await getEmbedding(prompt);
  const matches = await searchSagaBlueprints(vector, campaignType, 5);

  if (matches.length === 0) {
    return new Response(
      JSON.stringify({ error: "No SAGA blueprints found. Run: bun run seed:saga" }),
      { status: 422, headers: { "Content-Type": "application/json" } }
    );
  }

  const top = matches[0];
  console.log(`✨ Matched: "${top.description.slice(0, 60)}..." (dist: ${top.dist.toFixed(3)})`);

  const musicPrompt = buildMusicPrompt(matches.slice(0, 3));
  const sfxPrompt1 = top.sfx_prompt_1;
  const sfxPrompt2 = matches[1]?.sfx_prompt_1 ?? top.sfx_prompt_2;

  console.log("⚡ Generating audio in parallel...");
  const [musicBuffer, sfx1Buffer, sfx2Buffer] = await Promise.all([
    generateMusic(musicPrompt),
    generateSFX(sfxPrompt1, 20),
    generateSFX(sfxPrompt2, 20),
  ]);

  const id = crypto.randomUUID();
  const writes: Promise<void>[] = [Bun.write(join(TMP_DIR, `${id}-music.mp3`), musicBuffer)];
  if (sfx1Buffer) writes.push(Bun.write(join(TMP_DIR, `${id}-sfx1.mp3`), sfx1Buffer));
  if (sfx2Buffer) writes.push(Bun.write(join(TMP_DIR, `${id}-sfx2.mp3`), sfx2Buffer));
  await Promise.all(writes);

  console.log(`✅ SAGA scene ready: ${id}`);

  return {
    id,
    musicUrl: `/audio/${id}-music.mp3`,
    sfx1Url: sfx1Buffer ? `/audio/${id}-sfx1.mp3` : null,
    sfx2Url: sfx2Buffer ? `/audio/${id}-sfx2.mp3` : null,
    scene: {
      matchedDescription: top.description,
      campaignType: top.campaign_type,
      mood: top.mood,
      energy: top.energy,
      tags: top.tags.split(",").map((t) => t.trim()),
      matchScore: +(1 - top.dist).toFixed(3),
    },
    prompts: {
      music: musicPrompt,
      sfx1: sfxPrompt1,
      sfx2: sfxPrompt2,
    },
  };
}
