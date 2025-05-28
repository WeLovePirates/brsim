// js/game/matchCreation.js

import { CHARACTER_SCALE_FACTOR, drawButton } from '../ui/uiUpdates.js';
import { setCharacters } from './gameInit.js';
// Import startGame and showMainMenu directly from gameLoop, they are now properly handled
import { startGame, showMainMenu } from './gameLoop.js';
// Character import is no longer needed here, it's handled in startGame now
// import { Character } from '../character/Character.js';
// import { INITIAL_HEALTH } from '../config.js'; // No longer directly used here

// State for the match creation menu
export const matchCreationState = {
    availableCharactersData: [], // Stores the raw data (name, image, stats etc.) from config.js
    selectedCharacters: new Set(), // Stores names of selected characters
    characterDisplayBoxes: [], // Stores bounding boxes for drawing/clicking character options
    buttons: {
        startGame: { text: 'Start Battle', x: 0, y: 0, width: 250, height: 50, action: 'startGame' },
        back: { text: 'Back to Menu', x: 0, y: 0, width: 250, height: 50, action: 'backToMenu' }
    },
    // This method will be called by gameInit to set the initial character data
    setAvailableCharacters: function(data) {
        this.availableCharactersData = data.filter(char => !char.isDummy); // Exclude dummies from selection
        // Pre-load images for selected characters, if they aren't already
        this.availableCharactersData.forEach(charData => {
            if (!charData.image.complete) {
                charData.image.src = charData.url; // Ensure image source is set if not already loaded
            }
        });
    },
    getSelectedCharactersData: function() {
        return this.availableCharactersData.filter(charData => this.selectedCharacters.has(charData.name));
    }
};

/**
 * Shows the match creation menu.
 */
export function showMatchCreationMenu() {
    // Reset selections when showing the menu
    matchCreationState.selectedCharacters.clear();
    matchCreationState.characterDisplayBoxes = []; // Clear old boxes
}

/**
 * Draws the match creation menu on the canvas.
 * @param {CanvasRenderingContext2D} ctx - The 2D rendering context.
 * @param {HTMLCanvasElement} canvas - The game canvas.
 * @param {number} scaleFactor - The current character scale factor.
 */
