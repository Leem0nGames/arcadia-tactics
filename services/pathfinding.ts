
import { HexCell, BattleCell } from '../types';
import { TERRAIN_MOVEMENT_COST } from '../constants';

const HEX_DIRECTIONS = [
    { dq: 1, dr: 0 }, { dq: 0, dr: 1 }, { dq: -1, dr: 1 },
    { dq: -1, dr: 0 }, { dq: 0, dr: -1 }, { dq: 1, dr: -1 }
];

const GRID_DIRECTIONS = [
    { dx: 0, dy: -1 }, { dx: 1, dy: -1 }, { dx: 1, dy: 0 }, { dx: 1, dy: 1 },
    { dx: 0, dy: 1 }, { dx: -1, dy: 1 }, { dx: -1, dy: 0 }, { dx: -1, dy: -1 }
];

const distHex = (a: {q:number, r:number}, b: {q:number, r:number}) => {
    return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
};

const distGrid = (a: {x:number, y:number}, b: {x:number, y:number}) => {
    // Chebyshev distance (King movement)
    return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
};

/**
 * A* Pathfinding for Hexagonal Grid (Overworld)
 */
export const findPath = (start: {q:number, r:number}, end: {q:number, r:number}, map: HexCell[]): HexCell[] | null => {
    const mapIndex = new Map<string, HexCell>();
    map.forEach(c => mapIndex.set(`${c.q},${c.r}`, c));

    if (!mapIndex.has(`${end.q},${end.r}`)) return null;
    
    // Check if target is impassable (Cost >= 99)
    const endCell = mapIndex.get(`${end.q},${end.r}`);
    if (endCell && (TERRAIN_MOVEMENT_COST[endCell.terrain] || 1) >= 99) return null;

    const openSet: { cell: HexCell, f: number, g: number, parent?: any }[] = [];
    const closedSet = new Set<string>();

    const startCell = mapIndex.get(`${start.q},${start.r}`);
    if (!startCell) return null;

    openSet.push({ cell: startCell, f: 0, g: 0 });

    while (openSet.length > 0) {
        openSet.sort((a, b) => a.f - b.f);
        const current = openSet.shift()!;
        const currentKey = `${current.cell.q},${current.cell.r}`;

        if (current.cell.q === end.q && current.cell.r === end.r) {
            const path: HexCell[] = [];
            let curr = current;
            while (curr.parent) {
                path.push(curr.cell);
                curr = curr.parent;
            }
            return path.reverse();
        }

        closedSet.add(currentKey);

        for (const dir of HEX_DIRECTIONS) {
            const nQ = current.cell.q + dir.dq;
            const nR = current.cell.r + dir.dr;
            const nKey = `${nQ},${nR}`;

            if (closedSet.has(nKey)) continue;

            const neighbor = mapIndex.get(nKey);
            if (!neighbor) continue;

            const cost = TERRAIN_MOVEMENT_COST[neighbor.terrain] || 1;
            if (cost >= 99) continue;

            const tentativeG = current.g + cost;
            const existingNode = openSet.find(n => n.cell.q === nQ && n.cell.r === nR);
            if (existingNode && tentativeG >= existingNode.g) continue;

            const heuristic = distHex({q: nQ, r: nR}, end);
            const newNode = { cell: neighbor, g: tentativeG, f: tentativeG + heuristic, parent: current };

            if (existingNode) {
                existingNode.g = tentativeG;
                existingNode.f = tentativeG + heuristic;
                existingNode.parent = current;
            } else {
                openSet.push(newNode);
            }
        }
    }
    return null;
};

/**
 * A* Pathfinding for Square Grid (Battle)
 * Supports height checks and obstacles.
 */
export const findBattlePath = (start: {x:number, y:number}, end: {x:number, y:number}, grid: BattleCell[]): BattleCell[] | null => {
    // Index grid for fast lookups
    const mapIndex = new Map<string, BattleCell>();
    grid.forEach(c => mapIndex.set(`${c.x},${c.z}`, c));

    if (!mapIndex.has(`${end.x},${end.y}`)) return null;
    const targetCell = mapIndex.get(`${end.x},${end.y}`);
    if (targetCell?.isObstacle) return null;

    const openSet: { cell: BattleCell, f: number, g: number, parent?: any }[] = [];
    const closedSet = new Set<string>();

    const startCell = mapIndex.get(`${start.x},${start.y}`);
    if (!startCell) return null;

    openSet.push({ cell: startCell, f: 0, g: 0 });

    while (openSet.length > 0) {
        openSet.sort((a, b) => a.f - b.f);
        const current = openSet.shift()!;
        const currentKey = `${current.cell.x},${current.cell.z}`;

        if (current.cell.x === end.x && current.cell.z === end.y) {
            const path: BattleCell[] = [];
            let curr = current;
            while (curr.parent) {
                path.push(curr.cell);
                curr = curr.parent;
            }
            return path.reverse();
        }

        closedSet.add(currentKey);

        for (const dir of GRID_DIRECTIONS) {
            const nX = current.cell.x + dir.dx;
            const nY = current.cell.z + dir.dy; // Grid uses z for Y-axis logically in 2D
            const nKey = `${nX},${nY}`;

            if (closedSet.has(nKey)) continue;

            const neighbor = mapIndex.get(nKey);
            if (!neighbor) continue;

            if (neighbor.isObstacle) continue;
            
            // Height Check: Cannot climb more than 1 unit height difference
            const heightDiff = (neighbor.offsetY + neighbor.height) - (current.cell.offsetY + current.cell.height);
            if (heightDiff > 1.0) continue; 

            const cost = 1; // Uniform cost for now
            const tentativeG = current.g + cost;
            
            const existingNode = openSet.find(n => n.cell.x === nX && n.cell.z === nY);
            if (existingNode && tentativeG >= existingNode.g) continue;

            const heuristic = distGrid({x: nX, y: nY}, end);
            const newNode = { cell: neighbor, g: tentativeG, f: tentativeG + heuristic, parent: current };

            if (existingNode) {
                existingNode.g = tentativeG;
                existingNode.f = tentativeG + heuristic;
                existingNode.parent = current;
            } else {
                openSet.push(newNode);
            }
        }
    }
    return null;
}
