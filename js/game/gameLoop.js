// js/game/gameLoop.js

import { PROB_UPDATE_INTERVAL, ORIGINAL_SPEED_MAGNITUDE } from '../config.js'; // Added ORIGINAL_SPEED_MAGNITUDE
import { displayMessage } from '../utils/displayUtils.js';
import { updateWinProbabilityMenu, displayGameSummary, CHARACTER_SCALE_FACTOR } from '../ui/uiUpdates.js';
import { calculateWinProbabilities, handleCollisions, applyStaticFieldDamage, handleShurikenCollisions } from './gameLogic.js';

let characters = [];
let animationFrameId;
let gameRunning = false;
let gameStartTime;
let gameEndTime;
let lastProbUpdateTime = 0;
let mapImage;
let ctx;
let canvas;

/**
 * Sets the canvas context and characters array for the game loop.
 * This is called once during game initialization.
 * @param {HTMLCanvasElement} gameCanvas - The main game canvas.
 * @param {CanvasRenderingContext2D} context - The 2D rendering context of the canvas.
 * @param {Array<Character>} initialCharacters - The array of character objects.
 * @param {HTMLImageElement} initialMapImage - The map image object.
 */
export function setGameLoopDependencies(gameCanvas, context, initialCharacters, initialMapImage) {
    canvas = gameCanvas;
    ctx = context;
    characters = initialCharacters;
    mapImage = initialMapImage;
}

/**
 * The main game loop, responsible for updating game state and drawing.
 */
