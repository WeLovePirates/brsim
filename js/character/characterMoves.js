// js/character/characterMoves.js

import {
    QUICKDRAW_HIT_CHANCE,
    MEDIC_PATCH_COOLDOWN,
    GHOST_BOO_DAMAGE,
    ORIGINAL_SPEED_MAGNITUDE,
    SWARM_DURATION_FRAMES,
    SWARM_BEE_DAMAGE_PER_TICK,
    FEEDING_FRENZY_DURATION_FRAMES,
    FEEDING_FRENZY_ATTACK_SPEED_BOOST,
    FEEDING_FRENZY_LOW_HEALTH_BONUS_DAMAGE_PERCENTAGE,
    VOLATILE_CONCOCTION_PROJECTILE_SPEED,
    VOLATILE_CONCOCTION_EXPLOSION_RADIUS,
    VOLATILE_CONCOCTION_DAMAGE,
    VOLATILE_CONCOCTION_HEAL,
    VOLATILE_CONCOCTION_STUN_DURATION_FRAMES,
    HONEYCOMB_STUN_DURATION_FRAMES,
    CLOWN_CONFETTI_BLAST_RADIUS, // NEW: For Clown's AoE
    CLOWN_CONFETTI_BLAST_DAMAGE, // NEW: For Clown's AoE
    WIZARD_FIREBALL_RADIUS, // NEW: For Wizard's Fireball AoE
    WIZARD_FIREBALL_DAMAGE, // NEW: For Wizard's Fireball AoE
    GALLONER_QUICKDRAW_DAMAGE, // NEW: For Galloner's Quickdraw damage
    STATICSHOCK_RADIUS, // NEW: For Hair Kid's Static Shock radius
    STATICSHOCK_DAMAGE, // NEW: For Hair Kid's Static Shock damage
    BAGUETTE_BASH_DAMAGE, // NEW: For Frenchie's Baguette Bash damage
    SHURIKEN_DAMAGE, // NEW: For Ninja's Shuriken damage
    CHARGE_SPEED_BOOST, // NEW: For Tank's Charge speed boost
    CHARGE_DURATION_FRAMES, // NEW: For Tank's Charge duration
    CHARGE_IMPACT_DAMAGE, // NEW: For Tank's Charge impact damage
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

    // AI Target Prioritization is handled in Character.js before calling this,
    // so `nearestOpponent` here should be the one determined by the AI.
    let nearestOpponent = null;
    let minDistance = Infinity;

    allCharacters.forEach(otherChar => {
        if (otherChar !== character && otherChar.isAlive && !otherChar.isPhasing && !otherChar.isDummy) {
            const dist = checkDistance(character, otherChar);
            if (dist < minDistance) {
                minDistance = dist;
                nearestOpponent = otherChar;
            }
        }
    });


    switch (character.moveType) {
        case 'confetti': // NEW: AoE Attack
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
                if (target !== character && target.isAlive && !target.isPhasing && !target.isDummy && checkDistance(character, target) < CLOWN_CONFETTI_BLAST_RADIUS * CHARACTER_SCALE_FACTOR) {
                    const damage = CLOWN_CONFETTI_BLAST_DAMAGE;
                    target.takeDamage(damage, character.attack, character.name, allCharacters);
                    character.damageDealt += damage;
                    target.applyDebuff('movement_slow', 0.7, 90, 'speed'); // Apply a temporary slow
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
                if (target !== character && target.isAlive && !target.isPhasing && !target.isDummy) {
                    const dist = checkDistance(character, target);
                    if (dist < reach + target.width / 2) {
                        const damage = BAGUETTE_BASH_DAMAGE;
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
                    angle: angleToOpponent,
                    target: nearestOpponent // Store target to check collision directly
                };
                displayMessage(`${character.name} fired a Quick Draw shot!`);
            } else {
                character.moveActive = false;
                character.moveEffect = null;
            }
            break;
        case 'staticshock': // NEW: AoE Attack
            character.moveEffect = { radius: 10 * CHARACTER_SCALE_FACTOR };
            allCharacters.forEach(target => {
                if (target !== character && target.isAlive && !target.isPhasing && !target.isDummy && checkDistance(character, target) < STATICSHOCK_RADIUS * CHARACTER_SCALE_FACTOR) {
                    const damage = STATICSHOCK_DAMAGE;
                    target.takeDamage(damage, character.attack, character.name, allCharacters);
                    character.damageDealt += damage;
                    target.applyDebuff('shock_stun', 0, 30, 'speed'); // Briefly stun
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
                    if (otherChar !== character && otherChar.isAlive && !otherChar.isPhasing && !otherChar.isDummy) {
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
                    life: 60,
                    target: nearestOpponent // Store target to check collision directly
                };
                displayMessage(`${character.name} threw a Shuriken!`);
                // Immediate hit if very close, but main logic now in updateMoveEffect for projectile
                if (checkDistance(character, nearestOpponent) < character.width * 1.5 && !nearestOpponent.isBlockingShuriken && !nearestOpponent.isPhasing && !nearestOpponent.isDummy) {
                    const damage = SHURIKEN_DAMAGE;
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
        case 'fireball': // NEW: AoE Attack
            if (nearestOpponent) {
                // Fireball projectile that explodes on impact or at max range
                const projectileSpeed = 10 * CHARACTER_SCALE_FACTOR;
                const angleToOpponent = Math.atan2(nearestOpponent.y + nearestOpponent.height / 2 - (character.y + character.height / 2),
                                                   nearestOpponent.x + nearestOpponent.width / 2 - (character.x + character.width / 2));
                character.moveEffect = {
                    type: 'fireball_projectile',
                    x: character.x + character.width / 2,
                    y: character.y + character.height / 2,
                    vx: Math.cos(angleToOpponent) * projectileSpeed,
                    vy: Math.sin(angleToOpponent) * projectileSpeed,
                    life: 90, // Lifespan of projectile before explosion
                    target: nearestOpponent, // Store target to check collision
                    hasExploded: false
                };
                displayMessage(`${character.name} cast Fireball!`);
            } else {
                character.moveActive = false;
                character.moveEffect = null;
            }
            break;
        case 'charge':
            character.moveEffect = {
                duration: CHARGE_DURATION_FRAMES,
                originalSpeed: character.speed,
                targetsHit: new Set() // To prevent hitting the same target multiple times
            };
            character.speed *= CHARGE_SPEED_BOOST;
            const newSpeedMagnitude = ORIGINAL_SPEED_MAGNITUDE * character.speed * CHARACTER_SCALE_FACTOR;
            const currentAngle = Math.atan2(character.dy, character.dx);
            character.dx = Math.cos(currentAngle) * newSpeedMagnitude;
            character.dy = Math.sin(currentAngle) * newSpeedMagnitude;
            displayMessage(`${character.name} initiated a Charge!`);
            break;
        case 'boo':
            character.moveEffect = {
                type: 'boo_effect',
                radius: character.width * 2.0,
                duration: 30,
                appliedDamage: false,
                targetsAffected: new Set() // To prevent re-applying effect to same target
            };
            displayMessage(`${character.name} lets out a spectral cry!`);
            break;
        case 'swarm':
            character.moveEffect = {
                type: 'swarm',
                bees: [],
                duration: SWARM_DURATION_FRAMES,
                target: nearestOpponent
            };

            const spawnRadius = character.width * 0.7;
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
        case 'feeding_frenzy':
            character.moveEffect = {
                type: 'feeding_frenzy',
                duration: FEEDING_FRENZY_DURATION_FRAMES,
                originalAttack: character.attack,
                originalAttackSpeed: character.speed
            };
            character.speed *= FEEDING_FRENZY_ATTACK_SPEED_BOOST;
            const currentAngleFrenzy = Math.atan2(character.dy, character.dx);
            const newSpeedMagnitudeFrenzy = ORIGINAL_SPEED_MAGNITUDE * character.speed * CHARACTER_SCALE_FACTOR;
            character.dx = Math.cos(currentAngleFrenzy) * newSpeedMagnitudeFrenzy;
            character.dy = Math.sin(currentAngleFrenzy) * newSpeedMagnitudeFrenzy;

            displayMessage(`${character.name} entered a Feeding Frenzy!`);
            break;
        case 'volatile_concoction':
            if (nearestOpponent) {
                const projectileSpeed = VOLATILE_CONCOCTION_PROJECTILE_SPEED * CHARACTER_SCALE_FACTOR;
                const angleToOpponent = Math.atan2(nearestOpponent.y + nearestOpponent.height / 2 - (character.y + character.height / 2),
                                                   nearestOpponent.x + nearestOpponent.width / 2 - (character.x + character.width / 2));

                const effectChoices = ['damage', 'heal', 'stun'];
                const chosenEffect = effectChoices[Math.floor(Math.random() * effectChoices.length)];
                let projectileColor = 'gray';
                if (chosenEffect === 'damage') projectileColor = 'red';
                else if (chosenEffect === 'heal') projectileColor = 'green';
                else if (chosenEffect === 'stun') projectileColor = 'purple';

                character.moveEffect = {
                    type: 'volatile_projectile',
                    x: character.x + character.width / 2,
                    y: character.y + character.height / 2,
                    vx: Math.cos(angleToOpponent) * projectileSpeed,
                    vy: Math.sin(angleToOpponent) * projectileSpeed,
                    radius: 15 * CHARACTER_SCALE_FACTOR,
                    life: 120,
                    effectType: chosenEffect,
                    color: projectileColor,
                    hasExploded: false,
                    target: nearestOpponent // Store target for direct collision check
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

                const target = character.moveEffect.target; // Get stored target
                if (target && target.isAlive && !target.isPhasing && !target.isDummy) {
                    const distToTarget = checkDistance({x: character.moveEffect.x, y: character.moveEffect.y, width: 0, height: 0}, target);
                    if (distToTarget < target.width / 2 + 5 * CHARACTER_SCALE_FACTOR) { // Collision with target
                         if (Math.random() < QUICKDRAW_HIT_CHANCE) {
                            const damage = GALLONER_QUICKDRAW_DAMAGE;
                            target.takeDamage(damage, character.attack, character.name, allCharacters);
                            character.damageDealt += damage;
                            displayMessage(`${character.name}'s Quick Draw hit ${target.name} for ${damage} damage!`);
                        } else {
                            displayMessage(`${character.name}'s Quick Draw missed ${target.name}.`);
                        }
                        character.moveActive = false;
                        character.moveEffect = null;
                        return; // Exit after impact
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
            if (character.moveEffect.radius > STATICSHOCK_RADIUS * CHARACTER_SCALE_FACTOR) {
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

            const shurikenTarget = character.moveEffect.target;
            if (shurikenTarget && shurikenTarget.isAlive && !shurikenTarget.isPhasing && !shurikenTarget.isDummy) {
                 const distToTarget = checkDistance({x: character.moveEffect.x, y: character.moveEffect.y, width: 0, height: 0}, shurikenTarget);
                 if (distToTarget < shurikenTarget.width / 2 + 5 * CHARACTER_SCALE_FACTOR) { // Collision with target
                    // Check for Magic Shield interception
                    if (shurikenTarget.isBlockingShuriken) {
                        displayMessage(`${shurikenTarget.name}'s Magic Shield intercepted ${character.name}'s Shuriken!`);
                        character.moveActive = false;
                        character.moveEffect = null;
                        return;
                    }
                    const damage = SHURIKEN_DAMAGE;
                    shurikenTarget.takeDamage(damage, character.attack, character.name, allCharacters);
                    character.damageDealt += damage;
                    character.moveActive = false;
                    character.moveEffect = null;
                    return; // Exit after impact
                 }
            }

            if (character.moveEffect.life <= 0) {
                character.moveActive = false;
                character.moveEffect = null;
            }
            break;
        case 'fireball':
            if (character.moveEffect.type === 'fireball_projectile') {
                character.moveEffect.x += character.moveEffect.vx;
                character.moveEffect.y += character.moveEffect.vy;
                character.moveEffect.life--;

                let shouldExplode = false;
                const fireballTarget = character.moveEffect.target;
                if (fireballTarget && fireballTarget.isAlive && !fireballTarget.isPhasing && !fireballTarget.isDummy) {
                    const distToTarget = checkDistance({x: character.moveEffect.x, y: character.moveEffect.y, width: 0, height: 0}, fireballTarget);
                    if (distToTarget < fireballTarget.width / 2 + 5 * CHARACTER_SCALE_FACTOR) {
                        shouldExplode = true;
                    }
                }

                if (shouldExplode || character.moveEffect.life <= 0 ||
                    character.moveEffect.x < 0 || character.moveEffect.x > canvas.width ||
                    character.moveEffect.y < 0 || character.moveEffect.y > canvas.height) {

                    character.moveEffect = {
                        type: 'fireball_explosion',
                        x: character.moveEffect.x,
                        y: character.moveEffect.y,
                        radius: 10 * CHARACTER_SCALE_FACTOR,
                        maxRadius: WIZARD_FIREBALL_RADIUS * CHARACTER_SCALE_FACTOR,
                        alpha: 1,
                        duration: 30, // Explosion visual duration
                        targetsHit: new Set() // Prevent hitting same target multiple times
                    };
                }
            } else if (character.moveEffect.type === 'fireball_explosion') {
                character.moveEffect.radius += (character.moveEffect.maxRadius - character.moveEffect.radius) * 0.2;
                character.moveEffect.alpha -= 1 / character.moveEffect.duration; // Fade out

                if (character.moveEffect.duration > 0) {
                    allCharacters.forEach(target => {
                        if (target !== character && target.isAlive && !target.isPhasing && !target.isDummy && !character.moveEffect.targetsHit.has(target.name)) {
                            const dist = checkDistance(
                                {x: character.moveEffect.x, y: character.moveEffect.y, width: character.moveEffect.radius * 2, height: character.moveEffect.radius * 2},
                                target
                            );
                            if (dist < target.width / 2 + character.moveEffect.radius) {
                                const damage = WIZARD_FIREBALL_DAMAGE;
                                target.takeDamage(damage, character.attack, character.name, allCharacters);
                                character.damageDealt += damage;
                                displayMessage(`${target.name} burned by Fireball!`);
                                character.moveEffect.targetsHit.add(target.name);
                            }
                        }
                    });
                }

                character.moveEffect.duration--;
                if (character.moveEffect.duration <= 0 || character.moveEffect.alpha <= 0) {
                    character.moveActive = false;
                    character.moveEffect = null;
                }
            }
            break;
        case 'charge': // NEW: Impact damage on collision
            character.moveEffect.duration--;

            if (character.moveEffect.duration > 0) {
                allCharacters.forEach(target => {
                    if (target !== character && target.isAlive && !target.isPhasing && !target.isDummy && !character.moveEffect.targetsHit.has(target.name)) {
                        const dist = checkDistance(character, target);
                        if (dist < character.width / 2 + target.width / 2) { // Direct collision during charge
                            const damage = CHARGE_IMPACT_DAMAGE;
                            target.takeDamage(damage, character.attack, character.name, allCharacters);
                            character.damageDealt += damage;
                            target.applyDebuff('charge_knockback', 0.5, 30, 'speed'); // Knockback effect
                            target.dx = (target.x - character.x) > 0 ? 5 : -5; // Simple knockback direction
                            target.dy = (target.y - character.y) > 0 ? 5 : -5; // Simple knockback direction
                            character.moveEffect.targetsHit.add(target.name); // Mark target as hit
                        }
                    }
                });
            }

            if (character.moveEffect.duration <= 0) {
                character.moveActive = false;
                character.moveEffect = null;
                character.speed = character.originalSpeed; // Reset speed after charge
                const newSpeedMagnitude = ORIGINAL_SPEED_MAGNITUDE * character.speed * CHARACTER_SCALE_FACTOR;
                const currentAngle = Math.atan2(character.dy, character.dx);
                character.dx = Math.cos(currentAngle) * newSpeedMagnitude;
                character.dy = Math.sin(currentAngle) * newSpeedMagnitude;
                displayMessage(`${character.name}'s Charge ended.`);
            }
            break;
        case 'boo':
            // The 'boo' effect logic seemed duplicated. I'm assuming it should just decrement duration here.
            // If there's more specific Boo logic for continuous effects, it should be added.
            if (character.moveEffect && character.moveEffect.type === 'boo_effect') {
                character.moveEffect.duration--;

                if (character.moveEffect.duration > 0) {
                    allCharacters.forEach(target => {
                        if (target !== character && target.isAlive && !target.isPhasing && !target.isDummy && !character.moveEffect.targetsAffected.has(target.name)) {
                            const dist = checkDistance(character, target);
                            if (dist < character.moveEffect.radius) {
                                const damage = GHOST_BOO_DAMAGE;
                                target.takeDamage(damage, character.attack, character.name, allCharacters);
                                character.damageDealt += damage;
                                target.applyDebuff('fear_slow', 0.6, 60, 'speed'); // Apply a temporary slow
                                displayMessage(`${target.name} is feared by ${character.name}'s Boo!`);
                                character.moveEffect.targetsAffected.add(target.name);
                            }
                        }
                    });
                }

                if (character.moveEffect.duration <= 0) {
                    character.moveActive = false;
                    character.moveEffect = null;
                }
            } else {
                 // Fallback if boo effect is not correctly initialized
                 character.moveActive = false;
                 character.moveEffect = null;
            }
            break;
        case 'swarm':
            if (character.moveEffect && character.moveEffect.type === 'swarm') {
                character.moveEffect.duration--;

                const target = character.moveEffect.target;
                if (target && target.isAlive) {
                    const trackingStrength = 0.05;
                    const separationStrength = 0.1;
                    const randomWanderStrength = 0.02;

                    character.moveEffect.bees.forEach(bee => {
                        if (bee.clingingTo) {
                            bee.x = bee.clingingTo.x + bee.offsetX;
                            bee.y = bee.clingingTo.y + bee.offsetY;

                            if (character.moveEffect.duration % 15 === 0 && !bee.damageApplied) {
                                if (bee.clingingTo.isAlive) {
                                    const damage = SWARM_BEE_DAMAGE_PER_TICK;
                                    bee.clingingTo.takeDamage(damage, character.attack, character.name, allCharacters);
                                    character.damageDealt += damage;
                                    bee.damageApplied = true;
                                }
                            }
                            return;
                        }

                        let totalForceX = 0;
                        let totalForceY = 0;

                        const angleToTarget = Math.atan2(target.y - bee.y, target.x - bee.x);
                        totalForceX += Math.cos(angleToTarget) * trackingStrength;
                        totalForceY += Math.sin(angleToTarget) * trackingStrength;

                        character.moveEffect.bees.forEach(otherBee => {
                            if (bee !== otherBee && !otherBee.clingingTo) {
                                const dist = checkDistance(
                                    {x: bee.x, y: bee.y, width: bee.size, height: bee.size},
                                    {x: otherBee.x, y: otherBee.y, width: otherBee.size, height: otherBee.size}
                                );
                                if (dist < bee.size * 3) {
                                    const angleAway = Math.atan2(bee.y - otherBee.y, bee.x - otherBee.x);
                                    totalForceX += (Math.cos(angleAway) / dist) * separationStrength;
                                    totalForceY += (Math.sin(angleAway) / dist) * separationStrength;
                                }
                            }
                        });

                        totalForceX += (Math.random() - 0.5) * randomWanderStrength;
                        totalForceY += (Math.random() - 0.5) * randomWanderStrength;


                        bee.vx += totalForceX;
                        bee.vy += totalForceY;

                        const currentBeeSpeed = Math.sqrt(bee.vx * bee.vx + bee.vy * bee.vy);
                        const maxBeeSpeed = 7 * CHARACTER_SCALE_FACTOR;
                        if (currentBeeSpeed > maxBeeSpeed) {
                            bee.vx = (bee.vx / currentBeeSpeed) * maxBeeSpeed;
                            bee.vy = (bee.vy / currentBeeSpeed) * maxBeeSpeed;
                        } else if (currentBeeSpeed < 1 * CHARACTER_SCALE_FACTOR && currentBeeSpeed > 0) {
                             bee.vx = (bee.vx / currentBeeSpeed) * (1 * CHARACTER_SCALE_FACTOR);
                             bee.vy = (bee.vy / currentBeeSpeed) * (1 * CHARACTER_SCALE_FACTOR);
                        }

                        bee.x += bee.vx;
                        bee.y += bee.vy;

                        if (!bee.damageApplied && !bee.clingingTo && checkDistance({x: bee.x, y: bee.y, width: bee.size, height: bee.size}, target) < target.width / 2) {
                            const damage = SWARM_BEE_DAMAGE_PER_TICK;
                            target.takeDamage(damage, character.attack, character.name, allCharacters);
                            character.damageDealt += damage;
                            bee.damageApplied = true;

                            bee.clingingTo = target;
                            bee.offsetX = (bee.x - target.x) + (Math.random() - 0.5) * target.width * 0.3;
                            bee.offsetY = (bee.y - target.y) + (Math.random() - 0.5) * target.height * 0.3;
                            bee.vx = 0;
                            bee.vy = 0;
                            displayMessage(`A mini bee clung to ${target.name}!`);
                        }
                    });
                }

                if (character.moveEffect.duration % 15 === 0) {
                    character.moveEffect.bees.forEach(bee => bee.damageApplied = false);
                } else if (character.moveEffect.duration % 5 === 0) {
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
        case 'feeding_frenzy':
            if (character.moveEffect && character.moveEffect.type === 'feeding_frenzy') {
                character.moveEffect.duration--;

                if (character.moveEffect.duration <= 0) {
                    character.moveActive = false;
                    character.moveEffect = null;
                    character.speed = character.originalSpeed;
                    const currentAngleReset = Math.atan2(character.dy, character.dx);
                    const newSpeedMagnitudeReset = ORIGINAL_SPEED_MAGNITUDE * character.speed * CHARACTER_SCALE_FACTOR;
                    character.dx = Math.cos(currentAngleReset) * newSpeedMagnitudeReset;
                    character.dy = Math.sin(currentAngleReset) * newSpeedMagnitudeReset;
                    displayMessage(`${character.name}'s Feeding Frenzy ended.`);
                }
            }
            break;
        case 'volatile_concoction':
            if (character.moveEffect.type === 'volatile_projectile') {
                character.moveEffect.x += character.moveEffect.vx;
                character.moveEffect.y += character.moveEffect.vy;
                character.moveEffect.life--;

                // --- DEBUGGING LOGS ---
                // console.log(`Projectile Pos: (${character.moveEffect.x.toFixed(0)}, ${character.moveEffect.y.toFixed(0)})`);
                // console.log(`Projectile Vel: (${character.moveEffect.vx.toFixed(2)}, ${character.moveEffect.vy.toFixed(2)})`);

                let shouldExplode = false;
                const potionTarget = character.moveEffect.target;
                if (potionTarget && potionTarget.isAlive && !potionTarget.isPhasing && !potionTarget.isDummy) {
                    const distToTarget = checkDistance({x: character.moveEffect.x, y: character.moveEffect.y, width: character.moveEffect.radius * 2, height: character.moveEffect.radius * 2}, potionTarget);
                    if (distToTarget < potionTarget.width / 2 + character.moveEffect.radius) {
                        shouldExplode = true;
                        // console.warn(`!!! VOLATILE CONCOCTION IMPACT DETECTED on ${potionTarget.name} !!!`); // This should fire on impact
                    }
                }


                // FIX: If shouldExplode is true, we force the explosion and ignore out-of-bounds.
                // Otherwise, we check for out-of-bounds or life expiring.
                let isOutOfBounds = character.moveEffect.x < -character.moveEffect.radius || character.moveEffect.x > canvas.width + character.moveEffect.radius ||
                                    character.moveEffect.y < -character.moveEffect.radius || character.moveEffect.y > canvas.height + character.moveEffect.radius;

                if (shouldExplode || character.moveEffect.life <= 0 || isOutOfBounds) {
                    // console.log(`Exploding: Life <= 0 (${character.moveEffect.life <= 0}) || Should Explode (${shouldExplode}) || Out of Bounds (${isOutOfBounds})`);

                    // Prioritize actual collision. If shouldExplode is true, the explosion location is confirmed at the projectile's current spot.
                    // If not shouldExplode, but it's out of bounds, we might want to clamp the position to the edge for the explosion.
                    // However, the original code already assigns projectile.x/y, so it will still be the potentially OOB point.
                    // For the Alchemist, the main thing is that if it hits, it explodes there.

                    character.moveEffect = {
                        type: 'volatile_explosion',
                        x: character.moveEffect.x, // Use projectile's x
                        y: character.moveEffect.y, // Use projectile's y
                        radius: 10 * CHARACTER_SCALE_FACTOR,
                        maxRadius: VOLATILE_CONCOCTION_EXPLOSION_RADIUS * CHARACTER_SCALE_FACTOR,
                        duration: 30,
                        alpha: 1,
                        effectType: character.moveEffect.effectType,
                        color: character.moveEffect.color,
                        targetsHit: []
                    };
                    // console.log(`Explosion created at: (${character.moveEffect.x.toFixed(0)}, ${character.moveEffect.y.toFixed(0)})`);
                }
            } else if (character.moveEffect.type === 'volatile_explosion') {
                character.moveEffect.radius += (character.moveEffect.maxRadius - character.moveEffect.radius) * 0.2;
                character.moveEffect.alpha -= 1 / character.moveEffect.duration;

                if (character.moveEffect.duration > 0) {
                    allCharacters.forEach(target => {
                        if (target !== character && target.isAlive && !target.isPhasing && !target.isDummy && !character.moveEffect.targetsHit.includes(target.name)) {
                            const dist = checkDistance(
                                {x: character.moveEffect.x, y: character.moveEffect.y, width: character.moveEffect.radius * 2, height: character.moveEffect.radius * 2},
                                target
                            );
                            if (dist < target.width / 2 + character.moveEffect.radius) {
                                // console.log(`Applying ${character.moveEffect.effectType} to ${target.name} from explosion at (${character.moveEffect.x.toFixed(0)}, ${character.moveEffect.y.toFixed(0)})`); // New log
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
                                            target.secondaryAbilityActive = true;
                                            target.secondaryAbilityEffect = {
                                                type: 'volatile_concoction_stun',
                                                duration: VOLATILE_CONCOCTION_STUN_DURATION_FRAMES
                                            };
                                            target.lastSecondaryAbilityTime = Date.now();
                                            displayMessage(`${target.name} was stunned by Volatile Concoction!`);
                                        }
                                        break;
                                }
                                character.moveEffect.targetsHit.push(target.name);
                            }
                        }
                    });
                }

                if (character.moveEffect.duration <= 0 || character.moveEffect.alpha <= 0) {
                    character.moveActive = false;
                    character.moveEffect = null;
                    // console.log("Explosion finished."); // New log
                }
            }
            break;
    }
}