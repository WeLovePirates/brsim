// js/utils/mathUtils.js

/**
 * Calculates the Euclidean distance between the centers of two characters.
 * @param {object} char1 - The first character object.
 * @param {object} char2 - The second character object.
 * @returns {number} The distance between the two characters' centers.
 */
export function checkDistance(char1, char2) {
    const dx = char1.x + char1.width / 2 - (char2.x + char2.width / 2);
    const dy = char1.y + char1.height / 2 - (char2.y + char2.height / 2);
    return Math.sqrt(dx * dx + dy * dy);
}