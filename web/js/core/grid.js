// Grid manager for hex-based arena

class Grid {
    constructor(width, height) {
        this.width = width;
        this.height = height;

        // Store ships by position
        this.ships = new Map(); // key: "q,r", value: Ship

        // Store obstacles/hazards
        this.obstacles = new Set(); // hex coordinate strings

        // Pathfinder
        this.pathfinder = new PathFinder(this);
    }

    // Place ship on grid
    placeShip(ship, position) {
        const key = position.toString();
        this.ships.set(key, ship);
        ship.position = position;
    }

    // Remove ship from grid
    removeShip(position) {
        const key = position.toString();
        this.ships.delete(key);
    }

    // Get ship at position
    getShipAt(position) {
        const key = position.toString();
        return this.ships.get(key) || null;
    }

    // Check if hex is occupied by a ship
    isOccupied(position) {
        return this.ships.has(position.toString());
    }

    // Check if hex is blocked (obstacle or ship)
    isBlocked(position) {
        return this.isOccupied(position) || this.obstacles.has(position.toString());
    }

    // Check if hex is within grid bounds
    isValidHex(position) {
        // For flat-top hexagons, we use offset coordinates for bounds
        // This is approximate - adjust based on your grid shape
        const maxQ = Math.floor(this.width / 2);
        const maxR = Math.floor(this.height / 2);

        return (
            position.q >= -maxQ &&
            position.q <= maxQ &&
            position.r >= -maxR &&
            position.r <= maxR
        );
    }

    // Get all ships
    getAllShips() {
        return Array.from(this.ships.values());
    }

    // Get ships by team
    getShipsByTeam(team) {
        return this.getAllShips().filter(ship => ship.team === team && !ship.isDestroyed);
    }

    // Find path from start to goal
    findPath(start, goal, ship) {
        return this.pathfinder.findPath(start, goal, ship, ship.actionPoints);
    }

    // Get all reachable hexes for a ship
    getReachableHexes(ship) {
        return this.pathfinder.getReachableHexes(ship.position, ship);
    }

    // Add obstacle
    addObstacle(position) {
        this.obstacles.add(position.toString());
    }

    // Clear grid
    clear() {
        this.ships.clear();
        this.obstacles.clear();
    }

    // Generate random obstacles (asteroids, debris)
    generateObstacles(count) {
        const maxQ = Math.floor(this.width / 2);
        const maxR = Math.floor(this.height / 2);

        for (let i = 0; i < count; i++) {
            const q = Math.floor(Math.random() * this.width) - maxQ;
            const r = Math.floor(Math.random() * this.height) - maxR;
            const pos = new HexCoord(q, r);

            // Don't place obstacles where ships are
            if (!this.isOccupied(pos) && this.isValidHex(pos)) {
                this.addObstacle(pos);
            }
        }
    }
}

window.Grid = Grid;
