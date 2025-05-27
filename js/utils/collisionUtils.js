// js/utils/collisionUtils.js

/**
 * Checks for intersection between two line segments.
 * @param {number} x1 - X-coordinate of the first point of line 1.
 * @param {number} y1 - Y-coordinate of the first point of line 1.
 * @param {number} x2 - X-coordinate of the second point of line 1.
 * @param {number} y2 - Y-coordinate of the second point of line 1.
 * @param {number} x3 - X-coordinate of the first point of line 2.
 * @param {number} y3 - Y-coordinate of the first point of line 2.
 * @param {number} x4 - X-coordinate of the second point of line 2.
 * @param {number} y4 - Y-coordinate of the second point of line 2.
 * @returns {boolean} True if the lines intersect, false otherwise.
 */
function checkLineIntersection(x1, y1, x2, y2, x3, y3, x4, y4) {
    const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (den === 0) {
        return false;
    }
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - y4)) / den;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / den;
    return t > 0 && t < 1 && u > 0 && u < 1;
}

/**
 * Checks for intersection between a line segment and a rectangle.
 * @param {number} x1 - X-coordinate of the first point of the line.
 * @param {number} y1 - Y-coordinate of the first point of the line.
 * @param {number} x2 - X-coordinate of the second point of the line.
 * @param {number} y2 - Y-coordinate of the second point of the line.
 * @param {number} rx - X-coordinate of the rectangle's top-left corner.
 * @param {number} ry - Y-coordinate of the rectangle's top-left corner.
 * @param {number} rw - Width of the rectangle.
 * @param {number} rh - Height of the rectangle.
 * @returns {boolean} True if the line intersects the rectangle, false otherwise.
 */
export function checkLineRectIntersection(x1, y1, x2, y2, rx, ry, rw, rh) {
    const left = checkLineIntersection(x1, y1, x2, y2, rx, ry, rx, ry + rh);
    const right = checkLineIntersection(x1, y1, x2, y2, rx + rw, ry, rx + rw, ry + rh);
    const top = checkLineIntersection(x1, y1, x2, y2, rx, ry, rx + rw, ry);
    const bottom = checkLineIntersection(x1, y1, x2, y2, rx, ry + rh, rx + rw, ry + rh);
    return left || right || top || bottom;
}

/**
 * Checks for axis-aligned bounding box (AABB) collision between two characters.
 * @param {object} char1 - The first character object.
 * @param {object} char2 - The second character object.
 * @returns {boolean} True if the characters are colliding, false otherwise.
 */
export function checkCollision(char1, char2) {
    return char1.x < char2.x + char2.width &&
           char1.x + char1.width > char2.x &&
           char1.y < char2.y + char2.height &&
           char1.y + char1.height > char2.y;
}