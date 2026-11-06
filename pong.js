const canvas = document.getElementById('pongCanvas');
const context = canvas.getContext('2d');
const startButton = document.getElementById('startButton');
const isEnglish = localStorage.getItem('userLang') === 'en';
const text = isEnglish
    ? { kicker: 'A short break', offline: 'Works offline', start: 'Start game', restart: 'Play again', help: 'Move with mouse, ↑ ↓, or W and S', score: 'First to 5 points wins', you: 'YOU WIN', cpu: 'CPU WINS' }
    : { kicker: 'استراحة قصيرة', offline: 'تعمل دون إنترنت', start: 'ابدأ اللعب', restart: 'العب مرة أخرى', help: 'حرّك بالماوس أو بالأسهم ↑ ↓ أو W و S', score: 'أول لاعب يصل إلى ٥ نقاط يفوز', you: 'فزت!', cpu: 'فاز الكمبيوتر' };

document.getElementById('gameKicker').textContent = text.kicker;
document.getElementById('offlineBadge').textContent = text.offline;
document.getElementById('gameHelp').textContent = text.help;
document.getElementById('scoreLabel').textContent = text.score;
startButton.textContent = text.start;

const game = {
    width: canvas.width,
    height: canvas.height,
    paddleHeight: 108,
    paddleWidth: 14,
    playerY: canvas.height / 2,
    cpuY: canvas.height / 2,
    ballX: canvas.width / 2,
    ballY: canvas.height / 2,
    ballVX: 6,
    ballVY: 3,
    playerScore: 0,
    cpuScore: 0,
    running: false,
    keys: new Set(),
    lastFrame: 0
};

function resetBall(direction) {
    game.ballX = game.width / 2;
    game.ballY = game.height / 2;
    const speed = 6;
    const angle = (Math.random() * .8 - .4);
    game.ballVX = Math.cos(angle) * speed * direction;
    game.ballVY = Math.sin(angle) * speed;
}

function draw() {
    const { width, height } = game;
    context.clearRect(0, 0, width, height);
    context.fillStyle = '#091923';
    context.fillRect(0, 0, width, height);
    context.strokeStyle = 'rgba(169,207,199,.22)';
    context.lineWidth = 3;
    context.setLineDash([12, 16]);
    context.beginPath();
    context.moveTo(width / 2, 18);
    context.lineTo(width / 2, height - 18);
    context.stroke();
    context.setLineDash([]);

    context.fillStyle = '#4de0aa';
    context.fillRect(26, game.playerY - game.paddleHeight / 2, game.paddleWidth, game.paddleHeight);
    context.fillStyle = '#ffc869';
    context.fillRect(width - 40, game.cpuY - game.paddleHeight / 2, game.paddleWidth, game.paddleHeight);
    context.fillStyle = '#f3f8f5';
    context.beginPath();
    context.arc(game.ballX, game.ballY, 9, 0, Math.PI * 2);
    context.fill();

    context.font = '700 56px Orbitron, sans-serif';
    context.textAlign = 'center';
    context.fillStyle = 'rgba(232,241,238,.8)';
    context.fillText(String(game.playerScore), width * .4, 78);
    context.fillText(String(game.cpuScore), width * .6, 78);
}

function endGame(winner) {
    game.running = false;
    startButton.textContent = winner === 'player' ? text.you : text.cpu;
    startButton.hidden = false;
    window.setTimeout(() => {
        if (!game.running) startButton.textContent = text.restart;
    }, 1100);
}

function update(delta) {
    const frameScale = Math.min(2, delta / 16.67);
    const playerSpeed = 8 * frameScale;
    if (game.keys.has('ArrowUp') || game.keys.has('w')) game.playerY -= playerSpeed;
    if (game.keys.has('ArrowDown') || game.keys.has('s')) game.playerY += playerSpeed;
    game.playerY = Math.max(game.paddleHeight / 2 + 8, Math.min(game.height - game.paddleHeight / 2 - 8, game.playerY));

    const cpuAim = game.ballY + game.ballVY * 8;
    const cpuDifference = cpuAim - game.cpuY;
    game.cpuY += Math.max(-5.2 * frameScale, Math.min(5.2 * frameScale, cpuDifference));
    game.cpuY = Math.max(game.paddleHeight / 2 + 8, Math.min(game.height - game.paddleHeight / 2 - 8, game.cpuY));

    game.ballX += game.ballVX * frameScale;
    game.ballY += game.ballVY * frameScale;
    if (game.ballY < 10 || game.ballY > game.height - 10) game.ballVY *= -1;

    const playerFace = 26 + game.paddleWidth;
    const cpuFace = game.width - 40;
    if (game.ballVX < 0 && game.ballX - 9 <= playerFace && Math.abs(game.ballY - game.playerY) <= game.paddleHeight / 2) {
        game.ballX = playerFace + 10;
        game.ballVX = Math.min(10, Math.abs(game.ballVX) * 1.04);
        game.ballVY += (game.ballY - game.playerY) * .035;
    }
    if (game.ballVX > 0 && game.ballX + 9 >= cpuFace && Math.abs(game.ballY - game.cpuY) <= game.paddleHeight / 2) {
        game.ballX = cpuFace - 10;
        game.ballVX = -Math.min(10, Math.abs(game.ballVX) * 1.04);
        game.ballVY += (game.ballY - game.cpuY) * .035;
    }

    if (game.ballX < -12) {
        game.cpuScore += 1;
        if (game.cpuScore >= 5) endGame('cpu'); else resetBall(1);
    } else if (game.ballX > game.width + 12) {
        game.playerScore += 1;
        if (game.playerScore >= 5) endGame('player'); else resetBall(-1);
    }
}

function frame(now) {
    const delta = game.lastFrame ? now - game.lastFrame : 16.67;
    game.lastFrame = now;
    if (game.running) update(delta);
    draw();
    requestAnimationFrame(frame);
}

function startGame() {
    game.playerScore = 0;
    game.cpuScore = 0;
    game.playerY = game.height / 2;
    game.cpuY = game.height / 2;
    game.running = true;
    startButton.hidden = true;
    canvas.focus();
    resetBall(Math.random() > .5 ? 1 : -1);
}

startButton.addEventListener('click', startGame);
canvas.addEventListener('pointermove', event => {
    const rect = canvas.getBoundingClientRect();
    game.playerY = (event.clientY - rect.top) * (game.height / rect.height);
});
canvas.addEventListener('pointerdown', event => {
    canvas.focus();
    const rect = canvas.getBoundingClientRect();
    game.playerY = (event.clientY - rect.top) * (game.height / rect.height);
});
window.addEventListener('keydown', event => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (['ArrowUp', 'ArrowDown', ' '].includes(key)) event.preventDefault();
    game.keys.add(key);
});
window.addEventListener('keyup', event => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    game.keys.delete(key);
});
window.addEventListener('blur', () => game.keys.clear());

requestAnimationFrame(frame);
