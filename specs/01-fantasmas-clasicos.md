# SPEC 01 — Fantasmas clásicos

**Estado:** Approved
**Fecha:** 2026-09-14
**Depende de:** ninguno

**Objetivo:** Cuatro fantasmas con personalidades clásicas del arcade (Blinky, Pinky, Inky, Clyde), ciclo scatter/chase temporizado y salida escalonada de la pocilga, con Blinky como perseguidor agresivo.

## Alcance

**Dentro:**

- 4 fantasmas con conductas distintas: Blinky (directo), Pinky (emboscada), Inky (flanqueo), Clyde (tímido)
- Ciclo scatter/chase temporizado con inversión de dirección al cambiar
- Salida escalonada de la pocilga
- Colores por fantasma

**Fuera:**

- Pastillas de poder, modo asustado, fantasmas comestibles (spec futuro)
- Diferencias de velocidad entre fantasmas
- Fases decrecientes del arcade (Cruise Elroy, schedule real de niveles)
- Niveles / dificultad creciente

## Modelo de datos

`maze.js`:

```js
GHOST_STARTS = [
  { x: 13, y: 11, kind: 'blinky' }, // fuera de la pocilga
  { x: 13, y: 14, kind: 'pinky' },
  { x: 12, y: 14, kind: 'inky' },
  { x: 15, y: 14, kind: 'clyde' },
];
SCATTER_CORNERS = {
  blinky: { x: 25, y: 0 },
  pinky:  { x: 2,  y: 0 },
  inky:   { x: 27, y: 30 },
  clyde:  { x: 0,  y: 30 },
};
```

`game.js` — cada ghost gana: `releaseAt` (frame), `released` (bool). Game gana: `frame` (contador), `mode` (`'scatter' | 'chase'`), `modeTimer`. Constantes: `SCATTER_FRAMES = 420` (7s), `CHASE_FRAMES = 1200` (20s), `EXIT_DELAY = { pinky: 120, inky: 360, clyde: 540 }` (~2s/6s/9s a 60fps).

## Plan de implementación

1. `maze.js`: 4 `GHOST_STARTS` con `kind` nuevos + `SCATTER_CORNERS`
2. `game.js`: `createGame` inicializa `frame`, `mode: 'scatter'`, `modeTimer`, ghosts con `releaseAt`/`released` (blinky `released: true`)
3. `game.js`: `update` incrementa `game.frame`, decrementa `modeTimer`, alterna scatter/chase; al alternar, cada fantasma suelto invierte `dir`
4. `game.js`: liberación — al llegar `frame >= releaseAt`, ghost camina hacia x=13, sube por la puerta (13,12) hasta (13,11), marca `released`
5. `game.js`: `decideGhost` con target por kind en chase: blinky → celda de Pac-Man; pinky → Pac-Man + 4·dir; inky → pivot = Pac-Man + 2·dir, target = 2·pivot − Blinky; clyde → Pac-Man si dist Manhattan > 8, si no su esquina. En scatter → esquina propia. Elección: dirección válida (sin reversa, salvo callejón) que minimiza distancia Manhattan al target
6. `render.js`: `GHOST_COLORS` por orden blinky rojo `#ff0000`, pinky rosa `#ffb8ff`, inky cian `#00ffff`, clyde naranja `#ffb852`
7. `game.js`: `resetPositions` re-escalona liberaciones relativas al frame actual

## Criterios de aceptación

- [ ] 4 fantasmas visibles: rojo, rosa, cian, naranja
- [ ] Blinky arranca fuera de la pocilga en (13,11)
- [ ] Pinky, Inky y Clyde salen ~2s, ~6s y ~9s después, subiendo por la puerta
- [ ] En chase, Blinky converge directo a Pac-Man
- [ ] Pinky navega hacia 4 celdas delante de la dirección de Pac-Man
- [ ] Inky flanquea usando el vector Blinky→(2 delante de Pac-Man) duplicado
- [ ] Clyde persigue a >8 celdas y regresa a su esquina a ≤8
- [ ] Modo alterna scatter 7s / chase 20s; al cambiar, fantasmas sueltos invierten dirección
- [ ] En scatter, cada fantasma navega a su esquina
- [ ] Colisión quita vida, victoria y derrota sin regresión
- [ ] Sin pastillas de poder ni modo asustado

## Decisiones tomadas y descartadas

- **Personalidades clásicas** sobre custom: probadas, visibly distintas
- **Blinky = agresivo** (extiende el `hunter` existente)
- **Pinky sin bug del original** (arriba no desplaza 4 a la izquierda): simple y suficiente
- **Ciclo repetitivo 7s/20s** en vez de fases decrecientes del arcade: menos código, comportamiento claro
- **Liberación por frames fijos**, no por dots comidos: más simple
- **Velocidad igual** para los 4: diferencias de velocidad van con Cruise Elroy, fuera de alcance
- **Power pellets a spec futuro**: tocaba maze, colisiones, render y score; no cabía en una oración

## Riesgos

- **Targets en muro** (pinky/inky apuntan a celdas no transitables): el target solo se usa para distancia Manhattan, no necesita ser transitable — sin problema real
- **Reset tras perder vida**: re-escalonar liberaciones o fantasmas salen todos a la vez tras morir; paso 7 lo cubre
- **Inky depende de posición de Blinky**: Blinky siempre está suelto, target siempre computable
