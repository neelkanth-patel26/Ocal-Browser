/**
 * OCAL GRID - Synthwave Tetris Engine
 * High-Fidelity Logic & Graphics
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('nextCanvas');
const nextCtx = nextCanvas.getContext('2d');

const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const startOverlay = document.getElementById('startOverlay');
const gameOverOverlay = document.getElementById('gameOverOverlay');
const finalScoreEl = document.getElementById('finalScore');

// Config
const ROWS = 20;
const COLS = 10;
const BLOCK_SIZE = 30;
const ACCENT = '#e8ff47';

canvas.width = COLS * BLOCK_SIZE;
canvas.height = ROWS * BLOCK_SIZE;

// Colors for pieces (Minimalist ocal theme)
const COLORS = [
    null,
    '#e8ff47', // I
    '#e8ff47', // T
    '#e8ff47', // S
    '#e8ff47', // Z
    '#e8ff47', // O
    '#e8ff47', // J
    '#e8ff47'  // L
];

// Pieces
const PIECES = [
    null,
    [[0,0,0,0], [1,1,1,1], [0,0,0,0], [0,0,0,0]], // I
    [[0,2,0], [2,2,2], [0,0,0]], // T
    [[0,3,3], [3,3,0], [0,0,0]], // S
    [[4,4,0], [0,4,4], [0,0,0]], // Z
    [[5,5], [5,5]], // O
    [[6,0,0], [6,6,6], [0,0,0]], // J
    [[0,0,7], [7,7,7], [0,0,0]]  // L
];

let grid = createGrid();
let score = 0;
let lines = 0;
let level = 1;
let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let isGameOver = false;

function createGrid() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

const player = {
    pos: { x: 0, y: 0 },
    matrix: null,
    next: null,
    color: 0
};

function playerReset() {
    if (!player.next) player.next = PIECES[Math.floor(Math.random() * (PIECES.length - 1)) + 1];
    player.matrix = player.next;
    player.next = PIECES[Math.floor(Math.random() * (PIECES.length - 1)) + 1];
    player.pos.y = 0;
    player.pos.x = Math.floor(COLS / 2) - Math.floor(player.matrix[0].length / 2);
    
    if (collide(grid, player)) {
        gameOver();
    }
    drawNext();
}

function collide(grid, player) {
    const [m, o] = [player.matrix, player.pos];
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0 && (grid[y + o.y] && grid[y + o.y][x + o.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

function merge(grid, player) {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                grid[y + player.pos.y][x + player.pos.x] = value;
            }
        });
    });
}

function playerDrop() {
    player.pos.y++;
    if (collide(grid, player)) {
        player.pos.y--;
        merge(grid, player);
        playerReset();
        gridSweep();
        updateScore();
    }
    dropCounter = 0;
}

function playerMove(dir) {
    player.pos.x += dir;
    if (collide(grid, player)) {
        player.pos.x -= dir;
    }
}

function playerRotate(dir) {
    const pos = player.pos.x;
    let offset = 1;
    rotate(player.matrix, dir);
    while (collide(grid, player)) {
        player.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > player.matrix[0].length) {
            rotate(player.matrix, -dir);
            player.pos.x = pos;
            return;
        }
    }
}

function rotate(matrix, dir) {
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < y; ++x) {
            [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
        }
    }
    if (dir > 0) matrix.forEach(row => row.reverse());
    else matrix.reverse();
}

function gridSweep() {
    let rowCount = 1;
    outer: for (let y = grid.length - 1; y > 0; --y) {
        for (let x = 0; x < grid[y].length; ++x) {
            if (grid[y][x] === 0) continue outer;
        }
        const row = grid.splice(y, 1)[0].fill(0);
        grid.unshift(row);
        ++y;
        score += rowCount * 100;
        lines++;
        rowCount *= 2;
    }
    if (lines >= level * 10) {
        level++;
        dropInterval = Math.max(100, 1000 - (level - 1) * 100);
    }
}

function updateScore() {
    scoreEl.innerText = score;
    linesEl.innerText = lines;
    levelEl.innerText = level;
}

// ── Graphics ──────────────────────────────────────────────────
function draw() {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid lines (subtle flat 0.5px borders)
    ctx.strokeStyle = '#252525';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= COLS; i++) {
        ctx.beginPath(); ctx.moveTo(i * BLOCK_SIZE, 0); ctx.lineTo(i * BLOCK_SIZE, canvas.height); ctx.stroke();
    }
    for (let i = 0; i <= ROWS; i++) {
        ctx.beginPath(); ctx.moveTo(0, i * BLOCK_SIZE); ctx.lineTo(canvas.width, i * BLOCK_SIZE); ctx.stroke();
    }

    drawMatrix(grid, { x: 0, y: 0 });
    
    // Ghost Piece
    const ghost = { pos: { x: player.pos.x, y: player.pos.y }, matrix: player.matrix };
    while (!collide(grid, ghost)) { ghost.pos.y++; }
    ghost.pos.y--;
    drawMatrix(ghost.matrix, ghost.pos, true);

    drawMatrix(player.matrix, player.pos);
}

function drawMatrix(matrix, offset, isGhost = false) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                const px = (x + offset.x) * BLOCK_SIZE;
                const py = (y + offset.y) * BLOCK_SIZE;

                ctx.save();
                if (isGhost) {
                    ctx.globalAlpha = 0.15;
                    ctx.strokeStyle = ACCENT;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.roundRect(px + 2, py + 2, BLOCK_SIZE - 4, BLOCK_SIZE - 4, 2);
                    ctx.stroke();
                } else {
                    ctx.fillStyle = '#1e1e1e';
                    ctx.strokeStyle = ACCENT;
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.roundRect(px + 2, py + 2, BLOCK_SIZE - 4, BLOCK_SIZE - 4, 2);
                    ctx.fill();
                    ctx.stroke();
                }
                ctx.restore();
            }
        });
    });
}

function drawNext() {
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    const m = player.next;
    const offset = { 
        x: (nextCanvas.width / BLOCK_SIZE - m[0].length) / 2, 
        y: (nextCanvas.height / BLOCK_SIZE - m.length) / 2
    };
    
    m.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                nextCtx.save();
                nextCtx.fillStyle = '#1e1e1e';
                nextCtx.strokeStyle = ACCENT;
                nextCtx.lineWidth = 1.5;
                nextCtx.beginPath();
                nextCtx.roundRect((x + offset.x) * BLOCK_SIZE + 2, (y + offset.y) * BLOCK_SIZE + 2, BLOCK_SIZE - 4, BLOCK_SIZE - 4, 2);
                nextCtx.fill();
                nextCtx.stroke();
                nextCtx.restore();
            }
        });
    });
}

// ── Loop ──────────────────────────────────────────────────────
function update(time = 0) {
    if (isGameOver) return;

    const deltaTime = time - lastTime;
    lastTime = time;

    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
        playerDrop();
    }

    draw();
    animationId = requestAnimationFrame(update);
}

function gameOver() {
    isGameOver = true;
    cancelAnimationFrame(animationId);
    
    const highScore = localStorage.getItem('ocalGridHighScore') || 0;
    if (score > highScore) {
        localStorage.setItem('ocalGridHighScore', score);
    }
    
    finalScoreEl.innerText = score > highScore ? `${score} (New Record!)` : score;
    gameOverOverlay.classList.add('active');
}

function startGame() {
    grid = createGrid();
    isGameOver = false;
    score = 0;
    lines = 0;
    level = 1;
    dropInterval = 1000;
    updateScore();
    playerReset();
    startOverlay.classList.remove('active');
    gameOverOverlay.classList.remove('active');
    update();
}

// ── Input ─────────────────────────────────────────────────────
window.addEventListener('keydown', event => {
    if (isGameOver) return;

    if (event.key === 'ArrowLeft') playerMove(-1);
    else if (event.key === 'ArrowRight') playerMove(1);
    else if (event.key === 'ArrowDown') playerDrop();
    else if (event.key === 'ArrowUp') playerRotate(1);
    else if (event.key === 'q') playerRotate(-1);
    else if (event.keyCode === 32) { // Space - Hard Drop
        while (!collide(grid, player)) {
            player.pos.y++;
        }
        player.pos.y--;
        merge(grid, player);
        playerReset();
        gridSweep();
        updateScore();
    }
});

document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('restartBtn').addEventListener('click', startGame);
