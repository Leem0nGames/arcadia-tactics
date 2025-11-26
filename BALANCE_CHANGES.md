# Arcadia Tactics - Balance Changes Summary

## ✅ Cambios Implementados

### 1. **Sistema de Dificultad Mejorado** (`constants.ts`)
- **EASY**: Enemigos 30% más débiles, +30% XP, +50% oro
- **NORMAL**: Sin cambios (baseline 1.0x)
- **HARD**: Enemigos 50% más fuertes, +50% XP, -30% oro

### 2. **Combate del Jugador Balanceado** (`gameStore.ts - performPlayerAttack`)
#### Mecánicas D&D 5e Implementadas:
- ✅ **Bonos de Competencia**: +2 (lv1-4), +3 (lv5-8), +4 (lv9-12)
-  **Modificadores de Habilidad**: STR para armas pesadas, DEX para armas de finura
- ✅ **Daño de Armas Correcto**: Usa diceCount y diceSides del equipo
  - Ejemplo: Espada Larga = 1d8 + MOD STR
  - Ejemplo: Daga = 1d4 + MOD DEX  
- ✅ **Critical Hits**: Natural 20 = daño duplicado (doble dados)
- ✅ **Fumbles**: Natural 1 = fallo automático
- ✅ **Logs Detallados**: Muestra tirada + bonus vs AC

#### Ejemplo de Salida:
```
"Thorin hits for 7 damage! (16+4 vs AC 14)"
"Elara scores a CRITICAL HIT!"
"Vex misses! (8+5 vs AC 15)"
```

### 3. **Sistema de Magia Balanceado** (`gameStore.ts - performPlayerMagic`)
#### Mecánicas Implementadas:
- ✅ **Dados Correctos**: Usa diceCount × diceSides
  - Magic Missile: 3d4+3 (7-15 damage)
  - Firebolt: 1d10+MOD INT
- ✅ **Modificadores por Clase**:
  - Wizard/Sorcerer: +INT
  - Cleric/Druid/Ranger: +WIS
  - Bard/Paladin/Warlock: +CHA
- ✅ **Consumo de Spell Slots**: Los hechizos de nivel 1+ gastan slots
- ✅ **Curación Balanceada**: Cure Wounds = 1d8 + MOD WIS

### 4. **Enemigos Rebalanceados** (`gameStore.ts - startBattle`)
#### HP Escalado (D&D 5e CR):
- **Goblins**: 9 HP base + 5 HP/nivel
- **Shadowlings**: 22 HP base + 8 HP/nivel
- Aplicado multiplicador de dificultad

#### AC Progresivo:
- **Goblins**: AC 13 base, +1 cada 2 niveles
- **Shadowlings**: AC 14 base, +1 cada 2 niveles

#### Combat AI:
- Goblins: 1d4+2 damage
- Shadowlings: 1d6+3 damage
- Usan bonos de iniciativa como bonus de ataque

#### Número de Enemigos:
- Nivel 1-2: 1-2 goblins, 2 shadows
- Nivel 3+: 2 goblins, 3 shadows

### 5. **Sistema de Recompensas** (`gameStore.ts`)
#### XP Balanceada:
- Base: 100 XP (CR 1/2)
- +50 XP por nivel de enemigo
- Multiplicado por número de enemigos
- Aplicado multiplicador de dificultad

**Ejemplos**:
- 1 Goblin Lv1 (NORMAL): 100 XP
- 2 Goblins Lv2 (NORMAL): 300 XP (150×2)
- 3 Shadows Lv3 (HARD): 900 XP (200×3×1.5)

#### Oro Escalado:
- Nivel 1: 15-30 oro
- Nivel 2: 20-40 oro
- Nivel 3: 25-50 oro
- Aplicado multiplicador de dificultad

#### Distribución de Recompensas:
- XP se distribuye a TODOS los miembros vivos del party
- Oro se añade al pool del grupo
- Items se añaden al inventario compartido
- Log muestra "Victory! Gained 150 XP and 25 gold."

---

## 📊 Comparación Antes/Después

### Combate del Jugador (Nivel 1, STR+2):
| Métrica | ANTES | DESPUÉS |
|---------|-------|---------|
| Bonus Ataque | +4 (fijo) | +4 (Prof+2 + STR+2) |
| Daño (Espada Larga) | 1d6+2 (3-8) | 1d8+2 (3-10) |
| Daño Critical | N/A | 2d8+2 (4-18) |
| Modificadores | Ninguno | STR o DEX según arma |

