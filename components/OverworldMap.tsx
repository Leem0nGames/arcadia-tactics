
import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { HexCell, TerrainType, PositionComponent, WeatherType, Dimension } from '../types';
import { HEX_SIZE, TERRAIN_COLORS, ASSETS, TERRAIN_PRIORITY, getWesnothTransition, TRANSITION_COMBINATIONS, DIRECTION_ORDER, MAP_WIDTH, MAP_HEIGHT } from '../constants';
import { useGameStore } from '../store/gameStore';
import { findPath } from '../services/pathfinding';

interface OverworldMapProps {
    mapData: HexCell[];
    playerPos: PositionComponent;
    onMove: (q: number, r: number) => void;
    dimension: Dimension;
}

// --- CONFIGURATION ---
const HEX_WIDTH = HEX_SIZE * 2;
const HEX_HEIGHT = Math.sqrt(3) * HEX_SIZE;
const HORIZ_DIST = HEX_SIZE * 1.5;
const VERT_DIST = HEX_HEIGHT;
const OVERLAY_OFFSET_Y = 0;

// Coordinate Conversion
const hexToPixel = (q: number, r: number) => ({ x: q * HORIZ_DIST, y: (r + q / 2) * VERT_DIST });

const pixelToAxial = (x: number, y: number) => {
    const q = (2 / 3 * x) / HEX_SIZE;
    const r = ((-1 / 3) * x + (Math.sqrt(3) / 3) * y) / HEX_SIZE;
    return axialRound(q, r);
};

const axialRound = (q: number, r: number) => {
    let rq = Math.round(q);
    let rr = Math.round(r);
    let rs = Math.round(-q - r);

    const qDiff = Math.abs(rq - q);
    const rDiff = Math.abs(rr - r);
    const sDiff = Math.abs(rs - (-q - r));

    if (qDiff > rDiff && qDiff > sDiff) {
        rq = -rr - rs;
    } else if (rDiff > sDiff) {
        rr = -rq - rs;
    }
    return { q: rq, r: rr };
};

const buildKey = (q: number, r: number) => `${q},${r}`;

// Neighbor offsets
const NEIGHBOR_OFFSETS = [
    { dq: 1, dr: 0, dir: 'se' },
    { dq: 0, dr: 1, dir: 's' },
    { dq: -1, dr: 1, dir: 'sw' },
    { dq: -1, dr: 0, dir: 'nw' },
    { dq: 0, dr: -1, dir: 'n' },
    { dq: 1, dr: -1, dir: 'ne' }
];

// Hex Polygon Path for SVG overlays
const HEX_POINTS = (() => {
    const points = [];
    for (let i = 0; i < 6; i++) {
        const angle_deg = 60 * i;
        const angle_rad = (Math.PI / 180) * angle_deg;
        points.push(`${HEX_SIZE * Math.cos(angle_rad)},${HEX_SIZE * Math.sin(angle_rad)}`);
    }
    return points.join(' ');
})();

// --- WEATHER COMPONENT (Exported for reuse) ---
export const WeatherOverlay = ({ type }: { type: WeatherType }) => {
    if (type === WeatherType.NONE) return null;
    return (
        <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
            {type === WeatherType.RAIN && (
                <div className="w-full h-full opacity-40"
                    style={{
                        backgroundImage: `url(${ASSETS.WEATHER.RAIN})`,
                        backgroundSize: '200px 200px',
                        animation: 'fall 0.8s linear infinite'
                    }}
                />
            )}
            {type === WeatherType.SNOW && (
                <div className="w-full h-full bg-white/20 opacity-30"
                    style={{
                        backgroundImage: 'radial-gradient(white 2px, transparent 2px)',
                        backgroundSize: '40px 40px',
                        animation: 'fall 4s linear infinite'
                    }}
                />
            )}
            {type === WeatherType.FOG && (
                <div className="w-full h-full bg-slate-300/20 mix-blend-overlay opacity-50 animate-pulse"
                    style={{ backdropFilter: 'blur(2px)' }}
                />
            )}
            {type === WeatherType.ASH && (
                <div className="w-full h-full opacity-50"
                    style={{
                        backgroundImage: 'radial-gradient(circle, #d8b4fe 1px, transparent 1px), radial-gradient(circle, #581c87 1.5px, transparent 1.5px)',
                        backgroundSize: '120px 120px',
                        backgroundPosition: '0 0, 60px 60px',
                        animation: 'ashFloat 12s linear infinite'
                    }}
                />
            )}
            <style>{`
                @keyframes fall {
                    from { background-position: 0 0; }
                    to { background-position: 50px 200px; }
                }
                @keyframes ashFloat {
                    0% { background-position: 0 0, 60px 60px; transform: scale(1); opacity: 0.4; }
                    50% { background-position: 20px -50px, 80px 20px; transform: scale(1.1); opacity: 0.6; }
                    100% { background-position: 40px -100px, 100px 0px; transform: scale(1); opacity: 0.4; }
                }
            `}</style>
        </div>
    );
};

