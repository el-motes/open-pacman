# SPEC 03 — Pastillas de poder

**Estado:** Approved
**Fecha:** 2026-09-14
**Depende de:** SPEC 01, SPEC 02

**Objetivo:** Cuatro power pellets en las esquinas clásicas activan modo asustado: fantasmas azules lentos y comestibles con cadena de puntos, y el fantasma comido regresa al pen como ojos, revive y vuelve a salir.

## Alcance

**Dentro:**

- 4 pellets en (1,3), (26,3), (1,23), (26,23) — valor 4 en el grid
- Modo asustado: 6s fijos, fantasmas azules a mitad de velocidad, random en intersecciones
- Fantasmas comestibles: cadena 200/400/800/1600, reset con cada pellet nuevo
- Ojos: regresan al pen, reviven y re-salen (reusa `exitPen`)
- Comer pellet: +50 pts, fantasmas sueltos invierten dirección
- Timer scatter/chase congelado durante asustado
- Render: pellet grande, azul con flash blanco final, ojos

**Fuera:**

- Duración decreciente por nivel (no hay niveles)
- Pausa de Pac-Man al comer fantasma (arcade la tiene)
- Bonus fruta
- Ghosts en pen congelados durante frightened (siguen saliendo por `releaseAt`)

## Modelo de datos

`maze.js`:

- `MAZE_STR` filas 3 y 23: `.` → `o` en cols 1 y 26
- `parseTile`: `'o'` → 4

`game.js` — constantes nuevas:

```js
const FRIGHT_FRAMES = 360; // 6s a 60fps
const FRIGHT_SPEED = 0.05; // mitad de GHOST_SPEED
```

`game.js` — game gana: `frightTimer` (frames restantes, 0 = inactivo), `frightChain` (fantasmas comidos en este frightened, inicia 0). Ghost gana: `eyes` (bool).

Frightened es condición global (`frightTimer > 0 && !g.eyes`), no estado por fantasma. Puntos por fantasma: `200 << game.frightChain`.

## Plan de implementación

1. `maze.js`: 4 `'o'` en filas 3/23 cols 1/26 + `parseTile` `'o'` → 4 + actualizar comentario del encabezado
2. `game.js` `createGame`: contar dots como `v === 2 || v === 4`; init `frightTimer: 0`, `frightChain: 0`; ghosts con `eyes: false`
3. `game.js` `movePacman`: comer pellet (grid 4 → 0, `score += 50`, `dotsRemaining--`, `frightTimer = FRIGHT_FRAMES`, `frightChain = 0`, fantasmas con `released && !eyes` invierten `dir`)
4. `game.js` `update`: `frightTimer--` si > 0; el bloque de alternancia scatter/chase solo corre con `frightTimer <= 0` (timer congelado)
5. `game.js` `decideGhost`: si `frightTimer > 0 && !g.eyes` → dir válida aleatoria (sin reversa, fallback 180 existente); si `g.eyes` → target `(13,14)`. Velocidad asustado `0.05` en `moveGhost`
6. `game.js` colisión: `g.eyes` → sin efecto; frightened → comer: `score += 200 << frightChain`, `frightChain++`, `g.eyes = true`; si no → muerte existente
7. `game.js` ojos: al quedar alineado en (13,11) → descenso manual (y += speed hasta 14, ignorando puerta, tipo `exitPen` invertido); al llegar → `eyes = false`, `released = false`, `releaseAt = game.frame` → `exitPen` existente lo saca de nuevo
8. `game.js` `resetPositions`: `frightTimer = 0`, `frightChain = 0`, `eyes = false` por ghost
9. `render.js`: pellet = círculo ~2x dot; asustado = cuerpo azul `#2121ff`, flash blanco alternando (~cada 8 frames) los últimos 120 frames; ojos = solo dos puntos blancos, sin cuerpo

## Criterios de aceptación

- [ ] 4 pellets visibles (más grandes que dots) en (1,3), (26,3), (1,23), (26,23)
- [ ] Comer pellet: +50, fantasmas sueltos se vuelven azules, lentos e invierten dirección
- [ ] Pellet durante frightened: timer reinicia a 6s, cadena vuelve a 200
- [ ] Fantasma asustado elige direcciones random sin reversa
- [ ] Comer fantasma: +200, +400, +800, +1600 en cadena; se convierte en ojos
- [ ] Ojos navegan hasta (13,11), bajan al pen, reviven y re-salen por la puerta
- [ ] Ojos cruzan a Pac-Man sin efecto (no mata, no se come)
- [ ] Timer scatter/chase congelado mientras dura asustado; al expirar, fantasmas vuelven a normal sin re-trigger
- [ ] Flash blanco los últimos 2s del asustado
- [ ] Perder vida: frightened cancela, reset sin regresión (SPEC 01 y 02 intactos)
- [ ] Victoria exige los 4 pellets también (244 celdas comestibles totales)

## Decisiones tomadas y descartadas

- **Modo asustado completo** sobre solo pellets: specs 01/02 lo diferieron aquí; pellets sin efecto en fantasmas no tienen sentido
- **Posiciones clásicas** (1,3)(26,3)(1,23)(26,23): hoy son dots, se promueven; fiel al arcade
- **Valor 4 + char 'o'**: consistente con el esquema 0/1/2/3 y strings legibles
- **Frightened global (timer) + `eyes` por fantasma**: mínimo estado; fantasma que sale del pen con timer activo sale asustado sin caso especial
- **Random en intersecciones**: arcade, y menos código que target
- **Ojos reusan `decideGhost`** con target pen + descenso manual + `exitPen` para revivir: cero pathfinding nuevo; la puerta sólida del SPEC 02 queda intacta (cruces siempre manuales)
- **Cadena `200 << frightChain`**: arcade, una línea
- **6s fijo**: no hay niveles que lo decrezcan
- **Pausa de modeTimer**: arcade; evita alternar modos en medio del asustado
- **Pausa de Pac-Man al comer fantasma** (arcade): fuera — requiere freeze del loop, no vale el código

## Riesgos

- **Random mete asustado en callejón**: fallback de 180° ya existe en `decideGhost` — cubierto
- **Ojos oscilan cerca de (13,11)** (door = muro bloquea el descenso por `canMove`): regla explícita — en (13,11) alineado se baja manual, `decideGhost` no interviene
- **Fantasma comido justo al expirar frightened**: colisión come solo si `frightTimer > 0` en ese frame; expirado = muerte, mismo criterio que el render
- **`resetPositions` con ojos en tránsito**: paso 8 fuerza `eyes = false` — ningún fantasma revive raro tras perder vida
