
import { create } from 'zustand';
import {
    GameState, TerrainType, HexCell, PositionComponent, Entity,
    GameLogEntry, CharacterRace, CharacterClass, Attributes,
    CombatStatsComponent, BattleAction, Spell, SpellType, DamagePopup,
    InventorySlot, SpellEffectData, WeatherType, Dimension, Item, EquipmentSlot, Ability, BattleCell, Difficulty, VisualComponent
} from '../types';
import { calculateHp, calculateAC, rollD20, rollDice, getModifier } from '../services/dndRules';
import { ASSETS, SPELLS, CLASS_SPELLS, ITEMS, XP_TABLE, TERRAIN_COLORS, DIFFICULTY_SETTINGS, TERRAIN_MOVEMENT_COST, BASE_STATS, RACE_BONUS, getSprite } from '../constants';
import { sfx } from '../services/SoundSystem';
import { findPath, findBattlePath } from '../services/pathfinding';

interface GameStateData {
    // Global State
    gameState: GameState;
    dimension: Dimension;
    difficulty: Difficulty;

    // Overworld State
    maps: Record<Dimension, HexCell[]>;
    currentMapData: HexCell[];
    playerPos: PositionComponent;
    isPlayerMoving: boolean;
    lastOverworldPos: PositionComponent | null; // For returning from Town

    // Party Data
    party: (Entity & { stats: CombatStatsComponent, visual: VisualComponent })[];
    inventory: InventorySlot[];
    isInventoryOpen: boolean;
    activeInventoryCharacterId: string | null;

    // Battle State
    battleEntities: (Entity & { stats: CombatStatsComponent, position: PositionComponent, visual: VisualComponent })[];
    turnOrder: string[];
    currentTurnIndex: number;
    battleTerrain: TerrainType;
    battleWeather: WeatherType;
    battleRewards: { xp: number, gold: number, items: Item[] };
    battleMap: BattleCell[];

    // Action State
    selectedAction: BattleAction | null;
    selectedSpell: Spell | null;
    hasMoved: boolean;
    hasActed: boolean;
    selectedTile: { x: number, z: number } | null;
    hoveredEntity: Entity | null;
    standingOnPortal: boolean;
    standingOnSettlement: boolean;
    runAvailable: boolean;

    // Logs & FX
    logs: GameLogEntry[];
    damagePopups: DamagePopup[];
    activeSpellEffect: SpellEffectData | null;
}

interface GameActions {
    initializeWorld: (normalMap: HexCell[], upsideDownMap: HexCell[]) => void;
    createCharacter: (name: string, race: CharacterRace, cls: CharacterClass, stats: Attributes, difficulty: Difficulty) => void;
    movePlayerOverworld: (q: number, r: number) => Promise<void>;
    usePortal: () => void;
    enterSettlement: () => void;
    exitSettlement: () => void;
    setGameState: (state: GameState) => void;
    toggleInventory: () => void;
    cycleInventoryCharacter: (direction: 'next' | 'prev') => void;
    startBattle: (terrain: TerrainType, weather: WeatherType) => void;
    selectAction: (action: BattleAction) => void;
    selectSpell: (spellId: string) => void;
    handleTileInteraction: (x: number, z: number) => void;
    handleTileHover: (x: number, z: number) => void;
    nextTurn: () => void;
    attemptRun: () => void;
    consumeItem: (itemId: string, characterId?: string) => void;
    equipItem: (itemId: string, characterId: string) => void;
    unequipItem: (slot: EquipmentSlot, characterId: string) => void;
    addLog: (message: string, type?: GameLogEntry['type']) => void;
    restartBattle: () => void;
    quitToMenu: () => void;
    continueAfterVictory: () => void;
    getAttackPrediction: () => { chance: number, minDmg: number, maxDmg: number } | null;
    recalculateStats: (entity: Entity & { stats: CombatStatsComponent }) => CombatStatsComponent;
    levelUpParty: () => void;
    hasLineOfSight: (source: PositionComponent, target: PositionComponent) => boolean;
    saveGame: () => void;
    loadGame: () => void;
}

const generateId = () => Math.random().toString(36).substr(2, 9);
const SAVE_KEY = 'arcadia_tactics_save_v1';

// --- TOWN GENERATION ---
const generateTownMap = (): HexCell[] => {
    const width = 12;
    const height = 12;
    const cells: HexCell[] = [];

    for (let r = 0; r < height; r++) {
        for (let q = 0; q < width; q++) {
            let terrain = TerrainType.GRASS;
            let poiType: HexCell['poiType'] = undefined;

            // Central Plaza
            if (q >= 4 && q <= 7 && r >= 4 && r <= 7) {
                terrain = TerrainType.COBBLESTONE;
                if (q === 5 && r === 5) poiType = 'PLAZA';
            }
            // Main Roads
            else if (q === 5 || q === 6 || r === 5 || r === 6) {
                terrain = TerrainType.DIRT_ROAD;
            }
            // Shops & Houses (Cobblestone overlay often used for dense city look)
            else if (Math.random() > 0.4) {
                terrain = TerrainType.COBBLESTONE; // Represents built-up area
                if (Math.random() > 0.8) poiType = 'SHOP';
                else if (Math.random() > 0.9) poiType = 'INN';
            }

            // Exits at edges
            if (q === 0 || q === width - 1 || r === 0 || r === height - 1) {
                poiType = 'EXIT';
                terrain = TerrainType.DIRT_ROAD;
            }

            cells.push({
                q, r, terrain, isExplored: true, isVisible: true, weather: WeatherType.NONE, poiType
            });
        }
    }
    return cells;
};

