// js/game/gameLogic.js

import { BASE_COLLISION_DAMAGE, IS_BOSS_MODE } from '../config.js';
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
        // Bosses have higher score weight to reflect their strength
        const scoreMultiplier = char.isBoss ? 5 : 1;
        const score = char.health * (char.attack * 0.5 + char.defense * 0.5 + char.speed * 0.2) * scoreMultiplier;
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
                // Phasing characters do not collide or take collision damage
                if (char1.isPhasing || char2.isPhasing) {
                    continue;
                }

                // NEW LOGIC FOR COLLISION DAMAGE ONLY
                let applyCollisionDamage = true;
                if (IS_BOSS_MODE.ENABLED) {
                    // In Boss Mode, do NOT apply collision damage if both are players.
                    if (!char1.isBoss && !char2.isBoss) {
                        applyCollisionDamage = false;
                    }
                }

                // Regardless of damage, characters will still repel each other unless they are phasing.
                // Apply damage if allowed by the flag
                if (applyCollisionDamage) {
                    const damage1 = BASE_COLLISION_DAMAGE;
                    const damage2 = BASE_COLLISION_DAMAGE;

                    char1.takeDamage(damage1, char2.attack, char2.name, characters);
                    char2.takeDamage(damage2, char1.attack, char1.name, characters);

                    char2.damageDealt += damage1;
                    char1.damageDealt += damage2;
                }

                // Always apply repulsion (physical collision), even if no damage is dealt
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
                let shouldTarget = false;
                if (IS_BOSS_MODE.ENABLED) {
                    // In boss mode, player's static field targets boss. Boss's static field targets players.
                    shouldTarget = (char.isBoss !== target.isBoss);
                } else {
                    // In simulator mode, static field targets anyone not the caster.
                    shouldTarget = (target !== char);
                }

                if (target.isAlive && !target.isPhasing && shouldTarget && checkDistance(char, target) < char.secondaryAbilityEffect.radius) {
                    target.health -= char.secondaryAbilityEffect.tickDamage;
                    char.damageDealt += char.secondaryAbilityEffect.tickDamage;
                    if (target.health <= 0) {
                        target.health = 0;
                        target.isAlive = false;
                        target.deathTime = performance.now();
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
 * @param {Array<Character>} characters - The array of character objects.
 */
export function handleShurikenCollisions(characters) {
    characters.forEach(ninja => {
        if (ninja.isAlive && ninja.moveType === 'shuriken' && ninja.moveActive) {
            if (ninja.moveEffect) {
                const projectileX = ninja.moveEffect.x;
                const projectileY = ninja.moveEffect.y;

                characters.forEach(target => {
                    let shouldTarget = false;
                    if (IS_BOSS_MODE.ENABLED) {
                        // In boss mode, shuriken from player targets boss. Shuriken from boss targets players.
                        shouldTarget = (ninja.isBoss !== target.isBoss);
                    } else {
                        // In simulator mode, shuriken targets anyone not the caster.
                        shouldTarget = (target !== ninja);
                    }

                    if (target.isAlive && !target.isBlockingShuriken && !target.isPhasing && shouldTarget &&
                        checkDistance({ x: projectileX, y: projectileY, width: 0, height: 0 }, target) < target.width / 2) {
                        const damage = 25;
                        target.takeDamage(damage, ninja.attack, ninja.name, characters);
                        ninja.damageDealt += damage;
                        ninja.moveActive = false; // Projectile dissipates on hit
                        ninja.moveEffect = null;
                    }
                });
            } else {
                ninja.moveActive = false;
                ninja.moveEffect = null;
            }
        }
    });
}