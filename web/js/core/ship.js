// Ship class with energy management, AP, and combat systems

class Ship {
    constructor(config) {
        this.id = config.id || Math.random().toString(36);
        this.name = config.name || 'Unknown Ship';
        this.position = config.position; // HexCoord
        this.team = config.team || 'player'; // 'player' or 'enemy'

        // Ship class stats
        this.shipClass = config.shipClass || 'corvette';

        // Combat stats
        this.maxHull = config.maxHull || 100;
        this.hull = config.hull || this.maxHull;
        this.maxShield = config.maxShield || 50;
        this.shield = config.shield || this.maxShield;
        this.armor = config.armor || 10;

        // Energy system
        this.maxEnergy = config.maxEnergy || 100;
        this.energy = this.maxEnergy;
        this.reactorOutput = config.reactorOutput || 50; // Energy per turn

        // Energy allocation (discrete points out of 10)
        this.maxAllocationPoints = 10;
        this.energyAllocation = config.energyAllocation || {
            weapons: 3,
            shields: 3,
            engines: 4
        };

        // Action points
        this.maxActionPoints = config.maxActionPoints || 3;
        this.actionPoints = this.maxActionPoints;

        // Movement and drift
        this.velocity = { q: 0, r: 0 }; // Velocity vector in hex space
        this.maxSpeed = config.maxSpeed || 3;

        // Sensors and initiative
        this.sensors = config.sensors || 50;
        this.initiative = 0;

        // Weapons
        this.weapons = config.weapons || [];

        // Status
        this.isDestroyed = false;
        this.isActive = false; // Is it this ship's turn?

        // Animation state
        this.animationPosition = null; // Current animated position (for smooth movement)
        this.animationProgress = 1.0; // 0.0 to 1.0, 1.0 = animation complete
        this.animationStart = null;
        this.animationEnd = null;
        this.animationDuration = 0;
    }

    // Start of turn: regenerate energy and AP
    startTurn() {
        this.isActive = true;
        this.actionPoints = this.maxActionPoints;
        this._aiProcessed = false; // reset AI guard each turn
        this._autoSelected = false; // allow player auto-select each turn

        // Regenerate energy
        this.energy = Math.min(this.maxEnergy, this.energy + this.reactorOutput);

        // Regenerate shields based on energy allocation (convert points to percentage)
        const shieldPercent = this.energyAllocation.shields / this.maxAllocationPoints;
        const shieldRegen = shieldPercent * this.reactorOutput * 0.5;
        this.shield = Math.min(this.maxShield, this.shield + shieldRegen);

        // Update weapon cooldowns
        this.weapons.forEach(weapon => {
            if (weapon.cooldownRemaining > 0) {
                weapon.cooldownRemaining--;
            }
        });
    }

    endTurn() {
        this.isActive = false;

        // Apply drift/velocity
        if (this.velocity.q !== 0 || this.velocity.r !== 0) {
            this.applyDrift();
        }
    }

    // Allocate energy to systems (costs 1 AP to change)
    setEnergyAllocation(weapons, shields, engines, costAP = true) {
        // Ensure they sum to maxAllocationPoints
        const total = weapons + shields + engines;
        if (total !== this.maxAllocationPoints) {
            return false; // Invalid allocation
        }

        // Cost 1 AP to change allocation during battle
        if (costAP && this.isActive) {
            if (this.actionPoints < 1) {
                return false; // Not enough AP
            }
            this.actionPoints -= 1;
        }

        this.energyAllocation = { weapons, shields, engines };
        return true;
    }

