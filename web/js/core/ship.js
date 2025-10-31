// Ship class with energy management, AP, and combat systems

class Ship {
    constructor(config) {
        this.id = config.id || Math.random().toString(36);
        this.name = config.name || 'Unknown Ship';
        this.position = config.position; // HexCoord
        this.team = config.team || 'player'; // 'player' or 'enemy'

        // Ship class stats
        this.shipClass = config.shipClass || 'corvette';

        // Combat stats (scaled to 50% for testing balance)
        const HEALTH_SCALE = 0.5;
        const rawMaxHull = config.maxHull ?? 100;
        const rawHull = config.hull ?? rawMaxHull;
        const rawArmor = config.armor ?? 10;

        this.maxHull = Math.max(1, Math.floor(rawMaxHull * HEALTH_SCALE));
        this.hull = Math.max(1, Math.min(this.maxHull, Math.floor(rawHull * HEALTH_SCALE)));
        const rawMaxShield = config.maxShield ?? 50;
        const rawShield = config.shield ?? rawMaxShield;
        this.maxShield = Math.max(0, Math.floor(rawMaxShield * HEALTH_SCALE));
        this.shield = Math.max(0, Math.min(this.maxShield, Math.floor(rawShield * HEALTH_SCALE)));
        this.armor = Math.max(0, Math.floor(rawArmor * HEALTH_SCALE));

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

        // Lightweight status tracking for abilities
        const incomingStatus = config.statusEffects || {};
        this.statusEffects = {
            evasiveCharges: incomingStatus.evasiveCharges || 0,
            overchargeShots: incomingStatus.overchargeShots || 0
        };

        // Tactical abilities (resolved from library)
        const abilityConfigs = config.abilities || [];
        this.abilities = abilityConfigs
            .map(entry => instantiateAbility(entry))
            .filter(Boolean);

        this.aiProfile = config.aiProfile || 'standard';
    }

    // Start of turn: regenerate energy and AP
    startTurn() {
        this.isActive = true;
        this.actionPoints = this.maxActionPoints;
        this._aiProcessed = false; // reset AI guard each turn
        this._autoSelected = false; // allow player auto-select each turn
        this._aiProcessedAt = null;
        this._turnStartTimestamp = (typeof performance !== 'undefined' ? performance.now() : Date.now());

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

        // Update ability cooldowns
        this.abilities.forEach(ability => {
            if (ability.cooldownRemaining > 0) {
                ability.cooldownRemaining--;
            }
        });

        // Fade temporary effects
        this.tickStatusEffects();
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

    canUseAbility(ability) {
        if (!ability) return false;
        if (!this.isActive) return false;
        if (this.energy < ability.energyCost) return false;
        if (this.actionPoints < ability.apCost) return false;
        if (ability.cooldownRemaining > 0) return false;
        if (this.isDestroyed) return false;
        return true;
    }

    useAbility(index, context = {}) {
        if (index < 0 || index >= this.abilities.length) {
            return false;
        }

        const ability = this.abilities[index];
        if (!this.canUseAbility(ability)) {
            return false;
        }

        this.energy -= ability.energyCost;
        this.actionPoints -= ability.apCost;
        ability.cooldownRemaining = ability.cooldown;

        if (typeof ability.activate === 'function') {
            ability.activate({
                ship: this,
                game: context.game || null,
                renderer: context.renderer || null
            });
        }

        return true;
    }

    tickStatusEffects() {
        if (this.statusEffects.overchargeShots > 0) {
            this.statusEffects.overchargeShots = Math.max(0, this.statusEffects.overchargeShots - 1);
        }
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
        let damage = weapon.damage * weaponPercent;

        if (this.statusEffects.overchargeShots > 0) {
            damage *= 1.25;
            this.statusEffects.overchargeShots = Math.max(0, this.statusEffects.overchargeShots - 1);
        }

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
        let incomingDamage = damageData.damage;

        if (this.statusEffects.evasiveCharges > 0) {
            incomingDamage *= 0.7;
            this.statusEffects.evasiveCharges = Math.max(0, this.statusEffects.evasiveCharges - 1);
        }

        let shieldDamage = 0;
        let hullDamage = 0;

        if (this.shield > 0 && incomingDamage > 0) {
            shieldDamage = Math.min(this.shield, incomingDamage);
            this.shield -= shieldDamage;
            incomingDamage -= shieldDamage;
        }

        if (incomingDamage > 0) {
            const armorReduction = this.armor * 0.5;
            const applied = Math.max(1, incomingDamage - armorReduction);
            const hullBefore = this.hull;
            this.hull -= applied;
            hullDamage = Math.min(applied, hullBefore);
        }

        // Check if destroyed
        if (this.hull <= 0) {
            this.hull = 0;
            this.isDestroyed = true;
        }

        return {
            shieldDamage,
            hullDamage,
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
            upgrades: this.upgrades || [],
            abilities: this.abilities.map(ability => ({
                key: ability.key,
                cooldownRemaining: ability.cooldownRemaining
            })),
            statusEffects: this.statusEffects,
            aiProfile: this.aiProfile
        };
    }

    static fromJSON(data) {
        data.position = new HexCoord(data.position.q, data.position.r);
        if (Array.isArray(data.abilities)) {
            data.abilities = data.abilities.map(entry => ({
                key: entry.key,
                cooldownRemaining: entry.cooldownRemaining || 0
            }));
        }
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
            { name: 'Needle Beam', type: 'energy', damage: 18, energyCost: 20, apCost: 0, cooldown: 0, cooldownRemaining: 0, maxRange: 8, minRange: 0, damageType: 'energy' },
            { name: 'Flash Cannon', type: 'kinetic', damage: 28, energyCost: 30, apCost: 1, cooldown: 1, cooldownRemaining: 0, maxRange: 5, minRange: 0, damageType: 'kinetic' }
        ],
        abilities: ['evasiveManeuver', 'weaponOvercharge', 'burstEngines', 'empBurst']
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
        ],
        abilities: ['shieldSurge', 'weaponOvercharge']
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
        ],
        abilities: ['shieldSurge', 'evasiveManeuver']
    }
};

