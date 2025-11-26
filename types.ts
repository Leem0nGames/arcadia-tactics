
export enum GameState {
  LOGIN,
  CHARACTER_CREATION,
  OVERWORLD,
  TOWN_EXPLORATION, // New state for walking inside cities
  BATTLE_INIT,
  BATTLE_TACTICAL,
  BATTLE_RESOLUTION,
  BATTLE_VICTORY,
  BATTLE_DEFEAT,
  LOCAL_MAP
}

export enum Dimension {
  NORMAL = 'NORMAL',
  UPSIDE_DOWN = 'UPSIDE_DOWN'
}

export enum Difficulty {
  EASY = 'EASY',
  NORMAL = 'NORMAL',
  HARD = 'HARD'
}

export enum TerrainType {
  GRASS = 'grass',
  FOREST = 'forest',
  MOUNTAIN = 'mountain',
  WATER = 'water',
  CASTLE = 'castle',
  VILLAGE = 'village',
  DESERT = 'desert',
  SWAMP = 'swamp',
  PLAINS = 'plains',
  TAIGA = 'taiga',
  JUNGLE = 'jungle',
  TUNDRA = 'tundra',
  RUINS = 'ruins',
  // Upside Down / Cave Biomes
  CAVE_FLOOR = 'cave_floor',
  FUNGUS = 'fungus',
  LAVA = 'lava',
  CHASM = 'chasm',
  // Urban / Town Biomes
  COBBLESTONE = 'cobblestone',
  DIRT_ROAD = 'dirt_road',
  WOOD_FLOOR = 'wood_floor',
  STONE_FLOOR = 'stone_floor',
  WALL_HOUSE = 'wall_house'
}

export enum WeatherType {
  NONE = 'NONE',
  RAIN = 'RAIN',
  SNOW = 'SNOW',
  FOG = 'FOG',
  ASH = 'ASH' // New weather for Upside Down
}

// --- D&D 5E Stats ---

export enum Ability {
  STR = 'STR',
  DEX = 'DEX',
  CON = 'CON',
  INT = 'INT',
  WIS = 'WIS',
  CHA = 'CHA'
}

export interface Attributes {
  [Ability.STR]: number;
  [Ability.DEX]: number;
  [Ability.CON]: number;
  [Ability.INT]: number;
  [Ability.WIS]: number;
  [Ability.CHA]: number;
}

export enum CharacterClass {
  FIGHTER = 'Fighter',
  WIZARD = 'Wizard',
  ROGUE = 'Rogue',
  CLERIC = 'Cleric',
  BARBARIAN = 'Barbarian',
  BARD = 'Bard',
  DRUID = 'Druid',
  PALADIN = 'Paladin',
  RANGER = 'Ranger',
  SORCERER = 'Sorcerer',
  WARLOCK = 'Warlock'
}

export enum CharacterRace {
  HUMAN = 'Human',
  ELF = 'Elf',
  DWARF = 'Dwarf',
  HALFLING = 'Halfling',
  DRAGONBORN = 'Dragonborn',
  GNOME = 'Gnome',
  TIEFLING = 'Tiefling',
  HALF_ORC = 'Half-Orc'
}

export enum BattleAction {
  MOVE = 'MOVE',
  ATTACK = 'ATTACK',
  MAGIC = 'MAGIC',
  ITEM = 'ITEM',
  WAIT = 'WAIT',
  RUN = 'RUN'
}

export enum SpellType {
  DAMAGE = 'DAMAGE',
  HEAL = 'HEAL',
  BUFF = 'BUFF'
}

export interface Spell {
  id: string;
  name: string;
  level: number; // 0 for Cantrip
  range: number; // 1 for touch, 6 for 30ft, 12 for 60ft
  type: SpellType;
  diceCount: number;
  diceSides: number;
  description: string;
  animation?: string;
}

export enum EquipmentSlot {
  MAIN_HAND = 'main_hand',
  OFF_HAND = 'off_hand',
  BODY = 'body'
}

export interface Item {
  id: string;
  name: string;
  type: 'consumable' | 'equipment' | 'key';
  description: string;
  icon: string;
  effect?: {
      type: 'heal_hp' | 'restore_mana' | 'buff_str';
      amount: number;
  };
  equipmentStats?: {
      slot: EquipmentSlot;
      ac?: number; // Armor Class bonus or base
      diceCount?: number; // For weapons
      diceSides?: number; // For weapons
      modifiers?: Partial<Attributes>; // Stat bonuses
  }
}

export interface InventorySlot {
  item: Item;
  quantity: number;
}

// --- ECS Components ---

export interface Entity {
  id: string;
  name: string;
  type: 'PLAYER' | 'ENEMY' | 'NPC';
  equipment: Partial<Record<EquipmentSlot, Item>>; // Moved equipment here
}

export interface PositionComponent {
  x: number; // Hex X or 3D Grid X
  y: number; // Hex Y or 3D Grid Z
  z?: number; // Height for 3D
}

export interface CombatStatsComponent {
  level: number;
  class: CharacterClass; // Added class to stats for easier access
  race?: CharacterRace;
  xp: number;
  xpToNextLevel: number;
  hp: number;
  maxHp: number;
  ac: number;
  initiativeBonus: number;
  speed: number; // in ft (e.g., 30)
  attributes: Attributes;
  baseAttributes: Attributes; // Stats without equipment
  spellSlots: {
      current: number;
      max: number;
  };
}

export interface VisualComponent {
  spriteUrl?: string;
  color: string;
  modelType: 'billboard' | 'voxel';
}

// --- Game World Data ---

export interface HexCell {
  q: number;
  r: number;
  terrain: TerrainType;
  isExplored: boolean;
  isVisible: boolean; // Fog of war
  hasEncounter?: boolean;
  hasPortal?: boolean; // Gateway to Upside Down
  weather: WeatherType;
  poiType?: 'SHOP' | 'INN' | 'PLAZA' | 'EXIT'; // Specific interactions for town tiles
}

// 3D Battle Map Data
export interface BattleCell {
  x: number;
  z: number;
  height: number;
  offsetY: number;
  color: string;
  textureUrl: string;
  isObstacle: boolean; // For LoS calculations (high walls)
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

export interface GameLogEntry {
  id: string;
  message: string;
  type: 'info' | 'combat' | 'narrative' | 'roll' | 'levelup';
  timestamp: number;
}

export interface DamagePopup {
  id: string;
  position: [number, number, number];
  amount: string | number;
  color: string;
  isCrit: boolean;
  icon?: string; 
  timestamp: number;
}

export interface SpellEffectData {
  id: string;
  startPos: [number, number, number];
  endPos: [number, number, number];
  color: string;
  duration: number;
}
