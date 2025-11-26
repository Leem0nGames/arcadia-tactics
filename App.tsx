
import React, { useEffect, useMemo, Suspense } from 'react';
import { GameState, TerrainType, HexCell, PositionComponent, BattleAction, WeatherType, Dimension } from './types';
import { MAP_WIDTH, MAP_HEIGHT } from './constants';
import { OverworldMap } from './components/OverworldMap';
import { BattleScene } from './components/BattleScene';
import { CharacterCreation } from './components/CharacterCreation';
import { UIOverlay } from './components/UIOverlay';
import { BattleResultModal } from './components/BattleResultModal';
import { useGameStore } from './store/gameStore';

// --- Organic Map Generation (Simulated Perlin Noise) ---
const noise = (x: number, y: number) => {
    const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453123;
    return n - Math.floor(n);
};

const smoothNoise = (x: number, y: number) => {
    const integersX = Math.floor(x);
    const integersY = Math.floor(y);
    const fractionalX = x - integersX;
    const fractionalY = y - integersY;

    const a = noise(integersX, integersY);
    const b = noise(integersX + 1, integersY);
    const c = noise(integersX, integersY + 1);
    const d = noise(integersX + 1, integersY + 1);

    const interpolate = (a: number, b: number, t: number) => a + (b - a) * t * t * (3 - 2 * t);

    const i1 = interpolate(a, b, fractionalX);
    const i2 = interpolate(c, d, fractionalX);

    return interpolate(i1, i2, fractionalY);
};

