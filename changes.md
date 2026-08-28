# Changelog - flappyflight

All notable changes and development milestones for the Flappy Bird project are documented here.

---

## [0.3.0] - 2026-08-28

### Added - SQLite Score Persistence & REST API

Gameplay scores are now stored server-side in a SQLite database, surviving browser data clears and providing a proper backend for score tracking.

#### Database (`db.py`)
- SQLite3 module with WAL journal mode for concurrent reads
- `scores` table: `id`, `score`, `difficulty`, `is_high`, `created_at`
- Auto-initializes database on server startup
- CRUD operations: `add_score()`, `get_recent_scores()`, `delete_score()`, `get_high_score()`, `get_stats()`
- High score auto-detection per difficulty level

#### REST API (endpoints on `server.py`)
- `GET /api/scores` — List recent scores (newest first, optional `?difficulty=` filter)
- `POST /api/scores` — Save a score (`{ "score": N, "difficulty": "..." }`)
- `DELETE /api/scores/{id}` — Delete a score record
- `GET /api/scores/stats` — Aggregate stats (total games, high score, average)
- CORS headers for cross-origin requests
- OPTIONS preflight handler

#### Frontend (`SRC/game.js`)
- `ScoreAPI` class with `fetch()`-based calls (post, get, delete, getHighScore)
- `enterGameOver()` now saves to both API and localStorage (dual persistence)
- `populateDataList()` fetches from API instead of localStorage only
- `applyDifficulty()` fetches API high score on load to sync
- Fallback to localStorage when API is unavailable (offline resilience)

#### Styling (`SRC/style.css`)
- Data table styles: sticky header, hover rows, scrollable body
- `high-badge` gold indicator for high score records
- `data-glass` container with backdrop blur

---

## [0.2.0] - 2026-08-28

### Released - Offline Desktop Packaging (Tauri v2)

The game is now distributed as a single offline Windows installer. Players double-click `flappyflight_0.2.0_x64-setup.exe` and play — no Python, Node, Rust, server, or setup required.

### Renamed
- Game renamed from **"Faby's Flight"** to **"flappyflight"** across the Windows title bar, in-game title, config, and installer artifact (`flappyflight_0.2.0_x64-setup.exe`).

### Added
- `package.json` with `@tauri-apps/cli` (v2) and a `tauri` script.
- `src-tauri/` scaffold:
  - `Cargo.toml`, `build.rs` (tauri-build v2)
  - `tauri.conf.json` (productName `flappyflight`, version `0.2.0`, identifier `com.flappyflight.app`, strict CSP, NSIS bundle)
  - `src/main.rs`, `src/lib.rs` (thin entry + `generate_context!`)
  - `capabilities/default.json` (`core:default`)
  - `icons/` auto-generated from `app-icon.png` (1024x1024 bird motif)
- **`SRC/fonts/`** — local *Outfit* variable-font woff2 (latin + latin-ext), replacing the Google Fonts network dependency.

### Changed (Offline Audit)
- `SRC/index.html` — removed the `fonts.googleapis.com` `<link>`; added a `preload` for the local woff2.
- `SRC/style.css` — added local `@font-face` rules for Outfit (weights 100–900) referencing the bundled files.
- Verified `SRC/` contains **zero** external URLs, `@import`, `fetch`, or `XMLHttpRequest`.
- Existing features (physics, scoring, high score via `localStorage`, difficulty, sound) unchanged.

### Build & Artifacts
- `npm run tauri build` (release) succeeds end-to-end.
- Installer: `src-tauri/target/release/bundle/nsis/flappyflight_0.2.0_x64-setup.exe` (~1.8 MB).
- Archive copy saved to `Backup/flappyflight_0.2.0_x64-setup.exe`.
- Smoke-tested: bundled `flappyflight.exe` launches a WebView2 window and loads embedded game assets without error.

### Notes
- Unsigned installer may trigger SmartScreen — choose "More info → Run anyway". Code signing is out of scope.
- `server.py` is unchanged and remains the browser-based dev preview (not shipped).