// --- OPTIMIZED ARENA MAP GENERATION ---
const generateBattleGrid = (terrainType: TerrainType): BattleCell[] => {
    const grid: BattleCell[] = [];
    const size = 8;

    // Textures with safe fallback
    const floorTex = ASSETS.BLOCK_TEXTURES[terrainType] || ASSETS.BLOCK_TEXTURES[TerrainType.GRASS] || 'assets/minecraft/grass_block_top.png';
    const wallTex = ASSETS.BLOCK_TEXTURES[TerrainType.CASTLE] || 'assets/minecraft/stone_bricks.png';
    const obstacleTex = terrainType === TerrainType.FOREST
        ? (ASSETS.BLOCK_TEXTURES[TerrainType.FOREST] || floorTex)
        : (ASSETS.BLOCK_TEXTURES[TerrainType.MOUNTAIN] || wallTex);

    // Layout Logic
    // 0 = Floor, 1 = Low Wall/Obstacle, 2 = High Block
    const layout = [
        [1, 1, 0, 0, 0, 0, 1, 1],
        [1, 0, 0, 0, 0, 0, 0, 1],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [1, 0, 0, 0, 0, 0, 0, 1],
        [1, 1, 0, 0, 0, 0, 1, 1],
    ];

    // Add random cover
    const seed = Math.random();
    if (seed > 0.5) {
        layout[2][2] = 1; layout[2][5] = 1; layout[5][2] = 1; layout[5][5] = 1; // Pillars
    } else {
        layout[3][3] = 1; layout[3][4] = 1; layout[4][3] = 1; layout[4][4] = 1; // Center block
    }

    for (let x = 0; x < size; x++) {
        for (let z = 0; z < size; z++) {
            const type = layout[z][x];
            let height = 1;
            let offsetY = 0;
            let textureUrl = floorTex!;
            let isObstacle = false;
            let color = TERRAIN_COLORS[terrainType];

            // Center (Arena Floor) is always flat for better gameplay
            const isCenter = (x >= 2 && x <= 5 && z >= 2 && z <= 5);

            if (type === 1 && !isCenter) {
                height = 2; // Obstacle
                isObstacle = true;
                textureUrl = obstacleTex!;
                color = '#57534e';
            } else if (type === 2) {
                height = 3;
                isObstacle = true;
                textureUrl = wallTex!;
            }

            // Ensure spawns are clear
            if ((x === 3 || x === 2 || x === 4) && (z === 6 || z === 7)) { height = 1; isObstacle = false; textureUrl = floorTex!; } // Player Spawn
            if ((x === 3 || x === 4) && (z === 2 || z === 3)) { height = 1; isObstacle = false; textureUrl = floorTex!; } // Enemy Spawn area check

            grid.push({ x, z, height, offsetY, color, textureUrl, isObstacle });
        }
    }
    return grid;
};

const getCasterSlots = (cls: CharacterClass, level: number) => {
    if ([CharacterClass.WIZARD, CharacterClass.CLERIC, CharacterClass.DRUID, CharacterClass.SORCERER, CharacterClass.BARD].includes(cls)) return { current: 2, max: 2 };
    if (cls === CharacterClass.WARLOCK) return { current: 1, max: 1 };
    return { current: 0, max: 0 };
}

const getHitDie = (cls: CharacterClass) => {
    if (cls === CharacterClass.BARBARIAN) return 12;
    if ([CharacterClass.FIGHTER, CharacterClass.PALADIN, CharacterClass.RANGER].includes(cls)) return 10;
    if ([CharacterClass.WIZARD, CharacterClass.SORCERER].includes(cls)) return 6;
    return 8;
}

const generateCompanion = (name: string, race: CharacterRace, cls: CharacterClass, level: number): (Entity & { stats: CombatStatsComponent, visual: VisualComponent }) => {
    const baseStats = { ...BASE_STATS[cls] };
    const bonus = RACE_BONUS[race];
    (Object.keys(baseStats) as Ability[]).forEach(k => { if (bonus[k]) baseStats[k] += bonus[k]!; });
    const maxHp = calculateHp(level, baseStats.CON, getHitDie(cls));

    // Default Equipment
    const equipment: Partial<Record<EquipmentSlot, Item>> = {};
    if (cls === CharacterClass.FIGHTER || cls === CharacterClass.PALADIN) { equipment[EquipmentSlot.MAIN_HAND] = ITEMS.LONGSWORD; equipment[EquipmentSlot.BODY] = ITEMS.CHAIN_MAIL; equipment[EquipmentSlot.OFF_HAND] = ITEMS.SHIELD; }
    else if (cls === CharacterClass.BARBARIAN) { equipment[EquipmentSlot.MAIN_HAND] = ITEMS.GREATAXE; }
    else if (cls === CharacterClass.ROGUE) { equipment[EquipmentSlot.MAIN_HAND] = ITEMS.DAGGER; equipment[EquipmentSlot.BODY] = ITEMS.LEATHER_ARMOR; }
    else if (cls === CharacterClass.CLERIC) { equipment[EquipmentSlot.MAIN_HAND] = ITEMS.MACE; equipment[EquipmentSlot.BODY] = ITEMS.CHAIN_SHIRT; equipment[EquipmentSlot.OFF_HAND] = ITEMS.SHIELD; }
    else { equipment[EquipmentSlot.MAIN_HAND] = ITEMS.QUARTERSTAFF; }

    return {
        id: `comp_${generateId()}`, name, type: 'PLAYER' as const, equipment,
        stats: { level, class: cls, race, xp: 0, xpToNextLevel: XP_TABLE[level] || 999999, hp: maxHp, maxHp, ac: 10, initiativeBonus: getModifier(baseStats.DEX), speed: 30, attributes: baseStats, baseAttributes: { ...baseStats }, spellSlots: getCasterSlots(cls, level) },
        visual: { color: '#3b82f6', modelType: 'billboard' as const, spriteUrl: getSprite(race, cls) }
    };
};

