// MIT License
// VanillaGameEngine – canvas loop, input, sprites, with Idle/Walk switching
export class Engine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.last = performance.now();
    this.paused = false;
    this.#setupHiDPI();
    this.keyboard = new Keyboard();
    window.addEventListener('resize', () => this.#setupHiDPI());
  }

  #setupHiDPI() {
    const dpr = window.devicePixelRatio || 1;
    const { width, height } = this.canvas;
    this.canvas.width = Math.floor(width * dpr);
    this.canvas.height = Math.floor(height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  start(update, render) {
    const loop = (t) => {
      const dt = (t - this.last) / 1000;
      this.last = t;
      if (!this.paused) update(dt);
      render(this.ctx);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  pause() { this.paused = true; }
  unpause() { this.paused = false; }
  togglePause() { this.paused = !this.paused; }
}

export class Keyboard {
  constructor() {
    this._down = new Set();
    window.addEventListener('keydown', (e) => {
      this._down.add(e.key.toLowerCase());
      if (['arrowup','arrowdown','arrowleft','arrowright',' '].includes(e.key.toLowerCase())) e.preventDefault();
    }, { passive: false });
    window.addEventListener('keyup', (e) => this._down.delete(e.key.toLowerCase()));
  }
  isDown(k) { return this._down.has(k.toLowerCase()); }
  get axis() {
    let x = 0, y = 0;
    if (this.isDown('arrowleft') || this.isDown('a')) x -= 1;
    if (this.isDown('arrowright') || this.isDown('d')) x += 1;
    if (this.isDown('arrowup') || this.isDown('w')) y -= 1;
    if (this.isDown('arrowdown') || this.isDown('s')) y += 1;
    if (x !== 0 && y !== 0) { const inv = 1/Math.sqrt(2); x *= inv; y *= inv; }
    return { x, y };
  }
}

export class SpriteSheet {
  constructor(image, frameW, frameH) {
    this.image = image;
    this.frameW = frameW;
    this.frameH = frameH;
    this.cols = Math.max(1, Math.floor(image.width / frameW));
    this.rows = Math.max(1, Math.floor(image.height / frameH));
    this.total = this.cols * this.rows;
  }
  drawFrame(ctx, index, x, y, scale = 1) {
    if (this.total <= 0) return;
    index = Math.floor(index) % this.total;
    const sx = (index % this.cols) * this.frameW;
    const sy = Math.floor(index / this.cols) * this.frameH;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.image, sx, sy, this.frameW, this.frameH,
      Math.round(x), Math.round(y),
      this.frameW * scale, this.frameH * scale);
  }
}

export class Animator {
  constructor(fps = 8) {
    this.fps = fps;
    this.acc = 0;
    this.index = 0;
  }
  update(dt) {
    this.acc += dt;
    const frameDur = 1 / Math.max(1, this.fps);
    while (this.acc >= frameDur) {
      this.acc -= frameDur;
      this.index++;
    }
  }
  reset() {
    this.acc = 0;
    this.index = 0;
  }
}

export class Player {
  constructor(sprites, { x = 100, y = 100, speed = 180, scale = 3 } = {}) {
    // sprites: { idle?: SpriteSheet, walk?: SpriteSheet }
    this.idle = sprites?.idle ?? null;
    this.walk = sprites?.walk ?? null;
    this.animIdle = new Animator(8);
    this.animWalk = new Animator(8);
    this.x = x;
    this.y = y;
    this.speed = speed;
    this.scale = scale;
    this._isMoving = false;
  }
  setFps(fps) { this.animIdle.fps = this.animWalk.fps = fps; }
  setScale(scale) { this.scale = scale; }
  setSpeed(px) { this.speed = px; }
  setSprites({ idle = null, walk = null } = {}) {
    if (idle) this.idle = idle;
    if (walk) this.walk = walk;
  }
  centerIn(canvas) {
    const spr = this.currentSprite() || this.idle || this.walk;
    if (!spr) return;
    this.x = (canvas.width / (window.devicePixelRatio||1) - spr.frameW * this.scale) / 2;
    this.y = (canvas.height / (window.devicePixelRatio||1) - spr.frameH * this.scale) / 2;
  }
  currentSprite() {
    return (this._isMoving ? (this.walk || this.idle) : (this.idle || this.walk));
  }
  update(dt, keyboard, canvas) {
    const { x: ax, y: ay } = keyboard.axis;
    this._isMoving = Math.abs(ax) > 0.0001 || Math.abs(ay) > 0.0001;
    // animate appropriate state
    if (this._isMoving) {
      this.animWalk.update(dt);
    } else {
      this.animIdle.update(dt);
    }
    // move
    this.x += ax * this.speed * dt;
    this.y += ay * this.speed * dt;

    // Clamp within canvas
    const cw = canvas.width / (window.devicePixelRatio||1);
    const ch = canvas.height / (window.devicePixelRatio||1);
    const spr = this.currentSprite();
    if (!spr) return;
    const w = spr.frameW * this.scale;
    const h = spr.frameH * this.scale;
    this.x = Math.max(0, Math.min(cw - w, this.x));
    this.y = Math.max(0, Math.min(ch - h, this.y));
  }
  draw(ctx) {
    const spr = this.currentSprite();
    if (!spr) return;
    const idx = this._isMoving ? this.animWalk.index : this.animIdle.index;
    spr.drawFrame(ctx, idx, this.x, this.y, this.scale);
  }
}

export function drawCheckerboard(ctx, size = 32) {
  const { width, height } = ctx.canvas;
  ctx.fillStyle = '#0b0b0f';
  ctx.fillRect(0, 0, width, height);
  for (let y = 0; y < height; y += size) {
    for (let x = 0; x < width; x += size) {
      if (((x/size) + (y/size)) % 2 === 0) ctx.fillStyle = '#111118';
      else ctx.fillStyle = '#0e0e14';
      ctx.fillRect(x, y, size, size);
    }
  }
}
