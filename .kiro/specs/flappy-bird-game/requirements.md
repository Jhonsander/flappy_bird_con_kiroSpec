# Requirements Document

## Introduction

Videojuego inspirado en Flappy Bird implementado en HTML5, CSS y JavaScript puro. El juego presenta un pájaro geométrico que el jugador controla para esquivar tuberías, con estética moderna y minimalista basada en formas geométricas, gradientes suaves y animaciones fluidas. El proyecto se estructura en tres archivos separados (index.html, style.css, game.js), incluye pantallas de menú, gameplay y game over, y es completamente responsive con soporte para escritorio y móvil.

## Glossary

- **Game**: El sistema de videojuego Flappy Bird implementado en HTML5/CSS/JS.
- **Bird**: El personaje controlado por el jugador, representado como una forma geométrica animada.
- **Pipe**: Obstáculo vertical compuesto por dos rectángulos (superior e inferior) con un hueco entre ellos por el que debe pasar el Bird.
- **Canvas**: Elemento HTML5 `<canvas>` sobre el que se renderiza el juego.
- **Score**: Puntuación actual de la partida en curso, incrementada al superar cada Pipe.
- **HighScore**: Puntuación máxima histórica del jugador, persistida en localStorage.
- **GameLoop**: Ciclo principal de actualización y renderizado del juego usando `requestAnimationFrame`.
- **MenuScreen**: Pantalla inicial que muestra el título del juego y las instrucciones para comenzar.
- **GameplayScreen**: Pantalla activa durante una partida en curso.
- **GameOverScreen**: Pantalla mostrada al finalizar una partida, con Score y HighScore.
- **Gravity**: Fuerza constante que acelera al Bird hacia abajo.
- **Flap**: Acción del jugador que aplica un impulso vertical hacia arriba al Bird.
- **Gap**: Espacio vertical entre el Pipe superior e inferior por el que debe pasar el Bird.

---

## Requirements

### Requirement 1: Estructura del proyecto

**User Story:** As a developer, I want the project organized in three separate files, so that the code is maintainable and each concern is clearly separated.

#### Acceptance Criteria

1. THE Game SHALL estar implementado en exactamente tres archivos: `index.html`, `style.css` y `game.js`.
2. THE `index.html` SHALL referenciar `style.css` mediante una etiqueta `<link>` y `game.js` mediante una etiqueta `<script>`.
3. THE `index.html` SHALL contener un elemento `<canvas>` con un `id` único al que `game.js` accede para renderizar el juego.

---

### Requirement 2: Canvas responsive

**User Story:** As a player, I want the game canvas to adapt to my screen size, so that I can play comfortably on any device.

#### Acceptance Criteria

1. WHEN la ventana del navegador se carga, THE Canvas SHALL ajustar su ancho y alto al tamaño del viewport disponible.
2. WHEN el usuario redimensiona la ventana del navegador, THE Canvas SHALL recalcular y actualizar sus dimensiones para ocupar el viewport completo.
3. WHILE el juego está en cualquier pantalla, THE Canvas SHALL mantener una relación de aspecto que garantice la jugabilidad sin deformación de los elementos visuales.

---

### Requirement 3: Estética moderna y minimalista

**User Story:** As a player, I want a clean, modern visual style, so that the game feels polished and visually appealing.

#### Acceptance Criteria

1. THE Bird SHALL estar representado como una forma geométrica (círculo o polígono) con relleno de gradiente suave, sin sprites pixelados.
2. THE Pipe SHALL estar representado como rectángulos con relleno de gradiente suave y bordes redondeados opcionales.
3. THE Canvas SHALL mostrar un fondo con gradiente suave que evoque un cielo, diferenciando visualmente el suelo del área de juego.
4. WHEN el Bird realiza un Flap, THE Bird SHALL mostrar una animación visual fluida (rotación o deformación) que indique el impulso.
5. THE Game SHALL renderizar todos los elementos a 60 fotogramas por segundo mediante `requestAnimationFrame`.

---

### Requirement 4: Pantalla de menú (MenuScreen)

**User Story:** As a player, I want a start menu, so that I know how to begin the game and see the title.

#### Acceptance Criteria

1. WHEN el juego se carga por primera vez, THE Game SHALL mostrar la MenuScreen.
2. THE MenuScreen SHALL mostrar el título del juego de forma prominente.
3. THE MenuScreen SHALL mostrar instrucciones indicando los controles para iniciar la partida (barra espaciadora o clic/tap).
4. WHEN el jugador presiona la barra espaciadora o realiza un clic/tap sobre el Canvas en la MenuScreen, THE Game SHALL iniciar una nueva partida y transicionar a la GameplayScreen.

---

### Requirement 5: Gameplay

**User Story:** As a player, I want the core game mechanics to work correctly, so that I can play a fair and fun game.

#### Acceptance Criteria

