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
        this.pendingEvent = null;
    }

    startNewCampaign() {
        this.reset();
        this.isActive = true;
        this.battleNumber = 1;

        // Reset progression (clear credits and ships for fresh start)
        this.progression.reset();

        // Give starting credits (enough to buy 2-3 ships)
        this.progression.credits = 1000;
        this.progression.saveProgress();

        // Ensure basic hulls are always unlocked
        this.ensureBasicUnlocks();
    }

    seedStarterShips() {
        // Give player two starter ships: interceptor and corvette
        const starterShips = [
            {
                shipClass: 'interceptor',
                hull: SHIP_PRESETS.interceptor.maxHull,
                maxHull: SHIP_PRESETS.interceptor.maxHull,
                upgrades: [],
                _ownedIndex: 0
            },
            {
                shipClass: 'corvette',
                hull: SHIP_PRESETS.corvette.maxHull,
                maxHull: SHIP_PRESETS.corvette.maxHull,
                upgrades: [],
                _ownedIndex: 1
            }
        ];

        this.progression.ownedShips = starterShips;
        this.progression.saveProgress();
    }

    ensureBasicUnlocks() {
        // Ensure interceptor, corvette, and destroyer are always unlocked
        const basicHulls = ['interceptor', 'corvette', 'destroyer'];
        let changed = false;

        basicHulls.forEach(hull => {
            if (!this.progression.unlockedShips.includes(hull)) {
                this.progression.unlockedShips.push(hull);
                changed = true;
            }
        });

        if (changed) {
            this.progression.saveProgress();
        }
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
            this.pendingEvent = data.pendingEvent || null;
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
            rewards: this.rewards,
            pendingEvent: this.pendingEvent
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
        // Use _ownedIndex for reliable mapping when available
        playerShips.forEach(ship => {
            let ownedIndex = ship._ownedIndex;

            // Fallback if _ownedIndex not set
            if (typeof ownedIndex !== 'number' || ownedIndex < 0) {
                ownedIndex = this.progression.ownedShips.findIndex(
                    owned => owned.shipClass === ship.shipClass
                );
            }

            if (ownedIndex !== -1 && ownedIndex < this.progression.ownedShips.length) {
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

        // Roll for post-battle event (except after final victory which will trigger completion separately)
        if (this.battleNumber < this.maxBattles) {
            this.pendingEvent = this.generatePostBattleEvent(this.battleNumber);
        } else {
            this.pendingEvent = null;
        }

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
        this.pendingEvent = null;
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
        this.pendingEvent = null;
        this.saveCampaign();
    }

    generatePostBattleEvent(battleNumber) {
        const available = CAMPAIGN_EVENT_LIBRARY.filter(event => battleNumber >= event.minBattle);
        if (available.length === 0) {
            return null;
        }

        const triggerChance = 0.6 + battleNumber * 0.05;
        if (Math.random() > Math.min(triggerChance, 0.9)) {
            return null;
        }

        const totalWeight = available.reduce((sum, event) => sum + (event.weight || 1), 0);
        let roll = Math.random() * totalWeight;

        let chosen = available[0];
        for (const event of available) {
            roll -= (event.weight || 1);
            if (roll <= 0) {
                chosen = event;
                break;
            }
        }

        return this.instantiateEvent(chosen);
    }

    instantiateEvent(eventDef) {
        if (!eventDef) return null;
        return {
            id: eventDef.id,
            title: eventDef.title,
            description: eventDef.description,
            choices: eventDef.choices.map(choice => ({
                id: choice.id,
                label: choice.label,
                description: choice.description,
                resultText: choice.resultText,
                effects: choice.effects || {},
                costCredits: choice.costCredits || 0
            })),
            resolved: false
        };
    }

    resolvePendingEvent(choiceId) {
        if (!this.pendingEvent) {
            return { success: false, message: 'No event to resolve.' };
        }

        if (this.pendingEvent.resolved) {
            return { success: false, message: 'Event already resolved.' };
        }

        const choice = this.pendingEvent.choices.find(option => option.id === choiceId);
        if (!choice) {
            return { success: false, message: 'Invalid choice.' };
        }

        if (choice.costCredits > 0 && this.progression.credits < choice.costCredits) {
            return { success: false, message: 'Not enough credits for that option.' };
        }

        if (choice.costCredits > 0) {
            if (!this.progression.spendCredits(choice.costCredits)) {
                return { success: false, message: 'Unable to spend credits.' };
            }
        }

        this.applyEventEffects(choice.effects || {});

        this.pendingEvent.resolved = true;
        const resultMessage = choice.resultText || 'Outcome applied.';
        this.pendingEvent = null;
        this.saveCampaign();

        return { success: true, message: resultMessage };
    }

    applyEventEffects(effects) {
        if (!effects) return;

        if (typeof effects.credits === 'number' && effects.credits !== 0) {
            if (effects.credits > 0) {
                this.progression.addCredits(effects.credits);
            } else {
                this.progression.spendCredits(Math.abs(effects.credits));
            }
        }

        if (typeof effects.repairPercent === 'number' && this.selectedFleet.length > 0) {
            this.selectedFleet.forEach(ship => {
                const heal = Math.floor(ship.maxHull * effects.repairPercent);
                ship.hull = Math.min(ship.maxHull, ship.hull + heal);
            });
        }

        if (typeof effects.damagePercent === 'number' && this.selectedFleet.length > 0) {
            const viable = this.selectedFleet.filter(ship => ship.hull > 0);
            if (viable.length > 0) {
                const target = viable[Math.floor(Math.random() * viable.length)];
                const damage = Math.max(1, Math.floor(target.maxHull * effects.damagePercent));
                target.hull = Math.max(1, target.hull - damage);
            }
        }

        if (effects.unlockShip) {
            this.progression.unlockShip(effects.unlockShip);
        }

        if (effects.reactorBoostPercent && this.selectedFleet.length > 0) {
            this.selectedFleet.forEach(ship => {
                const boost = Math.round(ship.reactorOutput * effects.reactorBoostPercent);
                ship.reactorOutput += boost;
            });
        }

        // Sync modified fleet back to owned ships and save progress
        this.selectedFleet.forEach(ship => {
            const ownedIndex = this.progression.ownedShips.findIndex(owned => owned.shipClass === ship.shipClass);
            if (ownedIndex !== -1) {
                this.progression.ownedShips[ownedIndex].hull = ship.hull;
                this.progression.ownedShips[ownedIndex].maxHull = ship.maxHull;
                this.progression.ownedShips[ownedIndex].upgrades = ship.upgrades || [];
            }
        });
        this.progression.saveProgress();
    }

    // Generate enemy fleet based on battle number
    generateEnemyFleet(battleNumber) {
        const enemyShips = [];
        const difficulty = battleNumber;

        let shipCount;
        if (difficulty <= 1) {
            shipCount = 1;
        } else if (difficulty === 2) {
            shipCount = 2;
        } else {
            shipCount = Math.min(2 + Math.floor((difficulty - 2) / 2), 3);
        }

        for (let i = 0; i < shipCount; i++) {
            // Gradually introduce tougher ships with curated mixes
            let shipType;
            if (difficulty === 1) {
                shipType = 'interceptor';
            } else if (difficulty === 2) {
                shipType = 'interceptor';
            } else if (difficulty === 3) {
                shipType = i === 0 ? 'corvette' : 'destroyer';
            } else if (difficulty === 4) {
                shipType = ['interceptor', 'corvette', 'destroyer'][Math.min(i, 2)];
            } else {
                shipType = i === 0 ? 'corvette' : 'destroyer';
            }

            const preset = SHIP_PRESETS[shipType];

            const ship = new Ship({
                ...preset,
                id: `enemy${i + 1}`,
                name: `${shipType.charAt(0).toUpperCase() + shipType.slice(1)} ${String.fromCharCode(65 + i)}`,
                position: new HexCoord(3 + i * 2, -2 + i),
                team: 'enemy',
                aiProfile: this.determineAIProfile(difficulty, shipType, i)
            });

            // More moderate stat scaling: +5-10% per battle instead of +15%
            const statMultiplier = 1 + (difficulty - 1) * 0.06;
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

    determineAIProfile(battleNumber, shipType, index = 0) {
        if (battleNumber <= 1) {
            return shipType === 'interceptor' ? 'skirmisher' : 'cautious';
        }

        if (battleNumber === 2) {
            if (shipType === 'interceptor') return 'skirmisher';
            if (shipType === 'corvette') return 'cautious';
            return 'cautious';
        }

        if (battleNumber === 3) {
            if (shipType === 'interceptor') return 'flanker';
            if (shipType === 'corvette') return 'vanguard';
            return 'anchor';
        }

        if (battleNumber === 4) {
            return shipType === 'destroyer' ? 'aggressive' : 'vanguard';
        }

        // Final battle: mix of aggressive and opportunist behavior
        const profiles = shipType === 'destroyer'
            ? ['aggressive', 'anchor']
            : ['aggressive', 'vanguard', 'flanker'];
        return profiles[index % profiles.length];
    }
}

window.CampaignManager = CampaignManager;
const CAMPAIGN_EVENT_LIBRARY = [
    {
        id: 'derelict-freighter',
        title: 'Derelict Freighter',
        description: 'Sensors pick up a drifting commerce freighter. Its holds might still be full of alloy crates—or ambushes.',
        minBattle: 1,
        weight: 2,
        choices: [
            {
                id: 'salvage',
                label: 'Dispatch salvage crews (+180₡, risk hull damage)',
                description: 'Board the freighter and secure anything valuable. Time is hull.',
                resultText: 'Your crews haul back crates of alloys, but shrapnel tears into a hull plate.',
                effects: {
                    credits: 180,
                    damagePercent: 0.15
                }
            },
            {
                id: 'rescue',
                label: 'Search for survivors (+60₡, repair fleet)',
                description: 'Stabilise the freighter and escort any survivors. They might repay the kindness.',
                resultText: 'Grateful survivors patch hull breaches and transfer a small stipend.',
                effects: {
                    credits: 60,
                    repairPercent: 0.25
                }
            },
            {
                id: 'move_on',
                label: 'Stay on course (+40₡)',
                description: 'Sweep the wreck from a distance and keep momentum.',
                resultText: 'You scoop up loose cargo and keep the fleet moving.',
                effects: {
                    credits: 40
                }
            }
        ]
    },
    {
        id: 'distress-signal',
        title: 'Distress Signal',
        description: 'A frontier mining rig pleads for escort—their gravity drives are failing.',
        minBattle: 2,
        weight: 1.5,
        choices: [
            {
                id: 'assist',
                label: 'Divert escorts (-100₡, major repairs)',
                description: 'Commit resources to stabilise the rig. Expect gratitude.',
                resultText: 'The miners share refined plating, restoring much of your fleet.',
                costCredits: 100,
                effects: {
                    repairPercent: 0.35
                }
            },
            {
                id: 'negotiate',
                label: 'Provide remote guidance (+120₡)',
                description: 'Offer navigation advice—for a fee.',
                resultText: 'The rig limps away while transferring a consultancy payment.',
                effects: {
                    credits: 120
                }
            },
            {
                id: 'ignore',
                label: 'Maintain radio silence',
                description: 'Stay focused on the campaign objective.',
                resultText: 'You leave the miners to their fate. Morale dips, but momentum holds.',
                effects: {}
            }
        ]
    },
    {
        id: 'ancient-beacon',
        title: 'Ancient Beacon',
        description: 'An archeotech beacon flares nearby, saturated with dormant energy.',
        minBattle: 3,
        weight: 1,
        choices: [
            {
                id: 'tap',
                label: 'Tap the field (+reactor output, minor hull stress)',
                description: 'Channel the beacon\'s energy into your reactors.',
                resultText: 'Reactors surge with power, though one hull groans under the strain.',
                effects: {
                    reactorBoostPercent: 0.1,
                    damagePercent: 0.1
                }
            },
            {
                id: 'study',
                label: 'Study the relic (+140₡)',
                description: 'Sell telemetry data to researchers.',
                resultText: 'Archivists pay handsomely for the beacon\'s readings.',
                effects: {
                    credits: 140
                }
            },
            {
                id: 'dismantle',
                label: 'Dismantle and sell it (+220₡, hull wear)',
                description: 'Strip the beacon and trade the components.',
                resultText: 'The salvage sells well, but the disassembly rattles your plating.',
                effects: {
                    credits: 220,
                    damagePercent: 0.08
                }
            }
        ]
    }
];
