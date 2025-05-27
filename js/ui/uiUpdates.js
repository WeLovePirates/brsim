// js/ui/uiUpdates.js

import { REFERENCE_GAME_WIDTH } from '../config.js';

let h1Element;
let buttonGroupElement;
let winProbabilityMenu;
let gameSummaryOverlay;
export let CHARACTER_SCALE_FACTOR = 1; // Exported for use in Character class and game loop

// This function will be set by `gameInit.js`
let _calculateWinProbabilities = null;

/**
 * Sets the function to calculate win probabilities, provided by gameLogic.
 * @param {function} func - The function to calculate win probabilities.
 */
export function setCalculateWinProbabilitiesFunction(func) {
    _calculateWinProbabilities = func;
}

/**
 * Updates the canvas size based on window dimensions and fullscreen status.
 * Adjusts UI element visibility accordingly.
 * @param {HTMLCanvasElement} canvas - The game canvas element.
 * @param {boolean} isFullScreen - True if the game is in fullscreen mode.
 */
export function updateCanvasSize(canvas, isFullScreen = false) {
    h1Element = document.querySelector('h1');
    const messageBox = document.getElementById('messageBox');
    buttonGroupElement = document.getElementById('buttonGroup');
    const fullscreenToggle = document.getElementById('fullscreenToggle');

    let canvasWidth, canvasHeight;

    if (isFullScreen) {
        canvasWidth = window.innerWidth;
        canvasHeight = window.innerHeight;

        if (h1Element) h1Element.style.display = 'none';
        if (messageBox) messageBox.style.display = 'none';
        if (buttonGroupElement) buttonGroupElement.style.display = 'none';

        if (winProbabilityMenu && gameSummaryOverlay && gameSummaryOverlay.style.opacity === '0') {
            winProbabilityMenu.style.display = 'none';
        }

    } else {
        if (h1Element) h1Element.style.display = 'block';
        if (messageBox) messageBox.style.display = 'flex';
        if (buttonGroupElement) buttonGroupElement.style.display = 'flex';
        if (winProbabilityMenu && gameSummaryOverlay && gameSummaryOverlay.style.opacity === '0') {
            winProbabilityMenu.style.display = 'block';
        }

        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;

        const h1Height = h1Element ? h1Element.offsetHeight : 0;
        const messageBoxHeight = messageBox ? messageBox.offsetHeight : 0;
        const buttonGroupHeight = buttonGroupElement ? buttonGroupElement.offsetHeight : 0;

        const verticalBuffer = 120;
        canvasHeight = viewportHeight - (h1Height + messageBoxHeight + buttonGroupHeight + verticalBuffer);

        const horizontalBuffer = 60;
        canvasWidth = viewportWidth - horizontalBuffer;

        if (canvasHeight < 250) canvasHeight = 250;
        if (canvasWidth < 400) canvasWidth = 400;

        if (canvasHeight > 800) canvasHeight = 800;
        if (canvasWidth > 1000) canvasWidth = 1000;
    }

    canvas.height = canvasHeight;
    canvas.width = canvasWidth;
    canvas.style.display = 'block';

    CHARACTER_SCALE_FACTOR = canvas.width / REFERENCE_GAME_WIDTH;
    if (CHARACTER_SCALE_FACTOR < 0.5) CHARACTER_SCALE_FACTOR = 0.5;
    if (CHARACTER_SCALE_FACTOR > 2) CHARACTER_SCALE_FACTOR = 2;
}

/**
 * Updates the content of the win probability menu.
 * @param {Array<Character>} characters - The array of character objects.
 */
export function updateWinProbabilityMenu(characters) {
    if (!winProbabilityMenu || !_calculateWinProbabilities) return;

    if (!document.fullscreenElement || (winProbabilityMenu.style.display === 'block' && gameSummaryOverlay.style.opacity === '0')) {
        winProbabilityMenu.innerHTML = '';

        const probabilities = _calculateWinProbabilities(characters);

        if (probabilities.length === 0) {
            winProbabilityMenu.textContent = 'No active players.';
            winProbabilityMenu.classList.add('text-gray-500');
        } else if (probabilities.length === 1) {
            winProbabilityMenu.innerHTML = `<div class="font-bold text-green-700">${probabilities[0].name} wins!</div>`;
        } else {
            const title = document.createElement('div');
            title.textContent = 'Win Probabilities:';
            title.classList.add('font-bold', 'mb-2', 'text-gray-800');
            winProbabilityMenu.appendChild(title);

            probabilities.forEach(probData => {
                const p = document.createElement('p');
                p.classList.add('text-sm', 'text-gray-700');
                p.textContent = `${probData.name}: ${probData.probability.toFixed(1)}%`;
                winProbabilityMenu.appendChild(p);
            });
        }
    }
}

/**
 * Displays the game summary overlay with character statistics.
 * @param {Array<Character>} characters - The array of character objects.
 * @param {number} gameStartTime - The timestamp when the game started.
 * @param {number} gameEndTime - The timestamp when the game ended.
 */
