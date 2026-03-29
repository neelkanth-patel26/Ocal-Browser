const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const gameOverEl = document.getElementById('gameOver');
const finalScoreEl = document.getElementById('finalScore');
const restartBtn = document.querySelector('#gameOver button');

let score = 0;
let isGameOver = false;
let animationId;

const player = {
    x: 50,
    y: 150,
    w: 30,
    h: 30,
    dy: 0,
    jumpForce: 12,
    gravity: 0.6,
    grounded: false
};

const obstacles = [];
let frameCount = 0;

function drawPlayer() {
    ctx.fillStyle = '#a855f7';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#a855f7';
    ctx.fillRect(player.x, player.y, player.w, player.h);
    ctx.shadowBlur = 0;
}

function createObstacle() {
    if (frameCount % 80 === 0) {
        obstacles.push({
            x: canvas.width,
            y: 150,
            w: 20,
            h: 30,
            speed: 5 + (score / 100)
        });
    }
}

function drawObstacles() {
    ctx.fillStyle = '#ff4444';
    obstacles.forEach((obs, index) => {
        obs.x -= obs.speed;
        ctx.fillRect(obs.x, obs.y, obs.w, obs.h);

        // Collision Detection
        if (player.x < obs.x + obs.w &&
            player.x + player.w > obs.x &&
            player.y < obs.y + obs.h &&
            player.y + player.h > obs.y) {
            endGame();
        }

        if (obs.x + obs.w < 0) {
            obstacles.splice(index, 1);
            score += 10;
            scoreEl.innerText = score;
        }
    });
}

function update() {
    if (isGameOver) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Floor line
    ctx.strokeStyle = '#333';
    ctx.beginPath();
    ctx.moveTo(0, 180);
    ctx.lineTo(canvas.width, 180);
    ctx.stroke();

    // Player Physics
    player.dy += player.gravity;
    player.y += player.dy;

    if (player.y > 150) {
        player.y = 150;
        player.dy = 0;
        player.grounded = true;
    } else {
        player.grounded = false;
    }

    drawPlayer();
    createObstacle();
    drawObstacles();

    frameCount++;
    animationId = requestAnimationFrame(update);
}

function endGame() {
    isGameOver = true;
    cancelAnimationFrame(animationId);
    gameOverEl.style.display = 'flex';
    finalScoreEl.innerText = "Score: " + score;
}

function resetGame() {
    score = 0;
    scoreEl.innerText = "0";
    isGameOver = false;
    obstacles.length = 0;
    player.y = 150;
    player.dy = 0;
    gameOverEl.style.display = 'none';
    update();
}

if (restartBtn) restartBtn.onclick = resetGame;

window.addEventListener('keydown', (e) => {
    if ((e.code === 'Space' || e.code === 'ArrowUp') && player.grounded) {
        player.dy = -player.jumpForce;
    }
});

update();
