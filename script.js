const screens = {
    start: document.getElementById('start-screen'),
    game: document.getElementById('game-screen'),
    gameOver: document.getElementById('game-over-screen')
};

const charCards = document.querySelectorAll('.char-card');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const timeEl = document.getElementById('time-left');
const scoreEl = document.getElementById('score');
const finalScoreEl = document.getElementById('final-score-val');
const gameOverTitle = document.getElementById('game-over-title');

// Game state
let selectedChar = null;
let gameLoopId;
let score = 0;
let timeLeft = 30;
let lastTime = 0;
let timerInterval;

// Colors mapping
const charColors = {
    jaspion: '#ef4444',
    macgaren: '#8b5cf6',
    kilza: '#10b981',
    satagoss: '#831843'
};

// Input state
const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    w: false,
    a: false,
    s: false,
    d: false
};

// Entities
const player = {
    x: 100, y: 300, w: 30, h: 30, vx: 0, vy: 0, speed: 300, jumpPower: -600, color: '#fff', isGrounded: false
};

const gravity = 1500;

let star = {
    x: 0, y: 0, radius: 15, active: false
};

const platforms = [
    {x: 0, y: 550, w: 250, h: 50},
    {x: 350, y: 550, w: 450, h: 50}, // Gap between 250 and 350
    {x: 250, y: 450, w: 100, h: 20},
    {x: 50, y: 350, w: 150, h: 20},
    {x: 350, y: 300, w: 150, h: 20},
    {x: 600, y: 200, w: 150, h: 20},
    {x: 150, y: 150, w: 150, h: 20},
];

const obstacles = [
    {x: 150, y: 530, w: 40, h: 20},
    {x: 550, y: 530, w: 40, h: 20},
    {x: 400, y: 280, w: 40, h: 20}
];

// Particles for star collection effect
let particles = [];

// Event Listeners
charCards.forEach(card => {
    card.addEventListener('click', () => {
        charCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedChar = card.dataset.char;
        startBtn.disabled = false;
        player.color = charColors[selectedChar];
    });
});

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', () => showScreen('start'));

window.addEventListener('keydown', e => {
    if (keys.hasOwnProperty(e.key)) keys[e.key] = true;
});

window.addEventListener('keyup', e => {
    if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
});

// Setup Canvas size
function resizeCanvas() {
    canvas.width = 800;
    canvas.height = 600;
}
resizeCanvas();

function showScreen(screenName) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[screenName].classList.add('active');
}

function spawnStar() {
    // Spawn star above a random platform
    const pad = 20;
    const plat = platforms[Math.floor(Math.random() * platforms.length)];
    star.x = plat.x + pad + Math.random() * (plat.w - pad * 2);
    star.y = plat.y - 30; // Float above the platform
    star.active = true;
}

function createParticles(x, y) {
    for (let i = 0; i < 15; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 400,
            vy: (Math.random() - 0.5) * 400,
            life: 1.0
        });
    }
}

function startGame() {
    showScreen('game');
    score = 0;
    timeLeft = 30;
    
    // Reset Player
    player.x = 100;
    player.y = 300;
    player.vx = 0;
    player.vy = 0;
    
    particles = [];
    
    scoreEl.textContent = score;
    timeEl.textContent = timeLeft;
    gameOverTitle.textContent = "Tempo Esgotado!";
    
    spawnStar();
    
    lastTime = performance.now();
    gameLoopId = requestAnimationFrame(gameLoop);
    
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeLeft--;
        timeEl.textContent = timeLeft;
        if (timeLeft <= 0) {
            endGame("Tempo Esgotado!");
        }
    }, 1000);
}

function endGame(reason) {
    cancelAnimationFrame(gameLoopId);
    clearInterval(timerInterval);
    gameOverTitle.textContent = reason;
    finalScoreEl.textContent = score;
    showScreen('gameOver');
}

function AABB(r1, r2) {
    return r1.x < r2.x + r2.w &&
           r1.x + r1.w > r2.x &&
           r1.y < r2.y + r2.h &&
           r1.y + r1.h > r2.y;
}

