# SPEC 02 — Bloques de dos golpes con grietas, explosión y partículas

> **Estado:** Implementado
> **Depende de:** SPEC 01
> **Fecha:** 2026-09-24
> **Objetivo:** Que cada bloque necesite dos golpes, muestre grietas tras el primero y al romperse estalle con una explosión de 300 ms y partículas que se congelan en pausa.

## Alcance

**Dentro:**

- Los 48 bloques del tablero necesitan 2 golpes para romperse.
- Tras el primer golpe, el bloque se dibuja con el sprite agrietado de la hoja: la columna `sx = 128` de su fila de color.
- Cada golpe a un bloque suma 10 puntos. Un bloque completo vale 20 y el tablero entero, 960.
- Un golpe que no rompe el bloque hace rebotar la pelota y suena `ball-bounce.mp3`.
- El golpe que rompe el bloque suena `break-sound.mp3`, como en la SPEC 01.
- La explosión de `EXPLOSION_FRAMES` pasa a durar 300 ms: 4 frames de 75 ms.
- Al romperse, cada bloque suelta 8 partículas de su color que salen en direcciones aleatorias, caen por gravedad y desaparecen a los 500 ms.
- Explosiones y partículas usan un reloj de juego que no avanza en pausa, así que se congelan con ella.
- Al reiniciar la partida, todos los bloques vuelven a estar intactos y no queda ninguna explosión ni partícula.

**Fuera de alcance (para futuras specs):**

- Bloques de 3 o más golpes y resistencia distinta por fila.
- Bloques indestructibles.
- Texto «+10» flotante y temblor de pantalla.
- Partículas que colisionan con la pelota, la pala o los bloques.
- Varios niveles y diseños de tablero distintos.
- Power-ups.

## Modelo de datos

```js
// Constantes nuevas en game.js
const BRICK_HITS = 2;              // golpes para romper un bloque
const DAMAGED_SX = 128;            // columna del sprite agrietado en la hoja
const BRICK_EXPLOSION_MS = 300;    // sustituye a EXPLOSION_DURATION (150) en game.js
const PARTICLE_COUNT = 8;
const PARTICLE_SIZE = 3;           // px, cuadrado
const PARTICLE_SPEED_MIN = 60, PARTICLE_SPEED_MAX = 180;   // px/s
const PARTICLE_GRAVITY = 600;      // px/s²
const PARTICLE_LIFE_MS = 500;

// Color de partícula muestreado de cada sprite (los nombres no coinciden con el tono real)
const PARTICLE_COLORS = {
  red: '#c02a3e', cyan: '#4fc99c', green: '#44aaf3',
  magenta: '#632ff4', yellow: '#d9bd4c', hotpink: '#fc7d1c',
};

// Cambios en state
const state = {
  // ...todo lo de la SPEC 01...
  time: 0,                   // reloj de juego en ms; solo avanza dentro de update( dt )
  bricks: [ /* { x, y, w, h, color, alive, hp } */ ],        // hp: golpes restantes, empieza en BRICK_HITS
  explosions: [ /* { x, y, w, h, color, startTime } */ ],    // startTime en state.time
  particles: [ /* { x0, y0, vx, vy0, x, y, vy, color, startTime } */ ],   // nuevo
};
```

Convenciones:

- `state.time` se mide en milisegundos y se incrementa en `dt * 1000` al principio de `update( dt )`. Como `update` no se ejecuta en pausa, el reloj se detiene.
- `startTime` de explosiones y partículas se toma de `state.time`, nunca de `performance.now()`.
- El sprite agrietado se dibuja con `drawFrame()` y un rectángulo `{ sx: DAMAGED_SX, sy, sw: 32, sh: 16 }`. `sy` sale de `SPRITES.blocks[ color ].sy`.
- `x` e `y` de una partícula marcan su esquina superior izquierda. Las partículas nacen en el centro del bloque.
- `x0`, `y0` y `vy0` son la posición y la velocidad vertical al nacer, y no cambian. `x`, `y` y `vy` son los valores actuales y se calculan con la fórmula exacta del tiro parabólico a partir de `t = ( state.time - startTime ) / 1000`: `x = x0 + vx·t`, `y = y0 + vy0·t + PARTICLE_GRAVITY·t²/2`, `vy = vy0 + PARTICLE_GRAVITY·t`.
- `assets/spritesheet.js` no se modifica.

