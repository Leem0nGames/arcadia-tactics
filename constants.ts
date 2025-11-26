
import { TerrainType, CharacterClass, CharacterRace, Ability, Spell, SpellType, Item, EquipmentSlot, Difficulty } from './types';

export const HEX_SIZE = 36;
export const MAP_WIDTH = 20;
export const MAP_HEIGHT = 15;

// --- DIFFICULTY SETTINGS ---
export const DIFFICULTY_SETTINGS: Record<Difficulty, {
    enemyStatMod: number;
    encounterRateMod: number;
    xpMod: number;
    goldMod: number;
}> = {
    [Difficulty.EASY]: {
        enemyStatMod: 0.7, // 30% less HP/Dmg - More forgiving
        encounterRateMod: 0.7, // Fewer encounters
        xpMod: 1.3, // Bonus XP to compensate for easier fights
        goldMod: 1.5 // More gold for casual players
    },
    [Difficulty.NORMAL]: {
        enemyStatMod: 1.0,
        encounterRateMod: 1.0,
        xpMod: 1.0,
        goldMod: 1.0
    },
    [Difficulty.HARD]: {
        enemyStatMod: 1.5, // 50% more HP/Dmg - Significant challenge
        encounterRateMod: 1.3, // Frequent fights
        xpMod: 1.5, // Higher risk, higher reward
        goldMod: 0.7 // Less gold - scarcity adds challenge
    }
};

// --- PROGRESSION ---
export const XP_TABLE = [
    0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000,
    85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000
];

// --- PALETA DE COLORES COHERENTE (Estilo Wesnoth/Táctico) ---
export const TERRAIN_COLORS: Record<TerrainType, string> = {
    [TerrainType.GRASS]: '#3a5f0b',
    [TerrainType.FOREST]: '#1a330a',
    [TerrainType.MOUNTAIN]: '#44403c',
    [TerrainType.WATER]: '#1e3a8a',
    [TerrainType.CASTLE]: '#525252',
    [TerrainType.VILLAGE]: '#573c22',
    [TerrainType.DESERT]: '#a16207',
    [TerrainType.SWAMP]: '#2d3318',
    [TerrainType.PLAINS]: '#86a34b',
    [TerrainType.TAIGA]: '#3b5249',
    [TerrainType.JUNGLE]: '#0d421d',
    [TerrainType.TUNDRA]: '#a3b8c2',
    [TerrainType.RUINS]: '#57534e',
    // Upside Down Colors
    [TerrainType.CAVE_FLOOR]: '#3f3833',
    [TerrainType.FUNGUS]: '#4a3b52',
    [TerrainType.LAVA]: '#cf3615',
    [TerrainType.CHASM]: '#0a0a0a',
    // Urban
    [TerrainType.COBBLESTONE]: '#78716c',
    [TerrainType.DIRT_ROAD]: '#854d0e',
    [TerrainType.WOOD_FLOOR]: '#451a03',
    [TerrainType.STONE_FLOOR]: '#57534e',
    [TerrainType.WALL_HOUSE]: '#78350f'
};

// --- TERRAIN BLENDING PRIORITY ---
export const TERRAIN_PRIORITY: Record<TerrainType, number> = {
    [TerrainType.CASTLE]: 30,
    [TerrainType.RUINS]: 30,
    [TerrainType.VILLAGE]: 30,
    [TerrainType.WALL_HOUSE]: 30,

    [TerrainType.MOUNTAIN]: 25,

    [TerrainType.FOREST]: 20,
    [TerrainType.JUNGLE]: 20,
    [TerrainType.TAIGA]: 20,
    [TerrainType.FUNGUS]: 20,

    [TerrainType.GRASS]: 10,
    [TerrainType.PLAINS]: 10,
    [TerrainType.TUNDRA]: 10,
    [TerrainType.DESERT]: 10,
    [TerrainType.CAVE_FLOOR]: 10,

    [TerrainType.COBBLESTONE]: 8,
    [TerrainType.DIRT_ROAD]: 8,
    [TerrainType.WOOD_FLOOR]: 8,
    [TerrainType.STONE_FLOOR]: 8,

    [TerrainType.SWAMP]: 5,

    [TerrainType.WATER]: 1,
    [TerrainType.LAVA]: 1,

    [TerrainType.CHASM]: 0,
};

