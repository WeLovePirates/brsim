// js/game/gameLogic.js

import { BASE_COLLISION_DAMAGE, CHARGE_IMPACT_DAMAGE } from '../config.js';
import { displayMessage } from '../utils/displayUtils.js';
import { checkCollision } from '../utils/collisionUtils.js';
import { checkDistance } from '../utils/mathUtils.js';

/**
 * Calculates the win probabilities for all alive characters.
 * @param {Array<Character>} chars - The array of character objects.
 * @returns {Array<object>} An array of objects with character name and win probability.
 */
export function calculateWinProbabilities(chars) {
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

/**
 * Handles character-to-character collision and applies damage/repositioning.
 * @param {Array<Character>} characters - The array of character objects.
 */
export function handleCollisions(characters) {
    for (let i = 0; i < characters.length; i++) {
        for (let j = i + 1; j < characters.length; j++) {
            const char1 = characters[i];
            const char2 = characters[j];

            if (char1.isAlive && char2.isAlive && checkCollision(char1, char2)) {
                // Phasing characters or dummies do not collide or take collision damage
                if (char1.isPhasing || char2.isPhasing || char1.isDummy || char2.isDummy) {
                    continue;
                }

                // NEW: Tank's Charge special case - only charging Tank deals collision damage
                let damage1 = BASE_COLLISION_DAMAGE;
                let damage2 = BASE_COLLISION_DAMAGE;

                if (char1.moveType === 'charge' && char1.moveActive) { // char1 is charging
                    damage1 = CHARGE_IMPACT_DAMAGE;
                    damage2 = 0; // The charging character doesn't take damage from collision
                } else if (char2.moveType === 'charge' && char2.moveActive) { // char2 is charging
                    damage2 = CHARGE_IMPACT_DAMAGE;
                    damage1 = 0; // The charging character doesn't take damage from collision
                }

                char1.takeDamage(damage1, char2.attack, char2.name, characters);
                char2.takeDamage(damage2, char1.attack, char1.name, characters);

                char2.damageDealt += damage1;
                char1.damageDealt += damage2;


                // Simple repulsion to prevent characters from sticking
                const overlapX = Math.min(char1.x + char1.width, char2.x + char2.width) - Math.max(char1.x, char2.x);
                const overlapY = Math.min(char1.y + char1.height, char2.y + char2.height) - Math.max(char1.y, char2.y);

                if (overlapX < overlapY) {
                    if (char1.x < char2.x) {
                        char1.x -= overlapX / 2;
                        char2.x += overlapX / 2;
                    } else {
                        char1.x += overlapX / 2;
                        char2.x -= overlapX / 2;
                    }
                    char1.dx *= -1;
                    char2.dx *= -1;
                } else {
                    if (char1.y < char2.y) {
                        char1.y -= overlapY / 2;
                        char2.y += overlapY / 2;
                    } else {
                        char1.y += overlapY / 2;
                        char2.y -= overlapY / 2;
                    }
                    char1.dy *= -1;
                    char2.dy *= -1;
                }
            }
        }
    }
}

/**
 * Applies damage from static field ability.
 * @param {Array<Character>} characters - The array of character objects.
 */
export function applyStaticFieldDamage(characters) {
    characters.forEach(char => {
        if (char.isAlive && char.secondaryAbilityActive && char.secondaryAbilityEffect && char.secondaryAbilityEffect.type === 'static_field') {
            characters.forEach(target => {
                if (target !== char && target.isAlive && !target.isDummy && !target.isPhasing && checkDistance(char, target) < char.secondaryAbilityEffect.radius) {
                    target.health -= char.secondaryAbilityEffect.tickDamage;
                    char.damageDealt += char.secondaryAbilityEffect.tickDamage;
                    if (target.health <= 0) {
                        target.health = 0;
                        target.isAlive = false;
                        target.deathTime = performance.now(); // Keep deathTime for general summary time calculations
                        displayMessage(`${target.name} was defeated by ${char.name}'s Static Field!`);
                        char.kills++;
                    }
                }
            });
        }
    });
}

/**
 * Handles shuriken projectile collision.
 * Now handled more generally in updateMoveEffect in characterMoves.js
 * (Kept for compatibility, but its logic might be minimal or removed soon)
 * @param {Array<Character>} characters - The array of character objects.
 */
export function handleShurikenCollisions(characters) {
    // This function is largely superseded by direct projectile collision logic in characterMoves.js
    // Keeping it for now to avoid breaking existing flow, but its impact is minimal.
    characters.forEach(ninja => {
        if (ninja.isAlive && ninja.moveType === 'shuriken' && ninja.moveActive) {
            // The actual collision and damage logic for shuriken is now primarily within
            // updateMoveEffect in characterMoves.js, which checks collision with the projectile's target.
            // This function might become obsolete or simplified if all projectile logic moves there.
        }
    });
}