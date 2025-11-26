import React, { useState, useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import { GameState, EquipmentSlot, Item, CharacterClass } from '../types';

// --- MOCK SKILL DATA (To be moved to constants later) ---
interface SkillNode {
    id: string;
    name: string;
    description: string;
    icon: string;
    cost: number;
    tier: 1 | 2 | 3;
    parentId?: string;
    x: number; // Grid position for layout (0-4)
    y: number; // Grid position for layout (0-4)
}

const SKILL_TREES: Record<CharacterClass, SkillNode[]> = {
    [CharacterClass.FIGHTER]: [
        { id: 'f1', name: 'Second Wind', description: 'Regain stamina to act twice in a turn.', icon: '🌬️', cost: 1, tier: 1, x: 1, y: 2 },
        { id: 'f2', name: 'Pommel Strike', description: 'A quick strike that may stun the enemy.', icon: '🔨', cost: 1, tier: 1, x: 1, y: 1, parentId: 'f1' },
        { id: 'f3', name: 'Parry', description: 'Reaction to reduce incoming damage.', icon: '🛡️', cost: 1, tier: 1, x: 1, y: 3, parentId: 'f1' },
        { id: 'f4', name: 'Action Surge', description: 'Gain an extra action this turn.', icon: '⚡', cost: 2, tier: 2, x: 2, y: 2, parentId: 'f1' },
        { id: 'f5', name: 'Champion', description: 'Critical hit range increased.', icon: '👑', cost: 3, tier: 3, x: 3, y: 2, parentId: 'f4' },
    ],
    [CharacterClass.WIZARD]: [
        { id: 'w1', name: 'Arcane Recovery', description: 'Regain spell slots on short rest.', icon: '📘', cost: 1, tier: 1, x: 1, y: 2 },
        { id: 'w2', name: 'Sculpt Spells', description: 'Evocation spells no longer hurt allies.', icon: '🔥', cost: 1, tier: 1, x: 1, y: 1, parentId: 'w1' },
        { id: 'w3', name: 'Mage Armor', description: 'Base AC becomes 13 + Dex.', icon: '🛡️', cost: 1, tier: 1, x: 1, y: 3, parentId: 'w1' },
        { id: 'w4', name: 'Potent Cantrip', description: 'Cantrips do half damage on miss.', icon: '✨', cost: 2, tier: 2, x: 2, y: 2, parentId: 'w1' },
        { id: 'w5', name: 'Overchannel', description: 'Max damage on level 1-5 spells.', icon: '⚡', cost: 3, tier: 3, x: 3, y: 2, parentId: 'w4' },
    ],
    // Fallback for others
    [CharacterClass.ROGUE]: [], [CharacterClass.CLERIC]: [], [CharacterClass.BARBARIAN]: [],
    [CharacterClass.BARD]: [], [CharacterClass.DRUID]: [], [CharacterClass.PALADIN]: [],
    [CharacterClass.RANGER]: [], [CharacterClass.SORCERER]: [], [CharacterClass.WARLOCK]: [],
};

// --- SUB-COMPONENTS ---

const InventoryView = ({ activeChar, inventory, equipItem, unequipItem, consumeItem, renderIcon }: any) => {
    // Helper for Equipment Slots
    const EquipSlot = ({ slot, label, iconPlaceholder }: { slot: EquipmentSlot | string, label?: string, iconPlaceholder: string }) => {
        // @ts-ignore
        const item = activeChar.equipment[slot];
        const isRealSlot = Object.values(EquipmentSlot).includes(slot as EquipmentSlot);

        return (
            <div className="relative group">
                <div className={`
                    w-16 h-16 bg-[#1a1612] border-2 border-[#4a3b2a] shadow-[inset_0_0_10px_rgba(0,0,0,0.8)]
                    flex items-center justify-center relative overflow-hidden rounded-sm transition-all
                    ${item ? 'border-[#c8a078] bg-[#2a221a]' : 'opacity-80'}
                `}>
                    {item ? (
                        <div className="w-full h-full p-1 cursor-pointer hover:scale-110 transition-transform" onClick={() => isRealSlot && unequipItem(slot as EquipmentSlot, activeChar.id)}>
                            {renderIcon(item.icon)}
                        </div>
                    ) : (
                        <span className="text-3xl opacity-20 grayscale filter text-[#8c7b64]">{iconPlaceholder}</span>
                    )}

                    {item && (
                        <div className="absolute z-50 bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-[#0b0b0b] border border-[#c8a078] p-2 text-center pointer-events-none hidden group-hover:block shadow-xl">
                            <p className="text-[#c8a078] font-serif font-bold text-xs mb-1">{item.name}</p>
                            <p className="text-[10px] text-[#8c7b64] italic">{item.description}</p>
                            <p className="text-[9px] text-red-400 mt-1 uppercase font-bold">Click to Unequip</p>
                        </div>
                    )}
                </div>
                {label && <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] text-[#5c5245] uppercase font-bold tracking-wider whitespace-nowrap">{label}</span>}
            </div>
        );
    };

    return (
        <div className="flex-1 flex flex-col h-full relative">
            {/* PAPER DOLL AREA */}
            <div className="flex-1 flex flex-col md:flex-row p-4 md:p-8 gap-8 overflow-y-auto custom-scrollbar">
                <div className="flex flex-col gap-6 justify-center items-center md:items-end">
                    <EquipSlot slot="HELMET" label="Head" iconPlaceholder="🪖" />
                    <EquipSlot slot="AMULET" label="Neck" iconPlaceholder="📿" />
                    <EquipSlot slot={EquipmentSlot.BODY} label="Armor" iconPlaceholder="👕" />
                    <EquipSlot slot="GLOVES" label="Hands" iconPlaceholder="🧤" />
                </div>

                <div className="flex-1 flex flex-col items-center justify-center relative min-h-[300px]">
                    <div className="absolute bottom-0 w-48 h-12 bg-black/50 blur-xl rounded-[100%]" />
                    <img src={activeChar.visual.spriteUrl} alt="Character" className="h-full max-h-[400px] w-auto object-contain pixelated drop-shadow-[0_0_20px_rgba(0,0,0,0.8)] scale-125" />
                    <div className="absolute bottom-0 flex gap-4 bg-[#0b0b0b]/80 px-4 py-2 rounded-full border border-[#4a3b2a] backdrop-blur-sm">
                        <div className="text-center"><span className="block text-[9px] text-[#5c5245] uppercase font-bold">AC</span><span className="text-[#e0d6c2] font-bold font-serif text-lg">{activeChar.stats.ac}</span></div>
                        <div className="w-px bg-[#2a221a]" />
                        <div className="text-center"><span className="block text-[9px] text-[#5c5245] uppercase font-bold">HP</span><span className="text-[#e0d6c2] font-bold font-serif text-lg">{activeChar.stats.hp}</span></div>
                    </div>
                </div>

                <div className="flex flex-col gap-6 justify-center items-center md:items-start">
                    <EquipSlot slot={EquipmentSlot.MAIN_HAND} label="Main Hand" iconPlaceholder="⚔️" />
                    <EquipSlot slot={EquipmentSlot.OFF_HAND} label="Off Hand" iconPlaceholder="🛡️" />
                    <EquipSlot slot="RING_1" label="Ring" iconPlaceholder="💍" />
                    <EquipSlot slot="BOOTS" label="Feet" iconPlaceholder="👢" />
                </div>
            </div>

            {/* INVENTORY GRID */}
            <div className="h-1/3 min-h-[200px] bg-[#0b0b0b] border-t border-[#4a3b2a] p-4 flex flex-col">
                <h3 className="text-[#8c7b64] font-serif font-bold uppercase tracking-widest text-xs mb-3 flex items-center gap-2">
                    <span className="w-full h-px bg-[#2a221a]"></span><span>Inventory</span><span className="w-full h-px bg-[#2a221a]"></span>
                </h3>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                        {inventory.map((slot: any, idx: number) => (
                            <div key={idx} className="aspect-square bg-[#1a1612] border border-[#2a221a] hover:border-[#c8a078] relative group cursor-pointer shadow-inner"
                                onClick={() => slot.item.type === 'equipment' ? equipItem(slot.item.id, activeChar.id) : consumeItem(slot.item.id, activeChar.id)}>
                                <div className="w-full h-full p-2 flex items-center justify-center">{renderIcon(slot.item.icon)}</div>
                                {slot.quantity > 1 && <span className="absolute bottom-1 right-1 text-[10px] text-[#e0d6c2] font-bold bg-black/50 px-1 rounded">{slot.quantity}</span>}
                                <div className="absolute z-50 bottom-full mb-1 left-1/2 -translate-x-1/2 w-40 bg-[#0b0b0b] border border-[#c8a078] p-2 pointer-events-none hidden group-hover:block shadow-xl z-[60]">
                                    <p className="text-[#c8a078] font-serif font-bold text-xs">{slot.item.name}</p>
                                    <p className="text-[9px] text-[#8c7b64] italic">{slot.item.type === 'equipment' ? 'Click to Equip' : 'Click to Use'}</p>
                                </div>
                            </div>
                        ))}
                        {Array.from({ length: Math.max(0, 24 - inventory.length) }).map((_, i) => <div key={`empty-${i}`} className="aspect-square bg-[#14110f] border border-[#1a1612] shadow-inner opacity-50" />)}
                    </div>
                </div>
            </div>
        </div>
    );
};

const SkillTreeView = ({ activeChar }: any) => {
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

    // Get skills for class or empty array
    const skills = SKILL_TREES[activeChar.stats.class as CharacterClass] || SKILL_TREES[CharacterClass.FIGHTER];
    const selectedNode = skills.find(s => s.id === selectedNodeId) || skills[0];
    const skillPoints = Math.max(0, activeChar.stats.level - 1);

    return (
        <div className="flex-1 flex flex-col md:flex-row h-full bg-[#0f0d0b] relative overflow-hidden">
            {/* LEFT: WEAPON ART / CLASS SYMBOL (Hidden on mobile to save space, or minimal header) */}
            <div className="hidden md:flex w-1/4 h-full border-r border-[#4a3b2a] bg-[#0b0b0b] flex-col items-center justify-center relative overflow-hidden p-6">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] opacity-20" />
                <h3 className="text-[#c8a078] font-serif font-bold text-xl uppercase tracking-widest mb-8 z-10 text-center">{activeChar.stats.class} Mastery</h3>

                <div className="w-full aspect-[1/2] relative flex items-center justify-center z-10">
                    <div className="absolute inset-0 bg-gradient-to-t from-[#c8a078]/20 to-transparent blur-xl" />
                    <img
                        src={activeChar.visual.spriteUrl}
                        className="h-full w-full object-contain grayscale opacity-80 drop-shadow-[0_0_15px_rgba(200,160,120,0.3)]"
                        style={{ filter: 'grayscale(100%) sepia(50%) hue-rotate(0deg) brightness(0.8) contrast(1.2)' }}
                    />
                </div>

                <div className="mt-auto z-10 text-center">
                    <span className="text-[10px] text-[#5c5245] uppercase font-bold tracking-widest">Available Points</span>
                    <div className="text-4xl font-serif text-[#e0d6c2] drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">{skillPoints}</div>
                </div>
            </div>

            {/* MOBILE HEADER (Points Display) */}
            <div className="md:hidden h-12 flex items-center justify-between px-4 bg-[#0b0b0b] border-b border-[#4a3b2a] shrink-0 z-20">
                <span className="text-[#c8a078] font-serif font-bold uppercase tracking-widest text-xs">{activeChar.stats.class} Mastery</span>
                <div className="flex items-center gap-2">
                    <span className="text-[9px] text-[#5c5245] uppercase font-bold">Points:</span>
                    <span className="text-xl font-serif text-[#e0d6c2]">{skillPoints}</span>
                </div>
            </div>

            {/* CENTER: TREE */}
            <div className="flex-1 relative bg-[#14110f] overflow-hidden">
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]" />

                {/* Connection Lines (SVG) */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                    {skills.map(skill => {
                        if (!skill.parentId) return null;
                        const parent = skills.find(s => s.id === skill.parentId);
                        if (!parent) return null;
                        const x1 = `${parent.x * 20}%`;
                        const y1 = `${parent.y * 20}%`;
                        const x2 = `${skill.x * 20}%`;
                        const y2 = `${skill.y * 20}%`;
                        return (
                            <line key={`${skill.id}-line`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#4a3b2a" strokeWidth="2" />
                        );
                    })}
                </svg>

                {/* Nodes */}
                <div className="absolute inset-0 z-10">
                    {skills.map(skill => {
                        const isSelected = selectedNodeId === skill.id || (!selectedNodeId && skill === skills[0]);
                        return (
                            <button
                                key={skill.id}
                                onClick={() => setSelectedNodeId(skill.id)}
                                className={`
                                    absolute w-10 h-10 md:w-12 md:h-12 -ml-5 -mt-5 md:-ml-6 md:-mt-6 rounded-full border-2 flex items-center justify-center transition-all duration-300
                                    ${isSelected ? 'scale-125 border-[#c8a078] bg-[#2a221a] shadow-[0_0_20px_#c8a078] z-20' : 'border-[#4a3b2a] bg-[#0b0b0b] hover:border-[#8c7b64] z-10'}
                                `}
                                style={{ left: `${skill.x * 20}%`, top: `${skill.y * 20}%` }}
                            >
                                <span className={`text-lg md:text-xl ${isSelected ? 'grayscale-0' : 'grayscale opacity-50'}`}>{skill.icon}</span>
                                {isSelected && <div className="absolute inset-0 rounded-full border border-[#c8a078] animate-ping opacity-20" />}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* RIGHT: DETAILS (Bottom Sheet on Mobile) */}
            <div className="w-full h-1/3 md:w-1/4 md:h-full border-t md:border-t-0 md:border-l border-[#4a3b2a] bg-[#0b0b0b] p-4 md:p-6 flex flex-col z-20 shadow-xl shrink-0 overflow-y-auto">
                {selectedNode ? (
                    <>
                        <div className="mb-2 md:mb-6 flex justify-center items-center gap-4 md:block">
                            <div className="w-12 h-12 md:w-16 md:h-16 rounded-full border-2 border-[#c8a078] bg-[#1a1612] flex items-center justify-center shadow-[0_0_20px_rgba(200,160,120,0.2)] shrink-0">
                                <span className="text-2xl md:text-3xl">{selectedNode.icon}</span>
                            </div>
                            <div className="md:hidden text-left">
                                <h2 className="text-[#e0d6c2] font-serif font-bold text-lg">{selectedNode.name}</h2>
                                <span className="text-[#c8a078] font-bold text-xs">{selectedNode.cost} Points</span>
                            </div>
                        </div>

                        <h2 className="hidden md:block text-[#e0d6c2] font-serif font-bold text-xl text-center mb-2">{selectedNode.name}</h2>
                        <div className="hidden md:block h-px w-1/2 bg-gradient-to-r from-transparent via-[#4a3b2a] to-transparent mx-auto mb-4" />

                        <p className="text-[#8c7b64] text-xs md:text-sm text-left md:text-center italic leading-relaxed mb-4 md:mb-6">
                            "{selectedNode.description}"
                        </p>

                        <div className="mt-auto space-y-4">
                            <div className="hidden md:block bg-[#14110f] border border-[#2a221a] p-3 rounded text-center">
                                <span className="block text-[9px] text-[#5c5245] uppercase font-bold">Cost</span>
                                <span className="text-[#c8a078] font-bold">{selectedNode.cost} Points</span>
                            </div>

                            <button className="w-full py-2 md:py-3 bg-[#c8a078] hover:bg-[#e0d6c2] text-[#0b0b0b] font-bold font-serif uppercase tracking-widest transition-colors clip-corners text-sm md:text-base">
                                Acquire
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="flex items-center justify-center h-full text-[#4a3b2a] italic">Select a memory...</div>
                )}
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---

export const InventoryScreen: React.FC = () => {
    const {
        inventory, party, activeInventoryCharacterId,
        toggleInventory, consumeItem, equipItem, unequipItem,
        cycleInventoryCharacter, hasActed, gameState, battleRewards
    } = useGameStore();

    const [activeTab, setActiveTab] = useState<'INVENTORY' | 'SKILLS'>('INVENTORY');

    const activeChar = party.find(p => p.id === activeInventoryCharacterId) || party[0];
    const gold = 1250 + battleRewards.gold;

    const renderIcon = (icon: string, sizeClass: string = "w-full h-full") => {
        if (icon.startsWith('http') || icon.startsWith('/')) {
            return <img src={icon} className={`${sizeClass} object-contain pixelated drop-shadow-md`} alt="item" />;
        }
        return <span className="text-2xl">{icon}</span>;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-300 p-2 md:p-8">
            <div className="w-full max-w-6xl h-[90vh] flex relative shadow-[0_0_50px_rgba(0,0,0,1)] rounded-lg overflow-hidden border-[3px] border-[#2a221a]">

                {/* BACKGROUND TEXTURE */}
                <div className="absolute inset-0 bg-[#14110f] opacity-100 z-0">
                    <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]" />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
                </div>

                {/* LEFT SIDEBAR - MENU */}
                <div className="w-16 md:w-20 bg-[#0b0b0b] border-r border-[#4a3b2a] z-10 flex flex-col items-center py-4 gap-4 shadow-xl">
                    <button onClick={() => setActiveTab('INVENTORY')} className={`w-10 h-10 md:w-12 md:h-12 rounded border-2 flex items-center justify-center text-xl transition-all ${activeTab === 'INVENTORY' ? 'border-[#c8a078] bg-[#2a221a] text-[#c8a078] shadow-[0_0_10px_#c8a078]' : 'border-[#2a221a] bg-[#14110f] text-[#5c5245] hover:text-[#8c7b64] hover:border-[#4a3b2a]'}`}>🎒</button>
                    <button onClick={() => setActiveTab('SKILLS')} className={`w-10 h-10 md:w-12 md:h-12 rounded border-2 flex items-center justify-center text-xl transition-all ${activeTab === 'SKILLS' ? 'border-[#c8a078] bg-[#2a221a] text-[#c8a078] shadow-[0_0_10px_#c8a078]' : 'border-[#2a221a] bg-[#14110f] text-[#5c5245] hover:text-[#8c7b64] hover:border-[#4a3b2a]'}`}>📜</button>
                    <button className="w-10 h-10 md:w-12 md:h-12 rounded border-2 border-[#2a221a] bg-[#14110f] text-[#5c5245] hover:text-[#8c7b64] hover:border-[#4a3b2a] flex items-center justify-center text-xl">🗺️</button>
                    <button className="w-10 h-10 md:w-12 md:h-12 rounded border-2 border-[#2a221a] bg-[#14110f] text-[#5c5245] hover:text-[#8c7b64] hover:border-[#4a3b2a] flex items-center justify-center text-xl">⚙️</button>

                    <div className="mt-auto">
                        <button onClick={toggleInventory} className="w-10 h-10 md:w-12 md:h-12 rounded border-2 border-red-900/50 bg-[#14110f] text-red-500 hover:bg-red-900/20 flex items-center justify-center">✕</button>
                    </div>
                </div>

                {/* CENTER CONTENT */}
                <div className="flex-1 flex flex-col z-10 overflow-hidden relative">

                    {/* HEADER: NAME & CLASS */}
                    <div className="h-16 border-b border-[#4a3b2a] bg-[#0f0d0b]/80 flex items-center justify-center relative shrink-0">
                        <div className="text-center">
                            <h2 className="text-2xl md:text-3xl font-serif font-bold text-[#c8a078] tracking-[0.1em] drop-shadow-md">{activeChar.name.toUpperCase()}</h2>
                            <p className="text-[10px] text-[#8c7b64] uppercase tracking-[0.3em] font-bold">{activeChar.stats.race} {activeChar.stats.class} • Level {activeChar.stats.level}</p>
                        </div>
                        <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-2 bg-[#0b0b0b] px-3 py-1 rounded border border-[#4a3b2a]">
                            <span className="text-yellow-500 text-lg">🪙</span>
                            <span className="text-[#e0d6c2] font-serif font-bold">{gold}</span>
                        </div>
                    </div>

                    {/* DYNAMIC VIEW */}
                    {activeTab === 'INVENTORY' ? (
                        <InventoryView
                            activeChar={activeChar}
                            inventory={inventory}
                            equipItem={equipItem}
                            unequipItem={unequipItem}
                            consumeItem={consumeItem}
                            renderIcon={renderIcon}
                        />
                    ) : (
                        <SkillTreeView activeChar={activeChar} />
                    )}
                </div>

                {/* RIGHT SIDEBAR - PARTY */}
                <div className="w-20 md:w-24 bg-[#0b0b0b] border-l border-[#4a3b2a] z-10 flex flex-col py-4 gap-2 overflow-y-auto custom-scrollbar shadow-xl">
                    {party.map((member) => {
                        const isActive = member.id === activeChar.id;
                        return (
                            <button
                                key={member.id}
                                onClick={() => { if (isActive) return; cycleInventoryCharacter('next'); }}
                                className={`w-16 h-16 mx-auto relative rounded-sm overflow-hidden border-2 transition-all group ${isActive ? 'border-[#c8a078] shadow-[0_0_15px_rgba(200,160,120,0.4)] scale-105' : 'border-[#2a221a] opacity-60 hover:opacity-100'}`}
                            >
                                <img src={member.visual.spriteUrl} alt={member.name} className="w-full h-full object-cover scale-150 translate-y-2 pixelated" />
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-black"><div className="h-full bg-green-600" style={{ width: `${(member.stats.hp / member.stats.maxHp) * 100}%` }} /></div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
