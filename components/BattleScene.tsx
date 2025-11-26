import React, { useRef, useMemo, Suspense, useState, useEffect, useLayoutEffect } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, QuadraticBezierLine, Html, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { Entity, PositionComponent, VisualComponent, TerrainType, CombatStatsComponent, DamagePopup, BattleAction, SpellEffectData, WeatherType, BattleCell, Dimension, GameState } from '../types';
import { useGameStore } from '../store/gameStore';
import { WeatherOverlay } from './OverworldMap';
import { ASSETS } from '../constants';

// --- Shared Reusable Objects (Memory Optimization) ---
const _tempObj = new THREE.Object3D();
const _tempColor = new THREE.Color();
const _tempVec = new THREE.Vector3();

// --- Safe Texture Loader Hook ---
// Prevents crashes by returning a fallback texture if the URL fails or is invalid
const useSafeTexture = (url: string | undefined, fallbackColor: string = 'magenta') => {
    const [texture, setTexture] = useState<THREE.Texture | null>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!url || url.length < 5) {
            setError(true);
            return;
        }

        const loader = new THREE.TextureLoader();
        loader.load(
            url,
            (tex) => {
                tex.magFilter = THREE.NearestFilter;
                tex.minFilter = THREE.NearestFilter;
                setTexture(tex);
                setError(false);
            },
            undefined,
            (err) => {
                console.warn(`Failed to load texture: ${url}`, err);
                setError(true);
            }
        );
    }, [url]);

    // Create a fallback texture on the fly if needed
    const fallback = useMemo(() => {
        if (!error && !texture) return null; // Loading...
        if (texture) return texture;

        // Generate simple colored placeholder
        const canvas = document.createElement('canvas');
        canvas.width = 64; canvas.height = 64;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.fillStyle = fallbackColor;
            ctx.fillRect(0, 0, 64, 64);
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.fillRect(0, 0, 32, 32);
            ctx.fillRect(32, 32, 32, 32);
        }
        const t = new THREE.CanvasTexture(canvas);
        t.magFilter = THREE.NearestFilter;
        return t;
    }, [error, texture, fallbackColor]);

    return fallback;
};

// --- Fog Controller for Shadow Realm ---
const FogController = React.memo(({ isShadowRealm }: { isShadowRealm: boolean }) => {
    const { scene } = useThree();
    useEffect(() => {
        if (isShadowRealm) {
            scene.fog = new THREE.FogExp2('#1e1b4b', 0.08);
            scene.background = new THREE.Color('#020617');
        } else {
            scene.fog = null;
            scene.background = null;
        }
    }, [isShadowRealm, scene]);
    return null;
});

// --- Particles (Optimized) ---
const VoidParticles = React.memo(({ color = '#a855f7', floatUp = false }: { color?: string, floatUp?: boolean }) => {
    const count = 100; // Reduced count for mobile performance
    const mesh = useRef<THREE.Points>(null);
    const particles = useMemo(() => {
        const pos = new Float32Array(count * 3);
        const speeds = new Float32Array(count);
        const phases = new Float32Array(count);
        for (let i = 0; i < count; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 16;
            pos[i * 3 + 1] = Math.random() * 8;
            pos[i * 3 + 2] = (Math.random() - 0.5) * 16;
            speeds[i] = Math.random() * 0.02 + 0.005;
            phases[i] = Math.random() * Math.PI * 2;
        }
        return { pos, speeds, phases };
    }, []);

    useFrame(({ clock }) => {
        if (!mesh.current) return;
        const time = clock.getElapsedTime();
        const pos = mesh.current.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < count; i++) {
            const yIdx = i * 3 + 1;
            if (floatUp) {
                pos[yIdx] += particles.speeds[i];
                if (pos[yIdx] > 8) pos[yIdx] = 0;
            } else {
                pos[yIdx] -= particles.speeds[i];
                if (pos[yIdx] < 0) pos[yIdx] = 8;
            }
        }
        mesh.current.geometry.attributes.position.needsUpdate = true;
    });

    return (
        <points ref={mesh}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" count={count} array={particles.pos} itemSize={3} />
            </bufferGeometry>
            <pointsMaterial size={0.2} color={color} transparent opacity={0.6} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
        </points>
    );
});

// --- Units (Billboard) ---
const BillboardUnit = React.memo(({ position, color, spriteUrl, isCurrentTurn, hp, maxHp }: any) => {
    const safeMaxHp = maxHp || 1;
    const hpPercent = Math.max(0, Math.min(1, hp / safeMaxHp));

    if (!position || isNaN(position[0]) || isNaN(position[2])) return null;

    return (
        <group position={position}>
            {isCurrentTurn && (
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
                    <ringGeometry args={[0.4, 0.45, 32]} />
                    <meshBasicMaterial color={color} transparent opacity={0.8} toneMapped={false} side={THREE.DoubleSide} />
                </mesh>
            )}

            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} scale={[1.2, 0.8, 1]}>
                <circleGeometry args={[0.35, 16]} />
                <meshBasicMaterial color="black" transparent opacity={0.4} depthWrite={false} />
            </mesh>

            <Billboard>
                <SpriteComponent url={spriteUrl} color={color} hpPercent={hpPercent} />
            </Billboard>
        </group>
    );
});

