# Design Document

## Feature: flappy-bird-game

---

## Overview

Videojuego Flappy Bird implementado en HTML5, CSS y JavaScript puro. La arquitectura se organiza en tres archivos (`index.html`, `style.css`, `game.js`) con un único módulo de juego que gestiona el estado global, el game loop, la física, la generación de obstáculos, la detección de colisiones y la persistencia del HighScore en `localStorage`. El renderizado se realiza íntegramente sobre un elemento `<canvas>` responsive mediante `requestAnimationFrame`.

---

## Architecture

```
index.html          ← Estructura HTML, referencia a style.css y game.js
style.css           ← Estilos globales, centrado del canvas, fuentes, fondo
game.js             ← Toda la lógica del juego (estado, física, render, input)
```

### Flujo de estados

```
MENU ──(space/click)──► PLAYING ──(colisión)──► GAMEOVER
                                                    │
                         ◄──────(space/click)───────┘
```

### Módulos lógicos dentro de game.js

| Módulo | Responsabilidad |
|---|---|
| `GameState` | Objeto central con estado actual, score, highscore, bird, pipes |
| `Bird` | Posición, velocidad, radio, rotación, lógica de flap y gravedad |
| `Pipe` | Posición x, gapY, ancho, velocidad, flag de puntuación |
| `InputHandler` | Listeners de `keydown`, `click`, `touchstart` |
| `Renderer` | Funciones de dibujo para cada pantalla y elemento |
| `GameLoop` | `requestAnimationFrame`, cálculo de delta time, orquestación |
| `Storage` | Lectura/escritura de HighScore en `localStorage` con fallback |
| `CollisionDetector` | Detección AABB con margen de tolerancia |

---

## Components

### 1. `index.html`

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Flappy Bird</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <canvas id="gameCanvas"></canvas>
  <script src="game.js"></script>
</body>
</html>
```

### 2. `style.css`

Estilos mínimos: `body` con `margin: 0`, `overflow: hidden`, fondo neutro; `#gameCanvas` con `display: block` para eliminar espacio inline. No se aplican dimensiones fijas al canvas desde CSS — las dimensiones se gestionan desde JavaScript.

### 3. `game.js` — Estructura principal

```javascript
// ── Constantes de configuración ──────────────────────────────────────────────
const CONFIG = {
  gravity: 1800,          // px/s²
  flapImpulse: -520,      // px/s (negativo = hacia arriba)
  pipeSpeed: 220,         // px/s
  pipeWidth: 60,          // px
  gapSize: 160,           // px (altura del hueco entre tuberías)
  pipeInterval: 1600,     // ms entre generación de pipes
  collisionMargin: 2,     // px de tolerancia
  birdRadius: 18,         // px
  minGapRatio: 0.2,       // fracción del canvas height para el centro del gap
  maxGapRatio: 0.8,
};

// ── Estado global ─────────────────────────────────────────────────────────────
const state = {
  screen: 'menu',         // 'menu' | 'playing' | 'gameover'
  score: 0,
  highScore: 0,
  bird: { x, y, vy, rotation },
  pipes: [],              // Array de objetos Pipe
  lastPipeTime: 0,
  lastFrameTime: 0,
};
```

---

## Interfaces

### Bird Object

```javascript
{
  x: number,          // posición horizontal fija (25% del canvas width)
  y: number,          // posición vertical actual
  vy: number,         // velocidad vertical (px/s)
  rotation: number,   // ángulo de rotación en radianes
  radius: number,     // radio del círculo (CONFIG.birdRadius)
}
```

### Pipe Object

```javascript
{
  x: number,          // posición horizontal del borde izquierdo
  gapY: number,       // centro vertical del hueco
  scored: boolean,    // true si ya se sumó punto por este pipe
}
```

### GameState Screens

| `state.screen` | Descripción |
|---|---|
| `'menu'` | MenuScreen activa |
| `'playing'` | GameplayScreen activa, física en marcha |
| `'gameover'` | GameOverScreen activa |

