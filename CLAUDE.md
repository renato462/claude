# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Estado del proyecto

Juego Arkanoid/Breakout para navegador, hecho con HTML, CSS y JavaScript puros, sin dependencias. No hay `package.json`, build, linter ni tests: la verificación es manual en el navegador, siguiendo los criterios de aceptación de cada spec.

Specs implementadas y fusionadas en `main`:

- **SPEC 01** `01-mvp-arkanoid`: MVP jugable. Pala, pelota, 8×6 bloques, vidas, puntuación, récord en `localStorage`, pausa y silencio.
- **SPEC 02** `02-destruccion-de-bloques`: bloques con varios golpes, sprites de grieta, explosión animada y partículas con tiro parabólico.
- **SPEC 03** `03-niveles-y-sonidos`: cinco niveles generados por patrón, dificultad creciente, pantalla `levelup`, bonificación por nivel y sonidos de partida.

Lo que cada spec deja "fuera de alcance" es la lista de candidatos para las siguientes, por ejemplo power-ups, bloques indestructibles o guardar el progreso.

## Flujo de trabajo: desarrollo guiado por specs

Cada funcionalidad se diseña como spec antes de escribir código. Hay dos skills del proyecto, fijadas desde `Klerith/fernando-skills` mediante `skills-lock.json`. Están en `.agents/skills/` y hay una copia idéntica en `.claude/skills/`, que es la que carga Claude Code. Si se modifica una, hay que mantener la otra igual.

Ciclo de vida de una spec, tal como se ha seguido en las tres primeras:

1. `/spec <descripción>`: hace preguntas para aclarar el alcance y escribe `specs/NN-slug.md` a partir de `.agents/skills/spec/template.md`. No escribe código. Se commitea como `specs/NN-slug.md`, con estado `Borrador`.
2. El usuario revisa la spec y cambia el estado a `Aprobado`. Se commitea aparte, como `Aprobado SPEC NN`.
3. `/spec-impl NN-slug`: solo continúa si el estado es `Aprobado` y exige que el árbol de trabajo esté limpio. Con `AutoCreateBranch: true` en `specs/.spec-config.yml`, crea la rama `spec-NN-slug` sin preguntar. Implementa el "Plan de implementación" paso a paso, con un commit por paso (`Paso NN. …`), y marca los criterios de aceptación cumplidos con `[x]`.
4. Al terminar, el estado pasa a `Implementado`, se hace un commit final (`Implementar SPEC NN: …`) y la rama se fusiona en `main` con un merge commit.

Convenciones de las specs, que las nuevas deben respetar:

- Idioma: español, igual que las respuestas al usuario y los textos del juego.
- Cabecera en blockquote: `# SPEC NN — Título`, seguido de `**Estado:**`, `**Depende de:**`, `**Fecha:**` y `**Objetivo:**`.
- Estados: `Borrador` → `Aprobado` → `Implementado` (y `Obsoleto` si se sustituye).
- Secciones, en este orden: `Alcance` (con **Dentro:** y **Fuera de alcance**), `Modelo de datos`, `Plan de implementación`, `Criterios de aceptación`, `Decisiones`, `Riesgos` y `Lo que **no** entra en esta spec`.
- El "Modelo de datos" nombra las constantes y los campos de `state` exactamente como van en `game.js`.
- Si una spec cambia algo de una anterior, lo dice explícitamente (p. ej. la SPEC 03 sustituye el `sx = 128` de la SPEC 02) y la nueva dependencia va en `Depende de`.

La implementación sigue el plan de la spec aprobada, sin improvisar fuera de su alcance. Los cambios que no estén en ninguna spec requieren una spec nueva, o preguntar antes.

## Arquitectura del código

- `index.html` (en la raíz) tiene un único `<canvas id="game">` de 480×640 y carga, en este orden, `assets/spritesheet.js` y `game.js` como scripts clásicos, sin módulos.
- `styles.css` solo centra el canvas y pone el fondo.
- `game.js` contiene todo el juego en un solo archivo, organizado así:
  - Constantes en `MAYÚSCULAS` al principio. Las de cada spec se añaden allí, con un comentario de qué sustituyen si procede. `LEVELS` define `{ pattern, hits }` por nivel y `EVENT_SOUNDS` asocia eventos con `[ sonido, velocidad ]`.
  - Un único objeto global `state`. `state.screen` es una máquina de estados: `'start' | 'serve' | 'playing' | 'paused' | 'levelup' | 'won' | 'lost'`. `pausedFrom` recuerda a qué pantalla se vuelve tras la pausa.
  - `action()` centraliza Espacio y clic según la pantalla actual. Las transiciones pasan por `startLevel()`, `completeLevel()`, `loseLife()`, `endGame()` y `resetGame()`.
  - `update( dt )` y `render()` están separados. El bucle `loop()` usa `requestAnimationFrame`, con `dt` en segundos y tope `MAX_DT`.
  - `state.time` es el reloj del juego en ms y solo avanza dentro de `update()`. Las animaciones (explosiones y partículas) lo usan en vez de `performance.now()`, para que se congelen con la pausa.
  - Los tableros se generan con `createBricks( level )` y `hasBrick( pattern, row, col )`. Cada bloque lleva `hp` y el sprite de daño se elige con `DAMAGE_SX[ hp ]`.
  - Sonido: `playSound( name, rate )` y `playEventSound( event )`. Respetan `state.muted` (tecla M) y cambian la velocidad sin conservar el tono.

## Assets

- `assets/spritesheet.js` es un script de navegador sin módulos. Define estas globales:
  - `SPRITES` guarda los rectángulos de origen de `paddle`, `ball` y `blocks.<color>`. Los colores son gray, red, yellow, cyan, magenta, hotpink y green.
  - `EXPLOSION_FRAMES[color]` tiene 4 frames por color. `EXPLOSION_DURATION` vale 150 ms, pero `game.js` usa su propio `BRICK_EXPLOSION_MS` (300).
  - `loadSpritesheet(cb)` carga la hoja en un canvas fuera de pantalla y encola los callbacks hasta que está lista.
  - `drawSprite(ctx, name, x, y, w, h)` dibuja un sprite. Los nombres de bloques llevan el prefijo `block_<color>`.
  - `drawFrame(ctx, frame, x, y, w, h)` dibuja un frame. Se usa también para los sprites de grieta, que no tienen nombre en `SPRITES`.
- La ruta de la hoja está fija como `assets/spritesheet-breakout.png`, relativa a la página. Por eso `index.html` debe seguir en la raíz del repo.
- Los sonidos son `assets/sounds/ball-bounce.mp3` y `assets/sounds/break-sound.mp3`. Los efectos nuevos se consiguen reutilizándolos a otra velocidad de reproducción, no añadiendo archivos.

## Estilo de código

- Espacios dentro de paréntesis y corchetes, p. ej. `f( x )` y `a[ i ]`.
- Funciones declaradas con `function`, sin clases ni módulos.
- Comentarios breves en español, solo donde aclaran unidades o por qué se sustituye un valor.

## Ejecución

El juego carga imágenes y audio, así que hay que servir la raíz del repo por HTTP en vez de abrirlo con `file://`. Por ejemplo, con `npx serve .` o `python -m http.server`, y abrir `http://localhost:<puerto>/`.