const SpriteComponent = ({ url, color, hpPercent }: any) => {
    const safeUrl = (url && url.length > 5) ? url : ASSETS.UNITS.PLAYER;
    const texture = useSafeTexture(safeUrl, color);

    if (!texture) return null; // Wait for load

    return (
        <group position={[0, 0.85, 0]}>
            <mesh position={[0, 0, -0.01]} scale={[1.05, 1.05, 1]}>
                <planeGeometry args={[2, 2]} />
                <meshBasicMaterial map={texture} transparent alphaTest={0.5} color="black" side={THREE.DoubleSide} />
            </mesh>
            <mesh>
                <planeGeometry args={[2, 2]} />
                <meshStandardMaterial map={texture} transparent alphaTest={0.5} color={'white'} side={THREE.DoubleSide} roughness={0.8} />
            </mesh>
            {/* HP Bar */}
            <group position={[0, 1.2, 0]}>
                <mesh position={[0, 0, -0.01]}><planeGeometry args={[1.05, 0.15]} /><meshBasicMaterial color="#0f172a" /></mesh>
                {hpPercent > 0 && (
                    <mesh position={[-0.5 + (1.0 * hpPercent) / 2, 0, 0]}>
                        <planeGeometry args={[1.0 * hpPercent, 0.1]} />
                        <meshBasicMaterial color={hpPercent > 0.5 ? "#22c55e" : "#ef4444"} toneMapped={false} />
                    </mesh>
                )}
            </group>
        </group>
    )
}

// --- Instanced Terrain (Static Layer) ---
const InstancedVoxelCluster = React.memo(({ data, textureUrl, isShadowRealm }: any) => {
    const texture = useSafeTexture(textureUrl, '#57534e');
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const count = data.length;

    useLayoutEffect(() => {
        if (!meshRef.current || count === 0) return;
        for (let i = 0; i < count; i++) {
            const block = data[i];
            const y = block.offsetY + block.height / 2;
            _tempObj.position.set(block.x, y, block.z);
            _tempObj.scale.set(1, block.height, 1);
            _tempObj.updateMatrix();
            meshRef.current.setMatrixAt(i, _tempObj.matrix);
            _tempColor.set(block.color);
            meshRef.current.setColorAt(i, _tempColor);
        }
        meshRef.current.instanceMatrix.needsUpdate = true;
        if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
    }, [data, count]);

    if (count === 0 || !texture) return null;

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, count]} castShadow receiveShadow frustumCulled={false}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial map={texture} color="white" roughness={0.9} emissive={isShadowRealm ? '#7c3aed' : 'black'} emissiveIntensity={isShadowRealm ? 0.2 : 0} />
        </instancedMesh>
    );
});

// --- Instanced Overlay (Grid Highlights) ---
const InstancedOverlay = React.memo(({ points, color, mapData, scale = 0.8 }: any) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const count = points ? points.length : 0;

    useLayoutEffect(() => {
        if (!meshRef.current || count === 0 || !mapData) return;

        for (let i = 0; i < count; i++) {
            const p = points[i];
            const cell = mapData.find((c: BattleCell) => c.x === p.x && c.z === p.y);
            const y = cell ? cell.offsetY + cell.height : 0.5;

            _tempObj.position.set(p.x, y + 0.02, p.y);
            _tempObj.rotation.set(-Math.PI / 2, 0, 0);
            _tempObj.scale.set(scale, scale, 1);
            _tempObj.updateMatrix();
            meshRef.current.setMatrixAt(i, _tempObj.matrix);
        }
        meshRef.current.instanceMatrix.needsUpdate = true;
    }, [points, mapData, count, scale]);

    if (count === 0) return null;

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, count]} frustumCulled={false}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial color={color} opacity={0.4} transparent depthWrite={false} side={THREE.DoubleSide} />
        </instancedMesh>
    );
});


