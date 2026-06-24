You are a senior software architect. Your task is to produce a complete implementation
PLAN for the project described below. Do NOT write any implementation code. Output a
single, well-structured Markdown document that a developer can follow from start to
finish without needing to make any additional architectural decisions.

---

## PROJECT: Prompt-Driven Dungeon Level Generator

### What it does

An LLM is prompted to generate a top-down dungeon layout as strict JSON. The output is
validated against hard semantic and spatial constraints, then rendered in Three.js
(top-down camera, cubes only, no textures). If validation fails, a repair prompt is
fired. All of this must complete within 10 seconds total, including API round-trips.

### Stack

- Vite + vanilla JavaScript (no framework)
- Three.js for rendering
- LLM provider is ABSTRACT — design an adapter interface (provider-agnostic)
  so any REST-based LLM (Claude, GPT-4o, etc.) can be swapped in via config
- No backend — all logic runs in the browser

---

## REQUIRED LAYOUT ELEMENTS

- 1 Spawn room, 1 Exit room, 1 Key room, 1 Locked door
- 1 Optional Treasure room (not on the critical path)
- 2–4 Corridor segments
- Total rooms: 4–6

## HARD SEMANTIC CONSTRAINTS

1. Key room must be reachable before the locked door
2. Locked door must block the shortest path to Exit
3. Treasure room must be optional and not on the critical path
4. All rooms must be connected
5. At most one optional loop in the graph

## GEOMETRY CONSTRAINTS

- Grid size: 10×10 to 25×25 (driven by density param)
- Integer coordinates only, rectangular rooms, orthogonal corridors, no overlaps

## INPUT PARAMETERS (must be UI-exposed)

- seed (integer): drives deterministic output
- difficulty (1–5): affects room count and locked door placement
- density (1–5): affects grid size and corridor length

## DETERMINISM REQUIREMENT

Same seed + difficulty + density must produce functionally identical layouts.
Plan exactly how to achieve this given that LLMs are stochastic.

---

## EXACT OUTPUT JSON SCHEMA

Plan the complete JSON schema the LLM must return, based on this shape:

{
"metadata": { "seed", "difficulty", "density", "gridSize": [w, h] },
"rooms": [ { "id", "type", "pos": [x, y], "size": [w, h] } ],
"corridors": [ { "from", "to", "path": [[x,y], ...] } ],
"doors": [ { "id", "type": "locked", "blocks": ["roomId", "roomId"] } ],
"selfCheck": {
"keyBeforeDoor": bool,
"doorBlocksCriticalPath": bool,
"treasureOptional": bool,
"connected": bool,
"loops": int,
"notes": []
}
}

Define every field, its type, allowed values, and validation rules.

---

## PLAN MUST INCLUDE THESE SECTIONS (in order):

### 1. File & Folder Structure

Exact Vite + vanilla JS project tree with a one-line description of every file.

### 2. Module Responsibilities

For each file/module: what it owns, what it imports, and what it exports.
Cover at minimum: llmAdapter, promptBuilder, validator, renderer, ui, main.

### 3. LLM Adapter Interface

Define the abstract provider interface in pseudocode/JSDoc. It must accept:
messages[], temperature, maxTokens, and an optional seed/system field.
Show how to swap providers via a config object.

### 4. Determinism Strategy

Explain exactly how to make outputs reproducible. Consider: temperature=0,
seed injection into the system prompt, prompt templating, and any fallbacks.

### 5. The Three Prompts — write these IN FULL, not as placeholders

#### 5a. SYSTEM PROMPT

Must enforce: role definition, JSON-only output (no prose, no markdown fences),
the full schema, all 5 semantic constraints stated explicitly,
and a mandatory chain-of-thought planning phase BEFORE emitting JSON
(e.g., "First reason through room positions and graph connectivity in a
<think> block, then emit the JSON object"). Include the selfCheck field
as a required part of the output.

#### 5b. USER PROMPT (parametric template)

Must inject: seed, difficulty, density, derived gridSize, and per-difficulty
hints about room count and locked door placement. Must instruct the model to
fill in selfCheck honestly. Show the template with {{placeholders}}.

#### 5c. REPAIR PROMPT

Takes: the invalid JSON output + a structured list of violated constraints.
Must ask for minimal surgical fixes only (no full regeneration).
Must re-emphasize the violated constraints specifically.
Show the template with {{placeholders}}.

### 6. Validation Algorithm

Pseudocode for a graph-based validator that checks all 5 semantic constraints
and all geometry constraints. For each check, specify:

- Input: what data it reads from the JSON
- Algorithm: how it checks the constraint (BFS/DFS where needed)
- Output: pass | { violated: "constraint name", detail: string }

Cover: connectivity (BFS from spawn), critical path (shortest path to exit),
key-before-door (path analysis), treasure off critical path, loop count,
room overlap detection, corridor validity.

### 7. Generation & Repair Orchestration

A flowchart (described in text/pseudocode) of the full runtime loop:
parse params → build user prompt → call LLM → parse JSON →
validate → if fail: repair once → re-validate →
if still fail: show error → else render.
Include a global 10-second timeout wrapper with graceful UI failure message.

### 8. Three.js Rendering Spec

Camera: orthographic, top-down, auto-fit to grid.
Color palette: define distinct hex colors for spawn, exit, key, treasure,
locked door, corridor, and wall cubes.
Cube geometry: all cubes 1×1×0.5 units, placed at (gridX, 0, gridY).
How to build the scene from the JSON (rooms as cube groups, corridors as
cube paths, door as a differently colored cube on the corridor path).
No lighting effects, no textures, no shadows.

### 9. UI Spec

Describe the minimal UI: inputs for seed, difficulty, density; a Generate button;
a status/error display; and the Three.js canvas. No styling framework needed —
plain CSS is fine. Specify what feedback is shown during generation, on success,
and on failure.

### 10. Risk & Edge Cases

List at least 5 concrete failure modes (e.g., LLM emits prose, JSON schema
mismatch, rooms overlap, graph disconnected, timeout exceeded) and how each
is handled.

---

Do not write implementation code. Plan only. Be specific, not vague.
Prefer concrete algorithms and exact values over "you could consider...".
