import "./config";
import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { staticPlugin } from "@elysiajs/static";
import { generateRoute } from "./routes/generate";
import { sagaRoute } from "./routes/saga";
import { gameRoute } from "./routes/game";
import { composeRoute } from "./routes/compose";
import { warmUpEmbedder } from "./services/embeddings";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";

const PORT = Number(process.env.PORT ?? 3001);

// Ensure tmp dir exists
if (!existsSync("./tmp")) {
  await mkdir("./tmp", { recursive: true });
}

const app = new Elysia()
  .use(cors({ origin: true }))
  .use(
    staticPlugin({
      assets: "./tmp",
      prefix: "/audio",
    })
  )
  .get("/", () => ({
    name: "Resonance API",
    version: "1.0.0",
    status: "running",
  }))
  .use(generateRoute)
  .use(sagaRoute)
  .use(gameRoute)
  .use(composeRoute)
  .onError(({ error, code }) => {
    console.error(`[${code}]`, error);
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error ? error.message : "Internal server error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  })
  .listen(PORT);

console.log(`\n🎵 Resonance API running on http://localhost:${PORT}`);
console.log(`   POST /api/generate  → Generate a soundscape`);
console.log(`   GET  /audio/:file   → Stream generated audio\n`);

// Warm up the embedding model in the background
warmUpEmbedder().catch(() => {
  console.warn("⚠️  Embedding model warm-up failed. First request will be slower.");
});

export type App = typeof app;
