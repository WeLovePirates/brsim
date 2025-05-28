// js/game/gameLoop.js

import { PROB_UPDATE_INTERVAL, ORIGINAL_SPEED_MAGNITUDE } from '../config.js';
import { displayMessage } from '../utils/displayUtils.js';
import {
    updateCanvasSize,
    CHARACTER_SCALE_FACTOR,
    drawProbabilityMenu,
    drawMessageBox,
    displayGameSummary,
    addSummaryEventListeners,
    removeSummaryEventListeners
} from '../ui/uiUpdates.js';
import { calculateWinProbabilities, handleCollisions, applyStaticFieldDamage, handleShurikenCollisions } from './gameLogic.js';

let characters = [];
let animationFrameId; // Stores the ID returned by requestAnimationFrame
let gameRunning = false;
let gameStartTime;
let gameEndTime;
let lastProbUpdateTime = 0;
let mapImage;
let ctx;
let canvas;
let currentScreen = 'menu'; // 'menu', 'game', 'summary'
let cachedProbabilities = []; // NEW: Cache probabilities for rendering

// --- Fixed Timestep Variables ---
const MS_PER_UPDATE = 1000 / 60; // Target 60 game logic updates per second (16.67ms per update)
let lastFrameTimeMs = 0; // The last time `requestAnimationFrame` was called (high-resolution timestamp)
let deltaTime = 0; // Accumulator for how much time has passed since the last game logic update

// Variables for in-canvas buttons
const menuButtons = {
    start: { text: 'Start Game', x: 0, y: 0, width: 300, height: 60, align: 'center', originalY: null, action: 'startGame' },
    fullscreenToggle: { text: 'Toggle Fullscreen (F)', x: 0, y: 0, width: 300, height: 60, align: 'center', originalY: null, action: 'toggleFullscreen' }
};

// Define the "Play Again" button for the summary screen here
export const playAgainButton = { // Exported for uiUpdates.js to update its position
    text: 'Play Again',
    width: 250,
    height: 50,
    currentX: 0, currentY: 0, currentWidth: 0, currentHeight: 0
};


/**
 * Sets the canvas context and characters array for the game loop.
 * This is called once during game initialization.
 * @param {HTMLCanvasElement} gameCanvas - The main game canvas.
 * @param {CanvasRenderingContext2D} context - The 2D rendering context of the canvas.
 * @param {Array<Character>} initialCharacters - The array of character objects.
 * @param {HTMLImageElement} initialMapImage - The map image object.
 */
export function setGameLoopDependencies(gameCanvas, context, initialCharacters, initialMapImage) {
    canvas = gameCanvas;
    ctx = context;
    characters = initialCharacters;
    mapImage = initialMapImage;

    // Add click listener to the canvas for in-canvas buttons
    canvas.addEventListener('click', handleCanvasClick);

    // Listen for fullscreen change to update canvas size and redraw
    document.addEventListener('fullscreenchange', () => {
        updateCanvasSize(canvas, document.fullscreenElement);
        // If exiting fullscreen, reset to menu to ensure proper redraw
        if (!document.fullscreenElement) {
            resetGame(); // This will properly transition to menu and handle redraw
        }
    });
    document.addEventListener('webkitfullscreenchange', () => {
        updateCanvasSize(canvas, document.fullscreenElement);
        if (!document.fullscreenElement) {
            resetGame();
        }
    });
    document.addEventListener('mozfullscreenchange', () => {
        updateCanvasSize(canvas, document.fullscreenElement);
        if (!document.fullscreenElement) {
            resetGame();
        }
    });
    document.addEventListener('msfullscreenchange', () => {
        updateCanvasSize(canvas, document.fullscreenElement);
        if (!document.fullscreenElement) {
            resetGame();
        }
    });

    // Listen for 'f' key to toggle fullscreen
    document.addEventListener('keydown', (event) => {
        if (event.key === 'f' || event.key === 'F') {
            toggleFullscreen();
        }
    });

    // Listen for 'p' key to toggle probability menu visibility
    document.addEventListener('keydown', (event) => {
        if (event.key === 'p' || event.key === 'P') {
            if (currentScreen === 'game') {
                if (drawProbabilityMenu.isVisible) {
                    drawProbabilityMenu.hide();
                } else {
                    drawProbabilityMenu.show();
                }
            }
        }
    });

    // Start the game loop (which will then call requestAnimationFrame continuously)
    // Removed from here, moved into the gameLoop function itself for recursive calls.
    // The initial call will be handled by window.onload in main.js
}

