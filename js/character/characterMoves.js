// js/character/characterMoves.js

import {
    MOVE_COOLDOWN,
    MEDIC_PATCH_COOLDOWN,
    QUICKDRAW_HIT_CHANCE,
    GHOST_BOO_DAMAGE,
    SWARM_BEE_DAMAGE_PER_TICK,
    SWARM_DURATION_FRAMES,
    VOLATILE_CONCOCTION_PROJECTILE_SPEED,
    VOLATILE_CONCOCTION_EXPLOSION_RADIUS,
    VOLATILE_CONCOCTION_DAMAGE,
    VOLATILE_CONCOCTION_HEAL,
    VOLATILE_CONCOCTION_STUN_DURATION_FRAMES,
    IS_BOSS_MODE // Keep IS_BOSS_MODE import
} from '../config.js';
import { displayMessage } from '../utils/displayUtils.js';
import { checkDistance } from '../utils/mathUtils.js';
import { handleSecondaryAbility, updateAbilityEffect } from './characterAbilities.js'; // Ensure handleSecondaryAbility is imported if needed

// Mini-bee image for Queen Bee's swarm
const miniBeeImage = new Image();
miniBeeImage.src = './sprites/mini_bee.png';

/**
 * Handles the activation of a character's special move.
 * @param {Character} character - The character performing the move.
 * @param {Array<Character>} allCharacters - All characters in the game.
 * @param {number} CHARACTER_SCALE_FACTOR - The current scaling factor for characters.
 */
