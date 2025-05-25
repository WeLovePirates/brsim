// js/utils.js

let lastSoundTime = 0;
let synth; // Will be initialized when initAudio is called

function initAudio() {
    if (typeof Tone !== 'undefined' && !synth) {
        synth = new Tone.Synth().toDestination();
    }
}

function playHitSound() {
    const currentTime = Date.now();
    // SOUND_COOLDOWN is now a global constant from config.js
    if (currentTime - lastSoundTime > SOUND_COOLDOWN) {
        if (synth) {
            // Tone.start() will be called by user gesture on "Start Game"
            synth.triggerAttackRelease("C3", "16n");
        }
        lastSoundTime = currentTime;
    }
}

function displayMessage(message) {
    const messageBox = document.getElementById('messageBox');
    if (messageBox) {
        messageBox.textContent = message;
    }
}

function checkDistance(char1, char2) {
    const dx = char1.x + char1.width / 2 - (char2.x + char2.width / 2);
    const dy = char1.y + char1.height / 2 - (char2.y + char2.height / 2);
    return Math.sqrt(dx * dx + dy * dy);
}

function checkLineRectIntersection(x1, y1, x2, y2, rx, ry, rw, rh) {
    const left = checkLineIntersection(x1, y1, x2, y2, rx, ry, rx, ry + rh);
    const right = checkLineIntersection(x1, y1, x2, y2, rx + rw, ry, rx + rw, ry + rh);
    const top = checkLineIntersection(x1, y1, x2, y2, rx, ry, rx + rw, ry);
    const bottom = checkLineIntersection(x1, y1, x2, y2, rx, ry + rh, rx + rw, ry + rh);
    return left || right || top || bottom;
}

function checkLineIntersection(x1, y1, x2, y2, x3, y3, x4, y4) {
    const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (den === 0) {
        return false;
    }
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - y4)) / den;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / den;
    return t > 0 && t < 1 && u > 0 && u < 1;
}

function checkCollision(char1, char2) {
    return char1.x < char2.x + char2.width &&
           char1.x + char1.width > char2.x &&
           char1.y < char2.y + char2.height &&
           char1.y + char1.height > char2.y;
}

// Attach these to a global object or window for access by other scripts
window.GameUtils = {
    initAudio,
    playHitSound,
    displayMessage,
    checkDistance,
    checkLineRectIntersection,
    checkCollision,
    synth // Make synth accessible
};