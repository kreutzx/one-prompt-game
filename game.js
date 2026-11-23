// Neon Comet Dodge — a 60-second browser game.
// Pilot a neon comet through an asteroid field: dodge the rocks,
// grab the golden stars, chain near misses, survive the minute.
//
// Controls: mouse or arrow keys / WASD. SPACE starts, R restarts.
// Demo mode: open index.html?auto=1 and the comet pilots itself.

'use strict';

const W = 1920;
const H = 1080;
const ROUND_SECONDS = 60;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const elScore = document.getElementById('score');
const elStars = document.getElementById('stars');
const elTime = document.getElementById('time');
const elTimeFill = document.getElementById('timefill');
const elBanner = document.getElementById('banner');

const params = new URLSearchParams(location.search);
const AUTO = params.get('auto') === '1';

// Small deterministic RNG so demo runs look the same every time.
let seed = 20261122;
function rnd() {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
}
function rr(a, b) { return a + rnd() * (b - a); }

// Background starfield (static dots, drawn every frame).
const bgStars = [];
for (let i = 0; i < 220; i++) {
  bgStars.push({ x: rnd() * W, y: rnd() * H, r: rr(0.6, 2.2), tw: rr(0, Math.PI * 2) });
}

const comet = {
  x: W * 0.3, y: H * 0.5, vx: 0, vy: 0, r: 17,
  trail: [], alive: true
};

let asteroids = [];
let stars = [];
let sparks = [];
let floaters = []; // floating "+50" score popups

let state = 'title'; // 'title' | 'playing' | 'over'
let score = 0;
let starsGot = 0;
let timeLeft = ROUND_SECONDS;
let elapsed = 0;
let spawnRock = 0;
let spawnStar = 0;
let shake = 0;

const keys = {};
let mouse = null;

addEventListener('keydown', (e) => {
  keys[e.key.toLowerCase()] = true;
  if (e.code === 'Space') { e.preventDefault(); startRound(); }
  if ((e.key === 'r' || e.key === 'R') && state === 'over') startRound();
});
addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  mouse = {
    x: (e.clientX - rect.left) * (W / rect.width),
    y: (e.clientY - rect.top) * (H / rect.height)
  };
});
canvas.addEventListener('mousedown', () => { if (state !== 'playing') startRound(); });

function startRound() {
  asteroids = [];
  stars = [];
  sparks = [];
  floaters = [];
  score = 0;
  starsGot = 0;
  timeLeft = ROUND_SECONDS;
  elapsed = 0;
  spawnRock = 0;
  spawnStar = 0.6;
  shake = 0;
  comet.x = W * 0.3;
  comet.y = H * 0.5;
  comet.vx = 0;
  comet.vy = 0;
  comet.trail = [];
  comet.alive = true;
  state = 'playing';
  elBanner.classList.add('hidden');
}

function makeAsteroid() {
  const fromTop = rnd() < 0.35;
  const speed = rr(140, 300) + elapsed * 3.2; // field gets faster over time
  const a = {
    x: fromTop ? rr(0, W) : W + 90,
    y: fromTop ? -90 : rr(0, H),
    vx: fromTop ? rr(-40, 40) : -speed,
    vy: fromTop ? speed * rr(0.55, 0.9) : rr(-36, 36),
    r: rr(26, 74),
    rot: rr(0, Math.PI * 2),
    vr: rr(-1.1, 1.1),
    verts: []
  };
  const n = 9 + Math.floor(rnd() * 4);
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2;
    const rad = a.r * rr(0.72, 1.08);
    a.verts.push({ x: Math.cos(ang) * rad, y: Math.sin(ang) * rad });
  }
  return a;
}

function makeStar() {
  return {
    x: rr(W * 0.35, W - 60),
    y: rr(70, H - 70),
    r: 20,
    pulse: rr(0, Math.PI * 2),
    vx: -rr(24, 60)
  };
}

function burst(x, y, colour, count, speed) {
  for (let i = 0; i < count; i++) {
    const ang = rnd() * Math.PI * 2;
    const sp = rr(speed * 0.25, speed);
    sparks.push({
      x, y,
      vx: Math.cos(ang) * sp,
      vy: Math.sin(ang) * sp,
      life: rr(0.35, 0.8),
      age: 0,
      colour,
      r: rr(2, 5)
    });
  }
}

function floater(x, y, text, colour) {
  floaters.push({ x, y, text, colour, age: 0, life: 0.9 });
}