export function handleSpecialMove(character, allCharacters, CHARACTER_SCALE_FACTOR) {
    if (Date.now() - character.lastMoveTime < MOVE_COOLDOWN) {
        return; // Move is on cooldown
    }

    // Determine the target for abilities/moves. This logic is crucial for boss mode.
    let targetForAttack = null;
    let minDistanceForAttack = Infinity;

    if (IS_BOSS_MODE.ENABLED) {
        if (character.isBoss) { // Boss targets players
            allCharacters.forEach(otherChar => {
                if (otherChar !== character && !otherChar.isBoss && otherChar.isAlive) {
                    const dist = checkDistance(character, otherChar);
                    if (dist < minDistanceForAttack) {
                        minDistanceForAttack = dist;
                        targetForAttack = otherChar;
                    }
                }
            });
        } else { // Player targets boss
            allCharacters.forEach(otherChar => {
                if (otherChar.isBoss && otherChar.isAlive) {
                    const dist = checkDistance(character, otherChar);
                    if (dist < minDistanceForAttack) {
                        minDistanceForAttack = dist;
                        targetForAttack = otherChar;
                    }
                }
            });
        }
    } else { // Simulator Mode - target any other character
        allCharacters.forEach(otherChar => {
            if (otherChar !== character && otherChar.isAlive) {
                const dist = checkDistance(character, otherChar);
                if (dist < minDistanceForAttack) {
                    minDistanceForAttack = dist;
                    targetForAttack = otherChar;
                }
            }
        });
    }

    // If there's no valid target, don't use the move (especially important for focused boss mode)
    // Alchemist is an exception as its potion can be used without direct target (for self-heal or area effect)
    if (IS_BOSS_MODE.ENABLED && !targetForAttack && character.name !== 'Alchemist') {
        return;
    }


    character.lastMoveTime = Date.now();
    character.moveActive = true;

    switch (character.moveType) {
        case 'confetti':
            displayMessage(`${character.name} throws Confetti!`);
            character.moveEffect = {
                type: 'confetti',
                particles: [],
                duration: 30, // frames
                strength: 5, // how many particles
                spread: 30 // how far they spread
            };
            for (let i = 0; i < character.moveEffect.strength; i++) {
                character.moveEffect.particles.push({
                    x: character.x + character.width / 2,
                    y: character.y + character.height / 2,
                    dx: (Math.random() - 0.5) * character.moveEffect.spread,
                    dy: (Math.random() - 0.5) * character.moveEffect.spread,
                    color: `hsl(${Math.random() * 360}, 100%, 50%)`,
                    alpha: 1
                });
            }
            break;
        case 'baguette':
            displayMessage(`${character.name} swings a Baguette!`);
            character.moveEffect = {
                type: 'baguette',
                duration: 15, // frames
                angle: targetForAttack ? Math.atan2(targetForAttack.y - character.y, targetForAttack.x - character.x) : Math.random() * Math.PI * 2,
                targetsHit: [] // To prevent multiple hits per swing
            };
            break;
        case 'quickdraw':
            displayMessage(`${character.name} attempts a Quick Draw!`);
            character.moveEffect = {
                type: 'quickdraw_projectile',
                x: character.x + character.width / 2,
                y: character.y + character.height / 2,
                angle: targetForAttack ? Math.atan2(targetForAttack.y - character.y, targetForAttack.x - character.x) : Math.random() * Math.PI * 2,
                speed: 15 * CHARACTER_SCALE_FACTOR,
                beamLength: 50 * CHARACTER_SCALE_FACTOR,
                beamWidth: 5 * CHARACTER_SCALE_FACTOR,
                duration: 30, // frames until projectile dissipates
                hasHit: false // Prevents multiple hits from one projectile
            };
            break;
        case 'staticshock':
            displayMessage(`${character.name} emits a Static Shock!`);
            character.moveEffect = {
                type: 'staticshock',
                radius: 0,
                maxRadius: character.width * 2,
                duration: 20, // frames
                tickDamage: 1
            };
            break;
        case 'patch':
            if (Date.now() - character.lastPatchTime > MEDIC_PATCH_COOLDOWN) {
                displayMessage(`${character.name} applies a Patch!`);
                character.heal(character.maxHealth * 0.3); // Heals for 30% of max health
                character.lastPatchTime = Date.now();
                character.moveEffect = {
                    type: 'patch',
                    duration: 20, // Visual duration
                    alpha: 1
                };
            } else {
                character.moveActive = false; // Don't activate if on cooldown
            }
            break;
        case 'shuriken':
            displayMessage(`${character.name} throws a Shuriken!`);
            character.moveEffect = {
                type: 'shuriken',
                x: character.x + character.width / 2,
                y: character.y + character.height / 2,
                dx: 0,
                dy: 0,
                speed: 10 * CHARACTER_SCALE_FACTOR,
                angle: targetForAttack ? Math.atan2(targetForAttack.y - character.y, targetForAttack.x - character.x) : Math.random() * Math.PI * 2,
                duration: 60 // frames
            };
            character.moveEffect.dx = Math.cos(character.moveEffect.angle) * character.moveEffect.speed;
            character.moveEffect.dy = Math.sin(character.moveEffect.angle) * character.moveEffect.speed;
            break;
        case 'fireball':
            displayMessage(`${character.name} casts Fireball!`);
            character.moveEffect = {
                type: 'fireball',
                x: character.x + character.width / 2,
                y: character.y + character.height / 2,
                dx: 0,
                dy: 0,
                radius: 10 * CHARACTER_SCALE_FACTOR,
                speed: 8 * CHARACTER_SCALE_FACTOR,
                angle: targetForAttack ? Math.atan2(targetForAttack.y - character.y, targetForAttack.x - character.x) : Math.random() * Math.PI * 2,
                duration: 60, // frames
                damage: 40 + character.attack * 0.5,
                hasHit: false
            };
            character.moveEffect.dx = Math.cos(character.moveEffect.angle) * character.moveEffect.speed;
            character.moveEffect.dy = Math.sin(character.moveEffect.angle) * character.moveEffect.speed;
            break;
        case 'charge':
            displayMessage(`${character.name} charges!`);
            character.moveEffect = {
                type: 'charge',
                duration: 30, // frames
                originalSpeed: character.speed,
                speedBoost: 3, // Multiplier
                damageOnHit: 30 + character.attack * 0.7,
                targetsHit: [] // To prevent multiple hits per charge
            };
            character.speed *= character.moveEffect.speedBoost;
            // Aim towards targetForAttack if available, otherwise continue current direction
            if (targetForAttack) {
                const angle = Math.atan2(targetForAttack.y - character.y, targetForAttack.x - character.x);
                character.dx = Math.cos(angle) * character.speed * CHARACTER_SCALE_FACTOR;
                character.dy = Math.sin(angle) * character.speed * CHARACTER_SCALE_FACTOR;
            } else {
                character.dx = (character.dx > 0 ? 1 : -1) * character.speed * CHARACTER_SCALE_FACTOR;
                character.dy = (character.dy > 0 ? 1 : -1) * character.speed * CHARACTER_SCALE_FACTOR;
            }
            break;
        case 'boo':
            displayMessage(`${character.name} says BOO!`);
            character.moveEffect = {
                type: 'boo_effect',
                radius: character.width * 0.5, // Initial radius
                maxRadius: character.width * 2.5, // Max radius
                duration: 30, // frames
                damage: GHOST_BOO_DAMAGE + character.attack * 0.3,
                targetsHit: [] // Prevents multiple hits
            };
            break;
        case 'swarm':
            displayMessage(`${character.name} unleashes a Swarm of Bees!`);
            character.moveEffect = {
                type: 'swarm',
                duration: SWARM_DURATION_FRAMES, // frames
                bees: [],
                damagePerTick: SWARM_BEE_DAMAGE_PER_TICK // Damage each bee deals
            };
            // Create a few mini-bees that follow the Queen Bee initially
            for (let i = 0; i < 5; i++) {
                character.moveEffect.bees.push({
                    x: character.x + Math.random() * character.width,
                    y: character.y + Math.random() * character.height,
                    size: 10 * CHARACTER_SCALE_FACTOR,
                    image: miniBeeImage,
                    targetsHit: new Set() // Track targets for this specific bee
                });
            }
            break;
        case 'feeding_frenzy':
            displayMessage(`${character.name} enters a Feeding Frenzy!`);
            character.moveEffect = {
                type: 'feeding_frenzy',
                duration: FEEDING_FRENZY_DURATION_FRAMES, // frames
                originalAttack: character.attack,
                originalSpeed: character.speed,
                attackBoost: character.attack * 0.5, // Add 50% of attack as boost
                speedBoost: 1.5, // 50% speed boost
                targetsHitRecently: new Set() // Tracks who was hit in the last second
            };
            character.attack += character.moveEffect.attackBoost;
            character.speed *= character.moveEffect.speedBoost;
            // Update character's actual movement speed based on new speed
            const currentAngleFrenzy = Math.atan2(character.dy, character.dx);
            const newSpeedMagnitudeFrenzy = character.speed * CHARACTER_SCALE_FACTOR;
            character.dx = Math.cos(currentAngleFrenzy) * newSpeedMagnitudeFrenzy;
            character.dy = Math.sin(currentAngleFrenzy) * newSpeedMagnitudeFrenzy;
            break;
        case 'volatile_concoction':
            displayMessage(`${character.name} throws a Volatile Concoction!`);
            const potionType = Math.random() < 0.33 ? 'damage' : (Math.random() < 0.5 ? 'heal' : 'stun'); // Damage, Heal, or Stun
            let potionColor;
            if (potionType === 'damage') potionColor = 'red';
            else if (potionType === 'heal') potionColor = 'green';
            else potionColor = 'purple';

            character.moveEffect = {
                type: 'volatile_projectile',
                x: character.x + character.width / 2,
                y: character.y + character.height / 2,
                dx: 0,
                dy: 0,
                radius: 10 * CHARACTER_SCALE_FACTOR,
                speed: VOLATILE_CONCOCTION_PROJECTILE_SPEED * CHARACTER_SCALE_FACTOR,
                angle: targetForAttack ? Math.atan2(targetForAttack.y - character.y, targetForAttack.x - character.x) : Math.random() * Math.PI * 2,
                duration: 90, // frames before explosion
                explosionRadius: VOLATILE_CONCOCTION_EXPLOSION_RADIUS * CHARACTER_SCALE_FACTOR,
                potionType: potionType,
                color: potionColor,
                hasExploded: false
            };
            character.moveEffect.dx = Math.cos(character.moveEffect.angle) * character.moveEffect.speed;
            character.moveEffect.dy = Math.sin(character.moveEffect.angle) * character.moveEffect.speed;
            break;
    }
}

