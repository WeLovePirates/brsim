// js/utils/displayUtils.js

/**
 * Displays a message in the message box element.
 * @param {string} message - The message to display.
 */
export function displayMessage(message) {
    const messageBox = document.getElementById('messageBox');
    if (messageBox) {
        messageBox.textContent = message;
    }
}