# SPEC 03 — Cinco niveles con dificultad creciente y sonidos de partida

> **Estado:** Aprobado
> **Depende de:** SPEC 01, SPEC 02
> **Fecha:** 2026-09-25
> **Objetivo:** Encadenar cinco niveles con tableros generados por código, pelota más rápida y bloques más duros, y ponerles sonido a perder vida, superar nivel, game over y victoria.

## Alcance

**Dentro:**

- Cinco niveles fijos, jugados en orden del 1 al 5. Todas las partidas empiezan en el nivel 1.
- Cada tablero se genera por código a partir de un patrón sobre la rejilla de 8 columnas y 6 filas de la SPEC 01. Cada fila conserva su color de `ROW_COLORS`.
  - Nivel 1, `full`: las 48 celdas.
  - Nivel 2, `pyramid`: pirámide invertida. La fila `r`, de 0 a 3, ocupa las columnas `r` a `7 - r`, y las filas 4 y 5 quedan vacías. Son 20 bloques.
  - Nivel 3, `checker`: damero. Hay bloque donde `( fila + columna ) % 2 === 0`. Son 24 bloques.
  - Nivel 4, `stripes`: las filas 0, 2 y 4 llenas y las demás vacías. Son 24 bloques.
  - Nivel 5, `frame`: marco. Las filas 0 y 5 van completas y las columnas 0 y 7 cubren las filas intermedias. Son 24 bloques.
- Golpes por bloque según el nivel: 1 en los niveles 1 y 2, 2 en los niveles 3 y 4, y 3 en el nivel 5.
- Sprites de daño por golpes restantes: con `hp` 2 se usa la columna `sx = 96` y con `hp` 1, la `sx = 160`. Sustituye a la columna `sx = 128` de la SPEC 02.
- La velocidad de la pelota sube 30 px/s por nivel: 360, 390, 420, 450 y 480. Se mantiene constante dentro de cada nivel.
- Superar un nivel suma una bonificación de 100 × número de nivel, incluido el nivel 5.
- Al vaciar los niveles 1 a 4 aparece la pantalla `levelup` con el texto «NIVEL N», donde N es el siguiente nivel. Espacio o clic cargan su tablero y pasan a `serve`.
- Al vaciar el nivel 5 se pasa a `won`, como en la SPEC 01.
- Las vidas y la puntuación se conservan de un nivel al siguiente.
- El HUD muestra «NIVEL N» centrado en una segunda línea, debajo del récord, en todas las pantallas.
- Tras game over o la victoria final, Espacio o clic reinician desde el nivel 1, con 3 vidas y 0 puntos.
- Sonidos nuevos, reutilizando los dos mp3 con otra velocidad de reproducción y sin conservar el tono:
  - Perder una vida sin llegar a game over: `ball-bounce.mp3` a 0,5.
  - Superar los niveles 1 a 4: `break-sound.mp3` a 1,5.
  - Game over: `break-sound.mp3` a 0,5.
  - Victoria final: `break-sound.mp3` a 2.
- La tecla M también silencia los sonidos nuevos.

**Fuera de alcance (para futuras specs):**

- Archivos de sonido nuevos, síntesis con Web Audio y música de fondo.
- Guardar el nivel alcanzado entre sesiones y elegir nivel.
- Bloques indestructibles y power-ups.
- Aceleración de la pelota dentro de un mismo nivel.
- Editor de niveles y tableros dibujados a mano.
- Más de 5 niveles, o niveles que se repiten.
- Sub-pasos anti-tunneling. A 480 px/s con dt ≤ 1/30 s la pelota avanza como máximo 16 px por frame, menos que la altura de un bloque (24 px).

## Modelo de datos

```js
// Constantes nuevas en game.js
const BALL_SPEED_STEP = 30;        // px/s extra por nivel; BALL_SPEED (360) es la del nivel 1
const LEVEL_BONUS = 100;           // bonificación = LEVEL_BONUS × nivel superado
const LEVELS = [
  { pattern: 'full',    hits: 1 },
  { pattern: 'pyramid', hits: 1 },
  { pattern: 'checker', hits: 2 },
  { pattern: 'stripes', hits: 2 },
  { pattern: 'frame',   hits: 3 },
];
const DAMAGE_SX = { 2: 96, 1: 160 };   // columna del sprite de daño según hp restante

// Sonidos por evento: [ sonido, velocidad de reproducción ]
const EVENT_SOUNDS = {
  loseLife: [ 'bounce', 0.5 ],
  levelUp:  [ 'break', 1.5 ],
  gameOver: [ 'break', 0.5 ],
  victory:  [ 'break', 2 ],
};

// Cambios en state
const state = {
  // ...todo lo de las SPEC 01 y 02...
  screen: 'start',   // 'start' | 'serve' | 'playing' | 'paused' | 'levelup' | 'won' | 'lost'
  level: 1,          // 1..LEVELS.length
  bricks: [ /* { x, y, w, h, color, alive, hp } */ ],   // hp empieza en LEVELS[ level - 1 ].hits
};
```

