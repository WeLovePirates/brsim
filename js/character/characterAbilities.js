// js/character/characterAbilities.js

import {
    ORIGINAL_SPEED_MAGNITUDE,
    SECONDARY_ABILITY_DURATION_FRAMES,
    INVISIBILITY_DAMAGE_REDUCTION,
    INVISIBILITY_DODGE_BOOST,
    HONEYCOMB_STUN_DURATION_FRAMES,
    HONEYCOMB_PROJECTILE_SPEED,
    FIN_SLICE_BLEED_DURATION_FRAMES, // Import new constant
    FIN_SLICE_BLEED_DAMAGE_PER_TICK, // Import new constant
    ELIXIR_DEFENSE_BOOST_PERCENTAGE, // NEW: For Alchemist
    ELIXIR_HEAL_PER_TICK, // NEW: For Alchemist
    ELIXIR_HEAL_TICK_INTERVAL_MS, // NEW: For Alchemist
    TANK_FORTIFY_DEFENSE_BOOST, // NEW: For Tank's Fortify ability
    TANK_FORTIFY_DAMAGE_REDUCTION, // NEW: For Tank's Fortify ability
    WIZARD_MAGIC_SHIELD_DURATION_FRAMES, // NEW: For Wizard's Magic Shield duration
    WIZARD_MAGIC_SHIELD_DAMAGE_REDUCTION, // NEW: For Wizard's Magic Shield general damage reduction
} from '../config.js';
import { displayMessage } from '../utils/displayUtils.js';
import { checkDistance } from '../utils/mathUtils.js';

