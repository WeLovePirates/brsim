// js/ui/uiUpdates.js

import { REFERENCE_GAME_WIDTH } from '../config.js';
import { displayMessage } from '../utils/displayUtils.js';
// Import the shared button object and the resetGame/showMainMenu functions from gameLoop.js
import { playAgainButton, resetGame, showMainMenu } from '../game/gameLoop.js'; 

export let CHARACTER_SCALE_FACTOR = 1;

let _calculateWinProbabilities = null;
let probabilityMenuVisible = true; // State for probability menu visibility

// For in-canvas scrolling, these need to persist between frames
let summaryScrollYOffset = 0;
let isDraggingSummary = false;
let lastMouseY = 0;

// Named functions for event listeners to allow proper removal
function handleSummaryWheel(event) {
    const canvas = event.currentTarget; // Get canvas from event target
    const rect = canvas.getBoundingClientRect();
    const summaryBoxWidth = canvas.width * 0.7;
    const summaryBoxHeight = canvas.height * 0.55; // Must match displayGameSummary
    const summaryBoxX = (canvas.width - summaryBoxWidth) / 2;
    const summaryBoxY = 180 * CHARACTER_SCALE_FACTOR;

    if (event.clientX >= summaryBoxX && event.clientX <= summaryBoxX + summaryBoxWidth &&
        event.clientY >= summaryBoxY && event.clientY <= summaryBoxY + summaryBoxHeight) {
        event.preventDefault(); // Prevent page scroll
        const totalContentHeight = playAgainButton._totalSummaryContentHeight; // Use cached total height
        const maxScrollY = Math.max(0, totalContentHeight - summaryBoxHeight);
        summaryScrollYOffset += event.deltaY * 0.5; // Adjust scroll speed
        summaryScrollYOffset = Math.max(0, Math.min(summaryScrollYOffset, maxScrollY));
    }
}

function handleSummaryMouseDown(event) {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const summaryBoxWidth = canvas.width * 0.7;
    const summaryBoxHeight = canvas.height * 0.55;
    const summaryBoxX = (canvas.width - summaryBoxWidth) / 2;
    const summaryBoxY = 180 * CHARACTER_SCALE_FACTOR;

    if (event.clientX >= summaryBoxX && event.clientX <= summaryBoxX + summaryBoxWidth &&
        event.clientY >= summaryBoxY && event.clientY <= summaryBoxY + summaryBoxHeight) {
        isDraggingSummary = true;
        lastMouseY = event.clientY;
        event.preventDefault(); // Prevent text selection etc.
    }
}

function handleSummaryMouseMove(event) {
    if (isDraggingSummary) {
        const canvas = event.currentTarget;
        const totalContentHeight = playAgainButton._totalSummaryContentHeight;
        const summaryBoxHeight = canvas.height * 0.55;
        const maxScrollY = Math.max(0, totalContentHeight - summaryBoxHeight);

        const deltaY = event.clientY - lastMouseY;
        summaryScrollYOffset -= deltaY; // Invert for natural drag direction
        summaryScrollYOffset = Math.max(0, Math.min(summaryScrollYOffset, maxScrollY));
        lastMouseY = event.clientY;
    }
}

function handleSummaryMouseUp() {
    isDraggingSummary = false;
}

function handleSummaryMouseOut() { // Stop dragging if mouse leaves canvas
    isDraggingSummary = false;
}

// NEW: Event listener for the "Play Again" button click
function handlePlayAgainClick(event) {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    // Check if the click was within the "Play Again" button's drawn area
    if (clickX >= playAgainButton.currentX && clickX <= playAgainButton.currentX + playAgainButton.currentWidth &&
        clickY >= playAgainButton.currentY && clickY <= playAgainButton.currentY + playAgainButton.currentHeight) {
        resetGame(); // Call resetGame which will then call showMainMenu
    }
}


/**
 * Adds event listeners for summary screen scrolling/dragging and the "Play Again" button.
 * @param {HTMLCanvasElement} canvas - The game canvas.
 */
export function addSummaryEventListeners(canvas) {
    // Ensure listeners are only added once
    if (!canvas._summaryListenersAdded) {
        canvas.addEventListener('wheel', handleSummaryWheel, { passive: false });
        canvas.addEventListener('mousedown', handleSummaryMouseDown);
        canvas.addEventListener('mousemove', handleSummaryMouseMove);
        canvas.addEventListener('mouseup', handleSummaryMouseUp);
        canvas.addEventListener('mouseout', handleSummaryMouseOut); // Use mouseout on canvas itself
        canvas.addEventListener('click', handlePlayAgainClick); // ADDED: Click listener for Play Again button

        canvas._summaryListenersAdded = true;
        summaryScrollYOffset = 0; // Reset scroll on entering summary
    }
}

