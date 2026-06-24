# LLM Dungeon Generator

## Setup

```bash
npm install
cp .env.example .env
# Edit .env and set api key and url
npm run dev
```

Open http://localhost:5173

## Configuration

| Variable                      | Description                                                                          |
| ----------------------------- | ------------------------------------------------------------------------------------ |
| `VITE_LLM_PROVIDER`           | `groq` (default), `local`, `openai`, `anthropic`, or `generic`                       |
| `VITE_LLM_API_KEY`            | API key (not required for `local`)                                                   |
| `VITE_LLM_MODEL`              | Model name (local default: `google/gemma-4-e4b`)                                     |
| `VITE_LLM_BASE_URL`           | API endpoint (optional for `local` in dev — uses `/api/v1/chat/` proxy)              |
| `VITE_LOCAL_LLM_PROXY_TARGET` | LAN LLM server URL for Vite proxy (set in `.env` only, e.g. `http://your-host:1234`) |

### Local network LLM (`local`)

Uses `{ model, input }` POST body. **In dev**, requests go through a Vite proxy to avoid browser CORS. Set your server URL in `.env` (not committed):

```env
VITE_LLM_PROVIDER=local
VITE_LLM_MODEL=google/gemma-4-e4b
VITE_LOCAL_LLM_PROXY_TARGET=http://your-llm-host:1234
```

Do not set `VITE_LLM_BASE_URL` to the LAN IP in the browser — use the proxy (omit `VITE_LLM_BASE_URL` or set `/api/v1/chat/`). Restart `npm run dev` after changing `.env`.

## Architecture

1. **LLM** outputs abstract layout JSON: room topology, quadrant anchors, size tiers, corridor edges, door assignment — no pixel coordinates.
2. **Validator** checks semantic constraints on the graph (key before door, door blocks exit, treasure off critical path, connectivity, loop count).
3. **Geometry compiler** deterministically places rooms, routes corridors, and positions the door from `seed + difficulty + density`.
4. **Three.js** renders cubes top-down.
