// js/character/Character.js

import {
    INITIAL_HEALTH,
    ORIGINAL_CHARACTER_SIZE,
    ORIGINAL_SPEED_MAGNITUDE,
    HIT_COOLDOWN,
    MOVE_COOLDOWN,
    LOW_HEALTH_THRESHOLD,
    DODGE_CHANCE,
    DODGE_SPEED_MULTIPLIER,
    DODGE_DIRECTION_CHANGE_INTERVAL,
    ALL_LOW_HEALTH_RUSH_CHANCE,
    INVISIBILITY_DAMAGE_REDUCTION,
    SECONDARY_ABILITY_DURATION_FRAMES // Added import for SECONDARY_ABILITY_DURATION_FRAMES
} from '../config.js';
import { displayMessage } from '../utils/displayUtils.js'; // Corrected syntax: removed '='
import { checkDistance } from '../utils/mathUtils.js';
import { handleSpecialMove, updateMoveEffect } from './characterMoves.js';
import { handleSecondaryAbility, updateAbilityEffect } from './characterAbilities.js';

export class Character {
    constructor(name, image, moveType, attack, defense, speed, scaleFactor, initialHealthOverride = INITIAL_HEALTH, secondaryAbilityType, secondaryAbilityCooldown, canvas) {
        this.name = name;
        this.image = image;
        this.moveType = moveType;
        this.attack = attack;
        this.defense = defense;
        this.speed = speed;

        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        this.width = ORIGINAL_CHARACTER_SIZE * scaleFactor;
        this.height = ORIGINAL_CHARACTER_SIZE * scaleFactor;
        this.health = initialHealthOverride;
        this.maxHealth = initialHealthOverride;
        this.isAlive = true;
        this.lastHitTime = {};
        this.lastMoveTime = 0;
        this.moveActive = false;
        this.moveEffect = null;
        this.lastPatchTime = 0; // Specific for Medic's patch cooldown

        this.secondaryAbilityType = secondaryAbilityType;
        this.secondaryAbilityCooldown = secondaryAbilityCooldown;
        this.lastSecondaryAbilityTime = 0;
        this.secondaryAbilityActive = false;
        this.secondaryAbilityEffect = null;
        this.originalSpeed = this.speed; // Store original speed for ability resets
        this.originalDefense = this.defense; // Store original defense for ability resets
        this.isBlockingShuriken = false; // Specific for Wizard's magic shield

        this.isDodging = false;
        this.dodgeDirectionAngle = 0;
        this.lastDodgeDirectionChangeTime = 0;
        this.dodgeChanceBoost = 0; // For abilities like Smoke Bomb

        // Properties for Ghost abilities
        this.isPhasing = false;
        this.isInvisible = false;
        this.originalAlpha = 1.0; // To store original drawing alpha

        this.kills = 0;
        this.damageDealt = 0;
        this.healingDone = 0;
        this.spawnTime = 0;
        this.deathTime = 0;

        this.x = Math.random() * (this.canvas.width - this.width);
        this.y = Math.random() * (this.canvas.height - this.height);

        this.dx = (Math.random() - 0.5) * ORIGINAL_SPEED_MAGNITUDE * this.speed * scaleFactor;
        this.dy = (Math.random() - 0.5) * ORIGINAL_SPEED_MAGNITUDE * this.speed * scaleFactor;
        if (Math.abs(this.dx) < 1 * this.speed * scaleFactor) this.dx = (this.dx > 0 ? 1 : -1) * this.speed * scaleFactor;
        if (Math.abs(this.dy) < 1 * this.speed * scaleFactor) this.dy = (this.dy > 0 ? 1 : -1) * this.speed * scaleFactor;
    }