## Plan de implementación

1. Añadir el reloj de juego y alargar la explosión. Añadir `state.time`, que `update( dt )` incrementa en `dt * 1000`. Las explosiones guardan `startTime = state.time`, y `updateExplosions()` y `renderExplosions()` usan `state.time` y `BRICK_EXPLOSION_MS` en lugar de `performance.now()` y `EXPLOSION_DURATION`. Prueba manual: la explosión dura el doble y, si se pausa justo al romper un bloque, se queda congelada.
2. Añadir la resistencia de los bloques. `createBricks()` pone `hp: BRICK_HITS` en cada bloque. En `hitBrick()`, cada golpe resta 1 a `hp`, suma `POINTS_PER_BRICK` y hace rebotar la pelota como hasta ahora. Si `hp` queda por encima de 0, suena `ball-bounce`. Si llega a 0, el bloque se marca `alive = false`, se crea la explosión y suena `break-sound`. La condición de victoria no cambia. Prueba manual: un bloque necesita dos golpes y cada golpe suma 10.
3. Dibujar el estado agrietado. En `render()`, los bloques vivos con `hp < BRICK_HITS` se dibujan con `drawFrame()` y el rectángulo de `DAMAGED_SX`. Los intactos siguen con `drawSprite( ctx, 'block_' + color, … )`. Prueba manual: tras el primer golpe el bloque se ve agrietado en su mismo color.
4. Añadir las partículas. Al romper un bloque se añaden `PARTICLE_COUNT` entradas a `state.particles`, con un ángulo aleatorio de 0 a 360° y una velocidad aleatoria entre `PARTICLE_SPEED_MIN` y `PARTICLE_SPEED_MAX`. `update( dt )` recalcula `x`, `y` y `vy` de cada una con la fórmula exacta a partir del tiempo transcurrido, y elimina las que superan `PARTICLE_LIFE_MS`. `render()` las dibuja como cuadrados de `PARTICLE_SIZE` con `PARTICLE_COLORS[ color ]`, después de los bloques y antes del HUD. `resetGame()` vacía `state.particles`. Prueba manual: al romper un bloque salen 8 fragmentos de su color que caen y desaparecen.

## Criterios de aceptación

- [ ] La página carga sin errores en la consola.
- [ ] `assets/spritesheet.js` no tiene cambios respecto a `main`.
- [ ] Cada uno de los 48 bloques necesita exactamente 2 golpes para romperse.
- [ ] Tras el primer golpe el bloque sigue en su sitio y se dibuja con el sprite agrietado (`sx = 128`) de su color.
- [ ] Cada golpe a un bloque suma exactamente 10 puntos.
- [ ] Al ganar la partida sin perder vidas, la puntuación es 960.
- [ ] El golpe que no rompe un bloque hace sonar `ball-bounce.mp3`, y el que lo rompe, `break-sound.mp3`.
- [ ] Al romperse un bloque, la explosión muestra sus 4 frames en 300 ms de juego y después desaparece.
- [ ] Al romperse un bloque aparecen 8 partículas del color de su sprite.
- [ ] La velocidad vertical de las partículas aumenta con el tiempo, y cada partícula desaparece a los 500 ms de juego.
- [ ] Las partículas no alteran la trayectoria de la pelota.
- [ ] En pausa, explosiones y partículas se quedan quietas. Al reanudar siguen desde el mismo frame y la misma posición.
- [ ] Con el mismo tiempo de juego, explosiones y partículas avanzan igual a 60 Hz y a 144 Hz.
- [ ] Se rompe o daña como máximo un bloque por frame.
- [ ] Al reiniciar desde victoria o game over, los 48 bloques están intactos y no queda ninguna explosión ni partícula.

