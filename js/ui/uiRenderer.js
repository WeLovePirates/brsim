// br/js/ui/uiRenderer.js

import { SECONDARY_ABILITY_DURATION_FRAMES, WIZARD_MAGIC_SHIELD_DURATION_FRAMES, FEEDING_FRENZY_DURATION_FRAMES } from '../config.js'; // Re-import necessary constants
import { displayMessage } from '../utils/displayUtils.js'; // Re-import displayMessage

let probabilityMenuVisible = true; // Internal state for this module

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

drawProbabilityMenu.isVisible = () => probabilityMenuVisible; // Expose getter
drawProbabilityMenu.show = () => { probabilityMenuVisible = true; }; // Expose setter
drawProbabilityMenu.hide = () => { probabilityMenuVisible = false; }; // Expose setter


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
export function drawButton(ctx, button, scaleFactor) {
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

    // Update the button's stored dimensions for click detection
    button.currentX = scaledX;
    button.currentY = scaledY;
    button.currentWidth = scaledWidth;
    button.currentHeight = scaledHeight;
}