const canvas = document.getElementById('pongCanvas');
const context = canvas.getContext('2d');
const startButton = document.getElementById('startButton');
const difficultySelect = document.getElementById('difficultySelect');
const gamePicker = document.getElementById('gamePicker');
const gameStage = document.getElementById('gameStage');
const gameTitle = document.getElementById('gameTitle');
const gameKicker = document.getElementById('gameKicker');
const gameHelp = document.getElementById('gameHelp');
const scoreLabel = document.getElementById('scoreLabel');

function readLocalSetting(key) {
    try { return localStorage.getItem(key); } catch (error) { return null; }
}
function saveLocalSetting(key, value) {
    try { localStorage.setItem(key, value); } catch (error) { /* The games remain playable if storage is unavailable. */ }
}

const isEnglish = readLocalSetting('userLang') === 'en';
const copy = isEnglish ? {
    break: 'A short break', offline: 'Works offline', pickerKicker: 'Five games in one break', pickerTitle: 'Choose a game',
    difficulty: 'Difficulty', levels: { easy: 'Easy', medium: 'Medium', hard: 'Hard' }, back: 'All games', start: 'Start game', replay: 'Play again',
    games: {
        pong: { title: 'PONG', description: 'Outplay the computer', help: 'Move with mouse, touch, ↑ ↓, or W and S', goal: 'First to 5 points wins', win: 'YOU WIN', lose: 'CPU WINS' },
        snake: { title: 'SNAKE', description: 'Collect fruit and avoid crashing', help: 'Move with arrow keys or swipe the board', goal: 'Collect as much fruit as you can', over: 'GAME OVER' },
        breakout: { title: 'BRICK BREAKER', description: 'Clear the wall before losing your balls', help: 'Move with pointer, ← →, or A and D', goal: 'Break every brick with 3 balls', win: 'ALL CLEAR!', over: 'NO BALLS LEFT' },
        flappy: { title: 'FLAPPY', description: 'Fly through the pipes for a high score', help: 'Tap or press Space / ↑ to flap', goal: 'Pass as many pipes as you can', over: 'FLIGHT OVER' },
        memory: { title: 'MEMORY MATCH', description: 'Find every pair in fewer moves', help: 'Tap cards, or use arrows and Enter', goal: 'Match all 8 pairs', win: 'ALL PAIRS FOUND!' }
    }
} : {
    break: 'استراحة قصيرة', offline: 'تعمل دون إنترنت', pickerKicker: 'خمس ألعاب في استراحتك', pickerTitle: 'اختار لعبتك',
    difficulty: 'المستوى', levels: { easy: 'سهل', medium: 'متوسط', hard: 'صعب' }, back: 'كل الألعاب', start: 'ابدأ اللعب', replay: 'العب مرة أخرى',
    games: {
        pong: { title: 'PONG', description: 'صدّ الكرة واهزم الكمبيوتر', help: 'حرّك بالماوس أو اللمس أو الأسهم ↑ ↓ أو W و S', goal: 'أول لاعب يصل إلى ٥ نقاط يفوز', win: 'فزت!', lose: 'فاز الكمبيوتر' },
        snake: { title: 'الثعبان', description: 'اجمع الثمار وتجنب الاصطدام', help: 'حرّك بالأسهم أو اسحب على لوحة اللعب', goal: 'اجمع أكبر عدد من الثمار', over: 'انتهت اللعبة' },
        breakout: { title: 'حطّم الطوب', description: 'أزل الحواجز قبل أن تخسر كراتك', help: 'حرّك باللمس أو الماوس أو ← → أو A و D', goal: 'حطّم كل الطوب باستخدام ٣ كرات', win: 'أزلت كل الطوب!', over: 'انتهت الكرات' },
        flappy: { title: 'حلّق', description: 'اعبر الأعمدة بأكبر نتيجة', help: 'اضغط أو المس الشاشة أو Space / ↑ للطيران', goal: 'اعبر أكبر عدد من الأعمدة', over: 'انتهت الرحلة' },
        memory: { title: 'طابق الصور', description: 'اعثر على الأزواج بأقل حركات', help: 'المس البطاقات أو استخدم الأسهم و Enter', goal: 'طابق الأزواج الثمانية', win: 'وجدت كل الأزواج!' }
    }
};

