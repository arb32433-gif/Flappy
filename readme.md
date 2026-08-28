# flappyflight

**An Event-Driven Flappy Bird Clone**

A single-player Flappy Bird game built for the Event-Driven Programming course mid-term project. Players control a small bird navigating through narrow gaps between green pipes without crashing, aiming for the highest score. Runs in the browser for development and ships as a **fully offline Windows desktop app**.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Rendering | HTML5 Canvas | 2D game graphics and animations |
| Logic | Vanilla JavaScript (ES6 Classes) | Game engine, physics, collision, scoring |
| Audio | Web Audio API | Dynamic sound generation (no file dependencies) |
| Styling | CSS3 | Glassmorphism overlays, gradients, responsive layout |
| Dev Server | Python 3 `http.server` | Local development preview with auto-browser launch |
| Database | SQLite3 (via Python `db.py`) | Persistent gameplay score storage |
| Desktop Packaging | Tauri v2 (Rust) | Offline Windows `.exe` installer (NSIS) |

**Why Web-based?** Chosen over Python/Pygame for zero-install browser preview, native event-driven DOM model, and easy sharing without requiring external packages.

---

## Run Options

### Option 1 — Desktop App (recommended for players, fully offline)
1. Grab `Backup/flappyflight_0.2.0_x64-setup.exe` (or `src-tauri/target/release/bundle/nsis/`).
2. Double-click the installer and follow the steps.
3. Launch **flappyflight** from the Start menu. No Python, Node, Rust, or server needed.

> The installer may show a SmartScreen prompt (it is unsigned) — choose "More info → Run anyway".

### Option 2 — Browser (development preview)
```bash
python server.py
```
The script serves `SRC/` on an available port (starting at 8001) and opens the game in your default browser. Press `Ctrl+C` to stop.

You can also open `SRC/index.html` directly in a browser — the game runs fully client-side.

### Building the desktop app (developers)
Requires Rust (MSVC toolchain), Microsoft C++ Build Tools (Desktop development with C++), Node.js 18+, and the WebView2 Runtime (bundled on Windows 11).
```bash
npm install
npm run tauri build
```
Artifact: `src-tauri/target/release/bundle/nsis/flappyflight_0.2.0_x64-setup.exe`

---

## Features

- **Physics Engine** - Gravity simulation with flap impulse, terminal velocity capping, and rotation based on vertical speed
- **Procedural Pipe Generation** - Randomized heights with progressive difficulty (gap narrows, speed increases)
- **AABB Collision Detection** - Frame-perfect circle-vs-rectangle checks for pipes and boundary limits
- **Score System** - Real-time HUD, per-pipe scoring, and high score persistence via `localStorage`
- **Game State Machine** - Clean state transitions: START -> PLAYING -> GAMEOVER
- **Dynamic Sound Effects** - Flap, score chime, and crash sounds generated via Web Audio API oscillators (zero asset files)
- **Visual Polish** - Sky gradient, scrolling clouds, animated ground, flapping wing rotation, bird glow shadow
- **Responsive Input** - Keyboard (SPACE/ArrowUp), mouse click, and touch support
- **Modern UI** - Glassmorphism overlays, gradient buttons, Outfit font, animated title
- **SQLite Score Persistence** - Gameplay scores stored server-side in `flappy_scores.db`, surviving browser clears
- **REST API** - JSON endpoints for score CRUD operations (`/api/scores`)

---

## Project Structure

```
Flappy bird/
├── readme.md                          # This file
├── changes.md                         # Development changelog
├── package.json                       # npm scripts + @tauri-apps/cli (v2)
├── app-icon.png                       # Source icon (1024x1024) for the app
├── server.py                          # Python dev server with REST API
├── db.py                              # SQLite database module (scores CRUD)
├── flappy_scores.db                   # SQLite database (auto-created on first run)
├── Document/
│   ├── Plan/
│   │   ├── FLAPPY_BIRD_Planning.md    # Project scope, deliverables, timeline
│   │   ├── implementation_plan.md     # Technical plan and open questions
│   │   └── Tauri_packaging_implementation_plan.md  # Desktop packaging plan
│   ├── Review/
│   │   └── implementation_plan_Review copy.md  # User feedback on tech decisions
│   └── Tasks/
│       ├── Implementation_tasks_flappy.md      # Task breakdown with checklist
│       ├── Implementation_tasks_packaging.md   # Packaging task breakdown
│       └── Implementation_tasks_template.md    # Reusable task template
├── SRC/                               # Game source (bundled into the .exe)
│   ├── index.html                     # Game entry point and UI structure
│   ├── style.css                      # Visual styling and animations
│   ├── game.js                        # Core game engine (652 lines)
│   └── fonts/                         # Local Outfit woff2 (offline)
├── src-tauri/                         # Tauri v2 desktop shell
│   ├── Cargo.toml, build.rs, tauri.conf.json
│   ├── capabilities/default.json
│   ├── icons/                         # Auto-generated icon set
│   └── src/{main.rs, lib.rs}
└── Backup/                            # Archived installer copies
    └── flappyflight_0.2.0_x64-setup.exe
```

