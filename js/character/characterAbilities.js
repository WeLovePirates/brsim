// js/character/characterAbilities.js

import {
    ORIGINAL_SPEED_MAGNITUDE,
    SECONDARY_ABILITY_DURATION_FRAMES,
    INVISIBILITY_DAMAGE_REDUCTION,
    INVISIBILITY_DODGE_BOOST,
    HONEYCOMB_STUN_DURATION_FRAMES,
    HONEYCOMB_PROJECTILE_SPEED,
    FIN_SLICE_BLEED_DURATION_FRAMES,
    FIN_SLICE_BLEED_DAMAGE_PER_TICK,
    ELIXIR_DEFENSE_BOOST_PERCENTAGE,
    ELIXIR_HEAL_PER_TICK,
    ELIXIR_HEAL_TICK_INTERVAL_MS,
    MEGALODON_FIN_SLICE_BLEED_DAMAGE_MULTIPLIER,
    IS_BOSS_MODE // Keep IS_BOSS_MODE import
} from '../config.js';
import { displayMessage } from '../utils/displayUtils.js';
import { checkDistance } from '../utils/mathUtils.js';

/**
 * Handles the activation of a character's secondary ability.
 * @param {Character} character - The character performing the ability.
 * @param {Array<Character>} allCharacters - All characters in the game.
 * @param {number} CHARACTER_SCALE_FACTOR - The current scaling factor for characters.
 * @param {HTMLCanvasElement} canvas - The game canvas.
 */
