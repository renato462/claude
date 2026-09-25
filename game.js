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

const BG_COLOR = '#0b0b1a';

// Estado de la partida
const state = {
  screen: 'start',           // 'start' | 'serve' | 'playing' | 'paused' | 'won' | 'lost'
  score: 0,
  lives: START_LIVES,
  highScore: 0,
  muted: false,
  paddle: { x: ( CANVAS_W - PADDLE_W ) / 2, y: PADDLE_Y, w: PADDLE_W, h: PADDLE_H },
  ball: { x: 0, y: 0, vx: 0, vy: 0, size: BALL_SIZE },
  bricks: [],
  explosions: [],
  input: { left: false, right: false, mouseX: null },
};

const canvas = document.getElementById( 'game' );
const ctx = canvas.getContext( '2d' );
ctx.imageSmoothingEnabled = false;

function render() {
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect( 0, 0, CANVAS_W, CANVAS_H );
}

loadSpritesheet( render );