---

## Controls

| Input | Action |
|-------|--------|
| `SPACE` or `Arrow Up` | Flap / Start Game |
| `Mouse Click` (on canvas) | Flap / Start Game |
| `Start Game` button | Begin new game |
| `Play Again` button | Restart after game over |

---

## Game Mechanics

### Physics Constants
| Parameter | Value | Description |
|-----------|-------|-------------|
| Gravity | `0.36` | Downward acceleration per frame |
| Flap Impulse | `-6.2` | Upward velocity applied on flap |
| Terminal Velocity | `9` | Maximum downward speed cap |
| Bird X Position | `100` | Fixed horizontal position |

### Pipe Generation
- **Spawn Rate:** Every ~105 frames (~1.7 seconds)
- **Gap Size:** Starts at `150px`, narrows by `3px` every 5 points (minimum `125px`)
- **Pipe Speed:** Starts at `2.3px/frame`, increases slightly with score
- **Height Range:** Randomized between `60px` min and screen-adjusted max

### Collision Rules
- **Ceiling:** Bird bounces down slightly (no game over)
- **Ground:** Triggers game over
- **Pipes:** AABB circle-vs-rectangle overlap triggers game over

### Difficulty Progression
- Gap size shrinks every 5 points scored
- Pipe speed increases gradually as score rises
- Combined effect: game becomes noticeably harder around score 15-20

---

## Event-Driven Architecture

This game demonstrates core event-driven programming concepts:

1. **DOM Event Listeners** - `keydown`, `mousedown`, `touchstart` for player input
2. **RequestAnimationFrame** - Game loop driven by browser's frame callback (not a blocking loop)
3. **State Machine** - Input handling routed through `GAME_STATES` (START/PLAYING/GAMEOVER)
4. **Lazy Initialization** - Web Audio `AudioContext` created on first user interaction (browser autoplay policy compliance)
5. **Event Propagation Control** - `stopPropagation()` on button clicks to prevent double-triggering
6. **Async API Calls** - `fetch()` for score persistence without blocking the game loop

---

## API Reference

The Python server exposes a REST API for score management.

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| `GET` | `/api/scores` | - | List recent scores ( newest first ) |
| `GET` | `/api/scores?difficulty=medium` | - | Filter by difficulty |
| `POST` | `/api/scores` | `{ "score": 42, "difficulty": "medium" }` | Save a new score |
| `DELETE` | `/api/scores/{id}` | - | Delete a score record |
| `GET` | `/api/scores/stats` | - | Get aggregate stats (total, high, avg) |

### Database Schema (`flappy_scores.db`)

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER | Auto-increment primary key |
| `score` | INTEGER | Final score of the game |
| `difficulty` | TEXT | `easy`, `medium`, or `hard` |
| `is_high` | INTEGER | `1` if this is the high score for its difficulty |
| `created_at` | TEXT | ISO 8601 timestamp |

---

## Visual Design

- **Color Palette:** Sky blues (`#0284c7` - `#bae6fd`), warm peach horizon, emerald pipes (`#10b981`), golden bird (`#fbbf24`), dark slate background (`#0f172a`)
- **Typography:** Outfit font (bundled locally in `SRC/fonts/`) - variable weights 400/600/800, no network dependency
- **UI Effects:** Backdrop blur glassmorphism, gradient buttons with hover lift, pulsing title animation
- **Canvas Rendering:** Procedural bird (body, eye, beak, wing), gradient pipes with caps, scrolling cloud layer, layered ground with grass

---

## Course Context

- **Course:** Event-Driven Programming
- **Project Type:** Mid-term
- **Focus Areas:** Event listeners, game loops, state management, real-time input handling

---

*Last Updated: 2026-08-28*