/**
 * Handles clicks on the canvas to interact with in-canvas UI.
 * @param {MouseEvent} event - The mouse event.
 */
function handleCanvasClick(event) {
    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    if (currentScreen === 'menu') {
        for (const key in menuButtons) {
            const button = menuButtons[key];
            if (clickX >= button.currentX && clickX <= button.currentX + button.currentWidth &&
                clickY >= button.currentY && clickY <= button.currentY + button.currentHeight) {
                if (button.action === 'startGame') {
                    startGame(true); // Always start with requestFullscreenOnStart true
                } else if (button.action === 'toggleFullscreen') {
                    toggleFullscreen();
                }
                return;
            }
        }
    } else if (currentScreen === 'summary') {
        // Handle "Play Again" button click
        if (clickX >= playAgainButton.currentX && clickX <= playAgainButton.currentX + playAgainButton.currentWidth &&
            clickY >= playAgainButton.currentY && clickY <= playAgainButton.currentY + playAgainButton.currentHeight) {
            resetGame(); // This will transition back to the menu
            return; // Prevent further click processing
        }
    }
}

/**
 * Toggles fullscreen mode.
 */
export function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable fullscreen mode: ${err.message}`);
        });
    } else {
        document.exitFullscreen();
    }
}


/**
 * Draws a button on the canvas.
 * @param {object} button - Button configuration.
 * @param {number} scaleFactor - The current character scale factor.
 */
function drawButton(button, scaleFactor) {
    const scaledWidth = button.width * scaleFactor;
    const scaledHeight = button.height * scaleFactor;
    let scaledX, scaledY;

    // Buttons within the menuButtons are centered horizontally
    if (button.align === 'center') {
        scaledX = canvas.width / 2 - scaledWidth / 2;
        scaledY = button.y; // Y is already scaled if `button.y` is derived from `canvas.height`
    } else { // Assume top-left aligned if not specified (e.g., playAgainButton)
        scaledX = button.x; // These will be pre-calculated by displayGameSummary
        scaledY = button.y;
    }

    ctx.fillStyle = '#1a202c'; // Dark background
    ctx.fillRect(scaledX, scaledY, scaledWidth, scaledHeight);

    ctx.strokeStyle = '#4a5568'; // Border color
    ctx.lineWidth = 2 * scaleFactor;
    ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);

    ctx.fillStyle = '#e2e8f0'; // Text color
    ctx.font = `${20 * scaleFactor}px 'Inter', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(button.text, scaledX + scaledWidth / 2, scaledY + scaledHeight / 2);

    // Store actual position for click detection
    button.currentX = scaledX;
    button.currentY = scaledY;
    button.currentWidth = scaledWidth;
    button.currentHeight = scaledHeight;
}


/**
 * Draws the main menu on the canvas.
 */
function drawMainMenu() {
    // Background is drawn in gameLoop, no need to clear/redraw map here.

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; // Dark overlay for menu
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = `${48 * CHARACTER_SCALE_FACTOR}px 'Press Start 2P'`; // Retro font for title
    ctx.fillStyle = '#FFD700'; // Gold color
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('BRSim', canvas.width / 2, canvas.height / 2 - 100 * CHARACTER_SCALE_FACTOR);

    // Update button positions relative to canvas size for the menu
    menuButtons.start.y = canvas.height / 2 + 0;
    menuButtons.start.originalY = menuButtons.start.y / CHARACTER_SCALE_FACTOR; // Store unscaled Y

    menuButtons.fullscreenToggle.y = canvas.height / 2 + 80 * CHARACTER_SCALE_FACTOR;
    menuButtons.fullscreenToggle.originalY = menuButtons.fullscreenToggle.y / CHARACTER_SCALE_FACTOR; // Store unscaled Y

    drawButton(menuButtons.start, CHARACTER_SCALE_FACTOR);
    drawButton(menuButtons.fullscreenToggle, CHARACTER_SCALE_FACTOR);

    // Draw message box (e.g., "Game assets loaded. Click 'Start Game' to begin!")
    drawMessageBox(ctx, canvas, displayMessage.currentMessage, CHARACTER_SCALE_FACTOR);
}

/**
 * Updates the game logic by one timestep.
 * This function should be called repeatedly at a fixed interval.
 */
