# Arkanoid

Juego de Arkanoid/Breakout para el navegador, hecho con HTML, CSS y JavaScript puros, sin dependencias ni build.

## Cómo jugar

Abre `index.html` en el navegador (doble clic) y listo.

También se puede servir la carpeta por HTTP, por ejemplo durante el desarrollo:

```bash
npx serve .
# o bien
python -m http.server
```

Y después abrir `http://localhost:<puerto>/`.

## Controles

| Acción                      | Teclado    | Ratón           |
|-----------------------------|------------|-----------------|
| Mover la pala               | ← → o A D  | Mover el cursor |
| Empezar / sacar / continuar | Espacio    | Clic            |
| Pausa                       | P o Esc    | —               |
| Silenciar                   | M          | —               |

## Características

- 5 niveles con tableros distintos: completo, pirámide, damero, franjas y marco.
- Dificultad creciente: la pelota va más rápido en cada nivel (de 360 a 480 px/s) y los bloques aguantan 1, 2 o 3 golpes.
- Bloques que se agrietan al recibir golpes, explosión animada y partículas.
- 3 vidas, puntuación (10 puntos por bloque y bonificación de 100 × nivel al superarlo) y récord guardado en el navegador.
- Efectos de sonido para rebotes, bloques rotos, vida perdida, nivel superado, game over y victoria.

## Estructura

```
index.html          Página de entrada con el canvas (480×640)
styles.css          Estilos mínimos
game.js             Todo el juego: estado, lógica, entrada, render y bucle
assets/             Spritesheet, su script de dibujo y sonidos
specs/              Especificaciones de cada funcionalidad
```

## Desarrollo guiado por specs

Cada funcionalidad se diseña primero como spec en `specs/` y solo se implementa cuando está aprobada:

1. `/spec <descripción>` crea la spec en estado `Borrador`.
2. Se revisa y se cambia a `Aprobado`.
3. `/spec-impl NN-slug` la implementa en la rama `spec-NN-slug`, con un commit por paso.
4. Se marca como `Implementado` y se fusiona en `main`.

| Spec | Título                                                    | Estado       |
|------|-----------------------------------------------------------|--------------|
| 01   | MVP jugable de Arkanoid                                   | Implementado |
| 02   | Bloques de dos golpes con grietas, explosión y partículas | Implementado |
| 03   | Cinco niveles con dificultad creciente y sonidos          | Implementado |
