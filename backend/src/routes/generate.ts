import { Elysia, t } from "elysia";
import { getEmbedding } from "../services/embeddings";
import { searchSonicBlueprints } from "../services/turbopuffer";
import {
  generateMusic,
  generateSFX,
  buildMusicPrompt,
} from "../services/elevenlabs";
import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const TMP_DIR = "./tmp";

async function ensureTmpDir() {
  if (!existsSync(TMP_DIR)) {
    await mkdir(TMP_DIR, { recursive: true });
  }
}

const GENERATION_DISABLED = process.env.GENERATION_ENABLED !== "true";

export const generateRoute = new Elysia().post(
  "/api/generate",
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
    console.log("📥 Route hit:", body.prompt);
    try {
      return await handleGenerate(body.prompt);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const status = (err as any)?.status ?? (err as any)?.statusCode ?? "none";
      console.error(`❌ Generate error [status=${status}]:`, msg);
      console.error("   Error type:", (err as any)?.constructor?.name);
      return new Response(JSON.stringify({ error: msg }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
  {
    body: t.Object({
      prompt: t.String({ minLength: 3, maxLength: 500 }),
    }),
  }
);

async function handleGenerate(prompt: string) {
    await ensureTmpDir();

    console.log(`\n🎯 Generating soundscape for: "${prompt}"`);

    // 1. Embed the user prompt
    console.log("🔍 Embedding prompt...");
    const vector = await getEmbedding(prompt);

    // 2. Semantic search in turbopuffer
    console.log("🔎 Searching sonic blueprints...");
    const matches = await searchSonicBlueprints(vector, 5);

    if (matches.length === 0) {
      return new Response(
        JSON.stringify({ error: "No sonic blueprints found. Run seed script first." }),
        { status: 422, headers: { "Content-Type": "application/json" } }
      );
    }

    const topMatch = matches[0];
    console.log(`✨ Top match: "${topMatch.description}" (dist: ${topMatch.dist.toFixed(3)})`);

    // 3. Build generation prompts by blending top results
    const musicPrompt = buildMusicPrompt(matches.slice(0, 3));
    const sfxPrompt1 = topMatch.sfx_prompt_1;
    const sfxPrompt2 = matches[1]?.sfx_prompt_1 ?? topMatch.sfx_prompt_2;

    // 4. Generate audio in parallel
    console.log("⚡ Generating audio in parallel...");
    const [musicBuffer, sfx1Buffer, sfx2Buffer] = await Promise.all([
      generateMusic(musicPrompt),
      generateSFX(sfxPrompt1, 20),
      generateSFX(sfxPrompt2, 20),
    ]);

    // 5. Save to temp files
    const id = crypto.randomUUID();
    const musicPath = join(TMP_DIR, `${id}-music.mp3`);
    const sfx1Path = join(TMP_DIR, `${id}-sfx1.mp3`);
    const sfx2Path = join(TMP_DIR, `${id}-sfx2.mp3`);

    const writes: Promise<void>[] = [Bun.write(musicPath, musicBuffer)];
    if (sfx1Buffer) writes.push(Bun.write(sfx1Path, sfx1Buffer));
    if (sfx2Buffer) writes.push(Bun.write(sfx2Path, sfx2Buffer));
    await Promise.all(writes);

    console.log(`✅ Done! Session ID: ${id}`);

    return {
      id,
      musicUrl: `/audio/${id}-music.mp3`,
      sfx1Url: sfx1Buffer ? `/audio/${id}-sfx1.mp3` : null,
      sfx2Url: sfx2Buffer ? `/audio/${id}-sfx2.mp3` : null,
      metadata: {
        matchedScene: topMatch.description,
        mood: topMatch.mood,
        energy: topMatch.energy,
        tags: topMatch.tags.split(",").map((t) => t.trim()),
        matchScore: +(1 - topMatch.dist).toFixed(3),
      },
      relatedScenes: matches.slice(0, 4).map((m) => ({
        description: m.description,
        mood: m.mood,
        energy: m.energy,
        tags: m.tags.split(",").map((t) => t.trim()),
        score: +(1 - m.dist).toFixed(3),
      })),
      prompts: {
        music: musicPrompt,
        sfx1: sfxPrompt1,
        sfx2: sfxPrompt2,
      },
    };
}
