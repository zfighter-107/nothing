// --- SETUP ---

// Get canvas elements
const bgCanvas = document.getElementById('background-canvas');
const gameCanvas = document.getElementById('game-canvas');
const uiCanvas = document.getElementById('ui-canvas');

// Get rendering contexts
const bgCtx = bgCanvas.getContext('2d', { alpha: false }); // Background is opaque
const gameCtx = gameCanvas.getContext('2d');
const uiCtx = uiCanvas.getContext('2d');

// Get other HTML Elements
const gameContainer = document.getElementById('game-container');
const fullscreenBtn = document.getElementById('fullscreen-btn');

// Set canvas resolution
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 450;
bgCanvas.width = gameCanvas.width = uiCanvas.width = CANVAS_WIDTH;
bgCanvas.height = gameCanvas.height = uiCanvas.height = CANVAS_HEIGHT;

// --- GAME STATE AND CONSTANTS ---

// Game Variables
let lastTime = 0;
let score = 0;
let lives = 3;
let isGameOver = false;
let isGameRunning = false;
let highScore = localStorage.getItem('coinGameHighScore') ?? 0;


// Game Objects
let coins = [];
const catcher = {
    width: 80,
    height: 20,
    x: CANVAS_WIDTH / 2 - 40,
    y: CANVAS_HEIGHT - 40,
    speed: 8,
    dx: 0 // Direction of x
};

// Input Handling
const mouse = { 
    x: catcher.x, 
    isDown: false, 
    isSticky: false 
};
const activeKeys = new Set();

// Properties of Coins
const yellowCoin = {
    timer: 0,
    interval: 500, //ms
    minSpawn: 1,
    maxSpawn: 4,
    minSize: 20,
    maxSize: 50,
    minSpeed: 2,
    maxSpeed: 7,
    score: 1
};

const specialCoin = {
    timer: 0,
    interval: 1000,
    minInterval: 500,
    maxInterval: 2000,
    minSize: 20,
    maxSize: 50,
    minSpeed: 2,
    maxSpeed: 5,
    scoreBlue: 3,
    scoreRed: 5,
    redBlueRatio: 0.3
}

// --- SPRITE GENERATION (OFF-SCREEN CANVAS) ---

function createSprites() {
    const sprites = {};

    // Catcher Sprite
    sprites.catcher = document.createElement('canvas');
    const catcherCtx = sprites.catcher.getContext('2d');
    sprites.catcher.width = catcher.width;
    sprites.catcher.height = catcher.height;
    catcherCtx.beginPath();
    catcherCtx.moveTo(0, 0);
    catcherCtx.quadraticCurveTo(catcher.width / 2, 15, catcher.width, 0);
    catcherCtx.lineTo(catcher.width, catcher.height);
    catcherCtx.lineTo(0, catcher.height);
    catcherCtx.closePath();
    const grad = catcherCtx.createLinearGradient(0, 0, 0, catcher.height);
    grad.addColorStop(0, '#c0c0c0');
    grad.addColorStop(0.5, '#ffffff');
    grad.addColorStop(1, '#c0c0c0');
    catcherCtx.fillStyle = grad;
    catcherCtx.fill();
    
    // Yellow Coin Sprite (Round)
    sprites.yellowCoin = document.createElement('canvas');
    const ycCtx = sprites.yellowCoin.getContext('2d');
    sprites.yellowCoin.width = 30;
    sprites.yellowCoin.height = 30;
    ycCtx.fillStyle = 'gold';
    ycCtx.strokeStyle = 'darkgoldenrod';
    ycCtx.lineWidth = 2;
    ycCtx.beginPath();
    ycCtx.arc(15, 15, 14, 0, Math.PI * 2);
    ycCtx.fill();
    ycCtx.stroke();
    ycCtx.fillStyle = '#5f4308';
    ycCtx.font = '18px sans-serif';
    ycCtx.textAlign = 'center';
    ycCtx.textBaseline = 'middle';
    ycCtx.fillText('$', 15, 16);

    // Blue Coin Sprite (Square)
    sprites.blueCoin = document.createElement('canvas');
    const bcCtx = sprites.blueCoin.getContext('2d');
    sprites.blueCoin.width = 30;
    sprites.blueCoin.height = 30;
    bcCtx.fillStyle = '#3498db';
    bcCtx.strokeStyle = '#1b5e8c';
    bcCtx.lineWidth = 4;
    bcCtx.strokeRect(1, 1, 28, 28);
    bcCtx.fillRect(2, 2, 26, 26);
    bcCtx.fillStyle = '#ecf0f1';
    bcCtx.translate(15, 4);
    bcCtx.rotate(0.25 * Math.PI);
    bcCtx.fillRect(2, 2, 12, 12);

    // Red Coin Sprite (Triangle)
    sprites.redCoin = document.createElement('canvas');
    const rcCtx = sprites.redCoin.getContext('2d');
    sprites.redCoin.width = 30;
    sprites.redCoin.height = 30;
    rcCtx.beginPath();
    rcCtx.moveTo(16, 2);
    rcCtx.lineTo(30, 28);
    rcCtx.lineTo(2, 28);
    rcCtx.closePath();
    rcCtx.fillStyle = '#e74c3c';
    rcCtx.strokeStyle = '#a32a1d';
    rcCtx.lineWidth = 2;
    rcCtx.fill();
    rcCtx.stroke();
    rcCtx.fillStyle = '#ecf0f1';
    rcCtx.font = 'bold 16px sans-serif';
    rcCtx.textAlign = 'center';
    rcCtx.textBaseline = 'middle';
    rcCtx.fillText('×', 16, 19);

    return sprites;
}
const sprites = createSprites();