export const useGameStore = create<GameStateData & GameActions>((set, get) => ({
    gameState: GameState.CHARACTER_CREATION,
    dimension: Dimension.NORMAL,
    difficulty: Difficulty.NORMAL,
    maps: { [Dimension.NORMAL]: [], [Dimension.UPSIDE_DOWN]: [] },
    currentMapData: [],
    playerPos: { x: 5, y: 5 },
    isPlayerMoving: false,
    lastOverworldPos: null,
    party: [],
    inventory: [],
    isInventoryOpen: false,
    activeInventoryCharacterId: null,
    battleEntities: [],
    turnOrder: [],
    currentTurnIndex: 0,
    battleTerrain: TerrainType.GRASS,
    battleWeather: WeatherType.NONE,
    battleRewards: { xp: 0, gold: 0, items: [] },
    battleMap: [],
    selectedAction: null,
    selectedSpell: null,
    hasMoved: false,
    hasActed: false,
    selectedTile: null,
    hoveredEntity: null,
    standingOnPortal: false,
    standingOnSettlement: false,
    runAvailable: false,
    logs: [],
    damagePopups: [],
    activeSpellEffect: null,

    addLog: (message, type = 'info') => set(state => ({ logs: [...state.logs, { id: generateId(), message, type, timestamp: Date.now() }] })),
    initializeWorld: (normalMap, upsideDownMap) => set({ maps: { [Dimension.NORMAL]: normalMap, [Dimension.UPSIDE_DOWN]: upsideDownMap }, currentMapData: normalMap }),
    setGameState: (state) => set({ gameState: state }),
    toggleInventory: () => { sfx.playUiClick(); const state = get(); set({ isInventoryOpen: !state.isInventoryOpen, activeInventoryCharacterId: !state.isInventoryOpen ? (state.party[0]?.id || null) : state.activeInventoryCharacterId }); },
    cycleInventoryCharacter: (direction) => { const { party, activeInventoryCharacterId } = get(); if (party.length === 0) return; const idx = party.findIndex(p => p.id === activeInventoryCharacterId); let newIdx = direction === 'next' ? idx + 1 : idx - 1; if (newIdx >= party.length) newIdx = 0; if (newIdx < 0) newIdx = party.length - 1; set({ activeInventoryCharacterId: party[newIdx].id }); },

    createCharacter: (name, race, cls, stats, difficulty) => {
        sfx.playVictory();
        const maxHp = calculateHp(1, stats.CON, getHitDie(cls));
        const startSlots = getCasterSlots(cls, 1);
        let spriteUrl = getSprite(race, cls);
        const equipment: Partial<Record<EquipmentSlot, Item>> = {};
        const inventory: InventorySlot[] = [{ item: ITEMS.POTION_HEALING, quantity: 3 }, { item: ITEMS.RATION, quantity: 5 }];

        switch (cls) {
            case CharacterClass.FIGHTER: case CharacterClass.PALADIN: equipment[EquipmentSlot.MAIN_HAND] = ITEMS.LONGSWORD; equipment[EquipmentSlot.BODY] = ITEMS.CHAIN_MAIL; equipment[EquipmentSlot.OFF_HAND] = ITEMS.SHIELD; break;
            case CharacterClass.BARBARIAN: equipment[EquipmentSlot.MAIN_HAND] = ITEMS.GREATAXE; break;
            case CharacterClass.RANGER: equipment[EquipmentSlot.MAIN_HAND] = ITEMS.SHORTSWORD; equipment[EquipmentSlot.OFF_HAND] = ITEMS.DAGGER; equipment[EquipmentSlot.BODY] = ITEMS.LEATHER_ARMOR; break;
            case CharacterClass.ROGUE: equipment[EquipmentSlot.MAIN_HAND] = ITEMS.DAGGER; equipment[EquipmentSlot.BODY] = ITEMS.LEATHER_ARMOR; break;
            case CharacterClass.CLERIC: equipment[EquipmentSlot.MAIN_HAND] = ITEMS.MACE; equipment[EquipmentSlot.BODY] = ITEMS.CHAIN_SHIRT; equipment[EquipmentSlot.OFF_HAND] = ITEMS.SHIELD; inventory.push({ item: ITEMS.POTION_MANA, quantity: 1 }); break;
            default: equipment[EquipmentSlot.MAIN_HAND] = ITEMS.QUARTERSTAFF; inventory.push({ item: ITEMS.POTION_MANA, quantity: 2 });
        }

        const leader = { id: 'player_leader', name, type: 'PLAYER' as const, equipment, stats: { level: 1, class: cls, race, xp: 0, xpToNextLevel: XP_TABLE[1] || 300, hp: maxHp, maxHp, ac: 10, initiativeBonus: Math.floor((stats.DEX - 10) / 2), speed: 30, attributes: stats, baseAttributes: { ...stats }, spellSlots: startSlots }, visual: { color: '#3b82f6', modelType: 'billboard' as const, spriteUrl } };
        const companions = [];
        const isTank = [CharacterClass.FIGHTER, CharacterClass.BARBARIAN, CharacterClass.PALADIN].includes(cls);
        const isHealer = [CharacterClass.CLERIC, CharacterClass.DRUID].includes(cls);
        if (isTank) { companions.push(generateCompanion("Elara", CharacterRace.HUMAN, CharacterClass.CLERIC, 1)); companions.push(generateCompanion("Zan", CharacterRace.ELF, CharacterClass.WIZARD, 1)); }
        else if (isHealer) { companions.push(generateCompanion("Thrumgar", CharacterRace.DWARF, CharacterClass.FIGHTER, 1)); companions.push(generateCompanion("Vex", CharacterRace.HUMAN, CharacterClass.ROGUE, 1)); }
        else { companions.push(generateCompanion("Kael", CharacterRace.HUMAN, CharacterClass.PALADIN, 1)); companions.push(generateCompanion("Lira", CharacterRace.ELF, CharacterClass.DRUID, 1)); }

        const party = [leader, ...companions].map(p => ({ ...p, stats: get().recalculateStats(p) }));
        const { currentMapData, maps } = get();
        const updatedMap = currentMapData.map(cell => { const dist = (Math.abs(cell.q - 5) + Math.abs(cell.q + cell.r - 5 - 5) + Math.abs(cell.r - 5)) / 2; return dist <= 2 ? { ...cell, isExplored: true, isVisible: true } : { ...cell, isVisible: false }; });
        set({ party, difficulty, inventory, gameState: GameState.OVERWORLD, playerPos: { x: 5, y: 5 }, activeInventoryCharacterId: leader.id, currentMapData: updatedMap, maps: { ...maps, [Dimension.NORMAL]: updatedMap } });
        get().addLog(`The party assembles! ${name} leads ${companions[0].name} and ${companions[1].name}.`, 'narrative');
    },

    recalculateStats: (entity) => {
        const effectiveAttributes = { ...entity.stats.baseAttributes };
        let armorBase = 10; let shieldBonus = 0;
        Object.values(entity.equipment).forEach((item: any) => {
            if (!item || !item.equipmentStats) return;
            const stats = item.equipmentStats;
            if (stats.modifiers) Object.entries(stats.modifiers).forEach(([key, val]) => { if (val) effectiveAttributes[key as keyof Attributes] += (val as number); });
            if (stats.slot === EquipmentSlot.BODY && stats.ac) armorBase = stats.ac;
            if (stats.slot === EquipmentSlot.OFF_HAND && stats.ac) shieldBonus = stats.ac;
        });
        let dexMod = getModifier(effectiveAttributes.DEX);
        if (armorBase >= 16) dexMod = 0; else if (armorBase >= 13) dexMod = Math.min(2, dexMod);
        return { ...entity.stats, ac: armorBase + dexMod + shieldBonus, attributes: effectiveAttributes, initiativeBonus: getModifier(effectiveAttributes.DEX) };
    },

    levelUpParty: () => {
        const { party } = get();
        const upgradedParty = party.map(member => {
            const nextLevel = member.stats.level + 1;
            const conMod = getModifier(member.stats.baseAttributes.CON);
            const hitDie = getHitDie(member.stats.class);
            const newMaxHp = member.stats.maxHp + Math.max(1, Math.floor(hitDie / 2) + 1 + conMod);
            const newSpellSlots = getCasterSlots(member.stats.class, nextLevel);
            const newBaseAttributes = { ...member.stats.baseAttributes };
            if (nextLevel % 4 === 0) newBaseAttributes[Ability.STR] += 1; // Simplified stat bump
            const tempEntity = { ...member, stats: { ...member.stats, level: nextLevel, maxHp: newMaxHp, hp: newMaxHp, spellSlots: newSpellSlots, baseAttributes: newBaseAttributes, xpToNextLevel: XP_TABLE[nextLevel] || 999999 } };
            return { ...member, stats: get().recalculateStats(tempEntity) };
        });
        set({ party: upgradedParty }); sfx.playVictory(); get().addLog(`The party reached level ${upgradedParty[0].stats.level}!`, "levelup");
    },

    consumeItem: (itemId, characterId) => {
        const state = get();
        const slotIndex = state.inventory.findIndex(s => s.item.id === itemId);
        if (slotIndex === -1) return;
        sfx.playMagic();
        const item = state.inventory[slotIndex].item;
        let targetId = characterId || state.activeInventoryCharacterId || state.party[0].id;

        if (state.gameState === GameState.BATTLE_TACTICAL) {
            const turnId = state.turnOrder[state.currentTurnIndex];
            if (state.battleEntities.find(e => e.id === turnId)?.type === 'PLAYER') targetId = turnId;
        }

        const applyEffect = (stats: CombatStatsComponent) => {
            const newStats = { ...stats };
            let amount = 0;
            if (item.effect?.type === 'heal_hp') { amount = item.id.includes('potion') ? rollDice(4, 2) + 2 : item.effect.amount; newStats.hp = Math.min(newStats.maxHp, newStats.hp + amount); }
            else if (item.effect?.type === 'restore_mana') { amount = item.effect.amount; newStats.spellSlots.current = Math.min(newStats.spellSlots.max, newStats.spellSlots.current + amount); }
            else if (item.effect?.type === 'buff_str') { amount = item.effect.amount; newStats.baseAttributes.STR += amount; newStats.attributes.STR += amount; }
            return { stats: newStats, amount };
        };

        if (state.gameState === GameState.BATTLE_TACTICAL) {
            const ent = state.battleEntities.find(e => e.id === targetId);
            if (ent) {
                const { stats, amount } = applyEffect(ent.stats);
                addDamagePopup(ent.position, `+${amount}`, '#22c55e');
                set({ battleEntities: state.battleEntities.map(e => e.id === targetId ? { ...e, stats } : e), hasActed: true, isInventoryOpen: false });
            }
        } else {
            const newParty = state.party.map(p => { if (p.id === targetId) { const { stats, amount } = applyEffect(p.stats); get().addLog(`${p.name} used ${item.name}. (+${amount})`, "roll"); return { ...p, stats }; } return p; });
            set({ party: newParty });
        }
        const newInventory = [...state.inventory];
        if (newInventory[slotIndex].quantity > 1) newInventory[slotIndex].quantity--; else newInventory.splice(slotIndex, 1);
        set({ inventory: newInventory });
    },

    equipItem: (itemId, characterId) => {
        const state = get(); const slotIndex = state.inventory.findIndex(s => s.item.id === itemId); if (slotIndex === -1) return;
        const itemToEquip = state.inventory[slotIndex].item as Item; if (!itemToEquip.equipmentStats) return;
        const charIndex = state.party.findIndex(p => p.id === characterId); if (charIndex === -1) return;
        const character = state.party[charIndex]; const targetSlot = itemToEquip.equipmentStats.slot; const currentEquipped = character.equipment[targetSlot];
        const newInventory = [...state.inventory];
        if (newInventory[slotIndex].quantity > 1) newInventory[slotIndex].quantity--; else newInventory.splice(slotIndex, 1);
        if (currentEquipped) { const existingSlot = newInventory.find(s => s.item.id === currentEquipped.id); if (existingSlot) existingSlot.quantity++; else newInventory.push({ item: currentEquipped, quantity: 1 }); }
        const updatedChar = { ...character, equipment: { ...character.equipment, [targetSlot]: itemToEquip } };
        updatedChar.stats = get().recalculateStats(updatedChar);
        const newParty = [...state.party]; newParty[charIndex] = updatedChar; set({ inventory: newInventory, party: newParty }); sfx.playUiClick();
    },

    unequipItem: (slot, characterId) => {
        const state = get(); const charIndex = state.party.findIndex(p => p.id === characterId); if (charIndex === -1) return;
        const character = state.party[charIndex]; const itemToRemove = character.equipment[slot]; if (!itemToRemove) return;
        const newInventory = [...state.inventory];
        const existingSlot = newInventory.find(s => s.item.id === itemToRemove.id); if (existingSlot) existingSlot.quantity++; else newInventory.push({ item: itemToRemove, quantity: 1 });
        const newEquipment = { ...character.equipment }; delete newEquipment[slot];
        const updatedChar = { ...character, equipment: newEquipment }; updatedChar.stats = get().recalculateStats(updatedChar);
        const newParty = [...state.party]; newParty[charIndex] = updatedChar; set({ inventory: newInventory, party: newParty }); sfx.playUiClick();
    },

    movePlayerOverworld: async (q, r) => {
        const { isPlayerMoving, playerPos, currentMapData } = get(); if (isPlayerMoving || (playerPos.x === q && playerPos.y === r)) return;
        const path = findPath({ q: playerPos.x, r: playerPos.y }, { q, r }, currentMapData); if (!path || path.length === 0) return;
        set({ isPlayerMoving: true }); sfx.playUiClick();

        for (const stepCell of path) {
            // Stop if game state changes (combat, etc)
            if (get().gameState !== GameState.OVERWORLD && get().gameState !== GameState.TOWN_EXPLORATION) break;

            const { party, dimension, maps, currentMapData: activeMap, gameState } = get(); sfx.playStep();

            // Check Town Exit
            if (gameState === GameState.TOWN_EXPLORATION && stepCell.poiType === 'EXIT') {
                get().exitSettlement();
                break;
            }

            let viewRadius = dimension === Dimension.UPSIDE_DOWN ? 1.5 : 2;
            const newMap = activeMap.map(cell => { const d = (Math.abs(cell.q - stepCell.q) + Math.abs(cell.q + cell.r - stepCell.q - stepCell.r) + Math.abs(cell.r - stepCell.r)) / 2; return d <= viewRadius ? { ...cell, isExplored: true, isVisible: true } : { ...cell, isVisible: false }; });

            set({ playerPos: { x: stepCell.q, y: stepCell.r }, currentMapData: newMap, standingOnPortal: !!stepCell.hasPortal, standingOnSettlement: (stepCell.terrain === TerrainType.VILLAGE || stepCell.terrain === TerrainType.CASTLE) && gameState === GameState.OVERWORLD });

            // Only update global map storage if in Overworld (Don't save Fog of War changes for temp town map to global)
            if (gameState === GameState.OVERWORLD) {
                set({ maps: { ...maps, [dimension]: newMap } });
            }

            if (stepCell.hasPortal) { sfx.playMagic(); break; }
            if (stepCell.hasEncounter && !['castle', 'village', 'cobblestone'].some(t => stepCell.terrain.includes(t)) && gameState === GameState.OVERWORLD) {
                get().startBattle(stepCell.terrain, stepCell.weather);
                const cleanMap = newMap.map(c => c.q === stepCell.q && c.r === stepCell.r ? { ...c, hasEncounter: false } : c);
                set({ currentMapData: cleanMap, maps: { ...maps, [dimension]: cleanMap } }); break;
            }
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        set({ isPlayerMoving: false });
    },

    enterSettlement: () => {
        const { playerPos, currentMapData } = get();
        sfx.playUiClick();
        const townMap = generateTownMap();
        set({
            gameState: GameState.TOWN_EXPLORATION,
            lastOverworldPos: playerPos,
            currentMapData: townMap,
            playerPos: { x: 0, y: 6 }, // Entrance
            standingOnSettlement: false
        });
        get().addLog("Entered settlement.", "narrative");
    },

    exitSettlement: () => {
        const { lastOverworldPos, maps, dimension } = get();
        if (!lastOverworldPos) return;
        sfx.playUiClick();
        set({
            gameState: GameState.OVERWORLD,
            currentMapData: maps[dimension],
            playerPos: lastOverworldPos,
            lastOverworldPos: null
        });
        get().addLog("Returned to the wild.", "narrative");
    },

    usePortal: () => {
        const { dimension, maps, playerPos } = get();
        const targetDimension = dimension === Dimension.NORMAL ? Dimension.UPSIDE_DOWN : Dimension.NORMAL;
        sfx.playMagic(); get().addLog("Dimension Hop!", "narrative");
        const targetMap = maps[targetDimension];
        const updatedTargetMap = targetMap.map(cell => { const d = (Math.abs(cell.q - playerPos.x) + Math.abs(cell.q + cell.r - playerPos.x - playerPos.y) + Math.abs(cell.r - playerPos.y)) / 2; return d <= 2 ? { ...cell, isExplored: true, isVisible: true } : { ...cell, isVisible: false }; });
        set({ dimension: targetDimension, currentMapData: updatedTargetMap, maps: { ...maps, [targetDimension]: updatedTargetMap } });
    },

    startBattle: (terrain, weather) => {
        const { party, dimension, difficulty } = get(); if (party.length === 0) return; sfx.playUiClick();
        const isShadow = dimension === Dimension.UPSIDE_DOWN; const diffConfig = DIFFICULTY_SETTINGS[difficulty];
        const avgLevel = Math.floor(party.reduce((sum, p) => sum + p.stats.level, 0) / party.length);
        const enemyLevel = Math.max(1, avgLevel + (Math.floor(Math.random() * 3) - 1));

        // Balanced HP scaling based on D&D 5e CR
        const baseHp = isShadow ? 22 : 9; // Shadow/Undead have more HP than Goblins
        const hpPerLevel = isShadow ? 8 : 5;
        const finalHp = Math.floor((baseHp + (enemyLevel - 1) * hpPerLevel) * diffConfig.enemyStatMod);

        // AC scales every 2 levels
        const baseAc = isShadow ? 14 : 13;
        const finalAc = baseAc + Math.floor((enemyLevel - 1) / 2);

        const battleMap = generateBattleGrid(terrain);
        const battleEntities: any[] = [];
        const spawnPoints = [{ x: 3, y: 7 }, { x: 2, y: 6 }, { x: 4, y: 6 }];
        party.forEach((member, i) => { const memberWithStats = get().recalculateStats(member); if (memberWithStats.hp > 0) battleEntities.push({ ...member, stats: memberWithStats, position: spawnPoints[i] || { x: 3, y: 7 } }); });

        // Variable enemy count based on party strength
        const enemyCount = avgLevel >= 3 ? (isShadow ? 3 : 2) : (isShadow ? 2 : Math.floor(Math.random() * 2) + 1);
        const enemySpawns = [{ x: 4, y: 2 }, { x: 3, y: 3 }, { x: 5, y: 2 }];

        // XP reward calculation (D&D 5e inspired)
        const baseXP = 100; // CR 1/2 baseline
        const xpPerLevel = 50;
        const totalXP = Math.floor((baseXP + (enemyLevel - 1) * xpPerLevel) * enemyCount * diffConfig.xpMod);

        // Gold rewards
        const goldMin = 15 + (enemyLevel - 1) * 5;
        const goldMax = 30 + (enemyLevel - 1) * 10;
        const totalGold = Math.floor((goldMin + Math.random() * (goldMax - goldMin)) * diffConfig.goldMod);

        for (let i = 0; i < enemyCount; i++) {
            battleEntities.push({
                id: 'enemy_' + generateId(), name: `${isShadow ? 'Shadowling' : 'Goblin Raider'} ${i + 1}`, type: 'ENEMY', equipment: {},
                stats: { level: enemyLevel, xp: 0, xpToNextLevel: 0, hp: finalHp, maxHp: finalHp, ac: finalAc, initiativeBonus: isShadow ? 3 : 2, speed: 30, attributes: BASE_STATS[CharacterClass.FIGHTER], baseAttributes: BASE_STATS[CharacterClass.FIGHTER], spellSlots: { current: 0, max: 0 } },
                visual: { color: isShadow ? '#1e293b' : '#ef4444', modelType: 'billboard', spriteUrl: isShadow ? ASSETS.UNITS.SKELETON : ASSETS.UNITS.GOBLIN },
                position: enemySpawns[i] || { x: 4, y: 2 }
            });
        }

        const initiativeOrder = battleEntities.map(e => ({ id: e.id, roll: rollD20().result + e.stats.initiativeBonus })).sort((a, b) => b.roll - a.roll).map(e => e.id);
        get().addLog(`Encounter! ${enemyCount} enemies (Lv ${enemyLevel}).`, "combat");
        set({ gameState: GameState.BATTLE_TACTICAL, battleTerrain: terrain, battleWeather: weather, battleEntities, turnOrder: initiativeOrder, currentTurnIndex: 0, hasMoved: false, hasActed: false, selectedAction: null, selectedSpell: null, selectedTile: null, damagePopups: [], activeSpellEffect: null, battleRewards: { xp: totalXP, gold: totalGold, items: [] }, battleMap, runAvailable: avgLevel < enemyLevel });
        if (battleEntities.find(e => e.id === initiativeOrder[0])?.type === 'ENEMY') setTimeout(() => performEnemyTurn(initiativeOrder[0]), 1000); else set({ selectedAction: BattleAction.MOVE });
    },

    attemptRun: () => { if (Math.random() > 0.2) { get().addLog("Escaped!", "narrative"); set({ gameState: GameState.OVERWORLD, damagePopups: [] }); } else { get().addLog("Failed escape!", "combat"); get().nextTurn(); } },
    hasLineOfSight: (source, target) => { return true; }, // Simplified LoS for performance

    selectAction: (action) => { sfx.playUiClick(); if (action === BattleAction.WAIT) get().nextTurn(); else if (action === BattleAction.ITEM) get().toggleInventory(); else if (action === BattleAction.RUN) get().attemptRun(); else set({ selectedAction: action, selectedTile: null, selectedSpell: null }); },
    selectSpell: (spellId) => { sfx.playUiClick(); set({ selectedSpell: SPELLS[spellId.toUpperCase()], selectedTile: null }); get().addLog("Spell selected.", "info"); },
    handleTileHover: (x, z) => { set({ hoveredEntity: get().battleEntities.find(e => e.position.x === x && e.position.y === z) || null }); },
    handleTileInteraction: (x, z) => {
        const state = get(); const activeId = state.turnOrder[state.currentTurnIndex]; const activeEntity = state.battleEntities.find(e => e.id === activeId);
        if (!activeEntity || activeEntity.type !== 'PLAYER') return;
        if (!state.selectedTile || state.selectedTile.x !== x || state.selectedTile.z !== z) { sfx.playUiHover(); set({ selectedTile: { x, z } }); return; }
        const targetEnt = state.battleEntities.find(e => e.position.x === x && e.position.y === z);
        if (state.selectedAction === BattleAction.MOVE) {
            if (state.hasMoved) return;
            const dist = Math.max(Math.abs(activeEntity.position.x - x), Math.abs(activeEntity.position.y - z));
            if (dist > 6 || targetEnt) return; // Simple range check
            sfx.playStep();
            set(s => ({ battleEntities: s.battleEntities.map(e => e.id === activeId ? { ...e, position: { x, y: z } } : e), hasMoved: true, selectedAction: null, selectedTile: null }));
        } else if (state.selectedAction === BattleAction.ATTACK || state.selectedAction === BattleAction.MAGIC) {
            if (state.hasActed || !targetEnt) return;
            if (state.selectedAction === BattleAction.MAGIC && state.selectedSpell) performPlayerMagic(targetEnt.id, state.selectedSpell); else performPlayerAttack(targetEnt.id);
            set({ selectedTile: null });
        }
    },

    nextTurn: () => {
        const state = get(); if (state.gameState !== GameState.BATTLE_TACTICAL) return;
        let nextIdx = (state.currentTurnIndex + 1) % state.turnOrder.length;
        let nextEntity = state.battleEntities.find(e => e.id === state.turnOrder[nextIdx]);
        if (!nextEntity || nextEntity.stats.hp <= 0) { nextIdx = (nextIdx + 1) % state.turnOrder.length; nextEntity = state.battleEntities.find(e => e.id === state.turnOrder[nextIdx]); }
        if (!nextEntity) return;
        set({ currentTurnIndex: nextIdx, selectedTile: null, hasMoved: false, hasActed: false, selectedAction: nextEntity.type === 'PLAYER' ? BattleAction.MOVE : null, selectedSpell: null, hoveredEntity: null, activeSpellEffect: null });
        if (nextEntity.type === 'PLAYER') get().addLog(`${nextEntity.name}'s turn.`, "info"); else setTimeout(() => performEnemyTurn(nextEntity!.id), 1000);
    },

    getAttackPrediction: () => null, // Disabled for perf
    continueAfterVictory: () => {
        sfx.playUiClick(); const { battleRewards, party, inventory } = get();

        // Distribute XP rewards to all surviving party members
        const newParty = party.map(m => {
            if (m.stats.hp <= 0) return m; // Dead members don't gain XP
            const newXP = m.stats.xp + battleRewards.xp;
            const needsLevelUp = newXP >= m.stats.xpToNextLevel && m.stats.level < 20;
            return { ...m, stats: { ...m.stats, xp: newXP } };
        });

        // Add gold and items to inventory
        const newInventory = [...inventory];
        if (battleRewards.items.length > 0) {
            battleRewards.items.forEach(item => {
                const existing = newInventory.find(slot => slot.item.id === item.id);
                if (existing) existing.quantity++;
                else newInventory.push({ item, quantity: 1 });
            });
        }

        get().addLog(`Victory! Gained ${battleRewards.xp} XP and ${battleRewards.gold} gold.`, "narrative");
        set({ party: newParty, inventory: newInventory, gameState: GameState.OVERWORLD, damagePopups: [] });
    },
    restartBattle: () => { sfx.playUiClick(); get().startBattle(get().battleTerrain, get().battleWeather); },
    quitToMenu: () => { sfx.playUiClick(); set({ gameState: GameState.CHARACTER_CREATION, logs: [], party: [] }); },
    saveGame: () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(get())); get().addLog("Saved.", "info"); } catch (e) { } },
    loadGame: () => { try { const data = JSON.parse(localStorage.getItem(SAVE_KEY) || ""); if (data.party) set({ ...data, gameState: GameState.OVERWORLD }); } catch (e) { } }
}));