    // Move the ship
    move(path, grid) {
        if (!path || path.length === 0) return false;

        // Calculate AP cost
        const cost = path.length;

        if (cost > this.actionPoints) {
            return false;
        }

        // Start animation
        this.animationStart = this.position;
        this.animationEnd = path[path.length - 1];
        this.animationProgress = 0.0;
        this.animationDuration = 300 * path.length; // 300ms per hex
        this.animationPosition = this.position;

        // Remove ship from old position
        grid.removeShip(this.position);

        // Move to new position
        this.position = path[path.length - 1];
        grid.placeShip(this, this.position);

        // Spend AP
        this.actionPoints -= cost;

        // Update velocity based on movement direction and engine power
        if (path.length > 0) {
            const enginePercent = this.energyAllocation.engines / this.maxAllocationPoints;
            const start = path[0];
            const end = path[path.length - 1];

            const dq = (end.q - start.q) * enginePercent * 0.3;
            const dr = (end.r - start.r) * enginePercent * 0.3;

            this.velocity.q += dq;
            this.velocity.r += dr;

            // Clamp velocity
            const speed = Math.sqrt(this.velocity.q ** 2 + this.velocity.r ** 2);
            if (speed > this.maxSpeed) {
                this.velocity.q = (this.velocity.q / speed) * this.maxSpeed;
                this.velocity.r = (this.velocity.r / speed) * this.maxSpeed;
            }
        }

        return true;
    }

    // Update animation (call each frame)
    updateAnimation(deltaTime) {
        if (this.animationProgress >= 1.0) {
            return; // Animation complete
        }

        // Safety check for deltaTime
        if (!deltaTime || deltaTime <= 0 || deltaTime > 1) {
            deltaTime = 0.016; // Default to ~60fps
        }

        // Advance animation
        const increment = (deltaTime * 1000) / this.animationDuration;
        this.animationProgress = Math.min(1.0, this.animationProgress + increment);

        // Ease-in-out interpolation
        const t = this.animationProgress;
        const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

        // Update animated position
        if (this.animationStart && this.animationEnd) {
            this.animationPosition = {
                q: this.animationStart.q + (this.animationEnd.q - this.animationStart.q) * eased,
                r: this.animationStart.r + (this.animationEnd.r - this.animationStart.r) * eased
            };
        }
    }

    // Get the position to render (animated if moving)
    getRenderPosition() {
        if (this.animationProgress < 1.0 && this.animationPosition) {
            return this.animationPosition;
        }
        return this.position;
    }

    // Apply drift mechanics
    applyDrift() {
        // Round velocity to nearest hex
        const driftQ = Math.round(this.velocity.q);
        const driftR = Math.round(this.velocity.r);

        if (driftQ !== 0 || driftR !== 0) {
            const newPos = new HexCoord(
                this.position.q + driftQ,
                this.position.r + driftR
            );

            // Check if drift position is valid
            // (In full game, handle collisions here)
            this.position = newPos;
        }

        // Apply friction/decay
        this.velocity.q *= 0.9;
        this.velocity.r *= 0.9;

        // Stop if velocity too small
        if (Math.abs(this.velocity.q) < 0.1) this.velocity.q = 0;
        if (Math.abs(this.velocity.r) < 0.1) this.velocity.r = 0;
    }

    // Fire weapon at target
    fireWeapon(weaponIndex, target) {
        if (weaponIndex < 0 || weaponIndex >= this.weapons.length) {
            return null;
        }

        const weapon = this.weapons[weaponIndex];

        // Check if weapon can fire
        if (!this.canFireWeapon(weapon, target)) {
            return null;
        }

        // Calculate weapon effectiveness based on energy allocation
        const weaponPercent = this.energyAllocation.weapons / this.maxAllocationPoints;
        const damage = weapon.damage * weaponPercent;

        // Spend energy
        this.energy -= weapon.energyCost;

        // Spend AP
        this.actionPoints -= weapon.apCost;

        // Set cooldown
        weapon.cooldownRemaining = weapon.cooldown;

        // Return attack data for damage calculation
        return {
            weapon: weapon,
            damage: damage,
            attacker: this,
            target: target
        };
    }

    canFireWeapon(weapon, target) {
        // Check energy
        if (this.energy < weapon.energyCost) return false;

        // Check AP
        if (this.actionPoints < weapon.apCost) return false;

        // Check cooldown
        if (weapon.cooldownRemaining > 0) return false;

        // Check range
        const distance = this.position.distance(target.position);
        if (distance > weapon.maxRange || distance < weapon.minRange) return false;

        return true;
    }

