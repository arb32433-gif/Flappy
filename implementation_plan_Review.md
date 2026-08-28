# Flappy Bird Game Development Implementation Plan

Draft the detailed development plan and task breakdown for Flappy Bird in `Implementation_tasks_flappy.md` based on the planning template and requirements. Prepare the project architecture and clarify technical stack decisions before implementing the game engine.

## User Review Required

> [!IMPORTANT]
> We need to align on the technical stack for this project. Since the course is "Event-driven programming", we propose two main approaches:
> 1. **Option A (Web-based): HTML5 Canvas + JavaScript.** (Highly recommended)
>    - Runs natively in any browser.
>    - Simple to preview, test, and package.
>    - Event-driven via DOM events (`keydown`, `click`, `requestAnimationFrame`).
> 2. **Option B (Desktop-based): Python + Pygame.**
>    - Runs locally in Python.
>    - Fits well if other course projects are in Python.
>    - Event-driven via Pygame event loop (`pygame.event.get()`).

Please review the proposed plan structure in [Implementation_tasks_flappy.md](file:///c:/Users/Ghing/Documents/Event%20driven%20programming/Course%20projects/Mid-terms/Flappy%20bird/Implementation_tasks_flappy.md) and indicate your preference.

## Open Questions

> [!WARNING]
> 1. **Which technical stack do you prefer?**
>    - HTML5 Canvas & Vanilla JavaScript (Web-based)
>    - Python with Pygame (Desktop-based)
> 2. **Are there any starter assets (sprites, audio) or should we generate placeholders/custom visual elements?**
> 3. **Are there specific course requirements for the event-driven architecture (e.g., custom event dispatcher, observer pattern)?**

## Proposed Changes

### Documentation & Planning

#### [NEW] [implementation_tasks_flappy.md](file:///c:/Users/Ghing/Documents/Event%20driven%20programming/Course%20projects/Mid-terms/Flappy%20bird/Implementation_tasks_flappy.md)
- Populate this file using the structure defined in [Implementation_tasks_template.md](file:///c:/Users/Ghing/Documents/Event%20driven%20programming/Course%20projects/Mid-terms/Flappy%20bird/Implementation_tasks_template.md) and details from [FLAPPY_BIRD_Planning.md](file:///c:/Users/Ghing/Documents/Event%20driven%20programming/Course%20projects/Mid-terms/Flappy%20bird/FLAPPY_BIRD_Planning.md).
- Detail each phase of the project (Physics, Obstacles, Collisions, UI/Score, Audio/Assets, Balancing).

---

### Core Game Application (Target Files pending Tech Stack decision)

#### [NEW] `index.html` / `game.js` (Web) OR `main.py` (Python)
- Core game engine container.
- Implementation of the game loop and event listener (keyboard/mouse inputs).
- Gravity, velocity, and jump mechanics for Faby the bird.
- Pipe generation, movement, and recycling algorithms.
- Collision detection with pipes and boundary limits.
- Score counting and high-score persistence.

---

## Verification Plan

### Automated Tests
- For Web/JS: ESLint checks for syntax correctness.
- For Python: Pylint/flake8 checks.

### Manual Verification
- **Input responsiveness**: Verify Faby flaps immediately upon keydown/click.
- **Physics feel**: Test gravity acceleration and flap impulse force to ensure standard Flappy Bird feel.
- **Pipe behavior**: Confirm random pipe generation within min/max height limits, and proper spacing.
- **Collisions**: Verify collision triggers immediately when Faby hits a pipe or the ground.
- **High Scores**: Verify high scores are saved locally and load correctly upon restart.

Review paln 
✅ I've reviewed the implementation plan.


