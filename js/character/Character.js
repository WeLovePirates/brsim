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
    TANK_FORTIFY_DEFENSE_BOOST,
    TANK_FORTIFY_DAMAGE_REDUCTION,
    WIZARD_MAGIC_SHIELD_DURATION_FRAMES,
} from '../config.js';
import { displayMessage } from '../utils/displayUtils.js';
import { checkDistance } from '../utils/mathUtils.js';
import { handleSpecialMove, updateMoveEffect } from './characterMoves.js';
import { handleSecondaryAbility, updateAbilityEffect } from './characterAbilities.js';
import { drawMoveVisuals } from '../visuals/moveVisuals.js';       // NEW Import
import { drawAbilityVisuals } from '../visuals/abilityVisuals.js';   // NEW Import

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
        this.damageReduction = 0; // NEW: For general damage reduction buffs

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


        // NEW: Buff/Debuff tracking
        this.buffs = {}; // { type: { duration: N, strength: X, originalStat: Y }, ... }
        this.debuffs = {}; // { type: { duration: N, strength: X, originalStat: Y }, ... }


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
     * Applies a buff to the character.
     * @param {string} type - The type of buff (e.g., 'attack_boost', 'defense_boost').
     * @param {number} strength - The multiplier or additive value of the buff.
     * @param {number} durationFrames - The duration of the buff in frames.
     * @param {string} stat - The stat affected by the buff (e.g., 'attack', 'defense', 'speed').
     */
    applyBuff(type, strength, durationFrames, stat) {
        if (this.buffs[type]) {
            // Refresh duration if buff already active
            this.buffs[type].duration = durationFrames;
            return;
        }

        let originalStatValue;
        switch (stat) {
            case 'attack': originalStatValue = this.attack; this.attack *= strength; break;
            case 'defense': originalStatValue = this.defense; this.defense *= strength; break;
            case 'speed': originalStatValue = this.speed; this.speed *= strength; break;
            case 'damageReduction': originalStatValue = this.damageReduction; this.damageReduction = strength; break; // Special case for direct reduction
            default: return; // Invalid stat
        }

        this.buffs[type] = {
            duration: durationFrames,
            strength: strength,
            originalStat: originalStatValue,
            stat: stat,
            startTime: Date.now()
        };
        displayMessage(`${this.name} gained ${type.replace(/_/g, ' ')}!`);
    }

    /**
     * Applies a debuff to the character.
     * @param {string} type - The type of debuff (e.g., 'speed_slow', 'defense_reduce').
     * @param {number} strength - The multiplier or additive value of the debuff.
     * @param {number} durationFrames - The duration of the debuff in frames.
     * @param {string} stat - The stat affected by the debuff (e.g., 'attack', 'defense', 'speed').
     */
    applyDebuff(type, strength, durationFrames, stat) {
        if (this.debuffs[type]) {
            // Refresh duration if debuff already active
            this.debuffs[type].duration = durationFrames;
            return;
        }

        let originalStatValue;
        switch (stat) {
            case 'attack': originalStatValue = this.attack; this.attack *= strength; break;
            case 'defense': originalStatValue = this.defense; this.defense *= strength; break;
            case 'speed': originalStatValue = this.speed; this.speed *= strength; break;
            default: return; // Invalid stat
        }

        this.debuffs[type] = {
            duration: durationFrames,
            strength: strength,
            originalStat: originalStatValue,
            stat: stat,
            startTime: Date.now()
        };
        displayMessage(`${this.name} was afflicted with ${type.replace(/_/g, ' ')}!`);
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

        // Check for invulnerability (e.g., from Wizard's magic shield) or damage reduction
        if (this.isBlockingShuriken && rawDamage === 25) { // Assuming 25 is shuriken damage
            displayMessage(`${this.name}'s Magic Shield blocked the Shuriken!`);
            return;
        }
        // NEW: Apply general damage reduction
        rawDamage *= (1 - this.damageReduction);


        let damageToTake = rawDamage;

        // Apply Feeding Frenzy bonus damage
        const attacker = allCharacters.find(char => char.name === attackerName);
        if (attacker && attacker.moveActive && attacker.moveEffect && attacker.moveEffect.type === 'feeding_frenzy') {
            if (this.health <= this.maxHealth * LOW_HEALTH_THRESHOLD) {
                damageToTake += damageToTake * FEEDING_FRENZY_LOW_HEALTH_BONUS_DAMAGE_PERCENTAGE;
                // displayMessage(`${attacker.name}'s Feeding Frenzy dealt bonus damage to ${this.name}!`); // Log bonus damage
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

        // NEW: Update and expire buffs/debuffs
        for (const type in this.buffs) {
            this.buffs[type].duration--;
            if (this.buffs[type].duration <= 0) {
                switch (this.buffs[type].stat) {
                    case 'attack': this.attack = this.buffs[type].originalStat; break;
                    case 'defense': this.defense = this.buffs[type].originalStat; break;
                    case 'speed': this.speed = this.buffs[type].originalStat; break;
                    case 'damageReduction': this.damageReduction = 0; break;
                }
                displayMessage(`${this.name}'s ${type.replace(/_/g, ' ')} wore off.`);
                delete this.buffs[type];
            }
        }
        for (const type in this.debuffs) {
            this.debuffs[type].duration--;
            if (this.debuffs[type].duration <= 0) {
                switch (this.debuffs[type].stat) {
                    case 'attack': this.attack = this.debuffs[type].originalStat; break;
                    case 'defense': this.defense = this.debuffs[type].originalStat; break;
                    case 'speed': this.speed = this.debuffs[type].originalStat; break;
                }
                displayMessage(`${this.name}'s ${type.replace(/_/g, ' ')} wore off.`);
                delete this.debuffs[type];
            }
        }


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

        // NEW: Apply healing over time if active (for Alchemist's Elixir of Fortitude)
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

        // NEW: AI Target Prioritization
        // Prioritize: lowest health, then lowest defense, then closest
        let nearestOpponent = null;
        let minDistance = Infinity;
        let lowestHealth = Infinity;
        let lowestDefense = Infinity;

        aliveCharacters.forEach(otherChar => {
            if (otherChar !== this && otherChar.isAlive && !otherChar.isPhasing && !otherChar.isDummy) {
                const dist = checkDistance(this, otherChar);

                // Priority 1: Lowest Health (and not already defeated)
                if (otherChar.health < lowestHealth) {
                    lowestHealth = otherChar.health;
                    nearestOpponent = otherChar;
                    minDistance = dist;
                } else if (otherChar.health === lowestHealth) {
                    // Priority 2: If health is tied, target lowest defense
                    if (otherChar.defense < lowestDefense) {
                        lowestDefense = otherChar.defense;
                        nearestOpponent = otherChar;
                        minDistance = dist;
                    } else if (otherChar.defense === lowestDefense) {
                        // Priority 3: If defense is tied, target closest
                        if (dist < minDistance) {
                            minDistance = dist;
                            nearestOpponent = otherChar;
                        }
                    }
                }
            }
        });

        // If there's no specific opponent based on health/defense, just pick the closest alive.
        if (!nearestOpponent && aliveCharacters.length > 1) {
             aliveCharacters.forEach(otherChar => {
                if (otherChar !== this && otherChar.isAlive && !otherChar.isPhasing && !otherChar.isDummy) {
                    const dist = checkDistance(this, otherChar);
                    if (dist < minDistance) {
                        minDistance = dist;
                        nearestOpponent = otherChar;
                    }
                }
            });
        }


        const allLowHealth = aliveCharacters.every(char => char.health <= char.maxHealth * LOW_HEALTH_THRESHOLD);

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

        // NEW: AI Ability Combo Logic
        // Decide whether to use secondary ability or special move
        const shouldUseSecondary = Date.now() - this.lastSecondaryAbilityTime > this.secondaryAbilityCooldown && Math.random() < 0.1; // Small chance to use secondary
        const shouldUseMove = Date.now() - this.lastMoveTime > MOVE_COOLDOWN && Math.random() < 0.02; // Small chance to use special move

        if (nearestOpponent) {
            // Example Combo: Stun + High Damage (Queen Bee, Alchemist can stun)
            if ((this.secondaryAbilityType === 'honeycomb' || this.moveType === 'volatile_concoction') &&
                shouldUseSecondary && checkDistance(this, nearestOpponent) < this.width * 5 && !nearestOpponent.isStunned) { // Within range and target not stunned
                handleSecondaryAbility(this, characters, CHARACTER_SCALE_FACTOR, this.canvas); // Use stun ability
                // Potentially, if the stun lands, queue up a special move immediately after.
                // This would require a more complex AI state machine or a very short "wait" after stun.
                // For simplicity here, just triggering stun.
                displayMessage(`${this.name} attempts a combo setup!`);
            }
            // Example Combo: Damage Reduction/Defense Buff + Charge (Tank)
            else if (this.secondaryAbilityType === 'fortify' && this.moveType === 'charge' &&
                shouldUseSecondary && this.health < this.maxHealth * 0.7 && !this.buffs['fortify_defense_boost']) { // Use fortify if health is not full and not already fortified
                handleSecondaryAbility(this, characters, CHARACTER_SCALE_FACTOR, this.canvas); // Use fortify
            }
            // General condition for using abilities:
            else if (shouldUseSecondary) {
                handleSecondaryAbility(this, characters, CHARACTER_SCALE_FACTOR, this.canvas); // Pass canvas here
            } else if (shouldUseMove) {
                 handleSpecialMove(this, characters, CHARACTER_SCALE_FACTOR);
            }
        } else { // If no nearest opponent, still consider using self-buffs or random moves
            if (shouldUseSecondary) {
                handleSecondaryAbility(this, characters, CHARACTER_SCALE_FACTOR, this.canvas); // Pass canvas here
            } else if (shouldUseMove) {
                 handleSpecialMove(this, characters, CHARACTER_SCALE_FACTOR);
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

        // Restore alpha to default before drawing UI elements or other effects
        this.ctx.globalAlpha = this.originalAlpha;

        // Delegate drawing of move effects to moveVisuals.js
        if (this.moveActive && this.moveEffect) {
            drawMoveVisuals(this.ctx, this, CHARACTER_SCALE_FACTOR);
        }

        // Delegate drawing of secondary ability effects to abilityVisuals.js
        if (this.secondaryAbilityActive && this.secondaryAbilityEffect) {
            drawAbilityVisuals(this.ctx, this, CHARACTER_SCALE_FACTOR);
        }

        // Draw basic health bar and name directly within Character.js
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

        const displayName = `${this.name} (${Math.ceil(this.health)})`;
        this.ctx.fillText(displayName, this.x + this.width / 2, this.y - (5 * CHARACTER_SCALE_FACTOR));
    }
}