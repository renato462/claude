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

const BG_COLOR = '#0b0b1a';
const TEXT_COLOR = '#ffffff';
const HUD_Y = 30;

// Estado de la partida
const state = {
  screen: 'start',           // 'start' | 'serve' | 'playing' | 'paused' | 'won' | 'lost'
  score: 0,
  lives: START_LIVES,
  highScore: 0,
  muted: false,
  time: 0,                   // reloj de juego en ms; solo avanza dentro de update( dt )
  paddle: { x: ( CANVAS_W - PADDLE_W ) / 2, y: PADDLE_Y, w: PADDLE_W, h: PADDLE_H },
  ball: { x: 0, y: 0, vx: 0, vy: 0, size: BALL_SIZE },
  bricks: [],
  explosions: [],
  particles: [],
  input: { left: false, right: false, mouseX: null },
};

// Pantalla a la que se vuelve al salir de la pausa
let pausedFrom = null;

const canvas = document.getElementById( 'game' );
const ctx = canvas.getContext( '2d' );
ctx.imageSmoothingEnabled = false;

// Sonido
const sounds = {
  bounce: new Audio( 'assets/sounds/ball-bounce.mp3' ),
  break: new Audio( 'assets/sounds/break-sound.mp3' ),
};

// Se clona el Audio para que los sonidos se solapen sin cortarse
function playSound( name ) {
  if ( state.muted ) return;
  const s = sounds[ name ].cloneNode();
  s.play().catch( () => {} );
}

// Récord persistente
function loadHighScore() {
  try {
    const v = parseInt( localStorage.getItem( HIGHSCORE_KEY ), 10 );
    return Number.isFinite( v ) && v > 0 ? v : 0;
  } catch ( e ) {
    return 0;
  }
}

function saveHighScore( value ) {
  try {
    localStorage.setItem( HIGHSCORE_KEY, String( value ) );
  } catch ( e ) {
    // Sin localStorage el récord queda solo en memoria
  }
}

// Entrada de teclado
const LEFT_KEYS = [ 'arrowleft', 'a' ];
const RIGHT_KEYS = [ 'arrowright', 'd' ];

function setKey( key, pressed ) {
  const k = key.toLowerCase();
  if ( LEFT_KEYS.includes( k ) ) { state.input.left = pressed; return true; }
  if ( RIGHT_KEYS.includes( k ) ) { state.input.right = pressed; return true; }
  return false;
}

window.addEventListener( 'keydown', e => {
  if ( setKey( e.key, true ) ) { e.preventDefault(); return; }

  const k = e.key.toLowerCase();
  if ( k === ' ' ) {
    e.preventDefault();
    if ( !e.repeat ) action();
  } else if ( k === 'm' ) {
    if ( !e.repeat ) state.muted = !state.muted;
  } else if ( k === 'p' || k === 'escape' ) {
    e.preventDefault();
    if ( !e.repeat ) togglePause();
  }
} );

window.addEventListener( 'keyup', e => {
  if ( setKey( e.key, false ) ) e.preventDefault();
} );

// Al perder el foco no llegan los keyup: soltamos todo
window.addEventListener( 'blur', () => {
  state.input.left = false;
  state.input.right = false;
} );

// Entrada de ratón: convierte el cursor al espacio lógico del canvas
canvas.addEventListener( 'mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  state.input.mouseX = ( e.clientX - rect.left ) * ( CANVAS_W / rect.width );
} );

canvas.addEventListener( 'click', () => action() );

// Espacio o clic: avanza según la pantalla actual
function action() {
  if ( state.screen === 'start' ) {
    state.screen = 'serve';
  } else if ( state.screen === 'serve' ) {
    launchBall();
  } else if ( state.screen === 'won' || state.screen === 'lost' ) {
    resetGame();
  }
}

function togglePause() {
  if ( state.screen === 'playing' || state.screen === 'serve' ) {
    pausedFrom = state.screen;
    state.screen = 'paused';
  } else if ( state.screen === 'paused' ) {
    state.screen = pausedFrom;
    pausedFrom = null;
    // Descarta el movimiento del ratón durante la pausa para reanudar igual
    state.input.mouseX = null;
  }
}

function resetGame() {
  state.score = 0;
  state.lives = START_LIVES;
  state.bricks = createBricks();
  state.explosions = [];
  state.particles = [];
  state.screen = 'serve';
}

function endGame( result ) {
  state.screen = result;
  if ( state.score > state.highScore ) {
    state.highScore = state.score;
    saveHighScore( state.highScore );
  }
}

function createBricks() {
  const bricks = [];
  for ( let row = 0; row < BRICK_ROWS; row++ ) {
    for ( let col = 0; col < BRICK_COLS; col++ ) {
      bricks.push( {
        x: BRICK_OFFSET_X + col * ( BRICK_W + BRICK_GAP ),
        y: BRICK_OFFSET_Y + row * ( BRICK_H + BRICK_GAP ),
        w: BRICK_W,
        h: BRICK_H,
        color: ROW_COLORS[ row ],
        alive: true,
        hp: BRICK_HITS,
      } );
    }
  }
  return bricks;
}

