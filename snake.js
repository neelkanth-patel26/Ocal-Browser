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
const GRID_SIZE = 40;
const TILE_COUNT = 20;
const CANVAS_SIZE = 800;
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
let isStarted = false;
let animationId = null;
let gameSpeed = 100;
let lastTime = 0;

bestEl.innerText = bestScore;

// Helper to resolve the active theme colors from CSS
function getColors() {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light' || document.body.getAttribute('data-theme') === 'light';
    const computedAccent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#10B981';
    return {
        isLight,
        accent: computedAccent,
        bg: isLight ? '#FFFFFF' : '#14161F',
        grid: isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)',
        food: isLight ? '#E11D48' : '#FF4D6D',
        tailFill: isLight ? 'rgba(0, 0, 0, 0.04)' : '#1E222D'
    };
}

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
    const c = getColors();
    ACCENT = c.accent;

    ctx.fillStyle = c.bg;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw Grid
    ctx.strokeStyle = c.grid;
    ctx.lineWidth = 1;
    for (let i = 0; i <= TILE_COUNT; i++) {
        ctx.beginPath(); ctx.moveTo(i * GRID_SIZE, 0); ctx.lineTo(i * GRID_SIZE, CANVAS_SIZE); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i * GRID_SIZE); ctx.lineTo(CANVAS_SIZE, i * GRID_SIZE); ctx.stroke();
    }

    // Draw Food (Pulsing neon orb)
    ctx.save();
    ctx.fillStyle = c.food;
    ctx.shadowColor = c.food;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(food.x * GRID_SIZE + GRID_SIZE / 2, food.y * GRID_SIZE + GRID_SIZE / 2, GRID_SIZE / 2 - 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Draw Snake
    snake.forEach((segment, i) => {
        ctx.save();
        const r = 4;
        ctx.beginPath();
        ctx.roundRect(segment.x * GRID_SIZE + 2, segment.y * GRID_SIZE + 2, GRID_SIZE - 4, GRID_SIZE - 4, r);
        if (i === 0) {
            ctx.fillStyle = c.accent;
            ctx.shadowColor = c.accent;
            ctx.shadowBlur = 10;
            ctx.fill();
        } else {
            ctx.fillStyle = c.tailFill;
            ctx.strokeStyle = c.accent;
            ctx.lineWidth = 1.5;
            ctx.globalAlpha = Math.max(0.3, 1 - (i / snake.length) * 0.6);
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
    if (!isGameOver) animationId = requestAnimationFrame(update);
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
    if (snake.slice(0, head.x === food.x && head.y === food.y ? snake.length : -1).some(s => s.x === head.x && s.y === head.y)) {
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
    const free = [];
    for (let y = 0; y < TILE_COUNT; y++) for (let x = 0; x < TILE_COUNT; x++) {
        if (!snake.some(segment => segment.x === x && segment.y === y)) free.push({x, y});
    }
    if (!free.length) { handleGameOver(); finalScoreEl.textContent = `Board complete! Score: ${score}`; return; }
    food = free[Math.floor(Math.random() * free.length)];
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
    gameOverOverlay.style.display = 'flex';
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
    startOverlay.style.display = 'none';
    gameOverOverlay.style.display = 'none';
    lastTime = performance.now();
    particles.length = 0;
}

// ── Input ─────────────────────────────────────────────────────
window.addEventListener('keydown', e => {
    if (!isStarted || isGameOver) return;
    if (['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d'].includes(e.key.toLowerCase())) e.preventDefault();
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

function startGame() {
    cancelAnimationFrame(animationId);
    resetGame();
    isStarted = true;
    animationId = requestAnimationFrame(update);
}
draw();
