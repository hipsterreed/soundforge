import { ElevenLabsClient } from "elevenlabs";

const client = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY ?? "",
});

const BASE_URL = "https://api.elevenlabs.io";

async function streamToBuffer(
  stream: AsyncIterable<Uint8Array>
): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/** Generate an original music track via the Music API (direct HTTP). */
export async function generateMusic(
  prompt: string,
  durationMs = 30000
): Promise<Buffer> {
  console.log(`🎵 Composing music: "${prompt.slice(0, 70)}..."`);

  const res = await fetch(`${BASE_URL}/v1/music`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": process.env.ELEVENLABS_API_KEY ?? "",
    },
    body: JSON.stringify({
      prompt,
      music_length_ms: durationMs,
      model_id: "music_v1",
    }),
    signal: AbortSignal.timeout(120_000), // 2 minute timeout
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "unknown");
    throw new Error(`ElevenLabs Music API error ${res.status}: ${body}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  console.log(`  ✓ Music generated (${(buffer.length / 1024).toFixed(0)} KB)`);
  return buffer;
}

/** Generate a sound effect via the SDK. Returns null if the key lacks permission. */
export async function generateSFX(
  prompt: string,
  durationSeconds = 20
): Promise<Buffer | null> {
  console.log(`🌊 Generating SFX: "${prompt.slice(0, 70)}..."`);

  try {
    const stream = await client.textToSoundEffects.convert({
      text: prompt,
      duration_seconds: durationSeconds,
      prompt_influence: 0.5,
    });

    const buffer = await streamToBuffer(stream as any);
    console.log(`  ✓ SFX generated (${(buffer.length / 1024).toFixed(0)} KB)`);
    return buffer;
  } catch (err: any) {
    if (err?.status === 401 || err?.statusCode === 401) {
      console.warn("  ⚠️  SFX skipped — API key missing Sound Generation permission");
      return null;
    }
    throw err;
  }
}

/** Generate a voice line via ElevenLabs TTS. */
export async function generateVoiceLine(text: string): Promise<Buffer> {
  console.log(`🎙️ Generating voice line: "${text.slice(0, 60)}"`);
  const voiceId = "pNInz6obpgDQGcFmaJgB"; // Adam — deep, dramatic game voice
  try {
    const stream = await client.textToSpeech.convert(voiceId, {
      text,
      model_id: "eleven_flash_v2_5",
      voice_settings: { stability: 0.45, similarity_boost: 0.75 },
    });
    const buffer = await streamToBuffer(stream as AsyncIterable<Uint8Array>);
    console.log(`  ✓ Voice line ready (${(buffer.length / 1024).toFixed(0)} KB)`);
    return buffer;
  } catch (err: any) {
    const status = err?.status ?? err?.statusCode;
    if (status === 401) {
      throw new Error("Your ElevenLabs API key is missing the 'text_to_speech' permission. Enable it in your ElevenLabs dashboard under API Keys.");
    }
    throw err;
  }
}

/** Blend music prompts from multiple matched blueprints. */
export function buildMusicPrompt(
  matches: { music_prompt: string; mood: string }[]
): string {
  const top = matches[0];
  if (!top) return "Ambient atmospheric music, gentle and immersive";

  const extraMoods = [
    ...new Set(
      matches
        .slice(1)
        .flatMap((m) => m.mood.split(",").map((s) => s.trim()))
        .slice(0, 4)
    ),
  ];

  const base = top.music_prompt;
  return extraMoods.length > 0
    ? `${base}. Additional emotional qualities: ${extraMoods.join(", ")}`
    : base;
}
