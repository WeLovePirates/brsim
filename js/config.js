// js/config.js

// Global constants
const REFERENCE_GAME_WIDTH = 1200;
const ORIGINAL_CHARACTER_SIZE = 60;
const ORIGINAL_SPEED_MAGNITUDE = 1.5;
const INITIAL_HEALTH = 96;
const BASE_COLLISION_DAMAGE = 5;
const HIT_COOLDOWN = 500;
const MOVE_COOLDOWN = 2000;
const MEDIC_PATCH_COOLDOWN = 7000;
const SECONDARY_ABILITY_DURATION_FRAMES = 180;

// Low health escape behavior
const LOW_HEALTH_THRESHOLD = 0.3; // 30% of max health
const DODGE_CHANCE = 0.7; // 70% chance to dodge when below threshold
const DODGE_SPEED_MULTIPLIER = 1.5; // Characters move faster when dodging
const DODGE_DIRECTION_CHANGE_INTERVAL = 2500; // milliseconds - how long a dodge direction lasts

// Low health rush behavior
const ALL_LOW_HEALTH_RUSH_CHANCE = 0.9; // 90% chance to rush when all are low health

// Probability menu update interval
const PROB_UPDATE_INTERVAL = 1000; // Update probabilities every 1 second
const SOUND_COOLDOWN = 100; // Minimum time between sounds in milliseconds

// New: Quick Draw hit chance
const QUICKDRAW_HIT_CHANCE = 0.15; // 15% chance for Galloner's Quick Draw to hit

// Ghost specific buffs
const INVISIBILITY_DAMAGE_REDUCTION = 0.5; // Buffed: Character takes 50% of normal damage (50% reduction)
const INVISIBILITY_DODGE_BOOST = 0.3;    // Buffed: 30% additive boost to dodge chance
const GHOST_BOO_DAMAGE = 25; // New constant for Ghost's Boo move damage

const IMAGE_SOURCES = [
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
    { name: 'Tank', url: './sprites/tank.png', move: 'charge', attack: 9, defense: 15, speed: 0.7,
      secondaryAbility: 'fortify', secondaryAbilityCooldown: 11000 },
    { name: 'Ghost', url: './sprites/ghost.png', move: 'boo', attack: 15, defense: 3, speed: 1.8,
      secondaryAbility: 'invisibility', secondaryAbilityCooldown: 10000 }, // Buffed: Cooldown reduced
];
