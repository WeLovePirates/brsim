// js/ui/uiElements.js

/**
 * Creates and appends the win probability menu to the document body.
 * @returns {HTMLElement} The created win probability menu element.
 */
export function createWinProbabilityMenu() {
    const winProbabilityMenu = document.createElement('div');
    winProbabilityMenu.id = 'winProbabilityMenu';
    winProbabilityMenu.classList.add(
        'bg-white', 'p-4', 'rounded-lg', 'shadow-lg',
        'text-sm', 'font-semibold', 'z-10', 'min-w-[150px]',
        'translucent-background'
    );
    document.body.appendChild(winProbabilityMenu);
    return winProbabilityMenu;
}

/**
 * Creates and appends the game summary overlay to the document body.
 * @returns {HTMLElement} The created game summary overlay element.
 */
export function createGameSummaryOverlay() {
    const gameSummaryOverlay = document.createElement('div');
    gameSummaryOverlay.id = 'gameSummaryOverlay';
    gameSummaryOverlay.classList.add(
        'bg-gray-800', 'bg-opacity-75', 'flex', 'items-center', 'justify-center', 'z-50',
        'p-4', 'fixed', 'inset-0'
    );
    gameSummaryOverlay.style.opacity = '0';
    gameSummaryOverlay.style.pointerEvents = 'none';
    document.body.appendChild(gameSummaryOverlay);

    const summaryPanel = document.createElement('div');
    summaryPanel.id = 'summaryPanel';
    summaryPanel.classList.add(
        'bg-black', 'p-8', 'rounded-lg', 'shadow-2xl', 'text-center', 'max-w-md', 'w-full',
        'overflow-y-auto', 'max-h-[90vh]'
    );
    gameSummaryOverlay.appendChild(summaryPanel);

    const summaryTitle = document.createElement('h2');
    summaryTitle.classList.add('text-3xl', 'font-extrabold', 'text-white', 'mb-6');
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
        location.reload(); // Reloads the page, effectively restarting the game
    });
    summaryPanel.appendChild(playAgainButton);

    return gameSummaryOverlay;
}