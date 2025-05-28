// js/main.js

import { initGame } from './game/gameInit.js';
import { gameLoop } from './game/gameLoop.js'; // Import gameLoop to start it

// Initialize the game when the window loads
window.onload = async () => {
    // Await initGame to ensure all assets are loaded and dependencies are set up
    // for the gameLoop before it starts.
    await initGame();

    // Start the game loop.
    // The gameLoop function itself will then use requestAnimationFrame
    // to continuously update and render the game.
    // Passing 0 as the initial timestamp is standard for the first call.
    gameLoop(0);
};