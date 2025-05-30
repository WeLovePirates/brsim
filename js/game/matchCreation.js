// js/game/matchCreation.js

import { CHARACTER_SCALE_FACTOR, drawButton } from '../ui/uiUpdates.js';
import { setCharacters } from './gameInit.js';
import { startGame, showMainMenu } from './gameLoop.js';
import { IS_BOSS_MODE } from '../config.js'; // MODIFIED: Import IS_BOSS_MODE

// State for the match creation menu
export const matchCreationState = {
    allAvailableCharactersData: [], // Stores ALL raw data from config.js
    availableCharactersForMode: [], // Filtered list based on current game mode
    selectedCharacters: new Set(), // Stores names of selected characters
    characterDisplayBoxes: [], // Stores bounding boxes for drawing/clicking character options
    currentMode: null, // 'simulator' or 'boss'
    buttons: {
        startGame: { text: 'Start Battle', x: 0, y: 0, width: 250, height: 50, action: 'startGame' },
        back: { text: 'Back to Main Menu', x: 0, y: 0, width: 250, height: 50, action: 'backToMenu' }
    },
    setAllAvailableCharacters: function(data) { // MODIFIED: Renamed function
        this.allAvailableCharactersData = data;
        this.filterCharactersForMode(); // Initial filter when data is set
    },
    setGameMode: function(mode) { // NEW: Set the current game mode
        this.currentMode = mode;
        IS_BOSS_MODE.ENABLED = (mode === 'boss'); // Update global flag
        this.filterCharactersForMode(); // Re-filter characters based on new mode
        this.selectedCharacters.clear(); // Clear selections when mode changes
    },
    filterCharactersForMode: function() { // NEW: Filters characters based on current mode
        if (this.currentMode === 'boss') {
            this.availableCharactersForMode = this.allAvailableCharactersData; // All characters available for boss mode selection
        } else { // Simulator mode
            this.availableCharactersForMode = this.allAvailableCharactersData.filter(char => !char.isDummy); // Dummies (bosses) excluded
        }
    },
    getSelectedCharactersData: function() { // Gets selected characters data
        return this.allAvailableCharactersData.filter(charData => this.selectedCharacters.has(charData.name));
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

    matchCreationState.availableCharactersForMode.forEach((charData, index) => { // MODIFIED: Use availableCharactersForMode
        const boxX = currentX;
        const boxY = currentY;

        // Store box dimensions for click detection
        matchCreationState.characterDisplayBoxes.push({
            name: charData.name,
            isDummy: charData.isDummy, // NEW: Store isDummy for click logic
            x: boxX,
            y: boxY,
            width: charBoxSize,
            height: charBoxSize
        });

        const isSelected = matchCreationState.selectedCharacters.has(charData.name);
        let fillColor = '#333';
        let borderColor = '#4a5568';

        if (isSelected) {
            fillColor = '#22c55e'; // Green if selected
        } else if (matchCreationState.currentMode === 'boss' && charData.isDummy) {
            // If in boss mode, and this is a boss, make it a distinct color if not selected
            fillColor = '#8B0000'; // Dark red for unselected boss
        } else if (matchCreationState.currentMode === 'boss' && !charData.isDummy && matchCreationState.selectedCharacters.has('Megalodon') && matchCreationState.selectedCharacters.size >= IS_BOSS_MODE.MAX_PLAYER_CHARACTERS + 1) {
            // If in boss mode, boss is selected, and max players are selected, make other players dim
            fillColor = '#555';
            borderColor = '#333';
        } else if (matchCreationState.currentMode === 'simulator' && matchCreationState.selectedCharacters.size >= matchCreationState.availableCharactersForMode.length) {
             // If in simulator mode and all players are selected, make other players dim
            fillColor = '#555';
            borderColor = '#333';
        }


        // Draw character background box
        ctx.fillStyle = fillColor;
        ctx.fillRect(boxX, boxY, charBoxSize, charBoxSize);

        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 2 * scaleFactor;
        ctx.strokeRect(boxX, boxY, charBoxSize, charBoxSize);

        // Draw character image
        if (charData.image && charData.image.complete && charData.image.naturalWidth > 0) {
            // Apply scaleFactorOverride here for drawing in the menu
            const displayScale = charData.scaleFactorOverride || 1;
            const imgWidth = charBoxSize * 0.8 * (displayScale > 1.0 ? 1.0 : displayScale); // Limit display scale in menu
            const imgHeight = charBoxSize * 0.8 * (displayScale > 1.0 ? 1.0 : displayScale); // Limit display scale in menu
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

    // Display selected count and mode-specific messages
    const selectedCountY = currentY + charBoxSize + (20 * scaleFactor);
    ctx.font = `${18 * scaleFactor}px 'Inter', sans-serif`;
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let displayMessageText = '';
    if (matchCreationState.currentMode === 'boss') {
        const selectedBosses = matchCreationState.getSelectedCharactersData().filter(char => char.isDummy);
        const selectedPlayers = matchCreationState.getSelectedCharactersData().filter(char => !char.isDummy);

        if (selectedBosses.length > 1) {
            displayMessageText = "Only ONE boss allowed!";
            ctx.fillStyle = 'red';
        } else if (selectedBosses.length === 0) {
            displayMessageText = "Select 1 Boss and up to 7 Heroes.";
        } else {
            displayMessageText = `Selected: ${selectedPlayers.length} / ${IS_BOSS_MODE.MAX_PLAYER_CHARACTERS} Heroes + 1 Boss`;
        }
    } else { // Simulator Mode
        displayMessageText = `Selected: ${matchCreationState.selectedCharacters.size} / ${matchCreationState.availableCharactersForMode.length}`;
    }
    ctx.fillText(displayMessageText, canvas.width / 2, selectedCountY);


    // Draw buttons
    const buttonWidth = matchCreationState.buttons.startGame.width * scaleFactor;
    const buttonHeight = matchCreationState.buttons.startGame.height * scaleFactor;
    const buttonSpacing = 20 * scaleFactor;

    // Start Battle button
    const startButton = matchCreationState.buttons.startGame;
    startButton.x = canvas.width / 2 - (buttonWidth / 2);
    startButton.y = selectedCountY + (30 * scaleFactor);
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
export async function handleMatchCreationClick(clickX, clickY, canvas, scaleFactor) {
    // Check character box clicks
    for (const box of matchCreationState.characterDisplayBoxes) {
        if (clickX >= box.x && clickX <= box.x + box.width &&
            clickY >= box.y && clickY <= box.y + box.height) {

            const charData = matchCreationState.allAvailableCharactersData.find(c => c.name === box.name);
            const isBoss = charData.isDummy;

            if (matchCreationState.selectedCharacters.has(box.name)) {
                matchCreationState.selectedCharacters.delete(box.name);
            } else {
                if (matchCreationState.currentMode === 'boss') {
                    const selectedBosses = matchCreationState.getSelectedCharactersData().filter(char => char.isDummy);
                    const selectedPlayers = matchCreationState.getSelectedCharactersData().filter(char => !char.isDummy);

                    if (isBoss) {
                        if (selectedBosses.length === 0) {
                            matchCreationState.selectedCharacters.add(box.name);
                        } else {
                            displayMessage("Only one boss can be selected in Boss Mode!");
                        }
                    } else { // It's a regular player character
                        if (selectedPlayers.length < IS_BOSS_MODE.MAX_PLAYER_CHARACTERS) {
                            matchCreationState.selectedCharacters.add(box.name);
                        } else {
                            displayMessage(`Maximum ${IS_BOSS_MODE.MAX_PLAYER_CHARACTERS} hero classes can be selected for Boss Mode!`);
                        }
                    }
                } else { // Simulator Mode
                    matchCreationState.selectedCharacters.add(box.name);
                }
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
                if (matchCreationState.currentMode === 'boss') {
                    const selectedBosses = matchCreationState.getSelectedCharactersData().filter(char => char.isDummy);
                    const selectedPlayers = matchCreationState.getSelectedCharactersData().filter(char => !char.isDummy);
                    if (selectedBosses.length === 1 && selectedPlayers.length > 0 && selectedPlayers.length <= IS_BOSS_MODE.MAX_PLAYER_CHARACTERS) {
                        return 'startGame';
                    } else {
                        if (selectedBosses.length !== 1) {
                            displayMessage("Boss Mode requires exactly one boss selected.");
                        } else {
                            displayMessage(`Boss Mode requires 1 to ${IS_BOSS_MODE.MAX_PLAYER_CHARACTERS} hero classes.`);
                        }
                        return null;
                    }
                } else { // Simulator Mode
                    if (matchCreationState.selectedCharacters.size > 0) {
                        return 'startGame'; // Returns 'startGame' if characters are selected
                    } else {
                        displayMessage("Please select at least one character to start the battle!");
                        return null; // Do not start if no characters are selected
                    }
                }
            }
            return button.action; // Returns button action
        }
    }

    return null; // No interactive element clicked
}