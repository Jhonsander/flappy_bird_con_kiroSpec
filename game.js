// ─────────────────────────────────────────────────────────────────────────────
// Flappy Bird — game.js
// Arquitectura: CONFIG → state → Storage → Physics → Pipes → Collisions →
//               Scoring → Input → Renderer → GameLoop
// ─────────────────────────────────────────────────────────────────────────────

// Polyfill para CanvasRenderingContext2D.roundRect (navegadores más antiguos)
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    const radius = typeof r === 'number' ? r : (Array.isArray(r) ? r[0] : 0);
    const tl = Array.isArray(r) ? (r[0] || 0) : radius;
    const tr = Array.isArray(r) ? (r[1] || 0) : radius;
    const br = Array.isArray(r) ? (r[2] || 0) : radius;
    const bl = Array.isArray(r) ? (r[3] || 0) : radius;
    this.moveTo(x + tl, y);
    this.lineTo(x + w - tr, y);
    this.quadraticCurveTo(x + w, y, x + w, y + tr);
    this.lineTo(x + w, y + h - br);
    this.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
    this.lineTo(x + bl, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - bl);
    this.lineTo(x, y + tl);
    this.quadraticCurveTo(x, y, x + tl, y);
    this.closePath();
    return this;
  };
}

// ── Constantes de configuración ──────────────────────────────────────────────
const CONFIG = {
  gravity: 1800,        // px/s²
  flapImpulse: -520,    // px/s (negativo = hacia arriba)
  pipeSpeed: 220,       // px/s
  pipeWidth: 60,        // px
  gapSize: 160,         // px (altura del hueco entre tuberías)
  pipeInterval: 1600,   // ms entre generación de pipes
  collisionMargin: 2,   // px de tolerancia
  birdRadius: 18,       // px
  minGapRatio: 0.2,     // fracción del canvas height para el centro del gap
  maxGapRatio: 0.8,
  groundHeight: 60,     // px de franja de suelo
};

// ── Canvas ────────────────────────────────────────────────────────────────────
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ── Estado global ─────────────────────────────────────────────────────────────
const state = {
  screen: 'menu',       // 'menu' | 'playing' | 'gameover'
  score: 0,
  highScore: 0,
  bird: {
    x: 0,
    y: 0,
    vy: 0,
    rotation: 0,
    radius: CONFIG.birdRadius,
  },
  pipes: [],            // Array de objetos { x, gapY, scored }
  lastPipeTime: 0,
  lastFrameTime: 0,
};

// ─────────────────────────────────────────────────────────────────────────────
// Módulo: Storage
// ─────────────────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'flappyBirdHighScore';

function readHighScore() {
  try {
    return parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
  } catch (e) {
    return 0;
  }
}

function writeHighScore(value) {
  try {
    localStorage.setItem(STORAGE_KEY, String(value));
  } catch (e) {
    // Silenciar errores de localStorage (modo privado, cuota, etc.)
  }
}

// Inicializar highScore desde localStorage
state.highScore = readHighScore();

