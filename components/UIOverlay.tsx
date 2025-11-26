import React, { useRef, useEffect, useState } from 'react';
import { BattleAction, GameState, Spell, SpellType, Dimension } from '../types';
import { useGameStore } from '../store/gameStore';
import { SPELLS, CLASS_SPELLS } from '../constants';
import { InventoryScreen } from './InventoryScreen';

export const UIOverlay: React.FC = () => {
    const logEndRef = useRef<HTMLDivElement>(null);
    const [isLogExpanded, setIsLogExpanded] = useState(true);
    const [showSpellMenu, setShowSpellMenu] = useState(false);
    const [showSystemMenu, setShowSystemMenu] = useState(false);

    const {
        logs, gameState, party, turnOrder, currentTurnIndex,
        selectedAction, selectedSpell, hasMoved, hasActed, selectAction, selectSpell,
        getAttackPrediction, isInventoryOpen, toggleInventory, playerPos, dimension,
        standingOnPortal, standingOnSettlement, usePortal, enterSettlement, saveGame, loadGame, quitToMenu, runAvailable, battleEntities
    } = useGameStore();

    const attackPrediction = getAttackPrediction();

    useEffect(() => { if (isLogExpanded) logEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs, isLogExpanded]);
    useEffect(() => { setShowSpellMenu(selectedAction === BattleAction.MAGIC && !selectedSpell); }, [selectedAction, selectedSpell]);

    const activeEntityId = turnOrder[currentTurnIndex];
    const isPlayerTurn = gameState === GameState.BATTLE_TACTICAL && activeEntityId && (activeEntityId.includes('player') || activeEntityId.includes('comp'));
    const activeCharacter = isPlayerTurn ? battleEntities.find(e => e.id === activeEntityId) : party[0];
    const partyStatsDisplay = party.map(member => (gameState === GameState.BATTLE_TACTICAL ? battleEntities.find(e => e.id === member.id) || member : member));
    const availableSpells = activeCharacter && activeCharacter.stats.class ? CLASS_SPELLS[activeCharacter.stats.class].map(id => SPELLS[id.toUpperCase()]).filter(Boolean) : [];

    if (gameState === GameState.CHARACTER_CREATION) return <div className="absolute top-4 right-4 z-50"><button onClick={loadGame} className="text-[#8c7b64] hover:text-[#c8a078] text-xs font-bold uppercase tracking-widest border border-[#4a3b2a] px-4 py-2 rounded bg-[#0b0b0b]/80 backdrop-blur font-serif">Load Game</button></div>;

    return (
        <>
            {dimension === Dimension.UPSIDE_DOWN && <div className="pointer-events-none fixed inset-0 z-0 shadow-[inset_0_0_150px_rgba(88,28,135,0.4)] animate-pulse" style={{ animationDuration: '4s' }} />}
            {isInventoryOpen && <InventoryScreen />}

            <div className="pointer-events-none absolute inset-0 flex flex-col justify-between z-20 overflow-hidden">

                {/* TOP LEFT: PARTY STATUS */}
                <div className="absolute top-4 left-4 flex flex-col gap-3 pointer-events-auto">
                    {partyStatsDisplay.map((member) => {
                        const isTurn = activeEntityId === member.id;
                        const isDead = member.stats.hp <= 0;
                        return (
                            <div key={member.id} className={`flex items-center gap-3 transition-all duration-300 ${isTurn ? 'translate-x-2' : 'opacity-90'} ${isDead ? 'grayscale opacity-50' : ''}`}>
                                <div className={`relative w-12 h-12 md:w-14 md:h-14 rounded-full border-2 ${isTurn ? 'border-[#c8a078] shadow-[0_0_15px_rgba(200,160,120,0.4)]' : 'border-[#4a3b2a]'} flex items-center justify-center overflow-hidden bg-[#0b0b0b]`}>
                                    <img src={member.visual.spriteUrl} alt={member.name} className="w-full h-full object-cover scale-150 translate-y-2 pixelated" />
                                </div>
                                <div className="flex flex-col min-w-[100px] md:min-w-[130px]">
                                    <span className={`text-[10px] md:text-xs font-serif font-bold uppercase tracking-wide leading-none mb-1 ${isTurn ? 'text-[#c8a078]' : 'text-[#e0d6c2]'}`}>{member.name}</span>
                                    <div className="relative h-2 bg-[#1a1612] rounded-full border border-[#4a3b2a] overflow-hidden">
                                        <div className={`absolute top-0 left-0 h-full transition-all duration-300 ${isDead ? 'bg-red-900' : 'bg-[#8c7b64]'}`} style={{ width: `${(member.stats.hp / member.stats.maxHp) * 100}%` }} />
                                    </div>
                                    <span className="text-[9px] text-[#8c7b64] font-mono mt-0.5">{member.stats.hp} / {member.stats.maxHp} HP</span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* TOP RIGHT: SYSTEM & MAP INFO */}
                <div className="absolute top-4 right-4 flex flex-col items-end gap-3 pointer-events-auto">
                    {gameState === GameState.TOWN_EXPLORATION && (
                        <div className="bg-[#14100c]/90 text-[#c8a078] px-4 py-2 rounded border border-[#c8a078] shadow-lg animate-in slide-in-from-top-4 font-serif text-xs tracking-widest uppercase">
                            🏙️ City of Trade
                        </div>
                    )}

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <button onClick={() => setShowSystemMenu(!showSystemMenu)} className="w-10 h-10 rounded-full bg-[#14100c] border border-[#4a3b2a] hover:border-[#c8a078] shadow-lg flex items-center justify-center text-[#8c7b64] hover:text-[#e0d6c2] transition-all">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
                            </button>
                            {showSystemMenu && (
                                <div className="absolute top-full right-0 mt-2 w-40 bg-[#0b0b0b] border border-[#4a3b2a] rounded shadow-2xl overflow-hidden flex flex-col z-50">
                                    <button onClick={() => { saveGame(); setShowSystemMenu(false); }} className="px-4 py-3 text-left text-xs font-serif text-[#e0d6c2] hover:bg-[#1a1612] border-b border-[#1a1612]">Save Game</button>
                                    <button onClick={() => { loadGame(); setShowSystemMenu(false); }} className="px-4 py-3 text-left text-xs font-serif text-[#e0d6c2] hover:bg-[#1a1612] border-b border-[#1a1612]">Load Game</button>
                                    <button onClick={() => { quitToMenu(); setShowSystemMenu(false); }} className="px-4 py-3 text-left text-xs font-serif text-red-400 hover:bg-red-900/10">Quit Title</button>
                                </div>
                            )}
                        </div>
                        <button onClick={toggleInventory} className="w-12 h-12 rounded-full bg-[#14100c] border border-[#4a3b2a] hover:border-[#c8a078] shadow-lg flex items-center justify-center text-[#c8a078] hover:text-[#e0d6c2] hover:scale-105 transition-all group relative">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>
                        </button>
                    </div>
                </div>

                {/* CENTER: CONTEXT ACTIONS */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md flex flex-col items-center pointer-events-none space-y-3">

                    {/* PORTAL ACTION */}
                    {gameState === GameState.OVERWORLD && standingOnPortal && (
                        <div className="pointer-events-auto mb-2 animate-in zoom-in slide-in-from-bottom-4">
                            <button onClick={usePortal} className={`group relative px-10 py-4 rounded-sm font-serif font-bold text-lg tracking-[0.15em] shadow-[0_0_40px_rgba(0,0,0,0.5)] transition-all overflow-hidden border ${dimension === Dimension.NORMAL ? 'bg-[#1a1612] text-[#c8a078] border-[#c8a078]' : 'bg-[#0f0518] text-purple-300 border-purple-500'}`}>
                                {dimension === Dimension.NORMAL ? "ENTER SHADOW REALM" : "RETURN TO LIGHT"}
                                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                            </button>
                        </div>
                    )}

                    {/* TOWN ACTION */}
                    {gameState === GameState.OVERWORLD && standingOnSettlement && (
                        <div className="pointer-events-auto mb-2 animate-in zoom-in slide-in-from-bottom-4">
                            <button onClick={enterSettlement} className="group relative px-10 py-4 rounded-sm font-serif font-bold text-lg tracking-[0.15em] shadow-[0_0_40px_rgba(0,0,0,0.5)] transition-all overflow-hidden bg-[#1a1612] text-[#c8a078] border border-[#c8a078] hover:bg-[#2a221a]">
                                ENTER CITY
                                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                            </button>
                        </div>
                    )}

                    {showSpellMenu && (
                        <div className="pointer-events-auto bg-[#0b0b0b]/95 border border-[#4a3b2a] rounded-sm shadow-2xl p-4 w-72 backdrop-blur-md animate-in slide-in-from-bottom-4">
                            <div className="flex justify-between items-center border-b border-[#2a221a] pb-3 mb-3">
                                <span className="text-xs font-bold text-[#c8a078] font-serif uppercase tracking-widest">{activeCharacter?.name}'s Spells</span>
                                <button onClick={() => selectAction(BattleAction.WAIT)} className="text-[10px] text-[#5c5245] hover:text-[#e0d6c2]">CLOSE</button>
                            </div>
                            <div className="space-y-1 max-h-56 overflow-y-auto custom-scrollbar">
                                {availableSpells.map(spell => (
                                    <button key={spell.id} onClick={() => selectSpell(spell.id)} disabled={spell.level > (activeCharacter?.stats.spellSlots.current || 0) && spell.level > 0} className="w-full text-left px-3 py-3 rounded-sm hover:bg-[#1a1612] transition-colors disabled:opacity-40 flex flex-col group border border-transparent hover:border-[#2a221a]">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-serif text-[#e0d6c2] group-hover:text-[#c8a078] transition-colors">{spell.name}</span>
                                            <span className="text-[10px] text-[#8c7b64] font-mono">{spell.level === 0 ? 'Cantrip' : `Lvl ${spell.level}`}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* BOTTOM: ACTION BAR & LOG */}
                <div className="mt-auto flex flex-col md:flex-row items-end gap-6 p-4 md:p-8 w-full max-w-7xl mx-auto">

                    {/* LOG */}
                    <div className={`pointer-events-auto w-full md:w-1/3 bg-[#0b0b0b]/90 backdrop-blur border border-[#4a3b2a] transition-all duration-300 flex flex-col rounded-sm overflow-hidden shadow-2xl ${isLogExpanded ? 'h-32 md:h-48' : 'h-8'}`}>
                        <button onClick={() => setIsLogExpanded(!isLogExpanded)} className="bg-[#14100c] px-3 py-1.5 text-[10px] font-bold text-[#8c7b64] hover:text-[#c8a078] flex justify-between w-full border-b border-[#2a221a] uppercase tracking-widest font-serif">
                            <span>Combat Log</span>
                            <span>{isLogExpanded ? '▼' : '▲'}</span>
                        </button>
                        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar font-serif">
                            {logs.map(log => (
                                <div key={log.id} className={`text-xs leading-relaxed border-b border-white/5 pb-1 last:border-0 ${log.type === 'combat' ? 'text-[#c8a078]' : 'text-[#a89b88]'}`}>
                                    {log.message}
                                </div>
                            ))}
                            <div ref={logEndRef} />
                        </div>
                    </div>

                    {/* HOTBAR */}
                    {isPlayerTurn && !showSpellMenu && (
                        <div className="pointer-events-auto flex-1 flex justify-center md:justify-end">
                            <div className="flex gap-1 md:gap-2 bg-[#0b0b0b]/90 p-2 rounded-lg border border-[#4a3b2a] shadow-2xl backdrop-blur-md">
                                <ActionButton label="Move" icon="🦶" active={selectedAction === BattleAction.MOVE} disabled={hasMoved} onClick={() => selectAction(BattleAction.MOVE)} />
                                <div className="w-px bg-[#2a221a] mx-1" />
                                <ActionButton label="Attack" icon="⚔️" active={selectedAction === BattleAction.ATTACK} disabled={hasActed} onClick={() => selectAction(BattleAction.ATTACK)} />
                                <ActionButton label="Magic" icon="🔮" active={selectedAction === BattleAction.MAGIC} disabled={hasActed} onClick={() => selectAction(BattleAction.MAGIC)} />
                                <ActionButton label="Item" icon="🧪" active={selectedAction === BattleAction.ITEM} disabled={hasActed} onClick={() => selectAction(BattleAction.ITEM)} />
                                <div className="w-px bg-[#2a221a] mx-1" />
                                {runAvailable && !hasActed && <ActionButton label="Run" icon="🏃" active={false} onClick={() => selectAction(BattleAction.RUN)} />}
                                <ActionButton label="End Turn" icon="⏳" active={false} onClick={() => selectAction(BattleAction.WAIT)} highlight />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

const ActionButton = ({ label, icon, active, disabled, onClick, highlight }: any) => {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`
                relative w-12 h-12 md:w-16 md:h-16 rounded-sm border transition-all flex flex-col items-center justify-center group overflow-hidden
                ${disabled
                    ? 'bg-[#14110f] border-[#2a221a] text-[#4a3b2a] cursor-not-allowed grayscale'
                    : active
                        ? 'bg-[#2a221a] border-[#c8a078] text-[#c8a078] shadow-[0_0_15px_rgba(200,160,120,0.2)] translate-y-0.5'
                        : 'bg-[#14110f] border-[#4a3b2a] text-[#8c7b64] hover:border-[#8c7b64] hover:text-[#e0d6c2] hover:-translate-y-0.5'}
                ${highlight && !disabled ? 'border-amber-900/50' : ''}
            `}
        >
            <span className={`text-xl md:text-2xl transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>{icon}</span>
            <span className="text-[8px] font-bold uppercase tracking-wide mt-1 font-serif opacity-0 group-hover:opacity-100 absolute bottom-1 transition-opacity">{label}</span>

            {/* Active Indicator */}
            {active && <div className="absolute inset-0 border-2 border-[#c8a078] pointer-events-none" />}
        </button>
    );
};
