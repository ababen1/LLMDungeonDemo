# Approach

## Overview

This system splits **layout design** (LLM) from **geometry resolution** (code). The LLM plans dungeon topology — which rooms exist, how they connect, where the locked door sits on the graph, and rough quadrant placement. A deterministic geometry compiler then converts that abstract plan into integer grid coordinates for rendering.

This separation keeps the LLM focused on gameplay semantics (key-before-door, critical path, optional treasure) while code handles overlap-free placement, orthogonal corridor routing, and door cell positioning reliably within the 10-second budget.

## Determinism

Reproducibility uses four layers:

1. **temperature = 0** on generation and repair calls
2. **Provider seed** (OpenAI) when available
3. **Frozen prompt templates** with seed-derived quadrant hints from `paramDerivation.js`
4. **Deterministic geometry compiler** — same seed + difficulty + density always yields identical `pos`, `size`, corridor paths, and door position for a given abstract layout

Cross-provider topology may vary; compiled coordinates are always deterministic given the abstract JSON.

## Validation

Validation runs in two phases:

### Abstract validation (pre-compile)

Graph built from corridor edges only. Checks:

- Schema: room types, counts, corridor/door references
- Metadata: seed, difficulty, density match UI inputs
- Connectivity: BFS from spawn reaches all rooms
- Loop count: cyclomatic number ≤ 1
- Key before door: BFS with door edge excluded must reach key room
- Door blocks critical path: spawn→exit unreachable with door edge removed; reachable with it
- Treasure optional: shortest spawn→exit path excludes treasure room
- selfCheck cross-verify: dishonest selfCheck triggers repair

### Compiled validation (post-compile)

Geometry sanity after compiler:

- Rooms in bounds, no overlap
- Corridor paths orthogonal, endpoints on room perimeters, no interior penetration
- Door position on corridor path

Geometry failures are fixed by the compiler, not sent back to the LLM.

## Repair Strategy

On abstract validation failure, a single repair prompt fires with the invalid JSON and structured violation list. Repair is **semantic only** — it adjusts topology, anchors, or corridor edges. It never asks the model for pixel coordinates.

If repair still fails or the 10-second deadline is exceeded, the UI shows a graceful error.

## Timeout Budget

| Phase | Budget |
|-------|--------|
| Generation | 6500ms |
| Repair | 3000ms |
| Compile + render | remainder of 10000ms global |

`AbortController` cancels in-flight fetch on timeout.

## Provider Abstraction

`createLLMAdapter(config)` returns a provider-agnostic interface accepting `messages`, `temperature`, `maxTokens`, and optional `seed`. Swapping providers requires only `.env` changes.

## Tradeoffs

- **Adjacency edges** are added only at compile time when rooms share walls; the LLM reasons about corridor edges only.
- **Room count vs corridor count**: with 4–6 rooms and 2–4 corridors, connectivity relies on the LLM forming a valid graph; the compiler does not invent new corridor edges.
- **No procedural layout fallback**: if LLM + repair fail, the demo errors rather than generating a hard-coded dungeon.
