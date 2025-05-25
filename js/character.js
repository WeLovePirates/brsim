// js/character.js

// Access global constants and functions from window.GameUtils
// We don't need imports here, as the browser will look for these in the global scope
// after config.js and utils.js are loaded.

class Character {
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
        this.lastPatchTime = 0;

        this.secondaryAbilityType = secondaryAbilityType;
        // FIX: Corrected typo from secondaryCoooldown to secondaryAbilityCooldown
        this.secondaryAbilityCooldown = secondaryAbilityCooldown;
        this.lastSecondaryAbilityTime = 0;
        this.secondaryAbilityActive = false;
        this.secondaryAbilityEffect = null;
        this.originalSpeed = this.speed;
        this.originalDefense = this.defense;
        this.isBlockingShuriken = false;

        this.isDodging = false;
        this.dodgeDirectionAngle = 0;
        this.lastDodgeDirectionChangeTime = 0;
        // Added properties for Ghost abilities
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

    update(characters, CHARACTER_SCALE_FACTOR) {
        if (!this.isAlive) return;

        let nearestOpponent = null;
        let minDistance = Infinity;
        const currentCharacter = this;

        characters.forEach(otherChar => {
            if (otherChar !== currentCharacter && otherChar.isAlive) {
                // Use global GameUtils.checkDistance
                const dist = GameUtils.checkDistance(currentCharacter, otherChar);
                if (dist < minDistance) {
                    minDistance = dist;
                    nearestOpponent = otherChar;
                }
            }
        });

        const currentTime = Date.now();
        let appliedMovement = false;
        const aliveCharacters = characters.filter(char => char.isAlive);
        // Use global LOW_HEALTH_THRESHOLD and ALL_LOW_HEALTH_RUSH_CHANCE
        const allLowHealth = aliveCharacters.every(char => char.health <= char.maxHealth * LOW_HEALTH_THRESHOLD);

        // Apply movement logic only if not phasing (phasing might have its own movement logic or just allow free movement)
        // For now, let's assume phasing just makes them ignore collisions/damage, not change movement pattern significantly
        if (!this.isPhasing) {
             if (allLowHealth && nearestOpponent && Math.random() < ALL_LOW_HEALTH_RUSH_CHANCE) {
                const targetX = nearestOpponent.x + nearestOpponent.width / 2;
                const targetY = nearestOpponent.y + nearestOpponent.height / 2;
                const currentX = this.x + this.width / 2;
                const currentY = this.y + this.height / 2;

                const angleToTarget = Math.atan2(targetY - currentY, targetX - currentX);

                // Use global ORIGINAL_SPEED_MAGNITUDE
                const rushSpeed = ORIGINAL_SPEED_MAGNITUDE * this.speed * CHARACTER_SCALE_FACTOR * 1.2;
                this.dx = Math.cos(angleToTarget) * rushSpeed;
                this.dy = Math.sin(angleToTarget) * rushSpeed;
                appliedMovement = true;
                this.isDodging = false;
            } else if (this.health <= this.maxHealth * LOW_HEALTH_THRESHOLD && Math.random() < DODGE_CHANCE) {
                // Add boost from Smoke Bomb or Invisibility if active
                const currentDodgeChance = DODGE_CHANCE + (this.dodgeChanceBoost || 0) + (this.isInvisible ? INVISIBILITY_DODGE_BOOST : 0);

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

        // Boundary checks - Phasing characters might ignore these?
        // Let's assume phasing characters still stay within bounds but don't bounce
        if (this.x + this.width > this.canvas.width || this.x < 0) {
            if (!this.isPhasing) {
                this.dx *= -1;
            }
            this.x = Math.max(0, Math.min(this.x, this.canvas.width - this.width));
            if (this.isDodging) {
                this.lastDodgeDirectionChangeTime = 0;
            }
        }
        if (this.y + this.height > this.canvas.height || this.y < 0) {
            if (!this.isPhasing) {
                this.dy *= -1;
            }
            this.y = Math.max(0, Math.min(this.y, this.canvas.height - this.height));
            if (this.isDodging) {
                this.lastDodgeDirectionChangeTime = 0;
            }
        }

        if (Date.now() - this.lastMoveTime > MOVE_COOLDOWN) {
            this.useSpecialMove(characters, CHARACTER_SCALE_FACTOR);
        }

        if (Date.now() - this.lastSecondaryAbilityTime > this.secondaryAbilityCooldown) {
            this.useSecondaryAbility(characters, CHARACTER_SCALE_FACTOR);
        }

        if (this.moveActive && this.moveEffect) {
            switch (this.moveType) {
                case 'confetti':
                    this.moveEffect.particles.forEach(p => {
                        p.x += p.vx;
                        p.y += p.vy;
                        p.alpha -= 0.03;
                    });
                    this.moveEffect.particles = this.moveEffect.particles.filter(p => p.alpha > 0);
                    if (this.moveEffect.particles.length === 0) {
                        this.moveActive = false;
                        this.moveEffect = null;
                    }
                    break;
                case 'quickdraw': // This now handles the projectile's movement and collision
                    if (this.moveEffect.type === 'quickdraw_projectile') {
                        this.moveEffect.x += this.moveEffect.vx;
                        this.moveEffect.y += this.moveEffect.vy;
                        this.moveEffect.life--;

                        // Check for collision with other characters using a for...of loop for early exit
                        for (const target of characters) {
                            // Add check: Projectile does not hit phasing characters
                            if (target !== this && target.isAlive && !target.isPhasing) {
                                // Calculate the beam's current position for collision
                                const beamCurrentX = this.moveEffect.x;
                                const beamCurrentY = this.moveEffect.y;
                                const beamHalfWidth = this.moveEffect.beamWidth / 2;
                                const beamHalfLength = this.moveEffect.beamLength / 2;

                                // Simple AABB collision for the beam's current position (without rotation)
                                // This is a simplification for performance and to allow the hit chance
                                const beamLeft = beamCurrentX - beamHalfLength;
                                const beamRight = beamCurrentX + beamHalfLength;
                                const beamTop = beamCurrentY - beamHalfWidth;
                                const beamBottom = beamCurrentY + beamHalfWidth;

                                const targetLeft = target.x;
                                const targetRight = target.x + target.width;
                                const targetTop = target.y;
                                const targetBottom = target.y + target.height;

                                // Check for overlap
                                if (beamRight > targetLeft && beamLeft < targetRight &&
                                    beamBottom > targetTop && beamTop < targetBottom) {

                                    // Apply damage only if the random chance passes
                                    if (Math.random() < QUICKDRAW_HIT_CHANCE) { // Use the global constant
                                        const damage = 45;
                                        target.takeDamage(damage, this.attack, this.name, characters);
                                        this.damageDealt += damage;
                                        GameUtils.displayMessage(`${this.name}'s Quick Draw hit ${target.name} for ${damage} damage!`);
                                    } else {
                                        GameUtils.displayMessage(`${this.name}'s Quick Draw missed ${target.name}.`);
                                    }
                                    this.moveActive = false; // Projectile disappears on hit or miss
                                    this.moveEffect = null;
                                    break; // Exit the for...of loop as the projectile is gone
                                }
                            }
                        }

                        // After the loop, check if the projectile is still active before checking life/bounds
                        if (this.moveEffect && (this.moveEffect.life <= 0 ||
                            this.moveEffect.x < 0 || this.moveEffect.x > this.canvas.width ||
                            this.moveEffect.y < 0 || this.moveEffect.y > this.canvas.height)) {
                            this.moveActive = false;
                            this.moveEffect = null;
                        }
                    }
                    break;
                case 'staticshock':
                    this.moveEffect.radius += 3 * CHARACTER_SCALE_FACTOR;
                    if (this.moveEffect.radius > 80 * CHARACTER_SCALE_FACTOR) {
                        this.moveActive = false;
                        this.moveEffect = null;
                    }
                    break;
                case 'baguette':
                    this.moveEffect.angle += 0.2;
                    if (this.moveEffect.angle > this.moveEffect.startAngle + Math.PI * 1.2) {
                        this.moveActive = false;
                        this.moveEffect = null;
                    }
                    break;
                case 'patch':
                    this.moveEffect.alpha -= 0.05;
                    if (this.moveEffect.alpha <= 0) {
                        this.moveActive = false;
                        this.moveEffect = null;
                    }
                    break;
                case 'shuriken':
                    this.moveEffect.x += this.moveEffect.vx;
                    this.moveEffect.y += this.moveEffect.vy;
                    this.moveEffect.life--;
                    if (this.moveEffect.life <= 0) {
                        this.moveActive = false;
                        this.moveEffect = null;
                    }
                    break;
                case 'fireball':
                    this.moveEffect.radius += 5 * CHARACTER_SCALE_FACTOR;
                    this.moveEffect.alpha -= 0.02;
                    if (this.moveEffect.alpha <= 0) {
                        this.moveActive = false;
                        this.moveEffect = null;
                    }
                    break;
                case 'charge':
                    this.moveEffect.duration--;
                    if (this.moveEffect.duration <= 0) {
                        this.moveActive = false;
                        this.moveEffect = null;
                        this.speed = this.originalSpeed;
                        const newSpeedMagnitude = ORIGINAL_SPEED_MAGNITUDE * this.speed * CHARACTER_SCALE_FACTOR;
                        const currentAngle = Math.atan2(this.dy, this.dx);
                        this.dx = Math.cos(currentAngle) * newSpeedMagnitude;
                        this.dy = Math.sin(currentAngle) * newSpeedMagnitude;
                    }
                    break;
                case 'boo': // Ghost's special move
                    if (this.moveEffect && this.moveEffect.type === 'boo_effect') {
                        if (!this.moveEffect.appliedDamage) { // Apply damage once
                            characters.forEach(target => {
                                if (target !== this && target.isAlive && !target.isPhasing && GameUtils.checkDistance(this, target) < this.moveEffect.radius) {
                                    const damage = GHOST_BOO_DAMAGE; // Use the new constant for damage
                                    target.takeDamage(damage, this.attack, this.name, characters);
                                    this.damageDealt += damage;
                                }
                            });
                            this.moveEffect.appliedDamage = true;
                        }
                        this.moveEffect.duration--;
                        if (this.moveEffect.duration <= 0) {
                            this.moveActive = false;
                            this.moveEffect = null;
                        }
                    }
                    break;
            }
        }

        // Check if secondary ability is active and effect exists before processing
        if (this.secondaryAbilityActive && this.secondaryAbilityEffect) {
            // Only decrease duration for abilities that have a duration
            this.secondaryAbilityEffect.duration--;
            if (this.secondaryAbilityEffect.duration <= 0) {
                // Store the type before resetting the effect
                const abilityType = this.secondaryAbilityEffect.type;

                // Reset effects when duration ends
                this.secondaryAbilityActive = false;
                this.secondaryAbilityEffect = null;

                // Reset flags and stats based on the ability type that just ended
                switch (abilityType) {
                    case 'magic_shield':
                        this.isBlockingShuriken = false; // Reset shuriken block
                        break;
                    case 'phase':
                        this.isPhasing = false; // Reset phasing
                        // Speed reset for phase is handled below with originalSpeed
                        break;
                    case 'invisibility':
                        this.isInvisible = false; // Reset invisibility
                        this.ctx.globalAlpha = this.originalAlpha; // Restore original alpha
                        // Dodge chance boost from Invisibility is tied to isInvisible flag, no separate reset needed
                        break;
                    case 'iron_skin':
                        // Defense reset handled below with originalDefense
                        break;
                    case 'fortify':
                        // Defense reset handled below with originalDefense
                        break;
                    case 'spur_of_moment':
                    case 'adrenaline_shot':
                        // Speed reset handled below with originalSpeed
                        break;
                    case 'smoke_bomb':
                        this.dodgeChanceBoost = 0; // Reset dodge chance boost from Smoke Bomb
                        break;
                    // Slippery floor speed reset is handled by the timeout on the target,
                    // which is less ideal but matches the current pattern.
                    // Static field has no character-specific stats to reset.
                }

                // Reset stats that might have been boosted/reduced (if they weren't reset above)
                // This assumes originalSpeed and originalDefense store the values *before* any secondary ability buffs.
                // If multiple abilities could stack speed/defense, this reset logic would need refinement.
                this.speed = this.originalSpeed;
                this.defense = this.originalDefense;

                // Update speed vector if speed changed
                const newSpeedMagnitude = ORIGINAL_SPEED_MAGNITUDE * this.speed * CHARACTER_SCALE_FACTOR;
                const currentAngle = Math.atan2(this.dy, this.dx);
                this.dx = Math.cos(currentAngle) * newSpeedMagnitude;
                this.dy = Math.sin(currentAngle) * newSpeedMagnitude;
            }
        }
    }

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
            // Restore alpha for move effects if they have their own alpha
            this.ctx.globalAlpha = this.originalAlpha; // Start with default

            if (this.moveType === 'confetti') {
                this.ctx.save();
                this.ctx.globalAlpha = 0.6; // Confetti specific alpha
                this.moveEffect.particles.forEach(p => {
                    this.ctx.fillStyle = p.color;
                    this.ctx.globalAlpha = p.alpha; // Particle specific alpha
                    this.ctx.fillRect(p.x, p.y, 8 * CHARACTER_SCALE_FACTOR, 8 * CHARACTER_SCALE_FACTOR);
                });
                this.ctx.restore();
            } else if (this.moveType === 'quickdraw') { // Draw the Quick Draw projectile as a rectangular beam
                if (this.moveEffect.type === 'quickdraw_projectile') {
                    this.ctx.save(); // Save the current canvas state
                    this.ctx.translate(this.moveEffect.x, this.moveEffect.y); // Move origin to projectile center
                    this.ctx.rotate(this.moveEffect.angle); // Rotate to align with direction

                    this.ctx.fillStyle = 'orange'; // Color of the beam
                    // Draw the rectangle centered around the new origin (0,0)
                    this.ctx.fillRect(-this.moveEffect.beamLength / 2, -this.moveEffect.beamWidth / 2,
                                      this.moveEffect.beamLength, this.moveEffect.beamWidth);

                    this.ctx.restore(); // Restore the canvas state
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
                this.ctx.globalAlpha = this.moveEffect.alpha; // Patch specific alpha
                this.ctx.fillStyle = 'lightgreen';
                this.ctx.font = `${30 * CHARACTER_SCALE_FACTOR}px Inter`;
                this.ctx.textAlign = 'center';
                this.ctx.fillText('+', this.x + this.width / 2, this.y + this.height / 2 + 5 * CHARACTER_SCALE_FACTOR);
                this.ctx.globalAlpha = this.originalAlpha; // Restore default alpha
            } else if (this.moveType === 'shuriken') {
                this.ctx.fillStyle = 'gray';
                this.ctx.beginPath();
                this.ctx.arc(this.moveEffect.x, this.moveEffect.y, 8 * CHARACTER_SCALE_FACTOR, 0, Math.PI * 2);
                this.ctx.fill();
            } else if (this.moveType === 'fireball') {
                this.ctx.fillStyle = `rgba(255, 100, 0, ${this.moveEffect.alpha})`; // Fireball specific alpha
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
                    this.ctx.globalAlpha = 0.4 * (this.moveEffect.duration / 30); // Fading effect
                    this.ctx.fillStyle = 'rgba(200, 200, 255, 0.5)'; // Ghostly color
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
            // Use global SECONDARY_ABILITY_DURATION_FRAMES
            // Ensure SECONDARY_ABILITY_DURATION_FRAMES is not zero to avoid division by zero
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
                 case 'phase': // Visual for Phase
                    this.ctx.strokeStyle = `rgba(150, 0, 255, ${currentAlpha})`; // Purple outline
                    this.ctx.lineWidth = 4 * CHARACTER_SCALE_FACTOR;
                    this.ctx.beginPath();
                    this.ctx.arc(centerX, centerY, this.width / 2 + 5 * CHARACTER_SCALE_FACTOR, 0, Math.PI * 2);
                    this.ctx.stroke();
                    break;
                 case 'invisibility': // Visual for Invisibility (optional, transparency is the main effect)
                    // Maybe a faint shimmer? For now, transparency is enough.
                    break;
            }
        }
         // Ensure alpha is reset after drawing everything
        this.ctx.globalAlpha = this.originalAlpha;
    }

    takeDamage(baseAmount, attackerAttack, attackerName, allCharacters) {
        const currentTime = Date.now();
        // Use global HIT_COOLDOWN and GameUtils.displayMessage
        if (this.lastHitTime[attackerName] && (currentTime - this.lastHitTime[attackerName] < HIT_COOLDOWN)) {
            return;
        }

        // Add check: Phasing characters take no damage
        if (this.isPhasing) {
             GameUtils.displayMessage(`${this.name} phased through ${attackerName}'s attack!`);
             this.lastHitTime[attackerName] = currentTime; // Still apply cooldown to prevent spam messages
             return;
        }

        let effectiveDamage = Math.max(1, baseAmount + attackerAttack * 0.5 - this.defense * 0.5);

        // Added null check for this.secondaryAbilityEffect before accessing its properties
        if (this.secondaryAbilityActive && this.secondaryAbilityEffect) {
            if (this.secondaryAbilityEffect.type === 'iron_skin') {
                effectiveDamage *= 0.5;
            } else if (this.secondaryAbilityEffect.type === 'magic_shield') {
                effectiveDamage *= 0.6;
            } else if (this.secondaryAbilityEffect.type === 'fortify') {
                effectiveDamage *= 0.4;
            } else if (this.secondaryAbilityEffect.type === 'invisibility') {
                 // Use global constant INVISIBILITY_DAMAGE_REDUCTION
                 effectiveDamage *= INVISIBILITY_DAMAGE_REDUCTION; // Reduce damage when invisible
            }
        }

        this.health -= effectiveDamage;
        this.lastHitTime[attackerName] = currentTime;

        if (this.health <= 0) {
            this.health = 0;
            this.isAlive = false;
            this.deathTime = performance.now();
            GameUtils.displayMessage(`${this.name} has been defeated!`);
            const killer = allCharacters.find(char => char.name === attackerName);
            if (killer) {
                killer.kills++;
            }
        } else {
            GameUtils.displayMessage(`${this.name} took ${effectiveDamage.toFixed(0)} damage! Health: ${this.health.toFixed(0)}`);
        }
    }


    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
        this.healingDone += amount;
    }

