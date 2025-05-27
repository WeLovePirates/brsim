// js/ui.js

// These will be global variables after config.js is loaded
let h1Element;
let buttonGroupElement;
let winProbabilityMenu;
let gameSummaryOverlay; // Declared here
let CHARACTER_SCALE_FACTOR = 1;
let fullscreenToggle; // Reference to the fullscreen checkbox

// This function will be set by `main.js` via a global variable
let _calculateWinProbabilities = null;

function setCalculateWinProbabilitiesFunction(func) {
    _calculateWinProbabilities = func;
}

// Added a parameter 'isFullScreen' to adjust sizing logic
function updateCanvasSize(canvas, isFullScreen = false) {
    h1Element = document.querySelector('h1');
    const messageBox = document.getElementById('messageBox');
    buttonGroupElement = document.getElementById('buttonGroup');
    fullscreenToggle = document.getElementById('fullscreenToggle'); // Get the checkbox

    let canvasWidth, canvasHeight;

    if (isFullScreen) {
        // In fullscreen mode, canvas takes up the entire screen
        canvasWidth = window.innerWidth;
        canvasHeight = window.innerHeight;

        // Hide main UI elements in fullscreen for a cleaner view
        if (h1Element) h1Element.style.display = 'none';
        if (messageBox) messageBox.style.display = 'none';
        if (buttonGroupElement) buttonGroupElement.style.display = 'none';

        // Win probability menu will be handled by 'P' key, so set to none initially
        // ONLY if the summary overlay is NOT active (check opacity for this).
        if (winProbabilityMenu && gameSummaryOverlay && gameSummaryOverlay.style.opacity === '0') {
            winProbabilityMenu.style.display = 'none';
        }

    } else {
        // Normal mode: Revert UI visibility and apply original sizing logic
        if (h1Element) h1Element.style.display = 'block';
        if (messageBox) messageBox.style.display = 'flex'; // messageBox has 'display: flex' in CSS
        if (buttonGroupElement) buttonGroupElement.style.display = 'flex'; // buttonGroup has 'display: flex' in CSS
        // Only show winProbabilityMenu if the summary is NOT active
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

function initUIMechanics(canvas, startCallback, resetCallback) {
    winProbabilityMenu = document.createElement('div');
    winProbabilityMenu.id = 'winProbabilityMenu';
    winProbabilityMenu.classList.add(
        'bg-white', 'p-4', 'rounded-lg', 'shadow-lg',
        'text-sm', 'font-semibold', 'z-10', 'min-w-[150px]',
        'translucent-background' // Add class for translucency
    );
    document.body.appendChild(winProbabilityMenu);

    // Initialize gameSummaryOverlay here once. Its display properties are controlled by JS.
    gameSummaryOverlay = document.createElement('div');
    gameSummaryOverlay.id = 'gameSummaryOverlay';
    gameSummaryOverlay.classList.add(
        'bg-gray-800', 'bg-opacity-75', 'flex', 'items-center', 'justify-content', 'z-50', // High z-index
        'p-4', 'fixed', 'inset-0' // Ensure it covers the whole screen
    );
    // Initial hidden state for the overlay, managed by JS
    gameSummaryOverlay.style.opacity = '0';
    gameSummaryOverlay.style.pointerEvents = 'none'; // Initially no pointer events
    document.body.appendChild(gameSummaryOverlay);

    // Create the summary panel content within the overlay (no changes needed here)
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
        // This button now triggers a full page reload, which also exits fullscreen
        location.reload();
    });
    summaryPanel.appendChild(playAgainButton);


    const startButton = document.getElementById('startButton');
    const resetButton = document.getElementById('resetButton');
    fullscreenToggle = document.getElementById('fullscreenToggle'); // Initialize fullscreenToggle here

    startButton.addEventListener('click', startCallback);
    resetButton.addEventListener('click', resetCallback);

    window.addEventListener('resize', () => {
        // Only trigger updateCanvasSize and reset if not in fullscreen mode
        // Fullscreen changes are handled by the fullscreenchange event
        if (!document.fullscreenElement) {
            updateCanvasSize(canvas, false);
            resetCallback();
        }
    });

    // Keyboard listener for 'P' key to toggle win probability menu
    document.addEventListener('keydown', (event) => {
        // Only toggle if in fullscreen AND the game summary is NOT visible
        // We check opacity for visibility
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


    // Listen for fullscreen change events
    document.addEventListener('fullscreenchange', () => {
        // This event fires even if fullscreen is exited by the user (e.g., ESC key)
        if (fullscreenToggle.checked) { // Only react if fullscreen was enabled by user's choice
            if (document.fullscreenElement) {
                // Entered fullscreen
                updateCanvasSize(canvas, true);
            } else {
                // Exited fullscreen (e.g., via ESC key)
                updateCanvasSize(canvas, false); // Revert to normal sizing
                resetCallback(); // Reset game state or redraw properly
            }
        } else {
            // If fullscreen was not enabled by the toggle, but fullscreen still changed (e.g. browser specific behavior)
            // ensure we revert to normal sizing.
            if (!document.fullscreenElement) {
                 updateCanvasSize(canvas, false);
                 resetCallback();
            }
        }
    });
    document.addEventListener('webkitfullscreenchange', () => { // For WebKit browsers
        if (fullscreenToggle.checked) {
            if (document.webkitFullscreenElement) {
                updateCanvasSize(canvas, true);
            } else {
                updateCanvasSize(canvas, false);
                resetCallback();
            }
        } else {
            if (!document.webkitFullscreenElement) {
                updateCanvasSize(canvas, false);
                resetCallback();
            }
        }
    });
    document.addEventListener('mozfullscreenchange', () => { // For Firefox
        if (fullscreenToggle.checked) {
            if (document.mozFullScreenElement) {
                updateCanvasSize(canvas, true);
            } else {
                updateCanvasSize(canvas, false);
                resetCallback();
            }
        } else {
            if (!document.mozFullScreenElement) {
                updateCanvasSize(canvas, false);
                resetCallback();
            }
        }
    });
    document.addEventListener('msfullscreenchange', () => { // For IE/Edge
        if (fullscreenToggle.checked) {
            if (document.msFullscreenElement) {
                updateCanvasSize(canvas, true);
            } else {
                updateCanvasSize(canvas, false);
                resetCallback();
            }
        } else {
            if (!document.msFullscreenElement) {
                updateCanvasSize(canvas, false);
                resetCallback();
            }
        }
    });
}

function updateWinProbabilityMenu(characters) {
    if (!winProbabilityMenu || !_calculateWinProbabilities) return;

    // Only update if not in fullscreen OR if the menu is explicitly visible AND the summary is NOT visible
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

function displayGameSummary(characters, gameStartTime, gameEndTime) {
    // The gameSummaryOverlay and its panel content are created in initUIMechanics.
    // So here, we just need to update its content and display it.
    const summaryPanel = gameSummaryOverlay.querySelector('#summaryPanel');
    const statsContainer = summaryPanel.querySelector('#statsContainer');
    statsContainer.innerHTML = ''; // Clear previous stats

    // Reset summary panel internal state for transition
    summaryPanel.classList.remove('active');
    gameSummaryOverlay.style.opacity = '0'; // Ensure it's fully transparent initially
    gameSummaryOverlay.style.pointerEvents = 'none'; // Disable interaction until visible

    // Force reflow to ensure transitions apply from the hidden state
    void summaryPanel.offsetWidth;

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

    // Make sure messageBox and startButton are handled correctly when summary appears
    const messageBox = document.getElementById('messageBox');
    if (messageBox) messageBox.textContent = ''; // Clear game messages
    if (startButton) startButton.disabled = false; // Enable start button for next game

    // Display the overlay
    gameSummaryOverlay.style.opacity = '1';
    gameSummaryOverlay.style.pointerEvents = 'all'; // Enable pointer events for interaction

    // Add 'active' class after a slight delay to allow opacity transition
    setTimeout(() => {
        summaryPanel.classList.add('active');
    }, 50);

    // If in fullscreen, ensure the probability menu is hidden when summary appears
    if (document.fullscreenElement && winProbabilityMenu) {
        winProbabilityMenu.style.display = 'none';
    }
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