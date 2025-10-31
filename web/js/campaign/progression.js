// Progression and unlock system

class ProgressionSystem {
    constructor() {
        this.loadProgress();
    }

    loadProgress() {
        const saved = localStorage.getItem('stellar_arena_progress');

        if (saved) {
            const data = JSON.parse(saved);
            this.credits = data.credits || 0;
            this.ownedShips = data.ownedShips || [];  // Array of ship instances
            this.unlockedShips = data.unlockedShips || ['interceptor', 'corvette', 'destroyer'];
            this.unlockedWeapons = data.unlockedWeapons || [];
            this.campaignsCompleted = data.campaignsCompleted || 0;
            this.totalVictories = data.totalVictories || 0;
        } else {
            // Default starting progress
            this.credits = 500;
            this.ownedShips = [];
            this.unlockedShips = ['interceptor', 'corvette', 'destroyer'];
            this.unlockedWeapons = [];
            this.campaignsCompleted = 0;
            this.totalVictories = 0;
        }
    }

    saveProgress() {
        const data = {
            credits: this.credits,
            ownedShips: this.ownedShips,
            unlockedShips: this.unlockedShips,
            unlockedWeapons: this.unlockedWeapons,
            campaignsCompleted: this.campaignsCompleted,
            totalVictories: this.totalVictories
        };

        localStorage.setItem('stellar_arena_progress', JSON.stringify(data));
    }

    buyShip(shipClass) {
        const preset = SHIP_PRESETS[shipClass];
        if (!preset) return false;

        if (this.spendCredits(preset.creditCost)) {
            this.ownedShips.push({
                shipClass: shipClass,
                hull: preset.maxHull,
                maxHull: preset.maxHull,
                upgrades: []
            });
            this.saveProgress();
            return true;
        }
        return false;
    }

    repairShip(shipIndex, amount) {
        const ship = this.ownedShips[shipIndex];
        if (!ship) return false;

        const repairCost = Math.ceil(amount * 0.5); // 0.5 credits per HP
        if (this.spendCredits(repairCost)) {
            ship.hull = Math.min(ship.hull + amount, ship.maxHull);
            this.saveProgress();
            return true;
        }
        return false;
    }

    addCredits(amount) {
        this.credits += amount;
        this.saveProgress();
    }

    spendCredits(amount) {
        if (this.credits >= amount) {
            this.credits -= amount;
            this.saveProgress();
            return true;
        }
        return false;
    }

    unlockShip(shipClass) {
        if (!this.unlockedShips.includes(shipClass)) {
            this.unlockedShips.push(shipClass);
            this.saveProgress();
            return true;
        }
        return false;
    }

    isShipUnlocked(shipClass) {
        return this.unlockedShips.includes(shipClass);
    }

    completeCampaign() {
        this.campaignsCompleted++;
        this.saveProgress();
    }

    addVictory() {
        this.totalVictories++;
        this.saveProgress();
    }

    reset() {
        localStorage.removeItem('stellar_arena_progress');
        this.loadProgress();
    }
}

// Make available globally for compatibility
window.ProgressionSystem = ProgressionSystem;