const addDamagePopup = (pos: PositionComponent, amount: number | string, color: string, isCrit = false) => {
    useGameStore.setState(prev => ({ damagePopups: [...prev.damagePopups, { id: generateId(), position: [pos.x, 0, pos.y], amount, color, isCrit, timestamp: Date.now() }] }));
};

const performPlayerMagic = (targetId: string, spell: Spell) => {
    const state = useGameStore.getState();
    const player = state.battleEntities.find(e => e.id === state.turnOrder[state.currentTurnIndex]);
    const target = state.battleEntities.find(e => e.id === targetId);
    if (!player || !target) return;

    // Check if player has spell slots (for leveled spells)
    if (spell.level > 0 && player.stats.spellSlots.current <= 0) {
        state.addLog(`${player.name} has no spell slots!`, "combat");
        return;
    }

    sfx.playMagic();
    state.addLog(`${player.name} casts ${spell.name}!`, "combat");

    // Determine spellcasting ability modifier based on class
    const playerClass = player.stats.class;
    let spellMod = 0;
    if ([CharacterClass.WIZARD, CharacterClass.SORCERER].includes(playerClass)) {
        spellMod = getModifier(player.stats.attributes.INT);
    } else if ([CharacterClass.CLERIC, CharacterClass.DRUID, CharacterClass.RANGER].includes(playerClass)) {
        spellMod = getModifier(player.stats.attributes.WIS);
    } else if ([CharacterClass.BARD, CharacterClass.PALADIN, CharacterClass.WARLOCK].includes(playerClass)) {
        spellMod = getModifier(player.stats.attributes.CHA);
    }

    // Roll damage/healing
    const diceRoll = rollDice(spell.diceSides, spell.diceCount);
    let amount = diceRoll + (spell.level > 0 ? spellMod : spellMod); // Cantrips and leveled spells both add modifier
    amount = Math.max(1, amount);

    if (spell.type === SpellType.HEAL) {
        state.addLog(`Healed ${amount} HP.`, "roll");
        addDamagePopup(target.position, `+${amount}`, '#22c55e');
        useGameStore.setState({
            battleEntities: state.battleEntities.map(e => e.id === targetId ? { ...e, stats: { ...e.stats, hp: Math.min(e.stats.maxHp, e.stats.hp + amount) } } : e),
            hasActed: true,
            selectedAction: null
        });
    } else {
        // Damage spell
        state.addLog(`Dealt ${amount} ${spell.type === SpellType.DAMAGE ? 'damage' : 'effect'}.`, "combat");
        applyDamage(targetId, amount);
        useGameStore.setState({ hasActed: true, selectedAction: null });
    }

    // Consume spell slot for leveled spells
    if (spell.level > 0) {
        useGameStore.setState({
            battleEntities: state.battleEntities.map(e =>
                e.id === player.id ? { ...e, stats: { ...e.stats, spellSlots: { ...e.stats.spellSlots, current: e.stats.spellSlots.current - 1 } } } : e
            )
        });
    }
}

