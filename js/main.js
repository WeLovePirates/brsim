// js/main.js

// All constants are global now.
// All functions from utils.js are under window.GameUtils
// Character class is now window.Character
// All functions from ui.js are under window.GameUI

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let characters = [];
let animationFrameId;
let gameRunning = false;

let gameStartTime;
let gameEndTime;
let lastProbUpdateTime = 0;

// This function calculates probabilities and is now globally accessible
function calculateWinProbabilities(chars) {
    const aliveCharacters = chars.filter(char => char.isAlive);
    if (aliveCharacters.length === 0) {
        return [];
    }
    if (aliveCharacters.length === 1) {
        return [{ name: aliveCharacters[0].name, probability: 100 }];
    }

    let totalPowerScore = 0;
    const characterScores = aliveCharacters.map(char => {
        const score = char.health * (char.attack * 0.5 + char.defense * 0.5 + char.speed * 0.2);
        totalPowerScore += score;
        return { name: char.name, score: score };
    });

    return characterScores.map(charScore => ({
        name: charScore.name,
        probability: (charScore.score / totalPowerScore) * 100
    })).sort((a, b) => b.probability - a.probability);
}


async function initGame() {
    GameUtils.initAudio(); // Initialize Tone.js audio context

    GameUI.updateCanvasSize(canvas); // Set initial canvas size

    // Pass the calculateWinProbabilities function to ui.js via its global setter
    GameUI.setCalculateWinProbabilitiesFunction(calculateWinProbabilities);

    GameUI.initUIMechanics(canvas, startGame, resetGame); // Set up UI event listeners

    GameUtils.displayMessage("Loading characters..."); //
    const loadedImages = await Promise.all(IMAGE_SOURCES.map(src => { //
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = src.url; //
            img.onload = () => resolve({
                name: src.name, //
                image: img,
                move: src.move, //
                attack: src.attack, //
                defense: src.defense, //
                speed: src.speed, //
                health: src.health, //
                secondaryAbility: src.secondaryAbility, //
                secondaryAbilityCooldown: src.secondaryAbilityCooldown, //
                isDummy: src.isDummy || false // Pass the isDummy flag
            });
            img.onerror = () => {
                console.error(`Failed to load image: ${src.url}`); //
                img.src = `https://placehold.co/80x80/ff0000/FFFFFF?text=LOAD+ERROR`; // Fallback placeholder
                img.onload = () => resolve({ // Resolve even if fallback is used
                    name: src.name, //
                    image: img,
                    move: src.move, //
                    attack: src.attack, //
                    defense: src.defense, //
                    speed: src.speed, //
                    health: src.health, //
                    secondaryAbility: src.secondaryAbility, //
                    secondaryAbilityCooldown: src.secondaryAbilityCooldown, //
                    isDummy: src.isDummy || false // Pass the isDummy flag
                });
                img.onerror = () => reject(new Error(`Critical: Fallback image failed for ${src.name}`)); //
            };
        });
    }));

    characters = loadedImages.map(data => new Character( // Access global Character class
        data.name,
        data.image,
        data.move,
        data.attack,
        data.defense,
        data.speed,
        GameUI.CHARACTER_SCALE_FACTOR, // Access via GameUI
        data.health,
        data.secondaryAbility,
        data.secondaryAbilityCooldown,
        canvas,
        data.isDummy // Pass the isDummy flag to the Character constructor
    ));
    resetGame(); //
    GameUtils.displayMessage("Characters loaded! Click 'Start Game' to begin."); //
    GameUI.updateWinProbabilityMenu(characters); //
}

