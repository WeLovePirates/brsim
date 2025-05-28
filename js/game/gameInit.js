// js/game/gameInit.js

import { IMAGE_SOURCES, MAP_IMAGE_SOURCE, ORIGINAL_SPEED_MAGNITUDE } from '../config.js';
import { Character } from '../character/Character.js';
import { displayMessage } from '../utils/displayUtils.js';
import { setGameLoopDependencies, startGame, resetGame, showMainMenu, toggleFullscreen } from './gameLoop.js';
import { updateCanvasSize, setCalculateWinProbabilitiesFunction, CHARACTER_SCALE_FACTOR } from '../ui/uiUpdates.js';
import { showMatchCreationMenu, matchCreationState } from './matchCreation.js'; // MODIFIED: Import matchCreationState

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

    updateCanvasSize(canvas, document.fullscreenElement);

    setCalculateWinProbabilitiesFunction(calculateWinProbabilities);

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

    setGameLoopDependencies(canvas, ctx, characters, mapImage);

    // Initialize match creation with all available characters
    matchCreationState.setAvailableCharacters(loadedImages); // MODIFIED: Call on matchCreationState

    // Show the main menu initially
    showMainMenu();
    displayMessage("Game assets loaded. Click 'Start Game' to begin!");
}

import { calculateWinProbabilities } from './gameLogic.js';

export function getCharacters() {
    return characters;
}

export function setCharacters(newCharacters) {
    characters = newCharacters;
}