// --- TERRAIN MOVEMENT COSTS ---
// 1 = Normal, >1 = Slower, 99 = Impassable/Fly only
export const TERRAIN_MOVEMENT_COST: Record<TerrainType, number> = {
    [TerrainType.GRASS]: 1.0,
    [TerrainType.PLAINS]: 1.0,
    [TerrainType.DESERT]: 1.2, // Sand is tiresome
    [TerrainType.VILLAGE]: 0.8, // Roads/Paths
    [TerrainType.CASTLE]: 0.8,

    [TerrainType.FOREST]: 1.5,
    [TerrainType.TAIGA]: 1.5,
    [TerrainType.TUNDRA]: 1.5,
    [TerrainType.FUNGUS]: 1.5,

    [TerrainType.JUNGLE]: 2.0, // Dense
    [TerrainType.SWAMP]: 2.5, // Very slow
    [TerrainType.MOUNTAIN]: 3.0, // Hard climb
    [TerrainType.RUINS]: 1.5,

    [TerrainType.CAVE_FLOOR]: 1.0,

    [TerrainType.COBBLESTONE]: 0.8,
    [TerrainType.DIRT_ROAD]: 0.8,
    [TerrainType.WOOD_FLOOR]: 1.0,
    [TerrainType.STONE_FLOOR]: 1.0,

    // Impassable (without special means)
    [TerrainType.WATER]: 99,
    [TerrainType.LAVA]: 99,
    [TerrainType.CHASM]: 99,
    [TerrainType.WALL_HOUSE]: 99,
};

// --- D&D 5E STANDARD ARRAY ---
export const BASE_STATS: Record<CharacterClass, Record<Ability, number>> = {
    [CharacterClass.FIGHTER]: { STR: 15, DEX: 12, CON: 14, INT: 10, WIS: 10, CHA: 10 },
    [CharacterClass.WIZARD]: { STR: 8, DEX: 12, CON: 12, INT: 15, WIS: 13, CHA: 10 },
    [CharacterClass.ROGUE]: { STR: 10, DEX: 15, CON: 12, INT: 12, WIS: 10, CHA: 12 },
    [CharacterClass.CLERIC]: { STR: 12, DEX: 10, CON: 13, INT: 10, WIS: 15, CHA: 12 },
    [CharacterClass.BARBARIAN]: { STR: 15, DEX: 12, CON: 15, INT: 8, WIS: 10, CHA: 10 },
    [CharacterClass.BARD]: { STR: 10, DEX: 14, CON: 12, INT: 10, WIS: 8, CHA: 15 },
    [CharacterClass.DRUID]: { STR: 10, DEX: 12, CON: 13, INT: 10, WIS: 15, CHA: 10 },
    [CharacterClass.PALADIN]: { STR: 15, DEX: 8, CON: 14, INT: 8, WIS: 10, CHA: 14 },
    [CharacterClass.RANGER]: { STR: 10, DEX: 15, CON: 12, INT: 10, WIS: 14, CHA: 8 },
    [CharacterClass.SORCERER]: { STR: 8, DEX: 13, CON: 14, INT: 10, WIS: 10, CHA: 15 },
    [CharacterClass.WARLOCK]: { STR: 8, DEX: 13, CON: 12, INT: 10, WIS: 12, CHA: 15 },
};

// --- D&D 5E RACIAL BONUSES ---
export const RACE_BONUS: Record<CharacterRace, Partial<Record<Ability, number>>> = {
    [CharacterRace.HUMAN]: { STR: 1, DEX: 1, CON: 1, INT: 1, WIS: 1, CHA: 1 },
    [CharacterRace.ELF]: { DEX: 2, INT: 1 }, // High Elf Variant
    [CharacterRace.DWARF]: { CON: 2, STR: 2 }, // Mountain Dwarf
    [CharacterRace.HALFLING]: { DEX: 2, CHA: 1 }, // Lightfoot
    [CharacterRace.DRAGONBORN]: { STR: 2, CHA: 1 },
    [CharacterRace.GNOME]: { INT: 2, CON: 1 }, // Rock Gnome
    [CharacterRace.TIEFLING]: { CHA: 2, INT: 1 },
    [CharacterRace.HALF_ORC]: { STR: 2, CON: 1 },
};

export const DICE_ICONS = {
    d20: "🎲",
};


// --- ASSETS & AUTOTILING ---
export const USE_LOCAL_ASSETS = false;

const REMOTE_WESNOTH_URL = "https://raw.githubusercontent.com/wesnoth/wesnoth/master/data/core/images";
const LOCAL_WESNOTH_URL = "/assets/wesnoth";

const REMOTE_MC_URL = "https://raw.githubusercontent.com/Poudingue/Vanilla-Normals-Renewed/master/assets/minecraft/textures/block";
const LOCAL_MC_URL = "/assets/minecraft";

export const WESNOTH_BASE_URL = USE_LOCAL_ASSETS ? LOCAL_WESNOTH_URL : REMOTE_WESNOTH_URL;
export const MC_BASE_URL = USE_LOCAL_ASSETS ? LOCAL_MC_URL : REMOTE_MC_URL;