const savedDifficulty = readLocalSetting('pongDifficulty');
const initialDifficulty = ['easy', 'medium', 'hard'].includes(savedDifficulty) ? savedDifficulty : 'medium';
difficultySelect.value = initialDifficulty;
document.getElementById('pickerKicker').textContent = copy.pickerKicker;
document.getElementById('gamePickerTitle').textContent = copy.pickerTitle;
document.getElementById('offlineBadge').textContent = copy.offline;
document.getElementById('difficultyLabel').textContent = copy.difficulty;
document.getElementById('backToGamesButton').textContent = copy.back;
Array.from(difficultySelect.options).forEach(option => { option.textContent = copy.levels[option.value]; });

document.querySelectorAll('.game-choice').forEach(button => {
    const data = copy.games[button.dataset.game];
    if (!data) return;
    button.querySelector('.game-choice-copy strong').textContent = data.title;
    button.querySelector('.game-choice-copy small').textContent = data.description;
    button.querySelector('.game-choice-arrow').textContent = isEnglish ? '→' : '←';
});

const state = {
    width: canvas.width,
    height: canvas.height,
    mode: null,
    difficulty: initialDifficulty,
    running: false,
    keys: new Set(),
    lastFrame: 0,
    snakeSwipeStart: null
};

const pong = {};
const snake = {};
const breakout = {};
const flappy = {};
const memory = {};
const CENTER_X = state.width / 2;
const CENTER_Y = state.height / 2;

function roundRect(x, y, width, height, radius, fill, stroke) {
    const r = Math.max(0, Math.min(radius, width / 2, height / 2));
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + width, y, x + width, y + height, r);
    context.arcTo(x + width, y + height, x, y + height, r);
    context.arcTo(x, y + height, x, y, r);
    context.arcTo(x, y, x + width, y, r);
    context.closePath();
    if (fill) { context.fillStyle = fill; context.fill(); }
    if (stroke) { context.strokeStyle = stroke; context.stroke(); }
}

function drawBoard(background = '#091923') {
    context.clearRect(0, 0, state.width, state.height);
    context.fillStyle = background;
    context.fillRect(0, 0, state.width, state.height);
}

function drawHud(label, value, right = false) {
    context.font = '700 21px Cairo, sans-serif';
    context.textAlign = right ? 'right' : 'left';
    context.textBaseline = 'top';
    context.fillStyle = 'rgba(232,241,238,.85)';
    context.fillText(`${label}: ${value}`, right ? state.width - 26 : 26, 20);
}

function getPongDifficulty() {
    return {
        easy: { cpuSpeed: 2.5, predictionFrames: 0, aimError: 84 },
        medium: { cpuSpeed: 3.35, predictionFrames: 3, aimError: 56 },
        hard: { cpuSpeed: 5.1, predictionFrames: 8, aimError: 12 }
    }[state.difficulty];
}

function resetPongBall(direction) {
    pong.ballX = CENTER_X;
    pong.ballY = CENTER_Y;
    const speed = 6;
    const angle = (Math.random() * .8 - .4);
    pong.ballVX = Math.cos(angle) * speed * direction;
    pong.ballVY = Math.sin(angle) * speed;
    pong.cpuAimOffset = (Math.random() * 2 - 1) * getPongDifficulty().aimError;
}

function createSnakeFood() {
    let food;
    do {
        food = { x: Math.floor(Math.random() * snake.columns), y: Math.floor(Math.random() * snake.rows) };
    } while (snake.body.some(part => part.x === food.x && part.y === food.y));
    return food;
}

