import React, { useState, useMemo, useEffect } from 'react';
import { CharacterRace, CharacterClass, Attributes, Ability, Difficulty } from '../types';
import { getSprite } from '../constants';
import { getModifier } from '../services/dndRules';

interface CharacterCreationProps {
    onComplete: (name: string, race: CharacterRace, cls: CharacterClass, stats: Attributes, difficulty: Difficulty) => void;
}

// --- ICONS ---
const RaceIcons = {
    [CharacterRace.HUMAN]: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4L4 8l1.5 9.5A11 11 0 0 0 12 21a11 11 0 0 0 6.5-3.5L20 8l-8-4z" /><path d="M12 9v4" /><path d="M12 4v1" /></svg>
    ),
    [CharacterRace.ELF]: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2c.5 0 .5 2 2 3 1.5-1 3.5 0 3.5 1.5 0 2-2 3-2 3s3 2 4 5c-4 0-5.5 3-5.5 3s0 3.5-2 3.5-2-3.5-2-3.5-1.5-3-5.5-3c1-3 4-5 4-5s-2-1-2-3c0-1.5 2-2.5 3.5-1.5 1.5-1 1.5-3 2-3z" /></svg>
    ),
    [CharacterRace.DWARF]: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h18" /><path d="M12 3v18" /><path d="M6 12l2-3" /><path d="M18 12l-2-3" /><path d="M4 18l3-3" /><path d="M20 18l-3-3" /></svg>
    ),
    [CharacterRace.HALFLING]: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 12a4 4 0 1 0 8 0 4 4 0 1 0-8 0" /><path d="M12 8v8" /><path d="M8 12h8" /></svg>
    ),
    [CharacterRace.DRAGONBORN]: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l-2 2h4l-2-2zM4 6h16M4 6l2 12h12l2-12M6 18l6 4 6-4" /></svg>
    ),
    [CharacterRace.GNOME]: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M12 2v3" /><path d="M12 19v3" /><path d="M19 12h3" /><path d="M2 12h3" /><path d="M17 17l2.1 2.1" /><path d="M4.9 4.9L7 7" /><path d="M17 7l2.1-2.1" /><path d="M4.9 19.1L7 17" /></svg>
    ),
    [CharacterRace.TIEFLING]: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 4l-4 6 4 2" /><path d="M16 4l4 6-4 2" /><path d="M12 10v10" /><path d="M9 20h6" /></svg>
    ),
    [CharacterRace.HALF_ORC]: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6-6 6 6" /><path d="M12 3v18" /><path d="M6 15l6 6 6-6" /></svg>
    )
};

const getClassIcon = (c: CharacterClass) => {
    switch (c) {
        case CharacterClass.FIGHTER: return '⚔️';
        case CharacterClass.BARBARIAN: return '🪓';
        case CharacterClass.PALADIN: return '🛡️';
        case CharacterClass.RANGER: return '🏹';
        case CharacterClass.ROGUE: return '🗡️';
        case CharacterClass.WIZARD: return '🔮';
        case CharacterClass.SORCERER: return '🔥';
        case CharacterClass.WARLOCK: return '👁️';
        case CharacterClass.CLERIC: return '✨';
        case CharacterClass.DRUID: return '🌿';
        case CharacterClass.BARD: return '🎵';
        default: return '❓';
    }
};

// --- POINT BUY LOGIC ---
const POINT_COSTS: Record<number, number> = {
    8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9
};

const MAX_POINTS = 27;

// --- TABS ---
enum Tab {
    RACE = 'Race',
    CLASS = 'Class',
    ABILITIES = 'Abilities',
    IDENTITY = 'Identity'
}