// --- ITEMS DATABASE (D&D 5E Canonical) ---
// Using Wesnoth item icons for visual representation
export const ITEMS: Record<string, Item> = {
    // --- CONSUMABLES ---
    POTION_HEALING: {
        id: 'potion_healing', name: 'Potion of Healing', type: 'consumable',
        icon: `${WESNOTH_BASE_URL}/items/potion-red.png`,
        description: 'A magical red fluid. Regains 2d4 + 2 HP.',
        effect: { type: 'heal_hp', amount: 0 } // Amount 0 triggers dice roll in store
    },
    POTION_GREATER_HEALING: {
        id: 'potion_greater_healing', name: 'Potion of Greater Healing', type: 'consumable',
        icon: `${WESNOTH_BASE_URL}/items/potion-red.png`, // Reusing red potion
        description: 'Potent healing magic. Regains 4d4 + 4 HP.',
        effect: { type: 'heal_hp', amount: 14 } // Simplified for now or implement roll logic later
    },
    POTION_MANA: {
        id: 'potion_mana', name: 'Potion of Mana', type: 'consumable',
        icon: `${WESNOTH_BASE_URL}/items/potion-blue.png`,
        description: 'Restores magical energy. Regains 1 Spell Slot.',
        effect: { type: 'restore_mana', amount: 1 }
    },
    RATION: {
        id: 'ration', name: 'Travel Ration', type: 'consumable',
        icon: '🍖', // Emoji fallback or generic icon
        description: 'Dry food for the road. Restores 5 HP out of combat.',
        effect: { type: 'heal_hp', amount: 5 }
    },

    // --- WEAPONS ---
    DAGGER: {
        id: 'dagger', name: 'Dagger', type: 'equipment',
        icon: `${WESNOTH_BASE_URL}/items/dagger.png`,
        description: 'Finesse, Light, Thrown. (1d4 Piercing)',
        equipmentStats: { slot: EquipmentSlot.MAIN_HAND, diceCount: 1, diceSides: 4, modifiers: { DEX: 0 } }
    },
    SHORTSWORD: {
        id: 'shortsword', name: 'Shortsword', type: 'equipment',
        icon: `${WESNOTH_BASE_URL}/items/sword.png`,
        description: 'Finesse, Light. (1d6 Piercing)',
        equipmentStats: { slot: EquipmentSlot.MAIN_HAND, diceCount: 1, diceSides: 6, modifiers: { DEX: 0 } }
    },
    LONGSWORD: {
        id: 'longsword', name: 'Longsword', type: 'equipment',
        icon: `${WESNOTH_BASE_URL}/items/sword.png`,
        description: 'Versatile. (1d8 Slashing)',
        equipmentStats: { slot: EquipmentSlot.MAIN_HAND, diceCount: 1, diceSides: 8 }
    },
    GREATSWORD: {
        id: 'greatsword', name: 'Greatsword', type: 'equipment',
        icon: `${WESNOTH_BASE_URL}/attacks/greatsword-human.png`, // Using attack icon if item missing
        description: 'Heavy, Two-Handed. (2d6 Slashing)',
        equipmentStats: { slot: EquipmentSlot.MAIN_HAND, diceCount: 2, diceSides: 6 }
    },
    GREATAXE: {
        id: 'greataxe', name: 'Greataxe', type: 'equipment',
        icon: `${WESNOTH_BASE_URL}/attacks/battleaxe.png`,
        description: 'Heavy, Two-Handed. (1d12 Slashing)',
        equipmentStats: { slot: EquipmentSlot.MAIN_HAND, diceCount: 1, diceSides: 12 }
    },
    HANDAXE: {
        id: 'handaxe', name: 'Handaxe', type: 'equipment',
        icon: `${WESNOTH_BASE_URL}/attacks/axe.png`,
        description: 'Light, Thrown. (1d6 Slashing)',
        equipmentStats: { slot: EquipmentSlot.MAIN_HAND, diceCount: 1, diceSides: 6 }
    },
    MACE: {
        id: 'mace', name: 'Mace', type: 'equipment',
        icon: `${WESNOTH_BASE_URL}/attacks/mace.png`,
        description: 'Simple weapon. (1d6 Bludgeoning)',
        equipmentStats: { slot: EquipmentSlot.MAIN_HAND, diceCount: 1, diceSides: 6 }
    },
    WARHAMMER: {
        id: 'warhammer', name: 'Warhammer', type: 'equipment',
        icon: `${WESNOTH_BASE_URL}/items/hammer-runic.png`,
        description: 'Versatile. (1d8 Bludgeoning)',
        equipmentStats: { slot: EquipmentSlot.MAIN_HAND, diceCount: 1, diceSides: 8 }
    },
    QUARTERSTAFF: {
        id: 'quarterstaff', name: 'Quarterstaff', type: 'equipment',
        icon: `${WESNOTH_BASE_URL}/items/staff.png`,
        description: 'Versatile. Focus. (1d6 Bludgeoning)',
        equipmentStats: { slot: EquipmentSlot.MAIN_HAND, diceCount: 1, diceSides: 6 }
    },
    RAPIER: {
        id: 'rapier', name: 'Rapier', type: 'equipment',
        icon: `${WESNOTH_BASE_URL}/attacks/saber-human.png`,
        description: 'Finesse. (1d8 Piercing)',
        equipmentStats: { slot: EquipmentSlot.MAIN_HAND, diceCount: 1, diceSides: 8 }
    },
    LONGBOW: {
        id: 'longbow', name: 'Longbow', type: 'equipment',
        icon: `${WESNOTH_BASE_URL}/items/bow.png`,
        description: 'Heavy, Two-Handed. (1d8 Piercing)',
        equipmentStats: { slot: EquipmentSlot.MAIN_HAND, diceCount: 1, diceSides: 8 }
    },

    // --- ARMOR & SHIELDS ---
    SHIELD: {
        id: 'shield', name: 'Shield', type: 'equipment',
        icon: `${WESNOTH_BASE_URL}/items/shield.png`,
        description: 'Standard shield. (+2 AC)',
        equipmentStats: { slot: EquipmentSlot.OFF_HAND, ac: 2 }
    },
    LEATHER_ARMOR: {
        id: 'leather_armor', name: 'Leather Armor', type: 'equipment',
        icon: `${WESNOTH_BASE_URL}/items/armor.png`,
        description: 'Light armor. AC 11 + DEX modifier.',
        equipmentStats: { slot: EquipmentSlot.BODY, ac: 11 }
    },
    STUDDED_LEATHER: {
        id: 'studded_leather', name: 'Studded Leather', type: 'equipment',
        icon: `${WESNOTH_BASE_URL}/items/armor.png`,
        description: 'Reinforced light armor. AC 12 + DEX modifier.',
        equipmentStats: { slot: EquipmentSlot.BODY, ac: 12 }
    },
    CHAIN_SHIRT: {
        id: 'chain_shirt', name: 'Chain Shirt', type: 'equipment',
        icon: `${WESNOTH_BASE_URL}/items/armor.png`,
        description: 'Medium armor. AC 13 + DEX (max 2).',
        equipmentStats: { slot: EquipmentSlot.BODY, ac: 13 }
    },
    CHAIN_MAIL: {
        id: 'chain_mail', name: 'Chain Mail', type: 'equipment',
        icon: `${WESNOTH_BASE_URL}/items/armor.png`,
        description: 'Heavy armor. AC 16. Stealth Disadvantage.',
        equipmentStats: { slot: EquipmentSlot.BODY, ac: 16 }
    },
    PLATE_ARMOR: {
        id: 'plate_armor', name: 'Plate Armor', type: 'equipment',
        icon: `${WESNOTH_BASE_URL}/items/armor-golden.png`,
        description: 'Heavy armor. AC 18.',
        equipmentStats: { slot: EquipmentSlot.BODY, ac: 18 }
    },

    // --- DUNGEON / DARK FANTASY DROPS ---
    SHADOW_DAGGER: {
        id: 'shadow_dagger', name: 'Shadow Dagger', type: 'equipment',
        icon: `${WESNOTH_BASE_URL}/items/dagger-poison.png`,
        description: 'A cursed blade dripping with venom. (1d4 + 1 DEX)',
        equipmentStats: { slot: EquipmentSlot.MAIN_HAND, diceCount: 1, diceSides: 4, modifiers: { DEX: 1 } }
    },
    NECRO_STAFF: {
        id: 'necro_staff', name: 'Staff of the Dead', type: 'equipment',
        icon: `${WESNOTH_BASE_URL}/items/staff-ruby.png`,
        description: 'Focus. Radiates cold energy. (1d8 + 1 INT)',
        equipmentStats: { slot: EquipmentSlot.MAIN_HAND, diceCount: 1, diceSides: 8, modifiers: { INT: 1 } }
    },
    OBSIDIAN_PLATE: {
        id: 'obsidian_plate', name: 'Obsidian Plate', type: 'equipment',
        icon: `${WESNOTH_BASE_URL}/items/armor.png`,
        description: 'Heavy armor forged from volcanic glass. AC 19.',
        equipmentStats: { slot: EquipmentSlot.BODY, ac: 19 }
    },
    BONE_SHIELD: {
        id: 'bone_shield', name: 'Bone Shield', type: 'equipment',
        icon: `${WESNOTH_BASE_URL}/items/shield-polished.png`,
        description: 'Crafted from dragon bone. (+2 AC)',
        equipmentStats: { slot: EquipmentSlot.OFF_HAND, ac: 2 }
    },
    ELIXIR_STRENGTH: {
        id: 'elixir_strength', name: 'Elixir of Might', type: 'consumable',
        icon: `${WESNOTH_BASE_URL}/items/potion-orange.png`,
        description: 'Permanently increases Strength by 1.',
        effect: { type: 'buff_str', amount: 1 }
    }
};


