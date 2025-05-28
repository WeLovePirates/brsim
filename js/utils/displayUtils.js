// js/utils/displayUtils.js

const messageQueue = [];
let currentMessage = '';
let messageTimeout = null;
let lastSoundTime = 0; // For sound cooldown if you implement sounds

/**
 * Displays a message in the message box.
 * @param {string} message - The message to display.
 * @param {number} duration - How long the message should be displayed in milliseconds.
 */
export function displayMessage(message, duration = 3000) {
    // Clear any existing timeout to prevent previous messages from overriding
    if (messageTimeout) {
        clearTimeout(messageTimeout);
    }

    currentMessage = message; // Update the internal message state
    // The actual drawing of the message will be handled by drawMessageBox in uiUpdates.js

    messageTimeout = setTimeout(() => {
        currentMessage = ''; // Clear message after duration
        messageTimeout = null;
    }, duration);
}

// Export a way to get the current message for drawing on canvas
displayMessage.currentMessage = '';