    /**
     * Updates the character's state, including movement, abilities, and health.
     * @param {Array<Character>} characters - All characters in the game.
     * @param {number} CHARACTER_SCALE_FACTOR - The current scaling factor for characters.
     */
    update(characters, CHARACTER_SCALE_FACTOR) {
        if (!this.isAlive) return;

        const currentTime = Date.now();
        const aliveCharacters = characters.filter(char => char.isAlive);
        const allLowHealth = aliveCharacters.every(char => char.health <= char.maxHealth * LOW_HEALTH_THRESHOLD);

        let nearestOpponent = null;
        let minDistance = Infinity;
        aliveCharacters.forEach(otherChar => {
            if (otherChar !== this) {
                const dist = checkDistance(this, otherChar);
                if (dist < minDistance) {
                    minDistance = dist;
                    nearestOpponent = otherChar;
                }
            }
        });

        let appliedMovement = false;

        // Movement logic (avoiding collisions for phasing characters)
        if (!this.isPhasing) {
            if (allLowHealth && nearestOpponent && Math.random() < ALL_LOW_HEALTH_RUSH_CHANCE) {
                const targetX = nearestOpponent.x + nearestOpponent.width / 2;
                const targetY = nearestOpponent.y + nearestOpponent.height / 2;
                const currentX = this.x + this.width / 2;
                const currentY = this.y + this.height / 2;

                const angleToTarget = Math.atan2(targetY - currentY, targetX - currentX);
                const rushSpeed = ORIGINAL_SPEED_MAGNITUDE * this.speed * CHARACTER_SCALE_FACTOR * 1.2;
                this.dx = Math.cos(angleToTarget) * rushSpeed;
                this.dy = Math.sin(angleToTarget) * rushSpeed;
                appliedMovement = true;
                this.isDodging = false;
            } else if (this.health <= this.maxHealth * LOW_HEALTH_THRESHOLD) {
                const currentDodgeChance = DODGE_CHANCE + this.dodgeChanceBoost + (this.isInvisible ? INVISIBILITY_DODGE_BOOST : 0);
                if (Math.random() < currentDodgeChance) {
                    if (!this.isDodging || (currentTime - this.lastDodgeDirectionChangeTime > DODGE_DIRECTION_CHANGE_INTERVAL)) {
                        this.isDodging = true;
                        this.dodgeDirectionAngle = Math.random() * Math.PI * 2;
                        this.lastDodgeDirectionChangeTime = currentTime;
                    }
                    const dodgeSpeed = ORIGINAL_SPEED_MAGNITUDE * this.speed * CHARACTER_SCALE_FACTOR * DODGE_SPEED_MULTIPLIER;
                    this.dx = Math.cos(this.dodgeDirectionAngle) * dodgeSpeed;
                    this.dy = Math.sin(this.dodgeDirectionAngle) * dodgeSpeed;
                    appliedMovement = true;
                } else {
                    this.isDodging = false;
                }
            } else {
                this.isDodging = false;
            }

            if (!appliedMovement) {
                const SEEK_CHANCE = 0.008;
                const RANDOM_DIRECTION_CHANGE_CHANCE = 0.005;

                if (nearestOpponent && Math.random() < SEEK_CHANCE) {
                    const targetX = nearestOpponent.x + nearestOpponent.width / 2;
                    const targetY = nearestOpponent.y + nearestOpponent.height / 2;
                    const currentX = this.x + this.width / 2;
                    const currentY = this.y + this.height / 2;

                    const angleToTarget = Math.atan2(targetY - currentY, targetX - currentX);
                    const newSpeedMagnitude = ORIGINAL_SPEED_MAGNITUDE * this.speed * CHARACTER_SCALE_FACTOR;
                    this.dx = Math.cos(angleToTarget) * newSpeedMagnitude;
                    this.dy = Math.sin(angleToTarget) * newSpeedMagnitude;
                } else if (Math.random() < RANDOM_DIRECTION_CHANGE_CHANCE) {
                    this.dx = (Math.random() - 0.5) * ORIGINAL_SPEED_MAGNITUDE * this.speed * CHARACTER_SCALE_FACTOR;
                    this.dy = (Math.random() - 0.5) * ORIGINAL_SPEED_MAGNITUDE * this.speed * CHARACTER_SCALE_FACTOR;
                    const currentSpeed = Math.sqrt(this.dx * this.dx + this.dy * this.dy);
                    const minSpeed = 1 * this.speed * CHARACTER_SCALE_FACTOR;
                    if (currentSpeed < minSpeed) {
                        const angle = Math.atan2(this.dy, this.dx);
                        this.dx = Math.cos(angle) * minSpeed;
                        this.dy = Math.sin(angle) * minSpeed;
                    }
                }
            }
        }

        this.x += this.dx;
        this.y += this.dy;

        // Boundary checks
        if (this.x + this.width > this.canvas.width || this.x < 0) {
            if (!this.isPhasing) { // Phasing characters don't bounce
                this.dx *= -1;
            }
            this.x = Math.max(0, Math.min(this.x, this.canvas.width - this.width));
            if (this.isDodging) {
                this.lastDodgeDirectionChangeTime = 0;
            }
        }
        if (this.y + this.height > this.canvas.height || this.y < 0) {
            if (!this.isPhasing) { // Phasing characters don't bounce
                this.dy *= -1;
            }
            this.y = Math.max(0, Math.min(this.y, this.canvas.height - this.height));
            if (this.isDodging) {
                this.lastDodgeDirectionChangeTime = 0;
            }
        }

        // Special move activation
        if (Date.now() - this.lastMoveTime > MOVE_COOLDOWN) {
            if (Math.random() < 0.02) { // Chance to activate special move
                 handleSpecialMove(this, characters, CHARACTER_SCALE_FACTOR);
            }
        }

        // Secondary ability activation
        if (Date.now() - this.lastSecondaryAbilityTime > this.secondaryAbilityCooldown) {
            handleSecondaryAbility(this, characters, CHARACTER_SCALE_FACTOR);
        }

        // Update active move and ability effects
        updateMoveEffect(this, characters, CHARACTER_SCALE_FACTOR, this.canvas);
        updateAbilityEffect(this, CHARACTER_SCALE_FACTOR);
    }