---

## Data Models

### HighScore en localStorage

- **Clave**: `'flappyBirdHighScore'`
- **Valor**: string numérico entero (ej. `"42"`)
- **Lectura**: `parseInt(localStorage.getItem('flappyBirdHighScore') || '0', 10)`
- **Escritura**: `localStorage.setItem('flappyBirdHighScore', String(newHighScore))`
- **Fallback**: Si `localStorage` lanza excepción, el highscore se mantiene en `state.highScore` en memoria sin propagar el error.

---

## Key Algorithms

### Game Loop con Delta Time

```javascript
function gameLoop(timestamp) {
  const deltaTime = Math.min((timestamp - state.lastFrameTime) / 1000, 0.05); // segundos, cap 50ms
  state.lastFrameTime = timestamp;

  if (state.screen === 'playing') {
    updatePhysics(deltaTime);
    updatePipes(deltaTime, timestamp);
    checkCollisions();
    checkScoring();
  }

  render();
  requestAnimationFrame(gameLoop);
}
```

El cap de 50 ms evita saltos grandes al volver de una pestaña en segundo plano.

### Física del Bird

```javascript
function updatePhysics(dt) {
  state.bird.vy += CONFIG.gravity * dt;
  state.bird.y  += state.bird.vy * dt;
  // Rotación proporcional a la velocidad vertical
  state.bird.rotation = Math.max(-0.5, Math.min(Math.PI / 2, state.bird.vy / 800));
}
```

### Flap

```javascript
function flap() {
  state.bird.vy = CONFIG.flapImpulse;
}
```

### Generación de Pipes

```javascript
function spawnPipe(timestamp) {
  const minY = canvas.height * CONFIG.minGapRatio;
  const maxY = canvas.height * CONFIG.maxGapRatio;
  const gapY = minY + Math.random() * (maxY - minY);
  state.pipes.push({ x: canvas.width, gapY, scored: false });
  state.lastPipeTime = timestamp;
}
```

### Detección de Colisiones (AABB con margen)

```javascript
function checkCollisions() {
  const b = state.bird;
  const m = CONFIG.collisionMargin;
  const r = b.radius - m;

  // Bordes del canvas
  if (b.y + r >= canvas.height || b.y - r <= 0) { triggerGameOver(); return; }

  for (const pipe of state.pipes) {
    const pw = CONFIG.pipeWidth;
    const gh = CONFIG.gapSize / 2;

    // Bounding box del bird (círculo aproximado como cuadrado con margen)
    const bLeft  = b.x - r, bRight = b.x + r;
    const bTop   = b.y - r, bBottom = b.y + r;

    // Rango horizontal del pipe
    if (bRight < pipe.x || bLeft > pipe.x + pw) continue;

    // Pipe superior: de 0 a (gapY - gapSize/2)
    if (bTop < pipe.gapY - gh) { triggerGameOver(); return; }
    // Pipe inferior: de (gapY + gapSize/2) a canvas.height
    if (bBottom > pipe.gapY + gh) { triggerGameOver(); return; }
  }
}
```

### Puntuación

```javascript
function checkScoring() {
  for (const pipe of state.pipes) {
    if (!pipe.scored && pipe.x + CONFIG.pipeWidth < state.bird.x) {
      pipe.scored = true;
      state.score++;
    }
  }
}
```

### Canvas Responsive

```javascript
function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas(); // llamada inicial
```

---

## Rendering

### Paleta de colores

| Elemento | Color |
|---|---|
| Fondo cielo | Gradiente lineal `#87CEEB` → `#E0F4FF` |
| Suelo | Gradiente lineal `#8BC34A` → `#558B2F` |
| Bird | Gradiente radial `#FFD700` → `#FF8C00` |
| Pipes | Gradiente lineal `#4CAF50` → `#2E7D32` |
| Texto | `#FFFFFF` con sombra `rgba(0,0,0,0.4)` |

