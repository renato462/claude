# SPEC 01 — MVP jugable de Arkanoid

> **Estado:** Implementado
> **Depende de:** —
> **Fecha:** 2026-09-24
> **Objetivo:** Un Arkanoid de un solo nivel, jugable en el navegador con teclado o ratón, con vidas, puntuación, sonido y récord guardado en localStorage.

## Alcance

**Dentro:**

- `index.html` en la raíz del repo, con un `<canvas>` de 480×640 escalado por CSS.
- `styles.css` para centrar y escalar el canvas.
- `game.js`, un script clásico sin módulos que se carga después de `assets/spritesheet.js`.
- La pala se controla con flechas ←/→, con A/D y con el ratón.
- La pelota espera pegada a la pala y sale con Espacio o clic.
- El rebote en la pala cambia de ángulo según el punto de impacto. La velocidad de la pelota es constante.
- Un único nivel fijo con 8 columnas y 6 filas de bloques. Cada fila tiene un color.
- Colisión AABB entre la pelota y los bloques. Se rompe como máximo un bloque por frame.
- Cada bloque roto suma 10 puntos.
- La partida empieza con 3 vidas.
- Un HUD muestra la puntuación, las vidas y el récord.
- Hay pantallas de inicio, victoria y game over. Desde victoria y game over se reinicia con Espacio o clic.
- Al romper un bloque se reproduce la animación de `EXPLOSION_FRAMES`.
- Sonidos `ball-bounce.mp3` (paredes y pala) y `break-sound.mp3` (bloque roto).
- La tecla M silencia y reactiva el sonido.
- Las teclas P y Esc pausan y reanudan la partida.
- El récord se guarda en localStorage.

**Fuera de alcance (para futuras specs):**

- Varios niveles y editor de niveles.
- Power-ups, bloques con varios golpes y bloques indestructibles.
- Controles táctiles y layout específico para móvil.
- Tabla de récords con nombres o varias entradas.
- Aceleración progresiva de la pelota.
- Sub-pasos anti-tunneling en la colisión.
- Guardar entre sesiones la preferencia de silencio o el estado de la partida.
- Música de fondo.

## Modelo de datos

```js
// Constantes (px, px/s, grados)
const CANVAS_W = 480, CANVAS_H = 640;
const PADDLE_W = 96, PADDLE_H = 14, PADDLE_Y = 600, PADDLE_SPEED = 420;
const BALL_SIZE = 12, BALL_SPEED = 360, MAX_BOUNCE_ANGLE = 60;
const BRICK_COLS = 8, BRICK_ROWS = 6, BRICK_W = 48, BRICK_H = 24, BRICK_GAP = 4;
const BRICK_OFFSET_X = 34;   // ( 480 - ( 8*48 + 7*4 ) ) / 2
const BRICK_OFFSET_Y = 80;   // debajo del HUD
const ROW_COLORS = [ 'red', 'yellow', 'cyan', 'magenta', 'hotpink', 'green' ];
const POINTS_PER_BRICK = 10, START_LIVES = 3;
const MAX_DT = 1 / 30;       // tope del delta time en segundos
const HIGHSCORE_KEY = 'arkanoid:highscore:v1';

// Estado de la partida
const state = {
  screen: 'start',           // 'start' | 'serve' | 'playing' | 'paused' | 'won' | 'lost'
  score: 0,
  lives: START_LIVES,
  highScore: 0,
  muted: false,
  paddle: { x: 192, y: PADDLE_Y, w: PADDLE_W, h: PADDLE_H },
  ball: { x: 0, y: 0, vx: 0, vy: 0, size: BALL_SIZE },
  bricks: [ /* { x, y, w, h, color, alive } */ ],
  explosions: [ /* { x, y, w, h, color, startTime } */ ],
  input: { left: false, right: false, mouseX: null },
};
```

Convenciones:

- El origen de coordenadas está arriba a la izquierda, en el espacio lógico de 480×640. Las coordenadas del ratón se convierten a ese espacio con `getBoundingClientRect()`.
- `x` e `y` de pala, pelota y bloques marcan la esquina superior izquierda.
- Las velocidades se expresan en px/s y se multiplican por `dt` en segundos.
- El estilo de código es el de `assets/spritesheet.js`, con espacios dentro de paréntesis y corchetes: `f( x )`, `a[ i ]`.

## Plan de implementación