/**
 * Handles the logic for a character's secondary ability.
 * @param {Character} character - The character performing the ability.
 * @param {Array<Character>} allCharacters - All characters in the game.
 * @param {number} CHARACTER_SCALE_FACTOR - The current scaling factor for characters.
 * @param {HTMLCanvasElement} canvas - The game canvas.
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
            speed: HONEYCOMB_PROJECTILE_SPEED * CHARACTER_SCALE_FACTOR, // Projectile speed
            duration: 300, // Projectile lifespan in frames (adjust as needed)
            dx: 0,
            dy: 0,
            angle: 0 // Initial angle, will be set to target if found
        };

        // Find the nearest opponent to aim the projectile
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
            if (otherChar !== character && otherChar.isAlive && !otherChar.isPhasing && !otherChar.isDummy) {
                const dist = checkDistance(character, otherChar);
                if (dist < minDistance) {
                    minDistance = dist;
                    nearestOpponent = otherChar;
                }
            }
        });

        // Create the secondaryAbilityEffect for the visual cue and collision detection
        const angleToOpponent = nearestOpponent ? Math.atan2(nearestOpponent.y - character.y, nearestOpponent.x - character.x) : Math.random() * Math.PI * 2;
        character.secondaryAbilityEffect = {
            type: 'fin_slice',
            duration: 15, // Short duration for the visual slash (e.g., 0.25 seconds)
            angle: angleToOpponent, // Angle for drawing the slash
            targetsHit: [] // New: Keep track of targets already hit by this specific slice
        };

        displayMessage(`${character.name} used Fin Slice!`);

    } else if (character.secondaryAbilityType === 'elixir_of_fortitude') { // NEW: Alchemist's Secondary Ability
        character.lastSecondaryAbilityTime = Date.now();
        character.secondaryAbilityActive = true;
        character.secondaryAbilityEffect = {
            type: 'elixir_of_fortitude',
            duration: SECONDARY_ABILITY_DURATION_FRAMES // Standard duration for secondary abilities
        };

        // Apply defense boost directly via Character's applyBuff
        character.applyBuff('elixir_defense_boost', (1 + ELIXIR_DEFENSE_BOOST_PERCENTAGE), SECONDARY_ABILITY_DURATION_FRAMES, 'defense');

        // Activate healing over time
        character.isHealingOverTime = true;
        character.healAmountPerTick = ELIXIR_HEAL_PER_TICK;
        character.lastHealTickTime = Date.now(); // Initialize first tick time

        displayMessage(`${character.name} drank Elixir of Fortitude!`);

    } else { // Handle other secondary abilities with their original random chance
        // If it's not honeycomb or fin_slice, or if you want other abilities to still have a random chance:
        // Removed original random chance (Math.random() < 0.015) as AI now decides when to use abilities
        character.lastSecondaryAbilityTime = Date.now();
        character.secondaryAbilityActive = true;

        switch (character.secondaryAbilityType) {
            case 'slippery_floor':
                character.secondaryAbilityEffect = { type: 'slippery_floor', radius: character.width * 2.5, duration: SECONDARY_ABILITY_DURATION_FRAMES };
                displayMessage(`${character.name} used Slippery Floor!`);
                allCharacters.forEach(target => {
                    if (target !== character && target.isAlive && !target.isPhasing && !target.isDummy && checkDistance(character, target) < character.secondaryAbilityEffect.radius) {
                        target.applyDebuff('slippery_slow', 0.5, SECONDARY_ABILITY_DURATION_FRAMES, 'speed');
                    }
                });
                break;
            case 'iron_skin':
                character.secondaryAbilityEffect = { type: 'iron_skin', duration: SECONDARY_ABILITY_DURATION_FRAMES };
                character.applyBuff('iron_skin_defense_boost', 1.5, SECONDARY_ABILITY_DURATION_FRAMES, 'defense');
                displayMessage(`${character.name} used Iron Skin!`);
                break;
            case 'spur_of_moment':
                character.secondaryAbilityEffect = { type: 'spur_of_moment', duration: SECONDARY_ABILITY_DURATION_FRAMES };
                character.applyBuff('spur_of_moment_speed_boost', 1.8, SECONDARY_ABILITY_DURATION_FRAMES, 'speed');
                displayMessage(`${character.name} used Spur of the Moment!`);
                break;
            case 'static_field':
                character.secondaryAbilityEffect = { type: 'static_field', radius: character.width * 1.5, duration: SECONDARY_ABILITY_DURATION_FRAMES, tickDamage: 0.5 };
                displayMessage(`${character.name} created a Static Field!`);
                break;
            case 'adrenaline_shot':
                character.secondaryAbilityEffect = { type: 'adrenaline_shot', duration: SECONDARY_ABILITY_DURATION_FRAMES };
                character.applyBuff('adrenaline_speed_boost', 2.0, SECONDARY_ABILITY_DURATION_FRAMES, 'speed');
                displayMessage(`${character.name} used Adrenaline Shot!`);
                break;
            case 'smoke_bomb':
                character.secondaryAbilityEffect = { type: 'smoke_bomb', radius: character.width * 2, duration: SECONDARY_ABILITY_DURATION_FRAMES };
                displayMessage(`${character.name} deployed a Smoke Bomb!`);
                character.dodgeChanceBoost = 0.5;
                break;
            case 'magic_shield': // NEW: Wizard's Magic Shield for projectile interception and general damage reduction
                character.secondaryAbilityEffect = { type: 'magic_shield', duration: WIZARD_MAGIC_SHIELD_DURATION_FRAMES };
                character.isBlockingShuriken = true;
                // NEW: Apply a general damage reduction buff
                character.applyBuff('magic_shield_reduction', WIZARD_MAGIC_SHIELD_DAMAGE_REDUCTION, WIZARD_MAGIC_SHIELD_DURATION_FRAMES, 'damageReduction');
                displayMessage(`${character.name} cast Magic Shield!`);
                break;
            case 'fortify': // NEW: Tank's Fortify as a buff
                character.secondaryAbilityEffect = { type: 'fortify', duration: SECONDARY_ABILITY_DURATION_FRAMES };
                character.applyBuff('fortify_defense_boost', TANK_FORTIFY_DEFENSE_BOOST, SECONDARY_ABILITY_DURATION_FRAMES, 'defense');
                character.applyBuff('fortify_damage_reduction', TANK_FORTIFY_DAMAGE_REDUCTION, SECONDARY_ABILITY_DURATION_FRAMES, 'damageReduction');
                displayMessage(`${character.name} fortified themselves!`);
                break;
            case 'phase':
                character.secondaryAbilityEffect = { type: 'phase', duration: SECONDARY_ABILITY_DURATION_FRAMES };
                character.isPhasing = true;
                character.applyBuff('phase_speed_boost', 1.5, SECONDARY_ABILITY_DURATION_FRAMES, 'speed');
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
                if (target !== character && target.isAlive && !target.isPhasing && !target.isDummy && !character.secondaryAbilityEffect.targetsHit.includes(target.name)) {
                    const dist = checkDistance(character, target);
                    const visualRadius = character.width * 1.1;

                    if (dist < target.width / 2 + visualRadius) {
                        const damage = 20 + character.attack * 0.8;
                        target.takeDamage(damage, character.attack, character.name, allCharacters);
                        character.damageDealt += damage;

                        target.isBleeding = true;
                        target.bleedDamagePerTick = FIN_SLICE_BLEED_DAMAGE_PER_TICK + character.attack * 0.1;
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
                // General damage reduction buff handled by Character's buff system now
                break;
            case 'phase':
                character.isPhasing = false;
                // Speed buff handled by Character's buff system now
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
                // Defense buff and healing over time are now handled by Character's buff/HoT system
                character.isHealingOverTime = false;
                character.healAmountPerTick = 0;
                displayMessage(`${character.name}'s Elixir of Fortitude wore off.`);
                break;
            case 'iron_skin': // Buff handled by Character's buff system
            case 'spur_of_moment': // Buff handled by Character's buff system
            case 'adrenaline_shot': // Buff handled by Character's buff system
            case 'fortify': // Buff handled by Character's buff system
                // No direct stat reset here as it's handled by character.buffs cleanup
                break;
            case 'slippery_floor': // Debuff handled by Character's debuff system
                // No direct stat reset here as it's handled by character.debuffs cleanup
                break;
        }
        character.secondaryAbilityEffect = null;


        // This block needs to be carefully managed if buffs/debuffs directly modify speed/defense.
        // The `applyBuff` and `applyDebuff` methods now handle the stat changes.
        // The original `character.speed = character.originalSpeed` logic is largely superseded by the new buff/debuff system.
        // This 'if' block below should generally NOT reset speed/defense directly if they were modified by buffs/debuffs.
        // However, some abilities might have temporary speed changes that aren't formal buffs (e.g. Charge for Tank).
        // For now, retaining a simplified version if the ability wasn't a formal buff/debuff, but the character.buffs/debuffs
        // system should take precedence.

        // Re-evaluate if this specific block is still needed, as buffs/debuffs should handle their own cleanup.
        // Keeping it for non-formal temporary speed/defense changes.
        if (abilityType !== 'honeycomb_stick' && abilityType !== 'volatile_concoction_stun' &&
            !character.buffs['spur_of_moment_speed_boost'] && !character.buffs['adrenaline_speed_boost'] && !character.buffs['phase_speed_boost'] &&
            !character.buffs['iron_skin_defense_boost'] && !character.buffs['elixir_defense_boost'] && !character.buffs['fortify_defense_boost']) {
             if (character.speed !== character.originalSpeed && character.originalSpeed !== undefined) {
                character.speed = character.originalSpeed;
                const newSpeedMagnitude = ORIGINAL_SPEED_MAGNITUDE * character.speed * CHARACTER_SCALE_FACTOR;
                const currentAngle = Math.atan2(character.dy, character.dx);
                character.dx = Math.cos(currentAngle) * newSpeedMagnitude;
                character.dy = Math.sin(currentAngle) * newSpeedMagnitude;
            }
             if (character.defense !== character.originalDefense && character.originalDefense !== undefined) {
                character.defense = character.originalDefense;
            }
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
        if (target !== queenBee && target.isAlive && !target.isPhasing && !target.isDummy && !target.isStunned) {
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