Constantes que se eliminan: `BRICK_HITS` y `DAMAGED_SX`, de la SPEC 02.

Convenciones:

- La velocidad del nivel actual es `BALL_SPEED + BALL_SPEED_STEP * ( state.level - 1 )`. Se usa en el saque y en el rebote con la pala, que siguen manteniendo constante el módulo de la velocidad.
- Un bloque está dañado cuando `hp < LEVELS[ state.level - 1 ].hits`. Se dibuja con `DAMAGE_SX[ hp ]` y la fila de su color, `SPRITES.blocks[ color ].sy`.
- `playSound( name, rate = 1 )` fija `playbackRate = rate` y `preservesPitch = false` en el clon del `Audio`, y respeta `state.muted`.
- `createBricks( level )` sustituye a `createBricks()`. Las posiciones de cada celda son las de la SPEC 01.
- `assets/spritesheet.js` y `assets/sounds/` no se modifican.

## Plan de implementación

1. Añadir la estructura de niveles con el nivel 1. Añadir `state.level`, `LEVELS` y `createBricks( level )`, que genera el tablero de un patrón. El nivel 1 usa `full` con 1 golpe. `resetGame()` vuelve a `state.level = 1`. El HUD muestra «NIVEL N» centrado en `HUD_Y + 22`. Se quitan `BRICK_HITS` y `DAMAGED_SX` y el `hp` inicial sale de `LEVELS`. Prueba manual: el juego funciona como antes, pero los bloques del nivel 1 se rompen de un golpe y el HUD muestra «NIVEL 1».
2. Añadir los cinco patrones y los sprites de daño. Implementar `pyramid`, `checker`, `stripes` y `frame` en `createBricks( level )`. `render()` dibuja los bloques dañados con `DAMAGE_SX[ hp ]`. Prueba manual: desde la consola, `state.level = 5; state.bricks = createBricks( 5 )` muestra el marco. Los bloques se ven con dos fases de grieta antes de romperse.
3. Añadir la progresión de niveles. Al no quedar bloques vivos, se suma `LEVEL_BONUS * state.level`. En los niveles 1 a 4, `state.level` sube uno y se pasa a `levelup`. En el nivel 5 se pasa a `won` con `endGame( 'won' )`. `action()` en `levelup` genera el tablero del nuevo nivel, vacía explosiones y partículas y pasa a `serve`. `render()` dibuja la pantalla `levelup` con «NIVEL N» y «Espacio o clic para continuar». Prueba manual: al vaciar el nivel 1 aparece «NIVEL 2» y, tras pulsar Espacio, se juega la pirámide con las mismas vidas y la puntuación acumulada.
4. Hacer que la velocidad dependa del nivel. `launchBall()` y `bounceOffPaddle()` usan `BALL_SPEED + BALL_SPEED_STEP * ( state.level - 1 )`. Prueba manual: en el nivel 3 el módulo de la velocidad es 420 px/s tras el saque y tras cada rebote en la pala.
5. Añadir los sonidos de partida. `playSound( name, rate )` acepta la velocidad de reproducción. Suenan `EVENT_SOUNDS.loseLife` al perder una vida que no sea la última, `levelUp` al pasar a `levelup`, `gameOver` al pasar a `lost` y `victory` al pasar a `won`. Prueba manual: cada evento suena con su tono y M los silencia todos.

## Criterios de aceptación

- [ ] La página carga sin errores en la consola, en la pantalla de inicio y con el tablero del nivel 1 detrás.
- [ ] `assets/spritesheet.js` y `assets/sounds/` no tienen cambios respecto a `main`.
- [ ] Los tableros tienen 48, 20, 24, 24 y 24 bloques en los niveles 1 a 5, con las formas `full`, `pyramid`, `checker`, `stripes` y `frame` descritas en el alcance.
- [ ] Cada bloque conserva el color de su fila según `ROW_COLORS`.
- [ ] Los bloques necesitan exactamente 1, 1, 2, 2 y 3 golpes en los niveles 1 a 5.
- [ ] Un bloque con `hp` 2 restante se dibuja con `sx = 96` y uno con `hp` 1 dañado, con `sx = 160`.
- [ ] Cada golpe suma 10 puntos, y superar el nivel N suma además 100 × N.
- [ ] Completar los 5 niveles sin perder vidas da exactamente 3860 puntos: 2360 por golpes y 1500 de bonificación.
- [ ] Al vaciar los niveles 1 a 4 aparece la pantalla «NIVEL N» con el número del siguiente nivel. Espacio o clic cargan ese tablero con la pelota en la pala.
- [ ] Al pasar de nivel se conservan las vidas y la puntuación.
- [ ] Al vaciar el nivel 5 se muestra la pantalla de victoria.
- [ ] Tras el saque y tras cada rebote en la pala, el módulo de la velocidad de la pelota es 360, 390, 420, 450 y 480 px/s en los niveles 1 a 5.
- [ ] El HUD muestra «NIVEL N» con el nivel actual en todas las pantallas.
- [ ] Tras game over o la victoria final, Espacio o clic reinician en el nivel 1, con 48 bloques de 1 golpe, 3 vidas y 0 puntos.
- [ ] Al perder una vida sin llegar a game over suena `ball-bounce.mp3` a velocidad 0,5.
- [ ] Al pasar a `levelup` suena `break-sound.mp3` a velocidad 1,5.
- [ ] Al pasar a `lost` suena `break-sound.mp3` a velocidad 0,5.
- [ ] Al pasar a `won` suena `break-sound.mp3` a velocidad 2.
- [ ] Con M activado no suena ninguno de estos sonidos.
- [ ] P y Esc no pausan en la pantalla `levelup`.