function shuffle(items) {
    for (let i = items.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
}

function initializeGame() {
    state.running = false;
    state.keys.clear();
    if (state.mode === 'pong') {
        Object.assign(pong, {
            paddleHeight: 108, paddleWidth: 14, playerY: CENTER_Y, cpuY: CENTER_Y,
            ballX: CENTER_X, ballY: CENTER_Y, ballVX: 6, ballVY: 3,
            playerScore: 0, cpuScore: 0, cpuAimOffset: 0
        });
        resetPongBall(Math.random() > .5 ? 1 : -1);
    } else if (state.mode === 'snake') {
        Object.assign(snake, {
            columns: 40, rows: 20, tile: 24, offsetY: 30,
            body: [{ x: 20, y: 10 }, { x: 19, y: 10 }, { x: 18, y: 10 }],
            direction: { x: 1, y: 0 }, nextDirection: { x: 1, y: 0 },
            score: 0, accumulator: 0
        });
        snake.food = createSnakeFood();
    } else if (state.mode === 'breakout') {
        const columns = 10;
        const rows = 5;
        const settings = {
            easy: { paddle: 180, speedX: 3.2, speedY: 4.4 },
            medium: { paddle: 150, speedX: 4.3, speedY: 5.3 },
            hard: { paddle: 122, speedX: 5.1, speedY: 6.3 }
        }[state.difficulty];
        Object.assign(breakout, {
            paddleWidth: settings.paddle, paddleHeight: 13, paddleX: CENTER_X,
            ballX: CENTER_X, ballY: state.height - 72, ballSpeedX: settings.speedX, ballSpeedY: settings.speedY, ballVX: settings.speedX, ballVY: -settings.speedY,
            radius: 9, score: 0, lives: 3, bricks: [],
            brickRows: rows, brickColumns: columns
        });
        const gap = 8;
        const brickWidth = 78;
        const totalWidth = columns * brickWidth + (columns - 1) * gap;
        const startX = (state.width - totalWidth) / 2;
        for (let row = 0; row < rows; row += 1) {
            for (let column = 0; column < columns; column += 1) {
                breakout.bricks.push({ x: startX + column * (brickWidth + gap), y: 91 + row * 29, width: brickWidth, height: 19, row, alive: true });
            }
        }
    } else if (state.mode === 'flappy') {
        const settings = { easy: { speed: 3.6, gap: 188 }, medium: { speed: 4.4, gap: 164 }, hard: { speed: 5.2, gap: 144 } }[state.difficulty];
        Object.assign(flappy, { birdX: 252, birdY: CENTER_Y, birdVY: 0, radius: 17, pipes: [], score: 0, speed: settings.speed, gap: settings.gap });
        flappy.pipes.push(createPipe(660));
    } else if (state.mode === 'memory') {
        const faces = shuffle(['🌙', '⭐', '🍎', '🚀', '🎈', '🐱', '☀️', '🎵', '🌙', '⭐', '🍎', '🚀', '🎈', '🐱', '☀️', '🎵']);
        Object.assign(memory, { cards: faces, open: [], matched: new Set(), moves: 0, hideAt: 0, cursor: 0 });
    }
}

function createPipe(x) {
    const margin = 64;
    const gap = flappy.gap || 164;
    const gapTop = margin + Math.random() * (state.height - gap - margin * 2);
    return { x, gapTop, gap, width: 78, passed: false };
}

function selectGame(id) {
    if (!copy.games[id]) return;
    state.mode = id;
    state.difficulty = difficultySelect.value;
    gamePicker.hidden = true;
    gameStage.hidden = false;
    difficultySelect.closest('.difficulty-control').hidden = id === 'memory';
    const data = copy.games[id];
    gameTitle.textContent = data.title;
    gameKicker.textContent = copy.break;
    gameHelp.textContent = data.help;
    scoreLabel.textContent = data.goal;
    canvas.setAttribute('aria-label', data.title);
    startButton.textContent = copy.start;
    startButton.hidden = false;
    initializeGame();
    startButton.focus({ preventScroll: true });
    draw();
}

function showGamePicker() {
    state.running = false;
    state.mode = null;
    state.keys.clear();
    gameStage.hidden = true;
    gamePicker.hidden = false;
    gameTitle.textContent = isEnglish ? 'Break games' : 'ألعاب الاستراحة';
    gameKicker.textContent = copy.break;
    document.querySelector('.game-choice')?.focus({ preventScroll: true });
}

function finishGame(message) {
    state.running = false;
    state.keys.clear();
    startButton.textContent = message;
    startButton.hidden = false;
    startButton.focus({ preventScroll: true });
}

function startGame() {
    if (!state.mode) return;
    state.difficulty = difficultySelect.value;
    initializeGame();
    state.running = true;
    startButton.textContent = copy.replay;
    startButton.hidden = true;
    canvas.focus({ preventScroll: true });
}

function drawPong() {
    const { width, height } = state;
    drawBoard();
    context.strokeStyle = 'rgba(169,207,199,.22)';
    context.lineWidth = 3;
    context.setLineDash([12, 16]);
    context.beginPath(); context.moveTo(width / 2, 18); context.lineTo(width / 2, height - 18); context.stroke();
    context.setLineDash([]);
    roundRect(26, pong.playerY - pong.paddleHeight / 2, pong.paddleWidth, pong.paddleHeight, 7, '#4de0aa');
    roundRect(width - 40, pong.cpuY - pong.paddleHeight / 2, pong.paddleWidth, pong.paddleHeight, 7, '#ffc869');
    context.fillStyle = '#f3f8f5'; context.beginPath(); context.arc(pong.ballX, pong.ballY, 9, 0, Math.PI * 2); context.fill();
    context.font = '700 56px Orbitron, sans-serif'; context.textAlign = 'center'; context.textBaseline = 'alphabetic'; context.fillStyle = 'rgba(232,241,238,.8)';
    context.fillText(String(pong.playerScore), width * .4, 78); context.fillText(String(pong.cpuScore), width * .6, 78);
}

function drawSnake() {
    drawBoard('#091923');
    const tile = snake.tile;
    const boardHeight = snake.rows * tile;
    context.strokeStyle = 'rgba(169,207,199,.07)'; context.lineWidth = 1;
    for (let x = 0; x <= state.width; x += tile) { context.beginPath(); context.moveTo(x, snake.offsetY); context.lineTo(x, snake.offsetY + boardHeight); context.stroke(); }
    for (let y = 0; y <= snake.rows; y += 1) { context.beginPath(); context.moveTo(0, snake.offsetY + y * tile); context.lineTo(state.width, snake.offsetY + y * tile); context.stroke(); }
    drawHud(isEnglish ? 'FRUIT' : 'الثمار', snake.score, true);
    const fx = snake.food.x * tile; const fy = snake.offsetY + snake.food.y * tile;
    context.fillStyle = '#ff8b72'; context.beginPath(); context.arc(fx + tile / 2, fy + tile / 2, 8, 0, Math.PI * 2); context.fill();
    snake.body.forEach((part, index) => {
        const inset = index === 0 ? 2 : 4;
        roundRect(part.x * tile + inset, snake.offsetY + part.y * tile + inset, tile - inset * 2, tile - inset * 2, 7, index === 0 ? '#ffc869' : '#4de0aa');
    });
}

function drawBreakout() {
    drawBoard();
    const palette = ['#ff8b72', '#ffc869', '#a8e06a', '#4de0aa', '#72c8ff'];
    breakout.bricks.forEach(brick => {
        if (!brick.alive) return;
        roundRect(brick.x, brick.y, brick.width, brick.height, 5, palette[brick.row]);
    });
    roundRect(breakout.paddleX - breakout.paddleWidth / 2, state.height - 46, breakout.paddleWidth, breakout.paddleHeight, 7, '#4de0aa');
    context.fillStyle = '#f5f6ec'; context.beginPath(); context.arc(breakout.ballX, breakout.ballY, breakout.radius, 0, Math.PI * 2); context.fill();
    drawHud(isEnglish ? 'SCORE' : 'النقاط', breakout.score);
    drawHud(isEnglish ? 'BALLS' : 'الكرات', breakout.lives, true);
}

function drawFlappy() {
    const sky = context.createLinearGradient(0, 0, 0, state.height);
    sky.addColorStop(0, '#102d42'); sky.addColorStop(1, '#091923');
    drawBoard(); context.fillStyle = sky; context.fillRect(0, 0, state.width, state.height);
    context.fillStyle = 'rgba(255,255,255,.13)';
    for (let i = 0; i < 13; i += 1) { const x = (i * 103 + 41) % state.width; const y = (i * 67 + 32) % 205; context.beginPath(); context.arc(x, y, 2, 0, Math.PI * 2); context.fill(); }
    flappy.pipes.forEach(pipe => {
        const bottomY = pipe.gapTop + pipe.gap;
        roundRect(pipe.x, 0, pipe.width, pipe.gapTop, 9, '#398f68');
        roundRect(pipe.x - 7, pipe.gapTop - 19, pipe.width + 14, 20, 6, '#4de0aa');
        roundRect(pipe.x, bottomY, pipe.width, state.height - bottomY, 9, '#398f68');
        roundRect(pipe.x - 7, bottomY, pipe.width + 14, 20, 6, '#4de0aa');
    });
    context.fillStyle = '#ffc869'; context.beginPath(); context.arc(flappy.birdX, flappy.birdY, flappy.radius, 0, Math.PI * 2); context.fill();
    context.fillStyle = '#07131e'; context.beginPath(); context.arc(flappy.birdX + 5, flappy.birdY - 4, 3, 0, Math.PI * 2); context.fill();
    context.fillStyle = '#ff8b72'; context.beginPath(); context.moveTo(flappy.birdX + 14, flappy.birdY); context.lineTo(flappy.birdX + 25, flappy.birdY + 4); context.lineTo(flappy.birdX + 14, flappy.birdY + 8); context.closePath(); context.fill();
    context.font = '800 46px Orbitron, sans-serif'; context.textAlign = 'center'; context.textBaseline = 'top'; context.fillStyle = '#f3f8f5'; context.fillText(String(flappy.score), CENTER_X, 22);
    context.fillStyle = '#15342e'; context.fillRect(0, state.height - 20, state.width, 20);
}

function getMemoryCardBounds(index) {
    const columns = 4; const width = 154; const height = 88; const gapX = 16; const gapY = 14;
    const totalWidth = columns * width + (columns - 1) * gapX;
    const startX = (state.width - totalWidth) / 2;
    const startY = 63;
    const row = Math.floor(index / columns); const column = index % columns;
    return { x: startX + column * (width + gapX), y: startY + row * (height + gapY), width, height };
}

function drawMemory() {
    drawBoard();
    drawHud(isEnglish ? 'MOVES' : 'الحركات', memory.moves);
    drawHud(isEnglish ? 'PAIRS' : 'الأزواج', memory.matched.size, true);
    memory.cards.forEach((face, index) => {
        const rect = getMemoryCardBounds(index);
        const visible = memory.open.includes(index) || memory.matched.has(index);
        const selected = index === memory.cursor;
        roundRect(rect.x, rect.y, rect.width, rect.height, 13, visible ? '#173d3b' : '#102b38', selected ? '#ffc869' : 'rgba(77,224,170,.24)');
        if (visible) {
            context.font = '42px serif'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillStyle = '#fff';
            context.fillText(face, rect.x + rect.width / 2, rect.y + rect.height / 2 + 2);
        } else {
            context.font = '700 27px Amiri, serif'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillStyle = 'rgba(255,200,105,.7)';
            context.fillText('✦', rect.x + rect.width / 2, rect.y + rect.height / 2);
        }
    });
}

function draw() {
    if (state.mode === 'pong') drawPong();
    else if (state.mode === 'snake') drawSnake();
    else if (state.mode === 'breakout') drawBreakout();
    else if (state.mode === 'flappy') drawFlappy();
    else if (state.mode === 'memory') drawMemory();
}

function updatePong(frameScale) {
    const playerSpeed = 8 * frameScale;
    if (state.keys.has('ArrowUp') || state.keys.has('w')) pong.playerY -= playerSpeed;
    if (state.keys.has('ArrowDown') || state.keys.has('s')) pong.playerY += playerSpeed;
    pong.playerY = Math.max(pong.paddleHeight / 2 + 8, Math.min(state.height - pong.paddleHeight / 2 - 8, pong.playerY));
    const { cpuSpeed, predictionFrames } = getPongDifficulty();
    const cpuAim = pong.ballY + (pong.ballVX > 0 ? pong.ballVY * predictionFrames : 0) + pong.cpuAimOffset;
    pong.cpuY += Math.max(-cpuSpeed * frameScale, Math.min(cpuSpeed * frameScale, cpuAim - pong.cpuY));
    pong.cpuY = Math.max(pong.paddleHeight / 2 + 8, Math.min(state.height - pong.paddleHeight / 2 - 8, pong.cpuY));
    pong.ballX += pong.ballVX * frameScale; pong.ballY += pong.ballVY * frameScale;
    if (pong.ballY < 10) { pong.ballY = 10; pong.ballVY = Math.abs(pong.ballVY); }
    else if (pong.ballY > state.height - 10) { pong.ballY = state.height - 10; pong.ballVY = -Math.abs(pong.ballVY); }
    const playerFace = 26 + pong.paddleWidth; const cpuFace = state.width - 40;
    if (pong.ballVX < 0 && pong.ballX - 9 <= playerFace && Math.abs(pong.ballY - pong.playerY) <= pong.paddleHeight / 2) {
        pong.ballX = playerFace + 10; pong.ballVX = Math.min(10, Math.abs(pong.ballVX) * 1.04); pong.ballVY += (pong.ballY - pong.playerY) * .035;
    }
    if (pong.ballVX > 0 && pong.ballX + 9 >= cpuFace && Math.abs(pong.ballY - pong.cpuY) <= pong.paddleHeight / 2) {
        pong.ballX = cpuFace - 10; pong.ballVX = -Math.min(10, Math.abs(pong.ballVX) * 1.04); pong.ballVY += (pong.ballY - pong.cpuY) * .035;
    }
    if (pong.ballX < -12) { pong.cpuScore += 1; if (pong.cpuScore >= 5) finishGame(copy.games.pong.lose); else resetPongBall(1); }
    else if (pong.ballX > state.width + 12) { pong.playerScore += 1; if (pong.playerScore >= 5) finishGame(copy.games.pong.win); else resetPongBall(-1); }
}

function updateSnake(delta) {
    const speed = { easy: 6.5, medium: 8, hard: 10 }[state.difficulty];
    snake.accumulator += delta;
    const interval = 1000 / speed;
    while (snake.accumulator >= interval && state.running) {
        snake.accumulator -= interval;
        snake.direction = { ...snake.nextDirection };
        const head = { x: snake.body[0].x + snake.direction.x, y: snake.body[0].y + snake.direction.y };
        let ate = head.x === snake.food.x && head.y === snake.food.y;
        if (!ate) snake.body.pop();
        if (head.x < 0 || head.x >= snake.columns || head.y < 0 || head.y >= snake.rows || snake.body.some(part => part.x === head.x && part.y === head.y)) {
            finishGame(copy.games.snake.over); return;
        }
        snake.body.unshift(head);
        if (ate) { snake.score += 1; snake.food = createSnakeFood(); }
    }
}

function updateBreakout(frameScale) {
    const paddleSpeed = 9 * frameScale;
    if (state.keys.has('ArrowLeft') || state.keys.has('a')) breakout.paddleX -= paddleSpeed;
    if (state.keys.has('ArrowRight') || state.keys.has('d')) breakout.paddleX += paddleSpeed;
    breakout.paddleX = Math.max(breakout.paddleWidth / 2 + 6, Math.min(state.width - breakout.paddleWidth / 2 - 6, breakout.paddleX));
    breakout.ballX += breakout.ballVX * frameScale; breakout.ballY += breakout.ballVY * frameScale;
    if (breakout.ballX < breakout.radius) { breakout.ballX = breakout.radius; breakout.ballVX = Math.abs(breakout.ballVX); }
    else if (breakout.ballX > state.width - breakout.radius) { breakout.ballX = state.width - breakout.radius; breakout.ballVX = -Math.abs(breakout.ballVX); }
    if (breakout.ballY < breakout.radius) { breakout.ballY = breakout.radius; breakout.ballVY = Math.abs(breakout.ballVY); }
    const paddleY = state.height - 46;
    if (breakout.ballVY > 0 && breakout.ballY + breakout.radius >= paddleY && breakout.ballY < paddleY + breakout.paddleHeight + 7 && Math.abs(breakout.ballX - breakout.paddleX) <= breakout.paddleWidth / 2 + breakout.radius) {
        const offset = (breakout.ballX - breakout.paddleX) / (breakout.paddleWidth / 2);
        breakout.ballVY = -Math.abs(breakout.ballVY);
        breakout.ballVX = offset * 6.5;
        breakout.ballY = paddleY - breakout.radius;
    }
    if (breakout.ballY > state.height + breakout.radius) {
        breakout.lives -= 1;
        if (breakout.lives <= 0) { finishGame(copy.games.breakout.over); return; }
        breakout.ballX = breakout.paddleX; breakout.ballY = state.height - 72; breakout.ballVX = (Math.random() > .5 ? 1 : -1) * breakout.ballSpeedX; breakout.ballVY = -breakout.ballSpeedY;
    }
    for (const brick of breakout.bricks) {
        if (!brick.alive) continue;
        if (breakout.ballX + breakout.radius > brick.x && breakout.ballX - breakout.radius < brick.x + brick.width && breakout.ballY + breakout.radius > brick.y && breakout.ballY - breakout.radius < brick.y + brick.height) {
            brick.alive = false; breakout.ballVY *= -1; breakout.score += (5 - brick.row) * 10;
            if (breakout.bricks.every(item => !item.alive)) finishGame(copy.games.breakout.win);
            break;
        }
    }
}

function flap() { if (state.running && state.mode === 'flappy') flappy.birdVY = -7.4; }

function updateFlappy(frameScale) {
    flappy.birdVY += .42 * frameScale;
    flappy.birdY += flappy.birdVY * frameScale;
    flappy.pipes.forEach(pipe => { pipe.x -= flappy.speed * frameScale; });
    if (flappy.pipes.length && flappy.pipes[flappy.pipes.length - 1].x < state.width - 310) flappy.pipes.push(createPipe(state.width + 20));
    flappy.pipes = flappy.pipes.filter(pipe => pipe.x + pipe.width > -20);
    if (flappy.birdY - flappy.radius < 0 || flappy.birdY + flappy.radius > state.height - 20) { finishGame(copy.games.flappy.over); return; }
    for (const pipe of flappy.pipes) {
        if (!pipe.passed && pipe.x + pipe.width < flappy.birdX) { pipe.passed = true; flappy.score += 1; }
        const overlapsX = flappy.birdX + flappy.radius > pipe.x && flappy.birdX - flappy.radius < pipe.x + pipe.width;
        const outsideGap = flappy.birdY - flappy.radius < pipe.gapTop || flappy.birdY + flappy.radius > pipe.gapTop + pipe.gap;
        if (overlapsX && outsideGap) { finishGame(copy.games.flappy.over); return; }
    }
}

function flipMemoryCard(index, now = performance.now()) {
    if (!state.running || memory.hideAt > now || index < 0 || index >= memory.cards.length || memory.matched.has(index) || memory.open.includes(index)) return;
    memory.open.push(index);
    if (memory.open.length === 2) {
        memory.moves += 1;
        const [first, second] = memory.open;
        if (memory.cards[first] === memory.cards[second]) {
            memory.matched.add(first); memory.matched.add(second); memory.open = [];
            if (memory.matched.size === memory.cards.length) finishGame(copy.games.memory.win);
        } else memory.hideAt = now + 820;
    }
}

function updateMemory(now) {
    if (memory.hideAt && now >= memory.hideAt) { memory.open = []; memory.hideAt = 0; }
}

function update(delta, now) {
    const frameScale = Math.min(2, delta / 16.67);
    if (state.mode === 'pong') updatePong(frameScale);
    else if (state.mode === 'snake') updateSnake(delta);
    else if (state.mode === 'breakout') updateBreakout(frameScale);
    else if (state.mode === 'flappy') updateFlappy(frameScale);
    else if (state.mode === 'memory') updateMemory(now);
}

function frame(now) {
    const delta = state.lastFrame ? Math.min(50, now - state.lastFrame) : 16.67;
    state.lastFrame = now;
    if (state.running) update(delta, now);
    if (state.mode) draw();
    requestAnimationFrame(frame);
}

function getCanvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * (state.width / rect.width), y: (event.clientY - rect.top) * (state.height / rect.height) };
}

