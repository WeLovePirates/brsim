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
    INVISIBILITY_DODGE_BOOST,
    SECONDARY_ABILITY_DURATION_FRAMES,
    FEEDING_FRENZY_DURATION_FRAMES,
    FEEDING_FRENZY_LOW_HEALTH_BONUS_DAMAGE_PERCENTAGE,
    ELIXIR_HEAL_PER_TICK,
    ELIXIR_HEAL_TICK_INTERVAL_MS,
    MEGALODON_FEEDING_FRENZY_BONUS_DAMAGE,
    MEGALODON_TITLE_COLOR // NEW: Import Megalodon title color
} from '../config.js';
import { displayMessage } from '../utils/displayUtils.js';
import { checkDistance } from '../utils/mathUtils.js';
import { handleSpecialMove, updateMoveEffect } from './characterMoves.js';
import { handleSecondaryAbility, updateAbilityEffect } from './characterAbilities.js';

export class Character {
    constructor(name, image, moveType, attack, defense, speed, scaleFactor, initialHealthOverride = INITIAL_HEALTH, secondaryAbilityType, secondaryAbilityCooldown, canvas, scaleFactorOverride = 1, isBoss = false) { // MODIFIED: Added isBoss
        this.name = name;
        this.image = image;
        this.moveType = moveType;
        this.attack = attack;
        this.defense = defense;
        this.speed = speed;

        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        this.width = ORIGINAL_CHARACTER_SIZE * scaleFactor * scaleFactorOverride;
        this.height = ORIGINAL_CHARACTER_SIZE * scaleFactor * scaleFactorOverride;
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

        // New properties for Honeycomb ability
        this.isStunned = false;
        this.originalSpeedWhenStunned = null; // To store speed before stun

        // New properties for Shark abilities
        this.isBleeding = false; // For Fin Slice
        this.bleedDamagePerTick = 0; // For Fin Slice
        this.lastBleedTickTime = 0; // For Fin Slice
        this.bleedTarget = null; // For Fin Slice

        // NEW: Alchemist properties
        this.isHealingOverTime = false;
        this.healAmountPerTick = 0;
        this.lastHealTickTime = 0;

        this.isBoss = isBoss; // NEW: Store if the character is a boss

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
     * Heals the character.
     * @param {number} amount - The amount of health to restore.
     */
    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
        this.healingDone += amount;
    }

    /**
     * Applies damage to the character.
     * @param {number} rawDamage - The base damage amount.
     * @param {number} attackerAttack - The attack stat of the attacker.
     * @param {string} attackerName - The name of the character who dealt the damage.
     * @param {Array<Character>} allCharacters - All characters in the game.
     */
    takeDamage(rawDamage, attackerAttack, attackerName, allCharacters) {
        if (!this.isAlive) return;

        // Check for invulnerability (e.g., from Wizard's magic shield)
        if (this.isBlockingShuriken && rawDamage === 25) { // Assuming 25 is shuriken damage
            displayMessage(`${this.name}'s Magic Shield blocked the Shuriken!`);
            return;
        }

        let damageToTake = rawDamage;

        // Apply Feeding Frenzy bonus damage
        const attacker = allCharacters.find(char => char.name === attackerName);
        if (attacker && attacker.moveActive && attacker.moveEffect && attacker.moveEffect.type === 'feeding_frenzy') {
            if (this.health <= this.maxHealth * LOW_HEALTH_THRESHOLD) {
                // MODIFIED: Apply Megalodon-specific bonus damage if attacker is Megalodon
                if (attacker.name === 'Megalodon') {
                    damageToTake += damageToTake * MEGALODON_FEEDING_FRENZY_BONUS_DAMAGE;
                } else {
                    damageToTake += damageToTake * FEEDING_FRENZY_LOW_HEALTH_BONUS_DAMAGE_PERCENTAGE;
                }
            }
        }

        // Apply damage reduction from abilities
        if (this.isInvisible) {
            damageToTake *= INVISIBILITY_DAMAGE_REDUCTION;
        }

        // Apply defense
        damageToTake = Math.max(1, damageToTake - (this.defense * 0.5)); // Reduce damage by half of defense

        this.health -= damageToTake;
        this.lastHitTime[attackerName] = Date.now(); // Record last hit time by this attacker

        displayMessage(`${this.name} took ${damageToTake.toFixed(0)} damage from ${attackerName}! Health: ${this.health.toFixed(0)}`);

        if (this.health <= 0) {
            this.health = 0;
            this.isAlive = false;
            this.deathTime = performance.now();
            displayMessage(`${this.name} has been defeated!`);

            const killer = allCharacters.find(char => char.name === attackerName);
            if (killer) {
                killer.kills++;
            }
        }
    }