function clamp( v, min, max ) {
  return Math.max( min, Math.min( max, v ) );
}

function degToRad( deg ) {
  return deg * Math.PI / 180;
}

function overlaps( a, b ) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// Saque con ángulo aleatorio de ±30° respecto a la vertical, hacia arriba
function launchBall() {
  const angle = degToRad( ( Math.random() * 2 - 1 ) * 30 );
  state.ball.vx = BALL_SPEED * Math.sin( angle );
  state.ball.vy = -BALL_SPEED * Math.cos( angle );
  state.screen = 'playing';
}

// Pelota pegada al centro de la pala, justo encima
function stickBallToPaddle() {
  const b = state.ball, p = state.paddle;
  b.x = p.x + ( p.w - b.size ) / 2;
  b.y = p.y - b.size;
  b.vx = 0;
  b.vy = 0;
}

function loseLife() {
  state.lives -= 1;
  if ( state.lives <= 0 ) {
    endGame( 'lost' );
  } else {
    state.screen = 'serve';
  }
}

function updatePaddle( dt ) {
  const p = state.paddle;

  // El ratón centra la pala en el cursor; se consume para no bloquear el teclado
  if ( state.input.mouseX !== null ) {
    p.x = clamp( state.input.mouseX - p.w / 2, 0, CANVAS_W - p.w );
    state.input.mouseX = null;
  }

  let dir = 0;
  if ( state.input.left ) dir -= 1;
  if ( state.input.right ) dir += 1;
  p.x = clamp( p.x + dir * PADDLE_SPEED * dt, 0, CANVAS_W - p.w );
}

// Rebote en la pala: el ángulo depende del punto de impacto, la velocidad no cambia
function bounceOffPaddle() {
  const b = state.ball, p = state.paddle;
  const ballBox = { x: b.x, y: b.y, w: b.size, h: b.size };
  if ( b.vy <= 0 || !overlaps( ballBox, p ) ) return;

  const offset = clamp( ( ( b.x + b.size / 2 ) - ( p.x + p.w / 2 ) ) / ( PADDLE_W / 2 ), -1, 1 );
  const angle = degToRad( offset * MAX_BOUNCE_ANGLE );
  b.vx = BALL_SPEED * Math.sin( angle );
  b.vy = -BALL_SPEED * Math.cos( angle );
  b.y = p.y - b.size;
  playSound( 'bounce' );
}

// Fragmentos del bloque roto: nacen en su centro con dirección y velocidad aleatorias
function spawnParticles( brick ) {
  for ( let i = 0; i < PARTICLE_COUNT; i++ ) {
    const angle = Math.random() * Math.PI * 2;
    const speed = PARTICLE_SPEED_MIN + Math.random() * ( PARTICLE_SPEED_MAX - PARTICLE_SPEED_MIN );
    state.particles.push( {
      x: brick.x + ( brick.w - PARTICLE_SIZE ) / 2,
      y: brick.y + ( brick.h - PARTICLE_SIZE ) / 2,
      vx: speed * Math.cos( angle ),
      vy: speed * Math.sin( angle ),
      color: brick.color,
      startTime: state.time,
    } );
  }
}

// Golpea como máximo un bloque por frame y rebota por el eje de menor penetración
function hitBrick() {
  const b = state.ball;
  const ballBox = { x: b.x, y: b.y, w: b.size, h: b.size };

  for ( const brick of state.bricks ) {
    if ( !brick.alive || !overlaps( ballBox, brick ) ) continue;

    brick.hp -= 1;
    state.score += POINTS_PER_BRICK;

    if ( brick.hp > 0 ) {
      playSound( 'bounce' );
    } else {
      brick.alive = false;
      state.explosions.push( {
        x: brick.x, y: brick.y, w: brick.w, h: brick.h,
        color: brick.color,
        startTime: state.time,
      } );
      spawnParticles( brick );
      playSound( 'break' );
    }

    // Se saca la pelota del bloque para que un bloque dañado no reciba otro golpe en el frame siguiente
    const penX = Math.min( b.x + b.size, brick.x + brick.w ) - Math.max( b.x, brick.x );
    const penY = Math.min( b.y + b.size, brick.y + brick.h ) - Math.max( b.y, brick.y );
    if ( penX < penY ) {
      b.vx = -b.vx;
      b.x = b.x + b.size / 2 < brick.x + brick.w / 2 ? brick.x - b.size : brick.x + brick.w;
    } else {
      b.vy = -b.vy;
      b.y = b.y + b.size / 2 < brick.y + brick.h / 2 ? brick.y - b.size : brick.y + brick.h;
    }

    if ( !state.bricks.some( br => br.alive ) ) endGame( 'won' );
    return;
  }
}