function updateGameLogic() {
    const currentTime = Date.now();

    // Update win probabilities periodically and cache them for rendering
    if (currentTime - lastProbUpdateTime > PROB_UPDATE_INTERVAL) {
        cachedProbabilities = calculateWinProbabilities(characters); // Store in cache
        lastProbUpdateTime = currentTime;
    }

    // Update all characters
    characters.forEach(char => char.update(characters, CHARACTER_SCALE_FACTOR));

    // Apply static field damage
    applyStaticFieldDamage(characters);

    // Handle shuriken collisions
    handleShurikenCollisions(characters);

    // Handle character-to-character collisions
    handleCollisions(characters);

    // Check for game end condition
    const aliveCharacters = characters.filter(char => char.isAlive);
    if (aliveCharacters.length <= 1 && gameRunning) {
        gameRunning = false;
        gameEndTime = performance.now();
        currentScreen = 'summary'; // Transition to summary screen

        // Add summary event listeners when game ends and summary shows
        addSummaryEventListeners(canvas); // Ensure listeners are active for the summary screen

        if (aliveCharacters.length === 1) {
            displayMessage(`${aliveCharacters[0].name} wins the battle!`);
        } else {
            displayMessage("It's a draw! No one survived.");
        }
    }
}

/**
 * The main game loop, responsible for updating game state and drawing.
 * Uses a fixed timestep for consistent game logic.
 * @param {DOMHighResTimeStamp} timestamp - The current time provided by requestAnimationFrame.
 */
