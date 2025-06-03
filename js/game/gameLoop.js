// js/game/gameLoop.js

import { PROB_UPDATE_INTERVAL, ORIGINAL_SPEED_MAGNITUDE } from '../config.js';
import { displayMessage } from '../utils/displayUtils.js';
import {
    updateCanvasSize,
    CHARACTER_SCALE_FACTOR,
    displayGameSummary,
    addSummaryEventListeners,
    removeSummaryEventListeners,
} from '../ui/uiUpdates.js';
import { drawProbabilityMenu, drawMessageBox, drawButton } from '../ui/uiRenderer.js'; // UPDATED Import
import { calculateWinProbabilities, handleCollisions, applyStaticFieldDamage, handleShurikenCollisions } from './gameLogic.js';
import { showMatchCreationMenu, drawMatchCreationMenu, handleMatchCreationClick, matchCreationState } from './matchCreation.js';
import { getCharacters, setCharacters } from './gameInit.js';

let characters = []; // Initialized by setGameLoopDependencies
let animationFrameId; // Stores the ID returned by requestAnimationFrame
let gameRunning = false;
let gameStartTime; // Re-added: Needed for game duration calculation in summary
let gameEndTime; // Re-added: Needed for game duration calculation in summary
let lastProbUpdateTime = 0;
let mapImage;
let ctx;
let canvas;
let currentScreen = 'menu'; // 'menu', 'matchCreation', 'game', 'summary'
let cachedProbabilities = [];

// --- Fixed Timestep Variables ---
const MS_PER_UPDATE = 1000 / 60; // Target 60 game logic updates per second (16.67ms per update)
let lastFrameTimeMs = 0; // The last time `requestAnimationFrame` was called (high-resolution timestamp)
let deltaTime = 0; // Accumulator for how much time has passed since the last game logic update

// Variables for in-canvas buttons
const menuButtons = {
    start: { text: 'Start Game', x: 0, y: 0, width: 300, height: 60, action: 'showMatchCreation' },
    fullscreenToggle: { text: 'Toggle Fullscreen (F)', x: 0, y: 0, width: 300, height: 60, action: 'toggleFullscreen' }
};

