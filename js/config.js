// js/config.js

// Global constants
export const REFERENCE_GAME_WIDTH = 1200;
export const ORIGINAL_CHARACTER_SIZE = 40;
export const ORIGINAL_SPEED_MAGNITUDE = 1.5;
export const INITIAL_HEALTH = 100;
export const BASE_COLLISION_DAMAGE = 15;
export const HIT_COOLDOWN = 500;
export const MOVE_COOLDOWN = 2000; // General move cooldown
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

// Megalodon Boss (NEW)
export const MEGALODON_BOSS_HEALTH = 1000; // Manually set boss health
export const MEGALODON_BOSS_ATTACK = 30; // Manually set boss attack
export const MEGALODON_BOSS_DEFENSE = 13; // Manually set boss defense
export const MEGALODON_BOSS_SPEED = 1.3; // Manually set boss speed
export const MEGALODON_SIZE_MULTIPLIER = 2.5; // Significantly larger
export const MEGALODON_FEEDING_FRENZY_BONUS_DAMAGE = 1.5; // Increased bonus damage for Feeding Frenzy
export const MEGALODON_FIN_SLICE_BLEED_DAMAGE_MULTIPLIER = 2; // Stronger bleed
export const MEGALODON_FIN_SLICE_RADIUS_MULTIPLIER = 1.5; // NEW: Megalodon's Fin Slice radius multiplier
export const MEGALODON_TITLE_COLOR = '#FF0000'; // Red color for Megalodon's title
export const MEGALODON_MOVE_COOLDOWN = 6000; // Megalodon's specific move cooldown (e.g., 6 seconds)

export const MAP_IMAGE_SOURCE = './sprites/map.png'; // New: Path to your map image

// Boss Mode specific flag
export const IS_BOSS_MODE = {
    ENABLED: false, // This will be dynamically set by matchCreationState
    MAX_PLAYER_CHARACTERS: 7 // Max non-boss characters in boss mode
};

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
    { name: 'Megalodon', url: './sprites/megalodon.png', move: 'feeding_frenzy', attack: MEGALODON_BOSS_ATTACK, defense: MEGALODON_BOSS_DEFENSE, speed: MEGALODON_BOSS_SPEED,
      health: MEGALODON_BOSS_HEALTH, secondaryAbility: 'fin_slice', secondaryAbilityCooldown: 7000,
      isBoss: true,
      scaleFactorOverride: MEGALODON_SIZE_MULTIPLIER
    }
];