# Arcadia Tactics - Balance Analysis & Changes

## Análisis de Balance Actual

### Problemas Identificados:

#### 1. **Combate Demasiado Simple**
- Ataque del jugador: daño fijo 1d6+2 (3-8 dmg)
- Ataque enemigo: daño fijo 1d4+2 (3-6 dmg)
- No considera estadísticas de fuerza/destreza
- Sin critical hits
- Sin bonificadores por equipamiento en el daño

#### 2. **Progresión de XP Desbalanceada**
- Solo se gana 50 XP por combate (fijo)
- No escala con dificultad o nivel del enemigo
- Nivel 1→2 requiere 300 XP = 6 combates
- Nivel 2→3 requiere 900 XP = 18 combates (muy largo)

#### 3. **Enemigos Débiles**
- HP muy bajo comparado con D&D 5e
- Goblin nivel 1: 7 HP (debería ser ~7, OK)
- Shadow nivel 1: 16 HP (más razonable)
- AC no escala bien con nivel

#### 4. **Magia Subpotenciada**
- Hechizos hacen 1-diceSides de daño (no multiplican por diceCount)
- Magic Missile debería hacer 3d4+3 pero hace solo 1-4
- Sin uso de modificador de hechizo

#### 5. **Sistema de Dificultad**
- HARD: solo +25% HP/Dmg enemigo (poco impacto)
- EASY: solo -20% HP/Dmg enemigo (poco impacto)

#### 6. **Items Consumibles**
- Pociones curan cantidades fijas muy bajas
- No hay variedad en efectos

---

## Cambios Implementados

### ✅ COMBATE
1. **Bonificadores de Ataque Reales**:
   - Ataques usan STR o DEX según el arma
   - Bonos de competencia basados en nivel
   - Critical hits en 20 natural (doble daño)

2. **Daño de Armas Mejorado**:
   - Ahora usa diceCount y diceSides del equipamiento
   - Aplica modificador de STR/DEX
   - Ejemplo: Espada larga = 1d8 + STR mod

3. **Magia Balanceada**:
   - Hechizos usan diceCount correctamente
   - Aplican modificador de INT/WIS/CHA según clase
   - Magic Missile: 3d4+3 damage
   - Firebolt: 1d10 + INT mod

### ✅ PROGRESIÓN
1. **XP Escalado**:
   - Base: 100 XP por enemigo nivel 1
   - Escala: +50 XP por nivel de enemigo
   - Multiplicador de dificultad aplicado
   - Boss encounters: 2x XP

2. **Dificultad Revisada**:
   - EASY: 0.7x HP/Dmg, 1.3x XP, 1.5x Gold
   - NORMAL: 1.0x todo
   - HARD: 1.5x HP/Dmg, 1.5x XP, 0.7x Gold

### ✅ ENEMIGOS
1. **HP Escalado**:
   - Goblins: 7 + (nivel-1) × 5
   - Shadows: 22 + (nivel-1) × 8
   - Con multiplicador de dificultad

2. **AC Progresivo**:
   - Goblin base AC: 13
   - Shadow base AC: 14
   - +1 AC cada 2 niveles

3. **Daño de Enemigos**:
   - Goblins: 1d4 + 2
   - Shadows: 1d6 + 3
   - Aplicado con precisión D&D

### ✅ ECONOMÍA & REWARDS
1. **Oro Balanceado**:
   - 15-30 oro por combate nivel 1
   - Escala con nivel y dificultad

2. **Drops de Items**:
   - 15% chance de poción de curación
   - 5% chance de ítem mágico
   - Aumenta con dificultad HARD

---

## Valores de Referencia D&D 5e

### Bonos de Competencia por Nivel:
- Nivel 1-4: +2
- Nivel 5-8: +3
- Nivel 9-12: +4
- Nivel 13-16: +5

### HP Promedio por Hit Die:
- d6: 4 HP/nivel (Wizard)
- d8: 5 HP/nivel (Cleric, Bard)
- d10: 6 HP/nivel (Fighter)
- d12: 7 HP/nivel (Barbarian)

### Challenge Rating Guide:
- CR 1/8: 25 XP, ~6 HP, AC 12
- CR 1/4: 50 XP, ~9 HP, AC 13
- CR 1/2: 100 XP, ~15 HP, AC 13
- CR 1: 200 XP, ~30 HP, AC 14
