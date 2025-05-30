// js/game/matchCreation.js

import { CHARACTER_SCALE_FACTOR, drawButton } from '../ui/uiUpdates.js';
import { setCharacters } from './gameInit.js';
import { startGame, showMainMenu } from './gameLoop.js';
import { IS_BOSS_MODE, MEGALODON_TITLE_COLOR } from '../config.js'; // MODIFIED: Import MEGALODON_TITLE_COLOR

// State for the match creation menu
export const matchCreationState = {
    allAvailableCharactersData: [],
    availableCharactersForMode: [],
    selectedCharacters: new Set(),
    characterDisplayBoxes: [],
    currentMode: null, // 'simulator' or 'boss'
    buttons: {
        startGame: { text: 'Start Battle', x: 0, y: 0, width: 250, height: 50, action: 'startGame' },
        back: { text: 'Back to Main Menu', x: 0, y: 0, width: 250, height: 50, action: 'backToMenu' }
    },
    setAllAvailableCharacters: function(data) {
        this.allAvailableCharactersData = data;
        this.filterCharactersForMode();
    },
    setGameMode: function(mode) {
        this.currentMode = mode;
        IS_BOSS_MODE.ENABLED = (mode === 'boss');
        this.filterCharactersForMode();
        this.selectedCharacters.clear();
    },
    filterCharactersForMode: function() {
        if (this.currentMode === 'boss') {
            this.availableCharactersForMode = this.allAvailableCharactersData; // All characters available for boss mode selection (including boss)
        } else { // Simulator mode
            this.availableCharactersForMode = this.allAvailableCharactersData.filter(char => !char.isBoss); // MODIFIED: Filter out isBoss
        }
    },
    getSelectedCharactersData: function() {
        return this.allAvailableCharactersData.filter(charData => this.selectedCharacters.has(charData.name));
    }
};

/**
 * Shows the match creation menu.
 */
export function showMatchCreationMenu() {
    matchCreationState.selectedCharacters.clear();
    matchCreationState.characterDisplayBoxes = [];
}

/**
 * Draws the match creation menu on the canvas.
 * @param {CanvasRenderingContext2D} ctx - The 2D rendering context.
 * @param {HTMLCanvasElement} canvas - The game canvas.
 * @param {number} scaleFactor - The current character scale factor.
 */