// --- Interaction & Overlay Layer (Dynamic) ---
const InteractionLayer = ({ mapData, validMoves, validTargets, onTileClick, onTileHover }: any) => {

    if (!mapData || mapData.length === 0) return null;

    const handlePointerMove = (e: any) => {
        e.stopPropagation();
        const x = Math.round(e.point.x);
        const z = Math.round(e.point.z);
        if (x >= 0 && x < 8 && z >= 0 && z < 8) {
            onTileHover(x, z);
        }
    };

    const handleClick = (e: any) => {
        e.stopPropagation();
        const x = Math.round(e.point.x);
        const z = Math.round(e.point.z);
        if (x >= 0 && x < 8 && z >= 0 && z < 8) {
            onTileClick(x, z);
        }
    };

    return (
        <group>
            {/* Interaction Plane */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[3.5, 0.5, 3.5]} visible={false} onPointerMove={handlePointerMove} onClick={handleClick}>
                <planeGeometry args={[8, 8]} />
                <meshBasicMaterial />
            </mesh>

            {/* Optimized Instanced Overlays */}
            <InstancedOverlay points={validMoves} color="#3b82f6" mapData={mapData} scale={0.8} />
            <InstancedOverlay points={validTargets} color="#ef4444" mapData={mapData} scale={0.9} />

            {/* Selection Cursor */}
            {useGameStore.getState().selectedTile && (() => {
                const t = useGameStore.getState().selectedTile;
                if (!t) return null;
                const cell = mapData.find((c: BattleCell) => c.x === t.x && c.z === t.z);
                const y = cell ? cell.offsetY + cell.height : 0.5;
                return (
                    <mesh position={[t.x, y + 0.03, t.z]} rotation={[-Math.PI / 2, 0, 0]}>
                        <planeGeometry args={[0.9, 0.9]} />
                        <meshBasicMaterial color="white" wireframe opacity={0.5} transparent />
                    </mesh>
                )
            })()}
        </group>
    )
};

// --- Main Components ---

const TerrainLayer = React.memo(({ mapData, isShadowRealm }: any) => {
    const grouped = useMemo(() => {
        const g: Record<string, BattleCell[]> = {};
        if (!mapData) return g;
        mapData.forEach((b: BattleCell) => {
            const k = b.textureUrl && b.textureUrl.length > 5 ? b.textureUrl : 'default';
            if (k === 'default') return;
            if (!g[k]) g[k] = [];
            g[k].push(b);
        });
        return g;
    }, [mapData]);

    if (!mapData || mapData.length === 0) return null;

    return (
        <group>
            {Object.entries(grouped).map(([url, blocks]) => (
                <InstancedVoxelCluster key={url} textureUrl={url} data={blocks} isShadowRealm={isShadowRealm} />
            ))}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[3.5, -0.5, 3.5]} receiveShadow>
                <planeGeometry args={[16, 16]} />
                <meshStandardMaterial color={isShadowRealm ? "#2e1065" : "#0f172a"} roughness={1} />
            </mesh>
        </group>
    );
});

export const BattleScene = ({ entities, weather, currentTurnEntityId, onTileClick, validMoves, validTargets }: any) => {
    const { battleMap, damagePopups, handleTileHover, dimension } = useGameStore();
    const isShadowRealm = dimension === Dimension.UPSIDE_DOWN;
    const activeEntity = entities.find((e: Entity) => e.id === currentTurnEntityId);

    // Optimized Camera Control
    const CameraController = () => {
        const { controls } = useThree();
        useEffect(() => {
            if (controls && activeEntity && activeEntity.position) {
                // @ts-ignore
                controls.target.set(activeEntity.position.x, 0, activeEntity.position.y);
                // @ts-ignore
                controls.update();
            }
        }, [currentTurnEntityId, activeEntity]);
        return null;
    };

    return (
        <div className="w-full h-full bg-slate-950 relative">
            <WeatherOverlay type={weather} />
            <Canvas shadows dpr={[1, 1.5]} camera={{ position: [0, 8, 8], fov: 40 }}>
                <FogController isShadowRealm={isShadowRealm} />
                <CameraController />
                <OrbitControls enablePan={true} maxDistance={14} minDistance={4} target={[3.5, 0, 3.5]} />

                <ambientLight intensity={isShadowRealm ? 0.2 : 0.7} color={isShadowRealm ? "#4c1d95" : "#cbd5e1"} />
                <directionalLight
                    position={[-5, 10, -5]}
                    intensity={1.2}
                    castShadow
                    shadow-mapSize={[512, 512]}
                />

                <TerrainLayer mapData={battleMap} isShadowRealm={isShadowRealm} />

                <InteractionLayer mapData={battleMap} validMoves={validMoves} validTargets={validTargets} onTileClick={onTileClick} onTileHover={handleTileHover} />

                {entities.map((ent: any) => {
                    if (!ent.position) return null;
                    return (
                        <BillboardUnit
                            key={ent.id}
                            position={[ent.position.x, 0.5, ent.position.y]}
                            color={ent.visual.color}
                            spriteUrl={ent.visual.spriteUrl}
                            isCurrentTurn={ent.id === currentTurnEntityId}
                            hp={ent.stats.hp}
                            maxHp={ent.stats.maxHp}
                        />
                    );
                })}

                {damagePopups.map((p: any) => (
                    <Html key={p.id} position={[p.position[0], p.position[2] + 2, p.position[1]]} center zIndexRange={[100, 0]}>
                        <div className={`font-serif font-bold text-2xl drop-shadow-md ${p.isCrit ? 'text-amber-300 text-3xl' : 'text-white'}`} style={{ textShadow: '0 0 4px black' }}>{p.amount}</div>
                    </Html>
                ))}

                {(isShadowRealm || weather === WeatherType.ASH) && <VoidParticles color={isShadowRealm ? "#d8b4fe" : "#57534e"} floatUp={isShadowRealm} />}
            </Canvas>
        </div>
    );
};