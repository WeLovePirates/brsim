// js/character/characterMoves.js

import {
    QUICKDRAW_HIT_CHANCE,
    MEDIC_PATCH_COOLDOWN,
    GHOST_BOO_DAMAGE,
    ORIGINAL_SPEED_MAGNITUDE,
    SWARM_DURATION_FRAMES,
    SWARM_BEE_DAMAGE_PER_TICK,
    FEEDING_FRENZY_DURATION_FRAMES, // Import new constant
    FEEDING_FRENZY_ATTACK_SPEED_BOOST, // Import new constant
    FEEDING_FRENZY_LOW_HEALTH_BONUS_DAMAGE_PERCENTAGE, // Import new constant
    VOLATILE_CONCOCTION_PROJECTILE_SPEED, // NEW
    VOLATILE_CONCOCTION_EXPLOSION_RADIUS, // NEW
    VOLATILE_CONCOCTION_DAMAGE, // NEW
    VOLATILE_CONCOCTION_HEAL, // NEW
    VOLATILE_CONCOCTION_STUN_DURATION_FRAMES, // NEW
    HONEYCOMB_STUN_DURATION_FRAMES // Reused for Alchemist stun
} from '../config.js';
import { displayMessage } from '../utils/displayUtils.js';
import { checkDistance } from '../utils/mathUtils.js';

/**
 * Handles the logic for a character's special move.
 * @param {Character} character - The character performing the move.
 * @param {Array<Character>} allCharacters - All characters in the game.
 * @param {number} CHARACTER_SCALE_FACTOR - The current scaling factor for characters.
 */
