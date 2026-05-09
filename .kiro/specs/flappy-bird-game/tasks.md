# Implementation Plan: flappy-bird-game

## Overview

Implementación del videojuego Flappy Bird en tres archivos (`index.html`, `style.css`, `game.js`) usando HTML5 Canvas, CSS puro y JavaScript vanilla. El plan sigue el flujo de estados MENU → PLAYING → GAMEOVER, construyendo incrementalmente desde la estructura base hasta la integración completa con controles, física, colisiones, puntuación y persistencia.

---

## Tasks

- [ ] 1. Crear estructura base del proyecto
  - [ ] 1.1 Crear `index.html` con canvas y referencias a archivos externos
    - Crear el archivo `index.html` con `<!DOCTYPE html>`, `<meta charset>`, `<meta viewport>`, `<link>` a `style.css` y `<script>` a `game.js`
    - Incluir `<canvas id="gameCanvas">` con texto de fallback para navegadores sin soporte
    - _Requirements: 1.1, 1.2, 1.3_

  - [ ] 1.2 Crear `style.css` con estilos base
    - Aplicar `margin: 0`, `overflow: hidden` al `body` y `display: block` al `#gameCanvas`
    - No definir dimensiones fijas en CSS; dejar el sizing al JS
    - _Requirements: 1.1, 3.3_

- [ ] 2. Implementar núcleo de `game.js`: configuración, estado y canvas responsive
  - [ ] 2.1 Definir `CONFIG` y `state` globales, e inicializar canvas responsive
    - Escribir el objeto `CONFIG` con todas las constantes (gravity, flapImpulse, pipeSpeed, pipeWidth, gapSize, pipeInterval, collisionMargin, birdRadius, minGapRatio, maxGapRatio)
    - Escribir el objeto `state` inicial (screen: 'menu', score, highScore, bird, pipes, lastPipeTime, lastFrameTime)
    - Implementar `resizeCanvas()` que asigna `canvas.width = window.innerWidth` y `canvas.height = window.innerHeight`, y registrar el listener `resize`
    - _Requirements: 2.1, 2.2, 10.1_

  - [ ]* 2.2 Escribir property test para canvas resize (Property 1)
    - **Property 1: Canvas resize matches viewport**
    - **Validates: Requirements 2.2**

- [ ] 3. Implementar módulo `Storage` (HighScore en localStorage)
  - [ ] 3.1 Implementar funciones `readHighScore()` y `writeHighScore(value)`
    - `readHighScore()`: `parseInt(localStorage.getItem('flappyBirdHighScore') || '0', 10)` dentro de try/catch; retorna 0 si falla
    - `writeHighScore(value)`: `localStorage.setItem('flappyBirdHighScore', String(value))` dentro de try/catch; silencia errores
    - Llamar `readHighScore()` al inicio para inicializar `state.highScore`
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [ ]* 3.2 Escribir property test para actualización de HighScore (Property 9)
    - **Property 9: HighScore updates when score exceeds stored value**
    - **Validates: Requirements 7.4, 8.2**

- [ ] 4. Implementar física del Bird y acción Flap
  - [ ] 4.1 Implementar `updatePhysics(dt)` y `flap()`
    - `updatePhysics(dt)`: incrementar `state.bird.vy += CONFIG.gravity * dt`, actualizar `state.bird.y += state.bird.vy * dt`, calcular rotación proporcional a vy
    - `flap()`: asignar `state.bird.vy = CONFIG.flapImpulse`
    - _Requirements: 5.1, 5.2, 3.4_

  - [ ]* 4.2 Escribir property test para gravedad (Property 2)
    - **Property 2: Gravity increases velocity each tick**
    - **Validates: Requirements 5.1**

  - [ ]* 4.3 Escribir property test para flap (Property 3)
    - **Property 3: Flap sets velocity to impulse constant**
    - **Validates: Requirements 5.2**

- [ ] 5. Implementar generación y movimiento de Pipes
  - [ ] 5.1 Implementar `spawnPipe(timestamp)` y `updatePipes(dt, timestamp)`
    - `spawnPipe`: calcular `gapY` aleatorio entre `canvas.height * minGapRatio` y `canvas.height * maxGapRatio`; hacer push a `state.pipes`
    - `updatePipes`: mover cada pipe `x -= CONFIG.pipeSpeed * dt`; eliminar pipes fuera de pantalla (`x + pipeWidth < 0`); generar nuevo pipe si ha pasado `pipeInterval` ms
    - _Requirements: 5.3, 5.4_

  - [ ]* 5.2 Escribir property test para movimiento de pipes (Property 4)
    - **Property 4: Pipes move left by speed × deltaTime**
    - **Validates: Requirements 5.3**

  - [ ]* 5.3 Escribir property test para posición del gap (Property 5)
    - **Property 5: Generated pipe gap is within playable bounds**
    - **Validates: Requirements 5.4**

