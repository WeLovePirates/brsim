// js/game/gameInit.js

import { IMAGE_SOURCES, MAP_IMAGE_SOURCE, ORIGINAL_SPEED_MAGNITUDE } from '../config.js';
import { Character } from '../character/Character.js';
import { displayMessage } from '../utils/displayUtils.js';
import { setGameLoopDependencies, startGame, resetGame } from './gameLoop.js';
import { initUIMechanics, updateCanvasSize, setCalculateWinProbabilitiesFunction, updateWinProbabilityMenu, CHARACTER_SCALE_FACTOR } from '../ui/uiUpdates.js'; // Added updateWinProbabilityMenu
import { calculateWinProbabilities } from './gameLogic.js';

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

    // Set the canvas and context for UI updates
    setCalculateWinProbabilitiesFunction(calculateWinProbabilities);
    initUIMechanics(canvas, () => startGame(document.getElementById('fullscreenToggle').checked), resetGame);
    updateCanvasSize(canvas, false); // Initial canvas size setup

    displayMessage("Loading characters and map...");

    mapImage = new Image();
    mapImage.src = MAP_IMAGE_SOURCE;
    await new Promise((resolve, reject) => {
        mapImage.onload = resolve;
        mapImage.onerror = () => {
            console.error(`Failed to load map image: ${MAP_IMAGE_SOURCE}`);
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
                isDummy: src.isDummy || false // Ensure isDummy is handled
            });
            img.onerror = () => {
                console.error(`Failed to load image: ${src.url}`);
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
        CHARACTER_SCALE_FACTOR, // Use the dynamically calculated scale factor
        data.health,
        data.secondaryAbility,
        data.secondaryAbilityCooldown,
        canvas // Pass the canvas to the Character constructor
    ));

    // Set dependencies for the game loop
    setGameLoopDependencies(canvas, ctx, characters, mapImage);

    resetGame(); // Perform an initial reset to place characters
    displayMessage("Characters and map loaded! Click 'Start Game' to begin.");
    updateWinProbabilityMenu(characters);
}