export function displayGameSummary(characters, gameStartTime, gameEndTime) {
    const summaryPanel = gameSummaryOverlay.querySelector('#summaryPanel');
    const statsContainer = summaryPanel.querySelector('#statsContainer');
    statsContainer.innerHTML = '';

    summaryPanel.classList.remove('active');
    gameSummaryOverlay.style.opacity = '0';
    gameSummaryOverlay.style.pointerEvents = 'none';

    void summaryPanel.offsetWidth; // Force reflow

    const startButton = document.getElementById('startButton');

    const durationMs = gameEndTime - gameStartTime;
    const durationSeconds = (durationMs / 1000).toFixed(1);

    const durationP = document.createElement('p');
    durationP.classList.add('text-gray-700', 'text-lg');
    durationP.innerHTML = `<span class="font-bold">Game Duration:</span> ${durationSeconds} seconds`;
    statsContainer.appendChild(durationP);

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
            timeAliveSeconds: (timeAliveMs / 1000).toFixed(1)
        });
    });

    rankedCharacters.sort((a, b) => {
        if (a.char === winner) return -1;
        if (b.char === winner) return 1;

        const a_score = (a.char.damageDealt * 0.2) + (a.char.kills * 100) + (a.char.healingDone * 0.5) + (a.timeAliveMs * 0.01);
        const b_score = (b.char.damageDealt * 0.2) + (b.char.kills * 100) + (b.char.healingDone * 0.5) + (b.timeAliveMs * 0.01);

        return b_score - a_score;
    });

    rankedCharacters.forEach((data, index) => {
        const char = data.char;
        const rankP = document.createElement('p');
        rankP.classList.add('text-gray-800', 'font-bold', 'text-xl', 'mb-2', 'mt-4');
        rankP.textContent = `#${index + 1} - ${char.name} ${char === winner ? '(Winner!)' : ''}`;
        statsContainer.appendChild(rankP);

        const charStatsP = document.createElement('p');
        charStatsP.classList.add('text-gray-700', 'ml-6', 'mb-4', 'text-base');
        charStatsP.innerHTML = `
            Health Remaining: ${char.health.toFixed(0)}<br>
            Time Alive: ${data.timeAliveSeconds} seconds<br>
            Kills: ${char.kills}<br>
            Damage Dealt: ${char.damageDealt.toFixed(0)}<br>
            Healing Done: ${char.healingDone.toFixed(0)}
        `;
        statsContainer.appendChild(charStatsP);
    });

    const messageBox = document.getElementById('messageBox');
    if (messageBox) messageBox.textContent = '';
    if (startButton) startButton.disabled = false;

    gameSummaryOverlay.style.opacity = '1';
    gameSummaryOverlay.style.pointerEvents = 'all';

    setTimeout(() => {
        summaryPanel.classList.add('active');
    }, 50);

    if (document.fullscreenElement && winProbabilityMenu) {
        winProbabilityMenu.style.display = 'none';
    }
}

/**
 * Initializes UI mechanics, including creating elements and setting up event listeners.
 * @param {HTMLCanvasElement} canvas - The game canvas.
 * @param {function} startCallback - Function to call when the start button is clicked.
 * @param {function} resetCallback - Function to call when the reset button is clicked.
 */
export function initUIMechanics(canvas, startCallback, resetCallback) {
    // Import and create UI elements
    import('./uiElements.js').then(module => {
        winProbabilityMenu = module.createWinProbabilityMenu();
        gameSummaryOverlay = module.createGameSummaryOverlay();

        const startButton = document.getElementById('startButton');
        const resetButton = document.getElementById('resetButton');
        const fullscreenToggle = document.getElementById('fullscreenToggle');

        startButton.addEventListener('click', startCallback);
        resetButton.addEventListener('click', resetCallback);

        window.addEventListener('resize', () => {
            if (!document.fullscreenElement) {
                updateCanvasSize(canvas, false);
                resetCallback();
            }
        });

        document.addEventListener('keydown', (event) => {
            if (document.fullscreenElement && winProbabilityMenu && gameSummaryOverlay.style.opacity === '0') {
                if (event.key === 'p' || event.key === 'P') {
                    if (winProbabilityMenu.style.display === 'none') {
                        winProbabilityMenu.style.display = 'block';
                    } else {
                        winProbabilityMenu.style.display = 'none';
                    }
                }
            }
        });

        const handleFullscreenChange = () => {
            if (fullscreenToggle.checked) {
                if (document.fullscreenElement) {
                    updateCanvasSize(canvas, true);
                } else {
                    updateCanvasSize(canvas, false);
                    resetCallback();
                }
            } else {
                if (!document.fullscreenElement) {
                     updateCanvasSize(canvas, false);
                     resetCallback();
                }
            }
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', handleFullscreenChange);
        document.addEventListener('msfullscreenchange', handleFullscreenChange);
    });
}