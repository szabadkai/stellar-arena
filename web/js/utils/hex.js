// Hex grid utilities using axial coordinates
// References: https://www.redblobgames.com/grids/hexagons/

class HexCoord {
    constructor(q, r) {
        this.q = q; // column
        this.r = r; // row
    }

    // Convert to cube coordinates for distance calculations
    toCube() {
        return {
            x: this.q,
            y: -this.q - this.r,
            z: this.r
        };
    }

    // Distance between two hex coordinates
    distance(other) {
        const a = this.toCube();
        const b = other.toCube();
        return (Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.z - b.z)) / 2;
    }

    // Get neighboring hex coordinates
    neighbors() {
        const directions = [
            [+1, 0], [+1, -1], [0, -1],
            [-1, 0], [-1, +1], [0, +1]
        ];
        return directions.map(([dq, dr]) => new HexCoord(this.q + dq, this.r + dr));
    }

    // Equality check
    equals(other) {
        return this.q === other.q && this.r === other.r;
    }

    // Convert to string key for maps/sets
    toString() {
        return `${this.q},${this.r}`;
    }

    // Create from string key
    static fromString(str) {
        const [q, r] = str.split(',').map(Number);
        return new HexCoord(q, r);
    }

    // Get line of hexes between two points (for line of sight)
    lineTo(target) {
        const N = this.distance(target);
        const results = [];

        for (let i = 0; i <= N; i++) {
            const t = N === 0 ? 0 : i / N;
            const q = this.q * (1 - t) + target.q * t;
            const r = this.r * (1 - t) + target.r * t;
            results.push(this.round(q, r));
        }

        return results;
    }

    // Round fractional hex coordinates to nearest hex
    round(q, r) {
        let x = q;
        let z = r;
        let y = -x - z;

        let rx = Math.round(x);
        let ry = Math.round(y);
        let rz = Math.round(z);

        const x_diff = Math.abs(rx - x);
        const y_diff = Math.abs(ry - y);
        const z_diff = Math.abs(rz - z);

        if (x_diff > y_diff && x_diff > z_diff) {
            rx = -ry - rz;
        } else if (y_diff > z_diff) {
            ry = -rx - rz;
        } else {
            rz = -rx - ry;
        }

        return new HexCoord(rx, rz);
    }
}

class HexLayout {
    constructor(size, origin) {
        this.size = size; // radius of hexagon
        this.origin = origin; // center of (0,0) hex in pixel coordinates

        // Flat-top hexagon orientation
        this.orientation = {
            f0: 3.0 / 2.0, f1: 0.0, f2: Math.sqrt(3.0) / 2.0, f3: Math.sqrt(3.0),
            b0: 2.0 / 3.0, b1: 0.0, b2: -1.0 / 3.0, b3: Math.sqrt(3.0) / 3.0,
            start_angle: 0.0
        };
    }

    // Convert hex coordinate to pixel coordinate
    hexToPixel(hex) {
        const M = this.orientation;
        const x = (M.f0 * hex.q + M.f1 * hex.r) * this.size;
        const y = (M.f2 * hex.q + M.f3 * hex.r) * this.size;
        return {
            x: x + this.origin.x,
            y: y + this.origin.y
        };
    }

    // Convert pixel coordinate to hex coordinate
    pixelToHex(point) {
        const M = this.orientation;
        const pt = {
            x: (point.x - this.origin.x) / this.size,
            y: (point.y - this.origin.y) / this.size
        };
        const q = M.b0 * pt.x + M.b1 * pt.y;
        const r = M.b2 * pt.x + M.b3 * pt.y;

        // Round to nearest hex
        const hex = new HexCoord(0, 0);
        return hex.round(q, r);
    }

    // Get corners of a hexagon for drawing
    hexCorners(hex) {
        const corners = [];
        const center = this.hexToPixel(hex);

        for (let i = 0; i < 6; i++) {
            const angle = 2.0 * Math.PI * (this.orientation.start_angle + i) / 6.0;
            corners.push({
                x: center.x + this.size * Math.cos(angle),
                y: center.y + this.size * Math.sin(angle)
            });
        }

        return corners;
    }
}

window.HexCoord = HexCoord;
window.HexLayout = HexLayout;