export function handleSpecialMove(character, allCharacters, CHARACTER_SCALE_FACTOR) {
    // No random chance here, it's handled in Character.js before calling this.
    character.lastMoveTime = Date.now();
    character.moveActive = true;

    let nearestOpponent = null;
    let minDistance = Infinity;

    allCharacters.forEach(otherChar => {
        if (otherChar !== character && otherChar.isAlive) {
            const dist = checkDistance(character, otherChar);
            if (dist < minDistance) {
                minDistance = dist;
                nearestOpponent = otherChar;
            }
        } // <-- MISSING '}' WAS HERE
    }); // Corrected: This parenthesis now correctly closes the forEach call.

    switch (character.moveType) {
        case 'confetti':
            character.moveEffect = { particles: [] };
            for (let i = 0; i < 50; i++) {
                character.moveEffect.particles.push({
                    x: character.x + Math.random() * character.width,
                    y: character.y + Math.random() * character.height,
                    vx: (Math.random() - 0.5) * 8 * CHARACTER_SCALE_FACTOR,
                    vy: (Math.random() - 0.5) * 8 * CHARACTER_SCALE_FACTOR,
                    alpha: 1,
                    color: `hsl(${Math.random() * 360}, 100%, 50%)`
                });
            }
            allCharacters.forEach(target => {
                if (target !== character && target.isAlive && !target.isPhasing && checkDistance(character, target) < character.width * 2.0) {
                    const damage = 15;
                    target.takeDamage(damage, character.attack, character.name, allCharacters);
                    character.damageDealt += damage;
                    target.dx *= 0.7;
                    target.dy *= 0.7;
                    setTimeout(() => {
                        target.dx /= 0.7;
                        target.dy /= 0.7;
                    }, 1500);
                }
            });
            displayMessage(`${character.name} used Confetti Blast!`);
            break;
        case 'baguette':
            character.moveEffect = {
                startAngle: Math.random() * Math.PI * 2,
                angle: Math.random() * Math.PI * 2
            };
            const reach = character.width * 1.5;
            allCharacters.forEach(target => {
                if (target !== character && target.isAlive && !target.isPhasing) {
                    const dist = checkDistance(character, target);
                    if (dist < reach + target.width / 2) {
                        const damage = 20;
                        target.takeDamage(damage, character.attack, character.name, allCharacters);
                        character.damageDealt += damage;
                    }
                }
            });
            displayMessage(`${character.name} used Baguette Bash!`);
            break;
        case 'quickdraw':
            if (nearestOpponent) {
                const projectileSpeed = 15 * CHARACTER_SCALE_FACTOR;
                const angleToOpponent = Math.atan2(nearestOpponent.y + nearestOpponent.height / 2 - (character.y + character.height / 2),
                                                   nearestOpponent.x + nearestOpponent.width / 2 - (character.x + character.width / 2));
                character.moveEffect = {
                    type: 'quickdraw_projectile',
                    x: character.x + character.width / 2,
                    y: character.y + character.height / 2,
                    vx: Math.cos(angleToOpponent) * projectileSpeed,
                    vy: Math.sin(angleToOpponent) * projectileSpeed,
                    life: 90,
                    beamLength: character.width * 2,
                    beamWidth: 8 * CHARACTER_SCALE_FACTOR,
                    angle: angleToOpponent
                };
                displayMessage(`${character.name} fired a Quick Draw shot!`);
            } else {
                character.moveActive = false;
                character.moveEffect = null;
            }
            break;
        case 'staticshock':
            character.moveEffect = { radius: 10 * CHARACTER_SCALE_FACTOR };
            allCharacters.forEach(target => {
                if (target !== character && target.isAlive && !target.isPhasing && checkDistance(character, target) < 80 * CHARACTER_SCALE_FACTOR) {
                    const damage = 10;
                    target.takeDamage(damage, character.attack, character.name, allCharacters);
                    character.damageDealt += damage;
                    target.dx *= 0.3;
                    target.dy *= 0.3;
                    setTimeout(() => {
                        target.dx /= 0.3;
                        target.dy /= 0.3;
                    }, 500);
                }
            });
            displayMessage(`${character.name} used Static Shock!`);
            break;
        case 'patch':
            if (Date.now() - character.lastPatchTime < MEDIC_PATCH_COOLDOWN) {
                character.moveActive = false;
                character.moveEffect = null;
                return;
            }

            character.moveEffect = { alpha: 1 };
            const selfHealAmount = 10 + Math.random() * 8 + character.defense * 0.2;
            character.heal(selfHealAmount);
            displayMessage(`${character.name} used Quick Patch on themselves! Healed for ${selfHealAmount.toFixed(0)}.`);

            if (Math.random() < 0.15) {
                let nearestOpponentForPatch = null;
                let minDistanceForPatch = Infinity;

                allCharacters.forEach(otherChar => {
                    if (otherChar !== character && otherChar.isAlive && !otherChar.isPhasing) {
                        const dist = checkDistance(character, otherChar);
                        if (dist < minDistanceForPatch) {
                            minDistanceForPatch = dist;
                            nearestOpponentForPatch = otherChar;
                        }
                    }
                });

                if (nearestOpponentForPatch) {
                    const opponentHealAmount = 8 + Math.random() * 4 + character.defense * 0.1;
                    nearestOpponentForPatch.heal(opponentHealAmount);
                    displayMessage(`${character.name} accidentally healed ${nearestOpponentForPatch.name} for ${opponentHealAmount.toFixed(0)}!`);
                }
            }
            character.lastPatchTime = Date.now();
            break;
        case 'shuriken':
            if (nearestOpponent) {
                const shurikenSpeed = 10 * CHARACTER_SCALE_FACTOR;
                const angleToOpponent = Math.atan2(nearestOpponent.y - character.y, nearestOpponent.x - character.x);
                character.moveEffect = {
                    x: character.x + character.width / 2,
                    y: character.y + character.height / 2,
                    vx: Math.cos(angleToOpponent) * shurikenSpeed,
                    vy: Math.sin(angleToOpponent) * shurikenSpeed,
                    life: 60
                };
                displayMessage(`${character.name} threw a Shuriken!`);
                // Initial hit check for shuriken (if target is very close)
                if (checkDistance(character, nearestOpponent) < character.width * 1.5 && !nearestOpponent.isBlockingShuriken && !nearestOpponent.isPhasing) {
                    const damage = 25;
                    nearestOpponent.takeDamage(damage, character.attack, character.name, allCharacters);
                    character.damageDealt += damage;
                    character.moveActive = false;
                    character.moveEffect = null;
                }
            } else {
                character.moveActive = false;
                character.moveEffect = null;
            }
            break;
        case 'fireball':
            if (nearestOpponent) {
                character.moveEffect = { radius: 10 * CHARACTER_SCALE_FACTOR, alpha: 1 };
                displayMessage(`${character.name} cast Fireball!`);
                allCharacters.forEach(target => {
                    if (target !== character && target.isAlive && !target.isPhasing && checkDistance(character, target) < 100 * CHARACTER_SCALE_FACTOR) {
                        const damage = 35;
                        target.takeDamage(damage, character.attack, character.name, allCharacters);
                        character.damageDealt += damage;
                    }
                });
            } else {
                character.moveActive = false;
                character.moveEffect = null;
            }
            break;
        case 'charge':
            character.moveEffect = { duration: 90 };
            character.speed *= 2.5;
            displayMessage(`${character.name} initiated a Charge!`);
            break;
        case 'boo':
            character.moveEffect = {
                type: 'boo_effect',
                radius: character.width * 2.0,
                duration: 30,
                appliedDamage: false
            };
            displayMessage(`${character.name} lets out a spectral cry!`);
            break;
        case 'swarm': // Queen Bee's special move
            character.moveEffect = {
                type: 'swarm',
                bees: [],
                duration: SWARM_DURATION_FRAMES,
                target: nearestOpponent
            };

            // Create mini bees spawned randomly within Queen Bee's bounds (or slightly outside)
            // with no initial velocity, letting flocking behavior take over.
            const spawnRadius = character.width * 0.7; // Spawn within a radius around Queen Bee's center
            for (let i = 0; i < 5; i++) {
                const angleOffset = Math.random() * Math.PI * 2;
                const distanceOffset = Math.random() * spawnRadius;

                character.moveEffect.bees.push({
                    x: character.x + character.width / 2 + Math.cos(angleOffset) * distanceOffset,
                    y: character.y + character.height / 2 + Math.sin(angleOffset) * distanceOffset,
                    vx: 0,
                    vy: 0,
                    size: 15 * CHARACTER_SCALE_FACTOR,
                    image: new Image(),
                    damageApplied: false,
                    clingingTo: null,
                    offsetX: 0,
                    offsetY: 0
                });
                character.moveEffect.bees[i].image.src = './sprites/mini_bee.png';
            }
            displayMessage(`${character.name} unleashes a Swarm of Bees!`);
            break;
        case 'feeding_frenzy': // Shark's special move
            character.moveEffect = {
                type: 'feeding_frenzy',
                duration: FEEDING_FRENZY_DURATION_FRAMES, // Use the constant
                originalAttack: character.attack, // Store original attack for reset
                originalAttackSpeed: character.speed // Store original speed for reset (attack speed)
            };
            // Apply buffs
            character.speed *= FEEDING_FRENZY_ATTACK_SPEED_BOOST; // Increase attack speed (represented by character speed)
            // Recalculate movement vector with new speed
            const currentAngleFrenzy = Math.atan2(character.dy, character.dx);
            const newSpeedMagnitudeFrenzy = ORIGINAL_SPEED_MAGNITUDE * character.speed * CHARACTER_SCALE_FACTOR;
            character.dx = Math.cos(currentAngleFrenzy) * newSpeedMagnitudeFrenzy;
            character.dy = Math.sin(currentAngleFrenzy) * newSpeedMagnitudeFrenzy;

            displayMessage(`${character.name} entered a Feeding Frenzy!`);
            break;
        case 'volatile_concoction': // NEW: Alchemist's Special Move
            if (nearestOpponent) {
                const projectileSpeed = VOLATILE_CONCOCTION_PROJECTILE_SPEED * CHARACTER_SCALE_FACTOR;
                const angleToOpponent = Math.atan2(nearestOpponent.y + nearestOpponent.height / 2 - (character.y + character.height / 2),
                                                   nearestOpponent.x + nearestOpponent.width / 2 - (character.x + character.width / 2));

                // Randomly choose an effect type: damage, heal, or stun
                const effectChoices = ['damage', 'heal', 'stun'];
                const chosenEffect = effectChoices[Math.floor(Math.random() * effectChoices.length)];
                let projectileColor = 'gray'; // Default
                if (chosenEffect === 'damage') projectileColor = 'red';
                else if (chosenEffect === 'heal') projectileColor = 'green';
                else if (chosenEffect === 'stun') projectileColor = 'purple';

                character.moveEffect = {
                    type: 'volatile_projectile',
                    x: character.x + character.width / 2,
                    y: character.y + character.height / 2,
                    vx: Math.cos(angleToOpponent) * projectileSpeed,
                    vy: Math.sin(angleToOpponent) * projectileSpeed,
                    radius: 15 * CHARACTER_SCALE_FACTOR, // Potion size
                    life: 120, // Projectile lifespan in frames
                    effectType: chosenEffect, // Store the chosen effect
                    color: projectileColor,
                    hasExploded: false // Flag to ensure explosion only happens once
                };
                displayMessage(`${character.name} threw a Volatile Concoction! (${chosenEffect})`);
            } else {
                character.moveActive = false;
                character.moveEffect = null;
                displayMessage(`${character.name} tried to throw a potion, but had no target!`);
            }
            break;
    }
}