const ABILITY_LIBRARY = {
    shieldSurge: () => ({
        key: 'shieldSurge',
        name: 'Shield Surge',
        description: 'Spend 1 AP and 20 energy to restore 35% shields.',
        apCost: 1,
        energyCost: 20,
        cooldown: 3,
        cooldownRemaining: 0,
        icon: '🛡',
        activate({ ship, game }) {
            const amount = Math.floor(ship.maxShield * 0.35);
            ship.shield = Math.min(ship.maxShield, ship.shield + amount);
            if (game?.renderer) {
                game.renderer.addShieldPulse(ship.position);
                game.renderer.addDamageIndicator(ship.position, `+${amount} Shield`, '#66ddff');
            }
            if (game?.hud) {
                game.hud.showMessage(`${ship.name} boosts shields`, 'success', 2000);
            }
        }
    }),
    evasiveManeuver: () => ({
        key: 'evasiveManeuver',
        name: 'Evasive Maneuver',
        description: 'Spend 1 AP and 15 energy to gain 30% damage reduction on the next hit.',
        apCost: 1,
        energyCost: 15,
        cooldown: 2,
        cooldownRemaining: 0,
        icon: '🌀',
        activate({ ship, game }) {
            ship.statusEffects.evasiveCharges = Math.min(ship.statusEffects.evasiveCharges + 1, 2);
            ship.velocity.q *= 0.6;
            ship.velocity.r *= 0.6;
            if (game?.renderer) {
                game.renderer.addTrailEffect(ship.position, '#7ec7ff');
                game.renderer.addDamageIndicator(ship.position, 'Evasive', '#7ec7ff');
            }
            if (game?.hud) {
                game.hud.showMessage(`${ship.name} executes evasive maneuvers`, 'info', 2000);
            }
        }
    }),
    weaponOvercharge: () => ({
        key: 'weaponOvercharge',
        name: 'Weapon Overcharge',
        description: 'Spend 1 AP and 25 energy to empower the next attack (+25% damage).',
        apCost: 1,
        energyCost: 25,
        cooldown: 3,
        cooldownRemaining: 0,
        icon: '⚡',
        activate({ ship, game }) {
            ship.statusEffects.overchargeShots = Math.min(ship.statusEffects.overchargeShots + 1, 2);
            if (game?.renderer) {
                game.renderer.addChargeEffect(ship.position, '#ffaa00');
                game.renderer.addDamageIndicator(ship.position, 'Overcharge', '#ffaa00');
            }
            if (game?.hud) {
                game.hud.showMessage(`${ship.name} overcharges weapons`, 'success', 2000);
            }
        }
    }),
    burstEngines: () => ({
        key: 'burstEngines',
        name: 'Burst Engines',
        description: 'Spend 0 AP and 20 energy to dash 2 hexes ignoring path costs.',
        apCost: 0,
        energyCost: 20,
        cooldown: 3,
        cooldownRemaining: 0,
        icon: '💨',
        activate({ ship, game }) {
            const grid = game?.grid || window.app?.game?.grid;
            if (!grid) return;

            const directions = ship.position.neighbors();
            const available = directions
                .map(dir => ({ hex: dir, score: ship.team === 'player' ? dir.distance(findNearestEnemy(ship, grid)) : 0 }))
                .filter(({ hex }) => grid.isValidHex(hex) && !grid.isBlocked(hex));

            if (available.length === 0) {
                return;
            }

            let targetHex;
            if (ship.team === 'player') {
                available.sort((a, b) => b.score - a.score);
                targetHex = available[0].hex;
            } else {
                targetHex = available[Math.floor(Math.random() * available.length)].hex;
            }

            grid.removeShip(ship.position);
            const intermediate = new HexCoord(
                (ship.position.q + targetHex.q) / 2,
                (ship.position.r + targetHex.r) / 2
            );

            const path = [ship.position, intermediate, targetHex]
                .map(hex => new HexCoord(Math.round(hex.q), Math.round(hex.r)))
                .filter((hex, index, arr) => index === 0 || !hex.equals(arr[index - 1]));

            ship.position = path[path.length - 1];
            grid.placeShip(ship, ship.position);

            if (game?.renderer) {
                game.renderer.addTrailEffect(ship.position, '#66ddff');
            }

            if (game?.hud) {
                game.hud.showMessage(`${ship.name} dashes!`, 'info', 2000);
            }
        }
    }),
    empBurst: () => ({
        key: 'empBurst',
        name: 'EMP Burst',
        description: 'Once per battle: spend 2 AP and 50 energy to drain 50 energy from all enemies within 3 hexes.',
        apCost: 2,
        energyCost: 50,
        cooldown: 9999,
        cooldownRemaining: 0,
        icon: '💥',
        activate({ ship, game }) {
            if (ship._empUsed) {
                return;
            }
            ship._empUsed = true;

            const grid = game?.grid || window.app?.game?.grid;
            if (!grid) return;

            const radiusBonus = ship.empBurstRadiusBonus || 0;
            const drainBonus = ship.empBurstDrainBonus || 0;
            const radius = 3 + radiusBonus;
            const drainAmount = Math.max(10, 50 + drainBonus);

            const enemies = grid.getShipsByTeam(ship.team === 'player' ? 'enemy' : 'player');
            let affected = 0;
            enemies.forEach(enemy => {
                const distance = ship.position.distance(enemy.position);
                if (distance <= radius && !enemy.isDestroyed) {
                    enemy.energy = Math.max(0, enemy.energy - drainAmount);
                    affected++;
                    if (game?.renderer) {
                        game.renderer.addChargeEffect(enemy.position, '#55ffee');
                        game.renderer.addDamageIndicator(enemy.position, `-${drainAmount}E`, '#55ffee');
                    }
                }
            });

            this.cooldownRemaining = this.cooldown;

            if (game?.hud) {
                game.hud.showMessage(`${ship.name} unleashes an EMP blast!`, affected > 0 ? 'success' : 'warning', 2500);
            }
        }
    })
};

function instantiateAbility(entry) {
    if (!entry) return null;
    const key = typeof entry === 'string' ? entry : entry.key;
    const template = ABILITY_LIBRARY[key];
    if (!template) return null;

    const ability = template();
    if (typeof entry === 'object' && typeof entry.cooldownRemaining === 'number') {
        ability.cooldownRemaining = entry.cooldownRemaining;
    }
    return ability;
}

window.Ship = Ship;
window.SHIP_PRESETS = SHIP_PRESETS;
window.ABILITY_LIBRARY = ABILITY_LIBRARY;

function findNearestEnemy(ship, grid) {
    const opponents = grid.getShipsByTeam(ship.team === 'player' ? 'enemy' : 'player');
    opponents.sort((a, b) => ship.position.distance(a.position) - ship.position.distance(b.position));
    return opponents[0]?.position || ship.position;
}
