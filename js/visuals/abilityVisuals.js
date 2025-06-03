// br/js/visuals/abilityVisuals.js

import {
    SECONDARY_ABILITY_DURATION_FRAMES,
    HONEYCOMB_STUN_DURATION_FRAMES, // Imported for potential visual differentiation
    FIN_SLICE_BLEED_DURATION_FRAMES,
    WIZARD_MAGIC_SHIELD_DURATION_FRAMES,
} from '../config.js';

/**
 * Draws the visual effects of a character's secondary ability.
 * @param {CanvasRenderingContext2D} ctx - The 2D rendering context.
 * @param {Character} character - The character whose ability effect is being drawn.
 * @param {number} CHARACTER_SCALE_FACTOR - The current scaling factor for characters.
 */
export function drawAbilityVisuals(ctx, character, CHARACTER_SCALE_FACTOR) {
    if (!character.secondaryAbilityActive || !character.secondaryAbilityEffect) return;

    const centerX = character.x + character.width / 2;
    const centerY = character.y + character.height / 2;
    const totalAbilityDurationFrames = SECONDARY_ABILITY_DURATION_FRAMES; // Default, can be overridden

    // Draw stuck indicator (common to honeycomb_stick and volatile_concoction_stun)
    if (character.isStunned && character.secondaryAbilityEffect) {
        if (character.secondaryAbilityEffect.type === 'honeycomb_stick') {
            ctx.fillStyle = 'rgba(255, 165, 0, 0.3)'; // Orange translucent for Honeycomb
        } else if (character.secondaryAbilityEffect.type === 'volatile_concoction_stun') {
            ctx.fillStyle = 'rgba(128, 0, 128, 0.3)'; // Purple translucent for Alchemist stun
        }
        ctx.fillRect(character.x, character.y, character.width, character.height);
    }

    // Draw bleed indicator (Fin Slice)
    if (character.isBleeding) {
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2 * CHARACTER_SCALE_FACTOR;
        ctx.beginPath();
        ctx.rect(character.x, character.y, character.width, character.height); // Draw a red border
        ctx.stroke();
        ctx.lineWidth = 1; // Reset line width
    }

    // Draw healing over time indicator (Alchemist's Elixir of Fortitude)
    if (character.isHealingOverTime) {
        ctx.strokeStyle = 'lime'; // Green border
        ctx.lineWidth = 3 * CHARACTER_SCALE_FACTOR;
        ctx.beginPath();
        ctx.arc(centerX, centerY, character.width / 2 + 8 * CHARACTER_SCALE_FACTOR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = 1;
    }

    // Draw Fortify indicator (Tank) - this is a buff, so it's drawn if the buff exists
    if (character.buffs['fortify_defense_boost']) {
        ctx.strokeStyle = 'saddlebrown';
        ctx.lineWidth = 4 * CHARACTER_SCALE_FACTOR;
        ctx.beginPath();
        ctx.rect(character.x - 2, character.y - 2, character.width + 4, character.height + 4); // Slightly larger border
        ctx.stroke();
        ctx.lineWidth = 1;
    }

    // Draw specific ability effects based on secondaryAbilityEffect type
    let currentAlpha = 0;
    switch (character.secondaryAbilityEffect.type) {
        case 'honeycomb_projectile':
            currentAlpha = 0.7; // Projectile is consistently opaque
            ctx.fillStyle = `rgba(255, 165, 0, ${currentAlpha})`; // Orange for honeycomb projectile
            ctx.beginPath();
            ctx.arc(character.secondaryAbilityEffect.x, character.secondaryAbilityEffect.y, character.secondaryAbilityEffect.radius, 0, Math.PI * 2);
            ctx.fill();
            break;
        case 'fin_slice':
            const slashDuration = 15; // Hardcoded visual duration from characterAbilities.js
            currentAlpha = (character.secondaryAbilityEffect.duration / slashDuration);
            if (currentAlpha < 0) currentAlpha = 0;

            ctx.save();
            ctx.globalAlpha = currentAlpha;
            ctx.strokeStyle = 'red';
            ctx.lineWidth = 5 * CHARACTER_SCALE_FACTOR;

            const armLength = character.width * 1.5;
            const startX = centerX;
            const startY = centerY;
            const endX = startX + armLength * Math.cos(character.secondaryAbilityEffect.angle);
            const endY = startY + armLength * Math.sin(character.secondaryAbilityEffect.angle);

            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
            ctx.restore();
            break;
        case 'slippery_floor':
            currentAlpha = (character.secondaryAbilityEffect.duration / totalAbilityDurationFrames);
            ctx.save();
            ctx.globalAlpha = currentAlpha * 0.4;
            ctx.fillStyle = 'blue';
            ctx.beginPath();
            ctx.arc(centerX, centerY, character.secondaryAbilityEffect.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            break;
        case 'iron_skin':
            currentAlpha = (character.secondaryAbilityEffect.duration / totalAbilityDurationFrames);
            ctx.save();
            ctx.globalAlpha = currentAlpha * 0.3;
            ctx.fillStyle = 'gray';
            ctx.beginPath();
            ctx.arc(centerX, centerY, character.width / 2 + 5 * CHARACTER_SCALE_FACTOR, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            break;
        case 'spur_of_moment':
            currentAlpha = (character.secondaryAbilityEffect.duration / totalAbilityDurationFrames);
            ctx.save();
            ctx.globalAlpha = currentAlpha * 0.5;
            ctx.strokeStyle = 'cyan';
            ctx.lineWidth = 3 * CHARACTER_SCALE_FACTOR;
            ctx.beginPath();
            ctx.arc(centerX, centerY, character.width / 2 + 10 * CHARACTER_SCALE_FACTOR, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
            break;
        case 'static_field':
            currentAlpha = (character.secondaryAbilityEffect.duration / totalAbilityDurationFrames);
            ctx.save();
            ctx.globalAlpha = currentAlpha * 0.5;
            ctx.strokeStyle = 'lime';
            ctx.lineWidth = 4 * CHARACTER_SCALE_FACTOR;
            ctx.beginPath();
            ctx.arc(centerX, centerY, character.secondaryAbilityEffect.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
            break;
        case 'adrenaline_shot':
            currentAlpha = (character.secondaryAbilityEffect.duration / totalAbilityDurationFrames);
            ctx.save();
            ctx.globalAlpha = currentAlpha * 0.7;
            ctx.fillStyle = 'orange';
            ctx.beginPath();
            ctx.arc(centerX, centerY, character.width / 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            break;
        case 'smoke_bomb':
            currentAlpha = (character.secondaryAbilityEffect.duration / totalAbilityDurationFrames);
            ctx.save();
            ctx.globalAlpha = currentAlpha * 0.4;
            ctx.fillStyle = 'darkgray';
            ctx.beginPath();
            ctx.arc(centerX, centerY, character.secondaryAbilityEffect.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            break;
        case 'magic_shield':
            currentAlpha = (character.secondaryAbilityEffect.duration / WIZARD_MAGIC_SHIELD_DURATION_FRAMES);
            ctx.save();
            ctx.globalAlpha = currentAlpha * 0.6;
            ctx.strokeStyle = 'lightblue';
            ctx.lineWidth = 5 * CHARACTER_SCALE_FACTOR;
            ctx.beginPath();
            ctx.arc(centerX, centerY, character.width / 2 + 5 * CHARACTER_SCALE_FACTOR, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
            break;
        case 'fortify':
            currentAlpha = (character.secondaryAbilityEffect.duration / totalAbilityDurationFrames);
            ctx.save();
            ctx.globalAlpha = currentAlpha * 0.4;
            ctx.fillStyle = 'saddlebrown';
            ctx.fillRect(character.x, character.y, character.width, character.height);
            ctx.restore();
            break;
        case 'phase':
            // Phasing alpha is handled at the beginning of Character.draw()
            break;
        case 'invisibility':
            // Invisibility alpha is handled at the beginning of Character.draw()
            break;
        case 'elixir_of_fortitude':
            // The healing over time visual is handled by isHealingOverTime property check directly
            break;
    }
}