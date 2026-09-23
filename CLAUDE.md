# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Estado del proyecto

Juego Arkanoid/Breakout para navegador, todavía en preparación. Aún no hay código del juego. Tampoco hay `package.json`, build, linter ni tests, y `README.md` está vacío. Por ahora el repo solo tiene los assets y las skills del flujo de specs.

## Flujo de trabajo: desarrollo guiado por specs

Cada funcionalidad se diseña como spec antes de escribir código. Hay dos skills del proyecto en `.agents/skills/`, fijadas desde `Klerith/fernando-skills` mediante `skills-lock.json`:

- `/spec <descripción>`: hace preguntas para aclarar el alcance y luego escribe una spec numerada en `specs/` (p. ej. `specs/01-mvp-arkanoid.md`) usando `.agents/skills/spec/template.md`. No escribe código.
- `/spec-impl <NN-nombre-spec>`: solo implementa una spec si su estado significa "Aprobado". Crea una rama git con el nombre de la spec y avanza paso a paso. Lee la configuración opcional de `specs/.spec-config.yml`.

Las specs nuevas deben usar el mismo idioma, los mismos títulos de sección y los mismos nombres de estado que las existentes. La implementación sigue el plan de la spec aprobada, sin improvisar fuera de su alcance. `/spec-impl` necesita un repo git, y este directorio todavía no lo es.

## Assets

- `assets/spritesheet.js` es un script de navegador sin módulos. Define estas globales:
  - `SPRITES` guarda los rectángulos de origen de `paddle`, `ball` y `blocks.<color>`. Los colores son gray, red, yellow, cyan, magenta, hotpink y green.
  - `EXPLOSION_FRAMES[color]` tiene 4 frames por color. `EXPLOSION_DURATION` vale 150 ms.
  - `loadSpritesheet(cb)` carga la hoja en un canvas fuera de pantalla y encola los callbacks hasta que está lista.
  - `drawSprite(ctx, name, x, y, w, h)` dibuja un sprite. Los nombres de bloques llevan el prefijo `block_<color>`.
  - `drawFrame(ctx, frame, x, y, w, h)` dibuja un frame.
- La ruta de la hoja está fija como `assets/spritesheet-breakout.png`, relativa a la página. Por eso el HTML de entrada debe estar en la raíz del repo, o hay que cambiar la ruta.
- Los sonidos son `assets/sounds/ball-bounce.mp3` y `assets/sounds/break-sound.mp3`.
- El código existente pone espacios dentro de paréntesis y corchetes, p. ej. `f( x )` y `a[ i ]`.

## Ejecución

El juego carga imágenes y audio, así que hay que servir la raíz del repo por HTTP en vez de abrirlo con `file://`. Por ejemplo, con `npx serve .` o `python -m http.server`.