/**
 * Removes event listeners for summary screen scrolling/dragging and the "Play Again" button.
 * @param {HTMLCanvasElement} canvas - The game canvas.
 */
export function removeSummaryEventListeners(canvas) {
    if (canvas._summaryListenersAdded) {
        canvas.removeEventListener('wheel', handleSummaryWheel);
        canvas.removeEventListener('mousedown', handleSummaryMouseDown);
        canvas.removeEventListener('mousemove', handleSummaryMouseMove);
        canvas.removeEventListener('mouseup', handleSummaryMouseUp);
        canvas.removeEventListener('mouseout', handleSummaryMouseOut);
        canvas.removeEventListener('click', handlePlayAgainClick); // ADDED: Remove click listener

        canvas._summaryListenersAdded = false;
        summaryScrollYOffset = 0; // Reset scroll position for next time
    }
}


/**
 * Sets the function to calculate win probabilities, provided by gameLogic.
 * @param {function} func - The function to calculate win probabilities.
 */
export function setCalculateWinProbabilitiesFunction(func) {
    _calculateWinProbabilities = func;
}

/**
 * Updates the canvas size based on window dimensions and fullscreen status.
 * Now primarily handles scaling and responsiveness for the canvas itself.
 * @param {HTMLCanvasElement} canvas - The game canvas element.
 * @param {boolean} isFullScreen - True if the game is in fullscreen mode.
 */
export function updateCanvasSize(canvas, isFullScreen = false) {
    let canvasWidth, canvasHeight;

    if (isFullScreen) {
        canvasWidth = window.innerWidth;
        canvasHeight = window.innerHeight;
        canvas.style.position = 'static';
        canvas.style.left = '0';
        canvas.style.top = '0';
        canvas.style.transform = 'none';
    } else {
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;

        const horizontalBuffer = 60;
        const verticalBuffer = 60;

        canvasWidth = viewportWidth - horizontalBuffer;
        canvasHeight = viewportHeight - verticalBuffer;

        const targetAspectRatio = REFERENCE_GAME_WIDTH / 700;
        const currentAspectRatio = canvasWidth / canvasHeight;

        if (currentAspectRatio > targetAspectRatio) {
            canvasWidth = canvasHeight * targetAspectRatio;
        } else {
            canvasHeight = canvasWidth / targetAspectRatio;
        }

        if (canvasHeight < 250) canvasHeight = 250;
        if (canvasWidth < 400) canvasWidth = 400;

        if (canvasHeight > 800) canvasHeight = 800;
        if (canvasWidth > 1200) canvasWidth = 1200;

        canvas.style.position = 'absolute';
        canvas.style.left = '50%';
        canvas.style.top = '50%';
        canvas.style.transform = 'translate(-50%, -50%)';
    }

    canvas.height = canvasHeight;
    canvas.width = canvasWidth;
    canvas.style.display = 'block';

    CHARACTER_SCALE_FACTOR = canvas.width / REFERENCE_GAME_WIDTH;
    if (CHARACTER_SCALE_FACTOR < 0.5) CHARACTER_SCALE_FACTOR = 0.5;
    if (CHARACTER_SCALE_FACTOR > 2) CHARACTER_SCALE_FACTOR = 2;
}

/**
 * Draws the win probability menu on the canvas.
 * @param {CanvasRenderingContext2D} ctx - The 2D rendering context.
 * @param {HTMLCanvasElement} canvas - The game canvas.
 * @param {Array<object>} probabilities - An array of objects with character name and win probability.
 * @param {number} scaleFactor - The current character scale factor.
 */