    /**
     * Updates the character's state, including movement, abilities, and health.
     * @param {Array<Character>} characters - All characters in the game.
     * @param {number} CHARACTER_SCALE_FACTOR - The current scaling factor for characters.
     */
    update(characters, CHARACTER_SCALE_FACTOR) {
        if (!this.isAlive) return;

        // Apply bleed damage if bleeding
        if (this.isBleeding && Date.now() - this.lastBleedTickTime > 1000) { // Damage every 1 second
            this.health -= this.bleedDamagePerTick; // Apply bleed damage
            this.lastBleedTickTime = Date.now(); // Update last tick time

            // Find the character who applied the bleed and add to their damageDealt stat
            const bleederChar = characters.find(char => char.name === this.bleedTarget);
            if (bleederChar) {
                bleederChar.damageDealt += this.bleedDamagePerTick; // Log bleed damage
            }

            displayMessage(`${this.name} is bleeding! Health: ${this.health.toFixed(0)}`); // Display bleed message
            if (this.health <= 0) { // Check for death from bleed
                this.health = 0;
                this.isAlive = false;
                this.deathTime = performance.now();
                displayMessage(`${this.name} bled out!`);
                const killer = characters.find(char => char.name === this.bleedTarget); // Attribute kill to the bleeder
                if (killer) {
                    killer.kills++;
                }
                return; // Character died, no further updates this frame
            }
        }

        // Apply healing over time if active (for Alchemist's Elixir of Fortitude)
        if (this.isHealingOverTime && Date.now() - this.lastHealTickTime > ELIXIR_HEAL_TICK_INTERVAL_MS) {
            const healAmount = this.healAmountPerTick;
            this.heal(healAmount);
            this.lastHealTickTime = Date.now();
            displayMessage(`${this.name} healed for ${healAmount.toFixed(0)} from Elixir! Health: ${this.health.toFixed(0)}`);
        }


        // Call updateAbilityEffect for this character BEFORE checking isStunned for movement,
        // so that the stun duration can expire in this frame.
        updateAbilityEffect(this, characters, CHARACTER_SCALE_FACTOR, this.canvas); // Now takes allCharacters and canvas

        if (this.isStunned) { // If stunned, prevent movement and further ability activation
            // Still update existing move effects (e.g., swarm)
            updateMoveEffect(this, characters, CHARACTER_SCALE_FACTOR, this.canvas);
            return; // Skip normal movement and ability activation
        }

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
            // Megalodon will always use its special move if target is within a certain distance
            if (this.name === 'Megalodon') {
                const megalodonMoveActivationRange = this.width * 2; // Megalodon activates move if target is within 2x its size
                if (nearestOpponent && checkDistance(this, nearestOpponent) < megalodonMoveActivationRange) {
                    handleSpecialMove(this, characters, CHARACTER_SCALE_FACTOR);
                }
            } else if (Math.random() < 0.02) { // Chance to activate special move for other characters
                 handleSpecialMove(this, characters, CHARACTER_SCALE_FACTOR);
            }
        }

        // Secondary ability activation
        if (Date.now() - this.lastSecondaryAbilityTime > this.secondaryAbilityCooldown) {
            // Megalodon will always use its secondary ability if target is within a certain distance
            if (this.name === 'Megalodon') {
                const megalodonAbilityActivationRange = this.width * 1.5; // Megalodon activates ability if target is within 1.5x its size
                if (nearestOpponent && checkDistance(this, nearestOpponent) < megalodonAbilityActivationRange) {
                    handleSecondaryAbility(this, characters, CHARACTER_SCALE_FACTOR, this.canvas);
                }
            } else {
                handleSecondaryAbility(this, characters, CHARACTER_SCALE_FACTOR, this.canvas); // Pass canvas here
            }
        }

        // Update active move effects (ability effects are updated at start of `update`)
        updateMoveEffect(this, characters, CHARACTER_SCALE_FACTOR, this.canvas);
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

        // Draw stuck indicator
        if (this.isStunned && this.secondaryAbilityActive && this.secondaryAbilityEffect) {
            if (this.secondaryAbilityEffect.type === 'honeycomb_stick') {
                this.ctx.fillStyle = 'rgba(255, 165, 0, 0.3)'; // Orange translucent for Honeycomb
            } else if (this.secondaryAbilityEffect.type === 'volatile_concoction_stun') {
                this.ctx.fillStyle = 'rgba(128, 0, 128, 0.3)'; // Purple translucent for Alchemist stun
            }
            this.ctx.fillRect(this.x, this.y, this.width, this.height);
        }

