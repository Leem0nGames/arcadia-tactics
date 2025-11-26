import React from 'react';
import { Item } from '../types';

interface BattleResultModalProps {
  type: 'victory' | 'defeat';
  rewards?: { xp: number; gold: number; items: Item[] };
  onContinue?: () => void;
  onRestart?: () => void;
  onQuit?: () => void;
}

export const BattleResultModal: React.FC<BattleResultModalProps> = ({
  type,
  rewards,
  onContinue,
  onRestart,
  onQuit
}) => {
  const isVictory = type === 'victory';

  const renderIcon = (icon: string) => {
    if (icon.startsWith('http') || icon.startsWith('/')) {
      return <img src={icon} className="w-8 h-8 object-contain pixelated" alt="loot" />;
    }
    return <span className="text-xl">{icon}</span>;
  };

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-[#0b0b0b]/90 backdrop-blur-md animate-in fade-in duration-700 pointer-events-auto">
      <div className="relative w-full max-w-lg p-1 rounded-sm shadow-[0_0_100px_rgba(0,0,0,0.8)] transform transition-all scale-100">

        {/* Outer Border Frame */}
        <div className="absolute inset-0 border border-[#4a3b2a] pointer-events-none" />
        <div className="absolute inset-1 border border-[#2a221a] pointer-events-none" />

        {/* Inner Content */}
        <div className="bg-[#14100c] m-2 p-10 text-center relative overflow-hidden">

          {/* Background Texture */}
          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')] pointer-events-none" />

          {/* Icon */}
          <div className="mb-8 relative z-10">
            <div className={`text-6xl md:text-7xl animate-bounce drop-shadow-[0_0_30px_rgba(200,160,120,0.2)] ${isVictory ? 'grayscale-0' : 'grayscale'}`}>
              {isVictory ? '🏆' : '💀'}
            </div>
          </div>

          {/* Title */}
          <h2 className={`
            text-4xl md:text-6xl font-serif font-bold mb-4 tracking-widest uppercase relative z-10
            ${isVictory
              ? 'text-transparent bg-clip-text bg-gradient-to-b from-[#e0d6c2] via-[#c8a078] to-[#8c7b64] drop-shadow-sm'
              : 'text-[#8c7b64]'}
          `}>
            {isVictory ? 'Victory' : 'Defeat'}
          </h2>

          {/* Divider */}
          <div className="h-px w-32 mx-auto bg-gradient-to-r from-transparent via-[#4a3b2a] to-transparent mb-8 relative z-10" />

          {/* Rewards or Message */}
          {isVictory && rewards ? (
            <div className="space-y-6 mb-10 animate-in slide-in-from-bottom-4 delay-150 duration-700 relative z-10">
              <p className="text-[#8c7b64] text-xs uppercase tracking-[0.3em] font-bold">Rewards Gained</p>

              <div className="flex justify-center gap-6 flex-wrap">
                {/* XP */}
                <div className="bg-[#0b0b0b] p-3 px-6 border border-[#4a3b2a] flex flex-col items-center min-w-[90px] shadow-inner">
                  <span className="block text-2xl font-serif font-bold text-[#c8a078]">+{rewards.xp}</span>
                  <span className="text-[10px] text-[#5c5245] uppercase font-bold tracking-wider">XP</span>
                </div>

                {/* Gold */}
                <div className="bg-[#0b0b0b] p-3 px-6 border border-[#4a3b2a] flex flex-col items-center min-w-[90px] shadow-inner">
                  <span className="block text-2xl font-serif font-bold text-[#e0d6c2]">{rewards.gold}</span>
                  <span className="text-[10px] text-[#5c5245] uppercase font-bold tracking-wider">Gold</span>
                </div>
              </div>

              {/* Items */}
              {rewards.items && rewards.items.length > 0 && (
                <div className="mt-6 pt-6 border-t border-[#2a221a]">
                  <p className="text-[#5c5245] text-[10px] uppercase tracking-widest mb-3">Loot Found</p>
                  <div className="flex gap-3 justify-center flex-wrap">
                    {rewards.items.map((item, idx) => (
                      <div key={idx} className="flex gap-3 items-center bg-[#1a1612] px-4 py-2 border border-[#4a3b2a] hover:border-[#c8a078] transition-colors animate-in zoom-in-50 duration-300 shadow-lg" style={{ animationDelay: `${idx * 100}ms` }}>
                        {renderIcon(item.icon)}
                        <span className="text-xs font-serif text-[#e0d6c2]">{item.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="mb-10 relative z-10">
              <p className="text-[#8c7b64] italic font-serif text-lg">
                "The path of the adventurer is paved with peril. Rise again."
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-4 relative z-10">
            {isVictory ? (
              <button
                onClick={onContinue}
                className="
                    group relative w-full overflow-hidden
                    bg-[#1a1612] border border-[#4a3b2a] hover:border-[#c8a078]
                    py-4 transition-all duration-300
                "
              >
                <div className="absolute inset-0 bg-[#c8a078] opacity-0 group-hover:opacity-10 transition-opacity" />
                <span className="font-serif text-[#e0d6c2] uppercase tracking-[0.2em] text-sm font-bold group-hover:text-white transition-colors">
                  Continue Journey
                </span>
                {/* Decorative corners */}
                <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#c8a078] opacity-50 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#c8a078] opacity-50 group-hover:opacity-100 transition-opacity" />
              </button>
            ) : (
              <button
                onClick={onRestart}
                className="w-full bg-[#1a1612] hover:bg-[#2a221a] text-[#c8a078] border border-[#4a3b2a] py-4 uppercase tracking-[0.2em] text-sm font-serif font-bold transition-all"
              >
                Try Again
              </button>
            )}

            {!isVictory && (
              <button
                onClick={onQuit}
                className="w-full text-[#5c5245] hover:text-[#8c7b64] py-2 text-[10px] uppercase tracking-[0.2em] font-bold transition-colors"
              >
                Return to Title
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