export function gameLoop(timestamp) {
    // THIS LINE IS CRITICAL: It schedules the NEXT frame. It must be at the start!
    animationFrameId = requestAnimationFrame(gameLoop);

    // Calculate time since last frame
    if (lastFrameTimeMs === 0) lastFrameTimeMs = timestamp; // Initialize for first frame
    deltaTime += timestamp - lastFrameTimeMs; // Accumulate time
    lastFrameTimeMs = timestamp; // Update last frame time

    // Prevent spiral of death by capping deltaTime
    if (deltaTime > MS_PER_UPDATE * 10) { // If lag spikes, don't run too many updates
        deltaTime = MS_PER_UPDATE * 10;
    }

    // Update game logic in fixed timesteps
    while (deltaTime >= MS_PER_UPDATE) {
        if (gameRunning) { // Only update game logic when game is active
            updateGameLogic();
        }
        deltaTime -= MS_PER_UPDATE;
    }

    // --- Rendering ---
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw map (as background for all screens)
    if (mapImage.complete && mapImage.naturalWidth > 0) {
        ctx.drawImage(mapImage, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (currentScreen === 'menu') {
        drawMainMenu();
    } else if (currentScreen === 'game') {
        // Draw all characters (their state is updated by updateGameLogic)
        characters.forEach(char => char.draw(CHARACTER_SCALE_FACTOR));

        // Draw UI elements *after* game objects to layer them on top
        drawProbabilityMenu(ctx, canvas, cachedProbabilities, CHARACTER_SCALE_FACTOR); // Use cached probabilities
        drawMessageBox(ctx, canvas, displayMessage.currentMessage, CHARACTER_SCALE_FACTOR);

    } else if (currentScreen === 'summary') {
        // Continuously draw the summary overlay while on this screen
        displayGameSummary(characters, gameStartTime, gameEndTime, canvas, ctx, playAgainButton);
    }
}

/**
 * Shows the main menu by setting the currentScreen flag.
 */
export function showMainMenu() {
    currentScreen = 'menu';
    gameRunning = false;
    // Remove summary event listeners if we're transitioning from summary to menu
    removeSummaryEventListeners(canvas);
    displayMessage("Game assets loaded. Click 'Start Game' to begin!");
}


/**
 * Starts the game.
 * @param {boolean} requestFullscreenOnStart - Whether the game should request fullscreen on start.
 */
export function startGame(requestFullscreenOnStart) {
    if (gameRunning) return;

    if (requestFullscreenOnStart && !document.fullscreenElement) {
        toggleFullscreen(); // Use the existing toggle function
    }

    currentScreen = 'game';
    gameStartTime = performance.now(); // Store start time for game duration

    // Reset fixed timestep variables
    deltaTime = 0;
    lastFrameTimeMs = performance.now(); // Reset lastFrameTimeMs here

    characters.forEach(char => {
        char.health = char.maxHealth;
        char.isAlive = true;
        char.lastHitTime = {};
        char.lastMoveTime = 0;
        char.lastPatchTime = 0;
        char.lastSecondaryAbilityTime = 0;
        char.secondaryAbilityActive = false;
        char.secondaryAbilityEffect = null;
        char.speed = char.originalSpeed;
        char.defense = char.originalDefense;
        char.isDodging = false;
        char.isBlockingShuriken = false;
        char.isPhasing = false;
        char.isInvisible = false;
        char.dodgeChanceBoost = 0;
        char.kills = 0;
        char.damageDealt = 0;
        char.healingDone = 0;
        char.spawnTime = gameStartTime; // Set spawn time for game summary
        char.deathTime = 0;
        char.isStunned = false; // Ensure stun state is reset

        char.x = Math.random() * (canvas.width - char.width);
        char.y = Math.random() * (canvas.height - char.height);

        // Re-initialize dx/dy with original speed and scale factor
        char.dx = (Math.random() - 0.5) * ORIGINAL_SPEED_MAGNITUDE * char.speed * CHARACTER_SCALE_FACTOR;
        char.dy = (Math.random() - 0.5) * ORIGINAL_SPEED_MAGNITUDE * char.speed * CHARACTER_SCALE_FACTOR;
        // Ensure minimum speed if dx/dy are too small
        if (Math.abs(char.dx) < 1 * char.speed * CHARACTER_SCALE_FACTOR) char.dx = (char.dx > 0 ? 1 : -1) * char.speed * CHARACTER_SCALE_FACTOR;
        if (Math.abs(char.dy) < 1 * char.speed * CHARACTER_SCALE_FACTOR) char.dy = (char.dy > 0 ? 1 : -1) * char.speed * CHARACTER_SCALE_FACTOR;
    });

    gameRunning = true;
    displayMessage("Battle started with special moves and stats!");

    lastProbUpdateTime = Date.now();
    // Force an initial probability calculation and cache it immediately
    cachedProbabilities = calculateWinProbabilities(characters);
}

/**
 * Resets the game to its initial state (main menu).
 * This function is now also responsible for returning from the summary screen.
 */
export function resetGame() {
    gameRunning = false; // Stop game logic updates

    // Exit fullscreen if active (this will trigger the fullscreenchange event, which updates canvas size)
    if (document.fullscreenElement) {
        document.exitFullscreen();
    } else {
        // If not in fullscreen, ensure canvas size is correct and then show main menu
        updateCanvasSize(canvas, false);
        showMainMenu(); // Explicitly call showMainMenu after size update
    }

    // Reset character states for the menu preview
    characters.forEach(char => {
        char.health = char.maxHealth;
        char.isAlive = true;
        char.lastHitTime = {};
        char.lastMoveTime = 0;
        char.lastPatchTime = 0;
        char.lastSecondaryAbilityTime = 0;
        char.secondaryAbilityActive = false;
        char.secondaryAbilityEffect = null;
        char.speed = char.originalSpeed;
        char.defense = char.originalDefense;
        char.isDodging = false;
        char.isBlockingShuriken = false;
        char.isPhasing = false;
        char.isInvisible = false;
        char.dodgeChanceBoost = 0;
        char.kills = 0;
        char.damageDealt = 0;
        char.healingDone = 0;
        char.spawnTime = 0;
        char.deathTime = 0;
        char.isStunned = false; // Ensure stun state is reset

        // Reset positions for menu
        char.x = Math.random() * (canvas.width - char.width);
        char.y = Math.random() * (canvas.height - char.height);

        // Re-initialize dx/dy based on current scale factor
        char.dx = (Math.random() - 0.5) * ORIGINAL_SPEED_MAGNITUDE * char.speed * CHARACTER_SCALE_FACTOR;
        char.dy = (Math.random() - 0.5) * ORIGINAL_SPEED_MAGNITUDE * char.speed * CHARACTER_SCALE_FACTOR;
        if (Math.abs(char.dx) < 1 * char.speed * CHARACTER_SCALE_FACTOR) char.dx = (char.dx > 0 ? 1 : -1) * char.speed * CHARACTER_SCALE_FACTOR;
        if (Math.abs(char.dy) < 1 * char.speed * CHARACTER_SCALE_FACTOR) char.dy = (char.dy > 0 ? 1 : -1) * char.speed * CHARACTER_SCALE_FACTOR;
    });
}