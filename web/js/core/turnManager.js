// Turn manager with initiative-based combat

class TurnManager {
    constructor(grid, combatLog = null) {
        this.grid = grid;
        this.combatLog = combatLog;
        this.turnNumber = 1;
        this.initiativeQueue = [];
        this.currentShipIndex = 0;
        this.phase = 'initiative'; // 'initiative', 'action', 'end'
        this.immediateMode = false;
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
        if (this.immediateMode) {
            this.startRound();
        } else {
            setTimeout(() => {
                this.startRound();
            }, 500);
        }

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
    processEnemyTurn(renderer, game = null) {
        const currentShip = this.getCurrentShip();

        if (!currentShip || currentShip.team !== 'enemy') {
            console.warn('processEnemyTurn called but no valid enemy ship');
            return;
        }
        const aiProfile = currentShip.aiProfile || 'standard';

        // Prevent re-entry
        if (this._processingAI) {
            console.warn('Already processing AI turn, skipping');
            return;
        }
        this._processingAI = true;

        console.log(`AI processing turn for ${currentShip.name}`);
        const gameInstance = game || (typeof window !== 'undefined' && window.app ? window.app.game : null);

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

            this._lastFocusTargetId = bestTarget.id;

            // Consider tactical abilities before movement
            const abilityIndex = this.chooseEnemyAbility(currentShip, bestTarget);
            if (abilityIndex !== null) {
                const ability = currentShip.abilities[abilityIndex];
                if (currentShip.useAbility(abilityIndex, { game: gameInstance, renderer })) {
                    console.log(`Enemy uses ability ${ability.name}`);
                    if (gameInstance) {
                        gameInstance.recordAbilityUse(currentShip);
                        gameInstance.hud?.showMessage(`${currentShip.name} activates ${ability.name}`, 'warning', 1500);
                        gameInstance.combatLog?.logEnemy(`${currentShip.name} activates ${ability.name}`);
                        gameInstance.hud?.update();
                    }
                }
            }

            let currentPlayerShips = this.grid.getShipsByTeam('player');
            if (currentPlayerShips.length === 0) {
                this._processingAI = false;
                this.nextTurn();
                return;
            }
            bestTarget = this.chooseBestTarget(currentShip, currentPlayerShips);
            if (!bestTarget) {
                this._processingAI = false;
                this.nextTurn();
                return;
            }
            this._lastFocusTargetId = bestTarget.id;

            // FIRST: Check if we can attack from current position
            const weapon = currentShip.weapons[0];
            let canAttackFromHere = false;

            if (weapon) {
                const distance = currentShip.position.distance(bestTarget.position);
                canAttackFromHere = distance >= weapon.minRange && distance <= weapon.maxRange;
            }

            // Only move if we can't attack OR if we have lots of AP to spare
            const healthRatio = currentShip.maxHull > 0 ? currentShip.hull / currentShip.maxHull : 1;
            const shieldRatio = currentShip.maxShield > 0 ? currentShip.shield / currentShip.maxShield : 0;
            const retreatHullThreshold = aiProfile === 'aggressive' ? 0.22 : aiProfile === 'anchor' ? 0.45 : aiProfile === 'cautious' ? 0.55 : 0.35;
            const retreatShieldThreshold = aiProfile === 'aggressive' ? 0.25 : 0.4;
            const retreatMode = healthRatio < retreatHullThreshold && shieldRatio < retreatShieldThreshold;

            const shouldConsiderMoving = retreatMode || !canAttackFromHere || currentShip.actionPoints >= 4;

            if (weapon && bestTarget && shouldConsiderMoving && currentShip.actionPoints > 1) {
                const distance = currentShip.position.distance(bestTarget.position);
                const optimalRange = weapon.minRange + Math.floor((weapon.maxRange - weapon.minRange) / 2);

                // Move if: out of range, too close
                const mustMove = retreatMode ? distance <= weapon.maxRange - 1 : (distance > weapon.maxRange || distance < weapon.minRange);
                const couldImprove = retreatMode
                    ? distance <= weapon.maxRange && currentShip.actionPoints >= 2
                    : Math.abs(distance - optimalRange) > 2 && currentShip.actionPoints >= 4;

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
                                score -= Math.abs(dist - optimalRange) * 12;
                            } else if (dist < weapon.maxRange + 2) {
                                // Acceptable if close to range
                                score += 45 - (dist - weapon.maxRange) * 18;
                            } else {
                                // Penalize being too far
                                score -= dist * 6;
                            }

                            // Prefer getting closer if out of range
                            if (!retreatMode && distance > weapon.maxRange) {
                                score += (distance - dist) * (aiProfile === 'aggressive' ? 22 : 15);
                            }

                            if (retreatMode) {
                                score += (dist - distance) * 20;
                                if (dist <= weapon.maxRange) {
                                    score -= (weapon.maxRange - dist) * 25;
                                }
                            }
                            if (aiProfile === 'flanker') {
                                score -= Math.abs(dist - optimalRange) * 5;
                                score -= this.computeClusterPenalty(hex, bestTarget.position);
                            }
                            if (aiProfile === 'anchor') {
                                score -= dist * 3;
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
                                let movePath = path.slice(0, currentShip.actionPoints);
                                if (movePath.length === 0 && path.length > 0) {
                                    movePath = [path[0]];
                                }
                                if (!currentShip.move(movePath, this.grid)) {
                                    console.log(` -> movement failed (needed ${movePath.length} AP, had ${currentShip.actionPoints})`);
                                } else {
                                    console.log(` -> new position: ${currentShip.position.toString()}`);
                                }
                            }
                        }
                    }
                }
            }

            currentPlayerShips = this.grid.getShipsByTeam('player');
            if (currentPlayerShips.length === 0) {
                this._processingAI = false;
                this.nextTurn();
                return;
            }
            bestTarget = this.chooseBestTarget(currentShip, currentPlayerShips);

            // SECOND: Attack with all available weapons (with safety limit)
            let attacksMade = 0;
            const maxAttacks = 10; // Safety limit to prevent infinite loops

            while (currentShip.actionPoints > 0 && currentShip.energy > 0 && attacksMade < maxAttacks) {
                const attackPlan = this.selectBestAttack(currentShip);

                if (!attackPlan) {
                    console.log('No viable attack plan');
                    if (this.forceAdvanceTowardsTarget(currentShip)) {
                        console.log('Fallback movement executed, re-evaluating attack');
                        continue;
                    }
                    console.log('Unable to advance, ending attack phase');
                    break;
                }

                const { target: attackTarget, weaponChoice } = attackPlan;
                if (!attackTarget || attackTarget.isDestroyed) {
                    break;
                }

                const weaponIndex = weaponChoice.index;
                const weapon = currentShip.weapons[weaponIndex];
                console.log(`Attacking ${attackTarget.name} with ${weapon.name} (AP: ${currentShip.actionPoints}, Energy: ${currentShip.energy})`);

                const attackData = currentShip.fireWeapon(weaponIndex, attackTarget);

                if (attackData) {
                    // Calculate damage
                    const damageResult = WeaponSystem.calculateDamage(attackData);
                    console.log(`Dealt ${damageResult.hullDamage + damageResult.shieldDamage} damage`);

                    // Create visual effect
                    const startPixel = renderer.layout.hexToPixel(currentShip.position);
                    const endPixel = renderer.layout.hexToPixel(attackTarget.position);

                    if (weapon.type === 'energy') {
                        renderer.addBeam(startPixel, endPixel, weapon);
                    } else {
                        renderer.addProjectile(startPixel, endPixel, weapon);
                    }

                    const totalDamage = Math.floor((damageResult.shieldDamage || 0) + (damageResult.hullDamage || 0));
                    if (totalDamage > 0) {
                        renderer.addDamageIndicator(attackTarget.position, `-${totalDamage}`, '#ff9966');
                    }

                    if (gameInstance) {
                        gameInstance.recordDamage(currentShip, attackTarget, damageResult);
                        if (gameInstance.combatLog) {
                            gameInstance.combatLog.logEnemy(`${currentShip.name} hits ${attackTarget.name}`);
                        }
                    }

                    attacksMade++;

                    // Check if target destroyed
                    if (attackTarget.isDestroyed) {
                        console.log(`Target ${attackTarget.name} destroyed!`);
                        if (this._lastFocusTargetId === attackTarget.id) {
                            this._lastFocusTargetId = null;
                        }
                        renderer.addExplosion(attackTarget.position);
                        this.grid.removeShip(attackTarget.position);
                        if (gameInstance?.hud) {
                            gameInstance.hud.showMessage(`${attackTarget.name} destroyed!`, 'error', 2500);
                        }
                        if (gameInstance?.combatLog) {
                            gameInstance.combatLog.logDestruction(attackTarget.name);
                        }

                        const remainingPlayers = this.grid.getShipsByTeam('player');
                        if (remainingPlayers.length === 0) {
                            break;
                        }
                        bestTarget = this.chooseBestTarget(currentShip, remainingPlayers);
                    }

                    gameInstance?.hud?.update();
                } else {
                    console.log('Attack failed');
                    break;
                }
            }

            if (attacksMade === 0 && (!bestTarget || !this.selectBestAttack(currentShip))) {
                console.log('AI turn: no actions possible, forcing end turn');
            } else {
                console.log(`AI turn complete: ${attacksMade} attacks made`);
            }
        } catch (error) {
            console.error('Error in enemy AI:', error);
        } finally {
            // ALWAYS end turn after a delay, even if something went wrong
            if (this.immediateMode) {
                console.log('Ending enemy turn (immediate mode)');
                this._processingAI = false;
                this.nextTurn();
            } else {
                console.log('Scheduling turn end');
                setTimeout(() => {
                    console.log('Ending enemy turn');
                    this._processingAI = false;
                    this.nextTurn();
                }, 1000);
            }
        }
    }

    // Choose best target using priority system
    chooseBestTarget(currentShip, playerShips) {
        let bestTarget = null;
        let bestScore = -Infinity;

        playerShips.forEach(target => {
            if (target.isDestroyed) return;
            const score = this.evaluateTargetScore(currentShip, target);
            if (score > bestScore) {
                bestScore = score;
                bestTarget = target;
            }
        });

        return bestTarget || playerShips[0]; // Fallback to first ship
    }

    // Choose best weapon for target
    chooseBestWeapon(currentShip, target) {
        let bestChoice = null;
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

            const { score, expectedDamage } = this.evaluateWeaponChoice(currentShip, target, weapon);

            if (score > bestScore) {
                bestScore = score;
                bestChoice = { index, score, expectedDamage };
            }
        });

        return bestChoice; // Returns null if no weapons available
    }

    evaluateWeaponChoice(attacker, target, weapon) {
        let score = 0;
        const baseDamage = weapon.damage || 0;
        const targetShield = target.shield || 0;
        const targetHull = target.hull || 0;
        const profile = attacker.aiProfile || 'standard';

        // Estimate damage effectiveness
        let expectedDamage = baseDamage;

        if (weapon.type === 'energy') {
            expectedDamage *= targetShield > 0 ? 1.1 : 0.85;
        } else if (weapon.type === 'kinetic') {
            expectedDamage *= targetShield > 0 ? 0.75 : 1.2;
        } else if (weapon.type === 'missile' || weapon.type === 'explosive') {
            expectedDamage *= 1.05;
        }

        // Account for shield mitigation
        if (targetShield > 0) {
            expectedDamage = Math.min(expectedDamage, targetShield + targetHull);
        }

        score += expectedDamage * 1.4;

        // Efficiency considerations
        score -= weapon.energyCost * 0.4;
        score -= weapon.apCost * 1.5;
        score += Math.max(0, attacker.actionPoints - weapon.apCost) * 3;

        // Bonus for finishing strikes
        if (expectedDamage >= targetHull && targetHull > 0) {
            score += 35;
        }

        // Prefer weapons that leave AP for reposition when low
        if (attacker.hull / attacker.maxHull < 0.3 && attacker.actionPoints - weapon.apCost <= 0) {
            score -= 25;
        }

        if (weapon.cooldownRemaining === 0) {
            score += 8;
        }

        switch (profile) {
            case 'aggressive':
                score += expectedDamage * 0.2;
                score -= weapon.apCost * 0.5;
                break;
            case 'cautious':
                score -= expectedDamage * 0.1;
                score -= weapon.energyCost * 0.3;
                break;
            case 'skirmisher':
            case 'flanker':
                score += (weapon.maxRange - weapon.minRange) * 0.5;
                if (expectedDamage > targetHull && weapon.apCost <= 1) {
                    score += 10;
                }
                break;
            case 'anchor':
                if (weapon.type === 'energy') score += 12;
                break;
            case 'vanguard':
                score += weapon.apCost <= 1 ? 6 : 0;
                break;
            default:
                break;
        }

        return { score, expectedDamage: Math.max(0, expectedDamage) };
    }

    evaluateTargetScore(currentShip, target) {
        let score = 0;
        const hullPercent = target.hull / Math.max(1, target.maxHull);
        const shieldPercent = target.shield / Math.max(1, target.maxShield || 1);
        const profile = currentShip.aiProfile || 'standard';

        // Killing blow incentives
        score += (1 - hullPercent) * 120;
        if (target.shield === 0) {
            score += 25;
        }

        // Threat based on potential damage to current ship
        const threat = this.estimateTargetThreat(target, currentShip);
        score += threat * 0.5;

        const distance = currentShip.position.distance(target.position);
        score -= distance * 1.8;

        const lineOfSight = WeaponSystem.hasLineOfSight(currentShip, target, this.grid);
        if (!lineOfSight) {
            score -= 45;
        }

        const weaponAccess = this.countWeaponsInRange(currentShip, target);
        if (weaponAccess.available === 0) {
            score -= 30 + weaponAccess.rangeGap * 5;
        } else {
            score += weaponAccess.available * 18;
        }

        if (this._lastFocusTargetId && target.id === this._lastFocusTargetId) {
            score += 25;
        }

        if (currentShip.shield < currentShip.maxShield * 0.2 && target.shield > 0) {
            score += 10;
        }

        // Avoid overcommitting to distant low threat targets
        if (threat < 10 && distance > 4) {
            score -= 15;
        }

        switch (profile) {
            case 'aggressive':
                score += (1 - hullPercent) * 35;
                score += threat * 0.2;
                score -= distance * 0.5;
                break;
            case 'cautious':
                score -= (1 - shieldPercent) * 20;
                score -= distance > 4 ? 10 : 0;
                if (target.shield === 0) score += 15;
                break;
            case 'flanker':
            case 'skirmisher':
                score -= Math.abs(distance - 4) * 8;
                score += weaponAccess.available * 5;
                break;
            case 'anchor':
                score += shieldPercent * 10;
                score -= distance * 2;
                break;
            case 'vanguard':
            case 'opportunist':
                score += (1 - hullPercent) * 20 + threat * 0.3;
                break;
            default:
                break;
        }

        return score;
    }

    estimateTargetThreat(attacker, targetShip) {
        let threat = 0;
        const distance = attacker.position.distance(targetShip.position);

        attacker.weapons.forEach(weapon => {
            const hasAP = (attacker.actionPoints || attacker.maxActionPoints || 0) >= weapon.apCost;
            const hasEnergy = (attacker.energy || attacker.maxEnergy || 0) >= weapon.energyCost;
            if (!hasAP || !hasEnergy || weapon.cooldownRemaining > 0) return;
            if (distance > weapon.maxRange || distance < weapon.minRange) return;

            let potential = weapon.damage || 0;
            if (weapon.type === 'energy' && targetShip.shield > 0) {
                potential *= 1.1;
            } else if (weapon.type === 'kinetic' && targetShip.shield === 0) {
                potential *= 1.2;
            }
            threat += potential;
        });

        return threat;
    }

    countWeaponsInRange(currentShip, target) {
        const distance = currentShip.position.distance(target.position);
        let available = 0;
        let rangeGap = Infinity;

        currentShip.weapons.forEach(weapon => {
            const gap = distance > weapon.maxRange ? distance - weapon.maxRange : weapon.minRange - distance;
            rangeGap = Math.min(rangeGap, Math.max(0, gap));

            if (distance <= weapon.maxRange && distance >= weapon.minRange) {
                if (currentShip.canFireWeapon(weapon, target)) {
                    available += 1;
                }
            }
        });

        if (!isFinite(rangeGap)) {
            rangeGap = 5;
        }

        return { available, rangeGap };
    }

    selectBestAttack(currentShip) {
        const playerShips = this.grid.getShipsByTeam('player').filter(ship => !ship.isDestroyed);
        let bestPlan = null;
        let bestScore = -Infinity;

        playerShips.forEach(target => {
            const weaponChoice = this.chooseBestWeapon(currentShip, target);
            if (!weaponChoice) return;

            const targetScore = this.evaluateTargetScore(currentShip, target);
            const totalScore = weaponChoice.score + targetScore * 0.35;

            if (totalScore > bestScore) {
                bestScore = totalScore;
                bestPlan = { target, weaponChoice, totalScore };
            }
        });

        return bestPlan;
    }

    computeClusterPenalty(hex, focusHex) {
        if (!hex || !focusHex) return 0;
        const distance = hex.distance(focusHex);
        if (distance >= 3) return 0;
        return (3 - distance) * 12;
    }

    forceAdvanceTowardsTarget(currentShip) {
        if (currentShip.actionPoints <= 0) {
            return false;
        }

        const opponents = this.grid.getShipsByTeam('player').filter(ship => !ship.isDestroyed);
        if (opponents.length === 0) {
            return false;
        }

        const target = this.chooseBestTarget(currentShip, opponents) || opponents[0];
        if (!target) return false;

        let path = this.grid.findPath(currentShip.position, target.position, currentShip);
        if (!path || path.length === 0) {
            let bestPath = null;
            let bestCost = Infinity;
            target.position.neighbors().forEach(neighbor => {
                if (!this.grid.isValidHex(neighbor) || this.grid.isBlocked(neighbor)) {
                    return;
                }
                const candidatePath = this.grid.findPath(currentShip.position, neighbor, currentShip);
                if (candidatePath && candidatePath.length > 0 && candidatePath.length < bestCost) {
                    bestCost = candidatePath.length;
                    bestPath = candidatePath;
                }
            });
            path = bestPath;
        }

        if (!path || path.length === 0) {
            return false;
        }

        const steps = Math.min(currentShip.actionPoints, Math.max(1, Math.floor(path.length / 2)));
        const truncatedPath = path.slice(0, steps);

        if (truncatedPath.length === 0) {
            return false;
        }

        console.log(`AI fallback moving ${currentShip.name} toward ${target.name}`);
        const moved = currentShip.move(truncatedPath, this.grid);
        if (moved) {
            console.log(` -> ${currentShip.name} new position: ${currentShip.position.toString()}`);
        }
        return Boolean(moved);
    }

    // Pick an ability for AI to use this turn
    chooseEnemyAbility(ship, target) {
        if (!ship.abilities || ship.abilities.length === 0) {
            return null;
        }

        const abilities = ship.abilities;
        const hullRatio = ship.maxHull > 0 ? ship.hull / ship.maxHull : 1;
        const shieldRatio = ship.maxShield > 0 ? ship.shield / ship.maxShield : 0;
        const targetShieldRatio = target && target.maxShield > 0 ? target.shield / target.maxShield : 0;
        const profile = ship.aiProfile || 'standard';

        const findAbility = (key) => abilities.findIndex(ability => ability.key === key && ship.canUseAbility(ability));

        // Emergency shield restoration
        const shieldSurge = findAbility('shieldSurge');
        if (shieldSurge !== -1 && (shieldRatio < 0.4 || hullRatio < 0.5 || profile === 'anchor')) {
            return shieldSurge;
        }

        // Defensive maneuver when fragile
        const evasive = findAbility('evasiveManeuver');
        if (evasive !== -1 && (hullRatio < (profile === 'cautious' ? 0.55 : 0.35) || (target && target.weapons && target.weapons.some(w => (w.damage || 0) > 45)))) {
            return evasive;
        }

        // Offensive overcharge when in good shape
        const overcharge = findAbility('weaponOvercharge');
        if (overcharge !== -1 && profile !== 'cautious' && hullRatio > 0.4 && ship.energy > ship.maxEnergy * 0.4) {
            const ability = ship.abilities[overcharge];
            const apAfter = ship.actionPoints - ability.apCost;
            const weaponsAvailable = this.countWeaponsInRange(ship, target).available;
            if (apAfter >= 1 && (weaponsAvailable > 0 || apAfter >= 2)) {
                return overcharge;
            }
        }

        return null;
    }

    // Reset for new game
    reset() {
        this.turnNumber = 1;
        this.initiativeQueue = [];
        this.currentShipIndex = 0;
        this.phase = 'initiative';
    }

    removeShipFromQueue(shipId) {
        const index = this.initiativeQueue.findIndex(ship => ship.id === shipId);
        if (index === -1) {
            return;
        }

        this.initiativeQueue.splice(index, 1);

        if (index < this.currentShipIndex) {
            this.currentShipIndex = Math.max(0, this.currentShipIndex - 1);
        } else if (this.currentShipIndex >= this.initiativeQueue.length) {
            this.currentShipIndex = Math.max(0, this.initiativeQueue.length - 1);
        }
    }
}

window.TurnManager = TurnManager;