function setSnakeDirection(direction) {
    if (snake.direction.x + direction.x === 0 && snake.direction.y + direction.y === 0) return;
    snake.nextDirection = direction;
}

function moveMemoryCursor(dx, dy) {
    const column = (memory.cursor % 4 + dx + 4) % 4;
    const row = Math.max(0, Math.min(3, Math.floor(memory.cursor / 4) + dy));
    memory.cursor = row * 4 + column;
}

document.querySelectorAll('.game-choice').forEach(button => button.addEventListener('click', () => selectGame(button.dataset.game)));
document.getElementById('backToGamesButton').addEventListener('click', showGamePicker);
startButton.textContent = copy.start;
startButton.addEventListener('click', startGame);

difficultySelect.addEventListener('change', () => {
    state.difficulty = ['easy', 'medium', 'hard'].includes(difficultySelect.value) ? difficultySelect.value : 'medium';
    saveLocalSetting('pongDifficulty', state.difficulty);
    if (state.mode) { initializeGame(); startButton.textContent = copy.start; startButton.hidden = false; draw(); }
});

canvas.addEventListener('pointermove', event => {
    if (state.mode === 'pong') pong.playerY = getCanvasPoint(event).y;
    else if (state.mode === 'breakout') breakout.paddleX = getCanvasPoint(event).x;
});