export function drawProbabilityMenu(ctx, canvas, probabilities, scaleFactor) {
    if (!probabilityMenuVisible) return;

    const padding = 10 * scaleFactor;
    const lineHeight = 20 * scaleFactor;
    const titleHeight = 25 * scaleFactor;
    const minHeight = 50 * scaleFactor; // Minimum height for the box

    const numPlayers = probabilities.length;
    let requiredContentHeight = titleHeight + (numPlayers * lineHeight);
    if (numPlayers === 0) requiredContentHeight += lineHeight; // For "No active players" message
    else if (numPlayers === 1) requiredContentHeight += lineHeight; // For "X wins!" message

    const menuHeight = Math.max(minHeight, requiredContentHeight + padding * 2);
    const menuWidth = 180 * scaleFactor; // Fixed width for simplicity

    const menuX = canvas.width - menuWidth - padding;
    const menuY = padding;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(menuX, menuY, menuWidth, menuHeight);

    ctx.strokeStyle = '#4a5568';
    ctx.lineWidth = 2 * scaleFactor;
    ctx.strokeRect(menuX, menuY, menuWidth, menuHeight);

    ctx.font = `${16 * scaleFactor}px 'Inter', sans-serif`;
    ctx.fillStyle = '#e2e8f0';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('Win Probabilities:', menuX + padding, menuY + padding);

    let currentY = menuY + titleHeight + padding;

    if (probabilities.length === 0) {
        ctx.font = `${12 * scaleFactor}px 'Inter', sans-serif`;
        ctx.fillStyle = '#ccc';
        ctx.fillText('No active players.', menuX + padding, currentY);
    } else if (probabilities.length === 1) {
        ctx.font = `${14 * scaleFactor}px 'Inter', sans-serif`;
        ctx.fillStyle = '#22c55e';
        ctx.fillText(`${probabilities[0].name}: 100.0%`, menuX + padding, currentY);
    } else {
        probabilities.sort((a, b) => b.probability - a.probability);

        probabilities.forEach(probData => {
            ctx.font = `${12 * scaleFactor}px 'Inter', sans-serif`;
            ctx.fillStyle = '#cbd5e0';
            ctx.fillText(`${probData.name}: ${probData.probability.toFixed(1)}%`, menuX + padding, currentY);
            currentY += lineHeight;
        });
    }
}

drawProbabilityMenu.isVisible = probabilityMenuVisible;
drawProbabilityMenu.show = () => { probabilityMenuVisible = true; drawProbabilityMenu.isVisible = true; };
drawProbabilityMenu.hide = () => { probabilityMenuVisible = false; drawProbabilityMenu.isVisible = false; };


/**
 * Draws the message box on the canvas.
 * @param {CanvasRenderingContext2D} ctx - The 2D rendering context.
 * @param {HTMLCanvasElement} canvas - The game canvas.
 * @param {string} message - The message to display.
 * @param {number} scaleFactor - The current character scale factor.
 */
export function drawMessageBox(ctx, canvas, message, scaleFactor) {
    if (!message) return;

    const boxWidth = 400 * scaleFactor;
    const boxHeight = 40 * scaleFactor;
    const boxX = (canvas.width / 2) - (boxWidth / 2);
    const boxY = 10 * scaleFactor;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

    ctx.strokeStyle = '#4a5568';
    ctx.lineWidth = 2 * scaleFactor;
    ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

    ctx.font = `${16 * scaleFactor}px 'Inter', sans-serif`;
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(message, boxX + (boxWidth / 2), boxY + (boxHeight / 2));
}

/**
 * Draws a button on the canvas.
 * @param {CanvasRenderingContext2D} ctx - The 2D rendering context.
 * @param {object} button - Button configuration. Must include x, y, width, height, text.
 * @param {number} scaleFactor - The current character scale factor.
 */
