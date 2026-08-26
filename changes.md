# Changelog - Faby's Flight

All notable changes and development milestones for the Flappy Bird project are documented here.

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

---

*Last Updated: 2026-08-27*