function gameLoop() {
    if (!gameRunning) { //
        return;
    }

    const currentTime = Date.now();

    if (currentTime - lastProbUpdateTime > PROB_UPDATE_INTERVAL) { //
        GameUI.updateWinProbabilityMenu(characters); //
        lastProbUpdateTime = currentTime; //
    }

    characters.forEach(char => char.update(characters, GameUI.CHARACTER_SCALE_FACTOR)); //

    characters.forEach(char => {
        if (char.isAlive && char.secondaryAbilityActive && char.secondaryAbilityEffect && char.secondaryAbilityEffect.type === 'static_field') { //
            characters.forEach(target => {
                // Static field does not affect dummy characters
                if (target !== char && target.isAlive && !target.isDummy && GameUtils.checkDistance(char, target) < char.secondaryAbilityEffect.radius) { //
                    target.health -= char.secondaryAbilityEffect.tickDamage; //
                    char.damageDealt += char.secondaryAbilityEffect.tickDamage; //
                    if (target.health <= 0) { //
                        target.health = 0; //
                        target.isAlive = false; //
                        target.deathTime = performance.now(); //
                        GameUtils.displayMessage(`${target.name} was defeated by ${char.name}'s Static Field!`); //
                        char.kills++; //
                    }
                }
            });
        }
    });

    characters.forEach(ninja => {
        if (ninja.isAlive && ninja.moveType === 'shuriken' && ninja.moveActive) { //
            if (ninja.moveEffect) { //
                const projectileX = ninja.moveEffect.x; //
                const projectileY = ninja.moveEffect.y; //

                characters.forEach(target => {
                    // Shuriken does not affect dummy characters
                    if (target !== ninja && target.isAlive && !target.isBlockingShuriken && !target.isDummy && //
                        GameUtils.checkDistance({ x: projectileX, y: projectileY, width: 0, height: 0 }, target) < target.width / 2) { //
                        const damage = 25; //
                        target.takeDamage(damage, ninja.attack, ninja.name, characters); //
                        ninja.damageDealt += damage; //
                        ninja.moveActive = false; //
                        ninja.moveEffect = null; //
                    }
                });
            } else {
                ninja.moveActive = false; //
                ninja.moveEffect = null; //
            }
        }
    });


    for (let i = 0; i < characters.length; i++) { //
        for (let j = i + 1; j < characters.length; j++) { //
            const char1 = characters[i]; //
            const char2 = characters[j]; //

            if (char1.isAlive && char2.isAlive && GameUtils.checkCollision(char1, char2)) { //
                // If either character is phasing or a dummy, they pass through each other without standard collision effects.
                if (char1.isPhasing || char2.isPhasing || char1.isDummy || char2.isDummy) { //
                    // No collision damage or push-apart if one is phasing or a dummy.
                    // Damage immunity for the phasing/dummy character itself is already handled in Character.takeDamage.
                    // This prevents the non-phasing character from being pushed or taking collision damage from a phasing/dummy character.
                } else {
                    // Original collision logic for non-phasing and non-dummy characters
                    const damage1 = BASE_COLLISION_DAMAGE; // Global constant
                    const damage2 = BASE_COLLISION_DAMAGE; //

                    char1.takeDamage(damage1, char2.attack, char2.name, characters); //
                    char2.takeDamage(damage2, char1.attack, char1.name, characters); //

                    char2.damageDealt += damage1; //
                    char1.damageDealt += damage2; //

                    GameUtils.playHitSound(); //

                    const overlapX = Math.min(char1.x + char1.width, char2.x + char2.width) - Math.max(char1.x, char2.x); //
                    const overlapY = Math.min(char1.y + char1.height, char2.y + char2.height) - Math.max(char1.y, char2.y); //

                    if (overlapX < overlapY) { //
                        if (char1.x < char2.x) { //
                            char1.x -= overlapX / 2; //
                            char2.x += overlapX / 2; //
                        } else {
                            char1.x += overlapX / 2; //
                            char2.x -= overlapX / 2; //
                        }
                        char1.dx *= -1; //
                        char2.dx *= -1; //
                    } else {
                        if (char1.y < char2.y) { //
                            char1.y -= overlapY / 2; //
                            char2.y += overlapY / 2; //
                        } else {
                            char1.y += overlapY / 2; //
                            char2.y -= overlapY / 2; //
                        }
                        char1.dy *= -1; //
                        char2.dy *= -1; //
                    }
                }
            }
        }
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height); //
    characters.forEach(char => char.draw(GameUI.CHARACTER_SCALE_FACTOR)); //

    const aliveCharacters = characters.filter(char => char.isAlive); //
    if (aliveCharacters.length <= 1 && gameRunning) { //
        gameRunning = false; //
        cancelAnimationFrame(animationFrameId); //
        gameEndTime = performance.now(); //
        if (aliveCharacters.length === 1) { //
            GameUtils.displayMessage(`${aliveCharacters[0].name} wins the battle!`); //
        } else {
            GameUtils.displayMessage("It's a draw! No one survived."); //
        }
        document.getElementById('startButton').disabled = false; //
        GameUI.updateWinProbabilityMenu(characters); //
        GameUI.displayGameSummary(characters, gameStartTime, gameEndTime); //
    } else if (gameRunning) { //
        animationFrameId = requestAnimationFrame(gameLoop); //
    }
}


