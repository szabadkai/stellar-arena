// Ship upgrade system for post-battle rewards

const UPGRADE_POOL = {
    // Weapons upgrades
    reinforcedBarrel: {
        name: 'Reinforced Barrel',
        description: '+10% weapon damage',
        icon: '🔫',
        type: 'weapon',
        apply: (ship) => {
            ship.weapons.forEach(w => w.damage = Math.floor(w.damage * 1.1));
        }
    },
    efficientCapacitors: {
        name: 'Efficient Capacitors',
        description: '-20% weapon energy cost',
        icon: '⚡',
        type: 'weapon',
        apply: (ship) => {
            ship.weapons.forEach(w => w.energyCost = Math.max(1, Math.floor(w.energyCost * 0.8)));
        }
    },
    rapidReloader: {
        name: 'Rapid Reloader',
        description: '-1 turn cooldown on all weapons',
        icon: '⏱️',
        type: 'weapon',
        apply: (ship) => {
            ship.weapons.forEach(w => w.cooldown = Math.max(0, w.cooldown - 1));
        }
    },
    extendedRange: {
        name: 'Extended Range',
        description: '+2 weapon range',
        icon: '📡',
        type: 'weapon',
        apply: (ship) => {
            ship.weapons.forEach(w => w.maxRange += 2);
        }
    },

    // Defense upgrades
    reinforcedHull: {
        name: 'Reinforced Hull',
        description: '+20% max hull',
        icon: '🛡️',
        type: 'defense',
        apply: (ship) => {
            const bonus = Math.floor(ship.maxHull * 0.2);
            ship.maxHull += bonus;
            ship.hull = Math.min(ship.hull + bonus, ship.maxHull);
        }
    },
    shieldBooster: {
        name: 'Shield Booster',
        description: '+30% max shields',
        icon: '💠',
        type: 'defense',
        apply: (ship) => {
            const bonus = Math.floor(ship.maxShield * 0.3);
            ship.maxShield += bonus;
            ship.shield = Math.min(ship.shield + bonus, ship.maxShield);
        }
    },
    reactiveArmor: {
        name: 'Reactive Armor',
        description: '+5 armor',
        icon: '🔰',
        type: 'defense',
        apply: (ship) => {
            ship.armor += 5;
        }
    },

    // Mobility upgrades
    thrusterUpgrade: {
        name: 'Thruster Upgrade',
        description: '+1 action point',
        icon: '🚀',
        type: 'mobility',
        apply: (ship) => {
            ship.maxActionPoints += 1;
            ship.actionPoints += 1;
        }
    },
    improvedReactor: {
        name: 'Improved Reactor',
        description: '+20 max energy & +10 reactor output',
        icon: '⚙️',
        type: 'mobility',
        apply: (ship) => {
            ship.maxEnergy += 20;
            ship.reactorOutput += 10;
            ship.energy = Math.min(ship.energy + 20, ship.maxEnergy);
        }
    },
    agileManeuvers: {
        name: 'Agile Maneuvers',
        description: '+1 speed',
        icon: '💨',
        type: 'mobility',
        apply: (ship) => {
            ship.maxSpeed += 1;
        }
    },

    // Utility upgrades
    advancedSensors: {
        name: 'Advanced Sensors',
        description: '+15 initiative roll',
        icon: '👁️',
        type: 'utility',
        apply: (ship) => {
            ship.sensors += 15;
        }
    },
    emergencyRepair: {
        name: 'Emergency Repair',
        description: 'Restore 30% hull',
        icon: '🔧',
        type: 'utility',
        apply: (ship) => {
            ship.hull = Math.min(ship.hull + Math.floor(ship.maxHull * 0.3), ship.maxHull);
        }
    }
};

class UpgradeManager {
    constructor() {
        this.availableUpgrades = Object.keys(UPGRADE_POOL);
    }

    // Get 3 random upgrades for a ship
    getUpgradeChoices(ship, count = 3) {
        const choices = [];
        const available = [...this.availableUpgrades];

        // Shuffle and pick random upgrades
        for (let i = 0; i < Math.min(count, available.length); i++) {
            const index = Math.floor(Math.random() * available.length);
            const upgradeKey = available.splice(index, 1)[0];
            choices.push({
                key: upgradeKey,
                ...UPGRADE_POOL[upgradeKey]
            });
        }

        return choices;
    }

    // Apply upgrade to ship
    applyUpgrade(ship, upgradeKey) {
        const upgrade = UPGRADE_POOL[upgradeKey];
        if (upgrade) {
            upgrade.apply(ship);

            // Track applied upgrades on ship
            if (!ship.upgrades) {
                ship.upgrades = [];
            }
            ship.upgrades.push(upgradeKey);

            return true;
        }
        return false;
    }

    // Get list of upgrades applied to a ship
    getShipUpgrades(ship) {
        if (!ship.upgrades) return [];
        return ship.upgrades.map(key => UPGRADE_POOL[key]).filter(u => u);
    }
}

window.UpgradeManager = UpgradeManager;
window.UPGRADE_POOL = UPGRADE_POOL;