const performPlayerAttack = (targetId: string) => {
    const state = useGameStore.getState();
    const player = state.battleEntities.find(e => e.id === state.turnOrder[state.currentTurnIndex]);
    const target = state.battleEntities.find(e => e.id === targetId);
    if (!target || !player) return;

    sfx.playAttack();

    // D&D 5e Attack Roll
    const level = player.stats.level;
    const proficiencyBonus = 2 + Math.floor((level - 1) / 4); // +2 at lv1-4, +3 at lv5-8, +4 at lv9-12...
    const attackRoll = rollD20();
    const isCrit = attackRoll.result === 20;
    const isFumble = attackRoll.result === 1;

    // Get weapon stats from equipped main hand
    const weapon = player.equipment[EquipmentSlot.MAIN_HAND];
    const weaponStats = weapon?.equipmentStats || { diceCount: 1, diceSides: 4 }; // Unarmed strike fallback

    // Determine ability modifier (STR for heavy weapons, DEX for finesse)
    const isFinesse = weapon && (weapon.id === 'dagger' || weapon.id === 'rapier' || weapon.id === 'shortsword');
    const abilityMod = isFinesse ? getModifier(player.stats.attributes.DEX) : getModifier(player.stats.attributes.STR);

    const attackBonus = proficiencyBonus + abilityMod;
    const totalAttackRoll = isFumble ? 1 : attackRoll.result + attackBonus;

    const hit = totalAttackRoll >= target.stats.ac || isCrit;

    if (hit && !isFumble) {
        // Calculate damage
        let damage = 0;
        const diceCount = weaponStats.diceCount || 1;
        const diceSides = weaponStats.diceSides || 4;

        if (isCrit) {
            // Critical hit: double the dice
            damage = rollDice(diceSides, diceCount * 2) + abilityMod;
            state.addLog(`${player.name} scores a CRITICAL HIT!`, "combat");
        } else {
            damage = rollDice(diceSides, diceCount) + abilityMod;
        }

        damage = Math.max(1, damage); // Minimum 1 damage
        state.addLog(`${player.name} hits for ${damage} damage! (${attackRoll.result}+${attackBonus} vs AC ${target.stats.ac})`, "combat");
        applyDamage(targetId, damage, isCrit);
    } else {
        const missReason = isFumble ? "FUMBLE" : "MISS";
        state.addLog(`${player.name} misses! (${attackRoll.result}+${attackBonus} vs AC ${target.stats.ac})`, "combat");
        addDamagePopup(target.position, missReason, '#94a3b8');
    }

    useGameStore.setState({ hasActed: true, selectedAction: null });
};