export function gameLoop() {
    if (!gameRunning) {
        return;
    }

    const currentTime = Date.now();

    // Update win probabilities periodically
    if (currentTime - lastProbUpdateTime > PROB_UPDATE_INTERVAL) {
        updateWinProbabilityMenu(characters);
        lastProbUpdateTime = currentTime;
    }

    // Clear canvas and draw map
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (mapImage.complete && mapImage.naturalWidth > 0) {
        ctx.drawImage(mapImage, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Update all characters
    characters.forEach(char => char.update(characters, CHARACTER_SCALE_FACTOR));

    // Apply static field damage (handled in gameLogic)
    applyStaticFieldDamage(characters);

    // Handle shuriken collisions (handled in gameLogic)
    handleShurikenCollisions(characters);

    // Handle character-to-character collisions (handled in gameLogic)
    handleCollisions(characters);

    // Draw all characters
    characters.forEach(char => char.draw(CHARACTER_SCALE_FACTOR));

    // Check for game end condition
    const aliveCharacters = characters.filter(char => char.isAlive);
    if (aliveCharacters.length <= 1 && gameRunning) {
        gameRunning = false;
        cancelAnimationFrame(animationFrameId);
        gameEndTime = performance.now();

        if (aliveCharacters.length === 1) {
            displayMessage(`${aliveCharacters[0].name} wins the battle!`);
        } else {
            displayMessage("It's a draw! No one survived.");
        }

        document.getElementById('startButton').disabled = false;
        updateWinProbabilityMenu(characters);
        displayGameSummary(characters, gameStartTime, gameEndTime);

    } else if (gameRunning) {
        animationFrameId = requestAnimationFrame(gameLoop);
    }
}

/**
 * Starts the game.
 * @param {boolean} isFullscreen - Whether the game should start in fullscreen.
 */
export function startGame(isFullscreen) {
    if (gameRunning) return;

    // Request fullscreen if enabled
    if (isFullscreen) {
        if (document.body.requestFullscreen) {
            document.body.requestFullscreen();
        } else if (document.body.mozRequestFullScreen) {
            document.body.mozRequestFullScreen();
        } else if (document.body.webkitRequestFullscreen) {
            document.body.webkitRequestFullscreen();
        } else if (document.body.msRequestFullscreen) {
            document.body.msRequestFullscreen();
        }
    }

    gameStartTime = performance.now();
    characters.forEach(char => {
        char.health = char.maxHealth;
        char.isAlive = true;
        char.lastHitTime = {};
        char.lastMoveTime = 0;
        char.lastPatchTime = 0;
        char.lastSecondaryAbilityTime = 0;
        char.secondaryAbilityActive = false;
        char.secondaryAbilityEffect = null;
        char.speed = char.originalSpeed;
        char.defense = char.originalDefense;
        char.isDodging = false;
        char.isBlockingShuriken = false;
        char.isPhasing = false; // Reset phasing
        char.isInvisible = false; // Reset invisibility
        char.dodgeChanceBoost = 0; // Reset dodge chance boost
        char.kills = 0;
        char.damageDealt = 0;
        char.healingDone = 0;
        char.spawnTime = gameStartTime;
        char.deathTime = 0;

        char.x = Math.random() * (canvas.width - char.width);
        char.y = Math.random() * (canvas.height - char.height);

        // Re-initialize dx/dy based on current scale factor
        char.dx = (Math.random() - 0.5) * ORIGINAL_SPEED_MAGNITUDE * char.speed * CHARACTER_SCALE_FACTOR;
        char.dy = (Math.random() - 0.5) * ORIGINAL_SPEED_MAGNITUDE * char.speed * CHARACTER_SCALE_FACTOR;
        if (Math.abs(char.dx) < 1 * char.speed * CHARACTER_SCALE_FACTOR) char.dx = (char.dx > 0 ? 1 : -1) * char.speed * CHARACTER_SCALE_FACTOR;
        if (Math.abs(char.dy) < 1 * char.speed * CHARACTER_SCALE_FACTOR) char.dy = (char.dy > 0 ? 1 : -1) * char.speed * CHARACTER_SCALE_FACTOR;
    });

    gameRunning = true;
    displayMessage("Battle started with special moves and stats!");
    document.getElementById('startButton').disabled = true;
    animationFrameId = requestAnimationFrame(gameLoop);

    lastProbUpdateTime = Date.now();
    updateWinProbabilityMenu(characters);
}

/**
 * Resets the game to its initial state.
 */
export function resetGame() {
    cancelAnimationFrame(animationFrameId);
    gameRunning = false;
    document.getElementById('startButton').disabled = false;

    // Exit fullscreen if active
    if (document.fullscreenElement) {
        document.exitFullscreen();
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (mapImage.complete && mapImage.naturalWidth > 0) {
        ctx.drawImage(mapImage, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    characters.forEach(char => {
        char.health = char.maxHealth;
        char.isAlive = true;
        char.lastHitTime = {};
        char.lastMoveTime = 0;
        char.lastPatchTime = 0;
        char.lastSecondaryAbilityTime = 0;
        char.secondaryAbilityActive = false;
        char.secondaryAbilityEffect = null;
        char.speed = char.originalSpeed;
        char.defense = char.originalDefense;
        char.isDodging = false;
        char.isBlockingShuriken = false;
        char.isPhasing = false; // Reset phasing
        char.isInvisible = false; // Reset invisibility
        char.dodgeChanceBoost = 0; // Reset dodge chance boost
        char.kills = 0;
        char.damageDealt = 0;
        char.healingDone = 0;
        char.spawnTime = 0;
        char.deathTime = 0;

        char.x = Math.random() * (canvas.width - char.width);
        char.y = Math.random() * (canvas.height - char.height);

        // Re-initialize dx/dy based on current scale factor
        char.dx = (Math.random() - 0.5) * ORIGINAL_SPEED_MAGNITUDE * char.speed * CHARACTER_SCALE_FACTOR;
        char.dy = (Math.random() - 0.5) * ORIGINAL_SPEED_MAGNITUDE * char.speed * CHARACTER_SCALE_FACTOR;
        if (Math.abs(char.dx) < 1 * char.speed * CHARACTER_SCALE_FACTOR) char.dx = (char.dx > 0 ? 1 : -1) * char.speed * CHARACTER_SCALE_FACTOR;
        if (Math.abs(char.dy) < 1 * char.speed * CHARACTER_SCALE_FACTOR) char.dy = (char.dy > 0 ? 1 : -1) * char.speed * CHARACTER_SCALE_FACTOR;
        char.draw(CHARACTER_SCALE_FACTOR);
    });
    displayMessage("Game reset. Click 'Start Game' to play again!");
    updateWinProbabilityMenu(characters);

    // Hide summary overlay if it's visible on reset
    const gameSummaryOverlay = document.getElementById('gameSummaryOverlay');
    if (gameSummaryOverlay) {
        gameSummaryOverlay.style.opacity = '0';
        gameSummaryOverlay.style.pointerEvents = 'none';
        const summaryPanel = gameSummaryOverlay.querySelector('#summaryPanel');
        if (summaryPanel) {
            summaryPanel.classList.remove('active');
        }
    }
}