// --- DRAWING FUNCTIONS ---

function drawBackground(){
    const grad = bgCtx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    grad.addColorStop(0, '#0d2611');
    grad.addColorStop(1, '#1a5c24');
    bgCtx.fillStyle = grad;
    bgCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

function drawGameUI() {
    uiCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    // Draw Score and Lives
    uiCtx.fillStyle = 'white';
    uiCtx.font = '24px sans-serif';
    uiCtx.textAlign = 'left';
    uiCtx.textBaseline = 'top';
    uiCtx.fillText(`Score: ${score}`, 20, 20);
    uiCtx.textAlign = 'right';
    uiCtx.fillText(`Lives: ${lives}`, CANVAS_WIDTH - 20, 20);
}

function drawWelcomeScreen() {
    uiCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    uiCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    uiCtx.fillStyle = 'white';
    uiCtx.font = 'bold 48px sans-serif';
    uiCtx.textAlign = 'center';
    uiCtx.textBaseline = 'middle';
    uiCtx.fillText('CATCH THE COINS', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 80);

    // Play Button
    uiCtx.fillStyle = '#2ecc71';
    uiCtx.fillRect(CANVAS_WIDTH / 2 - 100, CANVAS_HEIGHT / 2, 200, 50);
    uiCtx.fillStyle = 'white';
    uiCtx.font = 'bold 28px sans-serif';
    uiCtx.fillText('Play Game', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 25);
    
    uiCtx.font = '20px sans-serif';
    uiCtx.fillText(`High Score: ${highScore}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 80);
}

function drawGameOverScreen() {
    uiCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    uiCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    uiCtx.fillStyle = '#e74c3c';
    uiCtx.font = 'bold 48px sans-serif';
    uiCtx.textAlign = 'center';
    uiCtx.textBaseline = 'middle';
    uiCtx.fillText('GAME OVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 80);

    uiCtx.fillStyle = 'white';
    uiCtx.font = '24px sans-serif';
    uiCtx.fillText(`Your Score: ${score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
    uiCtx.fillText(`High Score: ${highScore}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);

    // Restart Button
    uiCtx.fillStyle = '#3498db';
    uiCtx.fillRect(CANVAS_WIDTH / 2 - 100, CANVAS_HEIGHT / 2 + 60, 200, 50);
    uiCtx.fillStyle = 'white';
    uiCtx.font = 'bold 28px sans-serif';
    uiCtx.fillText('Restart', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 85);
}

// --- GAME LOGIC AND UPDATE FUNCTIONS ---

function updateCatcher() {
    // Keyboard movement
    catcher.x += catcher.dx;

    // Mouse movement
    if (mouse.isDown || mouse.isSticky) {
        catcher.x = mouse.x - catcher.width / 2;
    }

    // Clamp catcher position to stay within canvas bounds
    if (catcher.x < 0) catcher.x = 0;
    if (catcher.x > CANVAS_WIDTH - catcher.width) catcher.x = CANVAS_WIDTH - catcher.width;
}

// Helper function to map a value from one range to another
function mapRange(x, inMin, inMax, outMin, outMax) {
    return (x - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
}

// Helper function to get a random integer value between a range (both inclusive)
function randomInRange(min, max){
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function spawnCoins(deltaTime) {
    // Yellow coins
    yellowCoin.timer += deltaTime;
    if (yellowCoin.timer > yellowCoin.interval) {
        yellowCoin.timer = 0;
        const count = randomInRange(yellowCoin.minSpawn, yellowCoin.maxSpawn);
        for (let i = 0; i < count; i++) {
            let coinSize = randomInRange(yellowCoin.minSize, yellowCoin.maxSize);
            coins.push({
                x: randomInRange(0, CANVAS_WIDTH - coinSize),
                y: -coinSize,
                size: coinSize,
                speed: mapRange(coinSize, yellowCoin.minSize, yellowCoin.maxSize, yellowCoin.maxSpeed, yellowCoin.minSpeed),
                type: 'yellow'
            });
        }
    }
    // Special coins
    specialCoin.timer += deltaTime;
    if (specialCoin.timer > specialCoin.interval) {
        specialCoin.timer = 0;
        specialCoin.interval = randomInRange(specialCoin.minInterval, specialCoin.maxInterval);
        let coinSize = randomInRange(specialCoin.minSize, specialCoin.maxSize);
        coins.push({
            x: randomInRange(0, CANVAS_WIDTH - coinSize),
            y: -coinSize,
            size: coinSize,
            speed: mapRange(coinSize, specialCoin.minSize, specialCoin.maxSize, specialCoin.maxSpeed, specialCoin.minSpeed),
            type: Math.random() < specialCoin.redBlueRatio ? 'red' : 'blue'
        });
    }
}

function updateCoins(deltaTime) {
    for (let i = coins.length - 1; i >= 0; i--) {
        const coin = coins[i];
        coin.y += coin.speed;

        // Coin Catching
        if (
            coin.y + coin.size > catcher.y &&
            coin.x < catcher.x + catcher.width &&
            coin.x + coin.size > catcher.x
        ) {
            handleCatch(coin.type);
            coins.splice(i, 1);
            continue;
        }

        // Coin missed (out of bounds)
        if (coin.y > CANVAS_HEIGHT) {
            handleMiss(coin.type);
            coins.splice(i, 1);
        }
    }
}

function handleCatch(type) {
    switch(type){
        case 'yellow': score += yellowCoin.score; break;
        case 'blue': score += specialCoin.scoreBlue; break;
        case 'red': lives -= 1; break;
    }
}

function handleMiss(type) {
    switch(type){
        case 'blue': lives -= 1; break;
        case 'red' : score += specialCoin.scoreRed; break;
    }
}

function checkGameOver() {
    if (lives <= 0) {
        isGameOver = true;
        isGameRunning = false;
    }
}

// --- RENDER FUNCTIONS ---

function render() {
    gameCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    // Draw Catcher
    gameCtx.drawImage(sprites.catcher, catcher.x, catcher.y);

    // Draw Coins
    for (let coin of coins){
        let sprite;
        if (coin.type === 'yellow') sprite = sprites.yellowCoin;
        else if (coin.type === 'blue') sprite = sprites.blueCoin;
        else sprite = sprites.redCoin;
        gameCtx.drawImage(sprite, coin.x, coin.y, coin.size, coin.size);
    };
}

// --- GAME FLOW AND MAIN LOOP ---

function resetGame() {
    score = 0;
    lives = 3;
    coins = [];
    catcher.x = CANVAS_WIDTH / 2 - catcher.width / 2;
    isGameOver = false;
}

function startGame() {
    resetGame();
    isGameRunning = true;
    isGameOver = false;
    lastTime = 0; // Reset time for deltaTime calculation
    gameLoop(0);
}

function gameLoop(timestamp) {
    
    if (isGameOver) {
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('coinGameHighScore', highScore);
        }
        drawGameOverScreen();
        return; // Stop the loop
    }

    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    spawnCoins(deltaTime);
    updateCoins(deltaTime);
    updateCatcher();
    checkGameOver();

    render();
    drawGameUI();

    requestAnimationFrame(gameLoop);
}

// --- EVENT LISTENERS ---

function moveCatcher() {
    if (activeKeys.has('ArrowRight') || activeKeys.has('KeyD')){
        catcher.dx = catcher.speed;
    } 
    else if (activeKeys.has('ArrowLeft') || activeKeys.has('KeyA')){ 
        catcher.dx = -catcher.speed;
    }
    else { 
        catcher.dx = 0; 
    }
}

document.addEventListener('keydown', (event) => {
    activeKeys.add(event.code);
    moveCatcher();
    event.preventDefault();
});

document.addEventListener('keyup', (event) => {
    activeKeys.delete(event.code);
    moveCatcher();
});

// Handle effect of canvas scaling on mouse position
function getMousePosX(canvas, event) {
    const rect = canvas.getBoundingClientRect();
    return (event.clientX - rect.left) / (rect.right - rect.left) * CANVAS_WIDTH;
}

function getMousePosY(canvas, event) {
    const rect = canvas.getBoundingClientRect();
    return (event.clientY - rect.top) / (rect.bottom - rect.top) * CANVAS_HEIGHT;
}

uiCanvas.addEventListener('mousedown', (event) => {
    mouse.isDown = true;
    mouse.x = getMousePosX(uiCanvas, event);
});

uiCanvas.addEventListener('mouseup', (event) => {
    mouse.isDown = false;
});

uiCanvas.addEventListener('mousemove', (event) => {
    if(mouse.isDown || mouse.isSticky) {
        mouse.x = getMousePosX(uiCanvas, event);
    }
});

uiCanvas.addEventListener('dblclick', (event) => {
    mouse.isSticky = !mouse.isSticky;
});

uiCanvas.addEventListener('touchstart', (event) => {
    event.preventDefault();
    mouse.isDown = true;
    mouse.x = getMousePosX(uiCanvas, event.touches[0]);
}, { passive: false });

uiCanvas.addEventListener('touchend', (event) => {
    mouse.isDown = false;
    
    //Firing click handler on touch screens
    const touch = event.changedTouches[0];
    const mouseEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: touch.clientX,
        clientY: touch.clientY,
    });
    uiCanvas.dispatchEvent(mouseEvent);
}, { passive: false });

uiCanvas.addEventListener('touchmove', (event) => {
    event.preventDefault();
    if(mouse.isDown){ 
        mouse.x = getMousePosX(uiCanvas, event.touches[0]);
    }
}, { passive: false });

uiCanvas.addEventListener('click', (event) => {
    if (!isGameRunning) {
        const posX = getMousePosX(uiCanvas, event);
        const posY = getMousePosY(uiCanvas, event);
        // Check for button clicks
        if (
            posX > CANVAS_WIDTH/2 - 100 && posX < CANVAS_WIDTH/2 + 100 &&
            posY > (isGameOver ? CANVAS_HEIGHT/2+60 : CANVAS_HEIGHT/2) &&
            posY < (isGameOver ? CANVAS_HEIGHT/2+110 : CANVAS_HEIGHT/2+50)
        ) {
            startGame();
        }
    }
});

fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
        gameContainer.requestFullscreen().catch(err => {
            alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
        });
    } else {
        document.exitFullscreen();
    }
});

// Lock the screen in landscape mode for mobile devices.
document.addEventListener('fullscreenchange', () => {
  if (document.fullscreenElement) {
    // Entered fullscreen
    screen.orientation.lock('landscape').catch(error => {
      console.warn('Screen orientation lock failed:', error);
      // Fallback for browsers that don't support locking
      handleOrientationChange();
    });
  } else {
    // Exited fullscreen
    screen.orientation.unlock();
  }
});

// --- INITIALIZE GAME ---

drawBackground();
drawWelcomeScreen();
