// js/ui.js

// These will be global variables after config.js is loaded
let h1Element;
let buttonGroupElement;
let winProbabilityMenu;
let gameSummaryOverlay;
let CHARACTER_SCALE_FACTOR = 1;

// This function will be set by `main.js` via a global variable
let _calculateWinProbabilities = null;

function setCalculateWinProbabilitiesFunction(func) {
    _calculateWinProbabilities = func;
}

function updateCanvasSize(canvas) {
    h1Element = document.querySelector('h1');
    const messageBox = document.getElementById('messageBox');
    buttonGroupElement = document.getElementById('buttonGroup');

    // Get the total available height of the viewport
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // Calculate heights of known UI elements
    const h1Height = h1Element ? h1Element.offsetHeight : 0;
    const messageBoxHeight = messageBox ? messageBox.offsetHeight : 0;
    const buttonGroupHeight = buttonGroupElement ? buttonGroupElement.offsetHeight : 0;

    // Define a minimum vertical buffer for padding, margins, and responsiveness
    // This value ensures there's always some space above/below canvas
    const verticalBuffer = 120; // Increased buffer from 64 to 120 (adjust as needed)

    // Calculate canvas height
    // Subtract fixed UI heights and the flexible buffer
    let canvasHeight = viewportHeight - (h1Height + messageBoxHeight + buttonGroupHeight + verticalBuffer);

    // Set canvas width based on viewport, with a horizontal buffer
    const horizontalBuffer = 60; // Added horizontal buffer for side padding
    let canvasWidth = viewportWidth - horizontalBuffer;

    // Apply minimum and maximum constraints for canvas size
    // Ensure canvas doesn't get ridiculously small or too large
    if (canvasHeight < 250) canvasHeight = 250; // Minimum height
    if (canvasWidth < 400) canvasWidth = 400;   // Minimum width

    // Cap canvas dimensions to prevent it from consuming all space excessively on large screens
    if (canvasHeight > 800) canvasHeight = 800; // Max height
    if (canvasWidth > 1000) canvasWidth = 1000; // Max width

    canvas.height = canvasHeight;
    canvas.width = canvasWidth;

    // Ensure canvas is rendered correctly
    canvas.style.display = 'block'; // Make sure it's a block element

    // REFERENCE_GAME_WIDTH is now a global constant from config.js
    CHARACTER_SCALE_FACTOR = canvas.width / REFERENCE_GAME_WIDTH;
    if (CHARACTER_SCALE_FACTOR < 0.5) CHARACTER_SCALE_FACTOR = 0.5;
    if (CHARACTER_SCALE_FACTOR > 2) CHARACTER_SCALE_FACTOR = 2;
}

function initUIMechanics(canvas, startCallback, resetCallback) {
    winProbabilityMenu = document.createElement('div');
    winProbabilityMenu.id = 'winProbabilityMenu';
    winProbabilityMenu.classList.add(
        'bg-white', 'p-4', 'rounded-lg', 'shadow-lg',
        'text-sm', 'font-semibold', 'z-10', 'min-w-[150px]'
    );
    document.body.appendChild(winProbabilityMenu);

    const startButton = document.getElementById('startButton');
    const resetButton = document.getElementById('resetButton');

    startButton.addEventListener('click', startCallback);
    resetButton.addEventListener('click', resetCallback);

    window.addEventListener('resize', () => {
        updateCanvasSize(canvas);
        // Call resetCallback only if game is not running? Or always reset?
        // For now, always reset to redraw characters properly after resize.
        resetCallback();
    });
}

function updateWinProbabilityMenu(characters) {
    if (!winProbabilityMenu || !_calculateWinProbabilities) return;

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

function displayGameSummary(characters, gameStartTime, gameEndTime) {
    const messageBox = document.getElementById('messageBox');
    const startButton = document.getElementById('startButton');

    if (!gameSummaryOverlay) {
        gameSummaryOverlay = document.createElement('div');
        gameSummaryOverlay.id = 'gameSummaryOverlay';
        gameSummaryOverlay.classList.add(
            'bg-gray-800', 'bg-opacity-75', 'flex', 'items-center', 'justify-center', 'z-20',
            'p-4'
        );
        document.body.appendChild(gameSummaryOverlay);

        const summaryPanel = document.createElement('div');
        summaryPanel.id = 'summaryPanel';
        summaryPanel.classList.add(
            'bg-white', 'p-8', 'rounded-lg', 'shadow-2xl', 'text-center', 'max-w-md', 'w-full',
            'overflow-y-auto', 'max-h-[90vh]'
        );
        gameSummaryOverlay.appendChild(summaryPanel);

        const summaryTitle = document.createElement('h2');
        summaryTitle.classList.add('text-3xl', 'font-extrabold', 'text-gray-900', 'mb-6');
        summaryTitle.textContent = 'Battle Results';
        summaryPanel.appendChild(summaryTitle);

        const statsContainer = document.createElement('div');
        statsContainer.id = 'statsContainer';
        statsContainer.classList.add('space-y-3', 'mb-8', 'text-left');
        summaryPanel.appendChild(statsContainer);

        const playAgainButton = document.createElement('button');
        playAgainButton.classList.add(
            'button-style', 'start-button', 'w-full', 'mt-4', 'py-3'
        );
        playAgainButton.textContent = 'Play Again';
        playAgainButton.addEventListener('click', () => {
            location.reload();
        });
        summaryPanel.appendChild(playAgainButton);

        gameSummaryOverlay.classList.add('visible');
        setTimeout(() => {
            summaryPanel.classList.add('active');
        }, 50);
    } else {
        const summaryPanel = gameSummaryOverlay.querySelector('#summaryPanel');
        const statsContainer = summaryPanel.querySelector('#statsContainer');
        statsContainer.innerHTML = '';

        summaryPanel.classList.remove('active');
        gameSummaryOverlay.classList.remove('visible');

        void summaryPanel.offsetWidth; // Force reflow

        gameSummaryOverlay.classList.add('visible');
        setTimeout(() => {
            summaryPanel.classList.add('active');
        }, 50);
    }

    const statsContainer = gameSummaryOverlay.querySelector('#statsContainer');

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

    if (messageBox) messageBox.textContent = '';
    if (startButton) startButton.disabled = false;
}

// Make these functions and variables globally accessible
window.GameUI = {
    updateCanvasSize,
    initUIMechanics,
    updateWinProbabilityMenu,
    displayGameSummary,
    setCalculateWinProbabilitiesFunction,
    get CHARACTER_SCALE_FACTOR() { return CHARACTER_SCALE_FACTOR; },
    get gameSummaryOverlay() { return gameSummaryOverlay; }
};