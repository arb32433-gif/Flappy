# Faby's Flight

**An Event-Driven Flappy Bird Clone**

A single-player Flappy Bird game built for the Event-Driven Programming course mid-term project. Players control "Faby" the bird, navigating through narrow gaps between green pipes without crashing, aiming for the highest score.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Rendering | HTML5 Canvas | 2D game graphics and animations |
| Logic | Vanilla JavaScript (ES6 Classes) | Game engine, physics, collision, scoring |
| Audio | Web Audio API | Dynamic sound generation (no file dependencies) |
| Styling | CSS3 | Glassmorphism overlays, gradients, responsive layout |
| Dev Server | Python 3 `http.server` | Local development preview with auto-browser launch |

**Why Web-based?** Chosen over Python/Pygame for zero-install browser preview, native event-driven DOM model, and easy sharing without requiring external packages.

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

---

## Project Structure

```
Flappy bird/
├── readme.md                          # This file
├── changes.md                         # Development changelog
├── server.py                          # Python dev server (auto-opens browser)
├── implementation_plan_Review.md      # Stack decision review
├── Suggested_improvements_pong_game.md
├── Document/
│   ├── Plan/
│   │   ├── FLAPPY_BIRD_Planning.md    # Project scope, deliverables, timeline
│   │   └── implementation_plan.md     # Technical plan and open questions
│   ├── Review/
│   │   └── implementation_plan_Review copy.md  # User feedback on tech decisions
│   └── Tasks/
│       ├── Implementation_tasks_flappy.md      # Task breakdown with checklist
│       └── Implementation_tasks_template.md    # Reusable task template
├── SRC/
│   ├── index.html                     # Game entry point and UI structure
│   ├── style.css                      # Visual styling and animations
│   └── game.js                        # Core game engine (510 lines)
└── Source/                            # (Reserved for future assets)
```

---

## How to Run

### Prerequisites
- Python 3.x installed and available in PATH
- A modern web browser (Chrome, Firefox, Edge, Safari)

### Launch
```bash
python server.py
```

The script will:
1. Serve the `SRC/` directory on an available port (starting at 8001)
2. Automatically open the game in your default browser
3. Print the URL to the console

Press `Ctrl+C` to stop the server.

### Direct (No Server)
You can also open `SRC/index.html` directly in a browser. The game runs fully client-side.

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

---

## Visual Design

- **Color Palette:** Sky blues (`#0284c7` - `#bae6fd`), warm peach horizon, emerald pipes (`#10b981`), golden bird (`#fbbf24`), dark slate background (`#0f172a`)
- **Typography:** Outfit font (Google Fonts) - weights 400/600/800
- **UI Effects:** Backdrop blur glassmorphism, gradient buttons with hover lift, pulsing title animation
- **Canvas Rendering:** Procedural bird (body, eye, beak, wing), gradient pipes with caps, scrolling cloud layer, layered ground with grass

---

## Course Context

- **Course:** Event-Driven Programming
- **Project Type:** Mid-term
- **Focus Areas:** Event listeners, game loops, state management, real-time input handling

---

*Last Updated: 2026-08-27*