export const OverworldMap: React.FC<OverworldMapProps> = ({ mapData, playerPos, onMove, dimension }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    // Offscreen Buffer for Static Terrain (Optimization)
    const bufferCanvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
    const isBufferDirty = useRef(true);

    // Caches
    const tileCache = useRef<Map<string, HTMLCanvasElement>>(new Map());
    const imgCache = useRef<Map<string, HTMLImageElement>>(new Map());
    const transitionCache = useRef<Map<string, HTMLCanvasElement>>(new Map());
    const failedUrls = useRef<Set<string>>(new Set()); // Track failed URLs to avoid repeated warnings

    // Viewport State
    const [viewport, setViewport] = useState({ x: 0, y: 0, w: window.innerWidth, h: window.innerHeight });
    const pan = useRef({ x: 0, y: 0 });
    const isDragging = useRef(false);
    const lastMousePos = useRef({ x: 0, y: 0 });
    const dragDistance = useRef(0);
    const needsRedraw = useRef(true);

    const [hoveredCellKey, setHoveredCellKey] = useState<string | null>(null);
    const [previewPath, setPreviewPath] = useState<HexCell[]>([]);

    const { party } = useGameStore();

    const isUpsideDown = dimension === Dimension.UPSIDE_DOWN;

    // --- MAP INDEXING ---
    const mapIndex = useMemo(() => {
        const m = new Map<string, HexCell>();
        mapData.forEach(c => m.set(buildKey(c.q, c.r), c));
        return m;
    }, [mapData]);

    // Generate a signature for explored state to avoid excessive buffer redraws
    const explorationSignature = useMemo(() => {
        // Creates a simple string representation of which tiles are explored. 
        // If this changes, we need to redraw the static terrain buffer.
        return mapData.reduce((acc, cell) => acc + (cell.isExplored ? '1' : '0'), '');
    }, [mapData]);

    const currentPlayerCell = mapData.find(c => c.q === playerPos.x && c.r === playerPos.y);
    const currentWeather = currentPlayerCell ? currentPlayerCell.weather : WeatherType.NONE;

    // --- PATHFINDING PREVIEW ---
    useEffect(() => {
        if (!hoveredCellKey || isDragging.current) {
            if (previewPath.length > 0) setPreviewPath([]);
            return;
        }

        const [q, r] = hoveredCellKey.split(',').map(Number);

        // Optimization: Don't pathfind to self
        if (q === playerPos.x && r === playerPos.y) {
            if (previewPath.length > 0) setPreviewPath([]);
            return;
        }

        const path = findPath({ q: playerPos.x, r: playerPos.y }, { q, r }, mapData);
        setPreviewPath(path || []);

    }, [hoveredCellKey, playerPos, mapData]);


    // --- INITIALIZATION & RESIZE ---
    useEffect(() => {
        const center = hexToPixel(playerPos.x, playerPos.y);
        pan.current = { x: center.x, y: center.y };
        updateViewport();
        needsRedraw.current = true;
    }, []); // Run once on mount

    // Camera Follow Player
    useEffect(() => {
        const center = hexToPixel(playerPos.x, playerPos.y);
        pan.current = { x: center.x, y: center.y };
        updateViewport();
        needsRedraw.current = true;
    }, [playerPos.x, playerPos.y]);

    // Mark buffer dirty ONLY when map exploration changes or dimension switches
    // We do NOT update buffer on just visibility changes (fog of war), as that is handled dynamically.
    useEffect(() => {
        isBufferDirty.current = true;
        needsRedraw.current = true;
    }, [explorationSignature, dimension]);

    // Ensure we redraw dynamic layer if mapData changes (e.g. visibility updates) even if buffer isn't dirty
    useEffect(() => {
        needsRedraw.current = true;
    }, [mapData]);

    useEffect(() => {
        const handleResize = () => {
            updateViewport();
            needsRedraw.current = true;
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const updateViewport = () => {
        if (containerRef.current) {
            const { clientWidth, clientHeight } = containerRef.current;
            setViewport({
                x: pan.current.x - clientWidth / 2,
                y: pan.current.y - clientHeight / 2,
                w: clientWidth,
                h: clientHeight
            });
        }
    };

    const handleRecenter = () => {
        const center = hexToPixel(playerPos.x, playerPos.y);
        pan.current = { x: center.x, y: center.y };
        updateViewport();
        needsRedraw.current = true;
    };

    // --- ASSET LOADING ---
    const loadImage = useCallback((src: string): Promise<HTMLImageElement | null> => {
        if (!src) return Promise.resolve(null);
        if (imgCache.current.has(src)) return Promise.resolve(imgCache.current.get(src)!);
        if (failedUrls.current.has(src)) return Promise.resolve(null); // Skip known failed URLs

        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                imgCache.current.set(src, img);
                resolve(img);
            };
            img.onerror = () => {
                failedUrls.current.add(src); // Track failed URL silently without logging
                resolve(null);
            };
            img.src = src;
        });
    }, []);

    // Helper function to render fallback terrain when images fail to load
    const renderFallbackTerrain = (ctx: CanvasRenderingContext2D, terrain: TerrainType, size: number) => {
        const halfSize = size / 2;

        // Clear and fill with base color
        ctx.clearRect(0, 0, size, size);

        // Create gradient base for depth
        const baseGradient = ctx.createRadialGradient(halfSize, halfSize, 0, halfSize, halfSize, halfSize);
        const baseColor = TERRAIN_COLORS[terrain];
        baseGradient.addColorStop(0, baseColor);
        baseGradient.addColorStop(1, adjustBrightness(baseColor, -20));
        ctx.fillStyle = baseGradient;
        ctx.fillRect(0, 0, size, size);

        // Add realistic textures based on terrain type
        ctx.save();

        if ([TerrainType.FOREST, TerrainType.JUNGLE, TerrainType.TAIGA].includes(terrain)) {
            // Tree canopy pattern with varying sizes
            ctx.globalAlpha = 0.25;
            for (let i = 0; i < 12; i++) {
                const x = (Math.random() * size);
                const y = (Math.random() * size);
                const radius = 4 + Math.random() * 6;
                const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
                grad.addColorStop(0, '#1a330a');
                grad.addColorStop(1, 'transparent');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if ([TerrainType.WATER, TerrainType.LAVA].includes(terrain)) {
            // Wave/flow pattern with shimmer
            ctx.globalAlpha = 0.2;
            ctx.strokeStyle = terrain === TerrainType.LAVA ? '#fbbf24' : '#93c5fd';
            ctx.lineWidth = 2;
            for (let y = 0; y < size; y += size / 5) {
                ctx.beginPath();
                for (let x = 0; x <= size; x += 4) {
                    const wave = Math.sin((x + y) / 8) * 3;
                    if (x === 0) ctx.moveTo(x, y + wave);
                    else ctx.lineTo(x, y + wave);
                }
                ctx.stroke();
            }
            // Add sparkle for lava
            if (terrain === TerrainType.LAVA) {
                ctx.globalAlpha = 0.4;
                ctx.fillStyle = '#ffffff';
                for (let i = 0; i < 8; i++) {
                    ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
                }
            }
        } else if ([TerrainType.MOUNTAIN, TerrainType.CASTLE, TerrainType.RUINS].includes(terrain)) {
            // Rocky/stone texture with cracks
            ctx.globalAlpha = 0.15;
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1;

            // Diagonal cracks
            for (let i = -size; i < size * 2; i += 12) {
                const offset = Math.random() * 6;
                ctx.beginPath();
                ctx.moveTo(i + offset, 0);
                ctx.lineTo(i + size + offset, size);
                ctx.stroke();
            }

            // Horizontal layers
            ctx.globalAlpha = 0.1;
            for (let y = 0; y < size; y += 8 + Math.random() * 4) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(size, y + Math.random() * 2 - 1);
                ctx.stroke();
            }

            // Stone chunks
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            for (let i = 0; i < 6; i++) {
                const x = Math.random() * size;
                const y = Math.random() * size;
                ctx.fillRect(x, y, 3 + Math.random() * 4, 3 + Math.random() * 4);
            }
        } else if ([TerrainType.DESERT, TerrainType.PLAINS, TerrainType.TUNDRA].includes(terrain)) {
            // Sand/snow dunes or grass tufts
            ctx.globalAlpha = 0.12;

            if (terrain === TerrainType.DESERT || terrain === TerrainType.TUNDRA) {
                // Dune lines
                ctx.strokeStyle = terrain === TerrainType.TUNDRA ? '#ffffff' : '#d97706';
                ctx.lineWidth = 1.5;
                for (let y = size / 4; y < size; y += size / 4) {
                    ctx.beginPath();
                    ctx.moveTo(0, y);
                    ctx.bezierCurveTo(size / 3, y - 5, 2 * size / 3, y + 5, size, y);
                    ctx.stroke();
                }
            } else {
                // Grass tufts
                ctx.fillStyle = '#2d5016';
                for (let i = 0; i < 20; i++) {
                    const x = Math.random() * size;
                    const y = Math.random() * size;
                    ctx.fillRect(x, y, 1, 3 + Math.random() * 3);
                    ctx.fillRect(x - 1, y + 1, 1, 2);
                    ctx.fillRect(x + 1, y + 1, 1, 2);
                }
            }
        } else if (terrain === TerrainType.SWAMP) {
            // Murky water with vegetation
            ctx.globalAlpha = 0.2;
            // Dark pools
            for (let i = 0; i < 5; i++) {
                const x = Math.random() * size;
                const y = Math.random() * size;
                const rad = 6 + Math.random() * 8;
                ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
                ctx.beginPath();
                ctx.arc(x, y, rad, 0, Math.PI * 2);
                ctx.fill();
            }
            // Reeds
            ctx.strokeStyle = '#3f6212';
            ctx.lineWidth = 1;
            for (let i = 0; i < 15; i++) {
                const x = Math.random() * size;
                const y = Math.random() * size;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x + (Math.random() - 0.5) * 4, y - 8 - Math.random() * 6);
                ctx.stroke();
            }
        } else {
            // Default: subtle radial gradient overlay
            const overlayGrad = ctx.createRadialGradient(halfSize, halfSize, 0, halfSize, halfSize, halfSize);
            overlayGrad.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
            overlayGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
            overlayGrad.addColorStop(1, 'rgba(0, 0, 0, 0.1)');
            ctx.fillStyle = overlayGrad;
            ctx.fillRect(0, 0, size, size);
        }

        // Add subtle vignette to all tiles
        ctx.globalAlpha = 0.2;
        const vignetteGrad = ctx.createRadialGradient(halfSize, halfSize, halfSize * 0.3, halfSize, halfSize, halfSize);
        vignetteGrad.addColorStop(0, 'transparent');
        vignetteGrad.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
        ctx.fillStyle = vignetteGrad;
        ctx.fillRect(0, 0, size, size);

        ctx.restore();
    };

    // Helper function to adjust color brightness
    const adjustBrightness = (color: string, percent: number): string => {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max(0, Math.min(255, (num >> 16) + amt));
        const G = Math.max(0, Math.min(255, (num >> 8 & 0x00FF) + amt));
        const B = Math.max(0, Math.min(255, (num & 0x0000FF) + amt));
        return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
    };

    // Pre-render Base Tiles
    const prebuildTerrainTile = useCallback(async (terrain: TerrainType) => {
        const key = `base-${terrain}`;
        if (tileCache.current.has(key)) return;

        const size = Math.ceil(HEX_SIZE * 2.2);
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;

        const src = ASSETS.TERRAIN[terrain];
        if (src) {
            const img = await loadImage(src);
            if (img) {
                ctx.drawImage(img, 0, 0, size, size);
            } else {
                // Fallback: Create a solid color hexagon with subtle texture
                renderFallbackTerrain(ctx, terrain, size);
            }
        } else {
            // No source defined, use fallback
            renderFallbackTerrain(ctx, terrain, size);
        }

        tileCache.current.set(key, canvas);
    }, [loadImage]);

    // Pre-render Transition Tiles
    const prebuildTransition = useCallback(async (terrain: TerrainType, combo: string) => {
        const key = `trans-${terrain}-${combo}`;
        if (transitionCache.current.has(key)) return;

        const url = getWesnothTransition(terrain, combo);
        if (!url) return;

        const img = await loadImage(url);
        if (!img) return;

        const size = Math.ceil(HEX_SIZE * 2.2);
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, size, size);
        transitionCache.current.set(key, canvas);
    }, [loadImage]);

    // Load all assets
    useEffect(() => {
        const loadAll = async () => {
            const terrains = new Set<TerrainType>();
            mapData.forEach(c => {
                terrains.add(c.terrain);
                // Also preload overlays if any
                const overlayDef = ASSETS.OVERLAYS[c.terrain];
                if (overlayDef) {
                    if (Array.isArray(overlayDef)) overlayDef.forEach(url => loadImage(url));
                    else loadImage(overlayDef);
                }
            });

            // 1. Base Terrains
            await Promise.all(Array.from(terrains).map(t => prebuildTerrainTile(t)));

            // 2. Transitions (Preload specific needed transitions)
            const transitionsPromises: Promise<any>[] = [];
            for (const cell of mapData) {
                if (!cell.isExplored) continue;

                const priorityNeighbors: Record<string, string[]> = {};
                NEIGHBOR_OFFSETS.forEach(offset => {
                    const n = mapIndex.get(buildKey(cell.q + offset.dq, cell.r + offset.dr));
                    if (n && n.isExplored && TERRAIN_PRIORITY[n.terrain] > TERRAIN_PRIORITY[cell.terrain]) {
                        if (!priorityNeighbors[n.terrain]) priorityNeighbors[n.terrain] = [];
                        priorityNeighbors[n.terrain].push(offset.dir);
                    }
                });

                for (const [tStr, dirs] of Object.entries(priorityNeighbors)) {
                    const terrain = tStr as TerrainType;
                    let activeDirs = [...dirs].sort((a, b) => DIRECTION_ORDER.indexOf(a) - DIRECTION_ORDER.indexOf(b));

                    TRANSITION_COMBINATIONS.forEach(combo => {
                        if (activeDirs.length === 0) return;
                        const parts = combo.split('-');
                        if (parts.every(p => activeDirs.includes(p))) {
                            transitionsPromises.push(prebuildTransition(terrain, combo));
                            activeDirs = activeDirs.filter(d => !parts.includes(d));
                        }
                    });
                }
            }

            await Promise.all(transitionsPromises);

            // Mark buffer dirty after assets load to ensure they are drawn
            isBufferDirty.current = true;
            needsRedraw.current = true;
        };

        loadAll();
    }, [mapData, mapIndex, prebuildTerrainTile, prebuildTransition, loadImage]);


    // --- BUFFER RENDERER ---
    const updateStaticBuffer = useCallback(() => {
        const buffer = bufferCanvasRef.current;
        const ctx = buffer.getContext('2d', { alpha: true });
        if (!ctx) return;

        // Calculate buffer size based on map dimensions
        const bufferPadding = HEX_SIZE * 3;
        const width = MAP_WIDTH * HORIZ_DIST + bufferPadding * 2;
        const height = MAP_HEIGHT * VERT_DIST + bufferPadding * 2;

        if (buffer.width !== width || buffer.height !== height) {
            buffer.width = width;
            buffer.height = height;
        }

        ctx.clearRect(0, 0, width, height);

        const imgSize = Math.ceil(HEX_SIZE * 2.2);
        const halfSize = imgSize / 2;

        mapData.forEach(cell => {
            if (!cell.isExplored) return;

            const { x, y } = hexToPixel(cell.q, cell.r);

            ctx.save();
            // Apply buffer padding translation
            ctx.translate(x + bufferPadding, y + bufferPadding);

            // 1. Base Terrain
            const baseCanvas = tileCache.current.get(`base-${cell.terrain}`);
            if (baseCanvas) {
                ctx.drawImage(baseCanvas, -halfSize, -halfSize);
            } else {
                // Fallback
                ctx.fillStyle = TERRAIN_COLORS[cell.terrain];
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const angle = 60 * i * (Math.PI / 180);
                    ctx.lineTo(HEX_SIZE * Math.cos(angle), HEX_SIZE * Math.sin(angle));
                }
                ctx.fill();
            }

            // 2. Transitions
            const priorityNeighbors: Record<string, string[]> = {};
            NEIGHBOR_OFFSETS.forEach(offset => {
                const n = mapIndex.get(buildKey(cell.q + offset.dq, cell.r + offset.dr));
                if (n && n.isExplored && TERRAIN_PRIORITY[n.terrain] > TERRAIN_PRIORITY[cell.terrain]) {
                    if (!priorityNeighbors[n.terrain]) priorityNeighbors[n.terrain] = [];
                    priorityNeighbors[n.terrain].push(offset.dir);
                }
            });

            for (const [tStr, dirs] of Object.entries(priorityNeighbors)) {
                let activeDirs = [...dirs].sort((a, b) => DIRECTION_ORDER.indexOf(a) - DIRECTION_ORDER.indexOf(b));
                TRANSITION_COMBINATIONS.forEach(combo => {
                    if (activeDirs.length === 0) return;
                    const parts = combo.split('-');
                    if (parts.every(p => activeDirs.includes(p))) {
                        const transCanvas = transitionCache.current.get(`trans-${tStr}-${combo}`);
                        if (transCanvas) ctx.drawImage(transCanvas, -halfSize, -halfSize);
                        activeDirs = activeDirs.filter(d => !parts.includes(d));
                    }
                });
            }

            // 3. Static Overlays (Trees, Mountains)
            const overlayDef = ASSETS.OVERLAYS[cell.terrain];
            if (overlayDef) {
                let url = '';
                if (Array.isArray(overlayDef)) {
                    const hash = Math.abs((cell.q * 13) ^ (cell.r * 7));
                    url = overlayDef[hash % overlayDef.length];
                } else {
                    url = overlayDef;
                }

                const img = imgCache.current.get(url);
                if (img) {
                    ctx.drawImage(img, -halfSize, -halfSize + OVERLAY_OFFSET_Y, imgSize, imgSize);
                }
            }

            ctx.restore();
        });
    }, [mapData, mapIndex]);


    // --- RENDER LOOP ---
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { alpha: false })!;

        let animationFrameId = 0;

        const render = () => {
            if (!needsRedraw.current) {
                animationFrameId = requestAnimationFrame(render);
                return;
            }
            needsRedraw.current = false;

            // Resize Canvas
            const dpr = window.devicePixelRatio || 1;
            if (canvas.width !== viewport.w * dpr || canvas.height !== viewport.h * dpr) {
                canvas.width = viewport.w * dpr;
                canvas.height = viewport.h * dpr;
                canvas.style.width = `${viewport.w}px`;
                canvas.style.height = `${viewport.h}px`;
                ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            }

            // Update Buffer if needed
            if (isBufferDirty.current) {
                updateStaticBuffer();
                isBufferDirty.current = false;
            }

            // Clear Screen
            ctx.fillStyle = isUpsideDown ? '#0a0010' : '#020617';
            ctx.fillRect(0, 0, viewport.w, viewport.h);

            // --- DRAW STATIC WORLD BUFFER ---
            const bufferPadding = HEX_SIZE * 3;

            const drawX = -bufferPadding - (pan.current.x - viewport.w / 2);
            const drawY = -bufferPadding - (pan.current.y - viewport.h / 2);

            ctx.drawImage(bufferCanvasRef.current, drawX, drawY);

            // --- DRAW DYNAMIC ELEMENTS (Fog Mask) ---
            // We still need to iterate visible cells to draw the fog mask for explored-but-not-visible cells
            // This is much cheaper than drawing terrain

            const minX = pan.current.x - viewport.w / 2 - HEX_SIZE * 2;
            const maxX = pan.current.x + viewport.w / 2 + HEX_SIZE * 2;
            const minY = pan.current.y - viewport.h / 2 - HEX_SIZE * 2;
            const maxY = pan.current.y + viewport.h / 2 + HEX_SIZE * 2;

            ctx.save();
            for (const cell of mapData) {
                if (!cell.isExplored) continue; // Unexplored areas are just background color

                const { x, y } = hexToPixel(cell.q, cell.r);
                if (x < minX || x > maxX || y < minY || y > maxY) continue;

                const screenX = x - (pan.current.x - viewport.w / 2);
                const screenY = y - (pan.current.y - viewport.h / 2);

                // Fog of War (Visible vs Explored)
                if (!cell.isVisible) {
                    ctx.translate(screenX, screenY);
                    ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
                    ctx.beginPath();
                    for (let i = 0; i < 6; i++) {
                        const angle = 60 * i * (Math.PI / 180);
                        ctx.lineTo(HEX_SIZE * Math.cos(angle), HEX_SIZE * Math.sin(angle));
                    }
                    ctx.fill();
                    ctx.translate(-screenX, -screenY);
                }
            }
            ctx.restore();

            animationFrameId = requestAnimationFrame(render);
        };

        animationFrameId = requestAnimationFrame(render);
        return () => cancelAnimationFrame(animationFrameId);
    }, [viewport, mapData, mapIndex, isUpsideDown, updateStaticBuffer]);


    // --- INTERACTION ---
    const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
        isDragging.current = true;
        dragDistance.current = 0;
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        lastMousePos.current = { x: clientX, y: clientY };
        // Clear path on drag start
        setPreviewPath([]);
    };

    const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDragging.current) return;

        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

        const dx = clientX - lastMousePos.current.x;
        const dy = clientY - lastMousePos.current.y;

        dragDistance.current += Math.abs(dx) + Math.abs(dy);

        pan.current.x -= dx;
        pan.current.y -= dy;

        lastMousePos.current = { x: clientX, y: clientY };

        updateViewport();
        needsRedraw.current = true;
    };

    const handlePointerUp = (e: React.MouseEvent | React.TouchEvent) => {
        isDragging.current = false;
    };

    const handleClick = (e: React.MouseEvent) => {
        if (dragDistance.current > 10) return;

        const rect = containerRef.current!.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        const worldX = clickX + (pan.current.x - viewport.w / 2);
        const worldY = clickY + (pan.current.y - viewport.h / 2);

        const { q, r } = pixelToAxial(worldX, worldY);
        onMove(q, r);
    };

    const handleMouseMoveOverlay = (e: React.MouseEvent) => {
        if (isDragging.current) return;

        const rect = containerRef.current!.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const worldX = mouseX + (pan.current.x - viewport.w / 2);
        const worldY = mouseY + (pan.current.y - viewport.h / 2);

        const { q, r } = pixelToAxial(worldX, worldY);
        setHoveredCellKey(`${q},${r}`);
    };

    const regionTitle = useMemo(() => {
        return isUpsideDown ? 'The Shadow Realm' : 'Forest of Whispers';
    }, [isUpsideDown]);

    // Player Sprite logic
    const playerSprite = party[0]?.visual?.spriteUrl || ASSETS.UNITS.PLAYER;

    return (
        <div
            ref={containerRef}
            className={`w-full h-full bg-slate-950 relative overflow-hidden select-none transition-all duration-1000 ${isUpsideDown ? 'grayscale-[0.3] brightness-75 contrast-125 hue-rotate-[240deg]' : ''}`}
            onMouseDown={handlePointerDown}
            onMouseMove={(e) => { handlePointerMove(e); handleMouseMoveOverlay(e); }}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
            onClick={handleClick}
        >
            {/* CANVAS LAYER (Terrain) */}
            <canvas
                ref={canvasRef}
                className="absolute inset-0 block pointer-events-none"
            />

            {/* SVG INTERACTION & DYNAMIC LAYER (Player, Glows, Grid) */}
            <svg
                className="absolute inset-0 pointer-events-none"
                width="100%"
                height="100%"
                viewBox={`${pan.current.x - viewport.w / 2} ${pan.current.y - viewport.h / 2} ${viewport.w} ${viewport.h}`}
                preserveAspectRatio="xMidYMid slice"
            >
                <defs>
                    <radialGradient id="portalGlow">
                        <stop offset="0%" stopColor="#a855f7" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
                    </radialGradient>
                    <polygon id="hex-shape-ui" points={HEX_POINTS} />
                </defs>

                {/* Portals & Effects */}
                {mapData.map(cell => {
                    if (!cell.isExplored || !cell.isVisible) return null;
                    const { x, y } = hexToPixel(cell.q, cell.r);

                    // Portal
                    if (cell.hasPortal) {
                        return (
                            <g key={`portal-${cell.q}-${cell.r}`} transform={`translate(${x}, ${y})`}>
                                <circle r={HEX_SIZE * 0.6} fill="url(#portalGlow)" opacity="0.4" />
                                <circle r={HEX_SIZE * 0.4} fill="none" stroke="#a855f7" strokeWidth="2" strokeDasharray="5, 3" opacity="0.8">
                                    <animateTransform attributeName="transform" type="rotate" from="0 0 0" to="360 0 0" dur="10s" repeatCount="indefinite" />
                                </circle>
                            </g>
                        )
                    }
                    return null;
                })}

                {/* PATH PREVIEW */}
                {previewPath.length > 0 && (
                    <g className="pointer-events-none">
                        <polyline
                            points={[
                                // Start from Player
                                (() => {
                                    const { x, y } = hexToPixel(playerPos.x, playerPos.y);
                                    return `${x},${y}`;
                                })(),
                                ...previewPath.map(cell => {
                                    const { x, y } = hexToPixel(cell.q, cell.r);
                                    return `${x},${y}`;
                                })
                            ].join(' ')}
                            fill="none"
                            stroke={isUpsideDown ? "#d8b4fe" : "#fbbf24"}
                            strokeWidth="3"
                            strokeDasharray="8,6"
                            strokeOpacity="0.6"
                            strokeLinecap="round"
                        />
                        {previewPath.map((cell, i) => {
                            const { x, y } = hexToPixel(cell.q, cell.r);
                            return (
                                <circle
                                    key={`path-${i}`}
                                    cx={x} cy={y}
                                    r={4}
                                    fill={isUpsideDown ? "#d8b4fe" : "#fbbf24"}
                                    fillOpacity="0.8"
                                />
                            );
                        })}
                    </g>
                )}

                {/* Hover Highlight */}
                {hoveredCellKey && (() => {
                    const [q, r] = hoveredCellKey.split(',').map(Number);
                    const { x, y } = hexToPixel(q, r);
                    return (
                        <use
                            href="#hex-shape-ui"
                            x={x} y={y}
                            stroke={isUpsideDown ? "#d8b4fe" : "#fbbf24"}
                            strokeWidth="2"
                            fill={isUpsideDown ? "#a855f7" : "#fbbf24"}
                            fillOpacity="0.1"
                            className="animate-pulse"
                        />
                    );
                })()}

                {/* Player */}
                {(() => {
                    const { x, y } = hexToPixel(playerPos.x, playerPos.y);
                    const PLAYER_SCALE = 2.0;
                    return (
                        <g transform={`translate(${x}, ${y})`}>
                            <use href="#hex-shape-ui" stroke="#fbbf24" strokeWidth="2" strokeOpacity="0.6" fill="none" className="animate-pulse" />
                            <image
                                href={playerSprite}
                                x={-(HEX_SIZE * PLAYER_SCALE) / 2}
                                y={-(HEX_SIZE * PLAYER_SCALE) * 0.75}
                                height={HEX_SIZE * PLAYER_SCALE}
                                width={HEX_SIZE * PLAYER_SCALE}
                                className="drop-shadow-2xl"
                                style={{ imageRendering: 'pixelated' }}
                            />
                        </g>
                    );
                })()}
            </svg>

            {/* UI OVERLAYS */}
            {isUpsideDown && (
                <div className="absolute inset-0 z-10 pointer-events-none bg-purple-900/20 mix-blend-overlay" />
            )}

            <WeatherOverlay type={currentWeather} />

            {/* Region Title */}
            <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-10 pointer-events-none text-center">
                <span className={`text-[10px] tracking-[0.3em] uppercase font-bold mb-1 ${isUpsideDown ? 'text-purple-400' : 'text-amber-500/80'}`}>
                    {isUpsideDown ? 'Dimension' : 'Region'}
                </span>
                <h2 className={`text-xl md:text-2xl font-serif drop-shadow-lg opacity-90 ${isUpsideDown ? 'text-purple-200' : 'text-amber-100'}`}>
                    {regionTitle}
                </h2>
                <span className="text-[10px] text-slate-400 uppercase tracking-widest mt-1 font-bold opacity-70">
                    {currentWeather === WeatherType.ASH ? 'Corrupted Air' : currentWeather === WeatherType.RAIN ? 'Heavy Rain' : currentWeather === WeatherType.FOG ? 'Dense Fog' : currentWeather === WeatherType.SNOW ? 'Snowfall' : 'Clear'}
                </span>
            </div>

            {/* Recenter Button */}
            <button onClick={handleRecenter} className="absolute bottom-48 right-4 z-20 bg-slate-900/80 border border-amber-500/30 p-3 rounded-full shadow-lg text-amber-400 hover:bg-slate-800 hover:scale-105 transition-all" title="Recenter Camera">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            </button>

            {/* Vignette */}
            <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(circle at center, transparent 50%, ${isUpsideDown ? '#0a0010' : '#020617'} 100%)`, opacity: 0.95 }} />
        </div>
    );
};
