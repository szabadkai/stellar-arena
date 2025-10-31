// Turn manager with initiative-based combat

class TurnManager {
    constructor(grid, combatLog = null) {
        this.grid = grid;
        this.combatLog = combatLog;
        this.turnNumber = 1;
        this.initiativeQueue = [];
        this.currentShipIndex = 0;
        this.phase = 'initiative'; // 'initiative', 'action', 'end'
    }

    // Start a new round
    startRound() {
        this.phase = 'initiative';
        this.initiativeQueue = [];
        this.currentShipIndex = 0;

        // Log round start
        if (this.combatLog) {
            this.combatLog.logRoundStart(this.turnNumber);
        }

        // Roll initiative for all ships
        const ships = this.grid.getAllShips().filter(ship => !ship.isDestroyed);

        ships.forEach(ship => {
            ship.rollInitiative();
            this.initiativeQueue.push(ship);
        });

        // Sort by initiative (highest first)
        this.initiativeQueue.sort((a, b) => b.initiative - a.initiative);

        // Start first ship's turn
        this.nextTurn();
    }

    // Move to next ship's turn
    nextTurn() {
        console.log(`nextTurn() called. Current index: ${this.currentShipIndex}, Queue length: ${this.initiativeQueue.length}`);

        // End current ship's turn if any
        if (this.currentShipIndex < this.initiativeQueue.length) {
            const currentShip = this.initiativeQueue[this.currentShipIndex];
            if (currentShip) {
                console.log(`Ending turn for ${currentShip.name}`);
                currentShip.endTurn();
            }
        }

        this.currentShipIndex++;
        console.log(`Incremented index to: ${this.currentShipIndex}`);

        // Check if round is over
        if (this.currentShipIndex >= this.initiativeQueue.length) {
            console.log('Round is over, calling endRound()');
            this.endRound();
            return;
        }

        // Start next ship's turn
        const nextShip = this.getCurrentShip();
        console.log(`Next ship: ${nextShip ? nextShip.name : 'null'}, Team: ${nextShip ? nextShip.team : 'null'}`);

        if (nextShip) {
            // Log turn start
            if (this.combatLog) {
                this.combatLog.logTurnStart(nextShip.name, this.turnNumber);
            }

            nextShip.startTurn();
            this.phase = 'action';
            console.log(`Started turn for ${nextShip.name}, phase: ${this.phase}`);
        }
    }

    // End the round
    endRound() {
        this.phase = 'end';
        this.turnNumber++;

        // Check win conditions
        const playerShips = this.grid.getShipsByTeam('player');
        const enemyShips = this.grid.getShipsByTeam('enemy');

        if (playerShips.length === 0) {
            return { gameOver: true, winner: 'enemy' };
        }

        if (enemyShips.length === 0) {
            return { gameOver: true, winner: 'player' };
        }

        // Start next round
        setTimeout(() => {
            this.startRound();
        }, 500);

        return { gameOver: false };
    }

    // Get current active ship
    getCurrentShip() {
        if (this.currentShipIndex >= 0 && this.currentShipIndex < this.initiativeQueue.length) {
            return this.initiativeQueue[this.currentShipIndex];
        }
        return null;
    }

    // Get initiative queue for UI display
    getInitiativeQueue() {
        return this.initiativeQueue.map((ship, index) => ({
            ship,
            isActive: index === this.currentShipIndex
        }));
    }

    // Force end current ship's turn
    endCurrentTurn() {
        const currentShip = this.getCurrentShip();
        if (currentShip && currentShip.team === 'player') {
            this.nextTurn();
        }
    }

    // Check if it's the player's turn
    isPlayerTurn() {
        const currentShip = this.getCurrentShip();
        return currentShip && currentShip.team === 'player';
    }