export const CharacterCreation: React.FC<CharacterCreationProps> = ({ onComplete }) => {
    const [activeTab, setActiveTab] = useState<Tab>(Tab.CLASS);

    // Character State
    const [name, setName] = useState('');
    const [race, setRace] = useState<CharacterRace>(CharacterRace.HUMAN);
    const [cls, setCls] = useState<CharacterClass>(CharacterClass.FIGHTER);
    const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.NORMAL);

    // Ability Scores (Base)
    const [baseStats, setBaseStats] = useState<Attributes>({
        [Ability.STR]: 8, [Ability.DEX]: 8, [Ability.CON]: 8,
        [Ability.INT]: 8, [Ability.WIS]: 8, [Ability.CHA]: 8
    });

    // Floating Bonuses (+2 and +1)
    const [bonusTwo, setBonusTwo] = useState<Ability>(Ability.DEX);
    const [bonusOne, setBonusOne] = useState<Ability>(Ability.CON);

    // Calculate Points Used
    const pointsUsed = useMemo(() => {
        return Object.values(baseStats).reduce((acc, val) => acc + POINT_COSTS[val], 0);
    }, [baseStats]);

    const pointsRemaining = MAX_POINTS - pointsUsed;

    // Final Stats Calculation
    const finalStats = useMemo(() => {
        const stats = { ...baseStats };
        stats[bonusTwo] += 2;
        stats[bonusOne] += 1;
        return stats;
    }, [baseStats, bonusTwo, bonusOne]);

    const spriteUrl = useMemo(() => getSprite(race, cls), [race, cls]);

    const handleStatChange = (ability: Ability, increment: boolean) => {
        const currentVal = baseStats[ability];
        const nextVal = increment ? currentVal + 1 : currentVal - 1;

        if (nextVal < 8 || nextVal > 15) return;

        const costDiff = POINT_COSTS[nextVal] - POINT_COSTS[currentVal];
        if (increment && pointsRemaining < costDiff) return;

        setBaseStats(prev => ({ ...prev, [ability]: nextVal }));
    };

    const handleComplete = () => {
        if (!name) {
            setActiveTab(Tab.IDENTITY);
            return;
        }
        onComplete(name, race, cls, finalStats, difficulty);
    };

    // Ensure bonuses don't overlap
    useEffect(() => {
        if (bonusTwo === bonusOne) {
            // If user sets +2 to STR, and +1 was STR, move +1 to something else
            const abilities = Object.values(Ability);
            const nextAvailable = abilities.find(a => a !== bonusTwo) || Ability.DEX;
            setBonusOne(nextAvailable);
        }
    }, [bonusTwo]);

    return (
        <div className="fixed inset-0 z-50 bg-black font-sans text-[#e0d6c2] overflow-hidden flex">

            {/* BACKGROUND LAYER */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1519074069444-1ba4fff66d16?q=80&w=2574&auto=format&fit=crop')] bg-cover bg-center opacity-40 blur-sm" />
                <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-transparent via-black/40 to-black" />
            </div>

            {/* LEFT PANEL - NAVIGATION & EDITORS */}
            <div className="relative z-10 w-full md:w-[600px] h-full flex flex-col border-r border-[#4a3b2a] bg-[#0b0b0b]/95 backdrop-blur-md shadow-[10px_0_50px_rgba(0,0,0,0.8)]">

                {/* HEADER */}
                {/* HEADER */}
                <div className="p-4 md:p-8 border-b border-[#4a3b2a] flex items-center justify-between bg-[#14100c]">
                    <div className="flex items-center gap-3 md:gap-0">
                        {/* MOBILE ONLY AVATAR */}
                        <div className="md:hidden w-12 h-12 bg-[#1a1612] rounded-full border border-[#4a3b2a] overflow-hidden flex-shrink-0 shadow-inner">
                            <img src={spriteUrl} alt="Mini Preview" className="w-full h-full object-cover scale-150 translate-y-1 pixelated" />
                        </div>
                        <div>
                            <h2 className="text-[#8c7b64] font-serif uppercase tracking-[0.2em] text-[10px] md:text-xs mb-1">Character Creation</h2>
                            <h1 className="text-2xl md:text-3xl font-serif text-[#e0d6c2] tracking-wide">Level 1</h1>
                        </div>
                    </div>
                    <div className="flex flex-col items-center">
                        <div className="text-2xl md:text-3xl text-[#c8a078] drop-shadow-[0_0_10px_rgba(200,160,120,0.3)]">
                            {getClassIcon(cls)}
                        </div>
                        <span className="text-[10px] uppercase tracking-widest text-[#8c7b64] font-bold mt-1">{cls}</span>
                    </div>
                </div>

                {/* TABS */}
                <div className="flex border-b border-[#4a3b2a] bg-[#0f0d0b]">
                    {Object.values(Tab).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 py-3 md:py-4 text-[10px] md:text-xs font-bold uppercase tracking-[0.15em] transition-all relative
                          ${activeTab === tab
                                    ? 'text-[#e0d6c2] bg-[#1a1612]'
                                    : 'text-[#5c5245] hover:text-[#8c7b64] hover:bg-[#14110f]'}
                      `}
                        >
                            {tab}
                            {activeTab === tab && (
                                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#c8a078] shadow-[0_0_10px_#c8a078]" />
                            )}
                        </button>
                    ))}
                </div>

                {/* CONTENT AREA */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8">

                    {/* --- CLASS SELECTION --- */}
                    {activeTab === Tab.CLASS && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                            <div className="text-center mb-8">
                                <h3 className="text-2xl font-serif text-[#c8a078] mb-2">Choose Class</h3>
                                <p className="text-[#8c7b64] text-sm italic">Your class determines your skills, magic, and combat style.</p>
                            </div>

                            <div className="grid grid-cols-1 gap-2">
                                <label className="text-[#8c7b64] text-xs uppercase font-bold tracking-widest mb-1 block">Class</label>
                                <div className="relative group">
                                    <select
                                        value={cls}
                                        onChange={(e) => setCls(e.target.value as CharacterClass)}
                                        className="w-full bg-[#1a1612] border border-[#4a3b2a] text-[#e0d6c2] p-4 rounded-sm appearance-none outline-none focus:border-[#c8a078] transition-colors font-serif text-lg cursor-pointer"
                                    >
                                        {Object.values(CharacterClass).map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#8c7b64]">▼</div>
                                </div>
                            </div>

                            <div className="mt-8 p-6 bg-[#14110f] border border-[#2a221a] rounded-sm">
                                <h4 className="text-[#c8a078] font-serif text-lg mb-4 border-b border-[#2a221a] pb-2">Class Features</h4>
                                <ul className="space-y-3">
                                    <li className="flex items-start gap-3 text-sm text-[#a89b88]">
                                        <span className="text-[#c8a078] mt-1">♦</span>
                                        <span>
                                            <strong className="text-[#e0d6c2] block text-xs uppercase tracking-wider mb-0.5">Hit Die</strong>
                                            d{[CharacterClass.BARBARIAN].includes(cls) ? 12 : [CharacterClass.WIZARD, CharacterClass.SORCERER].includes(cls) ? 6 : [CharacterClass.FIGHTER, CharacterClass.PALADIN, CharacterClass.RANGER].includes(cls) ? 10 : 8}
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-3 text-sm text-[#a89b88]">
                                        <span className="text-[#c8a078] mt-1">♦</span>
                                        <span>
                                            <strong className="text-[#e0d6c2] block text-xs uppercase tracking-wider mb-0.5">Primary Ability</strong>
                                            {[CharacterClass.FIGHTER, CharacterClass.BARBARIAN, CharacterClass.PALADIN].includes(cls) ? 'Strength' :
                                                [CharacterClass.ROGUE, CharacterClass.RANGER, CharacterClass.MONK].includes(cls) ? 'Dexterity' :
                                                    [CharacterClass.WIZARD, CharacterClass.INT].includes(cls) ? 'Intelligence' :
                                                        [CharacterClass.CLERIC, CharacterClass.DRUID, CharacterClass.WIS].includes(cls) ? 'Wisdom' : 'Charisma'}
                                        </span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* --- RACE SELECTION --- */}
                    {activeTab === Tab.RACE && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                            <div className="text-center mb-8">
                                <h3 className="text-2xl font-serif text-[#c8a078] mb-2">Choose Race</h3>
                                <p className="text-[#8c7b64] text-sm italic">Your heritage grants you innate traits and abilities.</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {Object.values(CharacterRace).map(r => (
                                    <button
                                        key={r}
                                        onClick={() => setRace(r)}
                                        className={`p-4 border flex flex-col items-center gap-2 transition-all duration-200 rounded-sm
                                      ${race === r
                                                ? 'bg-[#2a221a] border-[#c8a078] shadow-[0_0_15px_rgba(200,160,120,0.1)]'
                                                : 'bg-[#14110f] border-[#2a221a] hover:border-[#5c5245]'}
                                  `}
                                    >
                                        <div className={race === r ? 'text-[#c8a078]' : 'text-[#5c5245]'}>
                                            {RaceIcons[r]}
                                        </div>
                                        <span className={`font-serif text-sm ${race === r ? 'text-[#e0d6c2]' : 'text-[#8c7b64]'}`}>{r}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* --- ABILITIES (POINT BUY) --- */}
                    {activeTab === Tab.ABILITIES && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">

                            <div className="flex justify-between items-end mb-4 border-b border-[#4a3b2a] pb-4">
                                <h3 className="text-xl font-serif text-[#e0d6c2]">Ability Points</h3>
                                <div className="text-right">
                                    <span className="text-[#8c7b64] text-xs uppercase tracking-widest font-bold mr-2">Points Remaining</span>
                                    <span className={`text-xl font-bold font-serif ${pointsRemaining === 0 ? 'text-[#5c5245]' : 'text-[#c8a078]'}`}>
                                        {pointsRemaining} <span className="text-sm text-[#5c5245]">/ {MAX_POINTS}</span>
                                    </span>
                                </div>
                            </div>

                            {/* TABLE HEADER */}
                            <div className="grid grid-cols-[100px_1fr_40px_40px_50px] gap-2 text-center text-[10px] uppercase tracking-widest font-bold text-[#8c7b64] mb-2 px-2">
                                <div className="text-left">Ability</div>
                                <div>Value</div>
                                <div>+2</div>
                                <div>+1</div>
                                <div>Mod</div>
                            </div>

                            {/* ABILITY ROWS */}
                            <div className="space-y-1 bg-[#14110f] border border-[#2a221a] rounded-sm p-1">
                                {Object.values(Ability).map(ability => {
                                    const base = baseStats[ability];
                                    const bonus = (bonusTwo === ability ? 2 : 0) + (bonusOne === ability ? 1 : 0);
                                    const total = base + bonus;
                                    const mod = getModifier(total);

                                    return (
                                        <div key={ability} className="grid grid-cols-[100px_1fr_40px_40px_50px] gap-2 items-center p-2 hover:bg-[#1a1612] transition-colors rounded-sm group">

                                            {/* LABEL */}
                                            <div className="flex flex-col">
                                                <span className="text-[#e0d6c2] font-serif font-bold text-sm group-hover:text-[#c8a078] transition-colors">{ability}</span>
                                                <span className="text-[10px] text-[#5c5245]">
                                                    {ability === Ability.STR && 'Athletics'}
                                                    {ability === Ability.DEX && 'Acrobatics'}
                                                    {ability === Ability.CON && 'Health'}
                                                    {ability === Ability.INT && 'Arcana'}
                                                    {ability === Ability.WIS && 'Perception'}
                                                    {ability === Ability.CHA && 'Persuasion'}
                                                </span>
                                            </div>

                                            {/* VALUE CONTROL */}
                                            <div className="flex items-center justify-center gap-3 bg-[#0b0b0b] rounded-full px-2 py-1 border border-[#2a221a]">
                                                <button
                                                    onClick={() => handleStatChange(ability, false)}
                                                    disabled={base <= 8}
                                                    className="w-6 h-6 flex items-center justify-center text-[#5c5245] hover:text-[#e0d6c2] disabled:opacity-30 disabled:hover:text-[#5c5245] transition-colors"
                                                >
                                                    −
                                                </button>
                                                <span className="w-6 text-center font-bold text-[#e0d6c2]">{base}</span>
                                                <button
                                                    onClick={() => handleStatChange(ability, true)}
                                                    disabled={base >= 15 || pointsRemaining < (POINT_COSTS[base + 1] - POINT_COSTS[base])}
                                                    className="w-6 h-6 flex items-center justify-center text-[#5c5245] hover:text-[#e0d6c2] disabled:opacity-30 disabled:hover:text-[#5c5245] transition-colors"
                                                >
                                                    +
                                                </button>
                                            </div>

                                            {/* +2 CHECKBOX */}
                                            <div className="flex justify-center">
                                                <button
                                                    onClick={() => setBonusTwo(ability)}
                                                    className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all
                                                  ${bonusTwo === ability
                                                            ? 'bg-[#c8a078] border-[#c8a078] text-black'
                                                            : 'border-[#4a3b2a] hover:border-[#8c7b64]'}
                                              `}
                                                >
                                                    {bonusTwo === ability && <span className="text-[10px]">✓</span>}
                                                </button>
                                            </div>

                                            {/* +1 CHECKBOX */}
                                            <div className="flex justify-center">
                                                <button
                                                    onClick={() => setBonusOne(ability)}
                                                    disabled={bonusTwo === ability}
                                                    className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all
                                                  ${bonusOne === ability
                                                            ? 'bg-[#8c7b64] border-[#8c7b64] text-black'
                                                            : bonusTwo === ability ? 'opacity-20 cursor-not-allowed border-[#4a3b2a]' : 'border-[#4a3b2a] hover:border-[#8c7b64]'}
                                              `}
                                                >
                                                    {bonusOne === ability && <span className="text-[10px]">✓</span>}
                                                </button>
                                            </div>

                                            {/* MODIFIER */}
                                            <div className="flex justify-center">
                                                <span className={`text-sm font-bold ${mod > 0 ? 'text-[#c8a078]' : mod < 0 ? 'text-red-400' : 'text-[#5c5245]'}`}>
                                                    {mod >= 0 ? '+' : ''}{mod}
                                                </span>
                                            </div>

                                        </div>
                                    );
                                })}
                            </div>

                            <div className="text-center mt-4">
                                <p className="text-[#8c7b64] text-xs italic">
                                    Total Score = Base Value + Bonuses. Modifiers affect your dice rolls.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* --- IDENTITY --- */}
                    {activeTab === Tab.IDENTITY && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-300">
                            <div className="text-center">
                                <h3 className="text-2xl font-serif text-[#c8a078] mb-2">Identity</h3>
                                <p className="text-[#8c7b64] text-sm italic">Who are you in this world?</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[#8c7b64] text-xs uppercase font-bold tracking-widest">Character Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Enter name..."
                                    className="w-full bg-[#14110f] border border-[#4a3b2a] text-[#e0d6c2] p-4 rounded-sm outline-none focus:border-[#c8a078] font-serif text-xl placeholder-[#2a221a]"
                                    autoFocus
                                />
                            </div>

                            <div className="space-y-4">
                                <label className="text-[#8c7b64] text-xs uppercase font-bold tracking-widest">Difficulty</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {Object.values(Difficulty).map(d => (
                                        <button
                                            key={d}
                                            onClick={() => setDifficulty(d)}
                                            className={`py-3 border text-xs font-bold uppercase tracking-widest transition-all
                                          ${difficulty === d
                                                    ? 'bg-[#2a221a] border-[#c8a078] text-[#e0d6c2]'
                                                    : 'bg-[#14110f] border-[#2a221a] text-[#5c5245] hover:text-[#8c7b64]'}
                                      `}
                                        >
                                            {d}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-[#8c7b64] text-xs text-center min-h-[20px]">
                                    {difficulty === Difficulty.EASY && "For those who want to focus on the story."}
                                    {difficulty === Difficulty.NORMAL && "A balanced challenge for tactical players."}
                                    {difficulty === Difficulty.HARD && "A grueling test of survival."}
                                </p>
                            </div>
                        </div>
                    )}

                </div>

                {/* FOOTER ACTION */}
                <div className="p-6 border-t border-[#4a3b2a] bg-[#14100c] flex justify-center">
                    <button
                        onClick={handleComplete}
                        className="
                      relative group overflow-hidden
                      bg-[#1a1612] border border-[#4a3b2a] hover:border-[#c8a078]
                      px-12 py-3 transition-all duration-300
                  "
                    >
                        <div className="absolute inset-0 bg-[#c8a078] opacity-0 group-hover:opacity-10 transition-opacity" />
                        <span className="font-serif text-[#e0d6c2] uppercase tracking-[0.2em] text-sm font-bold group-hover:text-[#fff] transition-colors">
                            {name ? 'Venture Forth' : 'Choices Pending'}
                        </span>

                        {/* Decorative corners for button */}
                        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#c8a078] opacity-50 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#c8a078] opacity-50 group-hover:opacity-100 transition-opacity" />
                    </button>
                </div>
            </div>

            {/* RIGHT PANEL - PREVIEW (Optional, keeps focus on the editor like the reference image, but shows the model) */}
            <div className="flex-1 relative hidden md:flex items-center justify-center bg-gradient-to-b from-[#1a1612] to-[#0b0b0b]">
                <div className="relative z-10 flex flex-col items-center">
                    {/* Character Sprite / Model Placeholder */}
                    <div className="w-64 h-64 md:w-96 md:h-96 relative filter drop-shadow-[0_0_30px_rgba(0,0,0,0.8)] transition-all duration-500">
                        <img
                            src={spriteUrl}
                            alt="Character Preview"
                            className="w-full h-full object-contain pixelated"
                        />
                    </div>

                    <div className="mt-8 text-center space-y-2">
                        <h2 className="text-4xl font-serif text-[#e0d6c2] tracking-wide drop-shadow-lg">
                            {name || 'Nameless One'}
                        </h2>
                        <p className="text-[#8c7b64] uppercase tracking-[0.3em] text-xs font-bold">
                            Level 1 {race} {cls}
                        </p>
                    </div>
                </div>
            </div>

        </div>
    );
};
