// Campaign manager handles campaign state and flow

class CampaignManager {
    constructor(progression) {
        this.progression = progression;
        this.reset();
    }

    reset() {
        this.isActive = false;
        this.battleNumber = 0;
        this.maxBattles = 5;
        this.selectedFleet = [];
        this.rewards = {
            credits: 0,
            scrap: 0
        };
    }

    startNewCampaign() {
        this.reset();
        this.isActive = true;
        this.battleNumber = 1;
    }

    loadCampaign() {
        const saved = localStorage.getItem('stellar_arena_campaign');

        if (saved) {
            const data = JSON.parse(saved);
            this.isActive = data.isActive;
            this.battleNumber = data.battleNumber;
            this.maxBattles = data.maxBattles;
            this.selectedFleet = data.selectedFleet.map(shipData => Ship.fromJSON(shipData));
            this.rewards = data.rewards;
            return true;
        }

        return false;
    }

    saveCampaign() {
        if (!this.isActive) {
            localStorage.removeItem('stellar_arena_campaign');
            return;
        }

        const data = {
            isActive: this.isActive,
            battleNumber: this.battleNumber,
            maxBattles: this.maxBattles,
            selectedFleet: this.selectedFleet.map(ship => ship.toJSON()),
            rewards: this.rewards
        };

        localStorage.setItem('stellar_arena_campaign', JSON.stringify(data));
    }

    setFleet(ships) {
        this.selectedFleet = ships;
        this.saveCampaign();
    }

    getFleet() {
        return this.selectedFleet;
    }


    nextBattle() {
        this.battleNumber++;

        if (this.battleNumber > this.maxBattles) {
            // Campaign complete!
            this.completeCampaign();
            return false;
        }

        this.saveCampaign();
        return true;
    }

    battleVictory(playerShips, enemyShips) {
        // Update fleet with post-battle state
        this.selectedFleet = playerShips;

        // Sync ship damage and upgrades back to owned ships in progression
        playerShips.forEach(ship => {
            const ownedIndex = this.progression.ownedShips.findIndex(
                owned => owned.shipClass === ship.shipClass
            );
            if (ownedIndex !== -1) {
                this.progression.ownedShips[ownedIndex].hull = ship.hull;
                this.progression.ownedShips[ownedIndex].maxHull = ship.maxHull;
                this.progression.ownedShips[ownedIndex].upgrades = ship.upgrades || [];
            }
        });
        this.progression.saveProgress();

        // Calculate rewards based on battle number
        const baseReward = 100 * this.battleNumber;
        const perfectionBonus = playerShips.every(s => s.hull === s.maxHull) ? 100 : 0;

        this.rewards.credits = baseReward + perfectionBonus;
        this.rewards.scrap = 50 * this.battleNumber;

        // Add credits to player
        this.progression.addCredits(this.rewards.credits);
        this.progression.addVictory();

        this.saveCampaign();

        return {
            credits: this.rewards.credits,
            scrap: this.rewards.scrap,
            fleetStatus: this.getFleetStatus()
        };
    }

    battleDefeat() {
        // Campaign failed
        this.isActive = false;
        this.saveCampaign();
    }

    completeCampaign() {
        // Campaign victory!
        this.progression.completeCampaign();

        // Bonus credits for completing campaign
        this.progression.addCredits(500);

        this.isActive = false;
        this.saveCampaign();

        return {
            campaignComplete: true,
            bonusCredits: 500
        };
    }

    getFleetStatus() {
        return this.selectedFleet.map(ship => ({
            name: ship.name,
            hull: ship.hull,
            maxHull: ship.maxHull,
            isDestroyed: ship.isDestroyed,
            hullPercent: Math.floor((ship.hull / ship.maxHull) * 100)
        }));
    }

    abandonCampaign() {
        this.isActive = false;
        this.saveCampaign();
    }

    // Generate enemy fleet based on battle number
    generateEnemyFleet(battleNumber) {
        const enemyShips = [];
        const difficulty = battleNumber;

        // More gradual ship count scaling: battle 1-2: 2 ships, 3-4: 3 ships, 5: 3 ships
        const shipCount = Math.min(2 + Math.floor((difficulty - 1) / 2), 3);

        for (let i = 0; i < shipCount; i++) {
            // Gradually introduce tougher ships
            let shipType;
            if (difficulty === 1) {
                // Battle 1: Easy start - interceptors only
                shipType = 'interceptor';
            } else if (difficulty === 2) {
                // Battle 2: Introduce corvettes
                shipType = Math.random() > 0.5 ? 'interceptor' : 'corvette';
            } else if (difficulty === 3) {
                // Battle 3: Mixed fleet, introduce destroyers
                const roll = Math.random();
                if (roll > 0.7) shipType = 'destroyer';
                else if (roll > 0.4) shipType = 'corvette';
                else shipType = 'interceptor';
            } else if (difficulty === 4) {
                // Battle 4: Tough fleet
                shipType = Math.random() > 0.3 ? 'destroyer' : 'corvette';
            } else {
                // Battle 5: Final boss - all destroyers
                shipType = 'destroyer';
            }

            const preset = SHIP_PRESETS[shipType];

            const ship = new Ship({
                ...preset,
                id: `enemy${i + 1}`,
                name: `${shipType.charAt(0).toUpperCase() + shipType.slice(1)} ${String.fromCharCode(65 + i)}`,
                position: new HexCoord(5 + i * 2, -2 + i),
                team: 'enemy'
            });

            // More moderate stat scaling: +10% per battle instead of +15%
            const statMultiplier = 1 + (difficulty - 1) * 0.1;
            ship.maxHull = Math.floor(ship.maxHull * statMultiplier);
            ship.hull = ship.maxHull;
            ship.maxShield = Math.floor(ship.maxShield * statMultiplier);
            ship.shield = ship.maxShield;

            // Slightly boost damage on higher difficulties
            if (difficulty >= 3) {
                ship.weapons.forEach(weapon => {
                    weapon.damage = Math.floor(weapon.damage * (1 + (difficulty - 3) * 0.08));
                });
            }

            enemyShips.push(ship);
        }

        return enemyShips;
    }
}

window.CampaignManager = CampaignManager;