const generateDualWorlds = (): { normal: HexCell[], upsideDown: HexCell[] } => {
  const normalCells: HexCell[] = [];
  const upsideDownCells: HexCell[] = [];
  
  const scale = 0.12; 
  const moistureOffset = 150;
  const tempOffset = 300; 

  for (let r = 0; r < MAP_HEIGHT; r++) {
    for (let q = 0; q < MAP_WIDTH; q++) {
      // 1. Noise Generation (Identical for both worlds to preserve geography)
      const e = smoothNoise(q * scale, r * scale); // Elevation
      const m = smoothNoise((q + moistureOffset) * scale, (r + moistureOffset) * scale); // Moisture
      const t = smoothNoise((q + tempOffset) * scale, (r + tempOffset) * scale); // Temperature

      let terrain = TerrainType.WATER;
      let udTerrain = TerrainType.CHASM; // Default Upside Down void

      // 2. Base Terrain Determination
      if (e < 0.25) {
          terrain = TerrainType.WATER; 
          // Deep oceans become chasms/voids in Upside Down
          udTerrain = TerrainType.CHASM; 
      } else if (e < 0.32) {
          terrain = t > 0.6 ? TerrainType.DESERT : TerrainType.PLAINS;
          // Coasts/Shallows become Lava lakes
          udTerrain = TerrainType.LAVA; 
      } else if (e > 0.82) {
          terrain = TerrainType.MOUNTAIN;
          // Mountains stay Mountains (but will use dark assets in renderer if implemented, otherwise default mountain)
          // Since we share MOUNTAIN type, we rely on the Dimension prop in OverworldMap to potentially tint it or use different assets if we split the type.
          // For now, let's keep it Mountain, but in the Upside Down they feel like walls of the cavern.
          udTerrain = TerrainType.MOUNTAIN; 
      } else {
          // Landmass
          udTerrain = TerrainType.CAVE_FLOOR; // Default land in Upside Down is cave floor

          if (t < 0.35) {
              if (m < 0.5) { terrain = TerrainType.TUNDRA; }
              else { terrain = TerrainType.TAIGA; udTerrain = TerrainType.FUNGUS; } // Cold wet areas become Fungus
          } else if (t < 0.70) {
              if (m < 0.3) { terrain = TerrainType.PLAINS; }
              else if (m < 0.65) { terrain = TerrainType.GRASS; udTerrain = TerrainType.FUNGUS; } // Grass -> Fungus Forest
              else { terrain = TerrainType.FOREST; udTerrain = TerrainType.FUNGUS; } 
              
              if (e < 0.45 && m > 0.6) { terrain = TerrainType.SWAMP; udTerrain = TerrainType.LAVA; } // Swamps -> Lava Pools
          } else {
              if (m < 0.4) { terrain = TerrainType.DESERT; udTerrain = TerrainType.CAVE_FLOOR; }
              else { terrain = TerrainType.JUNGLE; udTerrain = TerrainType.FUNGUS; } 
          }
      }

      // 3. Points of Interest
      const poiRoll = Math.random();

      // Normal World POIs
      if (poiRoll > 0.97 && [TerrainType.JUNGLE, TerrainType.DESERT, TerrainType.SWAMP, TerrainType.TUNDRA].includes(terrain)) {
          terrain = TerrainType.RUINS;
      }
      else if (poiRoll > 0.96 && [TerrainType.GRASS, TerrainType.PLAINS].includes(terrain)) {
          terrain = TerrainType.VILLAGE;
      }
      else if (poiRoll > 0.975 && [TerrainType.MOUNTAIN, TerrainType.FOREST, TerrainType.TAIGA].includes(terrain)) {
          terrain = TerrainType.CASTLE;
      }

      // Upside Down POIs (Corruption)
      // Civilizations are ruined
      if (terrain === TerrainType.VILLAGE) udTerrain = TerrainType.RUINS;
      if (terrain === TerrainType.CASTLE) udTerrain = TerrainType.RUINS;
      
      // More Ruins in Upside Down generally
      if (poiRoll > 0.94 && ![TerrainType.CHASM, TerrainType.LAVA].includes(udTerrain)) {
           udTerrain = TerrainType.RUINS;
      }

      // 4. Force Safe Spawn
      if (q === 5 && r === 5) {
          terrain = TerrainType.GRASS;
          udTerrain = TerrainType.CAVE_FLOOR; // Safe floor
      }

      // 5. Weather
      let weather = WeatherType.NONE;
      const weatherRoll = Math.random();
      if ([TerrainType.TUNDRA, TerrainType.TAIGA, TerrainType.MOUNTAIN].includes(terrain) && t < 0.4) {
           if (weatherRoll > 0.7) weather = WeatherType.SNOW;
      } else if ([TerrainType.JUNGLE, TerrainType.SWAMP, TerrainType.FOREST].includes(terrain) && m > 0.6) {
           if (weatherRoll > 0.8) weather = WeatherType.RAIN;
      }
      
      let udWeather = WeatherType.ASH; // Default for Upside Down
      if (udTerrain === TerrainType.LAVA || udTerrain === TerrainType.CHASM) udWeather = WeatherType.FOG;

      // 6. Portals (Synced locations)
      // Low chance, must be on land in BOTH worlds to be safe
      const isLand = terrain !== TerrainType.WATER && terrain !== TerrainType.MOUNTAIN;
      const isUdLand = udTerrain !== TerrainType.CHASM && udTerrain !== TerrainType.LAVA && udTerrain !== TerrainType.MOUNTAIN;
      const hasPortal = isLand && isUdLand && Math.random() > 0.985;

      const baseCell = {
          q, r, isExplored: false, isVisible: false, hasPortal
      };

      normalCells.push({
          ...baseCell,
          terrain,
          weather,
          hasEncounter: Math.random() > 0.85 && ![TerrainType.VILLAGE, TerrainType.CASTLE, TerrainType.WATER, TerrainType.RUINS].includes(terrain),
      });

      upsideDownCells.push({
          ...baseCell,
          terrain: udTerrain,
          weather: udWeather,
          // Higher encounter rate in Upside Down
          hasEncounter: Math.random() > 0.6 && ![TerrainType.CHASM, TerrainType.LAVA].includes(udTerrain),
      });
    }
  }
  return { normal: normalCells, upsideDown: upsideDownCells };
};

