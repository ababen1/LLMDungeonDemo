# LLM Dungeon Generator

A browser-based demo that uses an LLM to generate top-down dungeon layouts as strict JSON, validates semantic constraints, compiles geometry deterministically in code, and renders with Three.js.

## Setup

```bash
npm install
cp .env.example .env
# Edit .env and set VITE_LLM_API_KEY
npm run dev
```

Open http://localhost:5173

## Configuration

| Variable | Description |
|----------|-------------|
| `VITE_LLM_PROVIDER` | `groq` (default), `openai`, `anthropic`, or `generic` |
| `VITE_LLM_API_KEY` | Groq API key ([console.groq.com](https://console.groq.com)) |
| `VITE_LLM_MODEL` | Model name (default: `llama-3.3-70b-versatile`) |
| `VITE_LLM_BASE_URL` | Groq OpenAI-compatible base (default: `https://api.groq.com/openai`) |

## Architecture

1. **LLM** outputs abstract layout JSON: room topology, quadrant anchors, size tiers, corridor edges, door assignment — no pixel coordinates.
2. **Validator** checks semantic constraints on the graph (key before door, door blocks exit, treasure off critical path, connectivity, loop count).
3. **Geometry compiler** deterministically places rooms, routes corridors, and positions the door from `seed + difficulty + density`.
4. **Three.js** renders cubes top-down.

## Determinism

Same `seed`, `difficulty`, and `density` produce functionally identical layouts:

- `temperature = 0` on all LLM calls
- Provider `seed` parameter when supported (OpenAI only; Groq uses prompt + compiler determinism)
- Deterministic prompt content and geometry compilation from seed
- **Difficulty** controls room count (4–6 rooms); **density** controls grid size (10×10 at high density, 25×25 at low)
- Identical provider + model version recommended for exact LLM topology reproduction

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm run preview` — preview production build

## Deliverables

- Web demo (this repo)
- Prompt pack: `src/prompts/`
- Written explanation: `docs/APPROACH.md`
