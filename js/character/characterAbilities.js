// js/character/characterAbilities.js

import {
    ORIGINAL_SPEED_MAGNITUDE,
    SECONDARY_ABILITY_DURATION_FRAMES,
    INVISIBILITY_DAMAGE_REDUCTION,
    INVISIBILITY_DODGE_BOOST
} from '../config.js';
import { displayMessage } from '../utils/displayUtils.js';
import { checkDistance } from '../utils/mathUtils.js';

/**
 * Handles the logic for a character's secondary ability.
 * @param {Character} character - The character performing the ability.
 * @param {Array<Character>} allCharacters - All characters in the game.
 * @param {number} CHARACTER_SCALE_FACTOR - The current scaling factor for characters.
 */
export function handleSecondaryAbility(character, allCharacters, CHARACTER_SCALE_FACTOR) {
    if (character.secondaryAbilityActive) {
        return;
    }

    if (Math.random() < 0.015) { // Chance to activate ability
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
                        // The timeout logic is problematic, ideally duration countdown in update should handle this.
                        // For now, keeping the original timeout for direct speed reset.
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
        // playHitSound(); // Removed Tone.js sound
    }
}

/**
 * Updates the state of an active secondary ability effect and resets it if expired.
 * @param {Character} character - The character whose ability effect is being updated.
 * @param {number} CHARACTER_SCALE_FACTOR - The current scaling factor for characters.
 */
export function updateAbilityEffect(character, CHARACTER_SCALE_FACTOR) {
    if (!character.secondaryAbilityActive || !character.secondaryAbilityEffect) return;

    character.secondaryAbilityEffect.duration--;
    if (character.secondaryAbilityEffect.duration <= 0) {
        const abilityType = character.secondaryAbilityEffect.type;

        character.secondaryAbilityActive = false;
        character.secondaryAbilityEffect = null;

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
        }

        character.speed = character.originalSpeed;
        character.defense = character.originalDefense;

        // Update speed vector if speed changed
        const newSpeedMagnitude = ORIGINAL_SPEED_MAGNITUDE * character.speed * CHARACTER_SCALE_FACTOR;
        const currentAngle = Math.atan2(character.dy, character.dx);
        character.dx = Math.cos(currentAngle) * newSpeedMagnitude;
        character.dy = Math.sin(currentAngle) * newSpeedMagnitude;
    }
}