const App = () => {
  const store = useGameStore();
  const { 
    gameState, currentMapData, playerPos, battleEntities, turnOrder, currentTurnIndex,
    battleTerrain, battleWeather, battleRewards, selectedAction, hasMoved, hasActed, dimension
  } = store;

  // Initialize Map on Mount
  useEffect(() => {
      const { normal, upsideDown } = generateDualWorlds();
      store.initializeWorld(normal, upsideDown);
  }, []);

  // --- Calculation Helpers ---
  const activeEntityId = turnOrder[currentTurnIndex];
  const activeEntity = battleEntities.find(e => e.id === activeEntityId);

  const validMoves = useMemo(() => {
      if (gameState !== GameState.BATTLE_TACTICAL || selectedAction !== BattleAction.MOVE || hasMoved) return [];
      
      // Fix: Use active entity (Party Member) instead of hardcoded 'player'
      if (!activeEntity || activeEntity.type !== 'PLAYER') return [];

      const moves: PositionComponent[] = [];
      const speedInTiles = Math.floor(activeEntity.stats.speed / 5);

      for (let x = 0; x < 8; x++) {
          for (let z = 0; z < 8; z++) {
              const dist = Math.max(Math.abs(activeEntity.position.x - x), Math.abs(activeEntity.position.y - z));
              const occupied = battleEntities.some(e => e.position.x === x && e.position.y === z && e.id !== activeEntity.id);
              
              if (dist <= speedInTiles && !occupied) moves.push({ x, y: z });
          }
      }
      return moves;
  }, [gameState, selectedAction, hasMoved, battleEntities, activeEntity]);

  const validTargets = useMemo(() => {
      if (gameState !== GameState.BATTLE_TACTICAL || (!selectedAction) || hasActed) return [];
      
      let range = 0;
      if (selectedAction === BattleAction.ATTACK) range = 1;
      else if (selectedAction === BattleAction.MAGIC) range = 6;
      else return [];

      // Fix: Use active entity instead of hardcoded 'player'
      if (!activeEntity || activeEntity.type !== 'PLAYER') return [];

      return battleEntities
        .filter(e => e.type === 'ENEMY')
        .filter(e => {
            const dist = Math.max(Math.abs(activeEntity.position.x - e.position.x), Math.abs(activeEntity.position.y - e.position.y));
            if (dist > range) return false;
            
            // Check Line of Sight
            return store.hasLineOfSight(activeEntity.position, e.position);
        })
        .map(e => ({ x: e.position.x, y: e.position.y }));

  }, [gameState, selectedAction, hasActed, battleEntities, activeEntity, store]);


  return (
    <div className="w-screen h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans relative">
      
      {gameState === GameState.CHARACTER_CREATION && (
          <CharacterCreation onComplete={store.createCharacter} />
      )}

      {(gameState === GameState.OVERWORLD || gameState === GameState.TOWN_EXPLORATION) && (
          <>
            <OverworldMap 
                mapData={currentMapData} 
                playerPos={playerPos} 
                onMove={store.movePlayerOverworld}
                dimension={dimension}
            />
            <UIOverlay />
          </>
      )}

      {(gameState === GameState.BATTLE_TACTICAL || gameState === GameState.BATTLE_VICTORY || gameState === GameState.BATTLE_DEFEAT) && (
          <>
            <Suspense fallback={
                <div className="flex items-center justify-center h-full w-full text-amber-400 font-serif animate-pulse">
                    Loading Battle...
                </div>
            }>
                <BattleScene 
                    entities={battleEntities} 
                    terrainType={battleTerrain}
                    weather={battleWeather}
                    currentTurnEntityId={turnOrder[currentTurnIndex]}
                    onTileClick={store.handleTileInteraction}
                    validMoves={validMoves}
                    validTargets={validTargets}
                />
                <UIOverlay />
            </Suspense>

            {/* Render Modal OUTSIDE Suspense to ensure visibility even if scene glitches */}
            {(gameState === GameState.BATTLE_VICTORY || gameState === GameState.BATTLE_DEFEAT) && (
                <BattleResultModal 
                    type={gameState === GameState.BATTLE_VICTORY ? 'victory' : 'defeat'}
                    rewards={gameState === GameState.BATTLE_VICTORY ? battleRewards : undefined}
                    onContinue={store.continueAfterVictory}
                    onRestart={store.restartBattle}
                    onQuit={store.quitToMenu}
                />
            )}
          </>
      )}
    </div>
  );
};

export default App;