---
## [0.1.0] - 2026-08-27

### Current Release - Fully Functional Game

The game is complete with all core features implemented and playable.

### Added

#### Game Engine (`SRC/game.js`)
- `SoundFX` class with Web Audio API oscillator-based sound generation (flap, score, crash)
- `Game` class with full game loop using `requestAnimationFrame`
- Bird physics: gravity, flap impulse, terminal velocity, velocity-based rotation
- Pipe system: procedural generation, randomized heights, horizontal scrolling, off-screen cleanup
- AABB circle-vs-rectangle collision detection for pipes and boundaries
- Score tracking with real-time HUD display
- High score persistence using `localStorage`
- Game state machine (START, PLAYING, GAMEOVER) with clean transitions
- Parallax scrolling clouds (4 cloud objects with random position/speed/scale)
- Animated ground with rolling line effect

#### User Interface (`SRC/index.html`)
- Start screen overlay with game title, instructions, and start button
- Game over screen overlay with final score, high score, and play again button
- HUD element for real-time score display during gameplay
- Responsive canvas container (400x600)

#### Styling (`SRC/style.css`)
- Dark slate body background with centered game frame
- Glassmorphism overlay panels with backdrop blur
- Gradient buttons (cyan start, green restart) with hover/active states
- Animated pulsing game title
- Score board with contrasting value display
- Keyboard badge styling for input instructions
- HUD with fade/scale transition animation

#### Development Server (`server.py`)
- Python HTTP server serving `SRC/` directory
- Auto port selection (8001-8100 range)
- Auto browser launch in background thread
- Graceful shutdown on Ctrl+C

#### Project Documentation
- Project planning document with scope, deliverables, and success criteria
- Implementation task breakdown with phase-based timeline
- Technical stack review and decision documentation
- Reusable task template for future projects

---

## [0.0.2] - 2026-08-26

### Technical Decision & Project Setup

#### Decided
- **Tech Stack:** HTML5 Canvas + Vanilla JavaScript (Option A) chosen over Python + Pygame
- **Reasoning:** Browser-native preview, no package dependencies required for viewers, fits event-driven course model
- **Audio Strategy:** Web Audio API dynamic generation instead of audio file assets

#### Created
- `Document/Plan/FLAPPY_BIRD_Planning.md` - Project scope, 14-day timeline, success criteria
- `Document/Plan/implementation_plan.md` - Technical architecture, open questions, proposed changes
- `Document/Tasks/Implementation_tasks_flappy.md` - Detailed phase-by-phase task checklist
- `Document/Tasks/Implementation_tasks_template.md` - Reusable template for task documents
- `Document/Review/implementation_plan_Review copy.md` - User feedback on tech decisions
- `implementation_plan_Review.md` - Root-level review document
- `Suggested_improvements_pong_game.md` - Notes on Pong improvements (cross-project reference)
- `SRC/` directory structure created
- `Source/` directory reserved for future assets

---

## [0.0.1] - 2026-08-25

### Project Inception

#### Initial Planning
- Defined project objective: Flappy Bird clone named "Faby's Flight"
- Scoped deliverables: game engine, mechanics, UI, visual/audio, documentation
- Identified exclusions: multiplayer, skins, power-ups, particles, leaderboards
- Established success criteria (10 items covering responsiveness, physics, collisions, scoring, performance)
- Drafted 14-day timeline across 6 phases
- Identified key technical considerations (gravity math, pipe recycling, collision algorithms, frame timing)

---

## Summary

| Version | Date | Milestone |
|---------|------|-----------|
| 0.0.1 | 2026-08-25 | Project planning and scope defined |
| 0.0.2 | 2026-08-26 | Tech stack decided, project structure created |
| 0.1.0 | 2026-08-27 | Full game implementation complete |
| 0.2.0 | 2026-08-28 | Renamed to flappyflight; offline Windows packaging via Tauri v2 |
| 0.3.0 | 2026-08-28 | SQLite score persistence and REST API |

---

*Last Updated: 2026-08-28*
