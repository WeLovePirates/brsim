// js/game/matchCreation.js

import { CHARACTER_SCALE_FACTOR } from '../ui/uiUpdates.js';
import { drawButton } from '../ui/uiRenderer.js'; // UPDATED Import
import { setCharacters } from './gameInit.js';
import { startGame, showMainMenu } from './gameLoop.js';

// State for the match creation menu
export const matchCreationState = {
    availableCharactersData: [], // Stores the raw data (name, image, stats etc.) from config.js
    selectedCharacters: new Set(), // Stores names of selected characters
    characterDisplayBoxes: [], // Stores bounding boxes for drawing/clicking character options
    buttons: {
        startGame: { text: 'Start Battle', x: 0, y: 0, width: 250, height: 50, action: 'startGame' },
        back: { text: 'Back to Menu', x: 0, y: 0, width: 250, height: 50, action: 'backToMenu' }
    }, // Buttons configuration
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
    getSelectedCharactersData: function() { // Gets selected characters data
        return this.availableCharactersData.filter(charData => this.selectedCharacters.has(charData.name));
    }
};

/**
 * Shows the match creation menu.
 */
export function showMatchCreationMenu() {
    // Reset selections when showing the menu
    matchCreationState.selectedCharacters.clear(); // Clears selected characters
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
    ctx.fillRect(0, 0, canvas.width, canvas.height); // Draws background

    ctx.font = `${36 * scaleFactor}px 'Press Start 2P'`; // Sets font for title
    ctx.fillStyle = '#FFD700'; // Sets fill style for title
    ctx.textAlign = 'center'; // Sets text alignment for title
    ctx.textBaseline = 'middle'; // Sets text baseline for title
    ctx.fillText('Select Your Classes', canvas.width / 2, 80 * scaleFactor); // Draws title

    // Character selection grid
    const gridAreaWidth = canvas.width * 0.8; // Calculates grid area width
    const charBoxBaseSize = 90; // Base size unscaled
    const charPaddingBase = 20; // Base padding unscaled

    const charBoxSize = charBoxBaseSize * scaleFactor; // Calculates character box size
    const charPadding = charPaddingBase * scaleFactor; // Calculates character padding

    let charsPerRow = Math.floor(gridAreaWidth / (charBoxSize + charPadding)); // Calculates characters per row
    if (charsPerRow === 0) charsPerRow = 1; // Ensures at least one per row

    const totalGridWidth = (charsPerRow * charBoxSize) + ((charsPerRow - 1) * charPadding); // Calculates total grid width
    const startX = (canvas.width - totalGridWidth) / 2; // Calculates starting X position
    const startY = 150 * scaleFactor; // Calculates starting Y position

    let currentX = startX; // Sets current X position
    let currentY = startY; // Sets current Y position

    matchCreationState.characterDisplayBoxes = []; // Reset for current frame

    matchCreationState.availableCharactersData.forEach((charData, index) => {
        const boxX = currentX; // Sets box X position
        const boxY = currentY; // Sets box Y position

        // Store box dimensions for click detection
        matchCreationState.characterDisplayBoxes.push({
            name: charData.name,
            x: boxX,
            y: boxY,
            width: charBoxSize,
            height: charBoxSize
        }); // Pushes box dimensions for click detection

        // Draw character background box
        ctx.fillStyle = matchCreationState.selectedCharacters.has(charData.name) ? '#22c55e' : '#333'; // Green if selected
        ctx.fillRect(boxX, boxY, charBoxSize, charBoxSize); // Draws character background box

        ctx.strokeStyle = '#4a5568'; // Sets stroke style
        ctx.lineWidth = 2 * scaleFactor; // Sets line width
        ctx.strokeRect(boxX, boxY, charBoxSize, charBoxSize); // Draws rectangle

        // Draw character image
        if (charData.image && charData.image.complete && charData.image.naturalWidth > 0) {
            const imgWidth = charBoxSize * 0.8; // Scale image to fit box
            const imgHeight = charBoxSize * 0.8; // Scale image to fit box
            const imgX = boxX + (charBoxSize - imgWidth) / 2; // Calculates image X position
            const imgY = boxY + (charBoxSize - imgHeight) / 2; // Calculates image Y position
            ctx.drawImage(charData.image, imgX, imgY, imgWidth, imgHeight); // Draws character image
        } else {
            // Fallback for missing image
            ctx.fillStyle = '#ff0000'; // Sets fallback fill style
            ctx.fillText('N/A', boxX + charBoxSize / 2, boxY + charBoxSize / 2); // Draws fallback text
        }

        // Draw character name
        ctx.font = `${12 * scaleFactor}px 'Inter', sans-serif`; // Sets font for name
        ctx.fillStyle = '#e2e8f0'; // Sets fill style for name
        ctx.textAlign = 'center'; // Sets text alignment for name
        ctx.textBaseline = 'bottom'; // Sets text baseline for name
        ctx.fillText(charData.name, boxX + charBoxSize / 2, boxY + charBoxSize - (5 * scaleFactor)); // Draws character name

        currentX += charBoxSize + charPadding; // Increments current X position
        if ((index + 1) % charsPerRow === 0) {
            currentX = startX; // Resets current X position
            currentY += charBoxSize + charPadding; // Increments current Y position
        }
    });

    // Display selected count
    const selectedCountY = currentY + charBoxSize + (20 * scaleFactor); // Position above buttons
    ctx.font = `${18 * scaleFactor}px 'Inter', sans-serif`; // Sets font for selected count
    ctx.fillStyle = '#FFFFFF'; // Sets fill style for selected count
    ctx.textAlign = 'center'; // Sets text alignment for selected count
    ctx.textBaseline = 'middle'; // Sets text baseline for selected count
    ctx.fillText(`Selected: ${matchCreationState.selectedCharacters.size} / ${matchCreationState.availableCharactersData.length}`, canvas.width / 2, selectedCountY); // Draws selected count


    // Draw buttons
    const buttonWidth = matchCreationState.buttons.startGame.width * scaleFactor; // Calculates button width
    const buttonHeight = matchCreationState.buttons.startGame.height * scaleFactor; // Calculates button height
    const buttonSpacing = 20 * scaleFactor; // Space between buttons

    // Start Battle button
    const startButton = matchCreationState.buttons.startGame; // Gets start button
    startButton.x = canvas.width / 2 - (buttonWidth / 2); // Sets start button X position
    startButton.y = selectedCountY + (30 * scaleFactor); // Position below selected count
    drawButton(ctx, startButton, scaleFactor); // Draws start button

    // Back to Menu button
    const backButton = matchCreationState.buttons.back; // Gets back button
    backButton.x = canvas.width / 2 - (buttonWidth / 2); // Sets back button X position
    backButton.y = startButton.y + buttonHeight + buttonSpacing; // Sets back button Y position
    drawButton(ctx, backButton, scaleFactor); // Draws back button
}