// Define the "Play Again" button for the summary screen here
export const playAgainButton = {
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

    canvas.addEventListener('click', handleCanvasClick);

    document.addEventListener('fullscreenchange', () => {
        updateCanvasSize(canvas, document.fullscreenElement);
        if (!document.fullscreenElement) {
            resetGame();
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

    document.addEventListener('keydown', (event) => {
        if (event.key === 'f' || event.key === 'F') {
            toggleFullscreen();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'p' || event.key === 'P') {
            if (currentScreen === 'game') {
                if (drawProbabilityMenu.isVisible()) { // UPDATED call
                    drawProbabilityMenu.hide(); // UPDATED call
                } else {
                    drawProbabilityMenu.show(); // UPDATED call
                }
            }
        }
    });
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
            // Use currentX/Y/Width/Height which are set by drawButton
            if (clickX >= button.currentX && clickX <= button.currentX + button.currentWidth &&
                clickY >= button.currentY && clickY <= button.currentY + button.currentHeight) {
                if (button.action === 'showMatchCreation') {
                    showMatchCreationMenu();
                    currentScreen = 'matchCreation';
                } else if (button.action === 'toggleFullscreen') {
                    toggleFullscreen();
                }
                return;
            }
        }
    } else if (currentScreen === 'matchCreation') {
        // handleMatchCreationClick is now an async function, so await its result
        handleMatchCreationClick(clickX, clickY, canvas, CHARACTER_SCALE_FACTOR).then(result => {
            if (result === 'startGame') {
                startGame(true);
            } else if (result === 'backToMenu') {
                showMainMenu();
            }
        });
        return;
    } else if (currentScreen === 'summary') {
        // The play again button listener is now set up directly in uiUpdates.js
        // via addSummaryEventListeners, which uses the handlePlayAgainClick function.
        // So, this block here is no longer needed for the playAgainButton itself.
        // It's still here from your original code, but the logic has moved.
        // This 'if' block will only execute if an area OTHER than the button is clicked within the summary context.
        if (clickX >= playAgainButton.currentX && clickX <= playAgainButton.currentX + playAgainButton.currentWidth &&
            clickY >= playAgainButton.currentY && clickY >= playAgainButton.currentY + playAgainButton.currentHeight) {
            // This specific check can be removed since the listener is added to the button itself
            // However, keeping it doesn't break anything. The actual action is now handled by the listener setup.
            // resetGame(); // This will be called by the dedicated button listener now.
            return;
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
 * Draws the main menu on the canvas.
 */
function drawMainMenu() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = `${48 * CHARACTER_SCALE_FACTOR}px 'Press Start 2P'`;
    ctx.fillStyle = '#FFD700';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('BRSim', canvas.width / 2, canvas.height / 2 - 100 * CHARACTER_SCALE_FACTOR);

    // Calculate button positions for centering
    const buttonWidth = menuButtons.start.width * CHARACTER_SCALE_FACTOR;
    const buttonHeight = menuButtons.start.height * CHARACTER_SCALE_FACTOR;
    const buttonSpacing = 20 * CHARACTER_SCALE_FACTOR; // Space between buttons

    menuButtons.start.x = (canvas.width / 2) - (buttonWidth / 2);
    menuButtons.start.y = canvas.height / 2 + 0;

    menuButtons.fullscreenToggle.x = (canvas.width / 2) - (buttonWidth / 2);
    menuButtons.fullscreenToggle.y = menuButtons.start.y + buttonHeight + buttonSpacing;

    drawButton(ctx, menuButtons.start, CHARACTER_SCALE_FACTOR);
    drawButton(ctx, menuButtons.fullscreenToggle, CHARACTER_SCALE_FACTOR);

    drawMessageBox(ctx, canvas, displayMessage.currentMessage, CHARACTER_SCALE_FACTOR);
}

/**
 * Updates the game logic by one timestep.
 * This function should be called repeatedly at a fixed interval.
 */
function updateGameLogic() {
    const currentTime = Date.now();

    if (currentTime - lastProbUpdateTime > PROB_UPDATE_INTERVAL) {
        cachedProbabilities = calculateWinProbabilities(characters);
        lastProbUpdateTime = currentTime;
    }

    characters.forEach(char => char.update(characters, CHARACTER_SCALE_FACTOR));

    applyStaticFieldDamage(characters);

    handleShurikenCollisions(characters);

    handleCollisions(characters);

    const aliveCharacters = characters.filter(char => char.isAlive);
    if (aliveCharacters.length <= 1 && gameRunning) {
        gameRunning = false;
        gameEndTime = performance.now(); // Keep gameEndTime for overall duration
        currentScreen = 'summary';

        addSummaryEventListeners(canvas);

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
    animationFrameId = requestAnimationFrame(gameLoop);

    if (lastFrameTimeMs === 0) lastFrameTimeMs = timestamp;
    deltaTime += timestamp - lastFrameTimeMs;
    lastFrameTimeMs = timestamp;

    if (deltaTime > MS_PER_UPDATE * 10) {
        deltaTime = MS_PER_UPDATE * 10;
    }

    while (deltaTime >= MS_PER_UPDATE) {
        if (gameRunning) {
            updateGameLogic();
        }
        deltaTime -= MS_PER_UPDATE;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (mapImage.complete && mapImage.naturalWidth > 0) {
        ctx.drawImage(mapImage, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (currentScreen === 'menu') {
        drawMainMenu();
    } else if (currentScreen === 'matchCreation') {
        drawMatchCreationMenu(ctx, canvas, CHARACTER_SCALE_FACTOR);
    } else if (currentScreen === 'game') {
        characters = getCharacters();
        characters.forEach(char => char.draw(CHARACTER_SCALE_FACTOR));

        drawProbabilityMenu(ctx, canvas, cachedProbabilities, CHARACTER_SCALE_FACTOR); // UPDATED call
        drawMessageBox(ctx, canvas, displayMessage.currentMessage, CHARACTER_SCALE_FACTOR); // UPDATED call

    } else if (currentScreen === 'summary') {
        displayGameSummary(characters, gameStartTime, gameEndTime, canvas, ctx, playAgainButton);
    }
}

/**
 * Shows the main menu by setting the currentScreen flag.
 */
export function showMainMenu() {
    currentScreen = 'menu';
    gameRunning = false;
    removeSummaryEventListeners(canvas); // Ensure summary listeners are removed
    displayMessage("Game assets loaded. Click 'Start Game' to begin!");
}


/**
 * Starts the game.
 * @param {boolean} requestFullscreenOnStart - Whether the game should request fullscreen on start.
 */
export async function startGame(requestFullscreenOnStart) {
    if (gameRunning) return;

    if (requestFullscreenOnStart && !document.fullscreenElement) {
        toggleFullscreen();
    }

    const { Character } = await import('../character/Character.js');

    const selectedCharactersData = matchCreationState.getSelectedCharactersData();

    const newCharacters = selectedCharactersData.map(data => new Character(
        data.name,
        data.image,
        data.move,
        data.attack,
        data.defense,
        data.speed,
        CHARACTER_SCALE_FACTOR,
        data.health,
        data.secondaryAbility,
        data.secondaryAbilityCooldown,
        canvas
    ));
    setCharacters(newCharacters);

    currentScreen = 'game';
    gameStartTime = performance.now(); // Re-initialized for each new game

    deltaTime = 0;
    lastFrameTimeMs = performance.now();

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
        char.spawnTime = gameStartTime; // Set spawnTime here for the current game
        char.deathTime = 0; // Explicitly reset deathTime for a fresh start
        char.isStunned = false;
        char.buffs = {}; // NEW: Reset buffs
        char.debuffs = {}; // NEW: Reset debuffs
        char.isHealingOverTime = false; // NEW: Reset healing over time
        char.healAmountPerTick = 0; // NEW: Reset healing over time
        char.isBleeding = false; // NEW: Reset bleeding
        char.bleedDamagePerTick = 0; // NEW: Reset bleeding
        char.bleedTarget = null; // NEW: Reset bleeding
        char.damageReduction = 0; // NEW: Reset damage reduction

        char.x = Math.random() * (canvas.width - char.width);
        char.y = Math.random() * (canvas.height - char.height);

        char.dx = (Math.random() - 0.5) * ORIGINAL_SPEED_MAGNITUDE * char.speed * CHARACTER_SCALE_FACTOR;
        char.dy = (Math.random() - 0.5) * ORIGINAL_SPEED_MAGNITUDE * char.speed * CHARACTER_SCALE_FACTOR;
        if (Math.abs(char.dx) < 1 * char.speed * CHARACTER_SCALE_FACTOR) char.dx = (char.dx > 0 ? 1 : -1) * char.speed * CHARACTER_SCALE_FACTOR;
        if (Math.abs(char.dy) < 1 * char.speed * CHARACTER_SCALE_FACTOR) char.dy = (char.dy > 0 ? 1 : -1) * char.speed * CHARACTER_SCALE_FACTOR;
    });

    gameRunning = true;
    displayMessage("Battle started with special moves and stats!");

    lastProbUpdateTime = Date.now();
    cachedProbabilities = calculateWinProbabilities(characters);
}

/**
 * Resets the game to its initial state (main menu).
 * This function is now also responsible for returning from the summary screen.
 */
export function resetGame() {
    gameRunning = false;

    // Exit fullscreen if in fullscreen
    if (document.fullscreenElement) {
        document.exitFullscreen();
    }

    // Go to main menu
    showMainMenu();

    // Reset character properties for a clean slate for the *next* game.
    // Note: When you click "Play Again" and go to the main menu, the characters
    // are often re-selected, leading to new Character instances in startGame.
    // This `forEach` loop mainly ensures existing character objects are fully reset if reused,
    // though the primary cleanup for "Play Again" is `showMainMenu()` resetting the screen.
    characters = getCharacters();
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
        char.spawnTime = 0; // Reset spawnTime for a clean restart
        char.deathTime = 0; // Reset deathTime for a clean restart
        char.isStunned = false;
        char.buffs = {}; // NEW: Reset buffs
        char.debuffs = {}; // NEW: Reset debuffs
        char.isHealingOverTime = false; // NEW: Reset healing over time
        char.healAmountPerTick = 0; // NEW: Reset healing over time
        char.isBleeding = false; // NEW: Reset bleeding
        char.bleedDamagePerTick = 0; // NEW: Reset bleeding
        char.bleedTarget = null; // NEW: Reset bleeding
        char.damageReduction = 0; // NEW: Reset damage reduction

        char.x = Math.random() * (canvas.width - char.width);
        char.y = Math.random() * (canvas.height - char.height);

        char.dx = (Math.random() - 0.5) * ORIGINAL_SPEED_MAGNITUDE * char.speed * CHARACTER_SCALE_FACTOR;
        char.dy = (Math.random() - 0.5) * ORIGINAL_SPEED_MAGNITUDE * char.speed * CHARACTER_SCALE_FACTOR;
        if (Math.abs(char.dx) < 1 * char.speed * CHARACTER_SCALE_FACTOR) char.dx = (char.dx > 0 ? 1 : -1) * char.speed * CHARACTER_SCALE_FACTOR;
        if (Math.abs(char.dy) < 1 * char.speed * CHARACTER_SCALE_FACTOR) char.dy = (char.dy > 0 ? 1 : -1) * char.speed * CHARACTER_SCALE_FACTOR;
    });
}