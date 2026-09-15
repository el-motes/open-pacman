# SPEC 02 — Puerta de la pocilga de un solo sentido

**Estado:** Approved
**Fecha:** 2026-09-14
**Depende de:** SPEC 01

**Objetivo:** Los fantasmas liberados no pueden re-entrar a la pocilga — la puerta (valor 3) los bloquea en el pathfinding igual que a Pac-Man.

## Alcance

**Dentro:**

- `isWall` en `src/js/game.js` trata la puerta (3) como muro para todos los actores
- La salida escalonada del SPEC 01 queda intacta (`exitPen` cruza la puerta manualmente, sin `canMove`)

**Fuera:**

- Cambios al timing de liberación (2s/6s/9s se mantiene)
- Fantasmas comidos regresando al pen (va con power pellets, spec futuro)
- Animación de la puerta

## Modelo de datos

Sin datos nuevos. La puerta ya existe como valor `3` en el grid; se cambia una regla, no una estructura.

## Plan de implementación

1. `src/js/game.js` — `isWall`: reemplazar `if ( v === 3 && actor === 'pacman' ) return true;` por `if ( v === 3 ) return true;` y actualizar comentario (fantasmas salen vía `exitPen`, que mueve manualmente sin `canMove`). Manual: jugar, fantasmas salen escalonados y ninguno re-entra.

## Criterios de aceptación

- [ ] Blinky arranca fuera de la pocilga y nunca entra
- [ ] Pinky/Inky/Clyde salen ~2s/~6s/~9s subiendo por (13,12) hasta (13,11)
- [ ] Ningún fantasma liberado vuelve a entrar al pen (bajar por la puerta es imposible)
- [ ] Pac-Man sigue sin poder cruzar la puerta
- [ ] Sin errores en consola; colisión, scatter/chase y reset sin regresión

## Decisiones tomadas y descartadas

- **Puerta sólida para todos** sobre "sólida solo para liberados": `exitPen` ya mueve manualmente sin `canMove`; no hace falta flag extra en `isWall`
- **Causa raíz en `isWall`** (guard compartido) sobre parche en `decideGhost` o por fantasma: un guard cubre a los 4
- **Re-entrada de fantasmas comidos** (arcade): fuera de alcance, pertenece al spec de power pellets

## Riesgos

- **Ninguno relevante** — verificado por simulación node de 20000 frames: 1565 frames con fantasma liberado dentro del pen antes del fix, 0 después