1. WHILE la GameplayScreen está activa, THE Bird SHALL caer continuamente hacia abajo debido a la Gravity.
2. WHEN el jugador presiona la barra espaciadora o realiza un clic/tap sobre el Canvas durante la GameplayScreen, THE Bird SHALL recibir un impulso vertical hacia arriba (Flap).
3. WHILE la GameplayScreen está activa, THE Game SHALL generar Pipes que se desplazan de derecha a izquierda a velocidad constante.
4. THE Game SHALL generar cada nuevo Pipe con una posición vertical del Gap aleatoria dentro de un rango jugable.
5. WHEN el Bird colisiona con un Pipe o con el borde superior o inferior del Canvas, THE Game SHALL finalizar la partida y transicionar a la GameOverScreen.
6. WHEN el Bird supera completamente un Pipe (el Bird pasa el borde derecho del Pipe), THE Score SHALL incrementarse en 1 punto.
7. WHILE la GameplayScreen está activa, THE Game SHALL mostrar el Score actual en pantalla de forma visible.

---

### Requirement 6: Detección de colisiones

**User Story:** As a player, I want accurate collision detection, so that the game feels fair.

#### Acceptance Criteria

1. THE Game SHALL detectar colisión entre el Bird y un Pipe cuando el área delimitadora del Bird se superpone con el área delimitadora de cualquier segmento del Pipe.
2. THE Game SHALL detectar colisión cuando el Bird alcanza o supera el borde inferior del Canvas (suelo).
3. THE Game SHALL detectar colisión cuando el Bird alcanza o supera el borde superior del Canvas (techo).
4. THE Game SHALL aplicar un margen de tolerancia de al menos 2 píxeles en la detección de colisiones para evitar falsos positivos visuales.

---

### Requirement 7: Pantalla de Game Over (GameOverScreen)

**User Story:** As a player, I want to see my score and record after dying, so that I know how well I did and feel motivated to improve.

#### Acceptance Criteria

1. WHEN la partida finaliza, THE Game SHALL mostrar la GameOverScreen.
2. THE GameOverScreen SHALL mostrar el Score obtenido en la partida recién finalizada.
3. THE GameOverScreen SHALL mostrar el HighScore almacenado.
4. WHEN el Score de la partida finalizada supera el HighScore almacenado, THE Game SHALL actualizar el HighScore con el nuevo valor antes de mostrarlo.
5. THE GameOverScreen SHALL mostrar instrucciones indicando los controles para reiniciar la partida.
6. WHEN el jugador presiona la barra espaciadora o realiza un clic/tap sobre el Canvas en la GameOverScreen, THE Game SHALL reiniciar la partida y transicionar a la GameplayScreen.

---

### Requirement 8: Persistencia del HighScore

**User Story:** As a player, I want my high score to be saved between sessions, so that I can track my personal best over time.

#### Acceptance Criteria

1. THE Game SHALL leer el HighScore desde `localStorage` al inicializarse.
2. WHEN el Score de una partida supera el HighScore almacenado en `localStorage`, THE Game SHALL escribir el nuevo HighScore en `localStorage`.
3. IF `localStorage` no contiene un HighScore previo, THEN THE Game SHALL inicializar el HighScore en 0.
4. IF el acceso a `localStorage` falla por restricciones del navegador, THEN THE Game SHALL mantener el HighScore en memoria durante la sesión sin interrumpir la ejecución.

---

### Requirement 9: Controles

**User Story:** As a player, I want to control the bird with keyboard and touch/click, so that I can play on both desktop and mobile devices.

#### Acceptance Criteria

1. WHEN el jugador presiona la tecla `Space` (barra espaciadora), THE Game SHALL ejecutar la acción correspondiente al estado actual (iniciar partida, Flap, o reiniciar).
2. WHEN el jugador realiza un evento `click` o `touchstart` sobre el Canvas, THE Game SHALL ejecutar la acción correspondiente al estado actual (iniciar partida, Flap, o reiniciar).
3. THE Game SHALL prevenir el comportamiento por defecto del navegador para los eventos `touchstart` sobre el Canvas para evitar desplazamiento no deseado de la página.

---

### Requirement 10: GameLoop y rendimiento

**User Story:** As a player, I want smooth gameplay, so that the experience is enjoyable and responsive.

#### Acceptance Criteria

1. THE GameLoop SHALL utilizar `requestAnimationFrame` para sincronizar actualizaciones con la tasa de refresco del navegador.
2. THE GameLoop SHALL calcular el tiempo transcurrido entre fotogramas (delta time) y utilizarlo para actualizar las posiciones de los elementos de forma independiente a la tasa de refresco del dispositivo.
3. WHEN la GameplayScreen no está activa, THE GameLoop SHALL detener la actualización de la física y el movimiento de los Pipes para evitar procesamiento innecesario.
