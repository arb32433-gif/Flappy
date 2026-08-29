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

    static deleteSave() {
        localStorage.removeItem(SaveManager.KEY);
    }

    static hasSave() {
        return !!localStorage.getItem(SaveManager.KEY);
    }
}

// ===================== HISTORY MANAGER =====================
class HistoryManager {
    static KEY = 'faby_history';
    static MAX = 30;

    static getAll() {
        try {
            return JSON.parse(localStorage.getItem(HistoryManager.KEY) || '[]');
        } catch (e) {
            return [];
        }
    }

    static addRecord(record) {
        try {
            const all = HistoryManager.getAll();
            all.unshift(record);
            if (all.length > HistoryManager.MAX) all.length = HistoryManager.MAX;
            localStorage.setItem(HistoryManager.KEY, JSON.stringify(all));
        } catch (e) {
            console.warn('History save failed:', e);
        }
    }
}

// ===================== TAURI BRIDGE =====================
function isTauriContext() {
    return typeof window !== 'undefined' &&
        !!(window.__TAURI__ && window.__TAURI__.core);
}

function tauriInvoke(cmd, args = {}) {
    if (!isTauriContext()) return Promise.reject(new Error('Not running inside Tauri'));
    return window.__TAURI__.core.invoke(cmd, args);
}

// ===================== SCORE API =====================
class ScoreAPI {
    static BASE = '/api/scores';