function updateBall( dt ) {
  const b = state.ball;
  b.x += b.vx * dt;
  b.y += b.vy * dt;

  // Paredes laterales
  if ( b.x < 0 ) {
    b.x = 0;
    b.vx = Math.abs( b.vx );
    playSound( 'bounce' );
  } else if ( b.x + b.size > CANVAS_W ) {
    b.x = CANVAS_W - b.size;
    b.vx = -Math.abs( b.vx );
    playSound( 'bounce' );
  }

  // Techo
  if ( b.y < 0 ) {
    b.y = 0;
    b.vy = Math.abs( b.vy );
    playSound( 'bounce' );
  }

  bounceOffPaddle();
  hitBrick();
  if ( state.screen !== 'playing' ) return;

  // Cae por debajo del canvas
  if ( b.y > CANVAS_H ) loseLife();
}

function updateExplosions() {
  state.explosions = state.explosions.filter( ex => state.time - ex.startTime < BRICK_EXPLOSION_MS );
}

function updateParticles( dt ) {
  state.particles = state.particles.filter( pt => state.time - pt.startTime < PARTICLE_LIFE_MS );
  for ( const pt of state.particles ) {
    pt.vy += PARTICLE_GRAVITY * dt;
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
  }
}

function update( dt ) {
  state.time += dt * 1000;
  updatePaddle( dt );

  if ( state.screen === 'serve' ) {
    stickBallToPaddle();
  } else if ( state.screen === 'playing' ) {
    updateBall( dt );
  }

  updateExplosions();
  updateParticles( dt );
}

// Dibujo
function drawText( text, x, y, size, align ) {
  ctx.font = 'bold ' + size + 'px monospace';
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = TEXT_COLOR;
  ctx.fillText( text, x, y );
}

function renderHud() {
  drawText( 'PUNTOS ' + state.score, 16, HUD_Y, 16, 'left' );
  drawText( 'RÉCORD ' + state.highScore, CANVAS_W / 2, HUD_Y, 16, 'center' );
  drawText( 'VIDAS ' + state.lives, CANVAS_W - 16, HUD_Y, 16, 'right' );
  if ( state.muted ) drawText( 'SIN SONIDO (M)', CANVAS_W - 16, HUD_Y + 22, 11, 'right' );
}

function renderExplosions() {
  const frameTime = BRICK_EXPLOSION_MS / 4;
  for ( const ex of state.explosions ) {
    const i = Math.floor( ( state.time - ex.startTime ) / frameTime );
    const frame = EXPLOSION_FRAMES[ ex.color ][ i ];
    if ( frame ) drawFrame( ctx, frame, ex.x, ex.y, ex.w, ex.h );
  }
}

function renderParticles() {
  for ( const pt of state.particles ) {
    ctx.fillStyle = PARTICLE_COLORS[ pt.color ];
    ctx.fillRect( pt.x, pt.y, PARTICLE_SIZE, PARTICLE_SIZE );
  }
}

function renderOverlay( title, subtitle ) {
  ctx.fillStyle = 'rgba( 0, 0, 0, 0.6 )';
  ctx.fillRect( 0, 0, CANVAS_W, CANVAS_H );
  drawText( title, CANVAS_W / 2, 380, 36, 'center' );
  if ( subtitle ) drawText( subtitle, CANVAS_W / 2, 425, 14, 'center' );
}

function render() {
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect( 0, 0, CANVAS_W, CANVAS_H );

  for ( const brick of state.bricks ) {
    if ( !brick.alive ) continue;
    if ( brick.hp < BRICK_HITS ) {
      // Sprite agrietado: misma fila de color que el bloque, columna DAMAGED_SX
      const frame = { sx: DAMAGED_SX, sy: SPRITES.blocks[ brick.color ].sy, sw: 32, sh: 16 };
      drawFrame( ctx, frame, brick.x, brick.y, brick.w, brick.h );
    } else {
      drawSprite( ctx, 'block_' + brick.color, brick.x, brick.y, brick.w, brick.h );
    }
  }
  renderExplosions();
  renderParticles();

  const p = state.paddle;
  drawSprite( ctx, 'paddle', p.x, p.y, p.w, p.h );

  if ( [ 'serve', 'playing', 'paused' ].includes( state.screen ) ) {
    const b = state.ball;
    drawSprite( ctx, 'ball', b.x, b.y, b.size, b.size );
  }

  if ( state.screen === 'start' ) {
    renderOverlay( 'ARKANOID', 'Pulsa Espacio o haz clic para empezar' );
    drawText( '← → / A D / ratón: mover   P / Esc: pausa   M: sonido', CANVAS_W / 2, 470, 11, 'center' );
  } else if ( state.screen === 'paused' ) {
    renderOverlay( 'PAUSA', 'P o Esc para continuar' );
  } else if ( state.screen === 'won' ) {
    renderOverlay( '¡VICTORIA!', 'Espacio o clic para jugar otra vez' );
  } else if ( state.screen === 'lost' ) {
    renderOverlay( 'GAME OVER', 'Espacio o clic para reintentar' );
  }

  renderHud();
}

// Bucle principal
let lastTime = null;

function loop( now ) {
  const dt = lastTime === null ? 0 : Math.min( ( now - lastTime ) / 1000, MAX_DT );
  lastTime = now;
  if ( state.screen !== 'paused' ) update( dt );
  render();
  requestAnimationFrame( loop );
}

state.highScore = loadHighScore();
state.bricks = createBricks();
loadSpritesheet( () => requestAnimationFrame( loop ) );