function update(dt) {
    // Horizontal movement
    if (keys.ArrowLeft || keys.a) {
        player.vx = -player.speed;
    } else if (keys.ArrowRight || keys.d) {
        player.vx = player.speed;
    } else {
        player.vx = 0;
    }

    // Apply horizontal movement
    player.x += player.vx * dt;

    // Constrain to horizontal canvas bounds
    if (player.x < 0) player.x = 0;
    if (player.x + player.w > canvas.width) player.x = canvas.width - player.w;

    // Vertical movement & Gravity
    player.vy += gravity * dt;
    
    // Jump
    if ((keys.ArrowUp || keys.w) && player.isGrounded) {
        player.vy = player.jumpPower;
        player.isGrounded = false;
    }

    // Apply vertical movement
    player.y += player.vy * dt;
    
    player.isGrounded = false;

    // Platform collisions
    for (let plat of platforms) {
        if (AABB(player, plat)) {
            // Falling down (land on top)
            if (player.vy > 0 && player.y + player.h - (player.vy * dt) <= plat.y + 10) {
                player.y = plat.y - player.h;
                player.vy = 0;
                player.isGrounded = true;
            } 
            // Hitting head on bottom
            else if (player.vy < 0 && player.y - (player.vy * dt) >= plat.y + plat.h - 10) {
                player.y = plat.y + plat.h;
                player.vy = 0;
            }
        }
    }

    // Check game over by falling off
    if (player.y > canvas.height) {
        endGame("Você Caiu!");
        return;
    }

    // Obstacle collisions
    for (let obs of obstacles) {
        if (AABB(player, obs)) {
            endGame("Você Morreu!");
            return;
        }
    }

    // Check collision with star
    if (star.active) {
        // Simple circle-rect collision approx
        const testX = Math.max(player.x, Math.min(star.x, player.x + player.w));
        const testY = Math.max(player.y, Math.min(star.y, player.y + player.h));
        
        const distX = star.x - testX;
        const distY = star.y - testY;
        const distance = Math.sqrt((distX*distX) + (distY*distY));

        if (distance <= star.radius) {
            score++;
            scoreEl.textContent = score;
            createParticles(star.x, star.y);
            spawnStar();
        }
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt * 2;
        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function drawStar(ctx, x, y, radius, color) {
    ctx.shadowBlur = 15;
    ctx.shadowColor = color;
    ctx.fillStyle = color;
    
    ctx.beginPath();
    const spikes = 5;
    const outerRadius = radius;
    const innerRadius = radius / 2;
    let rot = Math.PI / 2 * 3;
    let cx = x;
    let cy = y;
    let step = Math.PI / spikes;

    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
        cx = x + Math.cos(rot) * outerRadius;
        cy = y + Math.sin(rot) * outerRadius;
        ctx.lineTo(cx, cy);
        rot += step;

        cx = x + Math.cos(rot) * innerRadius;
        cy = y + Math.sin(rot) * innerRadius;
        ctx.lineTo(cx, cy);
        rot += step;
    }
    ctx.lineTo(x, y - outerRadius);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw platforms
    ctx.fillStyle = '#1e293b';
    for (let plat of platforms) {
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
        // Top highlight
        ctx.fillStyle = '#475569';
        ctx.fillRect(plat.x, plat.y, plat.w, 4);
        ctx.fillStyle = '#1e293b'; // reset
    }

    // Draw obstacles (spikes)
    ctx.fillStyle = '#ef4444';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ef4444';
    for (let obs of obstacles) {
        ctx.beginPath();
        const spikeWidth = 10;
        const numSpikes = obs.w / spikeWidth;
        for(let i=0; i<numSpikes; i++) {
            const startX = obs.x + (i * spikeWidth);
            ctx.moveTo(startX, obs.y + obs.h);
            ctx.lineTo(startX + spikeWidth / 2, obs.y);
            ctx.lineTo(startX + spikeWidth, obs.y + obs.h);
        }
        ctx.fill();
    }
    ctx.shadowBlur = 0;

    // Draw star
    if (star.active) {
        const pulseRadius = star.radius + Math.sin(performance.now() / 150) * 2;
        drawStar(ctx, star.x, star.y, pulseRadius, '#f59e0b');
    }

    // Draw particles
    particles.forEach(p => {
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    // Draw player
    ctx.shadowBlur = 20;
    ctx.shadowColor = player.color;
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.w, player.h);
    
    ctx.fillStyle = '#fff';
    ctx.fillRect(player.x + 6, player.y + 6, player.w - 12, player.h - 12);
    ctx.shadowBlur = 0;
}

function gameLoop(timestamp) {
    const dt = Math.min((timestamp - lastTime) / 1000, 0.1); 
    lastTime = timestamp;

    update(dt);
    draw();

    if (timeLeft > 0 && screens.game.classList.contains('active')) {
        gameLoopId = requestAnimationFrame(gameLoop);
    }
}
