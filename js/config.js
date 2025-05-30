// js/config.js

// Global constants
export const REFERENCE_GAME_WIDTH = 1200;
export const ORIGINAL_CHARACTER_SIZE = 40;
export const ORIGINAL_SPEED_MAGNITUDE = 1.5;
export const INITIAL_HEALTH = 100;
export const BASE_COLLISION_DAMAGE = 15; // MODIFIED: Increased base collision damage to 15
export const HIT_COOLDOWN = 500;
export const MOVE_COOLDOWN = 2000;
export const MEDIC_PATCH_COOLDOWN = 7000;
export const SECONDARY_ABILITY_DURATION_FRAMES = 180;

// Low health escape behavior
export const LOW_HEALTH_THRESHOLD = 0.3; // 30% of max health
export const DODGE_CHANCE = 0.7; // 70% chance to dodge when below threshold
export const DODGE_SPEED_MULTIPLIER = 1.5; // Characters move faster when dodging
export const DODGE_DIRECTION_CHANGE_INTERVAL = 2500; // milliseconds - how long a dodge direction lasts

// Low health rush behavior
export const ALL_LOW_HEALTH_RUSH_CHANCE = 0.9; // 90% chance to rush when all are low health

// Probability menu update interval
export const PROB_UPDATE_INTERVAL = 1000; // Update probabilities every 1 second
export const SOUND_COOLDOWN = 100; // Minimum time between sounds in milliseconds

// New: Quick Draw hit chance
export const QUICKDRAW_HIT_CHANCE = 0.15; // 15% chance for Galloner's Quick Draw to hit

// Ghost specific buffs
export const INVISIBILITY_DAMAGE_REDUCTION = 0.5; // Buffed: Character takes 50% of normal damage (50% reduction)
export const INVISIBILITY_DODGE_BOOST = 0.3;    // Buffed: 30% additive boost to dodge chance
export const GHOST_BOO_DAMAGE = 25; // New constant for Ghost's Boo move damage

// Queen Bee specific constants
export const SWARM_DURATION_FRAMES = 180; // Duration for Queen Bee's Swarm move
export const SWARM_BEE_DAMAGE_PER_TICK = 5; // Damage per tick for each mini bee in Swarm
export const HONEYCOMB_STUN_DURATION_FRAMES = 120; // Duration for Honeycomb stun
export const HONEYCOMB_PROJECTILE_SPEED = 5; // Adjust as needed for projectile speed

// Shark Class
export const FEEDING_FRENZY_DURATION_FRAMES = 180; // Duration of Feeding Frenzy in frames (e.g., 3 seconds at 60 FPS)
export const FEEDING_FRENZY_ATTACK_SPEED_BOOST = 1.5; // Multiplier for attack speed (represented by character speed)
export const FEEDING_FRENZY_LOW_HEALTH_BONUS_DAMAGE_PERCENTAGE = 0.25; // 25% bonus damage to targets below LOW_HEALTH_THRESHOLD

export const FIN_SLICE_BLEED_DURATION_FRAMES = 300; // Duration of bleed effect in frames (e.g., 5 seconds at 60 FPS)
export const FIN_SLICE_BLEED_DAMAGE_PER_TICK = 3; // Base damage per tick for the bleed effect (applied every 1 second)

// Alchemist Class Constants (NEW)
export const VOLATILE_CONCOCTION_PROJECTILE_SPEED = 7; // Speed of Alchemist's thrown potion
export const VOLATILE_CONCOCTION_EXPLOSION_RADIUS = 150; // Radius of potion explosion
export const VOLATILE_CONCOCTION_DAMAGE = 30; // Direct damage if potion explodes for damage
export const VOLATILE_CONCOCTION_HEAL = 25; // Healing amount if potion explodes for heal
export const VOLATILE_CONCOCTION_STUN_DURATION_FRAMES = 90; // Stun duration if potion explodes for stun (1.5 seconds)

export const ELIXIR_DEFENSE_BOOST_PERCENTAGE = 0.4; // 40% defense boost from Elixir
export const ELIXIR_HEAL_PER_TICK = 2; // Healing amount per tick from Elixir
export const ELIXIR_HEAL_TICK_INTERVAL_MS = 500; // How often Elixir heals (0.5 seconds)

// NEW: Clown Specific Constants (AoE Attack)
export const CLOWN_CONFETTI_BLAST_RADIUS = 100; // Radius of Confetti Blast AoE
export const CLOWN_CONFETTI_BLAST_DAMAGE = 15; // Damage of Confetti Blast

