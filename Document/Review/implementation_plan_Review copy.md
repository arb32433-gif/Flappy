---
tags:
  - Review
  - Planning
created:
Project: FLAPPY_BIRD
Sources: "[[implementation_plan]]"
Created by: User
---
This is the drafted review based on the open question from the the implementation plan. Please review anything before implementing..


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


## User's feedback 

> [!Feedback ]
> We'll proceed with option A for the sake of simple preview and testing since we are only instructed to preview our game's function without needing to be production-ready.. 

> [!Reason]
> Also when we will go web based we won't need to require anyone to have pygame package to preview the game.. 


---

## Open Questions

> [!WARNING]
> 1. **Which technical stack do you prefer?**
>    - HTML5 Canvas & Vanilla JavaScript (Web-based)
>    - Python with Pygame (Desktop-based)
> 2. **Are there any starter assets (sprites, audio) or should we generate placeholders/custom visual elements?**
> 3. **Are there specific course requirements for the event-driven architecture (e.g., custom event dispatcher, observer pattern)?**


## User's feedback 


> [!Review]
> 4. **Which technical stack do you prefer?**
> 
>    - We'll proceed with HTML5 Canvas & Vanilla JavaScript
>      with supporting python functions 
>    
> 5. **Are there any starter assets (sprites, audio) or should we generate placeholders/custom visual elements?** 
> 
> 	- None so far, please generate folders and necessary files for it
> 
>  6. **Are there specific course requirements for the event-driven architecture (e.g., custom event dispatcher, observer pattern)?**
>  
> 	- We are only instructed to create a flappy bird game that applies all necessary  event-driven component 


---
*User's reviewed and verified the plan for execution*