### Capas de renderizado (orden)

1. Fondo (gradiente cielo)
2. Pipes (superior e inferior)
3. Suelo
4. Bird (con rotación)
5. HUD (score durante gameplay)
6. Overlay de pantalla (menu / gameover)

---

## Error Handling

| Escenario | Manejo |
|---|---|
| `localStorage` no disponible | Try/catch en `Storage.read()` y `Storage.write()`; highscore en memoria |
| Delta time excesivo (pestaña oculta) | Cap de 50 ms en el cálculo de `deltaTime` |
| Canvas no soportado | Mensaje de texto de fallback dentro del elemento `<canvas>` |
| Resize durante gameplay | `resizeCanvas()` reposiciona el bird al 25% del nuevo ancho; los pipes se escalan proporcionalmente |

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Canvas resize matches viewport

*For any* viewport width and height, after a resize event is triggered, the canvas `width` and `height` attributes SHALL equal the viewport dimensions.

**Validates: Requirements 2.2**

---

### Property 2: Gravity increases velocity each tick

*For any* bird state (position, velocity) and any positive delta time, after one physics update, the bird's vertical velocity SHALL equal the previous velocity plus `CONFIG.gravity * deltaTime`.

**Validates: Requirements 5.1**

---

### Property 3: Flap sets velocity to impulse constant

*For any* bird vertical velocity, after a flap action is executed, the bird's vertical velocity SHALL equal `CONFIG.flapImpulse`, regardless of the previous velocity.

**Validates: Requirements 5.2**

---

### Property 4: Pipes move left by speed × deltaTime

*For any* pipe x-position and any positive delta time, after one update tick, the pipe's x-position SHALL equal the previous x minus `CONFIG.pipeSpeed * deltaTime`.

**Validates: Requirements 5.3**

---

### Property 5: Generated pipe gap is within playable bounds

*For any* generated pipe, the gap center y-coordinate SHALL satisfy `canvas.height * CONFIG.minGapRatio ≤ gapY ≤ canvas.height * CONFIG.maxGapRatio`.

**Validates: Requirements 5.4**

---

### Property 6: Score increments by exactly 1 per pipe passed

*For any* game state with score S and a pipe that the bird has just fully passed (bird.x > pipe.x + pipeWidth), the score SHALL equal S + 1 after the scoring check, and the pipe's `scored` flag SHALL be true.

**Validates: Requirements 5.6**

---

### Property 7: Overlapping bounding boxes trigger collision

*For any* bird bounding box and pipe bounding box that geometrically overlap (after applying the collision margin), the collision detector SHALL return `true`.

**Validates: Requirements 6.1, 6.2, 6.3**

---

### Property 8: Non-overlapping boxes within margin do not trigger collision

*For any* bird and pipe pair where the closest edges are separated by less than `CONFIG.collisionMargin` pixels but do not overlap, the collision detector SHALL return `false`.

**Validates: Requirements 6.4**

---

### Property 9: HighScore updates when score exceeds stored value

*For any* completed game where `score > highScore`, after game-over processing, `state.highScore` SHALL equal `score` and `localStorage` SHALL contain the new value (when storage is available).

**Validates: Requirements 7.4, 8.2**

---

### Property 10: Space/click triggers correct action for any game state

*For any* valid game state (`'menu'`, `'playing'`, `'gameover'`), pressing Space or triggering a click/touchstart event SHALL execute the action mapped to that state: start game (menu), flap (playing), or restart (gameover).

**Validates: Requirements 9.1, 9.2**

---

### Property 11: Delta time drives physics independently of frame rate

*For any* two consecutive frame timestamps T1 and T2, the delta time used in physics updates SHALL equal `(T2 - T1) / 1000` seconds (capped at 0.05 s), ensuring position changes are proportional to elapsed time and not to frame count.

**Validates: Requirements 10.2**