// NEW: Hair Kid Static Shock Constants (AoE Attack)
export const STATICSHOCK_RADIUS = 80; // Radius of Static Shock AoE
export const STATICSHOCK_DAMAGE = 10; // Damage of Static Shock

// NEW: Wizard Fireball Constants (AoE Attack)
export const WIZARD_FIREBALL_RADIUS = 120; // Radius of Fireball AoE
export const WIZARD_FIREBALL_DAMAGE = 35; // Damage of Fireball
export const WIZARD_MAGIC_SHIELD_DURATION_FRAMES = 120; // Duration of Magic Shield in frames (2 seconds)
export const WIZARD_MAGIC_SHIELD_DAMAGE_REDUCTION = 0.7; // 70% damage reduction for Magic Shield

// NEW: Tank Charge Constants (Impact and Buff/Debuff)
export const CHARGE_SPEED_BOOST = 2.5; // Multiplier for speed during Charge
export const CHARGE_DURATION_FRAMES = 90; // Duration of Charge in frames (1.5 seconds)
export const CHARGE_IMPACT_DAMAGE = 20; // Damage on impact during Charge
export const TANK_FORTIFY_DEFENSE_BOOST = 2.0; // Multiplier for defense during Fortify
export const TANK_FORTIFY_DAMAGE_REDUCTION = 0.3; // 30% damage reduction during Fortify

// NEW: Galloner Quickdraw Damage
export const GALLONER_QUICKDRAW_DAMAGE = 45; // Damage of Galloner's Quickdraw

// NEW: Frenchie Baguette Bash Damage
export const BAGUETTE_BASH_DAMAGE = 20; // Damage of Frenchie's Baguette Bash

// NEW: Ninja Shuriken Damage
export const SHURIKEN_DAMAGE = 25; // Damage of Ninja's Shuriken


export const MAP_IMAGE_SOURCE = './sprites/map.png'; // New: Path to your map image

export const IMAGE_SOURCES = [
    { name: 'Clown', url: './sprites/clown.png', move: 'confetti', attack: 8, defense: 8, speed: 1.2,
      secondaryAbility: 'slippery_floor', secondaryAbilityCooldown: 7000 },
    { name: 'Frenchie', url: './sprites/frenchie.png', move: 'baguette', attack: 10, defense: 12, speed: 1.0,
      secondaryAbility: 'iron_skin', secondaryAbilityCooldown: 8000 },
    { name: 'Galloner', url: './sprites/galloner.png', move: 'quickdraw', attack: 22, defense: 5, speed: 0.9,
      secondaryAbility: 'spur_of_moment', secondaryAbilityCooldown: 6000 },
    { name: 'Hair Kid', url: './sprites/hair.png', move: 'staticshock', attack: 9, defense: 9, speed: 1.1,
      secondaryAbility: 'static_field', secondaryAbilityCooldown: 12000 },
    { name: 'Medic', url: './sprites/medic.png', move: 'patch', attack: 7, defense: 10, speed: 0.9, health: INITIAL_HEALTH * 0.70,
      secondaryAbility: 'adrenaline_shot', secondaryAbilityCooldown: 5000 },
    { name: 'Ninja', url: './sprites/ninja.png', move: 'shuriken', attack: 11, defense: 7, speed: 1.6,
      secondaryAbility: 'smoke_bomb', secondaryAbilityCooldown: 9000 },
    { name: 'Wizard', url: './sprites/wizard.png', move: 'fireball', attack: 18, defense: 5, speed: 0.8,
      secondaryAbility: 'magic_shield', secondaryAbilityCooldown: 10000 },
    { name: 'Tank', url: './sprites/tank.png', move: 'charge', attack: 13, defense: 15, speed: 0.7,
      secondaryAbility: 'fortify', secondaryAbilityCooldown: 20000 },
    { name: 'Ghost', url: './sprites/ghost.png', move: 'boo', attack: 15, defense: 3, speed: 1.8,
      secondaryAbility: 'invisibility', secondaryAbilityCooldown: 10000 },
    { name: 'Queen Bee', url: './sprites/queen_bee.png', move: 'swarm', attack: 12, defense: 8, speed: 1.3,
      secondaryAbility: 'honeycomb', secondaryAbilityCooldown: 9000 },
    { name: 'Shark', url: './sprites/shark.png', move: 'feeding_frenzy', attack: 15, defense: 9, speed: 1.1,
      secondaryAbility: 'fin_slice', secondaryAbilityCooldown: 9000 },
    { name: 'Alchemist', url: './sprites/alchemist.png', move: 'volatile_concoction', attack: 9, defense: 1, speed: 1.0,
      secondaryAbility: 'elixir_of_fortitude', secondaryAbilityCooldown: 8000 },
];