function startGame() {
    if (gameRunning) return; //

    // Resume Tone.js AudioContext on user gesture (Start Button click)
    if (GameUtils.synth && Tone.context.state !== 'running') { //
        Tone.context.resume(); //
    }

    gameStartTime = performance.now(); //
    characters.forEach(char => {
        char.health = char.maxHealth; //
        char.isAlive = true; //
        char.lastHitTime = {}; //
        char.lastMoveTime = 0; //
        char.lastPatchTime = 0; //
        char.lastSecondaryAbilityTime = 0; //
        char.secondaryAbilityActive = false; //
        char.secondaryAbilityEffect = null; //
        char.speed = char.originalSpeed; //
        char.defense = char.originalDefense; //
        char.isDodging = false; //
        char.isBlockingShuriken = false; //
        char.kills = 0; //
        char.damageDealt = 0; //
        char.healingDone = 0; //
        char.spawnTime = gameStartTime; //
        char.deathTime = 0; //

        char.x = Math.random() * (canvas.width - char.width); //
        char.y = Math.random() * (canvas.height - char.height); //

        // Set movement to 0 for dummy characters
        if (char.isDummy) {
            char.dx = 0;
            char.dy = 0;
        } else {
            char.dx = (Math.random() - 0.5) * ORIGINAL_SPEED_MAGNITUDE * char.speed * GameUI.CHARACTER_SCALE_FACTOR; //
            char.dy = (Math.random() - 0.5) * ORIGINAL_SPEED_MAGNITUDE * char.speed * GameUI.CHARACTER_SCALE_FACTOR; //
            if (Math.abs(char.dx) < 1 * char.speed * GameUI.CHARACTER_SCALE_FACTOR) char.dx = (char.dx > 0 ? 1 : -1) * char.speed * GameUI.CHARACTER_SCALE_FACTOR; //
            if (Math.abs(char.dy) < 1 * char.speed * GameUI.CHARACTER_SCALE_FACTOR) char.dy = (char.dy > 0 ? 1 : -1) * char.speed * GameUI.CHARACTER_SCALE_FACTOR; //
        }
    });

    gameRunning = true; //
    GameUtils.displayMessage("Battle started with special moves and stats!"); //
    document.getElementById('startButton').disabled = true; //
    animationFrameId = requestAnimationFrame(gameLoop); //

    lastProbUpdateTime = Date.now(); //
    GameUI.updateWinProbabilityMenu(characters); //
}

function resetGame() {
    cancelAnimationFrame(animationFrameId); //
    gameRunning = false; //
    document.getElementById('startButton').disabled = false; //
    ctx.clearRect(0, 0, canvas.width, canvas.height); //
    characters.forEach(char => {
        char.health = char.maxHealth; //
        char.isAlive = true; //
        char.lastHitTime = {}; //
        char.lastMoveTime = 0; //
        char.lastPatchTime = 0; //
        char.lastSecondaryAbilityTime = 0; //
        char.secondaryAbilityActive = false; //
        char.secondaryAbilityEffect = null; //
        char.speed = char.originalSpeed; //
        char.defense = char.originalDefense; //
        char.isDodging = false; //
        char.isBlockingShuriken = false; //
        char.kills = 0; //
        char.damageDealt = 0; //
        char.healingDone = 0; //
        char.spawnTime = 0; //
        char.deathTime = 0; //

        char.x = Math.random() * (canvas.width - char.width); //
        char.y = Math.random() * (canvas.height - char.height); //

        // Set movement to 0 for dummy characters
        if (char.isDummy) {
            char.dx = 0;
            char.dy = 0;
        } else {
            char.dx = (Math.random() - 0.5) * ORIGINAL_SPEED_MAGNITUDE * char.speed * GameUI.CHARACTER_SCALE_FACTOR; //
            char.dy = (Math.random() - 0.5) * ORIGINAL_SPEED_MAGNITUDE * char.speed * GameUI.CHARACTER_SCALE_FACTOR; //
            if (Math.abs(char.dx) < 1 * char.speed * GameUI.CHARACTER_SCALE_FACTOR) char.dx = (char.dx > 0 ? 1 : -1) * char.speed * GameUI.CHARACTER_SCALE_FACTOR; //
            if (Math.abs(char.dy) < 1 * char.speed * GameUI.CHARACTER_SCALE_FACTOR) char.dy = (char.dy > 0 ? 1 : -1) * char.speed * GameUI.CHARACTER_SCALE_FACTOR; //
        }
        char.draw(GameUI.CHARACTER_SCALE_FACTOR); //
    });
    GameUtils.displayMessage("Game reset. Click 'Start Game' to play again!"); //
    GameUI.updateWinProbabilityMenu(characters); //

    if (GameUI.gameSummaryOverlay) { //
        GameUI.gameSummaryOverlay.style.display = 'none'; //
    }
}

window.onload = initGame;