export function drawButton(ctx, button, scaleFactor) { // Changed to export
    const scaledWidth = button.width * scaleFactor;
    const scaledHeight = button.height * scaleFactor;
    const scaledX = button.x;
    const scaledY = button.y;

    ctx.fillStyle = '#1a202c';
    ctx.fillRect(scaledX, scaledY, scaledWidth, scaledHeight);

    ctx.strokeStyle = '#4a5568';
    ctx.lineWidth = 2 * scaleFactor;
    ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = `${20 * scaleFactor}px 'Inter', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(button.text, scaledX + scaledWidth / 2, scaledY + scaledHeight / 2);

    button.currentX = scaledX;
    button.currentY = scaledY;
    button.currentWidth = scaledWidth;
    button.currentHeight = scaledHeight;
}

/**
 * Displays the game summary overlay with character statistics directly on the canvas.
 * Now includes a scrollable area for stats and a "Play Again" button.
 * @param {Array<Character>} characters - The array of character objects.
 * @param {number} gameStartTime - The timestamp when the game started.
 * @param {number} gameEndTime - The timestamp when the game ended.
 * @param {HTMLCanvasElement} canvas - The game canvas.
 * @param {CanvasRenderingContext2D} ctx - The 2D rendering context.
 * @param {object} playAgainButtonObject - The shared button object from gameLoop.js to update its position.
 */
export function displayGameSummary(characters, gameStartTime, gameEndTime, canvas, ctx, playAgainButtonObject) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = `${40 * CHARACTER_SCALE_FACTOR}px 'Press Start 2P'`;
    ctx.fillStyle = '#FFD700';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Battle Results', canvas.width / 2, 80 * CHARACTER_SCALE_FACTOR);

    const durationMs = gameEndTime - gameStartTime;
    const durationSeconds = (durationMs / 1000).toFixed(1);

    ctx.font = `${20 * CHARACTER_SCALE_FACTOR}px 'Inter', sans-serif`;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`Game Duration: ${durationSeconds} seconds`, canvas.width / 2, 140 * CHARACTER_SCALE_FACTOR);

    const rankedCharacters = [];
    let winner = null;

    characters.forEach(char => {
        let timeAliveMs = 0;
        if (char.isAlive) {
            timeAliveMs = gameEndTime - char.spawnTime;
            winner = char;
        } else {
            timeAliveMs = char.deathTime - char.spawnTime;
        }

        rankedCharacters.push({
            char: char,
            timeAliveMs: timeAliveMs,
            // timeAliveSeconds: (timeAliveMs / 1000).toFixed(1) // Removed this line, as it's not displayed
        });
    });

    rankedCharacters.sort((a, b) => {
        if (a.char === winner) return -1;
        if (b.char === winner) return 1;

        // Use timeAliveMs in scoring calculation, even if not displayed
        const a_score = (a.char.damageDealt * 0.2) + (a.char.kills * 100) + (a.char.healingDone * 0.5) + (a.timeAliveMs * 0.01);
        const b_score = (b.char.damageDealt * 0.2) + (b.char.kills * 100) + (b.char.healingDone * 0.5) + (b.timeAliveMs * 0.01);

        return b_score - a_score;
    });

    // --- Draw scrollable summary area ---
    const summaryBoxWidth = canvas.width * 0.7;
    const summaryBoxHeight = canvas.height * 0.55; // Adjusted height
    const summaryBoxX = (canvas.width - summaryBoxWidth) / 2;
    const summaryBoxY = 180 * CHARACTER_SCALE_FACTOR;

    const offscreenCanvas = document.createElement('canvas');
    const offscreenCtx = offscreenCanvas.getContext('2d');
    offscreenCanvas.width = summaryBoxWidth;

    let contentLineHeight = 65 * CHARACTER_SCALE_FACTOR;
    let totalContentHeight = rankedCharacters.length * contentLineHeight;
    offscreenCanvas.height = Math.max(summaryBoxHeight, totalContentHeight);

    // Cache total content height for scroll logic. This is read by handleSummaryWheel/MouseMove
    playAgainButtonObject._totalSummaryContentHeight = totalContentHeight;


    let currentContentY = 0;

    rankedCharacters.forEach((data, index) => {
        const char = data.char;
        offscreenCtx.font = `${22 * CHARACTER_SCALE_FACTOR}px 'Press Start 2P'`;
        offscreenCtx.fillStyle = '#e2e8f0';
        offscreenCtx.textAlign = 'center';
        offscreenCtx.textBaseline = 'middle';
        offscreenCtx.fillText(`#${index + 1} - ${char.name} ${char === winner ? '(Winner!)' : ''}`, offscreenCanvas.width / 2, currentContentY + (20 * CHARACTER_SCALE_FACTOR));

        offscreenCtx.font = `${16 * CHARACTER_SCALE_FACTOR}px 'Inter', sans-serif`;
        offscreenCtx.fillStyle = '#cbd5e0';
        // MODIFIED: Removed 'Time Alive' from the display string
        offscreenCtx.fillText(`Health: ${char.health.toFixed(0)} | Kills: ${char.kills} | Damage: ${char.damageDealt.toFixed(0)} | Healing: ${char.healingDone.toFixed(0)}`, offscreenCanvas.width / 2, currentContentY + (45 * CHARACTER_SCALE_FACTOR));
        currentContentY += contentLineHeight;
    });

    // Draw the clipped portion of the offscreen canvas onto the main canvas
    ctx.drawImage(offscreenCanvas,
                  0, summaryScrollYOffset, // Source X, Y on offscreen canvas (controlled by scroll)
                  offscreenCanvas.width, summaryBoxHeight, // Source Width, Height (what we see)
                  summaryBoxX, summaryBoxY, // Destination X, Y on main canvas
                  summaryBoxWidth, summaryBoxHeight); // Destination Width, Height


    ctx.strokeStyle = '#4a5568';
    ctx.lineWidth = 3 * CHARACTER_SCALE_FACTOR;
    ctx.strokeRect(summaryBoxX, summaryBoxY, summaryBoxWidth, summaryBoxHeight);

    // --- Draw the "Play Again" button ---
    playAgainButtonObject.x = canvas.width / 2 - (playAgainButtonObject.width * CHARACTER_SCALE_FACTOR) / 2;
    playAgainButtonObject.y = canvas.height - 80 * CHARACTER_SCALE_FACTOR;

    drawButton(ctx, playAgainButtonObject, CHARACTER_SCALE_FACTOR);
}

/**
 * Initializes UI mechanics. Now primarily sets up the canvas and resize listener.
 * No longer creates external buttons or probability menu.
 * @param {HTMLCanvasElement} canvas - The game canvas.
 */
export function initUIMechanics(canvas) {
    updateCanvasSize(canvas, document.fullscreenElement);
}