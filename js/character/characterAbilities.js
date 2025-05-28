// js/character/characterAbilities.js

import {
    ORIGINAL_SPEED_MAGNITUDE,
    SECONDARY_ABILITY_DURATION_FRAMES,
    INVISIBILITY_DAMAGE_REDUCTION,
    INVISIBILITY_DODGE_BOOST,
    HONEYCOMB_STUN_DURATION_FRAMES,
    HONEYCOMB_PROJECTILE_SPEED,
    FIN_SLICE_BLEED_DURATION_FRAMES, // Import new constant
    FIN_SLICE_BLEED_DAMAGE_PER_TICK // Import new constant
} from '../config.js';
import { displayMessage } from '../utils/displayUtils.js';
import { checkDistance } from '../utils/mathUtils.js';

/**
 * Handles the logic for a character's secondary ability.
 * @param {Character} character - The character performing the ability.
 * @param {Array<Character>} allCharacters - All characters in the game.
 * @param {number} CHARACTER_SCALE_FACTOR - The current scaling factor for characters.
 * @param {HTMLCanvasElement} canvas - The game canvas (needed for projectile boundaries).
 */
export function handleSecondaryAbility(character, allCharacters, CHARACTER_SCALE_FACTOR, canvas) {
    // The cooldown check is done in Character.js before calling this function.
    // If the ability is already active, do nothing.
    if (character.secondaryAbilityActive) {
        return;
    }

    // Queen Bee's Honeycomb as a projectile
    if (character.secondaryAbilityType === 'honeycomb') {
        character.lastSecondaryAbilityTime = Date.now();
        character.secondaryAbilityActive = true;
        character.secondaryAbilityEffect = {
            type: 'honeycomb_projectile',
            x: character.x + character.width / 2,
            y: character.y + character.height / 2,
            radius: 10 * CHARACTER_SCALE_FACTOR, // Projectile size
            speed: HONEYCOMB_PROJECTILE_SPEED * CHARACTER_SCALE_FACTOR,
            duration: 300, // Projectile lifespan in frames (adjust as needed)
            dx: 0,
            dy: 0,
            angle: 0 // Initial angle, will be set to target if found
        };

        // Find the nearest opponent to aim the projectile
        let nearestOpponent = null;
        let minDistance = Infinity;
        allCharacters.forEach(otherChar => {
            if (otherChar !== character && otherChar.isAlive && !otherChar.isPhasing) {
                const dist = checkDistance(character, otherChar);
                if (dist < minDistance) {
                    minDistance = dist;
                    nearestOpponent = otherChar;
                }
            }
        });

        if (nearestOpponent) {
            const angleToTarget = Math.atan2(nearestOpponent.y + nearestOpponent.height / 2 - character.secondaryAbilityEffect.y,
                                             nearestOpponent.x + nearestOpponent.width / 2 - character.secondaryAbilityEffect.x);
            character.secondaryAbilityEffect.angle = angleToTarget;
            character.secondaryAbilityEffect.dx = Math.cos(character.secondaryAbilityEffect.angle) * character.secondaryAbilityEffect.speed;
            character.secondaryAbilityEffect.dy = Math.sin(character.secondaryAbilityEffect.angle) * character.secondaryAbilityEffect.speed;
            displayMessage(`${character.name} launched a Honeycomb!`);
        } else {
            // If no target, launch in a random direction
            character.secondaryAbilityEffect.angle = Math.random() * Math.PI * 2;
            character.secondaryAbilityEffect.dx = Math.cos(character.secondaryAbilityEffect.angle) * character.secondaryAbilityEffect.speed;
            character.secondaryAbilityEffect.dy = Math.sin(character.secondaryAbilityEffect.angle) * character.secondaryAbilityEffect.speed;
            displayMessage(`${character.name} launched a Honeycomb! (No target found)`);
        }
    } else if (character.secondaryAbilityType === 'fin_slice') { // Handle Shark's Fin Slice
        character.lastSecondaryAbilityTime = Date.now(); // Set cooldown
        character.secondaryAbilityActive = true; // Activate ability

        let nearestOpponent = null;
        let minDistance = Infinity;
        allCharacters.forEach(otherChar => {
            if (otherChar !== character && otherChar.isAlive && !otherChar.isPhasing) {
                const dist = checkDistance(character, otherChar);
                if (dist < minDistance) {
                    minDistance = dist;
                    nearestOpponent = otherChar;
                }
            }
        });

        // Create the secondaryAbilityEffect for the visual cue and collision detection
        const angleToOpponent = nearestOpponent ? Math.atan2(nearestOpponent.y - character.y, nearestOpponent.x - character.x) : Math.random() * Math.PI * 2; // Aim at nearest or random
        character.secondaryAbilityEffect = {
            type: 'fin_slice',
            duration: 15, // Short duration for the visual slash (e.g., 0.25 seconds)
            angle: angleToOpponent, // Angle for drawing the slash
            targetsHit: [] // New: Keep track of targets already hit by this specific slice
        };

        displayMessage(`${character.name} used Fin Slice!`);

    } else { // Handle other secondary abilities with their original random chance
        // If it's not honeycomb or fin_slice, or if you want other abilities to still have a random chance:
        if (Math.random() < 0.015) { // Original random chance for other abilities
            character.lastSecondaryAbilityTime = Date.now();
            character.secondaryAbilityActive = true;

            switch (character.secondaryAbilityType) {
                case 'slippery_floor':
                    character.secondaryAbilityEffect = { type: 'slippery_floor', radius: character.width * 2.5, duration: SECONDARY_ABILITY_DURATION_FRAMES };
                    displayMessage(`${character.name} used Slippery Floor!`);
                    allCharacters.forEach(target => {
                        if (target !== character && target.isAlive && !target.isPhasing && checkDistance(character, target) < character.secondaryAbilityEffect.radius) {
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

    // Handle honeycomb projectile updates separately if the character is the Queen Bee firing it
    if (character.secondaryAbilityEffect.type === 'honeycomb_projectile') {
        updateHoneyCombProjectile(character, allCharacters, CHARACTER_SCALE_FACTOR, canvas);
        return; // Projectile update handled separately
    }

    // Special handling for Fin Slice collision and bleed application
    if (character.secondaryAbilityEffect.type === 'fin_slice') {
        // Only apply damage/bleed during the active visual frames
        if (character.secondaryAbilityEffect.duration > 0) {
            allCharacters.forEach(target => {
                // Check if target is valid and hasn't been hit by this slice instance yet
                if (target !== character && target.isAlive && !target.isPhasing && !character.secondaryAbilityEffect.targetsHit.includes(target.name)) {
                    // Collision check: if target is within the visual cue's radius
                    const dist = checkDistance(character, target);
                    const visualRadius = character.width * 1.1; // Matches the drawing radius

                    if (dist < visualRadius + target.width / 2) { // Add target's half-width for better collision
                        const damage = 20 + character.attack * 0.8; // Base damage plus attack scaling
                        target.takeDamage(damage, character.attack, character.name, allCharacters);
                        character.damageDealt += damage;

                        // Apply bleed effect
                        target.isBleeding = true;
                        target.bleedDamagePerTick = FIN_SLICE_BLEED_DAMAGE_PER_TICK + character.attack * 0.1;
                        target.lastBleedTickTime = Date.now();
                        target.bleedTarget = character.name;
                        // Set a timeout to remove bleeding after duration
                        setTimeout(() => {
                            if (target.isBleeding && target.bleedTarget === character.name) {
                                target.isBleeding = false;
                                target.bleedDamagePerTick = 0;
                                target.bleedTarget = null;
                                displayMessage(`${target.name} stopped bleeding.`);
                            }
                        }, FIN_SLICE_BLEED_DURATION_FRAMES * (1000/60));

                        displayMessage(`${character.name}'s Fin Slice hit ${target.name}!`);
                        character.secondaryAbilityEffect.targetsHit.push(target.name); // Mark target as hit
                    }
                }
            });
        }
    }


    // For all other secondary ability effects (including honeycomb_stick on the target and fin_slice visual)
    character.secondaryAbilityEffect.duration--;
    if (character.secondaryAbilityEffect.duration <= 0) {
        const abilityType = character.secondaryAbilityEffect.type;

        character.secondaryAbilityActive = false;
        // Handle specific effect cleanup BEFORE setting secondaryAbilityEffect to null
        switch (abilityType) {
            case 'magic_shield':
                character.isBlockingShuriken = false;
                break;
            case 'phase':
                character.isPhasing = false;
                break;
            case 'invisibility':
                character.isInvisible = false;
                if (character.ctx) character.ctx.globalAlpha = character.originalAlpha; // Restore original alpha
                break;
            case 'smoke_bomb':
                character.dodgeChanceBoost = 0;
                break;
            case 'honeycomb_stick': // Reset for the 'stuck' effect on a character
                character.isStunned = false;
                // Restore speed only if it was indeed altered by this stun
                if (character.originalSpeedWhenStunned !== null) {
                    character.speed = character.originalSpeedWhenStunned;
                    const newSpeedMagnitude = ORIGINAL_SPEED_MAGNITUDE * character.speed * CHARACTER_SCALE_FACTOR;
                    const currentAngle = Math.atan2(character.dy, character.dx);
                    character.dx = Math.cos(currentAngle) * newSpeedMagnitude;
                    character.dy = Math.sin(currentAngle) * newSpeedMagnitude;
                    character.originalSpeedWhenStunned = null; // Clear the stored speed
                }
                displayMessage(`${character.name} is no longer stuck!`);
                break;
            case 'fin_slice':
                // No character property changes here, just the visual goes away
                // The bleed effect is handled by a separate setTimeout when applied.
                break;
        }
        // Now it's safe to nullify the effect object
        character.secondaryAbilityEffect = null;


        // Only reset speed and defense if they were modified by THIS ability
        // And ensure original properties exist before resetting
        if (abilityType !== 'honeycomb_stick' && character.originalSpeed !== undefined) {
             character.speed = character.originalSpeed;
        }
        if (abilityType !== 'honeycomb_stick' && character.originalDefense !== undefined) {
            character.defense = character.originalDefense;
        }

        // Update speed vector if speed changed by abilities other than honeycomb
        // And ensure original properties exist before recalculating
        if (abilityType !== 'honeycomb_stick' && character.speed !== character.originalSpeed && character.originalSpeed !== undefined) {
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
    // Check if the projectile is still active and of the correct type on the Queen Bee
    if (!queenBee.secondaryAbilityActive || !queenBee.secondaryAbilityEffect || queenBee.secondaryAbilityEffect.type !== 'honeycomb_projectile') {
        return;
    }

    const projectile = queenBee.secondaryAbilityEffect;
    projectile.x += projectile.dx;
    projectile.y += projectile.dy;
    projectile.duration--;

    // Boundary collision or duration end for the projectile itself
    if (projectile.x < -projectile.radius || projectile.x + projectile.radius > canvas.width + projectile.radius ||
        projectile.y < -projectile.radius || projectile.y + projectile.radius > canvas.height + projectile.radius ||
        projectile.duration <= 0) {
        queenBee.secondaryAbilityActive = false;
        queenBee.secondaryAbilityEffect = null; // Remove projectile effect from Queen Bee
        return;
    }

    // Character collision for the projectile
    for (const target of allCharacters) {
        if (target !== queenBee && target.isAlive && !target.isPhasing && !target.isStunned) { // Don't re-stun an already stunned target
            // Check for simple circular collision with target's bounding box center
            const dist = checkDistance({x: projectile.x, y: projectile.y, width: projectile.radius * 2, height: projectile.radius * 2}, target);
            if (dist < target.width / 2 + projectile.radius) {
                // Projectile hit a target! Apply stun directly to the target.
                target.isStunned = true;
                target.originalSpeedWhenStunned = target.speed; // Store original speed before stun
                target.speed = 0; // Stop movement
                target.dx = 0;
                target.dy = 0;

                // Apply the 'honeycomb_stick' effect to the *target character*
                target.secondaryAbilityActive = true;
                target.secondaryAbilityEffect = {
                    type: 'honeycomb_stick',
                    duration: HONEYCOMB_STUN_DURATION_FRAMES // Use the defined stun duration
                };
                target.lastSecondaryAbilityTime = Date.now(); // Record when they got stuck

                // Remove the projectile effect from the Queen Bee
                queenBee.secondaryAbilityActive = false;
                queenBee.secondaryAbilityEffect = null;

                displayMessage(`${target.name} got stuck by Honeycomb!`);
                return; // Stun only one target per projectile and then remove projectile
            }
        }
    }
}