// br/js/visuals/moveVisuals.js

import {
    FEEDING_FRENZY_DURATION_FRAMES,
    WIZARD_MAGIC_SHIELD_DURATION_FRAMES, // Used for some visual effects if needed, though typically magic_shield is an ability visual
} from '../config.js';

/**
 * Draws the visual effects of a character's special move.
 * @param {CanvasRenderingContext2D} ctx - The 2D rendering context.
 * @param {Character} character - The character whose move effect is being drawn.
 * @param {number} CHARACTER_SCALE_FACTOR - The current scaling factor for characters.
 */
export function drawMoveVisuals(ctx, character, CHARACTER_SCALE_FACTOR) {
    if (!character.moveActive || !character.moveEffect) return;

    ctx.globalAlpha = character.originalAlpha; // Start with default for effects

    switch (character.moveType) {
        case 'confetti':
            ctx.save();
            ctx.globalAlpha = 0.6;
            character.moveEffect.particles.forEach(p => {
                ctx.fillStyle = p.color;
                ctx.globalAlpha = p.alpha;
                ctx.fillRect(p.x, p.y, 8 * CHARACTER_SCALE_FACTOR, 8 * CHARACTER_SCALE_FACTOR);
            });
            ctx.restore();
            break;
        case 'quickdraw':
            if (character.moveEffect.type === 'quickdraw_projectile') {
                ctx.save();
                ctx.translate(character.moveEffect.x, character.moveEffect.y);
                ctx.rotate(character.moveEffect.angle);
                ctx.fillStyle = 'orange';
                ctx.fillRect(-character.moveEffect.beamLength / 2, -character.moveEffect.beamWidth / 2,
                                  character.moveEffect.beamLength, character.moveEffect.beamWidth);
                ctx.restore();
            }
            break;
        case 'staticshock':
            ctx.strokeStyle = 'yellow';
            ctx.lineWidth = 4 * CHARACTER_SCALE_FACTOR;
            ctx.beginPath();
            ctx.arc(character.x + character.width / 2, character.y + character.height / 2, character.moveEffect.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.lineWidth = 1;
            break;
        case 'baguette':
            const armLength = character.width * 1.0;
            const startX = character.x + character.width / 2;
            const startY = character.y + character.height / 2;
            const endX = startX + armLength * Math.cos(character.moveEffect.angle);
            const endY = startY + armLength * Math.sin(character.moveEffect.angle);

            ctx.strokeStyle = 'brown';
            ctx.lineWidth = 8 * CHARACTER_SCALE_FACTOR;
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
            ctx.lineWidth = 1;
            break;
        case 'patch':
            ctx.globalAlpha = character.moveEffect.alpha;
            ctx.fillStyle = 'lightgreen';
            ctx.font = `${30 * CHARACTER_SCALE_FACTOR}px Inter`;
            ctx.textAlign = 'center';
            ctx.fillText('+', character.x + character.width / 2, character.y + character.height / 2 + 5 * CHARACTER_SCALE_FACTOR);
            ctx.globalAlpha = character.originalAlpha;
            break;
        case 'shuriken':
            ctx.fillStyle = 'gray';
            ctx.beginPath();
            ctx.arc(character.moveEffect.x, character.moveEffect.y, 8 * CHARACTER_SCALE_FACTOR, 0, Math.PI * 2);
            ctx.fill();
            break;
        case 'fireball':
            if (character.moveEffect.type === 'fireball_projectile') {
                ctx.fillStyle = `rgba(255, 100, 0, ${character.moveEffect.alpha || 1})`; // Ensure alpha exists, default to 1
                ctx.beginPath();
                ctx.arc(character.moveEffect.x, character.moveEffect.y, character.moveEffect.radius, 0, Math.PI * 2);
                ctx.fill();
            } else if (character.moveEffect.type === 'fireball_explosion') {
                ctx.save();
                ctx.globalAlpha = character.moveEffect.alpha;
                ctx.fillStyle = 'rgba(255, 100, 0, 0.7)';
                ctx.beginPath();
                ctx.arc(character.moveEffect.x, character.moveEffect.y, character.moveEffect.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
            break;
        case 'charge':
            ctx.strokeStyle = 'blue';
            ctx.lineWidth = 3 * CHARACTER_SCALE_FACTOR;
            ctx.beginPath();
            ctx.arc(character.x + character.width / 2, character.y + character.height / 2, character.width / 2 + 5 * CHARACTER_SCALE_FACTOR, 0, Math.PI * 2);
            ctx.stroke();
            break;
        case 'boo':
            if (character.moveEffect && character.moveEffect.type === 'boo_effect' && character.moveEffect.duration > 0) {
                ctx.save();
                ctx.globalAlpha = 0.4 * (character.moveEffect.duration / 30);
                ctx.fillStyle = 'rgba(200, 200, 255, 0.5)';
                ctx.beginPath();
                ctx.arc(character.x + character.width / 2, character.y + character.height / 2, character.moveEffect.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
            break;
        case 'swarm':
            if (character.moveEffect && character.moveEffect.type === 'swarm') {
                character.moveEffect.bees.forEach(bee => {
                    if (bee.image.complete && bee.image.naturalWidth > 0) {
                        ctx.save();
                        ctx.globalAlpha = 0.8; // Bees are slightly transparent
                        ctx.drawImage(bee.image, bee.x, bee.y, bee.size, bee.size);
                        ctx.restore();
                    }
                });
            }
            break;
        case 'feeding_frenzy':
            if (character.moveEffect && character.moveEffect.type === 'feeding_frenzy' && character.moveEffect.duration > 0) {
                const frenzyAlpha = character.moveEffect.duration / FEEDING_FRENZY_DURATION_FRAMES;
                ctx.strokeStyle = `rgba(255, 0, 0, ${frenzyAlpha * 0.8})`;
                ctx.lineWidth = 5 * CHARACTER_SCALE_FACTOR;
                ctx.beginPath();
                ctx.arc(character.x + character.width / 2, character.y + character.height / 2, character.width / 2 + 5 * CHARACTER_SCALE_FACTOR, 0, Math.PI * 2);
                ctx.stroke();
                ctx.lineWidth = 1;
            }
            break;
        case 'volatile_concoction':
            if (character.moveEffect.type === 'volatile_projectile') {
                ctx.fillStyle = character.moveEffect.color; // Color determined by effect type
                ctx.beginPath();
                ctx.arc(character.moveEffect.x, character.moveEffect.y, character.moveEffect.radius, 0, Math.PI * 2);
                ctx.fill();
            } else if (character.moveEffect.type === 'volatile_explosion') {
                ctx.save();
                ctx.globalAlpha = character.moveEffect.alpha;
                ctx.fillStyle = character.moveEffect.color;
                ctx.beginPath();
                ctx.arc(character.moveEffect.x, character.moveEffect.y, character.moveEffect.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
            break;
    }
}