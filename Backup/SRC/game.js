/**
 * Faby's Flight - Event-Driven Flappy Bird Game
 * Powered by HTML5 Canvas & Web Audio API
 */

// Sound FX Controller using Web Audio API for zero file dependencies
class SoundFX {
    constructor() {
        this.ctx = null;
    }

    init() {
        if (!this.ctx) {
            // Lazy initialization on user interaction (required by browser autoplay policies)
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    playFlap() {
        this.init();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        // Quick frequency sweep upwards for a jumping sound
        osc.frequency.setValueAtTime(320, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(580, this.ctx.currentTime + 0.08);

        gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.08);
    }

    playScore() {
        this.init();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        // Double note chime
        osc.frequency.setValueAtTime(587.33, this.ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880, this.ctx.currentTime + 0.08); // A5

        gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.08, this.ctx.currentTime + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.22);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.22);
    }

    playCrash() {
        this.init();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        // Low descending crash sweep
        osc.frequency.setValueAtTime(170, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(30, this.ctx.currentTime + 0.35);

        gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.35);
    }
}

// Game Settings & Constants
const BASE_HEIGHT = 600;       // Logical game height used for physics coordinate mapping
const GROUND_HEIGHT = 80;

const PHYSICS = {
    GRAVITY: 0.36,         // Acceleration downwards
    FLAP_IMPULSE: -6.2,    // Upward velocity change
    TERMINAL_VELOCITY: 9,  // Max downward speed
    BIRD_X: 100            // Constant horizontal position
};

const DIFFICULTY_CONFIG = {
    easy: {
        gapSize: 165,
        speed: 2.0,
        spawnInterval: 120, // Frames between spawns
        name: 'Easy'
    },
    medium: {
        gapSize: 140,
        speed: 2.4,
        spawnInterval: 105,
        name: 'Medium'
    },
    hard: {
        gapSize: 118,
        speed: 2.8,
        spawnInterval: 90,
        name: 'Hard'
    }
};

const GAME_STATES = {
    START: 'START',
    PLAYING: 'PLAYING',
    GAMEOVER: 'GAMEOVER'
};