const applyDamage = (targetId: string, amount: number, isCrit = false) => {
    const state = useGameStore.getState();
    const target = state.battleEntities.find(e => e.id === targetId);
    if (!target) return;
    addDamagePopup(target.position, amount, '#ef4444', isCrit);
    const newEntities = state.battleEntities.map(e => e.id === targetId ? { ...e, stats: { ...e.stats, hp: Math.max(0, e.stats.hp - amount) } } : e);
    useGameStore.setState({ battleEntities: newEntities });
    if (newEntities.find(e => e.id === targetId)?.stats.hp === 0) {
        state.addLog(`${target.name} defeated!`, "narrative");
        if (!newEntities.some(e => e.type === 'ENEMY' && e.stats.hp > 0)) setTimeout(() => useGameStore.setState({ gameState: GameState.BATTLE_VICTORY }), 1000);
        else if (!newEntities.some(e => e.type === 'PLAYER' && e.stats.hp > 0)) setTimeout(() => useGameStore.setState({ gameState: GameState.BATTLE_DEFEAT }), 1000);
    }
};

const performEnemyTurn = (enemyId: string) => {
    const state = useGameStore.getState();
    if (state.gameState !== GameState.BATTLE_TACTICAL) return;
    const me = state.battleEntities.find(e => e.id === enemyId);
    const targets = state.battleEntities.filter(e => e.type === 'PLAYER' && e.stats.hp > 0);
    if (!me || me.stats.hp <= 0 || targets.length === 0) { state.nextTurn(); return; }

    // Simple AI: Target closest or lowest HP
    let target = targets[0]; let minDist = 999;
    targets.forEach(p => { const d = Math.abs(me.position.x - p.position.x) + Math.abs(me.position.y - p.position.y); if (d < minDist) { minDist = d; target = p; } });

    const dist = Math.abs(me.position.x - target.position.x) + Math.abs(me.position.y - target.position.y);
    if (dist <= 1) {
        // Attack!
        sfx.playAttack();

        // Enemy attack calculation
        const isShadow = me.name.includes('Shadow');
        const attackBonus = me.stats.initiativeBonus; // Use initiative bonus as attack modifier
        const attackRoll = rollD20();

        if (attackRoll.result + attackBonus >= target.stats.ac || attackRoll.result === 20) {
            // Damage varies by enemy type and level
            const baseDiceCount = 1;
            const baseDiceSides = isShadow ? 6 : 4;
            const damageBonus = isShadow ? 3 : 2;
            const dmg = rollDice(baseDiceSides, baseDiceCount) + damageBonus;

            state.addLog(`${me.name} hits ${target.name} for ${dmg} damage!`, "combat");
            sfx.playHit();
            applyDamage(target.id, dmg);
        } else {
            state.addLog(`${me.name} misses ${target.name}.`, "combat");
            addDamagePopup(target.position, "DODGE", '#94a3b8');
        }
    } else {
        // Move Closer
        const path = findBattlePath({ x: me.position.x, y: me.position.y }, { x: target.position.x, y: target.position.y }, state.battleMap);
        if (path && path.length > 0) {
            sfx.playStep();
            const step = path[0];
            useGameStore.setState({ battleEntities: state.battleEntities.map(e => e.id === enemyId ? { ...e, position: { x: step.x, y: step.z } } : e) });
        }
    }
    setTimeout(() => state.nextTurn(), 800);
};