canvas.addEventListener('pointerdown', event => {
    canvas.focus({ preventScroll: true });
    if (state.mode === 'snake') {
        try { canvas.setPointerCapture(event.pointerId); } catch (error) { /* Pointer capture is optional. */ }
    }
    const point = getCanvasPoint(event);
    if (state.mode === 'pong') pong.playerY = point.y;
    else if (state.mode === 'breakout') breakout.paddleX = point.x;
    else if (state.mode === 'flappy') flap();
    else if (state.mode === 'memory') {
        const index = memory.cards.findIndex((_, cardIndex) => {
            const rect = getMemoryCardBounds(cardIndex);
            return point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height;
        });
        if (index >= 0) { memory.cursor = index; flipMemoryCard(index); }
    } else if (state.mode === 'snake') state.snakeSwipeStart = point;
});

canvas.addEventListener('pointerup', event => {
    if (state.mode !== 'snake' || !state.snakeSwipeStart) return;
    const point = getCanvasPoint(event); const dx = point.x - state.snakeSwipeStart.x; const dy = point.y - state.snakeSwipeStart.y;
    state.snakeSwipeStart = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
    if (Math.abs(dx) > Math.abs(dy)) setSnakeDirection({ x: dx > 0 ? 1 : -1, y: 0 });
    else setSnakeDirection({ x: 0, y: dy > 0 ? 1 : -1 });
});