/**
 * Handles clicks within the match creation menu.
 * @param {number} clickX - X-coordinate of the click.
 * @param {number} clickY - Y-coordinate of the click.
 * @param {HTMLCanvasElement} canvas - The game canvas.
 * @param {number} scaleFactor - The current character scale factor.
 * @returns {Promise<string|null>} Action to perform ('startGame', 'backToMenu', or null).
 */
export async function handleMatchCreationClick(clickX, clickY, canvas, scaleFactor) {
    // Check character box clicks
    for (const box of matchCreationState.characterDisplayBoxes) {
        if (clickX >= box.x && clickX <= box.x + box.width &&
            clickY >= box.y && clickY <= box.y + box.height) {
            if (matchCreationState.selectedCharacters.has(box.name)) {
                matchCreationState.selectedCharacters.delete(box.name); // Deselects character
            } else {
                matchCreationState.selectedCharacters.add(box.name); // Selects character
            }
            return null; // Handled a character selection
        }
    }

    // Check button clicks
    for (const key in matchCreationState.buttons) {
        const button = matchCreationState.buttons[key];
        const scaledWidth = button.width * scaleFactor; // Calculates scaled button width
        const scaledHeight = button.height * scaleFactor; // Calculates scaled button height
        // Buttons' x and y are updated in drawMatchCreationMenu, so use them directly.
        if (clickX >= button.x && clickX <= button.x + scaledWidth &&
            clickY >= button.y && clickY <= button.y + scaledHeight) {
            if (button.action === 'startGame') {
                if (matchCreationState.selectedCharacters.size > 0) {
                    return 'startGame'; // Returns 'startGame' if characters are selected
                } else {
                    console.warn("Please select at least one character to start the battle!"); // Warns if no characters are selected
                    return null; // Do not start if no characters are selected
                }
            }
            return button.action; // Returns button action
        }
    }

    return null; // No interactive element clicked
}