## Decisiones

- **Sí:** los 48 bloques aguantan 2 golpes. Dobla la duración de la partida con una regla única y fácil de leer.
- **No:** filas superiores de 2 golpes, ni resistencia 3/2/1 por filas. Se deja para una spec de dificultad o de niveles.
- **Sí:** 10 puntos por golpe. Premia el esfuerzo extra y cambia la regla de la SPEC 01 («romper un bloque suma exactamente 10 puntos»), cuyo criterio 9 queda sustituido por esta spec.
- **No:** 10 puntos solo al romper, ni 10 × golpes al romper.
- **Sí:** estado agrietado con los sprites que ya trae la hoja, en la columna `sx = 128`. Las grietas se ven claras y el bloque conserva la forma completa.
- **No:** `sx = 64`, que apenas se distingue del bloque intacto a este tamaño, ni `sx = 160`, que ya parece desmoronarse.
- **No:** grietas dibujadas con canvas ni oscurecer el bloque. Romperían el estilo pixel art de la hoja.
- **Sí:** `ball-bounce.mp3` en los golpes que no rompen. `break-sound.mp3` queda reservado para la rotura.
- **Sí:** explosión de 300 ms (75 ms por frame), el doble que en la SPEC 01. A 150 ms apenas se veía.
- **Sí:** constante `BRICK_EXPLOSION_MS` en `game.js`. El asset `assets/spritesheet.js` queda intacto.
- **No:** editar `EXPLOSION_DURATION` en el asset.
- **Sí:** 8 partículas de 3×3 px con gravedad y 500 ms de vida. Dan sensación de rotura sin llenar la pantalla.
- **No:** partículas sin gravedad o más duraderas.
- **Sí:** colores de partícula fijos, muestreados de los sprites. Los nombres de color de la hoja no coinciden con su tono real: `hotpink` es naranja y `green` es azul.
- **Sí:** reloj de juego `state.time` para explosiones y partículas. Se congelan en pausa, coherente con el criterio 17 de la SPEC 01.
- **No:** seguir con `performance.now()`, que dejaba avanzar la explosión durante la pausa.
- **Sí:** posición de las partículas calculada con la fórmula exacta del tiro parabólico. Da el mismo resultado a cualquier frecuencia de refresco, que es lo que pide el criterio de 60 Hz frente a 144 Hz.
- **No:** sumar `PARTICLE_GRAVITY * dt` a la velocidad en cada frame. Se probó y la altura difería unos 0,73 px entre 60 y 144 Hz a los 250 ms.
- **No:** texto «+10» flotante ni temblor de pantalla. Se descartaron en la fase de preguntas.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Si la hoja de sprites cambia, `DAMAGED_SX` o `PARTICLE_COLORS` dejan de coincidir. | Son constantes con nombre en `game.js`, fáciles de ajustar. `assets/spritesheet.js` y la imagen no se tocan en esta spec. |
| Muchas partículas a la vez tras romper bloques seguidos. | Cada una vive 500 ms y se rompe como máximo un bloque por frame, así que no pasan de unas pocas decenas a la vez. |
| Las partículas suben hasta la franja del HUD y tapan el texto. | Se dibujan antes del HUD, que queda siempre encima. |
| La partida se alarga demasiado con 96 golpes. | Es una decisión aceptada. Si resulta pesada, una spec de dificultad puede ajustar la resistencia por fila. |

## Lo que **no** entra en esta spec

- Bloques de 3 o más golpes, resistencia por fila y bloques indestructibles.
- Texto «+10» flotante y temblor de pantalla.
- Partículas con colisiones.
- Varios niveles y power-ups.

Cada una de estas funcionalidades, si llega, irá en su propia spec.