1. Crear `index.html`, que carga `styles.css`, `assets/spritesheet.js` y `game.js`. Crear también `styles.css`, que centra el canvas y lo escala manteniendo 3:4 con `image-rendering: pixelated`. `game.js` declara las constantes y `state`, llama a `loadSpritesheet` y dibuja un fondo oscuro. Prueba manual: servir la raíz del repo con `npx serve .`, abrir la página y ver el canvas sin errores en consola.
2. Añadir el bucle con `requestAnimationFrame`, que calcula `dt` en segundos con tope en `MAX_DT` y llama a `update( dt )` y `render()`. Dibujar la pala con `drawSprite( ctx, 'paddle', … )` y moverla con flechas o A/D, limitada a los bordes del canvas. Prueba manual: la pala se mueve y no sale del canvas.
3. Añadir el control con ratón. `mousemove` sobre el canvas centra la pala en el cursor, dentro de los límites. Prueba manual: la pala sigue al ratón y el teclado sigue funcionando.
4. Añadir la pelota. En la pantalla `serve` la pelota sigue pegada al centro de la pala. Espacio o clic la lanzan hacia arriba, con un ángulo aleatorio de ±30° respecto a la vertical. Rebota en las paredes laterales y en el techo. Si cae por debajo de `CANVAS_H`, se pierde una vida y se vuelve a `serve`. Con 0 vidas se pasa a `lost`. Prueba manual: lanzar, ver los rebotes y perder vidas.
5. Hacer que la pelota rebote en la pala según el punto de impacto. Con `offset = ( centroPelota - centroPala ) / ( PADDLE_W / 2 )`, limitado a [-1, 1], el ángulo es `offset * MAX_BOUNCE_ANGLE` respecto a la vertical, siempre hacia arriba, y el módulo de la velocidad sigue siendo `BALL_SPEED`. Prueba manual: al golpear con los extremos la pelota sale inclinada y con el centro sale vertical.
6. Generar `state.bricks` (8×6, un color por fila según `ROW_COLORS`) y dibujarlos con `drawSprite( ctx, 'block_' + color, … )`. Detectar la colisión AABB con el primer bloque vivo que se superponga. Marcarlo `alive = false`, sumar `POINTS_PER_BRICK` y rebotar invirtiendo `vy` o `vx` según el eje de menor penetración. Cuando no queden bloques vivos se pasa a `won`. Prueba manual: los bloques desaparecen, suman puntos y al romperlos todos se gana.
7. Dibujar el HUD en la franja superior con puntuación, vidas y récord. Añadir las pantallas `start`, `won` y `lost` como texto sobre el canvas. Desde `start` se pasa a `serve` con Espacio o clic. Desde `won` y `lost`, Espacio o clic reinician la partida con bloques nuevos, 3 vidas y 0 puntos, y vuelven a `serve`. Prueba manual: completar el ciclo inicio → juego → game over → reinicio.
8. Añadir las explosiones. Al romper un bloque se añade una entrada a `state.explosions`. `render()` elige el frame de `EXPLOSION_FRAMES[ color ]` según el tiempo transcurrido: 4 frames en `EXPLOSION_DURATION` ms en total. La entrada se elimina al terminar. Prueba manual: cada bloque roto muestra la animación y desaparece.
9. Añadir el sonido. Cargar los dos `Audio` de `assets/sounds/`. Para permitir que se solapen, se reproduce `cloneNode().play()` y se ignora el rechazo de la promesa. `ball-bounce` suena al tocar la pared, el techo o la pala, y `break-sound` al romper un bloque. La tecla M alterna `state.muted` y el HUD muestra un indicador de silencio. Prueba manual: se oyen los sonidos y M los silencia.
10. Añadir la pausa. P o Esc alternan entre `playing`/`serve` y `paused`, y guardan la pantalla previa para volver a ella. En pausa no se ejecuta `update`, y se dibuja el texto «PAUSA». Prueba manual: la pelota se congela y al reanudar sigue igual.
11. Añadir el récord persistente. Al cargar se lee `HIGHSCORE_KEY` de localStorage. Al pasar a `won` o `lost`, si `score > highScore`, se actualiza y se guarda. Todo acceso a localStorage va en try/catch y, si falla, se usa 0 en memoria. Prueba manual: tras recargar la página, el récord se mantiene.

## Criterios de aceptación

- [x] Al servir la raíz por HTTP y abrir `index.html` se ve la pantalla de inicio sin errores en la consola.
- [x] Espacio o clic en la pantalla de inicio llevan a `serve`, con la pelota pegada a la pala.
- [x] Las flechas ←/→ y A/D mueven la pala, y el ratón la centra en el cursor.
- [x] La pala nunca sale de los límites del canvas.
- [x] Espacio o clic lanzan la pelota hacia arriba.
- [x] La pelota rebota en las paredes laterales y el techo.
- [x] Si la pelota golpea el extremo derecho de la pala, sale hacia la derecha. Si golpea el izquierdo, sale hacia la izquierda.
- [x] El tablero tiene 48 bloques en 8 columnas y 6 filas, y cada fila es de un color distinto.
- [x] Romper un bloque suma exactamente 10 puntos y reproduce la animación de explosión.
- [x] Si la pelota cae por debajo de la pala, se resta una vida y la pelota vuelve a la pala.
- [x] Al perder la tercera vida se muestra la pantalla de game over.
- [x] Al romper los 48 bloques se muestra la pantalla de victoria.
- [x] Desde victoria o game over, Espacio o clic reinician con 48 bloques, 3 vidas y 0 puntos.
- [x] El HUD muestra en todo momento la puntuación, las vidas y el récord.
- [x] Suena `ball-bounce.mp3` al rebotar en la pala o en una pared, y `break-sound.mp3` al romper un bloque.
- [x] M silencia y reactiva todos los sonidos.
- [x] P o Esc congelan el juego y muestran «PAUSA». Al pulsarlas de nuevo el juego sigue desde el mismo estado.
- [x] Si se supera el récord y se recarga la página, el HUD muestra el nuevo récord.
- [x] La velocidad de la pelota es la misma con monitores de 60 Hz y de 144 Hz.
- [x] Si localStorage está bloqueado, el juego sigue funcionando.

