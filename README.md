> Built for the **TurboPuffer** × **ElevenLabs** Hackathon

---

# Sound Forge

Type any feeling, memory, or place — Sound Forge turns words into a fully generated audio world.

Describe a scene and Sound Forge semantically searches a library of sonic blueprints, then generates an original music track and layered ambient soundscapes unique to your input. A 3D block-based song builder lets you compose by stacking musical layers (melody, bass, rhythm, atmosphere, SFX) and watch them come to life in real time.

---


## Quick Start

```bash
# 1. Install dependencies
cd backend && bun install
cd ../game-asset-manager && bun install

# 2. Configure keys
cp backend/.env.example backend/.env
# → Fill in ELEVENLABS_API_KEY, TURBOPUFFER_API_KEY, TURBOPUFFER_REGION


# 4. Run
cd backend && bun run dev      # :3001
cd game-asset-manager && bun run dev     # :5173
```

---

## Hackathon

Built for the **ElevenLabs × turbopuffer Hackathon**.

Sound Forge showcases how vector search and generative audio can be combined to create immersive, semantically-driven soundscapes from nothing but a few words. turbopuffer handles fast ANN retrieval over a curated blueprint library; ElevenLabs turns the matched prompts into real, unique audio every time.