export function handleSecondaryAbility(character, allCharacters, CHARACTER_SCALE_FACTOR, canvas) {
    if (character.secondaryAbilityActive) {
        return;
    }

    // Determine the target for abilities/moves. This logic is crucial for boss mode.
    let targetForAbilityAim = null;
    let minDistanceForAbilityAim = Infinity;

    if (IS_BOSS_MODE.ENABLED) {
        if (character.isBoss) { // Boss targets players
            allCharacters.forEach(otherChar => {
                if (otherChar !== character && !otherChar.isBoss && otherChar.isAlive) {
                    const dist = checkDistance(character, otherChar);
                    if (dist < minDistanceForAbilityAim) {
                        minDistanceForAbilityAim = dist;
                        targetForAbilityAim = otherChar;
                    }
                }
            });
        } else { // Player targets boss
            allCharacters.forEach(otherChar => {
                if (otherChar.isBoss && otherChar.isAlive) {
                    const dist = checkDistance(character, otherChar);
                    if (dist < minDistanceForAbilityAim) {
                        minDistanceForAbilityAim = dist;
                        targetForAbilityAim = otherChar;
                    }
                }
            });
        }
    } else { // Simulator Mode - target any other character
        allCharacters.forEach(otherChar => {
            if (otherChar !== character && otherChar.isAlive) {
                const dist = checkDistance(character, otherChar);
                if (dist < minDistanceForAbilityAim) {
                    minDistanceForAbilityAim = dist;
                    targetForAbilityAim = otherChar;
                }
            }
        });
    }

    // If there's no valid target, don't use the ability
    if (IS_BOSS_MODE.ENABLED && !targetForAbilityAim && character.secondaryAbilityType !== 'elixir_of_fortitude') { // Elixir is self-buff
        return;
    }

    // The cooldown check is done in Character.js before calling this function.
    character.lastSecondaryAbilityTime = Date.now();
    character.secondaryAbilityActive = true;

    switch (character.secondaryAbilityType) {
        case 'honeycomb':
            character.secondaryAbilityEffect = {
                type: 'honeycomb_projectile',
                x: character.x + character.width / 2,
                y: character.y + character.height / 2,
                radius: 10 * CHARACTER_SCALE_FACTOR, // Projectile size
                speed: HONEYCOMB_PROJECTILE_SPEED * CHARACTER_SCALE_FACTOR, // Projectile speed
                duration: 300, // Projectile lifespan in frames (adjust as needed)
                dx: 0,
                dy: 0,
                angle: 0 // Initial angle, will be set to target if found
            };

            if (targetForAbilityAim) {
                const angleToTarget = Math.atan2(targetForAbilityAim.y + targetForAbilityAim.height / 2 - character.secondaryAbilityEffect.y,
                                                 targetForAbilityAim.x + targetForAbilityAim.width / 2 - character.secondaryAbilityEffect.x);
                character.secondaryAbilityEffect.angle = angleToTarget;
                character.secondaryAbilityEffect.dx = Math.cos(character.secondaryAbilityEffect.angle) * character.secondaryAbilityEffect.speed;
                character.secondaryAbilityEffect.dy = Math.sin(character.secondaryAbilityEffect.angle) * character.secondaryAbilityEffect.speed;
                displayMessage(`${character.name} launched a Honeycomb!`);
            } else {
                character.secondaryAbilityEffect.angle = Math.random() * Math.PI * 2;
                character.secondaryAbilityEffect.dx = Math.cos(character.secondaryAbilityEffect.angle) * character.secondaryAbilityEffect.speed;
                character.secondaryAbilityEffect.dy = Math.sin(character.secondaryAbilityEffect.angle) * character.secondaryAbilityEffect.speed;
                displayMessage(`${character.name} launched a Honeycomb! (No specific target found)`);
            }
            break;
        case 'fin_slice':
            const angleToOpponent = targetForAbilityAim ? Math.atan2(targetForAbilityAim.y - character.y, targetForAbilityAim.x - character.x) : Math.random() * Math.PI * 2;
            character.secondaryAbilityEffect = {
                type: 'fin_slice',
                duration: 15,
                angle: angleToOpponent,
                targetsHit: []
            };
            displayMessage(`${character.name} used Fin Slice!`);
            break;
        case 'elixir_of_fortitude':
            character.secondaryAbilityEffect = {
                type: 'elixir_of_fortitude',
                duration: SECONDARY_ABILITY_DURATION_FRAMES
            };
            character.defense *= (1 + ELIXIR_DEFENSE_BOOST_PERCENTAGE);
            character.isHealingOverTime = true;
            character.healAmountPerTick = ELIXIR_HEAL_PER_TICK;
            character.lastHealTickTime = Date.now();
            displayMessage(`${character.name} drank Elixir of Fortitude!`);
            break;
        case 'slippery_floor':
            character.secondaryAbilityEffect = { type: 'slippery_floor', radius: character.width * 2.5, duration: SECONDARY_ABILITY_DURATION_FRAMES };
            displayMessage(`${character.name} used Slippery Floor!`);
            allCharacters.forEach(target => {
                let isValidTarget = false;
                if (IS_BOSS_MODE.ENABLED) {
                    isValidTarget = (character.isBoss !== target.isBoss); // Player debuffs boss, boss debuffs players
                } else {
                    isValidTarget = (target !== character); // Debuffs anyone but self
                }

                if (target.isAlive && !target.isPhasing && isValidTarget && checkDistance(character, target) < character.secondaryAbilityEffect.radius) {
                    if (target.originalSpeedForSecondaryAbility === undefined) {
                        target.originalSpeedForSecondaryAbility = target.speed;
                    }
                    target.speed *= 0.5;
                    const newSpeedMagnitude = ORIGINAL_SPEED_MAGNITUDE * target.speed * CHARACTER_SCALE_FACTOR;
                    const currentAngle = Math.atan2(target.dy, target.dx);
                    target.dx = Math.cos(currentAngle) * newSpeedMagnitude;
                    target.dy = Math.sin(currentAngle) * newSpeedMagnitude;
                    setTimeout(() => {
                        if (target.originalSpeedForSecondaryAbility !== undefined) {
                            target.speed = target.originalSpeedForSecondaryAbility;
                            delete target.originalSpeedForSecondaryAbility;
                            const revertedSpeedMagnitude = ORIGINAL_SPEED_MAGNITUDE * target.speed * CHARACTER_SCALE_FACTOR;
                            const revertedAngle = Math.atan2(target.dy, target.dx);
                            target.dx = Math.cos(revertedAngle) * revertedSpeedMagnitude;
                            target.dy = Math.sin(revertedAngle) * revertedSpeedMagnitude;
                        }
                    }, SECONDARY_ABILITY_DURATION_FRAMES * (1000/60));
                }
            });
            break;
        case 'iron_skin':
            character.secondaryAbilityEffect = { type: 'iron_skin', duration: SECONDARY_ABILITY_DURATION_FRAMES };
            character.defense *= 1.5;
            displayMessage(`${character.name} used Iron Skin!`);
            break;
        case 'spur_of_moment':
            character.secondaryAbilityEffect = { type: 'spur_of_moment', duration: SECONDARY_ABILITY_DURATION_FRAMES };
            character.speed *= 1.8;
            const currentAngleGalloner = Math.atan2(character.dy, character.dx);
            const newSpeedMagnitudeGalloner = ORIGINAL_SPEED_MAGNITUDE * character.speed * CHARACTER_SCALE_FACTOR;
            character.dx = Math.cos(currentAngleGalloner) * newSpeedMagnitudeGalloner;
            character.dy = Math.sin(currentAngleGalloner) * newSpeedMagnitudeGalloner;
            displayMessage(`${character.name} used Spur of the Moment!`);
            break;
        case 'static_field':
            character.secondaryAbilityEffect = { type: 'static_field', radius: character.width * 1.5, duration: SECONDARY_ABILITY_DURATION_FRAMES, tickDamage: 0.5 };
            displayMessage(`${character.name} created a Static Field!`);
            break;
        case 'adrenaline_shot':
            character.secondaryAbilityEffect = { type: 'adrenaline_shot', duration: SECONDARY_ABILITY_DURATION_FRAMES };
            character.speed *= 2.0;
            const currentAngleMedic = Math.atan2(character.dy, character.dx);
            const newSpeedMagnitudeMedic = ORIGINAL_SPEED_MAGNITUDE * character.speed * CHARACTER_SCALE_FACTOR;
            character.dx = Math.cos(currentAngleMedic) * newSpeedMagnitudeMedic;
            character.dy = Math.sin(currentAngleMedic) * newSpeedMagnitudeMedic;
            displayMessage(`${character.name} used Adrenaline Shot!`);
            break;
        case 'smoke_bomb':
            character.secondaryAbilityEffect = { type: 'smoke_bomb', radius: character.width * 2, duration: SECONDARY_ABILITY_DURATION_FRAMES };
            displayMessage(`${character.name} deployed a Smoke Bomb!`);
            character.dodgeChanceBoost = 0.5;
            break;
        case 'magic_shield':
            character.secondaryAbilityEffect = { type: 'magic_shield', duration: SECONDARY_ABILITY_DURATION_FRAMES };
            character.isBlockingShuriken = true;
            displayMessage(`${character.name} cast Magic Shield!`);
            break;
        case 'fortify':
            character.secondaryAbilityEffect = { type: 'fortify', duration: SECONDARY_ABILITY_DURATION_FRAMES };
            character.defense *= 2.0;
            displayMessage(`${character.name} fortified themselves!`);
            break;
        case 'phase':
            character.secondaryAbilityEffect = { type: 'phase', duration: SECONDARY_ABILITY_DURATION_FRAMES };
            character.isPhasing = true;
            character.speed *= 1.5;
            const currentAnglePhase = Math.atan2(character.dy, character.dx);
            const newSpeedMagnitudePhase = ORIGINAL_SPEED_MAGNITUDE * character.speed * CHARACTER_SCALE_FACTOR;
            character.dx = Math.cos(currentAnglePhase) * newSpeedMagnitudePhase;
            character.dy = Math.sin(currentAnglePhase) * newSpeedMagnitudePhase;
            displayMessage(`${character.name} is phasing!`);
            break;
        case 'invisibility':
            character.secondaryAbilityEffect = { type: 'invisibility', duration: SECONDARY_ABILITY_DURATION_FRAMES };
            character.isInvisible = true;
            displayMessage(`${character.name} turned invisible!`);
            break;
    }
}

