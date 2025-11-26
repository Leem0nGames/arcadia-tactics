import { Attributes, Ability } from '../types';

export const getModifier = (score: number): number => {
  return Math.floor((score - 10) / 2);
};

export const rollDice = (sides: number, count: number = 1): number => {
  let total = 0;
  for (let i = 0; i < count; i++) {
    total += Math.floor(Math.random() * sides) + 1;
  }
  return total;
};

export const rollD20 = (type: 'normal' | 'advantage' | 'disadvantage' = 'normal'): { result: number, raw: number[] } => {
  const r1 = Math.floor(Math.random() * 20) + 1;
  const r2 = Math.floor(Math.random() * 20) + 1;

  if (type === 'advantage') {
    return { result: Math.max(r1, r2), raw: [r1, r2] };
  } else if (type === 'disadvantage') {
    return { result: Math.min(r1, r2), raw: [r1, r2] };
  }
  return { result: r1, raw: [r1] };
};

export const calculateAC = (dex: number, armorBase: number = 10, hasShield: boolean = false): number => {
  return armorBase + getModifier(dex) + (hasShield ? 2 : 0);
};

export const calculateHp = (level: number, con: number, hitDie: number): number => {
  // Max HP at level 1, average afterwards
  const mod = getModifier(con);
  return (hitDie + mod) + ((level - 1) * (Math.floor(hitDie / 2) + 1 + mod));
};