// --- SPELL DATABASE ---
export const SPELLS: Record<string, Spell> = {
    FIREBOLT: {
        id: 'firebolt', name: 'Fire Bolt', level: 0, range: 12, type: SpellType.DAMAGE,
        diceCount: 1, diceSides: 10, description: 'Hurls a mote of fire.'
    },
    SACRED_FLAME: {
        id: 'sacred_flame', name: 'Sacred Flame', level: 0, range: 6, type: SpellType.DAMAGE,
        diceCount: 1, diceSides: 8, description: 'Flame-like radiance descends on a creature.'
    },
    MAGIC_MISSILE: {
        id: 'magic_missile', name: 'Magic Missile', level: 1, range: 12, type: SpellType.DAMAGE,
        diceCount: 3, diceSides: 4, description: 'Creates 3 glowing darts of magical force.'
    },
    CURE_WOUNDS: {
        id: 'cure_wounds', name: 'Cure Wounds', level: 1, range: 1, type: SpellType.HEAL,
        diceCount: 1, diceSides: 8, description: 'A creature you touch regains hit points.'
    },
    HEALING_WORD: {
        id: 'healing_word', name: 'Healing Word', level: 1, range: 6, type: SpellType.HEAL,
        diceCount: 1, diceSides: 4, description: 'A creature of your choice regains hit points.'
    },
    THUNDERWAVE: {
        id: 'thunderwave', name: 'Thunderwave', level: 1, range: 2, type: SpellType.DAMAGE,
        diceCount: 2, diceSides: 8, description: 'A wave of thunderous force sweeps out.'
    },
    ELDRITCH_BLAST: {
        id: 'eldritch_blast', name: 'Eldritch Blast', level: 0, range: 12, type: SpellType.DAMAGE,
        diceCount: 1, diceSides: 10, description: 'A beam of crackling energy.'
    },
    ICE_STORM: {
        id: 'ice_storm', name: 'Ice Storm', level: 1, range: 8, type: SpellType.DAMAGE,
        diceCount: 3, diceSides: 6, description: 'Freezing hail pounds the area.'
    },
    ENTANGLE: {
        id: 'entangle', name: 'Entangle', level: 1, range: 8, type: SpellType.DAMAGE, // Simplified to damage for now
        diceCount: 1, diceSides: 6, description: 'Grasping weeds sprout from the ground.'
    }
};