/**
 * Updates the state of an active secondary ability effect and resets it if expired.
 * @param {Character} character - The character whose ability effect is being updated.
 * @param {Array<Character>} allCharacters - All characters in the game.
 * @param {number} CHARACTER_SCALE_FACTOR - The current scaling factor for characters.
 * @param {HTMLCanvasElement} canvas - The game canvas.
 */
export function updateAbilityEffect(character, allCharacters, CHARACTER_SCALE_FACTOR, canvas) {
    if (!character.secondaryAbilityActive || !character.secondaryAbilityEffect) return;

    if (character.secondaryAbilityEffect.type === 'honeycomb_projectile') {
        updateHoneyCombProjectile(character, allCharacters, CHARACTER_SCALE_FACTOR, canvas);
        return;
    }

    if (character.secondaryAbilityEffect.type === 'fin_slice') {
        if (character.secondaryAbilityEffect.duration > 0) {
            allCharacters.forEach(target => {
                let isValidTarget = false;
                if (IS_BOSS_MODE.ENABLED) {
                    isValidTarget = (character.isBoss !== target.isBoss);
                } else {
                    isValidTarget = (target !== character);
                }

                if (target.isAlive && isValidTarget && !target.isPhasing && !character.secondaryAbilityEffect.targetsHit.includes(target.name)) {
                    const dist = checkDistance({x: character.x, y: character.y, width: character.width, height: character.height}, target);
                    const hitRange = character.width * 0.7;

                    if (dist < hitRange) {
                        const damage = 20 + character.attack * 0.8;
                        target.takeDamage(damage, character.attack, character.name, allCharacters);
                        character.damageDealt += damage;

                        let bleedDamage = FIN_SLICE_BLEED_DAMAGE_PER_TICK + character.attack * 0.1;
                        if (character.name === 'Megalodon') {
                            bleedDamage *= MEGALODON_FIN_SLICE_BLEED_DAMAGE_MULTIPLIER;
                        }

                        target.isBleeding = true;
                        target.bleedDamagePerTick = bleedDamage;
                        target.lastBleedTickTime = Date.now();
                        target.bleedTarget = character.name;
                        setTimeout(() => {
                            if (target.isBleeding && target.bleedTarget === character.name) {
                                target.isBleeding = false;
                                target.bleedDamagePerTick = 0;
                                target.bleedTarget = null;
                                displayMessage(`${target.name} stopped bleeding.`);
                            }
                        }, FIN_SLICE_BLEED_DURATION_FRAMES * (1000/60));

                        displayMessage(`${character.name}'s Fin Slice hit ${target.name}!`);
                        character.secondaryAbilityEffect.targetsHit.push(target.name);
                    }
                }
            });
        }
    }


    character.secondaryAbilityEffect.duration--;
    if (character.secondaryAbilityEffect.duration <= 0) {
        const abilityType = character.secondaryAbilityEffect.type;

        character.secondaryAbilityActive = false;
        switch (abilityType) {
            case 'magic_shield':
                character.isBlockingShuriken = false;
                break;
            case 'phase':
                character.isPhasing = false;
                break;
            case 'invisibility':
                character.isInvisible = false;
                if (character.ctx) character.ctx.globalAlpha = character.originalAlpha;
                break;
            case 'smoke_bomb':
                character.dodgeChanceBoost = 0;
                break;
            case 'honeycomb_stick':
            case 'volatile_concoction_stun':
                character.isStunned = false;
                if (character.originalSpeedWhenStunned !== null) {
                    character.speed = character.originalSpeedWhenStunned;
                    const newSpeedMagnitude = ORIGINAL_SPEED_MAGNITUDE * character.speed * CHARACTER_SCALE_FACTOR;
                    const currentAngle = Math.atan2(character.dy, character.dx);
                    character.dx = Math.cos(currentAngle) * newSpeedMagnitude;
                    character.dy = Math.sin(currentAngle) * newSpeedMagnitude;
                    character.originalSpeedWhenStunned = null;
                }
                displayMessage(`${character.name} is no longer stuck!`);
                break;
            case 'fin_slice':
                break;
            case 'elixir_of_fortitude':
                character.defense = character.originalDefense;
                character.isHealingOverTime = false;
                character.healAmountPerTick = 0;
                displayMessage(`${character.name}'s Elixir of Fortitude wore off.`);
                break;
        }
        character.secondaryAbilityEffect = null;


        if (abilityType !== 'honeycomb_stick' && abilityType !== 'volatile_concoction_stun' && character.originalSpeed !== undefined) {
             character.speed = character.originalSpeed;
        }
        if (abilityType !== 'honeycomb_stick' && abilityType !== 'volatile_concoction_stun' && character.originalDefense !== undefined) {
            character.defense = character.originalDefense;
        }

        if (abilityType !== 'honeycomb_stick' && abilityType !== 'volatile_concoction_stun' && character.speed !== character.originalSpeed && character.originalSpeed !== undefined) {
            const newSpeedMagnitude = ORIGINAL_SPEED_MAGNITUDE * character.speed * CHARACTER_SCALE_FACTOR;
            const currentAngle = Math.atan2(character.dy, character.dx);
            character.dx = Math.cos(currentAngle) * newSpeedMagnitude;
            character.dy = Math.sin(currentAngle) * newSpeedMagnitude;
        }
    }
}