export function drawMatchCreationMenu(ctx, canvas, scaleFactor) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = `${36 * scaleFactor}px 'Press Start 2P'`;
    ctx.fillStyle = '#FFD700';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Select Your Classes', canvas.width / 2, 80 * scaleFactor);

    const gridAreaWidth = canvas.width * 0.8;
    const charBoxBaseSize = 90;
    const charPaddingBase = 20;

    const charBoxSize = charBoxBaseSize * scaleFactor;
    const charPadding = charPaddingBase * scaleFactor;

    let charsPerRow = Math.floor(gridAreaWidth / (charBoxSize + charPadding));
    if (charsPerRow === 0) charsPerRow = 1;

    const totalGridWidth = (charsPerRow * charBoxSize) + ((charsPerRow - 1) * charPadding);
    const startX = (canvas.width - totalGridWidth) / 2;
    const startY = 150 * scaleFactor;

    let currentX = startX;
    let currentY = startY;

    matchCreationState.characterDisplayBoxes = [];

    matchCreationState.availableCharactersForMode.forEach((charData, index) => {
        const boxX = currentX;
        const boxY = currentY;

        matchCreationState.characterDisplayBoxes.push({
            name: charData.name,
            isBoss: charData.isBoss, // MODIFIED: Store isBoss
            x: boxX,
            y: boxY,
            width: charBoxSize,
            height: charBoxSize
        });

        const isSelected = matchCreationState.selectedCharacters.has(charData.name);
        let fillColor = '#333';
        let borderColor = '#4a5568';
        let nameColor = '#e2e8f0'; // Default name color

        if (isSelected) {
            fillColor = '#22c55e';
        } else if (charData.isBoss && matchCreationState.currentMode === 'boss') { // Unselected boss in boss mode
            fillColor = '#500000'; // Darker red for unselected boss
            nameColor = MEGALODON_TITLE_COLOR; // Megalodon-specific name color
        } else if (matchCreationState.currentMode === 'boss') { // Other characters in boss mode
            const selectedBosses = matchCreationState.getSelectedCharactersData().filter(c => c.isBoss);
            const selectedPlayers = matchCreationState.getSelectedCharactersData().filter(c => !c.isBoss);
            if (selectedBosses.length > 0 && selectedPlayers.length >= IS_BOSS_MODE.MAX_PLAYER_CHARACTERS) {
                fillColor = '#555'; // Dim if max players reached
                borderColor = '#333';
            }
        } else { // Simulator mode
            if (matchCreationState.selectedCharacters.size >= matchCreationState.availableCharactersForMode.length) {
                fillColor = '#555'; // Dim if all players selected
                borderColor = '#333';
            }
        }


        ctx.fillStyle = fillColor;
        ctx.fillRect(boxX, boxY, charBoxSize, charBoxSize);

        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 2 * scaleFactor;
        ctx.strokeRect(boxX, boxY, charBoxSize, charBoxSize);

        if (charData.image && charData.image.complete && charData.image.naturalWidth > 0) {
            const displayScale = charData.scaleFactorOverride || 1;
            const imgWidth = charBoxSize * 0.8 * (displayScale > 1.0 ? 1.0 : displayScale);
            const imgHeight = charBoxSize * 0.8 * (displayScale > 1.0 ? 1.0 : displayScale);
            const imgX = boxX + (charBoxSize - imgWidth) / 2;
            const imgY = boxY + (charBoxSize - imgHeight) / 2;
            ctx.drawImage(charData.image, imgX, imgY, imgWidth, imgHeight);
        } else {
            ctx.fillStyle = '#ff0000';
            ctx.fillText('N/A', boxX + charBoxSize / 2, boxY + charBoxSize / 2);
        }

        ctx.font = `${12 * scaleFactor}px 'Inter', sans-serif`;
        ctx.fillStyle = nameColor; // MODIFIED: Use determined nameColor
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(charData.name, boxX + charBoxSize / 2, boxY + charBoxSize - (5 * scaleFactor));

        currentX += charBoxSize + charPadding;
        if ((index + 1) % charsPerRow === 0) {
            currentX = startX;
            currentY += charBoxSize + charPadding;
        }
    });

    const selectedCountY = currentY + charBoxSize + (20 * scaleFactor);
    ctx.font = `${18 * scaleFactor}px 'Inter', sans-serif`;
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let displayMessageText = '';
    if (matchCreationState.currentMode === 'boss') {
        const selectedBosses = matchCreationState.getSelectedCharactersData().filter(char => char.isBoss); // MODIFIED: Check isBoss
        const selectedPlayers = matchCreationState.getSelectedCharactersData().filter(char => !char.isBoss); // MODIFIED: Check !isBoss

        if (selectedBosses.length === 0) {
            displayMessageText = "Select 1 Boss and up to 7 Heroes.";
            ctx.fillStyle = '#FFD700';
        } else if (selectedBosses.length > 1) {
            displayMessageText = "Only ONE boss allowed!";
            ctx.fillStyle = 'red';
        } else { // One boss selected
            displayMessageText = `Selected: ${selectedPlayers.length} / ${IS_BOSS_MODE.MAX_PLAYER_CHARACTERS} Heroes + 1 Boss`;
            if (selectedPlayers.length === 0) {
                ctx.fillStyle = 'orange'; // Warn if no heroes selected yet
            } else if (selectedPlayers.length > IS_BOSS_MODE.MAX_PLAYER_CHARACTERS) {
                 displayMessageText = `Too many heroes selected! Max ${IS_BOSS_MODE.MAX_PLAYER_CHARACTERS}.`;
                 ctx.fillStyle = 'red';
            }
        }
    } else { // Simulator Mode
        displayMessageText = `Selected: ${matchCreationState.selectedCharacters.size} / ${matchCreationState.availableCharactersForMode.length}`;
        if (matchCreationState.selectedCharacters.size === 0) {
            ctx.fillStyle = 'orange';
        }
    }
    ctx.fillText(displayMessageText, canvas.width / 2, selectedCountY);


    const buttonWidth = matchCreationState.buttons.startGame.width * scaleFactor;
    const buttonHeight = matchCreationState.buttons.startGame.height * scaleFactor;
    const buttonSpacing = 20 * scaleFactor;

    const startButton = matchCreationState.buttons.startGame;
    startButton.x = canvas.width / 2 - (buttonWidth / 2);
    startButton.y = selectedCountY + (30 * scaleFactor);
    drawButton(ctx, startButton, scaleFactor);

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
    for (const box of matchCreationState.characterDisplayBoxes) {
        if (clickX >= box.x && clickX <= box.x + box.width &&
            clickY >= box.y && clickY <= box.y + box.height) {

            const charData = matchCreationState.allAvailableCharactersData.find(c => c.name === box.name);
            const isBossChar = charData.isBoss; // MODIFIED: Use isBossChar

            if (matchCreationState.selectedCharacters.has(box.name)) {
                matchCreationState.selectedCharacters.delete(box.name);
            } else {
                if (matchCreationState.currentMode === 'boss') {
                    const selectedBosses = matchCreationState.getSelectedCharactersData().filter(char => char.isBoss); // MODIFIED: Check isBoss
                    const selectedPlayers = matchCreationState.getSelectedCharactersData().filter(char => !char.isBoss); // MODIFIED: Check !isBoss

                    if (isBossChar) { // If the clicked character is a boss
                        if (selectedBosses.length === 0) { // Only allow one boss
                            matchCreationState.selectedCharacters.add(box.name);
                        } else {
                            displayMessage("Only one boss can be selected in Boss Mode!");
                        }
                    } else { // If the clicked character is a regular player
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
            return null;
        }
    }

    for (const key in matchCreationState.buttons) {
        const button = matchCreationState.buttons[key];
        const scaledWidth = button.width * scaleFactor;
        const scaledHeight = button.height * scaleFactor;
        if (clickX >= button.x && clickX <= button.x + scaledWidth &&
            clickY >= button.y && clickY <= button.y + scaledHeight) {
            if (button.action === 'startGame') {
                if (matchCreationState.currentMode === 'boss') {
                    const selectedBosses = matchCreationState.getSelectedCharactersData().filter(char => char.isBoss); // MODIFIED: Check isBoss
                    const selectedPlayers = matchCreationState.getSelectedCharactersData().filter(char => !char.isBoss); // MODIFIED: Check !isBoss
                    if (selectedBosses.length === 1 && selectedPlayers.length > 0 && selectedPlayers.length <= IS_BOSS_MODE.MAX_PLAYER_CHARACTERS) {
                        return 'startGame';
                    } else {
                        if (selectedBosses.length !== 1) {
                            displayMessage("Boss Mode requires exactly one boss selected.");
                        } else if (selectedPlayers.length === 0) {
                            displayMessage("Boss Mode requires at least one hero class to fight the boss.");
                        } else if (selectedPlayers.length > IS_BOSS_MODE.MAX_PLAYER_CHARACTERS) {
                             displayMessage(`Boss Mode requires a maximum of ${IS_BOSS_MODE.MAX_PLAYER_CHARACTERS} hero classes.`);
                        }
                        return null;
                    }
                } else { // Simulator Mode
                    if (matchCreationState.selectedCharacters.size > 0) {
                        return 'startGame';
                    } else {
                        displayMessage("Please select at least one character to start the battle!");
                        return null;
                    }
                }
            }
            return button.action;
        }
    }

    return null;
}