export const CLASS_SPELLS: Record<CharacterClass, string[]> = {
    [CharacterClass.WIZARD]: ['firebolt', 'magic_missile', 'thunderwave', 'ice_storm'],
    [CharacterClass.CLERIC]: ['sacred_flame', 'cure_wounds', 'healing_word'],
    [CharacterClass.FIGHTER]: [],
    [CharacterClass.ROGUE]: [],
    [CharacterClass.BARBARIAN]: [],
    [CharacterClass.BARD]: ['healing_word', 'thunderwave'],
    [CharacterClass.DRUID]: ['entangle', 'cure_wounds', 'thunderwave'],
    [CharacterClass.PALADIN]: ['sacred_flame', 'cure_wounds'],
    [CharacterClass.RANGER]: ['entangle', 'cure_wounds'],
    [CharacterClass.SORCERER]: ['firebolt', 'magic_missile', 'ice_storm'],
    [CharacterClass.WARLOCK]: ['eldritch_blast', 'firebolt']
};


// Mapping TerrainTypes to the base filename path for transitions.
export const TERRAIN_BASE_FILES: Partial<Record<TerrainType, string>> = {
    [TerrainType.GRASS]: 'terrain/grass/green',
    [TerrainType.PLAINS]: 'terrain/grass/semi-dry',
    [TerrainType.WATER]: 'terrain/water/coast-tile',
    [TerrainType.DESERT]: 'terrain/sand/desert',
    [TerrainType.SWAMP]: 'terrain/swamp/water-tile',
    [TerrainType.TUNDRA]: 'terrain/frozen/snow',
    [TerrainType.TAIGA]: 'terrain/grass/dry',
    [TerrainType.JUNGLE]: 'terrain/grass/green',
    [TerrainType.FOREST]: 'terrain/grass/green',

    // Upside Down / Cave Transitions
    [TerrainType.CAVE_FLOOR]: 'terrain/cave/cave-floor3',
    [TerrainType.LAVA]: 'terrain/cave/lava',
    [TerrainType.CHASM]: 'terrain/cave/chasm',
    [TerrainType.FUNGUS]: 'terrain/cave/cave-floor3',

    // Urban
    [TerrainType.COBBLESTONE]: 'terrain/flat/road',
    [TerrainType.DIRT_ROAD]: 'terrain/flat/dirt',
    [TerrainType.STONE_FLOOR]: 'terrain/cave/cave-floor3',
    [TerrainType.WALL_HOUSE]: 'terrain/flat/dirt',
};