    /**
     * In the packaged Tauri desktop app we talk directly to the local SQLite
     * database via native commands (single source of truth with db.py).
     * In the browser we fall back to the Python HTTP API.
     */
    static async postScore(score, difficulty = 'medium') {
        if (isTauriContext()) {
            try {
                const isHigh = await tauriInvoke('db_add_score', { score, difficulty });
                const high = await tauriInvoke('db_get_high_score', { difficulty });
                return { ok: true, is_high: !!isHigh, high_score: high };
            } catch (e) {
                console.warn('Tauri post failed:', e);
                return { ok: false };
            }
        }
        try {
            const res = await fetch(ScoreAPI.BASE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ score, difficulty })
            });
            return await res.json();
        } catch (e) {
            console.warn('API post failed:', e);
            return { ok: false };
        }
    }

    static async getScores(difficulty = null) {
        if (isTauriContext()) {
            try {
                const data = await tauriInvoke('db_get_scores', { difficulty });
                return data.scores || [];
            } catch (e) {
                console.warn('Tauri get scores failed:', e);
                return [];
            }
        }
        try {
            const url = difficulty ? `${ScoreAPI.BASE}?difficulty=${difficulty}` : ScoreAPI.BASE;
            const res = await fetch(url);
            const data = await res.json();
            return data.scores || [];
        } catch (e) {
            console.warn('API get failed:', e);
            return HistoryManager.getAll();
        }
    }

    static async deleteScore(id) {
        if (isTauriContext()) {
            try {
                await tauriInvoke('db_delete_score', { id });
                return true;
            } catch (e) {
                console.warn('Tauri delete failed:', e);
                return false;
            }
        }
        try {
            await fetch(`${ScoreAPI.BASE}/${id}`, { method: 'DELETE' });
            return true;
        } catch (e) {
            console.warn('API delete failed:', e);
            return false;
        }
    }

    static async getHighScore(difficulty = 'medium') {
        if (isTauriContext()) {
            try {
                return await tauriInvoke('db_get_high_score', { difficulty });
            } catch (e) {
                return parseInt(localStorage.getItem(`faby_high_score_${difficulty}`) || '0', 10);
            }
        }
        try {
            const url = `${ScoreAPI.BASE}?difficulty=${difficulty}`;
            const res = await fetch(url);
            const data = await res.json();
            return data.high_score || 0;
        } catch (e) {
            console.warn('API high score fetch failed:', e);
            return false;
        }
    }

    static async getStats(difficulty = 'medium') {
        if (isTauriContext()) {
            try {
                const stats = await tauriInvoke('db_get_stats', { difficulty });
                return {
                    total_games: stats.total_games || 0,
                    high_score: stats.high_score || 0,
                    avg_score: stats.avg_score || 0
                };
            } catch (e) {
                console.warn('Tauri stats failed:', e);
                return { total_games: 0, high_score: 0, avg_score: 0 };
            }
        }
        try {
            const res = await fetch(`/api/scores/stats?difficulty=${difficulty}`);
            if (!res.ok) throw new Error('API server error');
            return await res.json();
        } catch (e) {
            console.warn('API stats failed:', e);
            return { total_games: 0, high_score: 0, avg_score: 0 };
        }
    }

    static async archiveScore(id) {
        if (isTauriContext()) {
            try {
                await tauriInvoke('db_archive_score', { id });
                return { ok: true };
            } catch (e) {
                console.warn('Tauri archive failed:', e);
                return { ok: false };
            }
        }
        try {
            const res = await fetch(`${ScoreAPI.BASE}/${id}/archive`, { method: 'POST' });
            return await res.json();
        } catch (e) {
            console.warn('API archive failed:', e);
            return { ok: false };
        }
    }

    static async getArchives() {
        if (isTauriContext()) {
            try {
                const data = await tauriInvoke('db_get_archives', {});
                return data.archives || [];
            } catch (e) {
                console.warn('Tauri archives get failed:', e);
                return [];
            }
        }
        try {
            const res = await fetch('/api/archives');
            const data = await res.json();
            return data.archives || [];
        } catch (e) {
            console.warn('API archives get failed:', e);
            return [];
        }
    }

    static async getArchiveCount() {
        if (isTauriContext()) {
            try {
                return await tauriInvoke('db_get_archive_count', {});
            } catch (e) {
                return 0;
            }
        }
        try {
            const res = await fetch('/api/archives/count');
            const data = await res.json();
            return data.count || 0;
        } catch (e) {
            console.warn('API archive count failed:', e);
            return 0;
        }
    }

    static async deleteArchive(id) {
        if (isTauriContext()) {
            try {
                await tauriInvoke('db_delete_archive', { id });
                return true;
            } catch (e) {
                console.warn('Tauri archive delete failed:', e);
                return false;
            }
        }
        try {
            await fetch(`/api/archives/${id}`, { method: 'DELETE' });
            return true;
        } catch (e) {
            console.warn('API archive delete failed:', e);
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
    BIRD_X: 100,
    // Bird visual + limb physics
    BIRD_HEIGHT: 36,       // target on-screen height of the bird sprite
    BASE_RADIUS: 20,       // collision radius
    WING_AMPLITUDE: 0.55,  // max wing flap angle (radians)
    WING_BASE_SPEED: 0.22  // wing flap speed at idle
};

function clamp(v, lo, hi) {
    return v < lo ? lo : (v > hi ? hi : v);
}

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
    },
    bird_1: {
        imageSrc: 'assets/bird_1.png',
        accent: '#ca8a04',
        dark: '#854d0e',
        glow: 'rgba(245, 158, 11, 0.4)'
    },
    bird_2: {
        imageSrc: 'assets/bird_2.png',
        accent: '#1d4ed8',
        dark: '#1e3a8a',
        glow: 'rgba(59, 130, 246, 0.4)'
    },
    bird_3: {
        imageSrc: 'assets/bird_3.png',
        accent: '#7c3aed',
        dark: '#5b21b6',
        glow: 'rgba(239, 68, 68, 0.4)'
    },
    bird_4: {
        imageSrc: 'assets/bird_4.png',
        accent: '#dc2626',
        dark: '#7f1d1d',
        glow: 'rgba(16, 185, 129, 0.4)'
    },
    bird_5: {
        imageSrc: 'assets/bird_5.png',
        accent: '#ea580c',
        dark: '#9a3412',
        glow: 'rgba(244, 63, 94, 0.4)'
    },
    bird_6: {
        imageSrc: 'assets/bird_6.png',
        accent: '#a16207',
        dark: '#713f12',
        glow: 'rgba(139, 92, 246, 0.4)'
    }
};

