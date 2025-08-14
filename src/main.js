import { Engine, SpriteSheet, Player, drawCheckerboard } from './engine.js';

const canvas = document.getElementById('game');
const engine = new Engine(canvas);

const fileIdle = document.getElementById('fileIdle');
const fileWalk = document.getElementById('fileWalk');
const useSampleIdleBtn = document.getElementById('use-sample-idle');
const useSampleWalkBtn = document.getElementById('use-sample-walk');
const frameWEl = document.getElementById('frameW');
const frameHEl = document.getElementById('frameH');
const fpsEl = document.getElementById('fps');
const scaleEl = document.getElementById('scale');
const speedEl = document.getElementById('speed');
const applyBtn = document.getElementById('apply');
const centerBtn = document.getElementById('center');
const pauseBtn = document.getElementById('pause');
const metaEl = document.getElementById('meta');

let player = null;
let spriteIdle = null;
let spriteWalk = null;
let imgIdle = null;
let imgWalk = null;

function setMeta() {
  const a = imgIdle ? `Idle: ${imgIdle.width}×${imgIdle.height}px` : 'Idle: —';
  const b = imgWalk ? `Walk: ${imgWalk.width}×${imgWalk.height}px` : 'Walk: —';
  const framesA = spriteIdle ? `${spriteIdle.total} (${spriteIdle.cols}×${spriteIdle.rows})` : '—';
  const framesB = spriteWalk ? `${spriteWalk.total} (${spriteWalk.cols}×${spriteWalk.rows})` : '—';
  metaEl.textContent = `${a} • Frames ${framesA}  |  ${b} • Frames ${framesB}`;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = reject;
    im.src = src;
  });
}

async function loadIdleFromFile(file) {
  const url = URL.createObjectURL(file);
  imgIdle = await loadImage(url);
  URL.revokeObjectURL(url);
  makeSprites();
}

async function loadWalkFromFile(file) {
  const url = URL.createObjectURL(file);
  imgWalk = await loadImage(url);
  URL.revokeObjectURL(url);
  makeSprites();
}

fileIdle.addEventListener('change', (e) => {
  const file = e.target.files && e.target.files[0];
  if (file) loadIdleFromFile(file);
});

fileWalk.addEventListener('change', (e) => {
  const file = e.target.files && e.target.files[0];
  if (file) loadWalkFromFile(file);
});

useSampleIdleBtn.addEventListener('click', async () => {
  imgIdle = await loadImage('../assets/sample_idle.png');
  makeSprites();
});

useSampleWalkBtn.addEventListener('click', async () => {
  imgWalk = await loadImage('../assets/sample_walk.png');
  makeSprites();
});

function makeSprites() {
  const fw = Math.max(1, parseInt(frameWEl.value, 10) || 64);
  const fh = Math.max(1, parseInt(frameHEl.value, 10) || 64);
  if (imgIdle) spriteIdle = new SpriteSheet(imgIdle, fw, fh);
  if (imgWalk) spriteWalk = new SpriteSheet(imgWalk, fw, fh);

  if (!player) {
    player = new Player({ idle: spriteIdle, walk: spriteWalk }, { scale: parseInt(scaleEl.value,10)||3, speed: parseInt(speedEl.value,10)||180 });
    player.setFps(parseInt(fpsEl.value, 10) || 8);
    player.centerIn(canvas);
  } else {
    player.setSprites({ idle: spriteIdle, walk: spriteWalk });
  }
  setMeta();
}

applyBtn.addEventListener('click', () => {
  makeSprites();
  if (!player) return;
  player.setFps(parseInt(fpsEl.value, 10) || 8);
  player.setScale(parseInt(scaleEl.value, 10) || 3);
  player.setSpeed(parseInt(speedEl.value, 10) || 180);
});

centerBtn.addEventListener('click', () => player && player.centerIn(canvas));
pauseBtn.addEventListener('click', () => {
  engine.togglePause();
  pauseBtn.textContent = engine.paused ? 'Unpause' : 'Pause';
});

window.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() === 'p') {
    engine.togglePause();
    pauseBtn.textContent = engine.paused ? 'Unpause' : 'Pause';
  }
});

// Drag & drop sets Walk by default (kept behavior minimal)
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', async (e) => {
  e.preventDefault();
  const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
  if (file) await loadWalkFromFile(file);
});

// Boot with samples
(async () => {
  imgIdle = await loadImage('../assets/sample_idle.png');
  imgWalk = await loadImage('../assets/sample_walk.png');
  makeSprites();
})();

engine.start((dt) => {
  if (player) player.update(dt, engine.keyboard, canvas);
}, (ctx) => {
  drawCheckerboard(ctx, 32);
  if (player) player.draw(ctx);
  // HUD
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(8, 8, 200, 58);
  ctx.fillStyle = '#e6eef7';
  ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';
  ctx.fillText('VanillaGameEngine', 14, 24);
  ctx.fillText('Idle/Walk upload • Arrow keys/WASD', 14, 42);
  ctx.fillText('P to pause', 14, 58);
});