    useSpecialMove(characters, CHARACTER_SCALE_FACTOR) {
        // Add check: Cannot use special move while phasing? Or maybe only certain moves?
        // Let's allow it for now, but it's a design choice.
        if (Math.random() < 0.02) {
            this.lastMoveTime = Date.now();
            this.moveActive = true;
            // const MOVE_DURATION = 100; // Removed as it's not consistently used here

            let nearestOpponent = null;
            let minDistance = Infinity;
            const currentCharacter = this;

            characters.forEach(otherChar => {
                if (otherChar !== currentCharacter && otherChar.isAlive) {
                    const dist = GameUtils.checkDistance(currentCharacter, otherChar);
                    if (dist < minDistance) {
                        minDistance = dist;
                        nearestOpponent = otherChar;
                    }
                }
            });

            switch (this.moveType) {
                case 'confetti':
                    this.moveEffect = { particles: [] };
                    for (let i = 0; i < 50; i++) {
                        this.moveEffect.particles.push({
                            x: this.x + Math.random() * this.width,
                            y: this.y + Math.random() * this.height,
                            vx: (Math.random() - 0.5) * 8 * CHARACTER_SCALE_FACTOR,
                            vy: (Math.random() - 0.5) * 8 * CHARACTER_SCALE_FACTOR,
                            alpha: 1,
                            color: `hsl(${Math.random() * 360}, 100%, 50%)`
                        });
                    }
                    characters.forEach(target => {
                        // Add check: Confetti doesn't affect phasing characters
                        if (target !== this && target.isAlive && !target.isPhasing && GameUtils.checkDistance(this, target) < this.width * 2.0) {
                            const damage = 15;
                            target.takeDamage(damage, this.attack, this.name, characters);
                            this.damageDealt += damage;
                            target.dx *= 0.7;
                            target.dy *= 0.7;
                            setTimeout(() => {
                                target.dx /= 0.7;
                                target.dy /= 0.7;
                            }, 1500);
                        }
                    });
                    GameUtils.displayMessage(`${this.name} used Confetti Blast!`);
                    GameUtils.playHitSound();
                    break;
                case 'baguette':
                    this.moveEffect = {
                        startAngle: Math.random() * Math.PI * 2,
                        angle: Math.random() * Math.PI * 2
                    };
                    this.moveActive = true;
                    const reach = this.width * 1.5;
                    characters.forEach(target => {
                        // Add check: Baguette doesn't affect phasing characters
                        if (target !== this && target.isAlive && !target.isPhasing) {
                            const dist = GameUtils.checkDistance(this, target);
                            if (dist < reach + target.width / 2) {
                                const damage = 20;
                                target.takeDamage(damage, this.attack, this.name, characters);
                                this.damageDealt += damage;
                            }
                        }
                    });
                    GameUtils.displayMessage(`${this.name} used Baguette Bash!`);
                    GameUtils.playHitSound();
                    break;
                case 'quickdraw': // Updated Quick Draw to be a traveling projectile
                    if (nearestOpponent) { // Only activate if there's a target
                        const projectileSpeed = 15 * CHARACTER_SCALE_FACTOR; // Make it fast
                        const angleToOpponent = Math.atan2(nearestOpponent.y + nearestOpponent.height / 2 - (this.y + this.height / 2),
                                                           nearestOpponent.x + nearestOpponent.width / 2 - (this.x + this.width / 2));
                        this.moveEffect = {
                            type: 'quickdraw_projectile', // Differentiate this effect
                            x: this.x + this.width / 2, // Start from center of character
                            y: this.y + this.height / 2,
                            vx: Math.cos(angleToOpponent) * projectileSpeed,
                            vy: Math.sin(angleToOpponent) * projectileSpeed,
                            life: 90, // Projectile lasts for 90 frames (~1.5 seconds)
                            beamLength: this.width * 2, // Length of the beam
                            beamWidth: 8 * CHARACTER_SCALE_FACTOR, // Width of the beam
                            angle: angleToOpponent // Angle for drawing the rotated rectangle
                        };
                        GameUtils.displayMessage(`${this.name} fired a Quick Draw shot!`);
                        GameUtils.playHitSound();
                    } else {
                        this.moveActive = false; // Don't activate if no opponent
                        this.moveEffect = null;
                    }
                    break;
                case 'staticshock':
                    this.moveEffect = { radius: 10 * CHARACTER_SCALE_FACTOR };
                    this.moveActive = true;
                    characters.forEach(target => {
                        // Add check: Static Shock doesn't affect phasing characters
                        if (target !== this && target.isAlive && !target.isPhasing && GameUtils.checkDistance(this, target) < 80 * CHARACTER_SCALE_FACTOR) {
                            const damage = 10;
                            target.takeDamage(damage, this.attack, this.name, characters);
                            this.damageDealt += damage;
                            target.dx *= 0.3;
                            target.dy *= 0.3;
                            setTimeout(() => {
                                target.dx /= 0.3;
                                target.dy /= 0.3;
                            }, 500);
                        }
                    });
                    GameUtils.displayMessage(`${this.name} used Static Shock!`);
                    GameUtils.playHitSound();
                    break;
                case 'patch':
                    // Use global MEDIC_PATCH_COOLDOWN and GameUtils.displayMessage
                    if (Date.now() - this.lastPatchTime < MEDIC_PATCH_COOLDOWN) {
                        this.moveActive = false;
                        this.moveEffect = null;
                        return;
                    }

                    this.moveEffect = { alpha: 1 };
                    const selfHealAmount = 10 + Math.random() * 8 + this.defense * 0.2;
                    this.heal(selfHealAmount);
                    GameUtils.displayMessage(`${this.name} used Quick Patch on themselves! Healed for ${selfHealAmount.toFixed(0)}.`);

                    if (Math.random() < 0.15) {
                        let nearestOpponentForPatch = null;
                        let minDistanceForPatch = Infinity;
                        const currentCharacterForPatch = this;

                        characters.forEach(otherChar => {
                            // Add check: Patch doesn't accidentally heal phasing characters
                            if (otherChar !== currentCharacterForPatch && otherChar.isAlive && !otherChar.isPhasing) {
                                const dist = GameUtils.checkDistance(currentCharacterForPatch, otherChar);
                                if (dist < minDistanceForPatch) {
                                    minDistanceForPatch = dist;
                                    nearestOpponentForPatch = otherChar;
                                }
                            }
                        });

                        if (nearestOpponentForPatch) {
                            const opponentHealAmount = 8 + Math.random() * 4 + this.defense * 0.1;
                            nearestOpponentForPatch.heal(opponentHealAmount);
                            GameUtils.displayMessage(`${this.name} accidentally healed ${nearestOpponentForPatch.name} for ${opponentHealAmount.toFixed(0)}!`);
                        }
                    }
                    GameUtils.playHitSound();
                    this.lastPatchTime = Date.now();
                    break;
                case 'shuriken':
                    if (nearestOpponent) {
                        const shurikenSpeed = 10 * CHARACTER_SCALE_FACTOR;
                        const angleToOpponent = Math.atan2(nearestOpponent.y - this.y, nearestOpponent.x - this.x);
                        this.moveEffect = {
                            x: this.x + this.width / 2,
                            y: this.y + this.height / 2,
                            vx: Math.cos(angleToOpponent) * shurikenSpeed,
                            vy: Math.sin(angleToOpponent) * shurikenSpeed,
                            life: 60
                        };
                        GameUtils.displayMessage(`${this.name} threw a Shuriken!`);
                        GameUtils.playHitSound();
                        // Add check: Shuriken doesn't hit phasing characters
                        if (GameUtils.checkDistance(this, nearestOpponent) < this.width * 1.5 && !nearestOpponent.isBlockingShuriken && !nearestOpponent.isPhasing) {
                            const damage = 25;
                            nearestOpponent.takeDamage(damage, this.attack, this.name, characters);
                            this.damageDealt += damage;
                            this.moveActive = false;
                            this.moveEffect = null;
                        }
                    } else {
                        this.moveActive = false;
                        this.moveEffect = null;
                    }
                    break;
                case 'fireball':
                    if (nearestOpponent) {
                        this.moveEffect = { radius: 10 * CHARACTER_SCALE_FACTOR, alpha: 1 };
                        GameUtils.displayMessage(`${this.name} cast Fireball!`);
                        GameUtils.playHitSound();
                        characters.forEach(target => {
                            // Add check: Fireball doesn't affect phasing characters
                            if (target !== this && target.isAlive && !target.isPhasing && GameUtils.checkDistance(this, target) < 100 * CHARACTER_SCALE_FACTOR) {
                                const damage = 35;
                                target.takeDamage(damage, this.attack, this.name, characters);
                                this.damageDealt += damage;
                            }
                        });
                    } else {
                        this.moveActive = false;
                        this.moveEffect = null;
                    }
                    break;
                case 'charge':
                    if (nearestOpponent) {
                        this.moveEffect = { duration: 90 };
                        this.speed *= 2.5;
                        GameUtils.displayMessage(`${this.name} initiated a Charge!`);
                        GameUtils.playHitSound();
                    } else {
                        this.moveActive = false;
                        this.moveEffect = null;
                    }
                    break;
                case 'boo': // Ghost's new special move
                    this.moveEffect = {
                        type: 'boo_effect',
                        radius: this.width * 2.0, // Area of effect
                        duration: 30, // Visual effect duration in frames
                        appliedDamage: false // To ensure damage is applied only once
                    };
                    GameUtils.displayMessage(`${this.name} lets out a spectral cry!`);
                    GameUtils.playHitSound();
                    break;
            }
        }
    }