### Sistema de Magia (Wizard INT+3, Nivel 1):
| Hechizo | ANTES | DESPUÉS |
|---------|-------|---------|
| Firebolt | 1-10 damage | 1d10+3 (4-13) |
| Magic Missile | 1-4 damage | 3d4+3 (6-15) |
| Cure Wounds | 1-8 healing | 1d8+3 (4-11) |

### Enemigos (Nivel 1):
| Enemigo | HP ANTES | HP DESPUÉS (NORMAL) | HP DESPUÉS (HARD) |
|---------|----------|---------------------|-------------------|
| Goblin Lv1 | 7 | 9 | 14 |
| Shadow Lv1 | 16 | 22 | 33 |
| Goblin Lv3 | 11 | 19 | 29 |
| Shadow Lv3 | 24 | 38 | 57 |

### Progresión de XP:
| Encuentro | ANTES | DESPUÉS (NORMAL) | DESPUÉS (HARD) |
|-----------|-------|------------------|----------------|
| 1 Goblin Lv1 | 50 XP (fijo) | 100 XP | 150 XP |
| 2 Goblins Lv2 | 50 XP (fijo) | 300 XP | 450 XP |
| 3 Shadows Lv3 | 50 XP (fijo) | 600 XP | 900 XP |

**Tiempo para subir de nivel**:
- Nivel 1→2 (necesita 300 XP):
  - ANTES: 6 combates
  - DESPUÉS: 3 combates (lv1), 1-2 combates (lv2+)

---

## 🎮 Impacto en el Gameplay

### Dificultad EASY:
- Perfecto para jugadores casuales
- Enemigos débiles pero XP generoso
- Más oro para comprar items
- Progresión rápida

### Dificultad NORMAL:
- Experiencia balanceada D&D 5e
- Combates tácticos pero justos
- Progresión estándar

### Dificultad HARD:
- Desafío significativo
- Enemigos 50% más fuertes
- Economía restrictiva (menos oro)
- Recompensas XP altas como compensación

### Tactical Depth:
- **Critical Hits** añaden emoción y variabilidad
- **Weapon Choice** ahora importa (finesse vs strength)
- **Spell Selection** más impactante (3d4+3 vs 1d10+3)
- **Attack Rolls** mostrados para transparencia

---

## 🔧 Próximas Mejoras Sugeridas

1. **Item Drops**: Añadir loot tables con % chances
2. **Proficiency System**: Different weapons for different classes
3. **Spell Slots Expandidos**: Más slots por nivel
4. **Equipment Rarity**: Common, Uncommon, Rare items
5. **Party Synergies**: Bonos por composición de party
6. **Boss Encounters**: 3x XP, unique drops
7. **Rest System**: Short rest para recuperar HP/slots

---

## 📝 Notas Técnicas

### Funciones Modificadas:
1. `DIFFICULTY_SETTINGS` (constants.ts)
2. `startBattle()` (gameStore.ts)
3. `performPlayerAttack()` (gameStore.ts)
4. `performPlayerMagic()` (gameStore.ts)
5. `performEnemyTurn()` (gameStore.ts)
6. `continueAfterVictory()` (gameStore.ts)

### Dependencias Utilizadas:
- `rollD20()` from dndRules.ts
- `rollDice()` from dndRules.ts
- `getModifier()` from dndRules.ts
- `DIFFICULTY_SETTINGS` from constants.ts

### Testing Checklist:
- [ ] Player attack damage con diferentes armas
- [ ] Critical hits funcionan (nat 20)
- [ ] Magic damage con diferentes clases
- [ ] Spell slots se consumen
- [ ] Enemy HP escala con nivel
- [ ] XP rewards son correctos
- [ ] Gold rewards escalan
- [ ] Victory screen muestra XP/Gold
- [ ] Dificultades sienten diferentes

---

## 🎯 Balance Philosophy

Este rebalanceo sigue la filosofía de D&D 5e:
1. **Transparencia**: Los jugadores ven las tiradas
2. **Fairness**: Mismas reglas para jugadores y enemigos
3. **Escalado**: Stats crecen significativamente con nivel
4. **Elección Táctica**: Diferentes opciones tienen trade-offs
5. **Recompensas Justas**: Risk/Reward equilibrado

El resultado es un juego más profundo, más satisfactorio y más fiel a D&D 5e.