## Decisiones

- **Sí:** tres archivos (`index.html`, `styles.css`, `game.js`) con scripts clásicos. Siguen el patrón global de `assets/spritesheet.js`, sin mezclar módulos.
- **No:** separar el código en varios archivos con ES modules. Añade complejidad que un MVP no necesita.
- **No:** meterlo todo en `index.html`. Mezcla responsabilidades y complica los diffs.
- **Sí:** `index.html` en la raíz. La ruta de la hoja de sprites está fija como `assets/spritesheet-breakout.png`.
- **Sí:** canvas vertical de 480×640 escalado por CSS, con aspecto arcade clásico.
- **Sí:** bloques de 48×24 (1,5x el sprite) en una cuadrícula de 8×6 centrada, con huecos de 4 px.
- **No:** 7×6 de 64×32 ni 10×6 sin huecos.
- **Sí:** pala dibujada a 96×14. El sprite mide 162×14 y a tamaño completo ocuparía un tercio del ancho del canvas.
- **Sí:** el color `gray` no se usa en el tablero. En `assets/spritesheet.js`, los frames de explosión de `gray` apuntan a las coordenadas de `red`.
- **Sí:** controles de teclado y ratón.
- **No:** control táctil, que irá en una spec de móvil.
- **Sí:** el ángulo del rebote en la pala depende del punto de impacto (máximo 60°) y la velocidad es constante. Así el jugador controla la dirección sin cambiar la dificultad.
- **No:** rebote especular. Deja al jugador sin control.
- **No:** aceleración progresiva. Se deja para una spec de dificultad.
- **Sí:** delta time en px/s con tope de 1/30 s. La velocidad no depende del framerate, y el tope evita saltos grandes al volver de otra pestaña.
- **Sí:** colisión AABB por el eje de menor penetración, con un bloque por frame.
- **No:** sub-pasos anti-tunneling. Con `dt ≤ 1/30` la pelota avanza como máximo 12 px por frame, que no supera la altura de un bloque (24 px).
- **Sí:** pantalla de inicio. El primer gesto del usuario también desbloquea el audio según la política de autoplay de los navegadores.
- **Sí:** la pelota sale con un ángulo aleatorio de ±30° respecto a la vertical, para que dos saques no sean idénticos.
- **Sí:** 3 vidas y 10 puntos por bloque.
- **Sí:** récord en localStorage con la clave versionada `arkanoid:highscore:v1`, que permite cambiar el formato en el futuro.
- **No:** tabla de récords con varias entradas o nombres.
- **Sí:** la tecla M silencia el sonido durante la sesión.
- **No:** guardar la preferencia de silencio entre sesiones.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Si se abre con `file://`, fallan la carga de la hoja de sprites y el audio. | La ejecución por HTTP (`npx serve .`) está documentada en `CLAUDE.md`. |
| El navegador bloquea el audio antes de la primera interacción. | La pantalla de inicio exige un gesto. Los rechazos de `play()` se capturan y se ignoran. |
| localStorage está deshabilitado o lanza una excepción, por ejemplo en modo privado. | try/catch en lecturas y escrituras, con récord en memoria como respaldo. |
| La pelota queda atrapada en un rebote casi horizontal. | El rebote en la pala siempre se recalcula con un ángulo de como máximo 60° respecto a la vertical. |
| La pelota se engancha dentro de la pala. | Al rebotar, la pelota se recoloca justo encima de la pala y `vy` se fuerza a un valor negativo. |
| Los sonidos se solapan y se cortan al romper bloques seguidos. | Se reproduce un `cloneNode()` del `Audio` en cada evento. |

## Lo que **no** entra en esta spec

- Varios niveles y editor de niveles.
- Power-ups y bloques especiales (varios golpes o indestructibles).
- Controles táctiles y versión móvil.
- Tabla de récords con varias entradas.
- Aceleración progresiva y ajustes de dificultad.
- Música de fondo y persistencia de la preferencia de silencio.

Cada una de estas funcionalidades, si llega, irá en su propia spec.