    useSecondaryAbility(characters, CHARACTER_SCALE_FACTOR) {
        // Add check: Cannot use secondary ability if one is already active
        if (this.secondaryAbilityActive) {
            return;
        }

        if (Math.random() < 0.015) {
            this.lastSecondaryAbilityTime = Date.now();
            this.secondaryAbilityActive = true;
            // isBlockingShuriken is specific to Magic Shield, move it inside the switch
            // this.isBlockingShuriken = true;

            switch (this.secondaryAbilityType) {
                case 'slippery_floor':
                    this.secondaryAbilityEffect = { type: 'slippery_floor', radius: this.width * 2.5, duration: SECONDARY_ABILITY_DURATION_FRAMES };
                    GameUtils.displayMessage(`${this.name} used Slippery Floor!`);
                    characters.forEach(target => {
                        // Add check: Slippery Floor doesn't affect phasing characters
                        if (target !== this && target.isAlive && !target.isPhasing && GameUtils.checkDistance(this, target) < this.secondaryAbilityEffect.radius) {
                            // Store original speed on the target if not already stored
                            if (target.originalSpeedForSecondaryAbility === undefined) {
                                target.originalSpeedForSecondaryAbility = target.speed;
                            }
                            target.speed *= 0.5;
                            const newSpeedMagnitude = ORIGINAL_SPEED_MAGNITUDE * target.speed * CHARACTER_SCALE_FACTOR;
                            const currentAngle = Math.atan2(target.dy, target.dx);
                            target.dx = Math.cos(currentAngle) * newSpeedMagnitude;
                            target.dy = Math.sin(currentAngle) * newSpeedMagnitude;
                            // The timeout logic should ideally be handled by the duration countdown in update,
                            // but keeping the existing pattern for now. Need to ensure cleanup happens correctly.
                            // A better approach would be to store affected characters and revert them when the ability ends.
                            // For simplicity, keeping the timeout but noting it might be less robust.
                            setTimeout(() => {
                                // Only revert if the ability is still active on the target (check duration or a flag)
                                // This timeout approach is problematic if the target gets hit by another slippery floor
                                // or if the ability ends early for the caster but not the target.
                                // A more robust solution would involve tracking effects on targets.
                                // For now, we'll just revert if the original speed is still stored.
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
                    this.secondaryAbilityEffect = { type: 'iron_skin', duration: SECONDARY_ABILITY_DURATION_FRAMES };
                    this.defense *= 1.5;
                    GameUtils.displayMessage(`${this.name} used Iron Skin!`);
                    break;
                case 'spur_of_moment':
                    this.secondaryAbilityEffect = { type: 'spur_of_moment', duration: SECONDARY_ABILITY_DURATION_FRAMES };
                    this.speed *= 1.8;
                    const currentAngleGalloner = Math.atan2(this.dy, this.dx);
                    const newSpeedMagnitudeGalloner = ORIGINAL_SPEED_MAGNITUDE * this.speed * CHARACTER_SCALE_FACTOR;
                    this.dx = Math.cos(currentAngleGalloner) * newSpeedMagnitudeGalloner;
                    this.dy = Math.sin(currentAngleGalloner) * newSpeedMagnitudeGalloner;
                    GameUtils.displayMessage(`${this.name} used Spur of the Moment!`);
                    break;
                case 'static_field':
                    this.secondaryAbilityEffect = { type: 'static_field', radius: this.width * 1.5, duration: SECONDARY_ABILITY_DURATION_FRAMES, tickDamage: 0.5 };
                    GameUtils.displayMessage(`${this.name} created a Static Field!`);
                    // Damage application for Static Field is handled in main.js gameLoop
                    break;
                case 'adrenaline_shot':
                    this.secondaryAbilityEffect = { type: 'adrenaline_shot', duration: SECONDARY_ABILITY_DURATION_FRAMES };
                    this.speed *= 2.0;
                    const currentAngleMedic = Math.atan2(this.dy, this.dx);
                    const newSpeedMagnitudeMedic = ORIGINAL_SPEED_MAGNITUDE * this.speed * CHARACTER_SCALE_FACTOR;
                    this.dx = Math.cos(currentAngleMedic) * newSpeedMagnitudeMedic;
                    this.dy = Math.sin(currentAngleMedic) * newSpeedMagnitudeMedic;
                    GameUtils.displayMessage(`${this.name} used Adrenaline Shot!`);
                    break;
                case 'smoke_bomb':
                    this.secondaryAbilityEffect = { type: 'smoke_bomb', radius: this.width * 2, duration: SECONDARY_ABILITY_DURATION_FRAMES };
                    GameUtils.displayMessage(`${this.name} deployed a Smoke Bomb!`);
                    // Dodge chance boost is applied in the update method's dodge logic
                    this.dodgeChanceBoost = 0.5; // Example boost value
                    // The timeout logic should ideally be handled by the duration countdown in update
                    // setTimeout(() => { this.dodgeChanceBoost = 0; }, SECONDARY_ABILITY_DURATION_FRAMES * (1000/60)); // Removed timeout, handled by duration
                    break;
                case 'magic_shield':
                    this.secondaryAbilityEffect = { type: 'magic_shield', duration: SECONDARY_ABILITY_DURATION_FRAMES };
                    this.isBlockingShuriken = true; // Enable shuriken block
                    GameUtils.displayMessage(`${this.name} cast Magic Shield!`);
                    break;
                case 'fortify':
                    this.secondaryAbilityEffect = { type: 'fortify', duration: SECONDARY_ABILITY_DURATION_FRAMES };
                    this.defense *= 2.0;
                    GameUtils.displayMessage(`${this.name} fortified themselves!`);
                    break;
                case 'phase': // New Phase ability
                    this.secondaryAbilityEffect = { type: 'phase', duration: SECONDARY_ABILITY_DURATION_FRAMES };
                    this.isPhasing = true; // Enable phasing
                    // Phasing characters might move faster or ignore collision physics (handled in update/main.js)
                    // Let's add a temporary speed boost during phase
                    this.speed *= 1.5; // Example speed boost
                    const currentAnglePhase = Math.atan2(this.dy, this.dx);
                    const newSpeedMagnitudePhase = ORIGINAL_SPEED_MAGNITUDE * this.speed * CHARACTER_SCALE_FACTOR;
                    this.dx = Math.cos(currentAnglePhase) * newSpeedMagnitudePhase;
                    this.dy = Math.sin(currentAnglePhase) * newSpeedMagnitudePhase;
                    GameUtils.displayMessage(`${this.name} is phasing!`);
                    break;
                case 'invisibility': // New Invisibility ability
                    this.secondaryAbilityEffect = { type: 'invisibility', duration: SECONDARY_ABILITY_DURATION_FRAMES };
                    this.isInvisible = true; // Enable invisibility
                    // Invisibility effect (increased dodge, reduced damage) is handled in update/takeDamage
                    GameUtils.displayMessage(`${this.name} turned invisible!`);
                    break;
            }
            GameUtils.playHitSound(); // Play a sound for ability activation
        }
    }
}

// Make Character class globally accessible
window.Character = Character;