// ─────────────────────────────────────────────────────────────────────────────
// Módulo: Canvas Responsive
// ─────────────────────────────────────────────────────────────────────────────
function resizeCanvas() {
  const prevHeight = canvas.height || window.innerHeight;

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  // Reposicionar bird al 25% del ancho
  state.bird.x = canvas.width * 0.25;

  // Escalar gapY de los pipes proporcionalmente al nuevo alto
  if (prevHeight > 0 && state.pipes.length > 0) {
    const ratio = canvas.height / prevHeight;
    for (const pipe of state.pipes) {
      pipe.gapY *= ratio;
    }
  }
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas(); // llamada inicial

// ─────────────────────────────────────────────────────────────────────────────
// Módulo: Física del Bird
// ─────────────────────────────────────────────────────────────────────────────
function updatePhysics(dt) {
  state.bird.vy += CONFIG.gravity * dt;
  state.bird.y += state.bird.vy * dt;
  // Rotación proporcional a la velocidad vertical: cae → rota hacia abajo
  state.bird.rotation = Math.max(-0.5, Math.min(Math.PI / 2, state.bird.vy / 800));
}

function flap() {
  state.bird.vy = CONFIG.flapImpulse;
}

// ─────────────────────────────────────────────────────────────────────────────
// Módulo: Pipes
// ─────────────────────────────────────────────────────────────────────────────
function spawnPipe(timestamp) {
  const minY = canvas.height * CONFIG.minGapRatio;
  const maxY = canvas.height * CONFIG.maxGapRatio;
  const gapY = minY + Math.random() * (maxY - minY);
  state.pipes.push({ x: canvas.width, gapY, scored: false });
  state.lastPipeTime = timestamp;
}

function updatePipes(dt, timestamp) {
  // Mover pipes hacia la izquierda
  for (const pipe of state.pipes) {
    pipe.x -= CONFIG.pipeSpeed * dt;
  }

  // Eliminar pipes que ya salieron de pantalla
  state.pipes = state.pipes.filter(pipe => pipe.x + CONFIG.pipeWidth >= 0);

  // Generar nuevo pipe si ha pasado el intervalo
  if (timestamp - state.lastPipeTime >= CONFIG.pipeInterval) {
    spawnPipe(timestamp);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Módulo: Detección de Colisiones
// ─────────────────────────────────────────────────────────────────────────────
function checkCollisions() {
  const b = state.bird;
  const m = CONFIG.collisionMargin;
  const r = b.radius - m;
  const groundTop = canvas.height - CONFIG.groundHeight;

  // Colisión con borde superior (techo)
  if (b.y - r <= 0) {
    triggerGameOver();
    return;
  }

  // Colisión con suelo
  if (b.y + r >= groundTop) {
    triggerGameOver();
    return;
  }

  // Colisión con pipes
  for (const pipe of state.pipes) {
    const pw = CONFIG.pipeWidth;
    const gh = CONFIG.gapSize / 2;

    // Bounding box del bird (círculo aproximado como cuadrado con margen)
    const bLeft   = b.x - r;
    const bRight  = b.x + r;
    const bTop    = b.y - r;
    const bBottom = b.y + r;

    // Verificar solapamiento horizontal con el pipe
    if (bRight < pipe.x || bLeft > pipe.x + pw) continue;

    // Pipe superior: de 0 a (gapY - gapSize/2)
    if (bTop < pipe.gapY - gh) {
      triggerGameOver();
      return;
    }
    // Pipe inferior: de (gapY + gapSize/2) a canvas.height
    if (bBottom > pipe.gapY + gh) {
      triggerGameOver();
      return;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Módulo: Puntuación
// ─────────────────────────────────────────────────────────────────────────────
function checkScoring() {
  for (const pipe of state.pipes) {
    if (!pipe.scored && pipe.x + CONFIG.pipeWidth < state.bird.x) {
      pipe.scored = true;
      state.score++;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Módulo: Gestión de estados de pantalla
// ─────────────────────────────────────────────────────────────────────────────
function initBird() {
  state.bird.x = canvas.width * 0.25;
  state.bird.y = canvas.height * 0.45;
  state.bird.vy = 0;
  state.bird.rotation = 0;
}

function startGame(timestamp) {
  initBird();
  state.pipes = [];
  state.score = 0;
  state.lastPipeTime = (timestamp || 0) - CONFIG.pipeInterval; // forzar primer pipe pronto
  state.screen = 'playing';
}

function restartGame(timestamp) {
  startGame(timestamp);
}

function triggerGameOver() {
  // Actualizar highscore si corresponde
  if (state.score > state.highScore) {
    state.highScore = state.score;
    writeHighScore(state.highScore);
  }
  state.screen = 'gameover';
}

// ─────────────────────────────────────────────────────────────────────────────
// Módulo: InputHandler
// ─────────────────────────────────────────────────────────────────────────────
function handleAction(timestamp) {
  if (state.screen === 'menu') {
    startGame(timestamp);
  } else if (state.screen === 'playing') {
    flap();
  } else if (state.screen === 'gameover') {
    restartGame(timestamp);
  }
}

// Teclado: barra espaciadora
document.addEventListener('keydown', function (e) {
  if (e.code === 'Space' || e.key === ' ') {
    e.preventDefault();
    handleAction(state.lastFrameTime);
  }
});

// Click sobre el canvas
canvas.addEventListener('click', function (e) {
  handleAction(state.lastFrameTime);
});

// Touch sobre el canvas (móvil)
canvas.addEventListener('touchstart', function (e) {
  e.preventDefault(); // evitar scroll no deseado
  handleAction(state.lastFrameTime);
}, { passive: false });

// ─────────────────────────────────────────────────────────────────────────────
// Módulo: Renderer
// ─────────────────────────────────────────────────────────────────────────────

function drawBackground() {
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, '#87CEEB');
  grad.addColorStop(1, '#E0F4FF');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawGround() {
  const groundTop = canvas.height - CONFIG.groundHeight;
  const grad = ctx.createLinearGradient(0, groundTop, 0, canvas.height);
  grad.addColorStop(0, '#8BC34A');
  grad.addColorStop(1, '#558B2F');
  ctx.fillStyle = grad;
  ctx.fillRect(0, groundTop, canvas.width, CONFIG.groundHeight);

  // Línea de separación suelo/cielo
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, groundTop);
  ctx.lineTo(canvas.width, groundTop);
  ctx.stroke();
}

function drawPipes() {
  for (const pipe of state.pipes) {
    const gh = CONFIG.gapSize / 2;
    const pw = CONFIG.pipeWidth;
    const topHeight = pipe.gapY - gh;
    const bottomY = pipe.gapY + gh;
    const bottomHeight = canvas.height - bottomY;

    // Gradiente para los pipes
    const grad = ctx.createLinearGradient(pipe.x, 0, pipe.x + pw, 0);
    grad.addColorStop(0, '#4CAF50');
    grad.addColorStop(1, '#2E7D32');

    ctx.fillStyle = grad;

    // Pipe superior
    if (topHeight > 0) {
      ctx.beginPath();
      ctx.roundRect(pipe.x, 0, pw, topHeight, [0, 0, 6, 6]);
      ctx.fill();

      // Borde inferior del pipe superior (capuchón)
      ctx.fillStyle = '#388E3C';
      ctx.beginPath();
      ctx.roundRect(pipe.x - 4, topHeight - 16, pw + 8, 16, [4, 4, 0, 0]);
      ctx.fill();
      ctx.fillStyle = grad;
    }

    // Pipe inferior
    if (bottomHeight > 0) {
      // Capuchón superior del pipe inferior
      ctx.fillStyle = '#388E3C';
      ctx.beginPath();
      ctx.roundRect(pipe.x - 4, bottomY, pw + 8, 16, [0, 0, 4, 4]);
      ctx.fill();
      ctx.fillStyle = grad;

      ctx.beginPath();
      ctx.roundRect(pipe.x, bottomY + 16, pw, bottomHeight - 16, [0, 0, 6, 6]);
      ctx.fill();
    }
  }
}

function drawBird() {
  const b = state.bird;
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(b.rotation);

  // Sombra suave
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 3;

  // Cuerpo: gradiente radial dorado
  const grad = ctx.createRadialGradient(-4, -4, 2, 0, 0, b.radius);
  grad.addColorStop(0, '#FFD700');
  grad.addColorStop(1, '#FF8C00');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
  ctx.fill();

  // Resetear sombra
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Ojo
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(6, -5, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#333333';
  ctx.beginPath();
  ctx.arc(8, -5, 3, 0, Math.PI * 2);
  ctx.fill();

  // Pico
  ctx.fillStyle = '#FF6B00';
  ctx.beginPath();
  ctx.moveTo(14, -2);
  ctx.lineTo(22, 0);
  ctx.lineTo(14, 4);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function setTextStyle(size, weight) {
  ctx.font = `${weight || 'bold'} ${size}px 'Segoe UI', Arial, sans-serif`;
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
}

function clearTextShadow() {
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

function drawHUD() {
  setTextStyle(52);
  ctx.fillText(String(state.score), canvas.width / 2, canvas.height * 0.12);
  clearTextShadow();
}

function drawMenu() {
  // Overlay semitransparente
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  // Título
  setTextStyle(64);
  ctx.fillText('🐦 Flappy Bird', cx, cy - 80);

  // Subtítulo
  setTextStyle(22, 'normal');
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillText('Esquiva las tuberías y vuela lo más lejos posible', cx, cy - 20);

  // Instrucciones
  setTextStyle(20, 'normal');
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText('Presiona  ESPACIO  o  TAP  para comenzar', cx, cy + 30);

  // Highscore si existe
  if (state.highScore > 0) {
    setTextStyle(18, 'normal');
    ctx.fillStyle = '#FFD700';
    ctx.fillText(`🏆 Récord: ${state.highScore}`, cx, cy + 80);
  }

  // Botón visual
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 2;
  const btnW = 220, btnH = 50;
  ctx.beginPath();
  ctx.roundRect(cx - btnW / 2, cy + 110, btnW, btnH, 25);
  ctx.fill();
  ctx.stroke();

  setTextStyle(20);
  ctx.fillText('¡ Jugar !', cx, cy + 135);

  clearTextShadow();
}

function drawGameOver() {
  // Overlay semitransparente
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  // Panel de fondo
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 2;
  const panelW = Math.min(380, canvas.width * 0.85);
  const panelH = 375;
  ctx.beginPath();
  ctx.roundRect(cx - panelW / 2, cy - panelH / 2 - 20, panelW, panelH, 16);
  ctx.fill();
  ctx.stroke();

  // Título Game Over
  setTextStyle(52);
  ctx.fillText('Game Over', cx, cy - 120);

  // Score de la partida
  setTextStyle(28, 'normal');
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillText(`Puntuación: ${state.score}`, cx, cy - 50);

  // HighScore
  setTextStyle(22, 'normal');
  if (state.score >= state.highScore && state.score > 0) {
    ctx.fillStyle = '#FFD700';
    ctx.fillText(`🏆 ¡Nuevo récord! ${state.highScore}`, cx, cy + 10);
  } else {
    ctx.fillStyle = '#FFD700';
    ctx.fillText(`🏆 Récord: ${state.highScore}`, cx, cy + 10);
  }

  // Instrucciones reinicio
  setTextStyle(18, 'normal');
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillText('Presiona  ESPACIO para reiniciar', cx, cy + 50);

  // Botón visual
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 2;
  const btnW = 200, btnH = 50;
  ctx.beginPath();
  ctx.roundRect(cx - btnW / 2, cy + 100, btnW, btnH, 23);
  ctx.fill();
  ctx.stroke();

  setTextStyle(18);
  ctx.fillText('Reintentar', cx, cy + 123);

  clearTextShadow();
}

function render() {
  // Limpiar canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Capa 1: Fondo
  drawBackground();

  // Capa 2: Pipes (solo en playing y gameover)
  if (state.screen !== 'menu') {
    drawPipes();
  }

  // Capa 3: Suelo
  drawGround();

  // Capa 4: Bird (en playing y gameover)
  if (state.screen !== 'menu') {
    drawBird();
  } else {
    // En menú mostrar el bird centrado sin física
    const savedY = state.bird.y;
    const savedRot = state.bird.rotation;
    state.bird.y = canvas.height * 0.45;
    state.bird.rotation = 0;
    drawBird();
    state.bird.y = savedY;
    state.bird.rotation = savedRot;
  }

  // Capa 5: HUD (score durante gameplay)
  if (state.screen === 'playing') {
    drawHUD();
  }

  // Capa 6: Overlay de pantalla
  if (state.screen === 'menu') {
    drawMenu();
  } else if (state.screen === 'gameover') {
    drawGameOver();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Módulo: GameLoop
// ─────────────────────────────────────────────────────────────────────────────
function gameLoop(timestamp) {
  // Delta time en segundos, con cap de 50ms para evitar saltos grandes
  const deltaTime = Math.min((timestamp - (state.lastFrameTime || timestamp)) / 1000, 0.05);
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

// ─────────────────────────────────────────────────────────────────────────────
// Inicialización
// ─────────────────────────────────────────────────────────────────────────────

// Posicionar bird inicial para el menú
initBird();

// Arrancar el game loop
requestAnimationFrame(gameLoop);