/**
 * Updates the effects of an active special move.
 * @param {Character} character - The character whose move effect is being updated.
 * @param {Array<Character>} allCharacters - All characters in the game.
 * @param {number} CHARACTER_SCALE_FACTOR - The current scaling factor for characters.
 * @param {HTMLCanvasElement} canvas - The game canvas.
 */
export function updateMoveEffect(character, allCharacters, CHARACTER_SCALE_FACTOR, canvas) {
    if (!character.moveActive || !character.moveEffect) return;

    character.moveEffect.duration--;

    if (character.moveEffect.type === 'confetti') {
        character.moveEffect.particles.forEach(p => {
            p.x += p.dx;
            p.y += p.dy;
            p.alpha -= 1 / 30; // Fade out over duration
        });
        if (character.moveEffect.duration > 0) {
            allCharacters.forEach(target => {
                // Determine if this target is valid based on game mode and caster
                // For Confetti, it hits anyone. If you want it not to hit friendly players, add that.
                // For now, it's an AoE.
                let isValidTarget = true;
                if (IS_BOSS_MODE.ENABLED) {
                    isValidTarget = (character.isBoss !== target.isBoss); // Player confetti hits boss, boss confetti hits players
                } else {
                    isValidTarget = (target !== character); // In simulator, it hits anyone but self
                }

                if (target.isAlive && isValidTarget && !target.isPhasing && !character.moveEffect.targetsHitRecently && checkDistance(character, target) < character.width * 1.5) { // Assuming AoE around caster
                    // Small damage if Confetti is meant to do damage
                    // target.takeDamage(1, character.attack, character.name, allCharacters);
                    // character.damageDealt += 1;
                    // Note: If Confetti is purely visual/non-damaging, remove this section.
                }
            });
        }
    } else if (character.moveEffect.type === 'baguette') {
        if (character.moveEffect.duration > 0) {
            allCharacters.forEach(target => {
                // Determine if this target is valid based on game mode and caster
                const isValidTarget = IS_BOSS_MODE.ENABLED ? (character.isBoss !== target.isBoss) : (target !== character);

                if (target.isAlive && isValidTarget && !target.isPhasing && !character.moveEffect.targetsHit.includes(target.name)) {
                    const dist = checkDistance(character, target);
                    const hitRange = character.width * 1.0; // Baguette melee range
                    if (dist < hitRange) {
                        const damage = 15 + character.attack * 0.5;
                        target.takeDamage(damage, character.attack, character.name, allCharacters);
                        character.damageDealt += damage;
                        displayMessage(`${character.name}'s Baguette hit ${target.name}!`);
                        character.moveEffect.targetsHit.push(target.name);
                    }
                }
            });
        }
    } else if (character.moveEffect.type === 'quickdraw_projectile') {
        const projectile = character.moveEffect;
        projectile.x += Math.cos(projectile.angle) * projectile.speed;
        projectile.y += Math.sin(projectile.angle) * projectile.speed;

        if (projectile.duration > 0 && !projectile.hasHit) {
            allCharacters.forEach(target => {
                // Determine if this target is valid based on game mode and caster
                const isValidTarget = IS_BOSS_MODE.ENABLED ? (character.isBoss !== target.isBoss) : (target !== character);

                if (target.isAlive && isValidTarget && !target.isPhasing && Math.random() < QUICKDRAW_HIT_CHANCE) {
                    const dist = checkDistance({x: projectile.x, y: projectile.y, width: 0, height: 0}, target);
                    if (dist < target.width / 2) {
                        const damage = 50 + character.attack * 1.0;
                        target.takeDamage(damage, character.attack, character.name, allCharacters);
                        character.damageDealt += damage;
                        displayMessage(`${character.name}'s Quick Draw HIT ${target.name}!`);
                        projectile.hasHit = true; // Mark as hit
                    }
                }
            });
        }
    } else if (character.moveEffect.type === 'staticshock') {
        character.moveEffect.radius = character.moveEffect.maxRadius * (1 - (character.moveEffect.duration / 20)); // Expands then contracts
        if (character.moveEffect.duration > 0) {
            allCharacters.forEach(target => {
                // Determine if this target is valid based on game mode and caster
                const isValidTarget = IS_BOSS_MODE.ENABLED ? (character.isBoss !== target.isBoss) : (target !== character);

                if (target.isAlive && isValidTarget && !target.isPhasing && checkDistance(character, target) < character.moveEffect.radius) {
                    target.health -= character.moveEffect.tickDamage;
                    character.damageDealt += character.moveEffect.tickDamage;
                    if (target.health <= 0) {
                        target.health = 0;
                        target.isAlive = false;
                        target.deathTime = performance.now();
                        displayMessage(`${target.name} was defeated by ${character.name}'s Static Shock!`);
                        character.kills++;
                    }
                }
            });
        }
    } else if (character.moveEffect.type === 'patch') {
        character.moveEffect.alpha -= 1 / 20;
    } else if (character.moveEffect.type === 'shuriken') {
        const projectile = character.moveEffect;
        projectile.x += projectile.dx;
        projectile.y += projectile.dy;

        if (projectile.duration > 0 && !projectile.hasHit) {
            allCharacters.forEach(target => {
                // Determine if this target is valid based on game mode and caster
                const isValidTarget = IS_BOSS_MODE.ENABLED ? (character.isBoss !== target.isBoss) : (target !== character);

                if (target.isAlive && isValidTarget && !target.isBlockingShuriken && !target.isPhasing) {
                    const dist = checkDistance({ x: projectile.x, y: projectile.y, width: 0, height: 0 }, target);
                    if (dist < target.width / 2) {
                        const damage = 25;
                        target.takeDamage(damage, character.attack, character.name, allCharacters);
                        character.damageDealt += damage;
                        displayMessage(`${character.name}'s Shuriken hit ${target.name}!`);
                        projectile.hasHit = true;
                    }
                }
            });
        }
    } else if (character.moveEffect.type === 'fireball') {
        const projectile = character.moveEffect;
        projectile.x += projectile.dx;
        projectile.y += projectile.dy;

        if (projectile.duration > 0 && !projectile.hasHit) {
            allCharacters.forEach(target => {
                // Determine if this target is valid based on game mode and caster
                const isValidTarget = IS_BOSS_MODE.ENABLED ? (character.isBoss !== target.isBoss) : (target !== character);

                if (target.isAlive && isValidTarget && !target.isPhasing) {
                    const dist = checkDistance({ x: projectile.x, y: projectile.y, width: 0, height: 0 }, target);
                    if (dist < target.width / 2) {
                        target.takeDamage(projectile.damage, character.attack, character.name, allCharacters);
                        character.damageDealt += projectile.damage;
                        displayMessage(`${character.name}'s Fireball hit ${target.name}!`);
                        projectile.hasHit = true;
                    }
                }
            });
        }
    } else if (character.moveEffect.type === 'charge') {
        if (character.moveEffect.duration > 0) {
            allCharacters.forEach(target => {
                // Determine if this target is valid based on game mode and caster
                const isValidTarget = IS_BOSS_MODE.ENABLED ? (character.isBoss !== target.isBoss) : (target !== character);

                if (target.isAlive && isValidTarget && !target.isPhasing && !character.moveEffect.targetsHit.includes(target.name)) {
                    const dist = checkDistance(character, target);
                    if (dist < character.width / 2 + target.width / 2) { // Collision detection
                        target.takeDamage(character.moveEffect.damageOnHit, character.attack, character.name, allCharacters);
                        character.damageDealt += character.moveEffect.damageOnHit;
                        displayMessage(`${character.name} charged into ${target.name}!`);
                        character.moveEffect.targetsHit.push(target.name);
                    }
                }
            });
        }
    } else if (character.moveEffect.type === 'boo_effect') {
        character.moveEffect.radius += 2 * CHARACTER_SCALE_FACTOR; // Expand radius
        if (character.moveEffect.duration > 0) {
            allCharacters.forEach(target => {
                // Determine if this target is valid based on game mode and caster
                const isValidTarget = IS_BOSS_MODE.ENABLED ? (character.isBoss !== target.isBoss) : (target !== character);

                if (target.isAlive && isValidTarget && !target.isPhasing && !character.moveEffect.targetsHit.includes(target.name)) {
                    const dist = checkDistance(character, target);
                    if (dist < character.moveEffect.radius) {
                        target.takeDamage(character.moveEffect.damage, character.attack, character.name, allCharacters);
                        character.damageDealt += character.moveEffect.damage;
                        displayMessage(`${character.name}'s Boo scared ${target.name}!`);
                        character.moveEffect.targetsHit.push(target.name);
                    }
                }
            });
        }
    } else if (character.moveEffect.type === 'swarm') {
        if (character.moveEffect.duration > 0) {
            const queenBeeCenter = { x: character.x + character.width / 2, y: character.y + character.height / 2 };
            character.moveEffect.bees.forEach(bee => {
                const dx = queenBeeCenter.x - bee.x;
                const dy = queenBeeCenter.y - bee.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 5 * CHARACTER_SCALE_FACTOR) {
                    const angle = Math.atan2(dy, dx);
                    bee.x += Math.cos(angle) * (2 * CHARACTER_SCALE_FACTOR);
                    bee.y += Math.sin(angle) * (2 * CHARACTER_SCALE_FACTOR);
                } else {
                    bee.x += (Math.random() - 0.5) * (1 * CHARACTER_SCALE_FACTOR);
                    bee.y += (Math.random() - 0.5) * (1 * CHARACTER_SCALE_FACTOR);
                }

                bee.x = Math.max(0, Math.min(bee.x, canvas.width - bee.size));
                bee.y = Math.max(0, Math.min(bee.y, canvas.height - bee.size));


                allCharacters.forEach(target => {
                    // Determine if this target is valid based on game mode and caster
                    const isValidTarget = IS_BOSS_MODE.ENABLED ? (character.isBoss !== target.isBoss) : (target !== character);

                    if (target.isAlive && isValidTarget && !target.isPhasing && !bee.targetsHit.has(target.name) && Date.now() % 100 < 5) {
                        const dist = checkDistance({ x: bee.x, y: bee.y, width: bee.size, height: bee.size }, target);
                        if (dist < target.width / 2 + bee.size / 2) {
                            target.takeDamage(character.moveEffect.damagePerTick, character.attack, character.name, allCharacters);
                            character.damageDealt += character.moveEffect.damagePerTick;
                            displayMessage(`${target.name} was stung by ${character.name}'s bees!`);
                            bee.targetsHit.add(target.name);
                        }
                    }
                });
            });
        }
    } else if (character.moveEffect.type === 'feeding_frenzy') {
        // No direct damage from this move effect.
    } else if (character.moveEffect.type === 'volatile_projectile') {
        const projectile = character.moveEffect;
        projectile.x += projectile.dx;
        projectile.y += projectile.dy;

        // Check for collision with ANY valid target or end of duration to trigger explosion
        let hitTarget = false;
        allCharacters.forEach(target => {
            // Determine if this target is valid based on game mode and caster
            // The explosion will handle the specific effects (damage/heal/stun) based on isValidTarget
            const isValidTargetForExplosion = IS_BOSS_MODE.ENABLED ? (character.isBoss !== target.isBoss) : (target !== character);

            if (target.isAlive && isValidTargetForExplosion && !target.isPhasing) {
                const dist = checkDistance({ x: projectile.x, y: projectile.y, width: 0, height: 0 }, target);
                if (dist < target.width / 2 + projectile.radius) {
                    hitTarget = true;
                }
            }
        });

        if (projectile.duration <= 0 || hitTarget) {
            // Explosion logic
            character.moveEffect = {
                type: 'volatile_explosion',
                x: projectile.x,
                y: projectile.y,
                radius: 0,
                maxRadius: projectile.explosionRadius,
                duration: 15,
                alpha: 1,
                potionType: projectile.potionType,
                color: projectile.color,
                targetsHit: new Set()
            };
            displayMessage(`Concoction explodes for ${projectile.potionType}!`);

            // Apply effects based on potionType
            allCharacters.forEach(target => {
                // Determine if this target is valid based on game mode and caster
                const isValidTargetForEffect = IS_BOSS_MODE.ENABLED ? (character.isBoss !== target.isBoss) : (target !== character);

                if (target.isAlive && isValidTargetForEffect && !target.isPhasing) {
                    const dist = checkDistance({ x: projectile.x, y: projectile.y, width: 0, height: 0 }, target);
                    if (dist < projectile.explosionRadius && !character.moveEffect.targetsHit.has(target.name)) {
                        if (projectile.potionType === 'damage') {
                            target.takeDamage(VOLATILE_CONCOCTION_DAMAGE, character.attack, character.name, allCharacters);
                            character.damageDealt += VOLATILE_CONCOCTION_DAMAGE;
                        } else if (projectile.potionType === 'heal') {
                            target.heal(VOLATILE_CONCOCTION_HEAL);
                            character.healingDone += VOLATILE_CONCOCTION_HEAL;
                        } else if (projectile.potionType === 'stun') {
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
                                displayMessage(`${target.name} is stunned!`);
                            }
                        }
                        character.moveEffect.targetsHit.add(target.name);
                    }
                }
            });
        }
    } else if (character.moveEffect.type === 'volatile_explosion') {
        const explosion = character.moveEffect;
        explosion.radius = explosion.maxRadius * (1 - (explosion.duration / 15));
        explosion.alpha = explosion.duration / 15;
    }


    // End move if duration runs out or specific conditions are met
    if (character.moveEffect.duration <= 0) {
        if (character.moveEffect.type === 'charge') {
            character.speed = character.moveEffect.originalSpeed;
            const currentAngle = Math.atan2(character.dy, character.dx);
            const newSpeedMagnitude = character.speed * CHARACTER_SCALE_FACTOR;
            character.dx = Math.cos(currentAngle) * newSpeedMagnitude;
            character.dy = Math.sin(currentAngle) * newSpeedMagnitude;
        } else if (character.moveEffect.type === 'feeding_frenzy') {
            character.attack = character.moveEffect.originalAttack;
            character.speed = character.moveEffect.originalSpeed;
            const currentAngle = Math.atan2(character.dy, character.dx);
            const newSpeedMagnitude = character.speed * CHARACTER_SCALE_FACTOR;
            character.dx = Math.cos(currentAngle) * newSpeedMagnitude;
            character.dy = Math.sin(currentAngle) * newSpeedMagnitude;
        } else if (character.moveEffect.type === 'shuriken' || character.moveEffect.type === 'fireball' || character.moveEffect.type === 'quickdraw_projectile') {
            // Projectiles disappear after duration, regardless of hit
        }

        character.moveActive = false;
        character.moveEffect = null;
    }
}