    // Take damage
    takeDamage(damageData) {
        let damage = damageData.damage;
        const damageType = damageData.weapon.damageType;

        // Shields absorb damage first
        if (this.shield > 0) {
            const shieldDamage = Math.min(this.shield, damage);
            this.shield -= shieldDamage;
            damage -= shieldDamage;
        }

        // Armor reduces remaining damage
        if (damage > 0) {
            const armorReduction = this.armor * 0.5;
            damage = Math.max(1, damage - armorReduction);

            // Apply damage to hull
            this.hull -= damage;
        }

        // Check if destroyed
        if (this.hull <= 0) {
            this.hull = 0;
            this.isDestroyed = true;
        }

        return {
            shieldDamage: damageData.damage - damage,
            hullDamage: Math.min(damage, this.hull),
            destroyed: this.isDestroyed
        };
    }

    // Roll initiative for turn order
    rollInitiative() {
        this.initiative = this.sensors + Math.floor(Math.random() * 20);
        return this.initiative;
    }

    // Get ship color based on team
    getColor() {
        return this.team === 'player' ? '#4a9eff' : '#ff4444';
    }

    // Serialize for save/load
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            position: { q: this.position.q, r: this.position.r },
            team: this.team,
            shipClass: this.shipClass,
            hull: this.hull,
            maxHull: this.maxHull,
            shield: this.shield,
            maxShield: this.maxShield,
            armor: this.armor,
            energy: this.energy,
            maxEnergy: this.maxEnergy,
            reactorOutput: this.reactorOutput,
            energyAllocation: this.energyAllocation,
            actionPoints: this.actionPoints,
            maxActionPoints: this.maxActionPoints,
            velocity: this.velocity,
            maxSpeed: this.maxSpeed,
            sensors: this.sensors,
            weapons: this.weapons,
            upgrades: this.upgrades || []
        };
    }

    static fromJSON(data) {
        data.position = new HexCoord(data.position.q, data.position.r);
        return new Ship(data);
    }
}

// Ship presets for quick creation
const SHIP_PRESETS = {
    interceptor: {
        shipClass: 'interceptor',
        creditCost: 200,       // Affordable starter ship
        maxHull: 80,
        maxShield: 40,
        armor: 5,
        maxEnergy: 100,
        reactorOutput: 50,
        maxActionPoints: 4,    // High mobility advantage
        maxSpeed: 4,
        sensors: 60,
        weapons: [
            { name: 'Light Laser', type: 'energy', damage: 20, energyCost: 25, apCost: 1, cooldown: 0, cooldownRemaining: 0, maxRange: 6, minRange: 0, damageType: 'energy' }
        ]
    },
    corvette: {
        shipClass: 'corvette',
        creditCost: 400,       // Mid-tier investment
        maxHull: 140,
        maxShield: 65,
        armor: 12,
        maxEnergy: 120,
        reactorOutput: 60,
        maxActionPoints: 3,
        maxSpeed: 3,
        sensors: 50,
        weapons: [
            { name: 'Pulse Cannon', type: 'energy', damage: 30, energyCost: 35, apCost: 1, cooldown: 0, cooldownRemaining: 0, maxRange: 6, minRange: 0, damageType: 'energy' },
            { name: 'Missiles', type: 'missile', damage: 55, energyCost: 50, apCost: 1, cooldown: 2, cooldownRemaining: 0, maxRange: 9, minRange: 2, damageType: 'explosive' }
        ]
    },
    destroyer: {
        shipClass: 'destroyer',
        creditCost: 700,       // Premium powerhouse
        maxHull: 200,
        maxShield: 80,
        armor: 25,
        maxEnergy: 140,
        reactorOutput: 70,
        maxActionPoints: 2,    // Low mobility
        maxSpeed: 2,
        sensors: 40,
        weapons: [
            { name: 'Heavy Cannon', type: 'kinetic', damage: 65, energyCost: 60, apCost: 1, cooldown: 1, cooldownRemaining: 0, maxRange: 7, minRange: 0, damageType: 'kinetic' },
            { name: 'Point Defense', type: 'energy', damage: 15, energyCost: 20, apCost: 0, cooldown: 0, cooldownRemaining: 0, maxRange: 4, minRange: 0, damageType: 'energy' }
        ]
    }
};

window.Ship = Ship;
window.SHIP_PRESETS = SHIP_PRESETS;
