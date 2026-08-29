# Implementation Plan - Integrating Bird Skins in Flappy Bird

We have copied the 6 transparent hand-drawn bird sprites to the `Flappy bird/SRC/assets` folder. Now, we will integrate them as selectable custom skins inside the Flappy Bird game menu.

---

## Proposed Changes

We will modify three files in the Flappy Bird game directory:
1. `SRC/index.html` - Add the 6 bird options to the skin selection grid.
2. `SRC/style.css` - Add styling for the bird skin thumbnails and hover/active states.
3. `SRC/game.js` - Add bird skins to the `SKINS` config list, pre-load images, and draw them on the canvas.

---

### Component: Game Frontend (HTML/CSS)

#### [MODIFY] [index.html](file:///c:/Users/Ghing/Documents/Event%20driven%20programming/Course%20projects%20/Mid-terms/Flappy%20bird/SRC/index.html)
- Add 6 `<button class="skin-btn" data-skin="bird_N" ...>` elements in the skin grid.
- Each button will contain a thumbnail img tags of the bird (`<img class="skin-bird-thumb" src="assets/bird_N.png">`) and text label.

#### [MODIFY] [style.css](file:///c:/Users/Ghing/Documents/Event%20driven%20programming/Course%20projects%20/Mid-terms/Flappy%20bird/SRC/style.css)
- Add `.skin-bird-thumb` styling to scale the image thumbnails properly to `16x16px` to fit inside the small skin selector buttons.
- Add hover/active styling to apply a subtle white/glow drop-shadow to active bird thumbnails matching the existing dot-glow animations.

---

### Component: Game Core Engine (JavaScript)

#### [MODIFY] [game.js](file:///c:/Users/Ghing/Documents/Event%20driven%20programming/Course%20projects%20/Mid-terms/Flappy%20bird/SRC/game.js)
- Extend the global `SKINS` config object to include:
  - `bird_1` to `bird_6` keys, specifying their asset path (`imageSrc`) and custom glow color.
- Add a global `birdImages` object to pre-load all the bird images on startup.
- In `drawBird(ctx, x, y, wingAngle, skinKey, velocity = 0)`:
  - Check if the selected skin has an `imageSrc`.
  - If it is a bird image skin, render the preloaded image centered at the coordinates using the physical collision diameter of `28` (matching the bird's radius `14` parameter) and apply the rotation.
  - If it is a classic gradient skin, fall back to the vector drawing logic.

---

## Verification Plan

We will perform manual verification of the game in a web browser since automated tests are not present.

### Manual Verification Steps
1. **Server Launch**: Ensure the Flappy Bird server is running on its designated port.
2. **Main Menu Layout**: Open the page, verify that the new bird thumbnails appear inside the "Custom bird Skin" grid.
3. **Skin Swapping**:
   - Verify clicking a bird option highlights the button.
   - Verify the "skin preview canvas" updates immediately to show the selected bird.
4. **Gameplay Verification**:
   - Start the game.
   - Verify the flying bird is now rendered as the selected custom bird sprite.
   - Verify that rotation, flap responses, and collisions behave perfectly.