// --- Autopilot (demo mode): steer for the nearest star, dodge rocks. ---
function autopilot(dt) {
  let tx = W * 0.32, ty = H * 0.5;
  let bestStar = null, bestD = Infinity;
  for (const s of stars) {
    const d = (s.x - comet.x) ** 2 + (s.y - comet.y) ** 2;
    if (d < bestD) { bestD = d; bestStar = s; }
  }
  if (bestStar) { tx = bestStar.x; ty = bestStar.y; }

  // Repulsion from any asteroid that is close and closing in.
  let ax = 0, ay = 0;
  for (const a of asteroids) {
    const dx = comet.x - a.x, dy = comet.y - a.y;
    const d = Math.hypot(dx, dy);
    const danger = a.r + 190;
    if (d < danger && d > 0.001) {
      const w = (danger - d) / danger;
      ax += (dx / d) * w * 2600;
      ay += (dy / d) * w * 2600;
    }
  }
  const steerX = (tx - comet.x) * 3.1 + ax;
  const steerY = (ty - comet.y) * 3.1 + ay;
  comet.vx += steerX * dt;
  comet.vy += steerY * dt;
}

function update(dt) {
  if (state !== 'playing') return;
  elapsed += dt;
  timeLeft = Math.max(0, ROUND_SECONDS - elapsed);

  // Spawn schedule: rocks faster and faster, a star every ~1.6s.
  spawnRock -= dt;
  const rockEvery = Math.max(0.24, 0.62 - elapsed * 0.006);
  if (spawnRock <= 0) { asteroids.push(makeAsteroid()); spawnRock = rockEvery; }
  spawnStar -= dt;
  if (spawnStar <= 0 && stars.length < 3) { stars.push(makeStar()); spawnStar = rr(1.2, 2.0); }

  // Comet movement.
  if (AUTO) {
    autopilot(dt);
  } else if (mouse) {
    comet.vx += (mouse.x - comet.x) * 14 * dt;
    comet.vy += (mouse.y - comet.y) * 14 * dt;
  } else {
    const ACC = 2400;
    if (keys['arrowleft'] || keys['a']) comet.vx -= ACC * dt;
    if (keys['arrowright'] || keys['d']) comet.vx += ACC * dt;
    if (keys['arrowup'] || keys['w']) comet.vy -= ACC * dt;
    if (keys['arrowdown'] || keys['s']) comet.vy += ACC * dt;
  }
  comet.vx *= Math.pow(0.12, dt); // damping
  comet.vy *= Math.pow(0.12, dt);
  const spd = Math.hypot(comet.vx, comet.vy);
  const MAXV = 980;
  if (spd > MAXV) { comet.vx = comet.vx / spd * MAXV; comet.vy = comet.vy / spd * MAXV; }
  comet.x = Math.min(W - 30, Math.max(30, comet.x + comet.vx * dt));
  comet.y = Math.min(H - 30, Math.max(30, comet.y + comet.vy * dt));

  comet.trail.unshift({ x: comet.x, y: comet.y });
  if (comet.trail.length > 26) comet.trail.pop();

  // Asteroids.
  for (const a of asteroids) {
    a.x += a.vx * dt; a.y += a.vy * dt; a.rot += a.vr * dt;
    const dx = comet.x - a.x, dy = comet.y - a.y;
    const d = Math.hypot(dx, dy);
    if (comet.alive && d < a.r * 0.82 + comet.r) {
      comet.alive = false;
      shake = 16;
      burst(comet.x, comet.y, '#37f2ff', 46, 620);
      burst(comet.x, comet.y, '#ffd94d', 24, 420);
      endRound(false);
    } else if (comet.alive && d < a.r + 64 && !a.nearMissed) {
      a.nearMissed = true;
      score += 10;
      floater(comet.x, comet.y - 44, '+10 near miss', '#9be7ff');
    }
  }
  asteroids = asteroids.filter(a => a.x > -140 && a.y < H + 140 && a.y > -160);

  // Stars.
  for (const s of stars) {
    s.x += s.vx * dt;
    s.pulse += dt * 5;
    const d = Math.hypot(comet.x - s.x, comet.y - s.y);
    if (comet.alive && d < comet.r + s.r + 8) {
      s.taken = true;
      starsGot += 1;
      score += 50;
      burst(s.x, s.y, '#ffd94d', 18, 320);
      floater(s.x, s.y - 30, '+50', '#ffd94d');
    }
  }
  stars = stars.filter(s => !s.taken && s.x > -50);

  // Particles and popups.
  for (const p of sparks) { p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; }
  sparks = sparks.filter(p => p.age < p.life);
  for (const f of floaters) { f.age += dt; f.y -= 44 * dt; }
  floaters = floaters.filter(f => f.age < f.life);

  if (shake > 0) shake = Math.max(0, shake - 60 * dt);
  if (timeLeft <= 0 && comet.alive) endRound(true);

  elScore.textContent = 'SCORE ' + score;
  elStars.innerHTML = '&#9733; ' + starsGot;
  elTime.textContent = Math.ceil(timeLeft);
  elTimeFill.style.width = (timeLeft / ROUND_SECONDS * 100) + '%';
}

