/**
 * OCAL PULSE - Neon Synthwave Runner
 * High-Fidelity Logic & Graphics
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreVal = document.getElementById('score-val');
const bestVal = document.getElementById('best-val');
const modalOverlay = document.getElementById('gameOverModal');
const finalScoreEl = document.getElementById('final-score');
const restartBtn = document.getElementById('restartBtn');

// Config
let ACCENT = '#a855f7';
let ACCENT_GLOW = 'rgba(168, 85, 247, 0.4)';
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 400;
const GROUND_Y = 320;

canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

let score = 0;
let highScore = localStorage.getItem('ocalPulseHighScore') || 0;
let isGameOver = false;
let gameSpeed = 5;
let frameCount = 0;
let animationId;

bestVal.innerText = highScore;

function updateColors() {
    const computedAccent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    if (computedAccent) {
        ACCENT = computedAccent;
        
        const hexToRgba = (hex, alpha) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            if (!result) return `rgba(168, 85, 247, ${alpha})`;
            const r = parseInt(result[1], 16);
            const g = parseInt(result[2], 16);
            const b = parseInt(result[3], 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        };
        
        ACCENT_GLOW = hexToRgba(computedAccent, 0.4);
    }
}
updateColors();

// Listen for updates from settings
if (window.electronAPI) {
    window.electronAPI.getSettings().then(s => {
        if (s.accentColor) updateColors();
    });
    window.electronAPI.onSettingsChanged((s) => {
        if (s.accentColor) setTimeout(updateColors, 50);
    });
}

function getRgbValues(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return '168, 85, 247';
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    return `${r}, ${g}, ${b}`;
}

// ── Particle System ───────────────────────────────────────────
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 3 + 1;
        this.vx = (Math.random() - 0.5) * 4;
        this.vy = (Math.random() - 0.5) * 4;
        this.color = color;
        this.alpha = 1;
        this.decay = Math.random() * 0.02 + 0.02;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= this.decay;
    }
    draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 5;
        ctx.shadowColor = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.restore();
    }
}
const particles = [];

// ── Obstacle System ───────────────────────────────────────────
class Obstacle {
    constructor() {
        this.w = 25 + Math.random() * 30;
        this.h = 40 + Math.random() * 40;
        this.x = CANVAS_WIDTH;
        this.y = GROUND_Y - this.h;
        this.active = true;
    }
    update() {
        this.x -= gameSpeed;
        if (this.x + this.w < 0) this.active = false;
    }
    draw() {
        ctx.save();
        const grad = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.h);
        grad.addColorStop(0, '#ff2d55');
        grad.addColorStop(1, '#6b0f1a');
        ctx.fillStyle = grad;
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'rgba(255, 45, 85, 0.5)';
        ctx.fillRect(this.x, this.y, this.w, this.h);
        
        // Inner detail line
        ctx.strokeStyle = '#fff';
        ctx.globalAlpha = 0.3;
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x + 4, this.y + 4, this.w - 8, this.h - 8);
        ctx.restore();
    }
}
let obstacles = [];

// ── Player System ─────────────────────────────────────────────
const player = {
    x: 80,
    y: GROUND_Y - 40,
    w: 40,
    h: 40,
    dy: 0,
    jumpStrength: 13,
    gravity: 0.65,
    grounded: false,
    trail: [],

    update() {
        // Physics
        this.dy += this.gravity;
        this.y += this.dy;

        if (this.y > GROUND_Y - this.h) {
            this.y = GROUND_Y - this.h;
            this.dy = 0;
            this.grounded = true;
        } else {
            this.grounded = false;
        }

        // Add trail
        if (frameCount % 2 === 0) {
            this.trail.push({ x: this.x, y: this.y, alpha: 0.5 });
            if (this.trail.length > 8) this.trail.shift();
        }
        this.trail.forEach(t => t.alpha -= 0.05);
    },

    draw() {
        // Draw trail
        this.trail.forEach((t, i) => {
            ctx.fillStyle = ACCENT;
            ctx.globalAlpha = t.alpha;
            ctx.fillRect(t.x, t.y, this.w, this.h);
        });

        // Draw Player Body
        ctx.save();
        ctx.globalAlpha = 1;
        const grad = ctx.createLinearGradient(this.x, this.y, this.x + this.w, this.y + this.h);
        grad.addColorStop(0, '#fff');
        grad.addColorStop(1, ACCENT);
        ctx.fillStyle = grad;
        ctx.shadowBlur = 20;
        ctx.shadowColor = ACCENT_GLOW;
        // Rounded Player
        ctx.beginPath();
        const r = 8;
        ctx.moveTo(this.x + r, this.y);
        ctx.arcTo(this.x + this.w, this.y, this.x + this.w, this.y + this.h, r);
        ctx.arcTo(this.x + this.w, this.y + this.h, this.x, this.y + this.h, r);
        ctx.arcTo(this.x, this.y + this.h, this.x, this.y, r);
        ctx.arcTo(this.x, this.y, this.x + this.w, this.y, r);
        ctx.fill();
        ctx.restore();
    }
};

// ── Background Rendering ──────────────────────────────────────
function drawBackground() {
    // 1. Grid lines (3D perspective)
    ctx.strokeStyle = `rgba(${getRgbValues(ACCENT)}, 0.15)`;
    ctx.lineWidth = 1;

    // Horizon line
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(CANVAS_WIDTH, GROUND_Y);
    ctx.stroke();

    // Vanishing point lines
    for (let i = -10; i < 20; i++) {
        const spacing = 100;
        ctx.beginPath();
        ctx.moveTo(CANVAS_WIDTH / 2, GROUND_Y);
        ctx.lineTo(i * spacing, CANVAS_HEIGHT);
        ctx.stroke();
    }

    // Horizontal moving lines
    const gridSpacing = 50;
    const gridOffset = (frameCount * (gameSpeed * 0.5)) % gridSpacing;
    for (let i = 0; i < 10; i++) {
        const y = GROUND_Y + i * gridSpacing - gridOffset;
        if (y < GROUND_Y) continue;
        const opacity = (y - GROUND_Y) / (CANVAS_HEIGHT - GROUND_Y);
        ctx.strokeStyle = `rgba(${getRgbValues(ACCENT)}, ${opacity * 0.3})`;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_WIDTH, y);
        ctx.stroke();
    }
}

// ── Core Loop ────────────────────────────────────────────────
function update() {
    if (isGameOver) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    drawBackground();

    // Update Player
    player.update();
    player.draw();

    // Spawning
    if (frameCount % Math.max(40, Math.floor(100 - gameSpeed * 2)) === 0) {
        obstacles.push(new Obstacle());
    }

    // Update & Draw Obstacles
    obstacles.forEach((obs, index) => {
        obs.update();
        obs.draw();

        // Collision
        const px = player.x + 5; // Padding
        const py = player.y + 5;
        const pw = player.w - 10;
        const ph = player.h - 10;

        if (px < obs.x + obs.w && px + pw > obs.x && 
            py < obs.y + obs.h && py + ph > obs.y) {
            triggerGameOver();
        }

        if (!obs.active) {
            obstacles.splice(index, 1);
            score++;
            scoreVal.innerText = score;
            gameSpeed += 0.03;

            // Anniversary effects
            if (score % 50 === 0) {
                spawnParticles(player.x + 20, player.y + 20, '#fff', 20);
            }
        }
    });

    // Update Particles
    particles.forEach((p, i) => {
        p.update();
        p.draw();
        if (p.alpha <= 0) particles.splice(i, 1);
    });

    frameCount++;
    animationId = requestAnimationFrame(update);
}

function spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        particles.push(new Particle(x, y, color));
    }
}

function triggerGameOver() {
    isGameOver = true;
    cancelAnimationFrame(animationId);
    
    // Impact Effect
    spawnParticles(player.x + 20, player.y + 20, '#ff2d55', 30);
    
    // Handle Scores
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('ocalPulseHighScore', highScore);
        bestVal.innerText = highScore;
    }

    finalScoreEl.innerText = `Final Score: ${score}`;
    modalOverlay.style.display = 'flex';
    setTimeout(() => modalOverlay.classList.add('active'), 10);
}

function restartGame() {
    score = 0;
    gameSpeed = 5;
    frameCount = 0;
    obstacles = [];
    isGameOver = false;
    player.y = GROUND_Y - 40;
    player.dy = 0;
    scoreVal.innerText = '0';
    modalOverlay.classList.remove('active');
    setTimeout(() => {
        modalOverlay.style.display = 'none';
        update();
    }, 400);
}

// Input
window.addEventListener('keydown', (e) => {
    if ((e.code === 'Space' || e.code === 'ArrowUp') && player.grounded) {
        player.dy = -player.jumpStrength;
        spawnParticles(player.x, player.y + 35, ACCENT, 5);
    }
});

restartBtn.addEventListener('click', restartGame);

// Initial Particles for Flare
spawnParticles(400, 200, ACCENT, 50);

update();