        // Draw bleed indicator (Re-added for Fin Slice)
        if (this.isBleeding) {
            this.ctx.strokeStyle = 'red';
            this.ctx.lineWidth = 2 * CHARACTER_SCALE_FACTOR;
            this.ctx.beginPath();
            this.ctx.rect(this.x, this.y, this.width, this.height); // Draw a red border
            this.ctx.stroke();
            this.ctx.lineWidth = 1; // Reset line width
        }

        // Draw healing over time indicator (for Alchemist's Elixir of Fortitude)
        if (this.isHealingOverTime) {
            this.ctx.strokeStyle = 'lime'; // Green border
            this.ctx.lineWidth = 3 * CHARACTER_SCALE_FACTOR;
            this.ctx.beginPath();
            this.ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 2 + 8 * CHARACTER_SCALE_FACTOR, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.lineWidth = 1;
        }


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

        // MODIFIED: In-game name rendering for Megalodon vs. others
        if (this.isBoss) {
            this.ctx.fillStyle = MEGALODON_TITLE_COLOR; // Megalodon-specific color
            this.ctx.font = `${20 * CHARACTER_SCALE_FACTOR}px 'Press Start 2P'`; // Larger font for boss
        } else {
            this.ctx.fillStyle = '#333';
            this.ctx.font = `${12 * CHARACTER_SCALE_FACTOR}px Inter`;
        }

        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'alphabetic';

