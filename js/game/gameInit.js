// js/game/gameInit.js

import { IMAGE_SOURCES, MAP_IMAGE_SOURCE, ORIGINAL_SPEED_MAGNITUDE } from '../config.js';
import { Character } from '../character/Character.js';
import { displayMessage } from '../utils/displayUtils.js';
import { setGameLoopDependencies, startGame, resetGame, showMainMenu, toggleFullscreen } from './gameLoop.js'; // Added toggleFullscreen
import { updateCanvasSize, setCalculateWinProbabilitiesFunction, CHARACTER_SCALE_FACTOR } from '../ui/uiUpdates.js'; // Removed updateWinProbabilityMenu

let characters = [];
let mapImage;
let canvas;
let ctx;

/**
 * Initializes the game, loading assets and setting up UI.
 */
export async function initGame() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    // Set initial canvas size and scale factor
    // We now determine fullscreen status and update size from main.js onload
    // and gameLoop.js handles fullscreen changes.
    updateCanvasSize(canvas, document.fullscreenElement);

    // Set the function to calculate win probabilities
    setCalculateWinProbabilitiesFunction(calculateWinProbabilities);

    // initUIMechanics now only sets up the canvas size and event listeners for fullscreen.
    // It no longer creates/manages external buttons.
    // The canvas click listener is now part of gameLoop.js
    // We don't need a direct initUIMechanics call for start/reset callbacks here anymore,
    // as button actions are handled directly in gameLoop.js's canvas click handler.

    displayMessage("Loading game assets...");

    mapImage = new Image();
    mapImage.src = MAP_IMAGE_SOURCE;
    await new Promise((resolve, reject) => {
        mapImage.onload = resolve;
        mapImage.onerror = () => {
            console.error(`Failed to load map image: ${MAP_IMAGE_SOURCE}`);
            // Fallback image for map in case of load error
            mapImage.src = `https://placehold.co/${canvas.width}x${canvas.height}/000000/FFFFFF?text=MAP+LOAD+ERROR`;
            mapImage.onload = resolve;
            mapImage.onerror = reject;
        };
    });

    const loadedImages = await Promise.all(IMAGE_SOURCES.map(src => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = src.url;
            img.onload = () => resolve({
                name: src.name,
                image: img,
                move: src.move,
                attack: src.attack,
                defense: src.defense,
                speed: src.speed,
                health: src.health,
                secondaryAbility: src.secondaryAbility,
                secondaryAbilityCooldown: src.secondaryAbilityCooldown,
                isDummy: src.isDummy || false
            });
            img.onerror = () => {
                console.error(`Failed to load image: ${src.url}`);
                // Fallback image for character in case of load error
                img.src = `https://placehold.co/80x80/ff0000/FFFFFF?text=LOAD+ERROR`;
                img.onload = () => resolve({
                    name: src.name,
                    image: img,
                    move: src.move,
                    attack: src.attack,
                    defense: src.defense,
                    speed: src.speed,
                    health: src.health,
                    secondaryAbility: src.secondaryAbility,
                    secondaryAbilityCooldown: src.secondaryAbilityCooldown,
                    isDummy: src.isDummy || false
                });
                img.onerror = () => reject(new Error(`Critical: Fallback image failed for ${src.name}`));
            };
        });
    }));

    characters = loadedImages.map(data => new Character(
        data.name,
        data.image,
        data.move,
        data.attack,
        data.defense,
        data.speed,
        CHARACTER_SCALE_FACTOR,
        data.health,
        data.secondaryAbility,
        data.secondaryAbilityCooldown,
        canvas
    ));

    // Set dependencies for the game loop
    setGameLoopDependencies(canvas, ctx, characters, mapImage);

    // Show the main menu initially
    showMainMenu();
    displayMessage("Game assets loaded. Click 'Start Game' to begin!");
}

// Moved from gameInit.js:
// calculateWinProbabilities must be imported and set for UI functions to work.
import { calculateWinProbabilities } from './gameLogic.js';