/**
 * Handles the movement and collision detection for the Honeycomb projectile.
 * This is an internal helper function for characterAbilities.js.
 * @param {Character} queenBee - The Queen Bee who launched the projectile.
 * @param {Array<Character>} allCharacters - All characters in the game.
 * @param {number} CHARACTER_SCALE_FACTOR - The current scaling factor.
 * @param {HTMLCanvasElement} canvas - The game canvas.
 */
function updateHoneyCombProjectile(queenBee, allCharacters, CHARACTER_SCALE_FACTOR, canvas) {
    if (!queenBee.secondaryAbilityActive || !queenBee.secondaryAbilityEffect || queenBee.secondaryAbilityEffect.type !== 'honeycomb_projectile') {
        return;
    }

    const projectile = queenBee.secondaryAbilityEffect;
    projectile.x += projectile.dx;
    projectile.y += projectile.dy;
    projectile.duration--;

    if (projectile.x < -projectile.radius || projectile.x + projectile.radius > canvas.width + projectile.radius ||
        projectile.y < -projectile.radius || projectile.y + projectile.radius > canvas.height + projectile.radius ||
        projectile.duration <= 0) {
        queenBee.secondaryAbilityActive = false;
        queenBee.secondaryAbilityEffect = null;
        return;
    }

    for (const target of allCharacters) {
        let isValidTarget = false;
        if (IS_BOSS_MODE.ENABLED) {
            isValidTarget = (queenBee.isBoss !== target.isBoss); // Queen Bee (player) stuns boss. Boss (if Queen Bee) stuns players.
        } else {
            isValidTarget = (target !== queenBee); // Stuns anyone but self
        }

        if (target.isAlive && !target.isPhasing && !target.isStunned && isValidTarget) {
            const dist = checkDistance({x: projectile.x, y: projectile.y, width: projectile.radius * 2, height: projectile.radius * 2}, target);
            if (dist < target.width / 2 + projectile.radius) {
                target.isStunned = true;
                target.originalSpeedWhenStunned = target.speed;
                target.speed = 0;
                target.dx = 0;
                target.dy = 0;

                target.secondaryAbilityActive = true;
                target.secondaryAbilityEffect = {
                    type: 'honeycomb_stick',
                    duration: HONEYCOMB_STUN_DURATION_FRAMES
                };
                target.lastSecondaryAbilityTime = Date.now();

                queenBee.secondaryAbilityActive = false;
                queenBee.secondaryAbilityEffect = null;

                displayMessage(`${target.name} got stuck by Honeycomb!`);
                return;
            }
        }
    }
}