// Main Game Instance
class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.sound = new SoundFX();

        // UI DOM Elements
        this.startScreen = document.getElementById('start-screen');
        this.gameOverScreen = document.getElementById('game-over-screen');
        this.hud = document.getElementById('hud');
        this.scoreDisplay = document.getElementById('score-display');
        this.finalScoreDisplay = document.getElementById('final-score');
        this.highScoreDisplay = document.getElementById('high-score');
        this.gameOverDiffDisplay = document.getElementById('game-over-diff');
        this.hudDiffDisplay = document.getElementById('hud-diff');
        this.startBtn = document.getElementById('start-btn');
        this.restartBtn = document.getElementById('restart-btn');

        // Dynamic scale variables
        this.scale = 1;
        this.logicalWidth = 400; // Calculated on window resize

        // Difficulty State
        this.difficulty = localStorage.getItem('faby_difficulty') || 'medium';
        if (!DIFFICULTY_CONFIG[this.difficulty]) {
            this.difficulty = 'medium';
        }

        // Game state variables
        this.state = GAME_STATES.START;
        this.score = 0;

        // Game Entities
        this.bird = {
            y: 250,
            velocity: 0,
            radius: 14,
            wingAngle: 0,
            wingDirection: 1
        };
        this.pipes = [];
        this.clouds = [];
        this.groundOffset = 0;

        this.pipeSpawnTimer = 0;
        this.lastTime = 0;

        // Perform initial resize calculation
        this.resize();

        // Initialize clouds randomly distributed across the screen
        for (let i = 0; i < 5; i++) {
            this.clouds.push({
                x: Math.random() * this.logicalWidth,
                y: 50 + Math.random() * 120,
                speed: 0.15 + Math.random() * 0.2,
                scale: 0.6 + Math.random() * 0.8
            });
        }

        // Setup Event Listeners
        this.setupEventListeners();
        this.applyDifficulty(this.difficulty);
    }

    resize() {
        // Size the canvas to completely cover the screen/webpage
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        // Logical coordinate system calculation
        this.scale = this.canvas.height / BASE_HEIGHT;
        this.logicalWidth = this.canvas.width / this.scale;
    }

    setupEventListeners() {
        // Window Resize Event
        window.addEventListener('resize', () => {
            this.resize();
            if (this.state !== GAME_STATES.PLAYING) {
                this.render(); // Keep Start/Gameover views visually centered on resize
            }
        });

        // Event-driven inputs: Mouse click / Touch on canvas or screen buttons
        const handleActionInput = (e) => {
            // Prevent event execution when clicking button directly
            if (e.target && (e.target.classList.contains('btn') || e.target.classList.contains('diff-btn'))) return;
            this.handleAction();
        };

        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space' || e.code === 'ArrowUp') {
                e.preventDefault();
                this.handleAction();
            }
        });

        this.canvas.addEventListener('mousedown', handleActionInput);
        this.canvas.addEventListener('touchstart', handleActionInput);

        this.startBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.startGame();
        });

        this.restartBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.resetGame();
        });

        // Difficulty selectors click handler
        const diffButtons = document.querySelectorAll('.diff-btn');
        diffButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.state !== GAME_STATES.START) return;
                const selectedDiff = e.target.getAttribute('data-diff');
                this.applyDifficulty(selectedDiff);
                this.sound.playFlap();
            });
        });
    }

    applyDifficulty(diffKey) {
        this.difficulty = diffKey;
        localStorage.setItem('faby_difficulty', diffKey);

        // Update button visual styles
        const diffButtons = document.querySelectorAll('.diff-btn');
        diffButtons.forEach(btn => {
            if (btn.getAttribute('data-diff') === diffKey) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Load correct High Score for this difficulty
        this.highScore = parseInt(localStorage.getItem(`faby_high_score_${this.difficulty}`) || '0', 10);
        this.hudDiffDisplay.textContent = DIFFICULTY_CONFIG[this.difficulty].name;
        this.gameOverDiffDisplay.textContent = DIFFICULTY_CONFIG[this.difficulty].name;
    }

    handleAction() {
        if (this.state === GAME_STATES.START) {
            this.startGame();
        } else if (this.state === GAME_STATES.PLAYING) {
            this.flap();
        }
    }

    startGame() {
        this.state = GAME_STATES.PLAYING;
        this.startScreen.classList.add('hidden');
        this.hud.classList.remove('hud-hidden');
        this.sound.playFlap();
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.loop(t));
    }

    flap() {
        this.bird.velocity = PHYSICS.FLAP_IMPULSE;
        this.sound.playFlap();
    }

    resetGame() {
        this.score = 0;
        this.scoreDisplay.textContent = '0';
        this.bird.y = 250;
        this.bird.velocity = 0;
        this.bird.wingAngle = 0;
        this.pipes = [];
        this.pipeSpawnTimer = 0;
        
        this.gameOverScreen.classList.add('hidden');
        this.hud.classList.remove('hud-hidden');
        
        this.state = GAME_STATES.PLAYING;
        this.sound.playFlap();
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.loop(t));
    }

    triggerGameOver() {
        this.state = GAME_STATES.GAMEOVER;
        this.sound.playCrash();

        // Update High Score for active difficulty
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem(`faby_high_score_${this.difficulty}`, this.highScore);
        }

        // Show game over UI
        this.finalScoreDisplay.textContent = this.score;
        this.highScoreDisplay.textContent = this.highScore;
        this.gameOverScreen.classList.remove('hidden');
        this.hud.classList.add('hud-hidden');
    }

    spawnPipe() {
        const config = DIFFICULTY_CONFIG[this.difficulty];
        // Shrink the gap slightly over time to scale difficulty
        const dynamicGap = Math.max(config.gapSize - 20, config.gapSize - Math.floor(this.score / 6) * 3);
        const minHeight = 60;
        const maxHeight = BASE_HEIGHT - GROUND_HEIGHT - dynamicGap - minHeight;
        const topHeight = minHeight + Math.random() * (maxHeight - minHeight);

        this.pipes.push({
            x: this.logicalWidth, // Spawn at the right logical edge
            topHeight: topHeight,
            bottomY: topHeight + dynamicGap,
            width: 60,
            passed: false,
            // Speed scales slightly with score
            speed: config.speed + Math.min(1.0, (this.score / 15) * 0.2)
        });
    }

    // Main Game Loop
    loop(timestamp) {
        if (this.state !== GAME_STATES.PLAYING) return;

        // Calculate delta time
        const dt = timestamp - this.lastTime;
        this.lastTime = timestamp;

        this.update();
        this.render();

        requestAnimationFrame((t) => this.loop(t));
    }

    update() {
        const config = DIFFICULTY_CONFIG[this.difficulty];

        // 1. Update Clouds (aesthetic scrolling)
        this.clouds.forEach(cloud => {
            cloud.x -= cloud.speed;
            if (cloud.x < -100) {
                cloud.x = this.logicalWidth + 50;
                cloud.y = 50 + Math.random() * 120;
            }
        });

        // 2. Update Ground (scrolling illusion)
        this.groundOffset = (this.groundOffset - config.speed) % 24;

        // 3. Update Bird Physics
        this.bird.velocity += PHYSICS.GRAVITY;
        if (this.bird.velocity > PHYSICS.TERMINAL_VELOCITY) {
            this.bird.velocity = PHYSICS.TERMINAL_VELOCITY;
        }
        this.bird.y += this.bird.velocity;

        // Flapping wing animation speed
        this.bird.wingAngle += 0.18 * this.bird.wingDirection;
        if (Math.abs(this.bird.wingAngle) > 0.45) {
            this.bird.wingDirection *= -1;
        }

        // Collision Check: Ceiling & Ground
        if (this.bird.y - this.bird.radius <= 0) {
            this.bird.y = this.bird.radius;
            this.bird.velocity = 0.5;
        }
        if (this.bird.y + this.bird.radius >= BASE_HEIGHT - GROUND_HEIGHT) {
            this.bird.y = BASE_HEIGHT - GROUND_HEIGHT - this.bird.radius;
            this.triggerGameOver();
            return;
        }

        // 4. Update & Spawn Pipes
        this.pipeSpawnTimer++;
        if (this.pipeSpawnTimer >= config.spawnInterval) {
            this.spawnPipe();
            this.pipeSpawnTimer = 0;
        }

        for (let i = this.pipes.length - 1; i >= 0; i--) {
            const pipe = this.pipes[i];
            pipe.x -= pipe.speed;

            // Garbage collect offscreen pipes
            if (pipe.x + pipe.width < 0) {
                this.pipes.splice(i, 1);
                continue;
            }

            // Score check (once past the bird's center)
            if (!pipe.passed && pipe.x + pipe.width / 2 < PHYSICS.BIRD_X) {
                pipe.passed = true;
                this.score++;
                this.scoreDisplay.textContent = this.score;
                this.sound.playScore();
            }

            // Collision check with pipes
            if (this.checkCollision(this.bird, pipe)) {
                this.triggerGameOver();
                return;
            }
        }
    }

    checkCollision(bird, pipe) {
        // Precise AABB vs Circle collision check
        
        // Horizontal overlap
        const withinHorizontal = (PHYSICS.BIRD_X + bird.radius > pipe.x) && 
                                 (PHYSICS.BIRD_X - bird.radius < pipe.x + pipe.width);

        if (!withinHorizontal) return false;

        // Vertical overlap for top pipe
        const collidesTop = bird.y - bird.radius < pipe.topHeight;
        
        // Vertical overlap for bottom pipe
        const collidesBottom = bird.y + bird.radius > pipe.bottomY;

        return collidesTop || collidesBottom;
    }

    render() {
        const config = DIFFICULTY_CONFIG[this.difficulty];
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Save original transform and scale to fill browser height
        this.ctx.save();
        this.ctx.scale(this.scale, this.scale);

        // 1. Draw Sky Gradient covering logicalWidth
        const skyGrad = this.ctx.createLinearGradient(0, 0, 0, BASE_HEIGHT);
        skyGrad.addColorStop(0, '#0284c7'); // Bright ocean sky cyan
        skyGrad.addColorStop(0.5, '#38bdf8'); // Soft blue sky
        skyGrad.addColorStop(0.8, '#bae6fd'); // Sky blue near horizon
        skyGrad.addColorStop(1, '#ffedd5'); // Light warm peach horizon
        this.ctx.fillStyle = skyGrad;
        this.ctx.fillRect(0, 0, this.logicalWidth, BASE_HEIGHT);

        // 2. Draw Parallax Hills distributed dynamically based on logicalWidth
        this.ctx.fillStyle = '#bae6fd';
        this.ctx.beginPath();
        this.ctx.ellipse(this.logicalWidth * 0.2, BASE_HEIGHT - GROUND_HEIGHT, 150, 60, 0, 0, Math.PI * 2);
        this.ctx.ellipse(this.logicalWidth * 0.75, BASE_HEIGHT - GROUND_HEIGHT, 220, 80, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // 3. Draw Clouds
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
        this.clouds.forEach(cloud => {
            this.ctx.beginPath();
            const cx = cloud.x;
            const cy = cloud.y;
            const s = cloud.scale;

            this.ctx.arc(cx, cy, 18 * s, 0, Math.PI * 2);
            this.ctx.arc(cx + 12 * s, cy - 8 * s, 22 * s, 0, Math.PI * 2);
            this.ctx.arc(cx + 30 * s, cy, 15 * s, 0, Math.PI * 2);
            this.ctx.arc(cx + 15 * s, cy + 8 * s, 18 * s, 0, Math.PI * 2);
            this.ctx.fill();
        });

        // 4. Draw Pipes (Clean Modern Vector Design)
        this.pipes.forEach(pipe => {
            const pipeGrad = this.ctx.createLinearGradient(pipe.x, 0, pipe.x + pipe.width, 0);
            pipeGrad.addColorStop(0, '#10b981');  // Green-500
            pipeGrad.addColorStop(0.2, '#34d399'); // Lighter highlight green
            pipeGrad.addColorStop(0.7, '#059669'); // Shaded green-600
            pipeGrad.addColorStop(1, '#047857');   // Dark border green-700

            this.ctx.fillStyle = pipeGrad;
            this.ctx.strokeStyle = '#064e3b';
            this.ctx.lineWidth = 2.5;

            // Draw Top Pipe body
            this.ctx.fillRect(pipe.x, 0, pipe.width, pipe.topHeight);
            this.ctx.strokeRect(pipe.x, -5, pipe.width, pipe.topHeight + 5);

            // Draw Top Pipe cap
            const capHeight = 22;
            const capOffset = 3;
            this.ctx.fillRect(pipe.x - capOffset, pipe.topHeight - capHeight, pipe.width + capOffset * 2, capHeight);
            this.ctx.strokeRect(pipe.x - capOffset, pipe.topHeight - capHeight, pipe.width + capOffset * 2, capHeight);

            // Draw Bottom Pipe body
            const bottomBodyY = pipe.bottomY;
            const bottomHeight = BASE_HEIGHT - GROUND_HEIGHT - bottomBodyY;
            this.ctx.fillRect(pipe.x, bottomBodyY, pipe.width, bottomHeight);
            this.ctx.strokeRect(pipe.x, bottomBodyY, pipe.width, bottomHeight + 5);

            // Draw Bottom Pipe cap
            this.ctx.fillRect(pipe.x - capOffset, bottomBodyY, pipe.width + capOffset * 2, capHeight);
            this.ctx.strokeRect(pipe.x - capOffset, bottomBodyY, pipe.width + capOffset * 2, capHeight);
        });

        // 5. Draw Ground
        // Draw bottom soil base
        this.ctx.fillStyle = '#78350f'; // Warm brown base
        this.ctx.fillRect(0, BASE_HEIGHT - GROUND_HEIGHT, this.logicalWidth, GROUND_HEIGHT);

        // Draw lawn top layer
        this.ctx.fillStyle = '#059669'; // Grass dark green
        this.ctx.fillRect(0, BASE_HEIGHT - GROUND_HEIGHT, this.logicalWidth, 14);
        this.ctx.fillStyle = '#10b981'; // Grass light green
        this.ctx.fillRect(0, BASE_HEIGHT - GROUND_HEIGHT, this.logicalWidth, 6);

        // Draw rolling ground lines
        this.ctx.strokeStyle = '#047857';
        this.ctx.lineWidth = 2.5;
        this.ctx.beginPath();
        for (let x = this.groundOffset; x < this.logicalWidth + 24; x += 24) {
            this.ctx.moveTo(x, BASE_HEIGHT - GROUND_HEIGHT + 6);
            this.ctx.lineTo(x - 8, BASE_HEIGHT - GROUND_HEIGHT + 14);
        }
        this.ctx.stroke();

        // 6. Draw Faby the Bird (Premium Vector style)
        this.ctx.save();
        this.ctx.translate(PHYSICS.BIRD_X, this.bird.y);
        
        // Rotate bird depending on velocity
        const rotAngle = Math.min(Math.PI / 3.2, Math.max(-Math.PI / 10, this.bird.velocity * 0.08));
        this.ctx.rotate(rotAngle);

        // Shadow glow effect
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = 'rgba(251, 191, 36, 0.4)';

        // A. Tail feather
        this.ctx.fillStyle = '#f59e0b';
        this.ctx.strokeStyle = '#78350f';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(-this.bird.radius, 0);
        this.ctx.lineTo(-this.bird.radius - 8, -6);
        this.ctx.lineTo(-this.bird.radius - 6, 2);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();

        // B. Yellow Body (Gradient)
        const bodyGrad = this.ctx.createRadialGradient(-3, -3, 2, 0, 0, this.bird.radius);
        bodyGrad.addColorStop(0, '#fef08a'); // Soft yellow highlight
        bodyGrad.addColorStop(0.5, '#fbbf24'); // Amber yellow body
        bodyGrad.addColorStop(1, '#d97706'); // Shaded edge
        this.ctx.fillStyle = bodyGrad;
        this.ctx.strokeStyle = '#78350f'; // Dark outline
        this.ctx.lineWidth = 2.5;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, this.bird.radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        this.ctx.shadowBlur = 0; // Turn off shadow

        // Specular highlight on head
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        this.ctx.beginPath();
        this.ctx.arc(-4, -6, 4, 0, Math.PI * 2);
        this.ctx.fill();

        // C. Cute Pink Cheek Blush
        this.ctx.fillStyle = 'rgba(244, 63, 94, 0.35)';
        this.ctx.beginPath();
        this.ctx.arc(1, 4, 3.5, 0, Math.PI * 2);
        this.ctx.fill();

        // D. Large white eye
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(5, -4, 5.5, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        // Pupil
        this.ctx.fillStyle = '#000000';
        this.ctx.beginPath();
        this.ctx.arc(6.5, -4, 2.2, 0, Math.PI * 2);
        this.ctx.fill();

        // Eye specular highlight (white spot)
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(5.5, -5, 0.8, 0, Math.PI * 2);
        this.ctx.fill();

        // E. Orange Beak
        const beakGrad = this.ctx.createLinearGradient(10, 0, 20, 0);
        beakGrad.addColorStop(0, '#f97316');
        beakGrad.addColorStop(1, '#ea580c');
        this.ctx.fillStyle = beakGrad;
        this.ctx.beginPath();
        this.ctx.moveTo(11, -1.5);
        this.ctx.lineTo(21, 1.5);
        this.ctx.lineTo(10.5, 4.5);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();

        // F. Flapping Wing
        const wingGrad = this.ctx.createLinearGradient(-13, 0, 3, 0);
        wingGrad.addColorStop(0, '#fbbf24');
        wingGrad.addColorStop(1, '#d97706');
        this.ctx.fillStyle = wingGrad;
        this.ctx.save();
        this.ctx.translate(-4, 2);
        this.ctx.rotate(this.bird.wingAngle);
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, 8.5, 5.5, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.restore();

        this.ctx.restore();

        // Restore context transform
        this.ctx.restore();
    }
}

// Instantiate the game when the window completes loading
window.addEventListener('load', () => {
    window.gameInstance = new Game();
});
