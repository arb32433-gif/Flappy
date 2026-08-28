/**
 * Faby's Flight - Event-Driven Flappy Bird Game
 * Powered by HTML5 Canvas & Web Audio API
 */

// ===================== SOUND FX =====================
class SoundFX {
    constructor() {
        this.ctx = null;
        this.muted = false;
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    playFlap() {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
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
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, this.ctx.currentTime);
        osc.frequency.setValueAtTime(880, this.ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.08, this.ctx.currentTime + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.22);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.22);
    }

    playCrash() {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
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

// ===================== SAVE MANAGER =====================
class SaveManager {
    static KEY = 'faby_save';

    static save(state) {
        try {
            localStorage.setItem(SaveManager.KEY, JSON.stringify(state));
        } catch (e) {
            console.warn('Save failed:', e);
        }
    }

    static load() {
        try {
            const raw = localStorage.getItem(SaveManager.KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    static hasSave() {
        return localStorage.getItem(SaveManager.KEY) !== null;
    }

    static deleteSave() {
        localStorage.removeItem(SaveManager.KEY);
    }
}

// ===================== HISTORY MANAGER =====================
class HistoryManager {
    static KEY = 'faby_gameplays';

    static getAll() {
        try {
            const raw = localStorage.getItem(HistoryManager.KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    static addRecord(record) {
        const records = HistoryManager.getAll();
        records.unshift(record);
        if (records.length > 50) records.length = 50;
        try {
            localStorage.setItem(HistoryManager.KEY, JSON.stringify(records));
        } catch (e) {
            console.warn('History save failed:', e);
        }
    }

    static deleteRecord(id) {
        const records = HistoryManager.getAll().filter(r => r.id !== id);
        localStorage.setItem(HistoryManager.KEY, JSON.stringify(records));
    }
}

// ===================== SCORE API =====================
class ScoreAPI {
    static BASE = '/api/scores';

    static async postScore(score, difficulty) {
        try {
            const res = await fetch(ScoreAPI.BASE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ score, difficulty })
            });
            return await res.json();
        } catch (e) {
            console.warn('API post failed, using local fallback:', e);
            return { ok: false };
        }
    }

    static async getScores(difficulty) {
        try {
            const url = difficulty ? `${ScoreAPI.BASE}?difficulty=${difficulty}` : ScoreAPI.BASE;
            const res = await fetch(url);
            const data = await res.json();
            return data.scores || [];
        } catch (e) {
            console.warn('API get failed, using local fallback:', e);
            return HistoryManager.getAll();
        }
    }

    static async getHighScore(difficulty) {
        try {
            const url = difficulty ? `${ScoreAPI.BASE}?difficulty=${difficulty}` : ScoreAPI.BASE;
            const res = await fetch(url);
            const data = await res.json();
            return data.high_score || 0;
        } catch (e) {
            return parseInt(localStorage.getItem(`faby_high_score_${difficulty}`) || '0', 10);
        }
    }

    static async deleteScore(id) {
        try {
            await fetch(`${ScoreAPI.BASE}/${id}`, { method: 'DELETE' });
            return true;
        } catch (e) {
            console.warn('API delete failed:', e);
            return false;
        }
    }
}

// ===================== CONSTANTS =====================
const BASE_HEIGHT = 600;
const GROUND_HEIGHT = 80;
const FRAME_TIME = 16.667;
const MAX_DT = 50;

const PHYSICS = {
    GRAVITY: 0.36,
    FLAP_IMPULSE: -6.2,
    TERMINAL_VELOCITY: 9,
    BIRD_X: 100
};

const DIFFICULTY_CONFIG = {
    easy:   { gapSize: 140, speed: 2.2, spawnInterval: 110, name: 'Easy' },
    medium: { gapSize: 128, speed: 2.6, spawnInterval: 98,  name: 'Medium' },
    hard:   { gapSize: 118, speed: 2.8, spawnInterval: 90,  name: 'Hard' }
};

const SKINS = {
    gold: {
        body: ['#fef08a', '#fbbf24', '#d97706'],
        tail: '#f59e0b',
        cheek: 'rgba(244, 63, 94, 0.35)',
        glow: 'rgba(251, 191, 36, 0.4)'
    },
    neon: {
        body: ['#e0f2fe', '#06b6d4', '#0891b2'],
        tail: '#ec4899',
        cheek: 'rgba(236, 72, 153, 0.35)',
        glow: 'rgba(6, 182, 212, 0.4)'
    },
    ruby: {
        body: ['#fee2e2', '#ef4444', '#b91c1c'],
        tail: '#f97316',
        cheek: 'rgba(253, 224, 71, 0.35)',
        glow: 'rgba(239, 68, 68, 0.4)'
    },
    emerald: {
        body: ['#dcfce7', '#10b981', '#047857'],
        tail: '#fbbf24',
        cheek: 'rgba(56, 189, 248, 0.35)',
        glow: 'rgba(16, 185, 129, 0.4)'
    }
};

const GAME_STATES = {
    MENU: 'MENU',
    PLAYING: 'PLAYING',
    REPLAYING: 'REPLAYING',
    DATA: 'DATA',
    GAMEOVER: 'GAMEOVER'
};

// ===================== GAME =====================
class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.sound = new SoundFX();

        // DOM - overlays
        this.mainMenu = document.getElementById('main-menu');
        this.gameOverScreen = document.getElementById('game-over-screen');
        this.dataScreen = document.getElementById('data-screen');

        // DOM - buttons
        this.resumeBtn = document.getElementById('resume-btn');
        this.newGameBtn = document.getElementById('new-game-btn');
        this.dataBtn = document.getElementById('data-btn');
        this.restartBtn = document.getElementById('restart-btn');
        this.goMenuBtn = document.getElementById('go-menu-btn');
        this.dataBackBtn = document.getElementById('data-back-btn');
        this.soundToggleBtn = document.getElementById('sound-toggle-btn');

        // DOM - HUD
        this.hud = document.getElementById('hud');
        this.scoreDisplay = document.getElementById('score-display');
        this.hudDiffDisplay = document.getElementById('hud-diff');

        // DOM - game over
        this.finalScoreDisplay = document.getElementById('final-score');
        this.highScoreDisplay = document.getElementById('high-score');
        this.gameOverDiffDisplay = document.getElementById('game-over-diff');

        // Scale
        this.scale = 1;
        this.logicalWidth = 400;

        // Difficulty
        this.difficulty = localStorage.getItem('faby_difficulty') || 'medium';
        if (!DIFFICULTY_CONFIG[this.difficulty]) this.difficulty = 'medium';

        // Bird Skin
        this.skin = localStorage.getItem('faby_skin') || 'gold';
        if (!SKINS[this.skin]) this.skin = 'gold';

        // Audio Mute
        this.muted = localStorage.getItem('faby_muted') === 'true';

        // State
        this.state = GAME_STATES.MENU;
        this.score = 0;
        this.highScore = 0;

        // Entities
        this.bird = { y: 250, velocity: 0, radius: 14, wingAngle: 0, wingDirection: 1 };
        this.pipes = [];
        this.clouds = [];
        this.groundOffset = 0;
        this.pipeSpawnAccum = 0;
        this.lastTime = 0;
        this.running = false;

        // Attract mode
        this.attractTimer = 0;
        this.attractFlapInterval = 60;

        // Init
        this.resize();
        this.initClouds();
        this.setupEventListeners();
        this.applyMutedState();
        this.applyDifficulty(this.difficulty);
        this.applySkin(this.skin);
        this.enterMenu();
    }

    // ---- Setup ----

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.scale = this.canvas.height / BASE_HEIGHT;
        this.logicalWidth = this.canvas.width / this.scale;
    }

    initClouds() {
        this.clouds = [];
        for (let i = 0; i < 5; i++) {
            this.clouds.push({
                x: Math.random() * this.logicalWidth,
                y: 50 + Math.random() * 120,
                speed: 0.15 + Math.random() * 0.2,
                scale: 0.6 + Math.random() * 0.8
            });
        }
    }

    setupEventListeners() {
        window.addEventListener('resize', () => {
            this.resize();
            if (!this.running) this.render();
        });

        const handleActionInput = (e) => {
            if (e.target && (
                e.target.classList.contains('btn') ||
                e.target.classList.contains('diff-select-btn') ||
                e.target.classList.contains('menu-btn') ||
                e.target.classList.contains('record-btn') ||
                e.target.classList.contains('skin-btn') ||
                e.target.classList.contains('sound-toggle-btn') ||
                e.target.closest('.sound-toggle-btn') ||
                e.target.closest('.skin-btn') ||
                e.target.closest('.diff-select-btn') ||
                e.target.closest('.menu-nav')
            )) return;
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

        // Main menu buttons
        this.resumeBtn.addEventListener('click', (e) => { e.stopPropagation(); this.resumeGame(); });
        this.newGameBtn.addEventListener('click', (e) => { e.stopPropagation(); this.newGame(); });
        this.dataBtn.addEventListener('click', (e) => { e.stopPropagation(); this.enterData(); });

        // Game over buttons
        this.restartBtn.addEventListener('click', (e) => { e.stopPropagation(); this.newGame(); });
        this.goMenuBtn.addEventListener('click', (e) => { e.stopPropagation(); this.enterMenu(); });

        // Data screen back
        this.dataBackBtn.addEventListener('click', (e) => { e.stopPropagation(); this.enterMenu(); });

        // Difficulty selectors (Segmented)
        document.querySelectorAll('.diff-select-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.applyDifficulty(btn.getAttribute('data-diff'));
                this.sound.playFlap();
            });
        });

        // Skin selectors
        document.querySelectorAll('.skin-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.applySkin(btn.getAttribute('data-skin'));
                this.sound.playFlap();
            });
        });

        // Sound Toggle
        if (this.soundToggleBtn) {
            this.soundToggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleMute();
            });
        }
    }

    applyDifficulty(diffKey) {
        this.difficulty = diffKey;
        localStorage.setItem('faby_difficulty', diffKey);
        document.querySelectorAll('.diff-select-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-diff') === diffKey);
        });
        this.highScore = parseInt(localStorage.getItem(`faby_high_score_${this.difficulty}`) || '0', 10);
        this.hudDiffDisplay.textContent = DIFFICULTY_CONFIG[this.difficulty].name;
        this.gameOverDiffDisplay.textContent = DIFFICULTY_CONFIG[this.difficulty].name;

        // Load stats card
        this.loadMenuStats();

        // Update high score from API
        ScoreAPI.getHighScore(this.difficulty).then(apiHigh => {
            if (apiHigh > this.highScore) {
                this.highScore = apiHigh;
                localStorage.setItem(`faby_high_score_${this.difficulty}`, this.highScore);
                this.loadMenuStats();
            }
        });
    }

    applySkin(skinKey) {
        this.skin = skinKey;
        localStorage.setItem('faby_skin', skinKey);
        document.querySelectorAll('.skin-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-skin') === skinKey);
        });
        this.drawSkinPreview();
    }

    drawSkinPreview() {
        const previewCanvas = document.getElementById('skin-preview-canvas');
        if (!previewCanvas) return;
        const pctx = previewCanvas.getContext('2d');
        pctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

        // Wing flapping angle based on time
        const time = performance.now() * 0.012;
        const previewWingAngle = Math.sin(time) * 0.45;

        pctx.save();
        pctx.translate(previewCanvas.width / 2, previewCanvas.height / 2 + 3);
        this.drawBird(pctx, 0, 0, previewWingAngle, this.skin, 0);
        pctx.restore();
    }

    toggleMute() {
        this.muted = !this.muted;
        localStorage.setItem('faby_muted', this.muted);
        this.applyMutedState();
        if (!this.muted) {
            this.sound.playFlap();
        }
    }

    applyMutedState() {
        this.sound.muted = this.muted;
        if (this.soundToggleBtn) {
            this.soundToggleBtn.classList.toggle('muted', this.muted);
            const statusEl = this.soundToggleBtn.querySelector('.sound-status');
            const iconEl = this.soundToggleBtn.querySelector('.sound-icon');
            if (statusEl) statusEl.textContent = this.muted ? 'MUTED' : 'ON';
            if (iconEl) iconEl.innerHTML = this.muted ? '&#128263;' : '&#128266;';
        }
    }

    async loadMenuStats() {
        try {
            const res = await fetch(`/api/scores/stats?difficulty=${this.difficulty}`);
            if (!res.ok) throw new Error('API server error');
            const stats = await res.json();
            
            const highEl = document.getElementById('stat-high');
            const totalEl = document.getElementById('stat-total');
            const avgEl = document.getElementById('stat-avg');
            
            if (highEl) highEl.textContent = stats.high_score || 0;
            if (totalEl) totalEl.textContent = stats.total_games || 0;
            if (avgEl) avgEl.textContent = Math.round(stats.avg_score) || 0;
        } catch (e) {
            console.warn('Failed to load stats, using local fallback:', e);
            const records = HistoryManager.getAll().filter(r => r.difficulty === this.difficulty);
            const high = parseInt(localStorage.getItem(`faby_high_score_${this.difficulty}`) || '0', 10);
            const total = records.length;
            const avg = total > 0 ? Math.round(records.reduce((acc, r) => acc + r.score, 0) / total) : 0;
            
            const highEl = document.getElementById('stat-high');
            const totalEl = document.getElementById('stat-total');
            const avgEl = document.getElementById('stat-avg');
            
            if (highEl) highEl.textContent = high;
            if (totalEl) totalEl.textContent = total;
            if (avgEl) avgEl.textContent = avg;
        }
    }

    // ---- State Transitions ----

    enterMenu() {
        this.state = GAME_STATES.MENU;
        this.running = false;

        // Hide all overlays, show menu
        if (this.gameOverScreen) this.gameOverScreen.classList.add('hidden');
        if (this.dataScreen) this.dataScreen.classList.add('hidden');
        if (this.mainMenu) this.mainMenu.classList.remove('hidden');
        if (this.hud) this.hud.classList.add('hud-hidden');

        // Update resume button state
        if (this.resumeBtn) this.resumeBtn.disabled = !SaveManager.hasSave();

        // Load menu stats & preview skin
        this.loadMenuStats();
        this.drawSkinPreview();

        // Reset bird for attract mode
        this.resetEntitiesForAttract();
        this.startAttractLoop();
    }

    enterData() {
        this.state = GAME_STATES.DATA;
        this.running = false;

        if (this.mainMenu) this.mainMenu.classList.add('hidden');
        if (this.gameOverScreen) this.gameOverScreen.classList.add('hidden');
        if (this.dataScreen) this.dataScreen.classList.remove('hidden');
        if (this.hud) this.hud.classList.add('hud-hidden');

        this.populateDataList();
        this.resetEntitiesForAttract();
        this.startAttractLoop();
    }

    enterGamePlaying() {
        this.state = GAME_STATES.PLAYING;
        if (this.mainMenu) this.mainMenu.classList.add('hidden');
        if (this.gameOverScreen) this.gameOverScreen.classList.add('hidden');
        if (this.dataScreen) this.dataScreen.classList.add('hidden');
        if (this.hud) this.hud.classList.remove('hud-hidden');
        if (this.scoreDisplay) this.scoreDisplay.textContent = this.score;
    }

    enterGameOver() {
        this.state = GAME_STATES.GAMEOVER;
        this.running = false;
        this.sound.playCrash();

        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem(`faby_high_score_${this.difficulty}`, this.highScore);
        }

        if (this.finalScoreDisplay) this.finalScoreDisplay.textContent = this.score;
        if (this.highScoreDisplay) this.highScoreDisplay.textContent = this.highScore;
        if (this.gameOverScreen) this.gameOverScreen.classList.remove('hidden');
        if (this.hud) this.hud.classList.add('hud-hidden');

        ScoreAPI.postScore(this.score, this.difficulty).then(res => {
            if (res.ok && res.high_score > this.highScore) {
                this.highScore = res.high_score;
                if (this.highScoreDisplay) this.highScoreDisplay.textContent = this.highScore;
            }
            this.loadMenuStats(); // Keep stats in sync
        });
    }

    // ---- Game Actions ----

    handleAction() {
        if (this.state === GAME_STATES.PLAYING || this.state === GAME_STATES.REPLAYING) {
            this.flap();
        }
    }

    flap() {
        this.bird.velocity = PHYSICS.FLAP_IMPULSE;
        this.sound.playFlap();
    }

    newGame() {
        this.resetGameState();
        SaveManager.deleteSave();
        this.applyDifficulty(this.difficulty);
        this.enterGamePlaying();
        this.lastTime = performance.now();
        this.running = true;
        requestAnimationFrame((t) => this.loop(t));
    }

    resumeGame() {
        const saved = SaveManager.load();
        if (!saved) return;

        this.difficulty = saved.difficulty;
        this.score = saved.score;
        this.bird = { ...saved.bird };
        this.pipes = saved.pipes.map(p => ({ ...p }));
        this.clouds = saved.clouds.map(c => ({ ...c }));
        this.groundOffset = saved.groundOffset;
        this.pipeSpawnAccum = saved.pipeSpawnAccum;
        this.applyDifficulty(this.difficulty);

        this.enterGamePlaying();
        this.lastTime = performance.now();
        this.running = true;
        requestAnimationFrame((t) => this.loop(t));
    }

    replayGame(recordId) {
        // Try fetching the logs to get the recorded state
        ScoreAPI.getScores().then(records => {
            const record = records.find(r => r.id === recordId);
            if (!record) return;

            // Wait, is there a saveState in our API record? Let's check:
            // Since the API only returns id, score, difficulty, is_high, created_at,
            // we should fall back to local saveState from HistoryManager if needed.
            let saved = null;
            if (record.saveState) {
                saved = record.saveState;
            } else {
                const localRecords = HistoryManager.getAll();
                const localRecord = localRecords.find(r => r.id === recordId);
                if (localRecord && localRecord.saveState) {
                    saved = localRecord.saveState;
                }
            }

            if (!saved) {
                alert("Could not load recorded flight state for replay.");
                return;
            }

            this.difficulty = saved.difficulty;
            this.score = saved.score;
            this.bird = { ...saved.bird };
            this.pipes = saved.pipes.map(p => ({ ...p }));
            this.clouds = saved.clouds.map(c => ({ ...c }));
            this.groundOffset = saved.groundOffset;
            this.pipeSpawnAccum = saved.pipeSpawnAccum;
            this.applyDifficulty(this.difficulty);

            this.state = GAME_STATES.REPLAYING;
            if (this.mainMenu) this.mainMenu.classList.add('hidden');
            if (this.gameOverScreen) this.gameOverScreen.classList.add('hidden');
            if (this.dataScreen) this.dataScreen.classList.add('hidden');
            if (this.hud) this.hud.classList.remove('hud-hidden');
            if (this.scoreDisplay) this.scoreDisplay.textContent = this.score;

            this.lastTime = performance.now();
            this.running = true;
            requestAnimationFrame((t) => this.loop(t));
        });
    }

    // ---- Save / History ----

    saveCurrentGame() {
        SaveManager.save({
            score: this.score,
            difficulty: this.difficulty,
            bird: { ...this.bird },
            pipes: this.pipes.map(p => ({ ...p })),
            clouds: this.clouds.map(c => ({ ...c })),
            groundOffset: this.groundOffset,
            pipeSpawnAccum: this.pipeSpawnAccum
        });
    }

    createGameplayRecord() {
        const record = {
            id: Date.now(),
            difficulty: this.difficulty,
            score: this.score,
            date: new Date().toISOString(),
            saveState: {
                score: this.score,
                difficulty: this.difficulty,
                bird: { ...this.bird },
                pipes: this.pipes.map(p => ({ ...p })),
                clouds: this.clouds.map(c => ({ ...c })),
                groundOffset: this.groundOffset,
                pipeSpawnAccum: this.pipeSpawnAccum
            }
        };
        // Add to local history manager (used for replay fallback)
        HistoryManager.addRecord(record);
    }

    deleteGameplayRecord(id) {
        ScoreAPI.deleteScore(id).then(() => {
            this.populateDataList();
            this.loadMenuStats();
        });
    }

    // ---- Data Screen ----

    populateDataList() {
        ScoreAPI.getScores().then(records => {
            const tbody = document.getElementById('data-tbody');
            const emptyMsg = document.getElementById('data-empty');
            const countEl = document.getElementById('data-count');

            if (!tbody) return;

            if (records.length === 0) {
                tbody.innerHTML = '';
                if (emptyMsg) emptyMsg.classList.add('visible');
                if (countEl) countEl.textContent = '0 records';
                return;
            }

            if (emptyMsg) emptyMsg.classList.remove('visible');
            if (countEl) countEl.textContent = `${records.length} record${records.length !== 1 ? 's' : ''}`;

            tbody.innerHTML = records.map((r, i) => {
                const diffClass = `diff-badge-${r.difficulty}`;
                const diffName = DIFFICULTY_CONFIG[r.difficulty]?.name || r.difficulty;
                const date = new Date(r.created_at || r.date);
                const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                const timeStr = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                const highBadge = r.is_high ? '<span class="high-badge">HIGH</span>' : '';
                return `
                    <tr class="data-row" data-id="${r.id}">
                        <td class="td-num">${i + 1}</td>
                        <td class="td-diff"><span class="diff-badge ${diffClass}">${diffName}</span></td>
                        <td class="td-score">${r.score} ${highBadge}</td>
                        <td class="td-date">${dateStr} ${timeStr}</td>
                        <td class="td-actions">
                            <button class="record-btn record-btn-replay" data-action="replay" data-id="${r.id}">Replay</button>
                            <button class="record-btn record-btn-delete" data-action="delete" data-id="${r.id}">Del</button>
                        </td>
                    </tr>
                `;
            }).join('');

            // Bind Replay
            tbody.querySelectorAll('.record-btn-replay').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const id = parseInt(btn.getAttribute('data-id'), 10);
                    this.replayGame(id);
                });
            });

            // Bind Delete
            tbody.querySelectorAll('.record-btn-delete').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const id = parseInt(btn.getAttribute('data-id'), 10);
                    if (confirm("Are you sure you want to delete this flight record?")) {
                        ScoreAPI.deleteScore(id).then(() => {
                            this.populateDataList();
                            this.loadMenuStats();
                        });
                    }
                });
            });
        });
    }

    // ---- Reset Helpers ----

    resetGameState() {
        this.score = 0;
        this.bird = { y: 250, velocity: 0, radius: 14, wingAngle: 0, wingDirection: 1 };
        this.pipes = [];
        this.pipeSpawnAccum = 0;
        this.groundOffset = 0;
        this.initClouds();
    }

    resetEntitiesForAttract() {
        this.score = 0;
        this.bird = { y: 250, velocity: 0, radius: 14, wingAngle: 0, wingDirection: 1 };
        this.pipes = [];
        this.pipeSpawnAccum = 0;
        this.groundOffset = 0;
        this.attractTimer = 0;
        this.attractFlapInterval = 40 + Math.floor(Math.random() * 40);
        this.initClouds();
    }

    // ---- Attract Mode (Live Background) ----

    startAttractLoop() {
        if (this.running) return;
        this.running = true;
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.attractLoop(t));
    }

    attractLoop(timestamp) {
        if (this.state !== GAME_STATES.MENU && this.state !== GAME_STATES.DATA) {
            this.running = false;
            return;
        }

        let dt = timestamp - this.lastTime;
        this.lastTime = timestamp;
        if (dt > MAX_DT) dt = MAX_DT;

        this.updateAttract(dt);
        this.render();
        this.drawSkinPreview();

        requestAnimationFrame((t) => this.attractLoop(t));
    }

    updateAttract(dt) {
        const timeScale = dt / FRAME_TIME;
        const config = DIFFICULTY_CONFIG[this.difficulty];

        // Auto-flap bird
        this.attractTimer++;
        if (this.attractTimer >= this.attractFlapInterval) {
            this.bird.velocity = PHYSICS.FLAP_IMPULSE * 0.85;
            this.attractTimer = 0;
            this.attractFlapInterval = 35 + Math.floor(Math.random() * 50);
        }

        // Bird physics (no collision death)
        this.bird.velocity += PHYSICS.GRAVITY * timeScale;
        if (this.bird.velocity > PHYSICS.TERMINAL_VELOCITY) {
            this.bird.velocity = PHYSICS.TERMINAL_VELOCITY;
        }
        this.bird.y += this.bird.velocity * timeScale;

        // Bounce off top/bottom
        if (this.bird.y - this.bird.radius <= 0) {
            this.bird.y = this.bird.radius;
            this.bird.velocity = 1;
        }
        if (this.bird.y + this.bird.radius >= BASE_HEIGHT - GROUND_HEIGHT) {
            this.bird.y = BASE_HEIGHT - GROUND_HEIGHT - this.bird.radius;
            this.bird.velocity = PHYSICS.FLAP_IMPULSE * 0.7;
        }

        // Wing animation
        this.bird.wingAngle += 0.18 * this.bird.wingDirection * timeScale;
        if (Math.abs(this.bird.wingAngle) > 0.45) this.bird.wingDirection *= -1;

        // Scroll ground
        this.groundOffset = (this.groundOffset - config.speed * timeScale) % 24;

        // Scroll clouds
        this.clouds.forEach(cloud => {
            cloud.x -= cloud.speed * timeScale;
            if (cloud.x < -100) {
                cloud.x = this.logicalWidth + 50;
                cloud.y = 50 + Math.random() * 120;
            }
        });

        // Spawn and scroll pipes
        this.pipeSpawnAccum += dt;
        if (this.pipeSpawnAccum >= config.spawnInterval * FRAME_TIME) {
            this.spawnPipe();
            this.pipeSpawnAccum = 0;
        }

        for (let i = this.pipes.length - 1; i >= 0; i--) {
            const pipe = this.pipes[i];
            pipe.x -= pipe.speed * timeScale;
            if (pipe.x + pipe.width < 0) {
                this.pipes.splice(i, 1);
            }
        }
    }

    // ---- Game Loop ----

    loop(timestamp) {
        if (this.state !== GAME_STATES.PLAYING && this.state !== GAME_STATES.REPLAYING) {
            this.running = false;
            return;
        }

        let dt = timestamp - this.lastTime;
        this.lastTime = timestamp;
        if (dt > MAX_DT) dt = MAX_DT;

        this.update(dt);
        this.render();

        requestAnimationFrame((t) => this.loop(t));
    }

    update(dt) {
        const config = DIFFICULTY_CONFIG[this.difficulty];
        const timeScale = dt / FRAME_TIME;

        // Clouds
        this.clouds.forEach(cloud => {
            cloud.x -= cloud.speed * timeScale;
            if (cloud.x < -100) {
                cloud.x = this.logicalWidth + 50;
                cloud.y = 50 + Math.random() * 120;
            }
        });

        // Ground
        this.groundOffset = (this.groundOffset - config.speed * timeScale) % 24;

        // Bird physics
        this.bird.velocity += PHYSICS.GRAVITY * timeScale;
        if (this.bird.velocity > PHYSICS.TERMINAL_VELOCITY) {
            this.bird.velocity = PHYSICS.TERMINAL_VELOCITY;
        }
        this.bird.y += this.bird.velocity * timeScale;

        // Wing animation
        this.bird.wingAngle += 0.18 * this.bird.wingDirection * timeScale;
        if (Math.abs(this.bird.wingAngle) > 0.45) this.bird.wingDirection *= -1;

        // Ceiling
        if (this.bird.y - this.bird.radius <= 0) {
            this.bird.y = this.bird.radius;
            this.bird.velocity = 0.5;
        }
        // Ground collision
        if (this.bird.y + this.bird.radius >= BASE_HEIGHT - GROUND_HEIGHT) {
            this.bird.y = BASE_HEIGHT - GROUND_HEIGHT - this.bird.radius;
            this.onGameOver();
            return;
        }

        // Pipes
        this.pipeSpawnAccum += dt;
        if (this.pipeSpawnAccum >= config.spawnInterval * FRAME_TIME) {
            this.spawnPipe();
            this.pipeSpawnAccum = 0;
        }

        for (let i = this.pipes.length - 1; i >= 0; i--) {
            const pipe = this.pipes[i];
            pipe.x -= pipe.speed * timeScale;

            if (pipe.x + pipe.width < 0) {
                this.pipes.splice(i, 1);
                continue;
            }

            if (!pipe.passed && pipe.x + pipe.width / 2 < PHYSICS.BIRD_X) {
                pipe.passed = true;
                this.score++;
                this.scoreDisplay.textContent = this.score;
                this.sound.playScore();
            }

            if (this.checkCollision(this.bird, pipe)) {
                this.onGameOver();
                return;
            }
        }
    }

    onGameOver() {
        this.saveCurrentGame();
        this.createGameplayRecord();
        this.enterGameOver();
    }

    checkCollision(bird, pipe) {
        const withinHorizontal = (PHYSICS.BIRD_X + bird.radius > pipe.x) &&
            (PHYSICS.BIRD_X - bird.radius < pipe.x + pipe.width);
        if (!withinHorizontal) return false;
        const collidesTop = bird.y - bird.radius < pipe.topHeight;
        const collidesBottom = bird.y + bird.radius > pipe.bottomY;
        return collidesTop || collidesBottom;
    }

    spawnPipe() {
        const config = DIFFICULTY_CONFIG[this.difficulty];
        const dynamicGap = Math.max(config.gapSize - 20, config.gapSize - Math.floor(this.score / 6) * 3);
        const minHeight = 60;
        const maxHeight = BASE_HEIGHT - GROUND_HEIGHT - dynamicGap - minHeight;
        const topHeight = minHeight + Math.random() * (maxHeight - minHeight);

        this.pipes.push({
            x: this.logicalWidth,
            topHeight: topHeight,
            bottomY: topHeight + dynamicGap,
            width: 60,
            passed: false,
            speed: config.speed + Math.min(1.0, (this.score / 15) * 0.2)
        });
    }

    // ---- Render ----

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.save();
        this.ctx.scale(this.scale, this.scale);

        // Sky
        const skyGrad = this.ctx.createLinearGradient(0, 0, 0, BASE_HEIGHT);
        skyGrad.addColorStop(0, '#0284c7');
        skyGrad.addColorStop(0.5, '#38bdf8');
        skyGrad.addColorStop(0.8, '#bae6fd');
        skyGrad.addColorStop(1, '#ffedd5');
        this.ctx.fillStyle = skyGrad;
        this.ctx.fillRect(0, 0, this.logicalWidth, BASE_HEIGHT);

        // Hills
        this.ctx.fillStyle = '#bae6fd';
        this.ctx.beginPath();
        this.ctx.ellipse(this.logicalWidth * 0.2, BASE_HEIGHT - GROUND_HEIGHT, 150, 60, 0, 0, Math.PI * 2);
        this.ctx.ellipse(this.logicalWidth * 0.75, BASE_HEIGHT - GROUND_HEIGHT, 220, 80, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // Clouds
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

        // Pipes
        this.pipes.forEach(pipe => {
            const pipeGrad = this.ctx.createLinearGradient(pipe.x, 0, pipe.x + pipe.width, 0);
            pipeGrad.addColorStop(0, '#10b981');
            pipeGrad.addColorStop(0.2, '#34d399');
            pipeGrad.addColorStop(0.7, '#059669');
            pipeGrad.addColorStop(1, '#047857');
            this.ctx.fillStyle = pipeGrad;
            this.ctx.strokeStyle = '#064e3b';
            this.ctx.lineWidth = 2.5;

            // Top pipe body
            this.ctx.fillRect(pipe.x, 0, pipe.width, pipe.topHeight);
            this.ctx.strokeRect(pipe.x, -5, pipe.width, pipe.topHeight + 5);

            // Top pipe cap
            const capHeight = 22;
            const capOffset = 3;
            this.ctx.fillRect(pipe.x - capOffset, pipe.topHeight - capHeight, pipe.width + capOffset * 2, capHeight);
            this.ctx.strokeRect(pipe.x - capOffset, pipe.topHeight - capHeight, pipe.width + capOffset * 2, capHeight);

            // Bottom pipe body
            const bottomHeight = BASE_HEIGHT - GROUND_HEIGHT - pipe.bottomY;
            this.ctx.fillRect(pipe.x, pipe.bottomY, pipe.width, bottomHeight);
            this.ctx.strokeRect(pipe.x, pipe.bottomY, pipe.width, bottomHeight + 5);

            // Bottom pipe cap
            this.ctx.fillRect(pipe.x - capOffset, pipe.bottomY, pipe.width + capOffset * 2, capHeight);
            this.ctx.strokeRect(pipe.x - capOffset, pipe.bottomY, pipe.width + capOffset * 2, capHeight);
        });

        // Ground
        this.ctx.fillStyle = '#78350f';
        this.ctx.fillRect(0, BASE_HEIGHT - GROUND_HEIGHT, this.logicalWidth, GROUND_HEIGHT);
        this.ctx.fillStyle = '#059669';
        this.ctx.fillRect(0, BASE_HEIGHT - GROUND_HEIGHT, this.logicalWidth, 14);
        this.ctx.fillStyle = '#10b981';
        this.ctx.fillRect(0, BASE_HEIGHT - GROUND_HEIGHT, this.logicalWidth, 6);

        this.ctx.strokeStyle = '#047857';
        this.ctx.lineWidth = 2.5;
        this.ctx.beginPath();
        for (let x = this.groundOffset; x < this.logicalWidth + 24; x += 24) {
            this.ctx.moveTo(x, BASE_HEIGHT - GROUND_HEIGHT + 6);
            this.ctx.lineTo(x - 8, BASE_HEIGHT - GROUND_HEIGHT + 14);
        }
        this.ctx.stroke();

        // Bird
        this.drawBird(this.ctx, PHYSICS.BIRD_X, this.bird.y, this.bird.wingAngle, this.skin, this.bird.velocity);

        this.ctx.restore();
    }

    drawBird(ctx, x, y, wingAngle, skinKey, velocity = 0) {
        const skin = SKINS[skinKey] || SKINS.gold;
        ctx.save();
        ctx.translate(x, y);
        const rotAngle = Math.min(Math.PI / 3.2, Math.max(-Math.PI / 10, velocity * 0.08));
        ctx.rotate(rotAngle);

        ctx.shadowBlur = 10;
        ctx.shadowColor = skin.glow;

        // Tail
        ctx.fillStyle = skin.tail;
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-14, 0);
        ctx.lineTo(-22, -6);
        ctx.lineTo(-20, 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Body
        const bodyGrad = ctx.createRadialGradient(-3, -3, 2, 0, 0, 14);
        bodyGrad.addColorStop(0, skin.body[0]);
        bodyGrad.addColorStop(0.5, skin.body[1]);
        bodyGrad.addColorStop(1, skin.body[2]);
        ctx.fillStyle = bodyGrad;
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.shadowBlur = 0;

        // Highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.beginPath();
        ctx.arc(-4, -6, 4, 0, Math.PI * 2);
        ctx.fill();

        // Cheek
        ctx.fillStyle = skin.cheek;
        ctx.beginPath();
        ctx.arc(1, 4, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Eye
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(5, -4, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(6.5, -4, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(5.5, -5, 0.8, 0, Math.PI * 2);
        ctx.fill();

        // Beak
        const beakGrad = ctx.createLinearGradient(10, 0, 20, 0);
        beakGrad.addColorStop(0, '#f97316');
        beakGrad.addColorStop(1, '#ea580c');
        ctx.fillStyle = beakGrad;
        ctx.beginPath();
        ctx.moveTo(11, -1.5);
        ctx.lineTo(21, 1.5);
        ctx.lineTo(10.5, 4.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Wing
        const wingGrad = ctx.createLinearGradient(-13, 0, 3, 0);
        wingGrad.addColorStop(0, skin.body[1]);
        wingGrad.addColorStop(1, skin.body[2]);
        ctx.fillStyle = wingGrad;
        ctx.save();
        ctx.translate(-4, 2);
        ctx.rotate(wingAngle);
        ctx.beginPath();
        ctx.ellipse(0, 0, 8.5, 5.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        ctx.restore();
    }
}

// ===================== INIT =====================
window.addEventListener('load', () => {
    window.gameInstance = new Game();
});
