# Approach

## How I got started with this task

First and foremost, I read the requirments throughly and made sure I understand everything.
After that I used Claude to help me plan a prompt to give cursor to get started with this project. I emphasized to Claude it should create a prompt to firstly create a prompt for a plan and not the final solution. I also told Claude to use vanilla JS, Vite, Three.js, and use the adapter design pattern so I can swap between different LLM providers when nessecery. After reviewing the resulting prompt and making sure everything looks good I gave it to Cursor and set it to "plan" mode. I added the prompt to this folder under PLAN.md.

## What I found difficult

I wasn't sure how to make it give the same results when using the same metadata, since LLM has some level of randomness by nature. I asked Claude to help me plan this as well, the solution was: setting tempature to 0, and passing the seed to the LLM provider if possible.

## General Overview

The LLM plans which rooms exist, how they connect, where the locked door sits, and rough grid placement. A seperate geometry compiler then converts that abstract plan into integer grid coordinates for rendering.

This separation keeps the LLM focused on gameplay semantics (key-before-door, critical path, optional treasure) while code handles placement, orthogonal corridor routing, and door cell positioning reliably within the 10-second budget.

## Determinism

1. **temperature = 0** on generation and repair calls
2. **Provider seed** (OpenAI) when available

## Metadata

Higher difficulty = more rooms.
Higher density = smaller grid.
and vice versa.

## Validation

Validation runs in two phases:

### Abstract validation

Check the following:

- Schema: room types, counts, corridor/door references
- Metadata: seed, difficulty, density match UI inputs
- Connectivity: BFS from spawn reaches all rooms
- Loop count <= 1
- Key before door: BFS with door edge excluded must reach key room
- Door blocks critical path: spawn→exit unreachable with door edge removed; reachable with it
- Treasure optional: shortest spawn→exit path excludes treasure room
- selfCheck cross-verify: dishonest selfCheck triggers repair

### Compiled validation

- Rooms in bounds, no overlap
- Corridor paths orthogonal, endpoints on room perimeters, no overlaps
- Door position on corridor path

Geometry failures are fixed by code, not sent back to the LLM.

## Repair Strategy

On abstract validation failure, a single repair prompt fires with the invalid JSON and violations list. it adjusts topology, anchors, or corridor edges. it never asks the model for pixel coordinates.

If repair still fails or the 10-second deadline is exceeded, the UI shows an error.

## Timeout Budget

Generation: 6500ms  
Repair: 3000ms  
Compile + render: remainder of 10000ms

`AbortController` cancels fetch on timeout.

## Provider Abstraction

`createLLMAdapter(config)` returns an interface accepting `messages`, `temperature`, `maxTokens`, and optional `seed`. Swapping providers requires only `.env` changes.

## UI Log

Even though it is not part of the requiremnts, I Added a log to the UI so I can clearly see at what stage an error happens.

## Tradeoffs

- **Adjacency edges** are added only at compile time when rooms share walls; the LLM reasons about corridor edges only.
- **Room count vs corridor count**: with 4–6 rooms and 2–4 corridors, connectivity relies on the LLM forming a valid graph; the compiler does not invent new corridor edges.
