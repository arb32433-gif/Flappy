---
tags:
  - Tasks
  - Planning
created: 2026-08-26
Project: FLAPPY_BIRD
sources: "[[FLAPPY_BIRD.pdf]]"
---

**Purpose:**
Establish a structured roadmap and task breakdown for developing the Flappy Bird clone game ("Faby's Flight"). This document tracks implementation tasks, deliverables, success criteria, and progress throughout the development cycle.

**Objective:**
Deliver a fully functional, event-driven, single-player Flappy Bird game using a web-based stack (HTML5 Canvas & JavaScript) with a helper Python server to ease local preview and testing.

**Scope:**
- **Core Physics:** 2D physics loop simulation containing continuous gravity pull and upward flap impulse.
- **Obstacle Management:** Procedural pipe generation with randomized heights, smooth horizontal scrolling, and memory-efficient cleanup (recycling/removal of off-screen pipes).
- **Collision System:** A frame-perfect boundary check (ground, ceiling) and axis-aligned bounding box (AABB) collision checks with pipe obstacles.
- **Score & Progress:** Real-time score tracking, score increments when passing pipes safely, and local persistence of the high score across sessions/restarts using Web LocalStorage.
- **User Interface:** Responsive menus representing: Start Screen (with play instructions), HUD (active score), and Game Over Screen (showing final score, high score, and a restart button).
- **Aesthetics & Audio:** Smooth ground scrolling, basic bird animation (flapping state), visual/audio feedback on crash, and audio cues generated dynamically via the Web Audio API (flap, score, crash) to avoid broken file dependencies.
- **Python Integration:** A local Python script to launch a development server and auto-open the browser to run the game.

*Exclusions:* Multiplayer features, cosmetic bird skins/shops, gameplay power-ups/items, complex particle physics/effects, and global online leaderboards.

**Deliverables:**
1. **Implementation Task List (`Document/Tasks/Implementation_tasks_flappy.md`):** This tracking document.
2. **Game Application Files:**
   - `SRC/index.html` (UI and entrypoint)
   - `SRC/style.css` (game styling/layout)
   - `SRC/game.js` (core engine/event handling)
3. **Python Server File:**
   - `server.py` (helper script to host and preview the web game locally)
4. **Documentation:**
   - Physics mechanics (gravity, jump velocity)
   - Pipe generation rules

**Success Criteria:**
- [ ] **Instant Response:** Bird responds immediately to flap input (zero noticeable latency).
- [ ] **Natural Gravity:** Gravity feel is consistent and matches classic arcade physics.
- [ ] **Procedural Spawning:** Pipe gaps are generated with sufficient space for passage and varying heights.
- [ ] **Frame-Perfect Collisions:** Collision detection checks trigger exactly when the bird's sprite bounding box overlaps with a pipe or ground.
- [ ] **Accurate Scoring:** Score increments exactly once for each pipe successfully cleared.
- [ ] **Persistent High Score:** High score is saved and remains correct across game resets and browser/app refreshes.
- [ ] **60 FPS Performance:** Game runs smoothly without stutters or drops in frame rate.
- [ ] **Clean Game Loop:** Proper game state resets (resetting score, bird position, and clearing pipe lists upon restart).

**Timeline:**
- **Phase 1: Game Design & Physics Setup (Days 1–2)**
  - [x] Set up project structure and canvas/window initialization.
  - [x] Define the event-driven input listener (Keydown/Click handlers).
  - [x] Document physics math formulas (y-acceleration, y-velocity).
- **Phase 2: Core Engine & Physics (Days 3–6)**
  - [ ] Implement the game loop (`requestAnimationFrame`).
  - [ ] Create the Bird class/object with gravity and vertical motion.
  - [ ] Integrate flap mechanics applying vertical velocity impulse.
  - [ ] Validate boundary limits (stopping or crashing at top/bottom of screen).
- **Phase 3: Pipes & Collision System (Days 7–9)**
  - [ ] Implement Pipe generator class with random heights and static gap sizes.
  - [ ] Build obstacle scroll controller to move pipes horizontally.
  - [ ] Add garbage collection to destroy off-screen pipes.
  - [ ] Write collision-detection engine between Bird box and Pipe boxes.
- **Phase 4: UI/UX & Score System (Days 10–11)**
  - [ ] Create Game State Manager (START, PLAYING, GAMEOVER).
  - [ ] Build Start and Game Over overlays.
  - [ ] Implement score tracking (checking if bird x > pipe x + width).
  - [ ] Set up local high-score persistence (`localStorage`).
- **Phase 5: Audio & Polish (Days 12–13)**
  - [ ] Design/generate sound effects (flap, score, crash) dynamically using the Web Audio API.
  - [ ] Add background scrolling (ground texture offset) to create motion illusion.
  - [ ] Add simple flapping animation/rotation to the bird based on velocity.
- **Phase 6: QA & Balancing (Day 14)**
  - [ ] Perform parameter tuning (gap size, gravity, jump impulse, speed).
  - [ ] Verify frame rate stability and resolve edge cases (multiple fast taps).

---
*Drafted by:* Antigravity
*Approved by:* User
