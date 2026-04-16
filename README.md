# Sound Forge

Type any feeling, memory, or place — Sound Forge turns words into a fully generated audio world.

Describe a scene and Sound Forge semantically searches a library of sonic blueprints, then generates an original music track and layered ambient soundscapes unique to your input. A 3D block-based song builder lets you compose by stacking musical layers (melody, bass, rhythm, atmosphere, SFX) and watch them come to life in real time.

---

## Apps

| App | Description | Port |
|-----|-------------|------|
| `frontend/` | Core experience — type a prompt, get a soundscape | 5173 |
| `forge-frontend/` | 3D block song builder with Three.js | 5179 |
| `hatchling/` | Virtual pet that hatches with ElevenLabs-generated sounds | 5174 |
| `backend/` | Elysia (Bun) API server shared by all frontends | 3001 |

---

## Stack

- **ElevenLabs** — Music generation (`/v1/music`) + Sound Effects (`/v1/sound-generation`)
- **turbopuffer** — Vector database for semantic search across 70+ sonic blueprints
- **HuggingFace Transformers.js** — Local embeddings (`all-MiniLM-L6-v2`, no extra API key)
- **Bun + Elysia** — Backend runtime and HTTP framework
- **Vite + React + TypeScript** — All frontends
- **Three.js / @react-three/fiber** — 3D visuals in the block builder

---

## Quick Start

```bash
# 1. Install dependencies
cd backend && bun install
cd ../frontend && bun install

# 2. Configure keys
cp backend/.env.example backend/.env
# → Fill in ELEVENLABS_API_KEY, TURBOPUFFER_API_KEY, TURBOPUFFER_REGION

# 3. Seed turbopuffer (one-time, ~2–3 min)
cd backend && bun run seed

# 4. Run
cd backend && bun run dev      # :3001
cd frontend && bun run dev     # :5173
```

---

## Hackathon

Built for the **ElevenLabs × turbopuffer Hackathon**.

Sound Forge showcases how vector search and generative audio can be combined to create immersive, semantically-driven soundscapes from nothing but a few words. turbopuffer handles fast ANN retrieval over a curated blueprint library; ElevenLabs turns the matched prompts into real, unique audio every time.