- [ ] 6. Implementar detección de colisiones y puntuación
  - [ ] 6.1 Implementar `checkCollisions()` con AABB y margen de tolerancia
    - Detectar colisión con borde inferior (`b.y + r >= canvas.height`) y superior (`b.y - r <= 0`)
    - Para cada pipe: verificar solapamiento horizontal; si hay solapamiento, verificar si el bird está fuera del gap (pipe superior o inferior)
    - Aplicar `r = b.radius - CONFIG.collisionMargin` en todos los cálculos
    - Llamar `triggerGameOver()` al detectar colisión
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ]* 6.2 Escribir property test para colisión positiva (Property 7)
    - **Property 7: Overlapping bounding boxes trigger collision**
    - **Validates: Requirements 6.1, 6.2, 6.3**

  - [ ]* 6.3 Escribir property test para margen de tolerancia (Property 8)
    - **Property 8: Non-overlapping boxes within margin do not trigger collision**
    - **Validates: Requirements 6.4**

  - [ ] 6.4 Implementar `checkScoring()`
    - Iterar `state.pipes`; si `!pipe.scored && pipe.x + CONFIG.pipeWidth < state.bird.x`, incrementar `state.score` y marcar `pipe.scored = true`
    - _Requirements: 5.6_

  - [ ]* 6.5 Escribir property test para puntuación (Property 6)
    - **Property 6: Score increments by exactly 1 per pipe passed**
    - **Validates: Requirements 5.6**

- [ ] 7. Checkpoint — Verificar física, pipes y colisiones
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Implementar `InputHandler` y gestión de estados de pantalla
  - [ ] 8.1 Implementar listeners de input y funciones de transición de estado
    - Registrar `keydown` (Space), `click` y `touchstart` (con `preventDefault`) sobre el canvas
    - Implementar lógica de despacho: en `'menu'` → `startGame()`; en `'playing'` → `flap()`; en `'gameover'` → `restartGame()`
    - `startGame()`: inicializar bird, pipes, score, cambiar `state.screen` a `'playing'`
    - `restartGame()`: reutilizar `startGame()` para reiniciar
    - `triggerGameOver()`: actualizar highscore si corresponde, llamar `writeHighScore`, cambiar `state.screen` a `'gameover'`
    - _Requirements: 4.4, 7.1, 7.4, 7.6, 9.1, 9.2, 9.3_

  - [ ]* 8.2 Escribir property test para input por estado (Property 10)
    - **Property 10: Space/click triggers correct action for any game state**
    - **Validates: Requirements 9.1, 9.2**

- [ ] 9. Implementar `Renderer` (todas las pantallas y elementos)
  - [ ] 9.1 Implementar funciones de renderizado para fondo, suelo, bird y pipes
    - `drawBackground()`: gradiente lineal cielo `#87CEEB` → `#E0F4FF`
    - `drawGround()`: franja inferior con gradiente `#8BC34A` → `#558B2F`
    - `drawBird()`: círculo con gradiente radial `#FFD700` → `#FF8C00`, aplicar rotación con `ctx.save/restore`
    - `drawPipes()`: rectángulos con gradiente lineal `#4CAF50` → `#2E7D32` para cada pipe (segmento superior e inferior)
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ] 9.2 Implementar HUD de score y overlays de MenuScreen y GameOverScreen
    - `drawHUD()`: mostrar `state.score` centrado en pantalla durante gameplay
    - `drawMenu()`: título prominente + instrucciones de controles (Space / tap)
    - `drawGameOver()`: mostrar score de la partida, highscore y instrucciones de reinicio
    - Texto en `#FFFFFF` con sombra `rgba(0,0,0,0.4)`
    - _Requirements: 4.1, 4.2, 4.3, 5.7, 7.2, 7.3, 7.5_

- [ ] 10. Implementar `GameLoop` con delta time y orquestar todo
  - [ ] 10.1 Implementar `gameLoop(timestamp)` y arrancar el loop
    - Calcular `deltaTime = Math.min((timestamp - state.lastFrameTime) / 1000, 0.05)`
    - Si `state.screen === 'playing'`: llamar `updatePhysics`, `updatePipes`, `checkCollisions`, `checkScoring`
    - Llamar `render()` (que invoca todos los drawers en orden de capas)
    - Llamar `requestAnimationFrame(gameLoop)` al final
    - Arrancar con `requestAnimationFrame(gameLoop)` tras la inicialización
    - _Requirements: 10.1, 10.2, 10.3, 3.5_

  - [ ]* 10.2 Escribir property test para delta time (Property 11)
    - **Property 11: Delta time drives physics independently of frame rate**
    - **Validates: Requirements 10.2**

- [ ] 11. Implementar resize durante gameplay y ajuste proporcional de elementos
  - [ ] 11.1 Actualizar `resizeCanvas()` para reposicionar bird y escalar pipes al redimensionar
    - Al hacer resize: recalcular `state.bird.x = canvas.width * 0.25`; escalar `gapY` de cada pipe proporcionalmente al nuevo `canvas.height`
    - _Requirements: 2.2, 2.3_

- [ ] 12. Checkpoint final — Integración completa
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido
- Cada tarea referencia requisitos específicos para trazabilidad
- Los property tests validan propiedades universales de corrección definidas en el diseño
- Los tests unitarios validan casos concretos y condiciones de borde
- El orden de las capas de renderizado es crítico: fondo → pipes → suelo → bird → HUD → overlay

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "3.1"] },
    { "id": 3, "tasks": ["3.2", "4.1"] },
    { "id": 4, "tasks": ["4.2", "4.3", "5.1"] },
    { "id": 5, "tasks": ["5.2", "5.3", "6.1"] },
    { "id": 6, "tasks": ["6.2", "6.3", "6.4"] },
    { "id": 7, "tasks": ["6.5", "8.1"] },
    { "id": 8, "tasks": ["8.2", "9.1"] },
    { "id": 9, "tasks": ["9.2"] },
    { "id": 10, "tasks": ["10.1"] },
    { "id": 11, "tasks": ["10.2", "11.1"] }
  ]
}
```