// Custom bird image preloading
const birdImages = {};
Object.keys(SKINS).forEach(key => {
    if (SKINS[key].imageSrc) {
        const img = new Image();
        img.src = SKINS[key].imageSrc;
        birdImages[key] = img;
    }
});

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

        // DOM - data screen views/tabs
        this.tabLogsBtn = document.getElementById('tab-logs');
        this.tabArchivesBtn = document.getElementById('tab-archives');
        this.logsView = document.getElementById('logs-view');
        this.archivesView = document.getElementById('archives-view');

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
        this.bird = this.makeBird();
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

        // Check for app update in the background (Tauri only)
        setTimeout(() => this.checkForAppUpdate(), 3000);
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

        // Data screen tab switch
        if (this.tabLogsBtn) {
            this.tabLogsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.switchDataView('logs');
            });
        }
        if (this.tabArchivesBtn) {
            this.tabArchivesBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.switchDataView('archives');
            });
        }

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
        const time = performance.now() / 1000;
        const phase = time * 7;
        const previewBird = {
            velocity: 0,
            wingAngle: Math.sin(phase) * PHYSICS.WING_AMPLITUDE,
            wingPhase: phase,
            tailAngle: Math.sin(phase * 2) * 0.05,
            legPhase: time * 2,
            onGround: false,
            flapEnergy: 0.3
        };
        pctx.save();
        pctx.translate(previewCanvas.width / 2, previewCanvas.height / 2 + 3);
        this.drawBird(pctx, 0, 0, previewBird, this.skin);
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
            const stats = await ScoreAPI.getStats(this.difficulty);
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

    async checkForAppUpdate() {
        // Only runs inside the Tauri desktop app
        if (!isTauriContext()) return;
        try {
            const { check } = window.__TAURI__.updater;
            const update = await check();
            if (!update) return; // Already up to date

            // Show a styled prompt in the game container
            const banner = document.createElement('div');
            banner.id = 'update-banner';
            banner.innerHTML = `
                <div class="update-inner">
                    <span class="update-icon">🚀</span>
                    <div class="update-text">
                        <strong>Update Available</strong>
                        <span>v${update.version} is ready to install</span>
                    </div>
                    <button id="update-install-btn" class="btn update-btn-yes">Install</button>
                    <button id="update-dismiss-btn" class="update-btn-no">Later</button>
                </div>`;
            document.getElementById('game-container').appendChild(banner);

            document.getElementById('update-dismiss-btn').addEventListener('click', () => {
                banner.remove();
            });
            document.getElementById('update-install-btn').addEventListener('click', async () => {
                banner.querySelector('.update-inner').innerHTML = '<span class="update-icon">⏳</span><span>Downloading update…</span>';
                try {
                    await update.downloadAndInstall();
                    const { relaunch } = window.__TAURI__.process;
                    await relaunch();
                } catch (e) {
                    banner.querySelector('.update-inner').innerHTML = '<span class="update-icon">❌</span><span>Update failed. Try again later.</span>';
                    setTimeout(() => banner.remove(), 3000);
                }
            });
        } catch (e) {
            // Network or server error — fail silently, game continues normally
            console.warn('[Updater] Check failed:', e);
        }
    }

    enterData() {
        this.state = GAME_STATES.DATA;
        this.running = false;

        if (this.mainMenu) this.mainMenu.classList.add('hidden');
        if (this.gameOverScreen) this.gameOverScreen.classList.add('hidden');
        if (this.dataScreen) this.dataScreen.classList.remove('hidden');
        if (this.hud) this.hud.classList.add('hud-hidden');

        this.populateDataList();
        this.populateArchivesList();
        this.switchDataView('logs');
        this.resetEntitiesForAttract();
        this.startAttractLoop();
    }

    switchDataView(view) {
        const showLogs = view === 'logs';
        if (this.logsView) this.logsView.classList.toggle('hidden', !showLogs);
        if (this.archivesView) this.archivesView.classList.toggle('hidden', showLogs);
        if (this.tabLogsBtn) this.tabLogsBtn.classList.toggle('active', showLogs);
        if (this.tabArchivesBtn) this.tabArchivesBtn.classList.toggle('active', !showLogs);
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
        this.bird.flapEnergy = 1;
        this.bird.wingPhase += Math.PI;       // snap wings to a full flap stroke
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
        this.bird = this.normalizeBird(saved.bird);
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
            this.bird = this.normalizeBird(saved.bird);
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

    archiveGameplayRecord(id) {
        ScoreAPI.archiveScore(id).then(res => {
            if (res && res.ok) {
                this.populateDataList();
            } else {
                alert("Could not save this flight record to the archives.");
            }
        });
    }

    // ---- Data Screen ----

    loadArchiveCount() {
        ScoreAPI.getArchiveCount()
            .then(count => {
                const el = document.getElementById('data-arch-count');
                if (el) el.textContent = `\u{1F4C2} ${count || 0} saved`;
            })
            .catch(() => {});
    }

    populateDataList() {
        this.loadArchiveCount();
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
                const savedClass = r.archived ? ' saved' : '';
                const savedLabel = r.archived ? 'Saved' : 'Save';
                return `
                    <tr class="data-row" data-id="${r.id}">
                        <td class="td-num">${i + 1}</td>
                        <td class="td-diff"><span class="diff-badge ${diffClass}">${diffName}</span></td>
                        <td class="td-score">${r.score} ${highBadge}</td>
                        <td class="td-date">${dateStr} ${timeStr}</td>
                        <td class="td-actions">
                            <button class="record-btn record-btn-replay" data-action="replay" data-id="${r.id}">Replay</button>
                            <button class="record-btn record-btn-save${savedClass}" data-action="save" data-id="${r.id}" ${r.archived ? 'disabled' : ''}>${savedLabel}</button>
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

            // Bind Save (Archive)
            tbody.querySelectorAll('.record-btn-save').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (btn.classList.contains('saved')) return;
                    const id = parseInt(btn.getAttribute('data-id'), 10);
                    this.archiveGameplayRecord(id);
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

    populateArchivesList() {
        ScoreAPI.getArchives().then(records => {
            const tbody = document.getElementById('archives-tbody');
            const emptyMsg = document.getElementById('archives-empty');

            if (!tbody) return;

            if (records.length === 0) {
                tbody.innerHTML = '';
                if (emptyMsg) emptyMsg.classList.add('visible');
                return;
            }

            if (emptyMsg) emptyMsg.classList.remove('visible');

            tbody.innerHTML = records.map((r, i) => {
                const diffClass = `diff-badge-${r.difficulty}`;
                const diffName = DIFFICULTY_CONFIG[r.difficulty]?.name || r.difficulty;
                const date = new Date(r.archived_at || r.created_at);
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
                            <button class="record-btn record-btn-unarchive" data-action="unarchive" data-id="${r.id}">Unarchive</button>
                            <button class="record-btn record-btn-delete" data-action="delete" data-id="${r.id}">Del</button>
                        </td>
                    </tr>
                `;
            }).join('');

            // Bind Unarchive
            tbody.querySelectorAll('.record-btn-unarchive').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const id = parseInt(btn.getAttribute('data-id'), 10);
                    if (confirm("Return this saved flight to the flight logs? (source log is kept)")) {
                        ScoreAPI.deleteArchive(id).then(() => {
                            this.populateArchivesList();
                            this.populateDataList();
                            this.loadArchiveCount();
                        });
                    }
                });
            });

            // Bind Delete (archive)
            tbody.querySelectorAll('.record-btn-delete').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const id = parseInt(btn.getAttribute('data-id'), 10);
                    if (confirm("Are you sure you want to permanently delete this saved flight?")) {
                        ScoreAPI.deleteArchive(id).then(() => {
                            this.populateArchivesList();
                            this.populateDataList();
                            this.loadArchiveCount();
                        });
                    }
                });
            });
        });
    }

    // ---- Reset Helpers ----

    resetGameState() {
        this.score = 0;
        this.bird = this.makeBird();
        this.pipes = [];
        this.pipeSpawnAccum = 0;
        this.groundOffset = 0;
        this.initClouds();
    }

    resetEntitiesForAttract() {
        this.score = 0;
        this.bird = this.makeBird();
        this.pipes = [];
        this.pipeSpawnAccum = 0;
        this.groundOffset = 0;
        this.attractTimer = 0;
        this.attractFlapInterval = 40 + Math.floor(Math.random() * 40);
        this.initClouds();
    }

    makeBird() {
        return {
            y: 250,
            velocity: 0,
            radius: PHYSICS.BASE_RADIUS,
            wingAngle: 0,
            wingDirection: 1,
            wingPhase: Math.random() * Math.PI * 2,
            tailAngle: 0,
            legPhase: Math.random() * Math.PI * 2,
            onGround: false,
            flapEnergy: 0
        };
    }

    // Merge an old/partial saved bird (from a previous save) with full defaults so
    // physics fields always exist even when loading older saves.
    normalizeBird(partial) {
        return { ...this.makeBird(), ...(partial || {}) };
    }

    // ---- Bird Physique (wings, tail, legs) ----

    // Drives the physics-based animation of the bird's wing, tail and legs.
    // Response is tied to vertical velocity, flap energy and ground contact.
    updateBirdPhysics(bird, timeScale) {
        // Decay the impulse-boost from the most recent flap
        bird.flapEnergy = Math.max(0, bird.flapEnergy - 0.06 * timeScale);

        // Wing: continuous flap cycle whose frequency and amplitude react to speed
        // and to how recently the bird flapped (faster, tighter wings on a flap).
        const divert = clamp(Math.max(bird.velocity, 0) / PHYSICS.TERMINAL_VELOCITY, 0, 1);
        const wingSpeed = PHYSICS.WING_BASE_SPEED * (1 + (1 - divert) * 1.2 + bird.flapEnergy * 2.5);
        bird.wingPhase += wingSpeed * timeScale;
        bird.wingAngle = Math.sin(bird.wingPhase) * PHYSICS.WING_AMPLITUDE * (0.75 + bird.flapEnergy * 0.5);

        // Tail: pitches up while climbing, droops while diving, plus a light flick
        const climb = clamp(-bird.velocity / 6, 0, 1);
        const dive = clamp(bird.velocity / 6, 0, 1);
        const tailTarget = climb * 0.45 - dive * 0.7 + Math.sin(bird.wingPhase * 2) * 0.05;
        bird.tailAngle += (tailTarget - bird.tailAngle) * 0.18 * timeScale;

        // Legs: advance a walk/tuck cycle; phase advances faster when flapping
        bird.legPhase += bird.flapEnergy > 0.2 ? 0.35 * timeScale : 0.14 * timeScale;
    }

    // Draws the bird's animated wing (a flapping near-side wing over the body) — used by procedural skins.
    drawLimbWing(ctx, w, h, bird, skin) {
        const wingAngle = bird.wingAngle;
        const flapTightness = 1 - bird.flapEnergy * 0.4;   // fold wing in slightly on a hard flap
        ctx.save();
        ctx.translate(w * 0.02, -h * 0.12);
        ctx.rotate(wingAngle);
        const grad = ctx.createLinearGradient(-14, 0, 4, 0);
        grad.addColorStop(0, skin.accent || '#d97706');
        grad.addColorStop(1, skin.dark || '#78350f');
        ctx.fillStyle = grad;
        ctx.strokeStyle = skin.dark || '#78350f';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(2, -2);
        ctx.bezierCurveTo(-6, -8, -16, -8, -20 * flapTightness, 0);
        ctx.bezierCurveTo(-16, 6, -6, 6, 2, 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }

    // Draws the bird's tail feathers — used by procedural skins.
    drawLimbTail(ctx, w, h, bird, skin) {
        const base = -w * 0.34;
        ctx.save();
        ctx.translate(base, h * 0.02);
        ctx.rotate(bird.tailAngle);
        ctx.fillStyle = skin.accent || '#d97706';
        ctx.strokeStyle = skin.dark || '#78350f';
        ctx.lineWidth = 2;
        const len = w * 0.30;
        // top feather
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-len, -h * 0.12);
        ctx.lineTo(-len * 0.8, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // bottom feather
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-len, h * 0.10);
        ctx.lineTo(-len * 0.8, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }

    // Draws the bird's legs (tucked while airborne, trailing below, walking on ground) — used by procedural skins.
    drawLimbLegs(ctx, w, h, bird, skin) {
        const tuck = 1 - Math.min(1, bird.flapEnergy) * 0.55;      // legs pull up on flap
        const legLen = h * 0.42 * tuck;
        const anchorY = h * 0.40;
        // horizontal sway: stream back while diving, swing when walking
        const airSway = Math.max(bird.velocity * 0.35, 0) + (tuck < 1 ? Math.sin(bird.legPhase) * 2 : 0);
        const groundSway = bird.onGround ? Math.sin(bird.legPhase) * 3.5 : 0;
        const sway = bird.onGround ? groundSway : airSway;

        ctx.strokeStyle = skin.dark || '#78350f';
        ctx.fillStyle = skin.accent || '#d97706';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        for (let i = 0; i < 2; i++) {
            const bx = (i === 0 ? -3 : 3) + sway * (i === 0 ? 0.6 : 0.4);
            const fx = (i === 0 ? -4 : 5) + sway * (i === 0 ? 0.2 : -0.2);
            // thigh
            ctx.beginPath();
            ctx.moveTo(bx, anchorY);
            ctx.quadraticCurveTo(bx, anchorY + legLen * 0.55, fx, anchorY + legLen * 0.55);
            ctx.stroke();
            // foot (small triangle)
            ctx.beginPath();
            ctx.moveTo(fx, anchorY + legLen * 0.55);
            ctx.lineTo(fx - 3, anchorY + legLen * 0.55 + 3);
            ctx.lineTo(fx + 3, anchorY + legLen * 0.55 + 3);
            ctx.closePath();
            ctx.fill();
        }
    }

    // =====================================================================
    // SPRITE-BASED PHYSICS ANIMATION (bird_1 … bird_6 image skins)
    // =====================================================================
    //
    // Each sprite is a single flat PNG that already has a body, wing, tail
    // and legs drawn into it.  Rather than drawing opaque canvas shapes
    // on top of the artwork (which would obscure it), we animate the sprite
    // itself by cutting it into three horizontal bands and applying
    // independent canvas transforms to each band:
    //
    //   TOP  band  (~35 % of height) — contains wings / back feathers
    //              → scaleY oscillates with wing-flap physics so the wings
    //                appear to fold and extend.
    //
    //   MID  band  (~45 % of height) — the body core (head, eye, beak)
    //              → drawn normally; acts as the anchor.
    //
    //   TAIL band  (~20 % of height) — tail and rear legs
    //              → rotated around its top edge using bird.tailAngle so
    //                the tail pitches up when climbing and droops when diving.
    //
    // Legs on the sprite are inside the TAIL band, so their natural leg-
    // bob comes from the tail rotation.  A small additional vertical
    // oscillation (legBob) is added to the tail band origin to simulate
    // the tucking/extending motion when flapping.
    // =====================================================================

    drawSpritePhysics(ctx, img, w, h, bird) {
        const sw = img.naturalWidth;
        const sh = img.naturalHeight;

        // Flip horizontally so the bird faces right (sprites are drawn facing left).
        // All band draws use symmetric x offsets (-w/2 … w/2), so one scale is enough.
        ctx.scale(-1, 1);

        // --- Define band boundaries (in sprite pixel space) ---
        const topFrac  = 0.38;   // top   0 .. 38% → wings / upper back
        const tailFrac = 0.72;   // tail  72% .. 100% → tail + legs

        const topPx  = Math.round(sh * topFrac);
        const tailPx = Math.round(sh * tailFrac);

        // ----------------------------------------------------------------
        // 1.  TOP BAND  — wing flap via scaleY
        // ----------------------------------------------------------------
        //  wingAngle in radians → map to a scaleY factor:
        //    wings fully up  (angle ≈ +AMPLITUDE) → scaleY ≈ 0.55  (compressed)
        //    wings level     (angle ≈ 0)            → scaleY ≈ 1.00
        //    wings fully down(angle ≈ -AMPLITUDE)   → scaleY ≈ 1.45  (stretched)
        //  We also squeeze the top band slightly horizontally on a hard flap.
        const rawWing = bird.wingAngle / PHYSICS.WING_AMPLITUDE; // –1..+1
        const wingScaleY = 1.0 - rawWing * 0.42;                 //  0.58..1.42
        const wingScaleX = 1.0 + bird.flapEnergy * 0.06;         // very subtle stretch on impulse

        ctx.save();
        // No clip — allow the wing/head band to paint freely so it is never
        // cut off during the flap animation. We pivot from the bottom edge
        // of the top band (the body junction) so the sprite grows upward.
        ctx.translate(0, -h / 2 + h * topFrac);   // pivot at body junction
        ctx.scale(wingScaleX, wingScaleY);
        ctx.drawImage(img,
            0, 0, sw, topPx,
            -w / 2, -h * topFrac,
            w, h * topFrac);
        ctx.restore();

        // ----------------------------------------------------------------
        // 2.  MIDDLE BAND  — drawn as-is (body anchor)
        // ----------------------------------------------------------------
        ctx.save();
        ctx.beginPath();
        ctx.rect(-w / 2, -h / 2 + h * topFrac, w, h * (tailFrac - topFrac));
        ctx.clip();
        ctx.drawImage(img,
            0, topPx, sw, tailPx - topPx,
            -w / 2, -h / 2 + h * topFrac,
            w, h * (tailFrac - topFrac));
        ctx.restore();

        // ----------------------------------------------------------------
        // 3.  TAIL / LEG BAND  — tail-angle rotation + leg-bob translate
        // ----------------------------------------------------------------
        //  tailAngle: positive when climbing (tail up), negative when diving.
        //  We pivot around the top-left edge of this band.

        // Leg bob: upward tuck when flapEnergy is high; subtle oscillation otherwise.
        const legBob = -bird.flapEnergy * h * 0.06 +
                        Math.sin(bird.legPhase) * h * 0.025 * (1 - bird.flapEnergy);

        ctx.save();
        // Clip to tail band region in destination space
        ctx.beginPath();
        ctx.rect(-w / 2, -h / 2 + h * tailFrac, w, h * (1 - tailFrac));
        ctx.clip();
        // Pivot at the top-centre of the tail band
        ctx.translate(0, -h / 2 + h * tailFrac + legBob);
        ctx.rotate(bird.tailAngle);
        ctx.drawImage(img,
            0, tailPx, sw, sh - tailPx,
            -w / 2, 0,
            w, h * (1 - tailFrac));
        ctx.restore();
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
            this.bird.flapEnergy = 1;
            this.bird.wingPhase += Math.PI;
            this.attractTimer = 0;
            this.attractFlapInterval = 35 + Math.floor(Math.random() * 50);
        }

        // Bird physics (no collision death)
        this.bird.velocity += PHYSICS.GRAVITY * timeScale;
        if (this.bird.velocity > PHYSICS.TERMINAL_VELOCITY) {
            this.bird.velocity = PHYSICS.TERMINAL_VELOCITY;
        }
        this.bird.y += this.bird.velocity * timeScale;
        this.bird.onGround = false;

        // Bounce off top/bottom
        if (this.bird.y - this.bird.radius <= 0) {
            this.bird.y = this.bird.radius;
            this.bird.velocity = 1;
        }
        if (this.bird.y + this.bird.radius >= BASE_HEIGHT - GROUND_HEIGHT) {
            this.bird.y = BASE_HEIGHT - GROUND_HEIGHT - this.bird.radius;
            this.bird.onGround = true;
            this.bird.velocity = PHYSICS.FLAP_IMPULSE * 0.7;
        }

        this.updateBirdPhysics(this.bird, timeScale);

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
        this.bird.onGround = false;

        this.updateBirdPhysics(this.bird, timeScale);

        // Ceiling
        if (this.bird.y - this.bird.radius <= 0) {
            this.bird.y = this.bird.radius;
            this.bird.velocity = 0.5;
        }
        // Ground collision
        if (this.bird.y + this.bird.radius >= BASE_HEIGHT - GROUND_HEIGHT) {
            this.bird.y = BASE_HEIGHT - GROUND_HEIGHT - this.bird.radius;
            this.bird.onGround = true;
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
        this.drawBird(this.ctx, PHYSICS.BIRD_X, this.bird.y, this.bird, this.skin);

        this.ctx.restore();
    }

    drawBird(ctx, x, y, bird, skinKey) {
        const skin = SKINS[skinKey] || SKINS.gold;
        const velocity = bird.velocity;
        ctx.save();
        ctx.translate(x, y);
        const rotAngle = Math.min(Math.PI / 3.2, Math.max(-Math.PI / 10, velocity * 0.08));
        ctx.rotate(rotAngle);

        ctx.shadowBlur = 10;
        ctx.shadowColor = skin.glow;

        if (skin.imageSrc) {
            const img = birdImages[skinKey];
            if (img && img.complete) {
                // Scale the high-res sprite up to a proper in-game size while preserving
                // the native aspect ratio so the bird is actually visible.
                const imgW = img.naturalWidth || 28;
                const imgH = img.naturalHeight || 28;
                const h = PHYSICS.BIRD_HEIGHT;
                const w = imgW / imgH * h;
                this.birdSpriteW = w;
                this.birdSpriteH = h;

                // Animate the sprite using physics-driven band-slicing transforms
                // (wing flap → top band scaleY, tail pitch → tail band rotation,
                //  leg tuck/bob → tail band Y offset).
                this.drawSpritePhysics(ctx, img, w, h, bird);
            } else {
                // Fallback to simple circle while image loads
                ctx.fillStyle = skin.accent || '#f59e0b';
                ctx.beginPath();
                ctx.arc(0, 0, PHYSICS.BIRD_HEIGHT / 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = skin.dark || '#78350f';
                ctx.lineWidth = 2.5;
                ctx.stroke();
            }
        } else {
            // ---- Procedural skins (gold / neon / ruby / emerald) ----
            this.drawLimbTail(ctx, 28, 28, bird, skin);

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

            // Wing (flapping) & legs (physics-driven)
            this.drawLimbWing(ctx, 28, 28, bird, skin);
            this.drawLimbLegs(ctx, 28, 28, bird, skin);
        }

        ctx.restore();
    }
}

// ===================== INIT =====================
window.addEventListener('load', () => {
    window.gameInstance = new Game();
});