/**
 * Updates the state of an active special move effect.
 * @param {Character} character - The character whose move effect is being updated.
 * @param {Array<Character>} allCharacters - All characters in the game.
 * @param {number} CHARACTER_SCALE_FACTOR - The current scaling factor for characters.
 * @param {HTMLCanvasElement} canvas - The game canvas.
 */
export function updateMoveEffect(character, allCharacters, CHARACTER_SCALE_FACTOR, canvas) {
    if (!character.moveActive || !character.moveEffect) return;

    switch (character.moveType) {
        case 'confetti':
            character.moveEffect.particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.alpha -= 0.03;
            });
            character.moveEffect.particles = character.moveEffect.particles.filter(p => p.alpha > 0);
            if (character.moveEffect.particles.length === 0) {
                character.moveActive = false;
                character.moveEffect = null;
            }
            break;
        case 'quickdraw':
            if (character.moveEffect.type === 'quickdraw_projectile') {
                character.moveEffect.x += character.moveEffect.vx;
                character.moveEffect.y += character.moveEffect.vy;
                character.moveEffect.life--;

                for (const target of allCharacters) {
                    if (target !== character && target.isAlive && !target.isPhasing) {
                        const beamCurrentX = character.moveEffect.x;
                        const beamCurrentY = character.moveEffect.y;
                        const beamHalfWidth = character.moveEffect.beamWidth / 2;
                        const beamHalfLength = character.moveEffect.beamLength / 2;

                        const beamLeft = beamCurrentX - beamHalfLength;
                        const beamRight = beamCurrentX + beamHalfLength;
                        const beamTop = beamCurrentY - beamHalfWidth;
                        const beamBottom = beamCurrentY + beamHalfWidth;

                        const targetLeft = target.x;
                        const targetRight = target.x + target.width;
                        const targetTop = target.y;
                        const targetBottom = target.y + target.height;

                        if (beamRight > targetLeft && beamLeft < targetRight &&
                            beamBottom > targetTop && beamTop < targetBottom) {

                            if (Math.random() < QUICKDRAW_HIT_CHANCE) {
                                const damage = 45;
                                target.takeDamage(damage, character.attack, character.name, allCharacters);
                                character.damageDealt += damage;
                                displayMessage(`${character.name}'s Quick Draw hit ${target.name} for ${damage} damage!`);
                            } else {
                                displayMessage(`${character.name}'s Quick Draw missed ${target.name}.`);
                            }
                            character.moveActive = false;
                            character.moveEffect = null;
                            break;
                        }
                    }
                }

                if (character.moveEffect && (character.moveEffect.life <= 0 ||
                    character.moveEffect.x < 0 || character.moveEffect.x > canvas.width ||
                    character.moveEffect.y < 0 || character.moveEffect.y > canvas.height)) {
                    character.moveActive = false;
                    character.moveEffect = null;
                }
            }
            break;
        case 'staticshock':
            character.moveEffect.radius += 3 * CHARACTER_SCALE_FACTOR;
            if (character.moveEffect.radius > 80 * CHARACTER_SCALE_FACTOR) {
                character.moveActive = false;
                character.moveEffect = null;
            }
            break;
        case 'baguette':
            character.moveEffect.angle += 0.2;
            if (character.moveEffect.angle > character.moveEffect.startAngle + Math.PI * 1.2) {
                character.moveActive = false;
                character.moveEffect = null;
            }
            break;
        case 'patch':
            character.moveEffect.alpha -= 0.05;
            if (character.moveEffect.alpha <= 0) {
                character.moveActive = false;
                character.moveEffect = null;
            }
            break;
        case 'shuriken':
            character.moveEffect.x += character.moveEffect.vx;
            character.moveEffect.y += character.moveEffect.vy;
            character.moveEffect.life--;
            if (character.moveEffect.life <= 0) {
                character.moveActive = false;
                character.moveEffect = null;
            }
            break;
        case 'fireball':
            character.moveEffect.radius += 5 * CHARACTER_SCALE_FACTOR;
            character.moveEffect.alpha -= 0.02;
            if (character.moveEffect.alpha <= 0) {
                character.moveActive = false;
                character.moveEffect = null;
            }
            break;
        case 'charge':
            character.moveEffect.duration--;
            if (character.moveEffect.duration <= 0) {
                character.moveActive = false;
                character.moveEffect = null;
                character.speed = character.originalSpeed;
                const newSpeedMagnitude = ORIGINAL_SPEED_MAGNITUDE * character.speed * CHARACTER_SCALE_FACTOR;
                const currentAngle = Math.atan2(character.dy, character.dx);
                character.dx = Math.cos(currentAngle) * newSpeedMagnitude;
                character.dy = Math.sin(currentAngle) * newSpeedMagnitude;
            }
            break;
        case 'boo':
            character.moveEffect = {
                type: 'boo_effect',
                radius: character.width * 2.0,
                duration: 30,
                appliedDamage: false
            };
            displayMessage(`${character.name} lets out a spectral cry!`);
            break;
        case 'swarm': // Update logic for Queen Bee's Swarm
            if (character.moveEffect && character.moveEffect.type === 'swarm') {
                character.moveEffect.duration--;

                const target = character.moveEffect.target;
                if (target && target.isAlive) {
                    const trackingStrength = 0.05; // How strongly bees move towards the target
                    const separationStrength = 0.1; // How strongly bees repel each other (increased for spread)
                    const randomWanderStrength = 0.02; // Small random motion for organic look

                    character.moveEffect.bees.forEach(bee => {
                        // Handle clinging bees separately
                        if (bee.clingingTo) {
                            // Update bee's position to follow the clinging target
                            bee.x = bee.clingingTo.x + bee.offsetX;
                            bee.y = bee.clingingTo.y + bee.offsetY;

                            // Re-apply damage for clinging bees periodically
                            if (character.moveEffect.duration % 15 === 0 && !bee.damageApplied) { // Damage every ~15 frames for clinging
                                if (bee.clingingTo.isAlive) {
                                    const damage = SWARM_BEE_DAMAGE_PER_TICK;
                                    bee.clingingTo.takeDamage(damage, character.attack, character.name, allCharacters);
                                    character.damageDealt += damage;
                                    bee.damageApplied = true;
                                }
                            }
                            return; // Skip swarm movement logic for clinging bees
                        }

                        // Normal swarm behavior for non-clinging bees
                        let totalForceX = 0;
                        let totalForceY = 0;

                        // 1. Force towards target
                        const angleToTarget = Math.atan2(target.y - bee.y, target.x - bee.x);
                        totalForceX += Math.cos(angleToTarget) * trackingStrength;
                        totalForceY += Math.sin(angleToTarget) * trackingStrength;

                        // 2. Separation from other bees
                        character.moveEffect.bees.forEach(otherBee => {
                            if (bee !== otherBee && !otherBee.clingingTo) { // Only separate from other non-clinging bees
                                const dist = checkDistance(
                                    {x: bee.x, y: bee.y, width: bee.size, height: bee.size},
                                    {x: otherBee.x, y: otherBee.y, width: otherBee.size, height: otherBee.size}
                                );
                                if (dist < bee.size * 3) { // Repel if within 3x bee size
                                    const angleAway = Math.atan2(bee.y - otherBee.y, bee.x - otherBee.x);
                                    totalForceX += (Math.cos(angleAway) / dist) * separationStrength;
                                    totalForceY += (Math.sin(angleAway) / dist) * separationStrength;
                                }
                            }
                        });

                        // 3. Random wander
                        totalForceX += (Math.random() - 0.5) * randomWanderStrength;
                        totalForceY += (Math.random() - 0.5) * randomWanderStrength;


                        // Apply force to velocity
                        bee.vx += totalForceX;
                        bee.vy += totalForceY;

                        // Limit bee speed (normalize velocity to a max speed)
                        const currentBeeSpeed = Math.sqrt(bee.vx * bee.vx + bee.vy * bee.vy);
                        const maxBeeSpeed = 7 * CHARACTER_SCALE_FACTOR; // Max movement speed for individual bees
                        if (currentBeeSpeed > maxBeeSpeed) {
                            bee.vx = (bee.vx / currentBeeSpeed) * maxBeeSpeed;
                            bee.vy = (bee.vy / currentBeeSpeed) * maxBeeSpeed;
                        } else if (currentBeeSpeed < 1 * CHARACTER_SCALE_FACTOR && currentBeeSpeed > 0) { // Ensure minimum movement
                             bee.vx = (bee.vx / currentBeeSpeed) * (1 * CHARACTER_SCALE_FACTOR);
                             bee.vy = (bee.vy / currentBeeSpeed) * (1 * CHARACTER_SCALE_FACTOR);
                        }

                        bee.x += bee.vx;
                        bee.y += bee.vy;

                        // Check for collision with target (only for non-clinging bees)
                        if (!bee.damageApplied && !bee.clingingTo && checkDistance({x: bee.x, y: bee.y, width: bee.size, height: bee.size}, target) < target.width / 2) {
                            const damage = SWARM_BEE_DAMAGE_PER_TICK;
                            target.takeDamage(damage, character.attack, character.name, allCharacters);
                            character.damageDealt += damage;
                            bee.damageApplied = true;

                            // Make the bee cling to the target
                            bee.clingingTo = target;
                            // Calculate offset relative to target's top-left for varied clinging positions
                            bee.offsetX = (bee.x - target.x) + (Math.random() - 0.5) * target.width * 0.3;
                            bee.offsetY = (bee.y - target.y) + (Math.random() - 0.5) * target.height * 0.3;
                            bee.vx = 0; // Stop its movement
                            bee.vy = 0;
                            displayMessage(`A mini bee clung to ${target.name}!`);
                        }
                    });
                }

                // Reset damageApplied for next tick (applies to both moving and clinging bees)
                // This ensures clinging bees can deal damage in subsequent ticks as well.
                if (character.moveEffect.duration % 15 === 0) { // Reset for clinging bees every 15 frames for damage tick
                    character.moveEffect.bees.forEach(bee => bee.damageApplied = false);
                } else if (character.moveEffect.duration % 5 === 0) { // Reset for flying bees more frequently for smooth damage
                     character.moveEffect.bees.forEach(bee => {
                         if (!bee.clingingTo) bee.damageApplied = false;
                     });
                }


                if (character.moveEffect.duration <= 0) {
                    character.moveActive = false;
                    character.moveEffect = null;
                }
            }
            break;
        case 'feeding_frenzy': // Update logic for Shark's Feeding Frenzy
            if (character.moveEffect && character.moveEffect.type === 'feeding_frenzy') {
                character.moveEffect.duration--;

                // The visual effect (red pulsing border) is handled in Character.draw() based on `moveEffect.duration`

                if (character.moveEffect.duration <= 0) {
                    character.moveActive = false;
                    character.moveEffect = null;
                    // Reset character's stats
                    character.speed = character.originalSpeed; // Reset speed (attack speed)
                    // Recalculate movement vector with original speed
                    const currentAngleReset = Math.atan2(character.dy, character.dx);
                    const newSpeedMagnitudeReset = ORIGINAL_SPEED_MAGNITUDE * character.speed * CHARACTER_SCALE_FACTOR;
                    character.dx = Math.cos(currentAngleReset) * newSpeedMagnitudeReset;
                    character.dy = Math.sin(currentAngleReset) * newSpeedMagnitudeReset;
                    displayMessage(`${character.name}'s Feeding Frenzy ended.`);
                }
            }
            break;
        case 'volatile_concoction': // NEW: Alchemist's Special Move Update
            if (character.moveEffect.type === 'volatile_projectile') {
                character.moveEffect.x += character.moveEffect.vx;
                character.moveEffect.y += character.moveEffect.vy;
                character.moveEffect.life--;

                let shouldExplode = false;
                // Check for collision with any target
                for (const target of allCharacters) {
                    // IMPORTANT: Prevent Alchemist from affecting themselves
                    if (target !== character && target.isAlive && !target.isPhasing) {
                        const dist = checkDistance(
                            {x: character.moveEffect.x, y: character.moveEffect.y, width: character.moveEffect.radius * 2, height: character.moveEffect.radius * 2},
                            target
                        );
                        if (dist < target.width / 2 + character.moveEffect.radius) {
                            shouldExplode = true;
                            break;
                        }
                    }
                }

                // Check for lifespan expiry or out of bounds
                if (character.moveEffect.life <= 0 || shouldExplode ||
                    character.moveEffect.x < -character.moveEffect.radius || character.moveEffect.x > canvas.width + character.moveEffect.radius ||
                    character.moveEffect.y < -character.moveEffect.radius || character.moveEffect.y > canvas.height + character.moveEffect.radius) {
                    
                    // Transform into an explosion effect
                    character.moveEffect = {
                        type: 'volatile_explosion',
                        x: character.moveEffect.x,
                        y: character.moveEffect.y,
                        radius: 10 * CHARACTER_SCALE_FACTOR, // Starting small for explosion
                        maxRadius: VOLATILE_CONCOCTION_EXPLOSION_RADIUS * CHARACTER_SCALE_FACTOR,
                        duration: 30, // Frames for explosion animation (e.g., 0.5 seconds)
                        alpha: 1,
                        effectType: character.moveEffect.effectType, // Carry over effect type
                        color: character.moveEffect.color,
                        targetsHit: [] // To prevent hitting the same target multiple times
                    };
                }
            } else if (character.moveEffect.type === 'volatile_explosion') {
                character.moveEffect.radius += (character.moveEffect.maxRadius - character.moveEffect.radius) * 0.2; // Grow quickly
                character.moveEffect.alpha -= 1 / character.moveEffect.duration; // Fade out

                // Apply effects to targets in the explosion radius
                if (character.moveEffect.duration > 0) {
                    allCharacters.forEach(target => {
                        // IMPORTANT: Prevent Alchemist from affecting themselves
                        if (target !== character && target.isAlive && !target.isPhasing && !character.moveEffect.targetsHit.includes(target.name)) {
                            const dist = checkDistance(
                                {x: character.moveEffect.x, y: character.moveEffect.y, width: character.moveEffect.radius * 2, height: character.moveEffect.radius * 2},
                                target
                            );
                            if (dist < target.width / 2 + character.moveEffect.radius) {
                                switch (character.moveEffect.effectType) {
                                    case 'damage':
                                        const damageAmount = VOLATILE_CONCOCTION_DAMAGE;
                                        target.takeDamage(damageAmount, character.attack, character.name, allCharacters);
                                        character.damageDealt += damageAmount;
                                        displayMessage(`${target.name} took ${damageAmount} damage from Volatile Concoction!`);
                                        break;
                                    case 'heal':
                                        const healAmount = VOLATILE_CONCOCTION_HEAL;
                                        target.heal(healAmount);
                                        displayMessage(`${target.name} healed for ${healAmount} from Volatile Concoction!`);
                                        break;
                                    case 'stun':
                                        if (!target.isStunned) {
                                            target.isStunned = true;
                                            target.originalSpeedWhenStunned = target.speed;
                                            target.speed = 0;
                                            target.dx = 0;
                                            target.dy = 0;
                                            // Apply the 'volatile_concoction_stun' effect for visual differentiation
                                            target.secondaryAbilityActive = true;
                                            target.secondaryAbilityEffect = {
                                                type: 'volatile_concoction_stun', // NEW type for Alchemist stun
                                                duration: VOLATILE_CONCOCTION_STUN_DURATION_FRAMES // Use Alchemist specific stun duration
                                            };
                                            target.lastSecondaryAbilityTime = Date.now(); // Record when they got stuck
                                            displayMessage(`${target.name} was stunned by Volatile Concoction!`);
                                        }
                                        break;
                                }
                                character.moveEffect.targetsHit.push(target.name); // Mark as hit by this explosion
                            }
                        }
                    });
                }


                if (character.moveEffect.duration <= 0 || character.moveEffect.alpha <= 0) {
                    character.moveActive = false;
                    character.moveEffect = null;
                }
            }
            break;
    }
}