    // Process enemy AI turn
    processEnemyTurn(renderer) {
        const currentShip = this.getCurrentShip();

        if (!currentShip || currentShip.team !== 'enemy') {
            console.warn('processEnemyTurn called but no valid enemy ship');
            return;
        }

        // Prevent re-entry
        if (this._processingAI) {
            console.warn('Already processing AI turn, skipping');
            return;
        }
        this._processingAI = true;

        console.log(`AI processing turn for ${currentShip.name}`);

        try {
            // Advanced AI: prioritize targets, use tactics
            const playerShips = this.grid.getShipsByTeam('player');

            if (playerShips.length === 0) {
                console.log('No player ships found, ending turn');
                this.nextTurn();
                return;
            }

            // Choose best target using priority system
            let bestTarget = this.chooseBestTarget(currentShip, playerShips);
            console.log(`Best target: ${bestTarget.name}`);

            // FIRST: Check if we can attack from current position
            const weapon = currentShip.weapons[0];
            let canAttackFromHere = false;

            if (weapon) {
                const distance = currentShip.position.distance(bestTarget.position);
                canAttackFromHere = distance >= weapon.minRange && distance <= weapon.maxRange;
            }

            // Only move if we can't attack OR if we have lots of AP to spare
            const shouldConsiderMoving = !canAttackFromHere || currentShip.actionPoints >= 4;

            if (weapon && shouldConsiderMoving && currentShip.actionPoints > 1) {
                const distance = currentShip.position.distance(bestTarget.position);
                const optimalRange = weapon.minRange + Math.floor((weapon.maxRange - weapon.minRange) / 2);

                // Move if: out of range, too close
                const mustMove = distance > weapon.maxRange || distance < weapon.minRange;
                const couldImprove = Math.abs(distance - optimalRange) > 2 && currentShip.actionPoints >= 4;

                if (mustMove || couldImprove) {
                    const reachable = this.grid.getReachableHexes(currentShip);

                    if (reachable.length > 0) {
                        // Find best tactical position
                        let bestHex = null;
                        let bestScore = -Infinity;

                        reachable.forEach(({ hex, cost }) => {
                            const dist = hex.distance(bestTarget.position);
                            let score = 0;

                            // Prefer optimal range
                            if (dist >= weapon.minRange && dist <= weapon.maxRange) {
                                score += 100;
                                // Bonus for being at optimal range
                                score -= Math.abs(dist - optimalRange) * 10;
                            } else if (dist < weapon.maxRange + 2) {
                                // Acceptable if close to range
                                score += 50 - (dist - weapon.maxRange) * 20;
                            } else {
                                // Penalize being too far
                                score -= dist * 5;
                            }

                            // Prefer getting closer if out of range
                            if (distance > weapon.maxRange) {
                                score += (distance - dist) * 15;
                            }

                            // Prefer moves that leave AP for attacking
                            const apRemaining = currentShip.actionPoints - cost;
                            if (apRemaining < weapon.apCost) {
                                score -= 50; // Heavy penalty if we can't attack after
                            }

                            if (score > bestScore) {
                                bestScore = score;
                                bestHex = hex;
                            }
                        });

                        if (bestHex && !bestHex.equals(currentShip.position)) {
                            const path = this.grid.findPath(currentShip.position, bestHex, currentShip);
                            if (path && path.length > 0) {
                                console.log(`Moving to better position (${bestHex.q}, ${bestHex.r})`);
                                currentShip.move(path, this.grid);
                            }
                        }
                    }
                }
            }

            // SECOND: Attack with all available weapons (with safety limit)
            let attacksMade = 0;
            const maxAttacks = 10; // Safety limit to prevent infinite loops

            while (currentShip.actionPoints > 0 && currentShip.energy > 0 && attacksMade < maxAttacks) {
                const bestWeapon = this.chooseBestWeapon(currentShip, bestTarget);

                if (bestWeapon === null) {
                    console.log('No weapons can fire');
                    break;
                }

                const weapon = currentShip.weapons[bestWeapon];
                console.log(`Attacking with ${weapon.name} (AP: ${currentShip.actionPoints}, Energy: ${currentShip.energy})`);

                const attackData = currentShip.fireWeapon(bestWeapon, bestTarget);

                if (attackData) {
                    // Calculate damage
                    const damageResult = WeaponSystem.calculateDamage(attackData);
                    console.log(`Dealt ${damageResult.hullDamage + damageResult.shieldDamage} damage`);

                    // Create visual effect
                    const startPixel = renderer.layout.hexToPixel(currentShip.position);
                    const endPixel = renderer.layout.hexToPixel(bestTarget.position);

                    if (weapon.type === 'energy') {
                        renderer.addBeam(startPixel, endPixel, weapon);
                    } else {
                        renderer.addProjectile(startPixel, endPixel, weapon);
                    }

                    attacksMade++;

                    // Check if target destroyed
                    if (bestTarget.isDestroyed) {
                        console.log(`Target ${bestTarget.name} destroyed!`);
                        break;
                    }
                } else {
                    console.log('Attack failed');
                    break;
                }
            }

            console.log(`AI turn complete: ${attacksMade} attacks made`);
        } catch (error) {
            console.error('Error in enemy AI:', error);
        } finally {
            // ALWAYS end turn after a delay, even if something went wrong
            console.log('Scheduling turn end');
            setTimeout(() => {
                console.log('Ending enemy turn');
                this._processingAI = false;
                this.nextTurn();
            }, 1000);
        }
    }

