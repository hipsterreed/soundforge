import { Elysia, t } from "elysia";
import { generateMusic, generateSFX, generateVoiceLine, generateVoicePreviews, saveVoicePreview } from "../services/elevenlabs";
import {
  getSprites, getSprite, createSprite, updateSprite, deleteSprite,
  addAudioClip, removeAudioClip, setSpriteMusic,
  addVoiceLine, removeVoiceLine,
  getMaps, getMap, createMap, updateMap, deleteMap, addMapTrack, removeMapTrack,
  getAllTags, updateAudioClipTags,
} from "../services/gameStore";
import {
  indexAsset, removeFromIndex, findRelated, computeGraph,
} from "../services/assetIndex";
import { config } from "../config";
import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const TMP_DIR = "./tmp";
async function ensureTmpDir() {
  if (!existsSync(TMP_DIR)) await mkdir(TMP_DIR, { recursive: true });
}

const notFound = (msg = "Not found") =>
  new Response(JSON.stringify({ error: msg }), {
    status: 404,
    headers: { "Content-Type": "application/json" },
  });

export const gameRoute = new Elysia({ prefix: "/api/game" })

  // ── File upload ─────────────────────────────────────────────────────────────
  .post(
    "/upload",
    async ({ body }) => {
      await ensureTmpDir();
      const file = body.file as File;
      const ext = (file.name.split(".").pop() ?? "png").toLowerCase();
      const filename = `img-${Date.now()}-${crypto.randomUUID()}.${ext}`;
      const filepath = join(TMP_DIR, filename);
      await Bun.write(filepath, file);
      console.log(`📁 Uploaded: ${filename} (${(file.size / 1024).toFixed(0)} KB)`);
      return { url: `/audio/${filename}`, path: filename };
    },
    { body: t.Object({ file: t.File() }) }
  )

  // ── Sprites ──────────────────────────────────────────────────────────────────
  .get("/sprites", () => getSprites())

  .get("/sprites/:id", ({ params }) => {
    const s = getSprite(params.id);
    return s ?? notFound();
  })

  .post(
    "/sprites",
    ({ body }) => {
      const id = createSprite(body);
      console.log(`🧩 Sprite created: ${id}`);
      return { id };
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        description: t.String(),
        imageUrl: t.String(),
        imagePath: t.String(),
        frameWidth: t.Number(),
        frameHeight: t.Number(),
        columns: t.Number(),
        rows: t.Number(),
        totalFrames: t.Number(),
        scale: t.Number(),
        animFps: t.Number(),
      }),
    }
  )

  .put(
    "/sprites/:id",
    ({ params, body }) => {
      updateSprite(params.id, body);
      return { ok: true };
    },
    {
      body: t.Object({
        name: t.Optional(t.String()),
        description: t.Optional(t.String()),
        imageUrl: t.Optional(t.String()),
        imagePath: t.Optional(t.String()),
        frameWidth: t.Optional(t.Number()),
        frameHeight: t.Optional(t.Number()),
        columns: t.Optional(t.Number()),
        rows: t.Optional(t.Number()),
        totalFrames: t.Optional(t.Number()),
        scale: t.Optional(t.Number()),
        animFps: t.Optional(t.Number()),
        audioClips: t.Optional(t.Array(t.Any())),
      }),
    }
  )

  .delete("/sprites/:id", ({ params }) => {
    deleteSprite(params.id);
    removeFromIndex(params.id); // fire-and-forget
    return { ok: true };
  })

  .put(
    "/sprites/:id/tags",
    async ({ params, body }) => {
      updateSprite(params.id, { tags: body.tags });
      const sprite = getSprite(params.id);
      if (sprite) {
        indexAsset(sprite.id, "sprite", sprite.name, sprite.description, body.tags); // fire-and-forget
      }
      return { ok: true };
    },
    { body: t.Object({ tags: t.Array(t.String()) }) }
  )

  .get("/sprites/:id/related", async ({ params }) => {
    const sprite = getSprite(params.id);
    if (!sprite) return notFound();
    const related = await findRelated(
      sprite.id, sprite.name, sprite.description, sprite.tags ?? [], 6
    );
    return { related };
  })

  // ── Audio clips ──────────────────────────────────────────────────────────────
  .post(
    "/sprites/:id/clips",
    ({ params, body }) => {
      const clip = addAudioClip(params.id, { ...body, tags: body.tags ?? [] });
      return clip;
    },
    {
      body: t.Object({
        label: t.String({ minLength: 1 }),
        prompt: t.String({ minLength: 1 }),
        url: t.String(),
        duration: t.Number(),
        tags: t.Optional(t.Array(t.String())),
      }),
    }
  )

  .put(
    "/sprites/:id/clips/:clipId/tags",
    ({ params, body }) => {
      updateAudioClipTags(params.id, params.clipId, body.tags);
      return { ok: true };
    },
    { body: t.Object({ tags: t.Array(t.String()) }) }
  )

  .delete("/sprites/:id/clips/:clipId", ({ params }) => {
    removeAudioClip(params.id, params.clipId);
    return { ok: true };
  })

  // ── AI sound suggestions ─────────────────────────────────────────────────────
  .post("/sprites/:id/suggest-sounds", async ({ params }) => {
    const sprite = getSprite(params.id);
    if (!sprite) return notFound();

    if (!config.groqApiKey) {
      return new Response(
        JSON.stringify({ error: "GROQ_API_KEY not configured in backend .env" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const userPrompt = `You are a professional video game sound designer.

Character name: "${sprite.name}"
Description: "${sprite.description || "A game character sprite"}"

Suggest exactly 3 distinct, creative sound bytes for different in-game actions that fit this character's theme. Be specific and evocative in your ElevenLabs prompts.

Return ONLY this JSON shape (no markdown, no extra keys):
{
  "suggestions": [
    { "label": "Walk",   "prompt": "detailed ElevenLabs SFX description", "duration": 2 },
    { "label": "Attack", "prompt": "detailed ElevenLabs SFX description", "duration": 1 },
    { "label": "Hurt",   "prompt": "detailed ElevenLabs SFX description", "duration": 1 }
  ]
}

Rules:
- Labels: concise action names (Walk, Run, Jump, Attack, Hurt, Death, Idle, Cast, etc.)
- Prompts: rich sensory descriptions — materials, texture, intensity, rhythm
- Durations: 1–8 seconds appropriate for the action
- Make all 3 thematically consistent with the character`;

    console.log(`\n🤖 Groq suggest-sounds for "${sprite.name}"...`);

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.groqApiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: userPrompt }],
        response_format: { type: "json_object" },
        temperature: 0.85,
        max_tokens: 512,
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "unknown");
      throw new Error(`Groq API error ${res.status}: ${body}`);
    }

    const data = await res.json() as { choices: { message: { content: string } }[] };
    const content = data.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content) as { suggestions: { label: string; prompt: string; duration: number }[] };

    console.log(`  ✅ Got ${parsed.suggestions?.length ?? 0} suggestions`);
    return { suggestions: (parsed.suggestions ?? []).slice(0, 3) };
  })

  // ── Sprite music ──────────────────────────────────────────────────────────────
  .put(
    "/sprites/:id/music",
    ({ params, body }) => {
      setSpriteMusic(
        params.id,
        body.music ? { ...body.music, createdAt: new Date().toISOString() } : null
      );
      return { ok: true };
    },
    {
      body: t.Object({
        music: t.Union([
          t.Object({ url: t.String(), prompt: t.String() }),
          t.Null(),
        ]),
      }),
    }
  )

  // ── Maps ─────────────────────────────────────────────────────────────────────
  .get("/maps", () => getMaps())

  .get("/maps/:id", ({ params }) => {
    const m = getMap(params.id);
    return m ?? notFound();
  })

  .post(
    "/maps",
    ({ body }) => {
      const id = createMap(body);
      console.log(`🗺️  Map created: ${id}`);
      return { id };
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        description: t.String(),
        imageUrl: t.String(),
        imagePath: t.String(),
      }),
    }
  )

  .put(
    "/maps/:id",
    ({ params, body }) => {
      updateMap(params.id, body);
      return { ok: true };
    },
    {
      body: t.Object({
        name: t.Optional(t.String({ minLength: 1 })),
        description: t.Optional(t.String()),
        tags: t.Optional(t.Array(t.String())),
      }),
    }
  )

  .delete("/maps/:id", ({ params }) => {
    deleteMap(params.id);
    removeFromIndex(params.id); // fire-and-forget
    return { ok: true };
  })

  .put(
    "/maps/:id/tags",
    async ({ params, body }) => {
      updateMap(params.id, { tags: body.tags });
      const map = getMap(params.id);
      if (map) {
        indexAsset(map.id, "map", map.name, map.description, body.tags); // fire-and-forget
      }
      return { ok: true };
    },
    { body: t.Object({ tags: t.Array(t.String()) }) }
  )

  .get("/maps/:id/related", async ({ params }) => {
    const map = getMap(params.id);
    if (!map) return notFound();
    const related = await findRelated(
      map.id, map.name, map.description, map.tags ?? [], 6
    );
    return { related };
  })

  .get("/graph", async () => {
    const sprites = getSprites();
    const maps = getMaps();

    const nodes: Parameters<typeof computeGraph>[0] = [
      ...sprites.map((s) => ({
        id: s.id,
        type: "sprite" as const,
        name: s.name,
        description: s.description,
        tags: s.tags ?? [],
        imageUrl: s.imageUrl,
        spriteFrame: {
          frameWidth: s.frameWidth,
          frameHeight: s.frameHeight,
          columns: s.columns,
          rows: s.rows,
          previewCol: s.previewCol ?? 8,
          previewRow: s.previewRow ?? 0,
        },
      })),
      ...maps.map((m) => ({
        id: m.id,
        type: "map" as const,
        name: m.name,
        description: m.description,
        tags: m.tags ?? [],
        imageUrl: m.imageUrl,
      })),
    ];

    // Add audio clip nodes (only if they have tags or a prompt)
    for (const sprite of sprites) {
      for (const clip of (sprite.audioClips ?? [])) {
        if ((clip.tags ?? []).length > 0 || clip.prompt) {
          nodes.push({
            id: `clip:${clip.id}`,
            type: "clip" as any,
            name: clip.label,
            description: clip.prompt,
            tags: clip.tags ?? [],
            parentId: sprite.id,
            imageUrl: undefined,
          });
        }
      }
    }

    const { nodes: graphNodes, edges } = computeGraph(nodes);

    return {
      nodes: graphNodes.map(({ id, type, name, tags, imageUrl, parentId, spriteFrame }) => ({
        id, type, name, tags, imageUrl, parentId, spriteFrame,
      })),
      edges,
    };
  })

  .post(
    "/maps/:id/tracks",
    ({ params, body }) => {
      const track = addMapTrack(params.id, body);
      return track;
    },
    {
      body: t.Object({
        url: t.String(),
        prompt: t.String({ minLength: 1 }),
      }),
    }
  )

  .delete("/maps/:id/tracks/:trackId", ({ params }) => {
    removeMapTrack(params.id, params.trackId);
    return { ok: true };
  })

  // ── Voice lines ───────────────────────────────────────────────────────────────
  .post(
    "/sprites/:id/voice-lines",
    ({ params, body }) => {
      const line = addVoiceLine(params.id, { ...body, tags: body.tags ?? [] });
      return line;
    },
    {
      body: t.Object({
        text: t.String({ minLength: 1 }),
        label: t.String({ minLength: 1 }),
        url: t.String(),
        tags: t.Optional(t.Array(t.String())),
      }),
    }
  )

  .delete("/sprites/:id/voice-lines/:lineId", ({ params }) => {
    removeVoiceLine(params.id, params.lineId);
    return { ok: true };
  })

  // ── AI: suggest voice lines ──────────────────────────────────────────────────
  .post("/sprites/:id/suggest-voice-lines", async ({ params }) => {
    const sprite = getSprite(params.id);
    if (!sprite) return notFound();

    if (!config.groqApiKey) {
      return new Response(
        JSON.stringify({ error: "GROQ_API_KEY not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const userPrompt = `You are a video game writer and voice director.

Character name: "${sprite.name}"
Description: "${sprite.description || "A game character"}"

Generate 4 punchy in-game voice lines for this character. Cover these situations:
1. Battle cry (attacking)
2. Taking damage / hurt
3. Victory / winning
4. Idle / taunting

Return ONLY this JSON shape (no markdown, no extra keys):
{
  "voiceLines": [
    { "label": "Battle Cry", "text": "..." },
    { "label": "Hurt",       "text": "..." },
    { "label": "Victory",    "text": "..." },
    { "label": "Taunt",      "text": "..." }
  ]
}

Rules:
- Keep each line short (1–8 words, spoken in character)
- Match the character's theme and personality
- Make them feel authentic for a pixel-art action game`;

    console.log(`\n🤖 Groq suggest-voice-lines for "${sprite.name}"...`);

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.groqApiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: userPrompt }],
        response_format: { type: "json_object" },
        temperature: 0.9,
        max_tokens: 256,
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "unknown");
      throw new Error(`Groq API error ${res.status}: ${body}`);
    }

    const data = await res.json() as { choices: { message: { content: string } }[] };
    const content = data.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content) as { voiceLines: { label: string; text: string }[] };
    console.log(`  ✅ Got ${parsed.voiceLines?.length ?? 0} voice line suggestions`);
    return { voiceLines: (parsed.voiceLines ?? []).slice(0, 4) };
  })

  // ── AI: generate description ─────────────────────────────────────────────────
  .post("/sprites/:id/describe", async ({ params }) => {
    const sprite = getSprite(params.id);
    if (!sprite) return notFound();

    if (!config.groqApiKey) {
      return new Response(
        JSON.stringify({ error: "GROQ_API_KEY not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const userPrompt = `You are a game designer writing character bibles.

Write a 2–3 sentence character description for a pixel-art game character named "${sprite.name}".
Include their personality, role in the game world, fighting style or abilities, and one distinctive trait.
Be evocative and specific — this description will guide AI sound and voice generation.
Return ONLY the description text, no labels, no quotes, no extra text.`;

    console.log(`\n🤖 Groq describe for "${sprite.name}"...`);

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.groqApiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: userPrompt }],
        temperature: 0.9,
        max_tokens: 200,
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "unknown");
      throw new Error(`Groq API error ${res.status}: ${body}`);
    }

    const data = await res.json() as { choices: { message: { content: string } }[] };
    const description = (data.choices[0]?.message?.content ?? "").trim();
    console.log(`  ✅ Description generated`);
    return { description };
  })

  // ── Tags ─────────────────────────────────────────────────────────────────────
  .get("/tags", () => {
    return { tags: getAllTags() };
  })

  .post(
    "/suggest-tags",
    async ({ body }) => {
      try {
        if (!config.groqApiKey) return { tags: [] };

        const { label, prompt, spriteName, spriteDescription } = body;

        const userPrompt = `You are a game asset tagging expert.
Sound label: "${label}"
Sound description: "${prompt}"
Character: "${spriteName}" — "${spriteDescription}"

Suggest 3-5 concise, lowercase tags for this sound that describe:
- Sound type (melee, magic, ranged, voice, ambient, nature)
- Mood/intensity (aggressive, calm, eerie, epic, playful)
- Context/setting (combat, forest, dungeon, urban, water)
- Element if relevant (fire, ice, metal, wood, stone)

Return ONLY a JSON array, no markdown: ["tag1", "tag2", "tag3"]`;

        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.groqApiKey}`,
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: userPrompt }],
            temperature: 0.7,
            max_tokens: 128,
          }),
          signal: AbortSignal.timeout(15_000),
        });

        if (!res.ok) return { tags: [] };

        const data = await res.json() as { choices: { message: { content: string } }[] };
        const content = (data.choices[0]?.message?.content ?? "").trim();

        // Strip any markdown code fences if present
        const cleaned = content.replace(/```[a-z]*\n?/gi, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleaned) as string[];
        if (!Array.isArray(parsed)) return { tags: [] };

        const tags = parsed
          .filter((t) => typeof t === "string" && t.length > 0)
          .map((t) => t.toLowerCase().trim())
          .slice(0, 5);

        return { tags };
      } catch {
        return { tags: [] };
      }
    },
    {
      body: t.Object({
        label: t.String(),
        prompt: t.String(),
        spriteName: t.String(),
        spriteDescription: t.String(),
      }),
    }
  )

  // ── Voice design: generate previews ─────────────────────────────────────────
  .post("/sprites/:id/design-voice", async ({ params }) => {
    const sprite = getSprite(params.id);
    if (!sprite) return notFound();

    if (!config.groqApiKey) {
      return new Response(
        JSON.stringify({ error: "GROQ_API_KEY not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Use Groq to write a voice casting description
    const groqPrompt = `You are a voice casting director for a video game.

Character name: "${sprite.name}"
Character description: "${sprite.description || "A game character"}"

Write a single concise paragraph (2-4 sentences) describing how this character should sound. Cover:
- Age range and gender presentation
- Voice texture (gruff, silky, raspy, bright, deep, etc.)
- Accent or speech style if appropriate
- Overall emotional tone and personality in the voice

Return ONLY the voice description, no labels, no quotes, no extra text.`;

    console.log(`\n🎨 Groq voice description for "${sprite.name}"...`);

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.groqApiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: groqPrompt }],
        temperature: 0.85,
        max_tokens: 150,
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!groqRes.ok) {
      const body = await groqRes.text().catch(() => "unknown");
      throw new Error(`Groq error ${groqRes.status}: ${body}`);
    }

    const groqData = await groqRes.json() as { choices: { message: { content: string } }[] };
    const voiceDescription = (groqData.choices[0]?.message?.content ?? "").trim();
    console.log(`  ✅ Voice description: "${voiceDescription.slice(0, 60)}..."`);

    // Generate ElevenLabs voice previews
    const { previews, text } = await generateVoicePreviews(voiceDescription);
    return { previews, voiceDescription, sampleText: text };
  })

  // ── Voice design: save a preview as permanent voice ───────────────────────
  .post(
    "/sprites/:id/save-voice",
    async ({ params, body }) => {
      const sprite = getSprite(params.id);
      if (!sprite) return notFound();

      const voiceId = await saveVoicePreview(
        body.generatedVoiceId,
        sprite.name,
        body.voiceDescription
      );

      // Persist voice ID + description on the sprite
      updateSprite(params.id, { voiceId, voiceDescription: body.voiceDescription });
      console.log(`✅ Voice saved for "${sprite.name}": ${voiceId}`);
      return { voiceId, voiceDescription: body.voiceDescription };
    },
    {
      body: t.Object({
        generatedVoiceId: t.String({ minLength: 1 }),
        voiceDescription: t.String({ minLength: 1 }),
      }),
    }
  )

  // ── TTS voice generation ──────────────────────────────────────────────────────
  .post(
    "/voice",
    async ({ body }) => {
      try {
        await ensureTmpDir();
        console.log(`\n🎙️ Voice line: "${body.text.slice(0, 60)}"`);
        const buffer = await generateVoiceLine(body.text, body.voiceId ?? undefined);
        const id = crypto.randomUUID();
        const path = join(TMP_DIR, `${id}-voice.mp3`);
        await Bun.write(path, buffer);
        console.log(`  ✅ Voice ready: ${id}`);
        return { url: `/audio/${id}-voice.mp3` };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("❌ Voice error:", msg);
        return new Response(JSON.stringify({ error: msg }), {
          status: 500, headers: { "Content-Type": "application/json" },
        });
      }
    },
    {
      body: t.Object({
        text: t.String({ minLength: 1, maxLength: 300 }),
        voiceId: t.Optional(t.String()),
      }),
    }
  )

  // ── Audio generation ──────────────────────────────────────────────────────────
  .post(
    "/sfx",
    async ({ body }) => {
      try {
        await ensureTmpDir();
        console.log(`\n🎮 Game SFX: "${body.prompt}"`);
        const buffer = await generateSFX(body.prompt, body.duration ?? 3);
        if (!buffer) {
          return new Response(
            JSON.stringify({ error: "SFX generation requires Sound Generation permission on your ElevenLabs API key." }),
            { status: 403, headers: { "Content-Type": "application/json" } }
          );
        }
        const id = crypto.randomUUID();
        const path = join(TMP_DIR, `${id}-sfx.mp3`);
        await Bun.write(path, buffer);
        console.log(`  ✅ SFX ready: ${id}`);
        return { url: `/audio/${id}-sfx.mp3` };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("❌ Game SFX error:", msg);
        return new Response(JSON.stringify({ error: msg }), {
          status: 500, headers: { "Content-Type": "application/json" },
        });
      }
    },
    {
      body: t.Object({
        prompt: t.String({ minLength: 3, maxLength: 300 }),
        duration: t.Optional(t.Number({ minimum: 1, maximum: 22 })),
      }),
    }
  )

  .post(
    "/music",
    async ({ body }) => {
      try {
        await ensureTmpDir();
        console.log(`\n🎮 Game Music: "${body.prompt}"`);
        const buffer = await generateMusic(body.prompt, 20_000);
        const id = crypto.randomUUID();
        const path = join(TMP_DIR, `${id}-music.mp3`);
        await Bun.write(path, buffer);
        console.log(`  ✅ Music ready: ${id}`);
        return { url: `/audio/${id}-music.mp3` };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("❌ Game Music error:", msg);
        return new Response(JSON.stringify({ error: msg }), {
          status: 500, headers: { "Content-Type": "application/json" },
        });
      }
    },
    {
      body: t.Object({
        prompt: t.String({ minLength: 3, maxLength: 1000 }),
      }),
    }
  );