export function drawMatchCreationMenu(ctx, canvas, scaleFactor) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)'; // Darker overlay for match creation
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = `${36 * scaleFactor}px 'Press Start 2P'`;
    ctx.fillStyle = '#FFD700';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Select Your Classes', canvas.width / 2, 80 * scaleFactor);

    // Character selection grid
    const gridAreaWidth = canvas.width * 0.8;
    const charBoxBaseSize = 90; // Base size unscaled
    const charPaddingBase = 20; // Base padding unscaled

    const charBoxSize = charBoxBaseSize * scaleFactor;
    const charPadding = charPaddingBase * scaleFactor;

    let charsPerRow = Math.floor(gridAreaWidth / (charBoxSize + charPadding));
    if (charsPerRow === 0) charsPerRow = 1; // Ensure at least one per row

    const totalGridWidth = (charsPerRow * charBoxSize) + ((charsPerRow - 1) * charPadding);
    const startX = (canvas.width - totalGridWidth) / 2;
    const startY = 150 * scaleFactor;

    let currentX = startX;
    let currentY = startY;

    matchCreationState.characterDisplayBoxes = []; // Reset for current frame

    matchCreationState.availableCharactersData.forEach((charData, index) => {
        const boxX = currentX;
        const boxY = currentY;

        // Store box dimensions for click detection
        matchCreationState.characterDisplayBoxes.push({
            name: charData.name,
            x: boxX,
            y: boxY,
            width: charBoxSize,
            height: charBoxSize
        });

        // Draw character background box
        ctx.fillStyle = matchCreationState.selectedCharacters.has(charData.name) ? '#22c55e' : '#333'; // Green if selected
        ctx.fillRect(boxX, boxY, charBoxSize, charBoxSize);

        ctx.strokeStyle = '#4a5568';
        ctx.lineWidth = 2 * scaleFactor;
        ctx.strokeRect(boxX, boxY, charBoxSize, charBoxSize);

        // Draw character image
        if (charData.image && charData.image.complete && charData.image.naturalWidth > 0) {
            const imgWidth = charBoxSize * 0.8; // Scale image to fit box
            const imgHeight = charBoxSize * 0.8;
            const imgX = boxX + (charBoxSize - imgWidth) / 2;
            const imgY = boxY + (charBoxSize - imgHeight) / 2;
            ctx.drawImage(charData.image, imgX, imgY, imgWidth, imgHeight);
        } else {
            // Fallback for missing image
            ctx.fillStyle = '#ff0000';
            ctx.fillText('N/A', boxX + charBoxSize / 2, boxY + charBoxSize / 2);
        }

        // Draw character name
        ctx.font = `${12 * scaleFactor}px 'Inter', sans-serif`;
        ctx.fillStyle = '#e2e8f0';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(charData.name, boxX + charBoxSize / 2, boxY + charBoxSize - (5 * scaleFactor));

        currentX += charBoxSize + charPadding;
        if ((index + 1) % charsPerRow === 0) {
            currentX = startX;
            currentY += charBoxSize + charPadding;
        }
    });

    // Display selected count
    const selectedCountY = currentY + charBoxSize + (20 * scaleFactor); // Position above buttons
    ctx.font = `${18 * scaleFactor}px 'Inter', sans-serif`;
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Selected: ${matchCreationState.selectedCharacters.size} / ${matchCreationState.availableCharactersData.length}`, canvas.width / 2, selectedCountY);


    // Draw buttons
    const buttonWidth = matchCreationState.buttons.startGame.width * scaleFactor;
    const buttonHeight = matchCreationState.buttons.startGame.height * scaleFactor;
    const buttonSpacing = 20 * scaleFactor;

    // Start Battle button
    const startButton = matchCreationState.buttons.startGame;
    startButton.x = canvas.width / 2 - (buttonWidth / 2);
    startButton.y = selectedCountY + (30 * scaleFactor); // Position below selected count
    drawButton(ctx, startButton, scaleFactor);

    // Back to Menu button
    const backButton = matchCreationState.buttons.back;
    backButton.x = canvas.width / 2 - (buttonWidth / 2);
    backButton.y = startButton.y + buttonHeight + buttonSpacing;
    drawButton(ctx, backButton, scaleFactor);
}

/**
 * Handles clicks within the match creation menu.
 * @param {number} clickX - X-coordinate of the click.
 * @param {number} clickY - Y-coordinate of the click.
 * @param {HTMLCanvasElement} canvas - The game canvas.
 * @param {number} scaleFactor - The current character scale factor.
 * @returns {Promise<string|null>} Action to perform ('startGame', 'backToMenu', or null).
 */
export async function handleMatchCreationClick(clickX, clickY, canvas, scaleFactor) { // MODIFIED: Made async
    // Check character box clicks
    for (const box of matchCreationState.characterDisplayBoxes) {
        if (clickX >= box.x && clickX <= box.x + box.width &&
            clickY >= box.y && clickY <= box.y + box.height) {
            if (matchCreationState.selectedCharacters.has(box.name)) {
                matchCreationState.selectedCharacters.delete(box.name);
            } else {
                matchCreationState.selectedCharacters.add(box.name);
            }
            return null; // Handled a character selection
        }
    }

    // Check button clicks
    for (const key in matchCreationState.buttons) {
        const button = matchCreationState.buttons[key];
        const scaledWidth = button.width * scaleFactor;
        const scaledHeight = button.height * scaleFactor;
        // Buttons' x and y are updated in drawMatchCreationMenu, so use them directly.
        if (clickX >= button.x && clickX <= button.x + scaledWidth &&
            clickY >= button.y && clickY <= button.y + scaledHeight) {
            if (button.action === 'startGame') {
                if (matchCreationState.selectedCharacters.size > 0) {
                    return 'startGame';
                } else {
                    console.warn("Please select at least one character to start the battle!");
                    return null; // Do not start if no characters are selected
                }
            }
            return button.action;
        }
    }

    return null; // No interactive element clicked
}