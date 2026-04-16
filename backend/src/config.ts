// Ensure env vars are available (Bun auto-loads .env)
export const config = {
  elevenLabsApiKey: process.env.ELEVENLABS_API_KEY ?? "",
  turbopufferApiKey: process.env.TURBOPUFFER_API_KEY ?? "",
  groqApiKey: process.env.GROQ_API_KEY ?? "",
  port: Number(process.env.PORT ?? 3001),
};

const missing = (
  Object.entries(config) as [string, string | number][]
).filter(([k, v]) => k !== "port" && k !== "groqApiKey" && !v);

if (missing.length) {
  console.warn(
    `⚠️  Missing env vars: ${missing.map(([k]) => k.toUpperCase()).join(", ")}`
  );
  console.warn("   Copy .env.example to .env and fill in your API keys.\n");
}

// Confirm keys loaded (first 8 chars only)
const mask = (v: string) => (v ? v.slice(0, 8) + "..." : "(empty)");
console.log(`   ELEVENLABS_API_KEY = ${mask(config.elevenLabsApiKey)}`);
console.log(`   TURBOPUFFER_API_KEY = ${mask(config.turbopufferApiKey)}`);
