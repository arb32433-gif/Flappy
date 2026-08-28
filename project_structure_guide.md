# Project Structure Guide

**Pattern extracted from:** [[readme]]

---

## Overview

This document describes the project structure pattern used in **Faby's Flight** and how it can be applied to other course projects. The structure separates concerns into documentation, source code, and utility scripts.

---

## Directory Layout

```
Project Name/
├── readme.md                          # Main project documentation
├── changes.md                         # Development changelog / version history
├── server.py                          # Dev server script (language-dependent)
├── implementation_plan_Review.md      # Tech stack decision review
├── Document/
│   ├── Plan/
│   │   ├── Project_Planning.md        # Scope, deliverables, timeline
│   │   └── implementation_plan.md     # Technical decisions and open questions
│   ├── Review/
│   │   └── feedback_notes.md          # User feedback on implementation
│   └── Tasks/
│       ├── task_breakdown.md          # Task checklist with status
│       └── task_template.md           # Reusable task list template
├── SRC/
│   ├── index.html                     # App entry point (for web projects)
│   ├── style.css                      # Styling
│   └── app.js                         # Core application logic
└── Source/                            # Reserved for future assets (images, audio, etc.)
```

---

## Purpose of Each File

| File / Folder | Purpose |
|---------------|---------|
| `readme.md` | Main project documentation — tech stack, features, how to run, controls, and context |
| `changes.md` | Running changelog — entries added as development progresses |
| `server.py` | Local dev server — auto-opens browser, serves the `SRC/` directory |
| `implementation_plan_Review.md` | Documents why certain tech choices were made and feedback received |
| `Document/` | All project planning and task tracking materials |
| `Document/Plan/` | High-level planning: scope, milestones, technical approach |
| `Document/Review/` | Feedback and iteration notes from reviews or presentations |
| `Document/Tasks/` | Task breakdowns with checklists — one file per work session or module |
| `SRC/` | Source code — the runnable application lives here |
| `Source/` | Placeholder for future assets (images, sounds, data files) |

---

## Why This Structure

- **Separation of concerns** — Planning docs don't clutter the source code folder
- **Scalability** — New documents can be added under `Document/` without restructuring
- **Self-contained** — Each project folder is fully independent; no shared dependencies
- **Portable** — Works across platforms; only requires a browser and optional Python server
- **Versionable** — Clean enough for git tracking without `.gitignore` complexity

---

## Applicability

This pattern works well for:
- Web-based course projects (HTML/CSS/JS)
- Single-page applications
- Prototype / demo projects
- Any project where the deliverable is primarily a browser-based app

For projects with compiled languages or multiple build targets, consider adding a `build/` or `dist/` folder and removing `server.py` in favor of a proper build script.

---

*Last Updated: 2026-08-27*