    // Choose best target using priority system
    chooseBestTarget(currentShip, playerShips) {
        let bestTarget = null;
        let bestScore = -Infinity;

        playerShips.forEach(target => {
            let score = 0;

            // Prioritize low-health targets (finish them off)
            const hullPercent = target.hull / target.maxHull;
            if (hullPercent < 0.3) {
                score += 100; // Very low health - finish kill
            } else if (hullPercent < 0.5) {
                score += 50; // Moderately damaged
            }

            // Prioritize high-damage threats
            const totalWeaponDamage = target.weapons.reduce((sum, w) => sum + (w.damage || 0), 0);
            score += totalWeaponDamage * 0.5;

            // Consider distance (prefer closer targets, but not too heavily)
            const distance = currentShip.position.distance(target.position);
            score -= distance * 2;

            // Bonus for targets without shields
            if (target.shield === 0) {
                score += 30;
            }

            if (score > bestScore) {
                bestScore = score;
                bestTarget = target;
            }
        });

        return bestTarget || playerShips[0]; // Fallback to first ship
    }

    // Choose best weapon for target
    chooseBestWeapon(currentShip, target) {
        let bestWeaponIndex = null;
        let bestScore = -Infinity;

        currentShip.weapons.forEach((weapon, index) => {
            // Check range first
            const distance = currentShip.position.distance(target.position);
            if (distance > weapon.maxRange || distance < weapon.minRange) {
                console.log(`${weapon.name} out of range: ${distance} (needs ${weapon.minRange}-${weapon.maxRange})`);
                return; // Out of range
            }

            // Check if weapon can fire
            if (!currentShip.canFireWeapon(weapon, target)) {
                console.log(`${weapon.name} cannot fire: AP=${currentShip.actionPoints}/${weapon.apCost}, Energy=${currentShip.energy}/${weapon.energyCost}, CD=${weapon.cooldownRemaining}`);
                return; // Skip this weapon
            }

            let score = 0;

            // Base score on damage potential
            score += weapon.damage || 0;

            // Energy weapons are better vs shields
            if (weapon.type === 'energy' && target.shield > 0) {
                score += 20;
            }

            // Kinetic weapons are better vs hull
            if (weapon.type === 'kinetic' && target.shield === 0) {
                score += 20;
            }

            // Prefer weapons with lower energy cost (efficiency)
            score -= weapon.energyCost * 0.5;

            // Prefer weapons with no cooldown
            if (weapon.cooldownRemaining === 0) {
                score += 10;
            }

            if (score > bestScore) {
                bestScore = score;
                bestWeaponIndex = index;
            }
        });

        return bestWeaponIndex; // Returns null if no weapons available
    }

    // Reset for new game
    reset() {
        this.turnNumber = 1;
        this.initiativeQueue = [];
        this.currentShipIndex = 0;
        this.phase = 'initiative';
    }
}

window.TurnManager = TurnManager;