function endRound(survived) {
  state = 'over';
  elBanner.classList.remove('hidden');
  elBanner.innerHTML =
    '<h1>' + (survived ? 'YOU SURVIVED!' : 'COMET DOWN') + '</h1>' +
    '<p>Score ' + score + ' &mdash; ' + starsGot + ' stars grabbed</p>' +
    '<p class="small">Press R to fly again</p>';
}

// --- Rendering ---
function drawStarShape(x, y, r, rot) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const ang = rot + (i / 10) * Math.PI * 2 - Math.PI / 2;
    const px = x + Math.cos(ang) * rad;
    const py = y + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function draw(t) {
  ctx.save();
  if (shake > 0) ctx.translate((rnd() - 0.5) * shake, (rnd() - 0.5) * shake);

  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#070a24');
  g.addColorStop(0.6, '#05060f');
  g.addColorStop(1, '#0d0620');
  ctx.fillStyle = g;
  ctx.fillRect(-24, -24, W + 48, H + 48);

  for (const s of bgStars) {
    const a = 0.35 + 0.3 * Math.sin(t * 0.0016 + s.tw);
    ctx.globalAlpha = a;
    ctx.fillStyle = '#bcd6ff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Stars to grab.
  for (const s of stars) {
    const pr = s.r * (1 + 0.12 * Math.sin(s.pulse));
    ctx.save();
    ctx.shadowColor = '#ffd94d';
    ctx.shadowBlur = 34;
    ctx.fillStyle = '#ffd94d';
    drawStarShape(s.x, s.y, pr, s.pulse * 0.14);
    ctx.fill();
    ctx.restore();
  }

  // Asteroids.
  for (const a of asteroids) {
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(a.rot);
    ctx.beginPath();
    a.verts.forEach((v, i) => { if (i === 0) ctx.moveTo(v.x, v.y); else ctx.lineTo(v.x, v.y); });
    ctx.closePath();
    const rg = ctx.createRadialGradient(-a.r * 0.3, -a.r * 0.3, a.r * 0.2, 0, 0, a.r * 1.15);
    rg.addColorStop(0, '#8d7d6b');
    rg.addColorStop(0.7, '#5d5044');
    rg.addColorStop(1, '#38302a');
    ctx.fillStyle = rg;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.45)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }

  // Comet trail, then the comet itself.
  if (comet.alive) {
    for (let i = comet.trail.length - 1; i >= 2; i--) {
      const p = comet.trail[i];
      const f = 1 - i / comet.trail.length;
      ctx.globalAlpha = f * 0.5;
      ctx.fillStyle = i % 3 === 0 ? '#b06bff' : '#37f2ff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, comet.r * f * 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.shadowColor = '#37f2ff';
    ctx.shadowBlur = 42;
    const cg = ctx.createRadialGradient(comet.x - 5, comet.y - 5, 2, comet.x, comet.y, comet.r * 1.5);
    cg.addColorStop(0, '#ffffff');
    cg.addColorStop(0.45, '#9be7ff');
    cg.addColorStop(1, '#2f7bff');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.arc(comet.x, comet.y, comet.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  for (const p of sparks) {
    ctx.globalAlpha = 1 - p.age / p.life;
    ctx.fillStyle = p.colour;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.textAlign = 'center';
  for (const f of floaters) {
    ctx.globalAlpha = 1 - f.age / f.life;
    ctx.font = '700 34px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = f.colour;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  draw(now);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Demo mode starts itself so a capture (or a curious visitor) sees the game.
if (AUTO) setTimeout(startRound, 600);

// Expose a tiny hook for captures/tests.
window.__comet = { startRound, get state() { return state; }, get score() { return score; } };