// Canonical Direction Order (Clockwise from North)
export const DIRECTION_ORDER = ['n', 'ne', 'se', 's', 'sw', 'nw'];

export const TRANSITION_COMBINATIONS = [
    'n-ne-se-s-sw-nw',
    'n-ne-se-s-sw', 'ne-se-s-sw-nw', 'se-s-sw-nw-n', 's-sw-nw-n-ne', 'sw-nw-n-ne-se', 'nw-n-ne-se-s',
    'n-ne-se-s', 'ne-se-s-sw', 'se-s-sw-nw', 's-sw-nw-n', 'sw-nw-n-ne', 'nw-n-ne-se',
    'n-ne-se', 'ne-se-s', 'se-s-sw', 's-sw-nw', 'sw-nw-n', 'nw-n-ne',
    'n-ne', 'ne-se', 'se-s', 's-sw', 'sw-nw', 'nw-n',
    'n', 'ne', 'se', 's', 'sw', 'nw'
];

export const getWesnothTransition = (terrain: TerrainType, suffix: string) => {
    const basePath = TERRAIN_BASE_FILES[terrain];
    if (!basePath) return null;
    return `${WESNOTH_BASE_URL}/${basePath}-${suffix}.png`;
};

// Verified paths from Wesnoth master repo (Updated with exact filenames)
export const ASSETS: {
    UNITS: { [key: string]: string },
    TERRAIN: Partial<Record<TerrainType, string>>,
    OVERLAYS: Partial<Record<TerrainType, string | string[]>>,
    BLOCK_TEXTURES: Partial<Record<TerrainType, string>>,
    WEATHER: { [key: string]: string }
} = {
    UNITS: {
        // Human Class Variants
        PLAYER_FIGHTER: `${WESNOTH_BASE_URL}/units/human-loyalists/swordsman.png`,
        PLAYER_WIZARD: `${WESNOTH_BASE_URL}/units/human-magi/red-mage.png`,
        PLAYER_ROGUE: `${WESNOTH_BASE_URL}/units/human-outlaws/thief.png`,
        PLAYER_CLERIC: `${WESNOTH_BASE_URL}/units/human-magi/white-mage.png`,
        PLAYER_BARBARIAN: `${WESNOTH_BASE_URL}/units/human-outlaws/thug.png`,
        PLAYER_BARD: `${WESNOTH_BASE_URL}/units/human-loyalists/fencer.png`,
        PLAYER_DRUID: `${WESNOTH_BASE_URL}/units/elves-wood/shaman.png`,
        PLAYER_PALADIN: `${WESNOTH_BASE_URL}/units/human-loyalists/paladin.png`,
        PLAYER_RANGER: `${WESNOTH_BASE_URL}/units/human-loyalists/huntsman.png`,
        PLAYER_SORCERER: `${WESNOTH_BASE_URL}/units/human-magi/silver-mage.png`,
        PLAYER_WARLOCK: `${WESNOTH_BASE_URL}/units/human-magi/dark-adept.png`,

        // Racial Variants (PCs)
        ELF_FIGHTER: `${WESNOTH_BASE_URL}/units/elves-wood/hero.png`,
        ELF_ARCHER: `${WESNOTH_BASE_URL}/units/elves-wood/archer.png`,
        DWARF_FIGHTER: `${WESNOTH_BASE_URL}/units/dwarves/steelclad.png`,
        DWARF_GUARD: `${WESNOTH_BASE_URL}/units/dwarves/guardsman.png`,

        // New Races
        PLAYER_HALFLING: `${WESNOTH_BASE_URL}/units/human-outlaws/footpad.png`,
        PLAYER_DRAGONBORN: `${WESNOTH_BASE_URL}/units/drakes/fighter.png`,
        PLAYER_GNOME: `${WESNOTH_BASE_URL}/units/dwarves/thunderer.png`,
        PLAYER_TIEFLING: `${WESNOTH_BASE_URL}/units/human-magi/dark-adept.png`,
        PLAYER_HALF_ORC: `${WESNOTH_BASE_URL}/units/orcs/warrior.png`,

        // Fallback / Basic
        PLAYER: `${WESNOTH_BASE_URL}/units/human-loyalists/lieutenant.png`,
        ELF: `${WESNOTH_BASE_URL}/units/elves-wood/fighter.png`,
        DWARF: `${WESNOTH_BASE_URL}/units/dwarves/fighter.png`,

        // Enemies
        GOBLIN: `${WESNOTH_BASE_URL}/units/goblins/spearman.png`,
        ORC: `${WESNOTH_BASE_URL}/units/orcs/grunt.png`,
        ORC_ARCHER: `${WESNOTH_BASE_URL}/units/orcs/archer.png`,
        SKELETON: `${WESNOTH_BASE_URL}/units/undead-skeletal/skeleton.png`,
        SKELETON_ARCHER: `${WESNOTH_BASE_URL}/units/undead-skeletal/archer.png`,
        NECROMANCER: `${WESNOTH_BASE_URL}/units/undead-necromancers/dark-sorcerer.png`,
        ZOMBIE: `${WESNOTH_BASE_URL}/units/undead/walking-corpse.png`,
        WOLF: `${WESNOTH_BASE_URL}/units/monsters/wolf.png`,
        BAT: `${WESNOTH_BASE_URL}/units/monsters/vampire-bat.png`,
    },
    // Base Terrain (Canonical filenames for remote loading)
    TERRAIN: {
        [TerrainType.GRASS]: `${WESNOTH_BASE_URL}/terrain/grass/green.png`,
        [TerrainType.PLAINS]: `${WESNOTH_BASE_URL}/terrain/grass/semi-dry.png`,
        [TerrainType.TAIGA]: `${WESNOTH_BASE_URL}/terrain/grass/dry.png`,
        [TerrainType.JUNGLE]: `${WESNOTH_BASE_URL}/terrain/grass/green.png`,
        [TerrainType.TUNDRA]: `${WESNOTH_BASE_URL}/terrain/frozen/snow.png`,
        [TerrainType.FOREST]: `${WESNOTH_BASE_URL}/terrain/grass/green.png`,
        [TerrainType.WATER]: `${WESNOTH_BASE_URL}/terrain/water/coast-tile.png`,
        [TerrainType.MOUNTAIN]: `${WESNOTH_BASE_URL}/terrain/mountains/basic-tile.png`,
        [TerrainType.VILLAGE]: `${WESNOTH_BASE_URL}/terrain/grass/green.png`,
        [TerrainType.CASTLE]: `${WESNOTH_BASE_URL}/terrain/flat/dirt.png`,
        [TerrainType.RUINS]: `${WESNOTH_BASE_URL}/terrain/flat/dirt.png`,
        [TerrainType.DESERT]: `${WESNOTH_BASE_URL}/terrain/sand/desert.png`,
        [TerrainType.SWAMP]: `${WESNOTH_BASE_URL}/terrain/swamp/water-tile.png`,

        [TerrainType.CAVE_FLOOR]: `${WESNOTH_BASE_URL}/terrain/cave/cave-floor3.png`,
        [TerrainType.FUNGUS]: `${WESNOTH_BASE_URL}/terrain/cave/cave-floor3.png`,
        [TerrainType.LAVA]: `${WESNOTH_BASE_URL}/terrain/cave/lava.png`,
        [TerrainType.CHASM]: `${WESNOTH_BASE_URL}/terrain/cave/chasm.png`,

        // Urban
        [TerrainType.COBBLESTONE]: `${WESNOTH_BASE_URL}/terrain/flat/road.png`,
        [TerrainType.DIRT_ROAD]: `${WESNOTH_BASE_URL}/terrain/flat/dirt-dark.png`,
        [TerrainType.WOOD_FLOOR]: `${WESNOTH_BASE_URL}/terrain/cave/cave-floor3.png`, // Placeholder for Wood
        [TerrainType.STONE_FLOOR]: `${WESNOTH_BASE_URL}/terrain/cave/flagstones-dark.png`,
        [TerrainType.WALL_HOUSE]: `${WESNOTH_BASE_URL}/terrain/castle/human-castle-tile.png`,
    },
    // Overlay Objects (Trees, Mountains, Buildings)
    OVERLAYS: {
        [TerrainType.FOREST]: [
            `${WESNOTH_BASE_URL}/terrain/forest/pine-tile.png`,
            `${WESNOTH_BASE_URL}/terrain/forest/deciduous-summer-tile.png`
        ],
        [TerrainType.JUNGLE]: `${WESNOTH_BASE_URL}/terrain/forest/rainforest-tile.png`,
        [TerrainType.TAIGA]: `${WESNOTH_BASE_URL}/terrain/forest/snow-forest-tile.png`,
        [TerrainType.MOUNTAIN]: [
            `${WESNOTH_BASE_URL}/terrain/mountains/basic-tile.png`,
            `${WESNOTH_BASE_URL}/terrain/mountains/dry-tile.png`
        ],
        [TerrainType.VILLAGE]: `${WESNOTH_BASE_URL}/terrain/village/human-cottage.png`,
        [TerrainType.CASTLE]: `${WESNOTH_BASE_URL}/terrain/castle/human-castle-tile.png`,
        [TerrainType.RUINS]: `${WESNOTH_BASE_URL}/terrain/castle/human-ruins-tile.png`,
        [TerrainType.FUNGUS]: `${WESNOTH_BASE_URL}/terrain/cave/fungus-tile.png`,

        // Specific Urban Overlays
        [TerrainType.COBBLESTONE]: `${WESNOTH_BASE_URL}/terrain/village/human-city-tile.png`,
    },
    // 3D Textures for Voxel Battle Mode
    BLOCK_TEXTURES: {
        [TerrainType.GRASS]: `${MC_BASE_URL}/grass_block_top.png`,
        [TerrainType.PLAINS]: `${MC_BASE_URL}/grass_block_top.png`,
        [TerrainType.FOREST]: `${MC_BASE_URL}/grass_block_top.png`,
        [TerrainType.JUNGLE]: `${MC_BASE_URL}/grass_block_top.png`,
        [TerrainType.TAIGA]: `${MC_BASE_URL}/podzol_top.png`,
        [TerrainType.TUNDRA]: `${MC_BASE_URL}/snow.png`,
        [TerrainType.MOUNTAIN]: `${MC_BASE_URL}/stone.png`,
        [TerrainType.WATER]: `${MC_BASE_URL}/blue_concrete.png`,
        [TerrainType.CASTLE]: `${MC_BASE_URL}/stone_bricks.png`,
        [TerrainType.RUINS]: `${MC_BASE_URL}/mossy_cobblestone.png`,
        [TerrainType.VILLAGE]: `${MC_BASE_URL}/oak_planks.png`,
        [TerrainType.DESERT]: `${MC_BASE_URL}/sand.png`,
        [TerrainType.SWAMP]: `${MC_BASE_URL}/grass_block_top.png`,

        [TerrainType.CAVE_FLOOR]: `${MC_BASE_URL}/cobblestone.png`,
        [TerrainType.FUNGUS]: `${MC_BASE_URL}/mycelium_top.png`,
        [TerrainType.LAVA]: `${MC_BASE_URL}/lava_still.png`,
        [TerrainType.CHASM]: `${MC_BASE_URL}/black_concrete.png`,

        [TerrainType.COBBLESTONE]: `${MC_BASE_URL}/cobblestone.png`,
        [TerrainType.STONE_FLOOR]: `${MC_BASE_URL}/stone_bricks.png`,
        [TerrainType.WOOD_FLOOR]: `${MC_BASE_URL}/oak_planks.png`,
        [TerrainType.WALL_HOUSE]: `${MC_BASE_URL}/bricks.png`,
    },
    WEATHER: {
        RAIN: `${WESNOTH_BASE_URL}/weather/rain-heavy.png`,
    }
};