    /**
     * Draws the character and its associated effects on the canvas.
     * @param {number} CHARACTER_SCALE_FACTOR - The current scaling factor for characters.
     */
    draw(CHARACTER_SCALE_FACTOR) {
        if (!this.isAlive) return;

        // Apply transparency if phasing or invisible
        if (this.isPhasing) {
            this.ctx.globalAlpha = 0.5; // Semi-transparent when phasing
        } else if (this.isInvisible) {
             this.ctx.globalAlpha = 0.3; // More transparent when invisible
        } else {
            this.ctx.globalAlpha = this.originalAlpha; // Default alpha
        }

        this.ctx.drawImage(this.image, this.x, this.y, this.width, this.height);

        // Reset alpha for drawing UI elements like health bar and name
        this.ctx.globalAlpha = this.originalAlpha;

        const healthBarWidth = this.width;
        const healthBarHeight = 5 * CHARACTER_SCALE_FACTOR;
        const healthBarY = this.y + this.height + 5 * CHARACTER_SCALE_FACTOR;

        this.ctx.fillStyle = '#ccc';
        this.ctx.fillRect(this.x, healthBarY, healthBarWidth, healthBarHeight);

        const currentHealthWidth = (this.health / this.maxHealth) * healthBarWidth;
        this.ctx.fillStyle = this.health > this.maxHealth / 2 ? '#22c55e' : (this.health > this.maxHealth / 4 ? '#eab308' : '#ef4444');
        this.ctx.fillRect(this.x, healthBarY, currentHealthWidth, healthBarHeight);

        this.ctx.fillStyle = '#333';
        this.ctx.font = `${12 * CHARACTER_SCALE_FACTOR}px Inter`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'alphabetic';
        this.ctx.fillText(this.name, this.x + this.width / 2, this.y - (5 * CHARACTER_SCALE_FACTOR));

        // Draw move effects
        if (this.moveActive && this.moveEffect) {
            this.ctx.globalAlpha = this.originalAlpha; // Start with default for effects

            if (this.moveType === 'confetti') {
                this.ctx.save();
                this.ctx.globalAlpha = 0.6;
                this.moveEffect.particles.forEach(p => {
                    this.ctx.fillStyle = p.color;
                    this.ctx.globalAlpha = p.alpha;
                    this.ctx.fillRect(p.x, p.y, 8 * CHARACTER_SCALE_FACTOR, 8 * CHARACTER_SCALE_FACTOR);
                });
                this.ctx.restore();
            } else if (this.moveType === 'quickdraw') {
                if (this.moveEffect.type === 'quickdraw_projectile') {
                    this.ctx.save();
                    this.ctx.translate(this.moveEffect.x, this.moveEffect.y);
                    this.ctx.rotate(this.moveEffect.angle);
                    this.ctx.fillStyle = 'orange';
                    this.ctx.fillRect(-this.moveEffect.beamLength / 2, -this.moveEffect.beamWidth / 2,
                                      this.moveEffect.beamLength, this.moveEffect.beamWidth);
                    this.ctx.restore();
                }
            } else if (this.moveType === 'staticshock') {
                this.ctx.strokeStyle = 'yellow';
                this.ctx.lineWidth = 4 * CHARACTER_SCALE_FACTOR;
                this.ctx.beginPath();
                this.ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.moveEffect.radius, 0, Math.PI * 2);
                this.ctx.stroke();
                this.ctx.lineWidth = 1;
            } else if (this.moveType === 'baguette') {
                const armLength = this.width * 1.0;
                const startX = this.x + this.width / 2;
                const startY = this.y + this.height / 2;
                const endX = startX + armLength * Math.cos(this.moveEffect.angle);
                const endY = startY + armLength * Math.sin(this.moveEffect.angle);

                this.ctx.strokeStyle = 'brown';
                this.ctx.lineWidth = 8 * CHARACTER_SCALE_FACTOR;
                this.ctx.beginPath();
                this.ctx.moveTo(startX, startY);
                this.ctx.lineTo(endX, endY);
                this.ctx.stroke();
                this.ctx.lineWidth = 1;
            } else if (this.moveType === 'patch') {
                this.ctx.globalAlpha = this.moveEffect.alpha;
                this.ctx.fillStyle = 'lightgreen';
                this.ctx.font = `${30 * CHARACTER_SCALE_FACTOR}px Inter`;
                this.ctx.textAlign = 'center';
                this.ctx.fillText('+', this.x + this.width / 2, this.y + this.height / 2 + 5 * CHARACTER_SCALE_FACTOR);
                this.ctx.globalAlpha = this.originalAlpha;
            } else if (this.moveType === 'shuriken') {
                this.ctx.fillStyle = 'gray';
                this.ctx.beginPath();
                this.ctx.arc(this.moveEffect.x, this.moveEffect.y, 8 * CHARACTER_SCALE_FACTOR, 0, Math.PI * 2);
                this.ctx.fill();
            } else if (this.moveType === 'fireball') {
                this.ctx.fillStyle = `rgba(255, 100, 0, ${this.moveEffect.alpha})`;
                this.ctx.beginPath();
                this.ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.moveEffect.radius, 0, Math.PI * 2);
                this.ctx.fill();
            } else if (this.moveType === 'charge') {
                this.ctx.strokeStyle = 'blue';
                this.ctx.lineWidth = 3 * CHARACTER_SCALE_FACTOR;
                this.ctx.beginPath();
                this.ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 2 + 5 * CHARACTER_SCALE_FACTOR, 0, Math.PI * 2);
                this.ctx.stroke();
            } else if (this.moveType === 'boo') {
                if (this.moveEffect && this.moveEffect.type === 'boo_effect' && this.moveEffect.duration > 0) {
                    this.ctx.save();
                    this.ctx.globalAlpha = 0.4 * (this.moveEffect.duration / 30);
                    this.ctx.fillStyle = 'rgba(200, 200, 255, 0.5)';
                    this.ctx.beginPath();
                    this.ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.moveEffect.radius, 0, Math.PI * 2);
                    this.ctx.fill();
                    this.ctx.restore();
                }
            }
        }

        // Draw secondary ability effects
        if (this.secondaryAbilityActive && this.secondaryAbilityEffect) {
            const centerX = this.x + this.width / 2;
            const centerY = this.y + this.height / 2;
            const durationRatio = SECONDARY_ABILITY_DURATION_FRAMES > 0 ?
                                  this.secondaryAbilityEffect.duration / SECONDARY_ABILITY_DURATION_FRAMES : 0;
            const currentAlpha = durationRatio * 0.7;

            switch (this.secondaryAbilityEffect.type) {
                case 'slippery_floor':
                    this.ctx.strokeStyle = `rgba(100, 100, 255, ${currentAlpha})`;
                    this.ctx.lineWidth = 3 * CHARACTER_SCALE_FACTOR;
                    this.ctx.beginPath();
                    this.ctx.arc(centerX, centerY, this.secondaryAbilityEffect.radius, 0, Math.PI * 2);
                    this.ctx.stroke();
                    this.ctx.lineWidth = 1;
                    break;
                case 'iron_skin':
                    this.ctx.strokeStyle = `rgba(0, 255, 0, ${currentAlpha})`;
                    this.ctx.lineWidth = 5 * CHARACTER_SCALE_FACTOR;
                    this.ctx.beginPath();
                    this.ctx.arc(centerX, centerY, this.width / 2 + 10 * CHARACTER_SCALE_FACTOR, 0, Math.PI * 2);
                    this.ctx.stroke();
                    this.ctx.lineWidth = 1;
                    break;
                case 'spur_of_moment':
                case 'adrenaline_shot':
                    this.ctx.strokeStyle = `rgba(255, 255, 0, ${currentAlpha})`;
                    this.ctx.lineWidth = 4 * CHARACTER_SCALE_FACTOR;
                    this.ctx.beginPath();
                    this.ctx.arc(centerX, centerY, this.width / 2 + 8 * CHARACTER_SCALE_FACTOR, 0, Math.PI * 2);
                    this.ctx.stroke();
                    this.ctx.lineWidth = 1;
                    break;
                case 'static_field':
                    this.ctx.fillStyle = `rgba(255, 255, 0, ${currentAlpha * 0.5})`;
                    this.ctx.beginPath();
                    this.ctx.arc(centerX, centerY, this.secondaryAbilityEffect.radius, 0, Math.PI * 2);
                    this.ctx.fill();
                    break;
                case 'smoke_bomb':
                    this.ctx.fillStyle = `rgba(100, 100, 100, ${currentAlpha})`;
                    this.ctx.beginPath();
                    this.ctx.arc(centerX, centerY, this.secondaryAbilityEffect.radius, 0, Math.PI * 2);
                    this.ctx.fill();
                    break;
                case 'magic_shield':
                    this.ctx.strokeStyle = `rgba(0, 0, 255, ${currentAlpha})`;
                    this.ctx.lineWidth = 6 * CHARACTER_SCALE_FACTOR;
                    this.ctx.beginPath();
                    this.ctx.arc(centerX, centerY, this.width / 2 + 12 * CHARACTER_SCALE_FACTOR, 0, Math.PI * 2);
                    this.ctx.stroke();
                    break;
                case 'fortify':
                    this.ctx.strokeStyle = `rgba(150, 75, 0, ${currentAlpha})`;
                    this.ctx.lineWidth = 7 * CHARACTER_SCALE_FACTOR;
                    this.ctx.beginPath();
                    this.ctx.rect(this.x - 5 * CHARACTER_SCALE_FACTOR, this.y - 5 * CHARACTER_SCALE_FACTOR, this.width + 10 * CHARACTER_SCALE_FACTOR, this.height + 10 * CHARACTER_SCALE_FACTOR);
                    this.ctx.stroke();
                    break;
                 case 'phase':
                    this.ctx.strokeStyle = `rgba(150, 0, 255, ${currentAlpha})`;
                    this.ctx.lineWidth = 4 * CHARACTER_SCALE_FACTOR;
                    this.ctx.beginPath();
                    this.ctx.arc(centerX, centerY, this.width / 2 + 5 * CHARACTER_SCALE_FACTOR, 0, Math.PI * 2);
                    this.ctx.stroke();
                    break;
                 case 'invisibility':
                    // Transparency is handled at the character drawing level
                    break;
            }
        }
        this.ctx.globalAlpha = this.originalAlpha; // Ensure alpha is reset after drawing everything
    }

    /**
     * Applies damage to the character.
     * @param {number} baseAmount - The base amount of damage.
     * @param {number} attackerAttack - The attack stat of the attacker.
     * @param {string} attackerName - The name of the attacker.
     * @param {Array<Character>} allCharacters - All characters in the game (for killer tracking).
     */
    takeDamage(baseAmount, attackerAttack, attackerName, allCharacters) {
        const currentTime = Date.now();
        if (this.lastHitTime[attackerName] && (currentTime - this.lastHitTime[attackerName] < HIT_COOLDOWN)) {
            return;
        }

        if (this.isPhasing) {
             displayMessage(`${this.name} phased through ${attackerName}'s attack!`);
             this.lastHitTime[attackerName] = currentTime;
             return;
        }

        let effectiveDamage = Math.max(1, baseAmount + attackerAttack * 0.5 - this.defense * 0.5);

        if (this.secondaryAbilityActive && this.secondaryAbilityEffect) {
            if (this.secondaryAbilityEffect.type === 'iron_skin') {
                effectiveDamage *= 0.5;
            } else if (this.secondaryAbilityEffect.type === 'magic_shield') {
                effectiveDamage *= 0.6;
            } else if (this.secondaryAbilityEffect.type === 'fortify') {
                effectiveDamage *= 0.4;
            } else if (this.secondaryAbilityEffect.type === 'invisibility') {
                 effectiveDamage *= INVISIBILITY_DAMAGE_REDUCTION;
            }
        }

        this.health -= effectiveDamage;
        this.lastHitTime[attackerName] = currentTime;

        if (this.health <= 0) {
            this.health = 0;
            this.isAlive = false;
            this.deathTime = performance.now();
            displayMessage(`${this.name} has been defeated!`);
            const killer = allCharacters.find(char => char.name === attackerName);
            if (killer) {
                killer.kills++;
            }
        } else {
            displayMessage(`${this.name} took ${effectiveDamage.toFixed(0)} damage! Health: ${this.health.toFixed(0)}`);
        }
    }

    /**
     * Heals the character.
     * @param {number} amount - The amount of health to restore.
     */
    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
        this.healingDone += amount;
    }
}