window.addEventListener('keydown', event => {
    if (gameStage.hidden || event.target === difficultySelect) return;
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    const controlKey = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Enter'].includes(key);
    if (controlKey) event.preventDefault();
    if (state.mode === 'snake') {
        if (key === 'ArrowUp' || key === 'w') setSnakeDirection({ x: 0, y: -1 });
        else if (key === 'ArrowDown' || key === 's') setSnakeDirection({ x: 0, y: 1 });
        else if (key === 'ArrowLeft' || key === 'a') setSnakeDirection({ x: -1, y: 0 });
        else if (key === 'ArrowRight' || key === 'd') setSnakeDirection({ x: 1, y: 0 });
    } else if (state.mode === 'flappy' && [' ', 'ArrowUp', 'w'].includes(key)) flap();
    else if (state.mode === 'memory' && state.running) {
        if (key === 'ArrowUp') moveMemoryCursor(0, -1);
        else if (key === 'ArrowDown') moveMemoryCursor(0, 1);
        else if (key === 'ArrowLeft') moveMemoryCursor(1, 0);
        else if (key === 'ArrowRight') moveMemoryCursor(-1, 0);
        else if (key === 'Enter' || key === ' ') flipMemoryCard(memory.cursor);
    } else if (['pong', 'breakout'].includes(state.mode)) state.keys.add(key);
});

window.addEventListener('keyup', event => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    state.keys.delete(key);
});
window.addEventListener('blur', () => state.keys.clear());

requestAnimationFrame(frame);