## Decisiones

- **Sí:** niveles y sonidos en una sola spec, por decisión del usuario. Se propuso dividirla (niveles en la SPEC 03 y sonidos en la SPEC 04) y se descartó.
- **Sí:** 5 niveles fijos que se juegan una sola vez.
- **No:** 3 niveles, ni niveles infinitos que se repiten.
- **Sí:** tableros generados por código a partir de un patrón con nombre. No hace falta dibujar cada tablero a mano y las formas quedan descritas con una regla.
- **No:** mapas de texto ni un archivo `levels.js` aparte.
- **Sí:** patrones `full`, `pyramid`, `checker`, `stripes` y `frame`, con formas muy distintas entre sí.
- **No:** tableros aleatorios con semilla. Dan menos control sobre el diseño.
- **Sí:** 1, 1, 2, 2 y 3 golpes por nivel. Sustituye la regla de la SPEC 02, en la que todos los bloques aguantaban 2 golpes.
- **Sí:** dos fases de grieta, `sx = 96` y `sx = 160`, que dan tres estados distinguibles para los bloques de 3 golpes. El `sx = 128` de la SPEC 02 se sustituye para que la escala de daño sea la misma en todos los niveles.
- **Sí:** +30 px/s por nivel, hasta 480 px/s. A esa velocidad no hace falta anti-tunneling.
- **No:** +60 px/s por nivel. En el nivel 5 la pelota avanzaría 20 px por frame, demasiado cerca de los 24 px de altura de un bloque.
- **Sí:** pantalla `levelup` que espera a Espacio o clic, con el mismo patrón que las pantallas de inicio y victoria.
- **No:** pasar de nivel sin pantalla, ni con una espera automática de 2 s.
- **Sí:** las vidas se conservan entre niveles.
- **No:** reiniciar a 3 vidas ni dar una vida extra por nivel.
- **Sí:** bonificación de 100 × nivel al superar cada nivel.
- **No:** bonificación por vida restante.
- **Sí:** reiniciar siempre desde el nivel 1 y no guardar el nivel entre sesiones.
- **Sí:** «NIVEL N» en una segunda línea del HUD. No mueve nada de lo que ya existe.
- **Sí:** reutilizar los dos mp3 con `playbackRate` y `preservesPitch = false`. No hacen falta archivos nuevos ni licencias.
- **No:** síntesis con Web Audio, ni pedir mp3 nuevos al usuario.
- **Sí:** en la última vida suena solo `gameOver`, no `loseLife`. Así los dos sonidos no se solapan.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| El navegador ignora `preservesPitch` y el sonido cambia de velocidad pero no de tono. | Los eventos se siguen distinguiendo por su duración. El cambio es solo estético y no afecta al juego. |
| El nivel 5, con 72 golpes a 480 px/s, resulta demasiado difícil. | Los valores están en `LEVELS` y `BALL_SPEED_STEP`, fáciles de ajustar. Se acepta el riesgo. |
| El texto «NIVEL N» del HUD se solapa con el indicador «SIN SONIDO (M)», que está en la misma línea. | El nivel va centrado y el indicador alineado a la derecha, en tamaños de letra distintos. No se tocan. |
| Quedan explosiones o partículas del nivel anterior al cargar el siguiente. | Al salir de `levelup` se vacían `state.explosions` y `state.particles`. |

## Lo que **no** entra en esta spec

- Archivos de sonido nuevos, Web Audio y música de fondo.
- Guardar el nivel, elegir nivel y más de 5 niveles.
- Bloques indestructibles, power-ups y editor de niveles.
- Aceleración de la pelota dentro de un nivel y sub-pasos anti-tunneling.

Cada una de estas funcionalidades, si llega, irá en su propia spec.
