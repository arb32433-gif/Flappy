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
        osc.frequency.setValueAtTime(350, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.08);

        gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
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

        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.25);
    }

    playCrash() {
        this.init();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        // Low descending crash sweep
        osc.frequency.setValueAtTime(180, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(40, this.ctx.currentTime + 0.35);

        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.35);
    }
}

// Game Settings & Constants
const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 600;
const GROUND_HEIGHT = 80;

const PHYSICS = {
    GRAVITY: 0.36,         // Acceleration downwards
    FLAP_IMPULSE: -6.2,    // Upward velocity change
    TERMINAL_VELOCITY: 9,  // Max downward speed
    BIRD_X: 100            // Constant horizontal position
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
        this.startBtn = document.getElementById('start-btn');
        this.restartBtn = document.getElementById('restart-btn');

        // State variables
        this.state = GAME_STATES.START;
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('faby_high_score') || '0', 10);

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

        // Initialize clouds
        for (let i = 0; i < 4; i++) {
            this.clouds.push({
                x: Math.random() * CANVAS_WIDTH,
                y: 50 + Math.random() * 120,
                speed: 0.2 + Math.random() * 0.3,
                scale: 0.6 + Math.random() * 0.8
            });
        }

        // Setup Event Listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Event-driven inputs: Mouse click / Touch on canvas or screen buttons
        const handleActionInput = (e) => {
            // Prevent event execution when clicking button directly
            if (e.target && e.target.classList.contains('btn')) return;
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
    }

    handleAction() {
        if (this.state === GAME_STATES.START) {
            this.startGame();
        } else if (this.state === GAME_STATES.PLAYING) {
            this.flap();
        } else if (this.state === GAME_STATES.GAMEOVER) {
            // Optional: restart on action
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

        // Update High Score
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('faby_high_score', this.highScore);
        }

        // Show game over UI
        this.finalScoreDisplay.textContent = this.score;
        this.highScoreDisplay.textContent = this.highScore;
        this.gameOverScreen.classList.remove('hidden');
        this.hud.classList.add('hud-hidden');
    }

    spawnPipe() {
        const gapSize = Math.max(125, 150 - Math.floor(this.score / 5) * 3); // Slightly narrowing gap for progressive difficulty
        const minHeight = 60;
        const maxHeight = CANVAS_HEIGHT - GROUND_HEIGHT - gapSize - minHeight;
        const topHeight = minHeight + Math.random() * (maxHeight - minHeight);

        this.pipes.push({
            x: CANVAS_WIDTH,
            topHeight: topHeight,
            bottomY: topHeight + gapSize,
            width: 60,
            passed: false,
            speed: 2.3 + Math.min(1.2, (this.score / 15) * 0.3) // Speed increases slightly as score goes up
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
        // 1. Update Clouds (aesthetic scrolling)
        this.clouds.forEach(cloud => {
            cloud.x -= cloud.speed;
            if (cloud.x < -100) {
                cloud.x = CANVAS_WIDTH + 50;
                cloud.y = 50 + Math.random() * 120;
            }
        });

        // 2. Update Ground (scrolling illusion)
        this.groundOffset = (this.groundOffset - 2.3) % 24;

        // 3. Update Bird Physics
        this.bird.velocity += PHYSICS.GRAVITY;
        if (this.bird.velocity > PHYSICS.TERMINAL_VELOCITY) {
            this.bird.velocity = PHYSICS.TERMINAL_VELOCITY;
        }
        this.bird.y += this.bird.velocity;

        // Flapping wing animation helper
        this.bird.wingAngle += 0.15 * this.bird.wingDirection;
        if (Math.abs(this.bird.wingAngle) > 0.4) {
            this.bird.wingDirection *= -1;
        }

        // Collision Check: Ceiling & Ground
        if (this.bird.y - this.bird.radius <= 0) {
            this.bird.y = this.bird.radius;
            this.bird.velocity = 0.5; // push down slightly
        }
        if (this.bird.y + this.bird.radius >= CANVAS_HEIGHT - GROUND_HEIGHT) {
            this.bird.y = CANVAS_HEIGHT - GROUND_HEIGHT - this.bird.radius;
            this.triggerGameOver();
            return;
        }

        // 4. Update & Spawn Pipes
        this.pipeSpawnTimer++;
        if (this.pipeSpawnTimer >= 105) { // Roughly spawn a pipe every 105 frames (~1.7 seconds)
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
        // AABB (Axis-Aligned Bounding Box) vs Circle collision check
        
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
        // Clear canvas
        this.ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // 1. Draw Sky Gradient
        const skyGrad = this.ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
        skyGrad.addColorStop(0, '#0284c7'); // Bright ocean sky cyan
        skyGrad.addColorStop(0.6, '#38bdf8'); // Soft blue sky
        skyGrad.addColorStop(0.85, '#bae6fd'); // Sky blue near horizon
        skyGrad.addColorStop(1, '#ffedd5'); // Light warm peach horizon
        this.ctx.fillStyle = skyGrad;
        this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // 2. Draw Clouds
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        this.clouds.forEach(cloud => {
            this.ctx.beginPath();
            const cx = cloud.x;
            const cy = cloud.y;
            const s = cloud.scale;

            this.ctx.arc(cx, cy, 20 * s, 0, Math.PI * 2);
            this.ctx.arc(cx + 15 * s, cy - 10 * s, 25 * s, 0, Math.PI * 2);
            this.ctx.arc(cx + 35 * s, cy, 18 * s, 0, Math.PI * 2);
            this.ctx.arc(cx + 15 * s, cy + 10 * s, 20 * s, 0, Math.PI * 2);
            this.ctx.fill();
        });

        // 3. Draw Pipes
        this.pipes.forEach(pipe => {
            // Pipe style gradient
            const pipeGrad = this.ctx.createLinearGradient(pipe.x, 0, pipe.x + pipe.width, 0);
            pipeGrad.addColorStop(0, '#10b981');  // Green-500
            pipeGrad.addColorStop(0.2, '#34d399'); // Lighter highlight green
            pipeGrad.addColorStop(0.7, '#059669'); // Shaded green-600
            pipeGrad.addColorStop(1, '#047857');   // Dark border green-700

            this.ctx.fillStyle = pipeGrad;
            this.ctx.strokeStyle = '#064e3b';
            this.ctx.lineWidth = 3;

            // Draw Top Pipe body
            this.ctx.fillRect(pipe.x, 0, pipe.width, pipe.topHeight);
            this.ctx.strokeRect(pipe.x, -5, pipe.width, pipe.topHeight + 5);

            // Draw Top Pipe cap
            const capHeight = 24;
            const capOffset = 4;
            this.ctx.fillRect(pipe.x - capOffset, pipe.topHeight - capHeight, pipe.width + capOffset * 2, capHeight);
            this.ctx.strokeRect(pipe.x - capOffset, pipe.topHeight - capHeight, pipe.width + capOffset * 2, capHeight);

            // Draw Bottom Pipe body
            const bottomBodyY = pipe.bottomY;
            const bottomHeight = CANVAS_HEIGHT - GROUND_HEIGHT - bottomBodyY;
            this.ctx.fillRect(pipe.x, bottomBodyY, pipe.width, bottomHeight);
            this.ctx.strokeRect(pipe.x, bottomBodyY, pipe.width, bottomHeight + 5);

            // Draw Bottom Pipe cap
            this.ctx.fillRect(pipe.x - capOffset, bottomBodyY, pipe.width + capOffset * 2, capHeight);
            this.ctx.strokeRect(pipe.x - capOffset, bottomBodyY, pipe.width + capOffset * 2, capHeight);
        });

        // 4. Draw Ground
        // Draw bottom soil base
        this.ctx.fillStyle = '#78350f'; // Warm brown base
        this.ctx.fillRect(0, CANVAS_HEIGHT - GROUND_HEIGHT, CANVAS_WIDTH, GROUND_HEIGHT);

        // Draw lawn top layer
        this.ctx.fillStyle = '#059669'; // Grass dark green
        this.ctx.fillRect(0, CANVAS_HEIGHT - GROUND_HEIGHT, CANVAS_WIDTH, 14);
        this.ctx.fillStyle = '#10b981'; // Grass light green
        this.ctx.fillRect(0, CANVAS_HEIGHT - GROUND_HEIGHT, CANVAS_WIDTH, 6);

        // Draw rolling ground lines
        this.ctx.strokeStyle = '#047857';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        for (let x = this.groundOffset; x < CANVAS_WIDTH + 24; x += 24) {
            this.ctx.moveTo(x, CANVAS_HEIGHT - GROUND_HEIGHT + 6);
            this.ctx.lineTo(x - 8, CANVAS_HEIGHT - GROUND_HEIGHT + 14);
        }
        this.ctx.stroke();

        // 5. Draw Faby the Bird
        this.ctx.save();
        this.ctx.translate(PHYSICS.BIRD_X, this.bird.y);
        
        // Rotate bird depending on vertical speed/angle
        const rotAngle = Math.min(Math.PI / 3, Math.max(-Math.PI / 8, this.bird.velocity * 0.08));
        this.ctx.rotate(rotAngle);

        // Shadow glow effect
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = 'rgba(251, 191, 36, 0.4)';

        // A. Yellow Body
        this.ctx.fillStyle = '#fbbf24'; // Warm yellow body
        this.ctx.strokeStyle = '#78350f'; // Dark outline
        this.ctx.lineWidth = 2.5;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, this.bird.radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        this.ctx.shadowBlur = 0; // Turn off shadow

        // B. Large white eye
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(5, -4, 5, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        // Pupil
        this.ctx.fillStyle = '#000000';
        this.ctx.beginPath();
        this.ctx.arc(6.5, -4, 2, 0, Math.PI * 2);
        this.ctx.fill();

        // C. Orange Beak
        this.ctx.fillStyle = '#f97316'; // Vivid orange
        this.ctx.beginPath();
        this.ctx.moveTo(11, -1);
        this.ctx.lineTo(20, 2);
        this.ctx.lineTo(10, 5);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();

        // D. Flapping Wing
        this.ctx.fillStyle = '#f59e0b'; // Slightly darker orange-yellow
        this.ctx.save();
        this.ctx.translate(-5, 1);
        // Tilt the wing depending on wing flapping state
        this.ctx.rotate(this.bird.wingAngle);
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, 8, 5, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.restore();

        this.ctx.restore();
    }
}

// Instantiate the game when the window completes loading
window.addEventListener('load', () => {
    window.gameInstance = new Game();
});
