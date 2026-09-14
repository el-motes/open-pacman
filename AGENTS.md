# AGENTS.md

Pac-Man clone in vanilla JS/HTML/CSS. No build system, no npm, no tests, no linter.

## Run

Open `src/index.html` in a browser (or any static server on `src/`). Nothing else required.

## Architecture

Plain `<script>` tags, no modules. **Load order in `src/index.html` is significant** — files communicate via globals:

1. `src/js/maze.js` — data only. Exports globals: `MAZE` (28x31 grid), `TUNNEL_ROW`, `PACMAN_START`, `GHOST_STARTS`
2. `src/js/game.js` — state + rules. `createGame()` / `update(game)`
3. `src/js/render.js` — `draw(ctx, game, frame)`. Draws from `game.grid`, **not** `MAZE`, so eaten dots reflect
4. `src/js/main.js` — game loop, keyboard input (arrows), overlay screens

Grid cell values: `0` empty, `1` wall, `2` dot, `3` pen door. Coordinates: cell `(x,y)`, origin top-left, `x ∈ [0,27]`, `y ∈ [0,30]`. Maze is symmetric about the vertical axis between cols 13 and 14.

Movement uses fractional cell positions (e.g. `PACMAN_SPEED = 0.125` cells/frame); direction changes only apply when aligned to a cell.

## Conventions

- Comments, UI text, and README are in **Spanish** — keep it that way
- Formatting: spaces inside parens and brackets — `foo( x )`, `grid[ y ][ x ]` — no formatter config exists; match existing style
- Maze is defined as readable strings in `maze.js` (`MAZE_STR`) and parsed to numbers; edit the strings, not the parsed grid

## Spec-driven workflow

This repo is a Spec Driven Development learning project. Skills `spec` and `spec-impl` are installed (see `skills-lock.json`). Specs live in `specs/` as `NN-slug.md` (zero-padded, sequential). The `spec` skill writes specs; `spec-impl` implements approved ones on a branch named after the spec.
