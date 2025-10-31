// A* pathfinding for hex grids with drift mechanics

class PathFinder {
    constructor(grid) {
        this.grid = grid;
    }

    // Find path from start to goal, accounting for ship drift
    findPath(start, goal, ship, maxCost) {
        const frontier = new PriorityQueue();
        frontier.push(start.toString(), 0);

        const cameFrom = new Map();
        const costSoFar = new Map();

        cameFrom.set(start.toString(), null);
        costSoFar.set(start.toString(), 0);

        while (!frontier.isEmpty()) {
            const currentKey = frontier.pop();
            const current = HexCoord.fromString(currentKey);

            if (current.equals(goal)) {
                break;
            }

            const neighbors = current.neighbors();

            for (const next of neighbors) {
                // Check if hex is valid and not blocked
                if (!this.grid.isValidHex(next) || this.grid.isOccupied(next)) {
                    continue;
                }

                // Cost to move to this hex (1 AP per hex normally)
                const moveCost = this.getMoveCost(current, next, ship);
                const newCost = costSoFar.get(currentKey) + moveCost;

                // Skip if exceeds max cost (AP limit)
                if (newCost > maxCost) {
                    continue;
                }

                const nextKey = next.toString();

                if (!costSoFar.has(nextKey) || newCost < costSoFar.get(nextKey)) {
                    costSoFar.set(nextKey, newCost);
                    const priority = newCost + this.heuristic(next, goal);
                    frontier.push(nextKey, priority);
                    cameFrom.set(nextKey, currentKey);
                }
            }
        }

        // Reconstruct path
        if (!cameFrom.has(goal.toString())) {
            return null; // No path found
        }

        const path = [];
        let current = goal.toString();

        while (current !== null) {
            path.push(HexCoord.fromString(current));
            current = cameFrom.get(current);
        }

        path.reverse();
        return path.slice(1); // Remove starting position
    }

    // Get all reachable hexes within AP range
    getReachableHexes(start, ship) {
        const maxCost = ship.actionPoints;
        const visited = new Map();
        const frontier = new PriorityQueue();

        frontier.push(start.toString(), 0);
        visited.set(start.toString(), 0);

        while (!frontier.isEmpty()) {
            const currentKey = frontier.pop();
            const current = HexCoord.fromString(currentKey);
            const currentCost = visited.get(currentKey);

            const neighbors = current.neighbors();

            for (const next of neighbors) {
                if (!this.grid.isValidHex(next) || this.grid.isOccupied(next)) {
                    continue;
                }

                const moveCost = this.getMoveCost(current, next, ship);
                const newCost = currentCost + moveCost;

                if (newCost > maxCost) {
                    continue;
                }

                const nextKey = next.toString();

                if (!visited.has(nextKey) || newCost < visited.get(nextKey)) {
                    visited.set(nextKey, newCost);
                    frontier.push(nextKey, newCost);
                }
            }
        }

        // Convert to array of HexCoords
        const reachable = [];
        for (const [key, cost] of visited.entries()) {
            if (key !== start.toString()) {
                reachable.push({
                    hex: HexCoord.fromString(key),
                    cost: cost
                });
            }
        }

        return reachable;
    }

    // Calculate movement cost (can be modified by drift, terrain, etc.)
    getMoveCost(from, to, ship) {
        let baseCost = 1;

        // If ship has velocity and moving with drift, reduced cost
        if (ship.velocity) {
            const driftDirection = this.getVelocityDirection(ship.velocity);
            const moveDirection = this.getDirection(from, to);

            // Moving with drift is cheaper
            if (driftDirection === moveDirection) {
                baseCost *= 0.5;
            }
            // Moving against drift is more expensive
            else if (this.isOppositeDirection(driftDirection, moveDirection)) {
                baseCost *= 1.5;
            }
        }

        return baseCost;
    }

    getVelocityDirection(velocity) {
        // Determine primary direction from velocity vector
        const angle = Math.atan2(velocity.r, velocity.q);
        const sector = Math.floor((angle + Math.PI) / (Math.PI / 3));
        return sector % 6;
    }

    getDirection(from, to) {
        const dq = to.q - from.q;
        const dr = to.r - from.r;

        const directions = [
            [1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]
        ];

        for (let i = 0; i < directions.length; i++) {
            if (directions[i][0] === dq && directions[i][1] === dr) {
                return i;
            }
        }

        return -1;
    }

    isOppositeDirection(dir1, dir2) {
        return Math.abs(dir1 - dir2) === 3;
    }

    heuristic(a, b) {
        return a.distance(b);
    }
}

// Simple priority queue for A*
class PriorityQueue {
    constructor() {
        this.elements = [];
    }

    isEmpty() {
        return this.elements.length === 0;
    }

    push(item, priority) {
        this.elements.push({ item, priority });
        this.elements.sort((a, b) => a.priority - b.priority);
    }

    pop() {
        return this.elements.shift().item;
    }
}

window.PathFinder = PathFinder;
window.PriorityQueue = PriorityQueue;