        // Add health in parentheses next to name
        const displayName = `${this.name} (${Math.round(this.health)})`;
        this.ctx.fillText(displayName, this.x + this.width / 2, this.y - (5 * CHARACTER_SCALE_FACTOR));

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
            } else if (this.moveType === 'swarm') { // Draw mini bees for swarm
                if (this.moveEffect && this.moveEffect.type === 'swarm') {
                    this.moveEffect.bees.forEach(bee => {
                        if (bee.image.complete && bee.image.naturalWidth > 0) {
                            this.ctx.save();
                            this.ctx.globalAlpha = 0.8; // Bees are slightly transparent
                            this.ctx.drawImage(bee.image, bee.x, bee.y, bee.size, bee.size);
                            this.ctx.restore();
                        }
                    });
                }
            }
            else if (this.moveType === 'feeding_frenzy') {
                if (this.moveEffect && this.moveEffect.type === 'feeding_frenzy' && this.moveEffect.duration > 0) {
                    const frenzyAlpha = this.moveEffect.duration / FEEDING_FRENZY_DURATION_FRAMES;
                    this.ctx.strokeStyle = `rgba(255, 0, 0, ${frenzyAlpha * 0.8})`;
                    this.ctx.lineWidth = 5 * CHARACTER_SCALE_FACTOR;
                    this.ctx.beginPath();
                    this.ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 2 + 5 * CHARACTER_SCALE_FACTOR, 0, Math.PI * 2);
                    this.ctx.stroke();
                    this.ctx.lineWidth = 1;
                }
            }
            else if (this.moveType === 'volatile_concoction') {
                if (this.moveEffect.type === 'volatile_projectile') {
                    this.ctx.fillStyle = this.moveEffect.color; // Color determined by effect type
                    this.ctx.beginPath();
                    this.ctx.arc(this.moveEffect.x, this.moveEffect.y, this.moveEffect.radius, 0, Math.PI * 2);
                    this.ctx.fill();
                } else if (this.moveEffect.type === 'volatile_explosion') {
                    this.ctx.save();
                    this.ctx.globalAlpha = this.moveEffect.alpha;
                    this.ctx.fillStyle = this.moveEffect.color;
                    this.ctx.beginPath();
                    this.ctx.arc(this.moveEffect.x, this.moveEffect.y, this.moveEffect.radius, 0, Math.PI * 2);
                    this.ctx.fill();
                    this.ctx.restore();
                }
            }
        }

        // Draw secondary ability effects
        if (this.secondaryAbilityActive && this.secondaryAbilityEffect) {
            const centerX = this.x + this.width / 2;
            const centerY = this.y + this.height / 2;
            const totalAbilityDurationFrames = SECONDARY_ABILITY_DURATION_FRAMES;
            let currentAlpha = 0;
            if (this.secondaryAbilityEffect.type === 'honeycomb_projectile') {
                currentAlpha = 0.7;
            }
            else if (this.secondaryAbilityEffect.type === 'fin_slice') {
                const slashDuration = 15;
                currentAlpha = (this.secondaryAbilityEffect.duration / slashDuration);
                if (currentAlpha < 0) currentAlpha = 0;

                this.ctx.save();
                this.ctx.globalAlpha = currentAlpha;
                this.ctx.strokeStyle = 'red';
                this.ctx.lineWidth = 5 * CHARACTER_SCALE_FACTOR;

                const armLength = this.width * 1.5;
                const startX = centerX;
                const startY = centerY;
                const endX = startX + armLength * Math.cos(this.secondaryAbilityEffect.angle);
                const endY = startY + armLength * Math.sin(this.secondaryAbilityEffect.angle);

                this.ctx.beginPath();
                this.ctx.moveTo(startX, startY);
                this.ctx.lineTo(endX, endY);
                this.ctx.stroke();
                this.ctx.restore();
            }
            else if (this.secondaryAbilityEffect.type === 'slippery_floor') {
                currentAlpha = (this.secondaryAbilityEffect.duration / totalAbilityDurationFrames);
                this.ctx.save();
                this.ctx.globalAlpha = currentAlpha * 0.4;
                this.ctx.fillStyle = 'blue';
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, this.secondaryAbilityEffect.radius, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.restore();
            } else if (this.secondaryAbilityEffect.type === 'iron_skin') {
                currentAlpha = (this.secondaryAbilityEffect.duration / totalAbilityDurationFrames);
                this.ctx.save();
                this.ctx.globalAlpha = currentAlpha * 0.3;
                this.ctx.fillStyle = 'gray';
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, this.width / 2 + 5 * CHARACTER_SCALE_FACTOR, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.restore();
            } else if (this.secondaryAbilityEffect.type === 'spur_of_moment') {
                currentAlpha = (this.secondaryAbilityEffect.duration / totalAbilityDurationFrames);
                this.ctx.save();
                this.ctx.globalAlpha = currentAlpha * 0.5;
                this.ctx.strokeStyle = 'cyan';
                this.ctx.lineWidth = 3 * CHARACTER_SCALE_FACTOR;
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, this.width / 2 + 10 * CHARACTER_SCALE_FACTOR, 0, Math.PI * 2);
                this.ctx.stroke();
                this.ctx.restore();
            } else if (this.secondaryAbilityEffect.type === 'static_field') {
                currentAlpha = (this.secondaryAbilityEffect.duration / totalAbilityDurationFrames);
                this.ctx.save();
                this.ctx.globalAlpha = currentAlpha * 0.5;
                this.ctx.strokeStyle = 'lime';
                this.ctx.lineWidth = 4 * CHARACTER_SCALE_FACTOR;
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, this.secondaryAbilityEffect.radius, 0, Math.PI * 2);
                this.ctx.stroke();
                this.ctx.restore();
            } else if (this.secondaryAbilityEffect.type === 'adrenaline_shot') {
                currentAlpha = (this.secondaryAbilityEffect.duration / totalAbilityDurationFrames);
                this.ctx.save();
                this.ctx.globalAlpha = currentAlpha * 0.7;
                this.ctx.fillStyle = 'orange';
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, this.width / 4, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.restore();
            } else if (this.secondaryAbilityEffect.type === 'smoke_bomb') {
                currentAlpha = (this.secondaryAbilityEffect.duration / totalAbilityDurationFrames);
                this.ctx.save();
                this.ctx.globalAlpha = currentAlpha * 0.4;
                this.ctx.fillStyle = 'darkgray';
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, this.secondaryAbilityEffect.radius, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.restore();
            } else if (this.secondaryAbilityEffect.type === 'magic_shield') {
                currentAlpha = (this.secondaryAbilityEffect.duration / totalAbilityDurationFrames);
                this.ctx.save();
                this.ctx.globalAlpha = currentAlpha * 0.6;
                this.ctx.strokeStyle = 'lightblue';
                this.ctx.lineWidth = 5 * CHARACTER_SCALE_FACTOR;
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, this.width / 2 + 5 * CHARACTER_SCALE_FACTOR, 0, Math.PI * 2);
                this.ctx.stroke();
                this.ctx.restore();
            } else if (this.secondaryAbilityEffect.type === 'fortify') {
                currentAlpha = (this.secondaryAbilityEffect.duration / totalAbilityDurationFrames);
                this.ctx.save();
                this.ctx.globalAlpha = currentAlpha * 0.4;
                this.ctx.fillStyle = 'saddlebrown';
                this.ctx.fillRect(this.x, this.y, this.width, this.height);
                this.ctx.restore();
            } else if (this.secondaryAbilityEffect.type === 'phase') {
                // Phasing alpha is handled at the beginning of draw()
            } else if (this.secondaryAbilityEffect.type === 'invisibility') {
                // Invisibility alpha is handled at the beginning of draw()
            } else if (this.secondaryAbilityEffect.type === 'elixir_of_fortitude') {
                // The healing effect is drawn by isHealingOverTime property
            }
        }
    }
}