/**
 * OCAL SNAKE - Neon Slither Engine
 * High-Fidelity Logic & Graphics
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const startOverlay = document.getElementById('startOverlay');
const gameOverOverlay = document.getElementById('gameOverOverlay');
const finalScoreEl = document.getElementById('finalScore');

// Config
const GRID_SIZE = 20;
const TILE_COUNT = 20;
const CANVAS_SIZE = 400;
let ACCENT = '#e8ff47';

canvas.width = CANVAS_SIZE;
canvas.height = CANVAS_SIZE;

let snake = [{ x: 10, y: 10 }];
let food = { x: 5, y: 5 };
let dx = 0;
let dy = 0;
let nextDx = 0;
let nextDy = 0;
let score = 0;
let bestScore = localStorage.getItem('ocalSnakeHighScore') || 0;
let isGameOver = false;
let gameSpeed = 100;
let lastTime = 0;

bestEl.innerText = bestScore;

// Helper to resolve the active accent color from CSS
function updateColors() {
    const computedAccent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    if (computedAccent) {
        ACCENT = computedAccent;
    }
}
updateColors();

// ── Particle System ───────────────────────────────────────────
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 3 + 1;
        this.vx = (Math.random() - 0.5) * 6;
        this.vy = (Math.random() - 0.5) * 6;
        this.color = color;
        this.alpha = 1;
        this.decay = Math.random() * 0.03 + 0.02;
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
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.restore();
    }
}
const particles = [];

// ── Graphics ──────────────────────────────────────────────────
function draw() {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw Grid (Subtle flat 0.5px borders)
    ctx.strokeStyle = '#252525';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= TILE_COUNT; i++) {
        ctx.beginPath(); ctx.moveTo(i * GRID_SIZE, 0); ctx.lineTo(i * GRID_SIZE, CANVAS_SIZE); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i * GRID_SIZE); ctx.lineTo(CANVAS_SIZE, i * GRID_SIZE); ctx.stroke();
    }

    // Draw Food (Flat solid white box)
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(food.x * GRID_SIZE + 3, food.y * GRID_SIZE + 3, GRID_SIZE - 6, GRID_SIZE - 6, 2);
    ctx.fill();
    ctx.restore();

    // Draw Snake (Flat head, outline wireframe tail segments)
    snake.forEach((segment, i) => {
        ctx.save();
        const r = 2; // Sharp corners matching D:\ocal style
        ctx.beginPath();
        ctx.roundRect(segment.x * GRID_SIZE + 2, segment.y * GRID_SIZE + 2, GRID_SIZE - 4, GRID_SIZE - 4, r);
        if (i === 0) {
            ctx.fillStyle = ACCENT;
            ctx.fill();
        } else {
            ctx.fillStyle = '#1e1e1e';
            ctx.strokeStyle = ACCENT;
            ctx.lineWidth = 1.5;
            ctx.globalAlpha = 1 - (i / snake.length) * 0.5; // Fade out towards tail
            ctx.fill();
            ctx.stroke();
        }
        ctx.restore();
    });

    // Draw Particles
    particles.forEach((p, i) => {
        p.update();
        p.draw();
        if (p.alpha <= 0) particles.splice(i, 1);
    });
}

// ── Game Logic ──────────────────────────────────────────────
function update(time) {
    if (isGameOver) return;

    if (time - lastTime > gameSpeed) {
        lastTime = time;
        moveSnake();
    }

    draw();
    requestAnimationFrame(update);
}

function moveSnake() {
    dx = nextDx;
    dy = nextDy;

    // Don't move if no direction set
    if (dx === 0 && dy === 0) return;

    const head = { x: snake[0].x + dx, y: snake[0].y + dy };

    // Wall Collision
    if (head.x < 0 || head.x >= TILE_COUNT || head.y < 0 || head.y >= TILE_COUNT) {
        return handleGameOver();
    }

    // Self Collision
    if (snake.some(s => s.x === head.x && s.y === head.y)) {
        return handleGameOver();
    }

    snake.unshift(head);

    // Food Collision
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreEl.innerText = score;
        spawnFood();
        spawnParticles(head.x * GRID_SIZE + 10, head.y * GRID_SIZE + 10, '#ffffff', 15);
        gameSpeed = Math.max(50, 100 - Math.floor(score / 50) * 5);
    } else {
        snake.pop();
    }
}

function spawnFood() {
    food = {
        x: Math.floor(Math.random() * TILE_COUNT),
        y: Math.floor(Math.random() * TILE_COUNT)
    };
    // Ensure food doesn't spawn on snake
    if (snake.some(s => s.x === food.x && s.y === food.y)) spawnFood();
}

function spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        particles.push(new Particle(x, y, color));
    }
}

function handleGameOver() {
    isGameOver = true;
    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('ocalSnakeHighScore', bestScore);
        bestEl.innerText = bestScore;
    }
    finalScoreEl.innerText = `Final Score: ${score}`;
    gameOverOverlay.classList.add('active');
    spawnParticles(snake[0].x * GRID_SIZE, snake[0].y * GRID_SIZE, ACCENT, 30);
}

function resetGame() {
    snake = [{ x: 10, y: 10 }];
    dx = 0; dy = 0; nextDx = 0; nextDy = 0;
    score = 0;
    gameSpeed = 100;
    scoreEl.innerText = '0';
    isGameOver = false;
    spawnFood();
    startOverlay.classList.remove('active');
    gameOverOverlay.classList.remove('active');
}

// ── Input ─────────────────────────────────────────────────────
window.addEventListener('keydown', e => {
    switch (e.key.toLowerCase()) {
        case 'arrowup':
        case 'w':
            if (dy !== 1) { nextDx = 0; nextDy = -1; }
            break;
        case 'arrowdown':
        case 's':
            if (dy !== -1) { nextDx = 0; nextDy = 1; }
            break;
        case 'arrowleft':
        case 'a':
            if (dx !== 1) { nextDx = -1; nextDy = 0; }
            break;
        case 'arrowright':
        case 'd':
            if (dx !== -1) { nextDx = 1; nextDy = 0; }
            break;
    }
});

document.getElementById('startBtn').addEventListener('click', () => {
    resetGame();
    requestAnimationFrame(update);
});

document.getElementById('restartBtn').addEventListener('click', () => {
    resetGame();
});
