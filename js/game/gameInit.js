// js/game/gameInit.js

import { IMAGE_SOURCES, MAP_IMAGE_SOURCE, ORIGINAL_SPEED_MAGNITUDE } from '../config.js'; // Imports remain
import { Character } from '../character/Character.js'; // Imports remain
import { displayMessage } from '../utils/displayUtils.js'; // Imports remain
import { setGameLoopDependencies, startGame, resetGame, showMainMenu, toggleFullscreen } from './gameLoop.js'; // Imports remain
import { updateCanvasSize, setCalculateWinProbabilitiesFunction, CHARACTER_SCALE_FACTOR } from '../ui/uiUpdates.js'; // Imports remain
import { showMatchCreationMenu, matchCreationState } from './matchCreation.js'; // Imports remain

let characters = [];
let mapImage;
let canvas;
let ctx;

/**
 * Initializes the game, loading assets and setting up UI.
 */
export async function initGame() {
    canvas = document.getElementById('gameCanvas'); // Gets canvas element
    ctx = canvas.getContext('2d'); // Gets 2D rendering context

    updateCanvasSize(canvas, document.fullscreenElement); // Updates canvas size

    setCalculateWinProbabilitiesFunction(calculateWinProbabilities); // Sets win probabilities function

    displayMessage("Loading game assets..."); // Displays loading message

    mapImage = new Image(); // Creates new Image object for map
    mapImage.src = MAP_IMAGE_SOURCE; // Sets map image source
    await new Promise((resolve, reject) => {
        mapImage.onload = resolve; // Resolves promise on map load
        mapImage.onerror = () => {
            console.error(`Failed to load map image: ${MAP_IMAGE_SOURCE}`); // Logs error on map load failure
            // Fallback image for map in case of load error
            mapImage.src = `https://placehold.co/${canvas.width}x${canvas.height}/000000/FFFFFF?text=MAP+LOAD+ERROR`; // Sets fallback map image source
            mapImage.onload = resolve; // Resolves promise on fallback map load
            mapImage.onerror = () => reject(new Error(`Critical: Fallback image failed for map.`)); // Rejects promise on fallback map load failure
        };
    });

    const loadedImages = await Promise.all(IMAGE_SOURCES.map(src => { // Loads character images
        return new Promise((resolve, reject) => {
            const img = new Image(); // Creates new Image object for character
            img.src = src.url; // Sets character image source
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
                isDummy: src.isDummy || false,
                scaleFactorOverride: src.scaleFactorOverride || 1 // MODIFIED: Pass scaleFactorOverride
            }); // Resolves promise on character load
            img.onerror = () => {
                console.error(`Failed to load image: ${src.url}`); // Logs error on character load failure
                // Fallback image for character in case of load error
                img.src = `https://placehold.co/80x80/ff0000/FFFFFF?text=LOAD+ERROR`; // Sets fallback character image source
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
                    isDummy: src.isDummy || false,
                    scaleFactorOverride: src.scaleFactorOverride || 1 // MODIFIED: Pass scaleFactorOverride
                }); // Resolves promise on fallback character load
                img.onerror = () => reject(new Error(`Critical: Fallback image failed for ${src.name}`)); // Rejects promise on fallback character load failure
            };
        });
    }));

    setGameLoopDependencies(canvas, ctx, characters, mapImage); // Sets game loop dependencies

    // Initialize match creation with all available characters
    matchCreationState.setAllAvailableCharacters(loadedImages); // MODIFIED: Renamed function to setAllAvailableCharacters

    // Show the main menu initially
    showMainMenu(); // Shows main menu
    displayMessage("Game assets loaded. Click 'Start Game' to begin!"); // Displays welcome message
}

import { calculateWinProbabilities } from './gameLogic.js'; // Imports calculateWinProbabilities

export function getCharacters() { // Exports getCharacters function
    return characters;
}

export function setCharacters(newCharacters) { // Exports setCharacters function
    characters = newCharacters;
}