export const getSprite = (race: CharacterRace, cls: CharacterClass) => {
    // 1. Racial Overrides (Unique silhouettes)
    if (race === CharacterRace.DRAGONBORN) return ASSETS.UNITS.PLAYER_DRAGONBORN;
    if (race === CharacterRace.HALFLING) return ASSETS.UNITS.PLAYER_HALFLING;
    if (race === CharacterRace.GNOME) return ASSETS.UNITS.PLAYER_GNOME;
    if (race === CharacterRace.HALF_ORC) return ASSETS.UNITS.PLAYER_HALF_ORC;

    // 2. Elf/Dwarf Logic
    if (race === CharacterRace.ELF) {
        if (cls === CharacterClass.RANGER || cls === CharacterClass.ROGUE) return ASSETS.UNITS.ELF_ARCHER;
        return ASSETS.UNITS.ELF_FIGHTER;
    }
    if (race === CharacterRace.DWARF) {
        if (cls === CharacterClass.FIGHTER || cls === CharacterClass.PALADIN) return ASSETS.UNITS.DWARF_GUARD;
        return ASSETS.UNITS.DWARF_FIGHTER;
    }

    // 3. Class Defaults (Human/Tiefling usually share human-ish sprites unless customized)
    // Tieflings use Warlock sprite as base for "dark/mystical" look if not overridden
    if (race === CharacterRace.TIEFLING) return ASSETS.UNITS.PLAYER_TIEFLING;

    // Humans use class sprites
    switch (cls) {
        case CharacterClass.WIZARD: return ASSETS.UNITS.PLAYER_WIZARD;
        case CharacterClass.ROGUE: return ASSETS.UNITS.PLAYER_ROGUE;
        case CharacterClass.CLERIC: return ASSETS.UNITS.PLAYER_CLERIC;
        case CharacterClass.BARBARIAN: return ASSETS.UNITS.PLAYER_BARBARIAN;
        case CharacterClass.BARD: return ASSETS.UNITS.PLAYER_BARD;
        case CharacterClass.DRUID: return ASSETS.UNITS.PLAYER_DRUID;
        case CharacterClass.PALADIN: return ASSETS.UNITS.PLAYER_PALADIN;
        case CharacterClass.RANGER: return ASSETS.UNITS.PLAYER_RANGER;
        case CharacterClass.SORCERER: return ASSETS.UNITS.PLAYER_SORCERER;
        case CharacterClass.WARLOCK: return ASSETS.UNITS.PLAYER_WARLOCK;
        default: return ASSETS.UNITS.PLAYER_FIGHTER;
    }
};
