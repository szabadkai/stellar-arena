// Main game class

class Game {
    constructor(sound = null, modal = null, combatLog = null) {
        this.modal = modal;
        this.canvas = document.getElementById('game-canvas');
        this.sound = sound;
        this.combatLog = combatLog;
        this.gameOverOverlay = document.getElementById('game-over-overlay');
        this.gameOverTitle = document.getElementById('game-over-title');
        this.gameOverMessage = document.getElementById('game-over-message');
        this.gameOverRetryBtn = document.getElementById('game-over-retry-btn');
        this.gameOverExitBtn = document.getElementById('game-over-exit-btn');
        this.battleEventOverlay = document.getElementById('battle-event-overlay');
        this.battleEventTitle = document.getElementById('battle-event-title');
        this.battleEventDescription = document.getElementById('battle-event-description');
        this.battleEventChoices = document.getElementById('battle-event-choices');
        this.battleEventMessage = document.getElementById('battle-event-message');
        this.battleEventContinueBtn = document.getElementById('battle-event-continue-btn');

        // Initialize grid
        this.grid = new Grid(21, 17);

        // Initialize renderer
        this.renderer = new Renderer(this.canvas, this.grid);

        // Initialize turn manager
        this.turnManager = new TurnManager(this.grid, this.combatLog);

        // Initialize HUD
        this.hud = new HUD(this);

        // Initialize input handler
        this.inputHandler = new InputHandler(this);

        // Game state
        this.selectedShip = null;
        this.selectedWeapon = null;
        this.gameOver = false;
        this.battleStats = this.createBattleStats();
        this.buttonsInitialized = false;
        this._shortcutsBound = false;
        this.battleEventsTriggered = 0;
        this.maxBattleEvents = 2;
        this.pendingBattleEvent = null;
        this.isResolvingEvent = false;
        this.lastBattleEventTurn = 0;
        this.skipTurnAfterEvent = false;
        this.eventContextShip = null;
        this.battleEventsSeen = new Set();

        // Timing
        this.lastTime = 0;
        this.deltaTime = 0;

        // Setup initial game
        this.setupGame();

        // Setup tutorial
        this.setupTutorial();

        // Setup battle event UI
        this.initializeBattleEventUI();

        // Bind keyboard shortcuts once
        this.setupShortcuts();

        // Start game loop
        this.start();
    }

    setupTutorial() {
        const tutorialOverlay = document.getElementById('tutorial-overlay');
        const closeBtn = document.getElementById('close-tutorial-btn');
        const dontShowCheckbox = document.getElementById('dont-show-tutorial');

        // Check if user has seen tutorial
        const hasSeenTutorial = localStorage.getItem('stellar_arena_tutorial_seen');

        if (!hasSeenTutorial) {
            // Show tutorial on first battle
            tutorialOverlay.style.display = 'flex';
        }

        closeBtn.addEventListener('click', () => {
            tutorialOverlay.style.display = 'none';

            if (dontShowCheckbox.checked) {
                localStorage.setItem('stellar_arena_tutorial_seen', 'true');
            }
        });
    }

    setupGame(playerFleet = null, enemyFleet = null) {
        // Clear grid
        this.grid.clear();
        this.hideGameOverOverlay();
        this.selectedWeapon = null;
        this.selectedShip = null;
        this.battleStats = this.createBattleStats();
        this.battleEventsTriggered = 0;
        this.lastBattleEventTurn = 0;
        this.pendingBattleEvent = null;
        this.isResolvingEvent = false;
        this.skipTurnAfterEvent = false;
        this.eventContextShip = null;
        this.battleEventsSeen.clear();
        this.hideBattleEventOverlay();

        // Use provided fleets or create default
        if (!playerFleet) {
            playerFleet = [
                new Ship({
                    ...SHIP_PRESETS.corvette,
                    id: 'player1',
                    name: 'Aurora',
                    position: new HexCoord(-5, 2),
                    team: 'player'
                }),
                new Ship({
                    ...SHIP_PRESETS.interceptor,
                    id: 'player2',
                    name: 'Falcon',
                    position: new HexCoord(-5, -2),
                    team: 'player'
                })
            ];
        }

        if (!enemyFleet) {
            enemyFleet = [
                new Ship({
                    ...SHIP_PRESETS.corvette,
                    id: 'enemy1',
                    name: 'Raider Alpha',
                    position: new HexCoord(3, 0),
                    team: 'enemy',
                    aiProfile: 'cautious'
                })
            ];
        }

        // Place all ships
        playerFleet.forEach(ship => {
            ship._empUsed = false;
            this.grid.placeShip(ship, ship.position);
        });

        enemyFleet.forEach(ship => {
            ship._empUsed = false;
            this.grid.placeShip(ship, ship.position);
        });

        // Generate some obstacles
        this.grid.generateObstacles(6);

        // Start first round
        this.turnManager.startRound();

        // Select first player ship
        const playerShips = this.grid.getShipsByTeam('player');
        if (playerShips.length > 0) {
            this.selectShip(playerShips[0]);
        }

        // Setup UI buttons
        this.setupButtons();
    }

    setupButtons() {
        if (this.buttonsInitialized) {
            return;
        }
        this.buttonsInitialized = true;

        document.getElementById('end-turn-btn').addEventListener('click', () => {
            this.endTurn();
        });

        const resetBtn = document.getElementById('reset-btn');
        resetBtn.addEventListener('click', () => {
            this.reset();
        });

        if (this.gameOverRetryBtn) {
            this.gameOverRetryBtn.addEventListener('click', () => {
                this.hideGameOverOverlay();
                this.reset();
            });
        }

        if (this.gameOverExitBtn) {
            this.gameOverExitBtn.addEventListener('click', () => {
                this.hideGameOverOverlay();

                if (window.app) {
                    // Jump straight to post-battle flow if available
                    if (typeof window.app.showPostBattleImmediately === 'function') {
                        window.app.showPostBattleImmediately(false);
                    } else {
                        window.app.menuManager.showPostBattle(false);
                    }
                }
            });
        }
    }

    maybeTriggerBattleEvent(activeShip) {
        if (!activeShip) return;
        if (this.isResolvingEvent || this.gameOver) return;
        this.maxBattleEvents = Math.min(5, BATTLE_EVENT_LIBRARY.length);
        if (this.battleEventsTriggered >= this.maxBattleEvents) return;

        const enemies = this.grid.getShipsByTeam('enemy');
        if (enemies.length === 0) return;

        // Avoid triggering multiple events in the same round
        if (this.lastBattleEventTurn === this.turnManager.turnNumber) return;

        const available = BATTLE_EVENT_LIBRARY.filter(event => {
            if (event.minTurn && this.turnManager.turnNumber < event.minTurn) return false;
            if (event.maxTurn && this.turnManager.turnNumber > event.maxTurn) return false;
            if (typeof event.condition === 'function' && !event.condition({ game: this, ship: activeShip, enemies })) return false;
            if (this.battleEventsSeen.has(event.id)) return false;
            return true;
        });

        if (available.length === 0) return;

        // Chance to trigger
        const triggerChance = Math.min(0.35 + this.battleEventsTriggered * 0.15, 0.75);
        if (Math.random() > triggerChance) return;

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

        this.triggerBattleEvent(chosen, activeShip);
    }

    triggerBattleEvent(eventDef, activeShip) {
        if (!eventDef || !this.battleEventOverlay) return;

        this.pendingBattleEvent = {
            def: eventDef,
            resolved: false,
            shipId: activeShip.id
        };
        this.eventContextShip = activeShip;
        this.isResolvingEvent = true;
        this.battleEventsTriggered += 1;
        this.lastBattleEventTurn = this.turnManager.turnNumber;
        this.skipTurnAfterEvent = false;
        this.battleEventsSeen.add(eventDef.id);

        if (this.battleEventTitle) {
            this.battleEventTitle.textContent = eventDef.title;
        }
        if (this.battleEventDescription) {
            this.battleEventDescription.textContent = eventDef.description;
        }
        if (this.battleEventMessage) {
            this.battleEventMessage.textContent = '';
        }
        if (this.battleEventContinueBtn) {
            this.battleEventContinueBtn.classList.add('hidden');
            this.battleEventContinueBtn.disabled = false;
        }

        if (this.battleEventChoices) {
            this.battleEventChoices.innerHTML = '';
            eventDef.choices.forEach(choice => {
                const btn = document.createElement('button');
                btn.className = 'battle-event-choice-btn';
                btn.textContent = choice.label;
                btn.addEventListener('click', () => {
                    this.resolveBattleEventChoice(choice);
                });
                this.battleEventChoices.appendChild(btn);
            });
        }

        if (this.combatLog) {
            this.combatLog.logInfo(`Event: ${eventDef.title}`);
        }

        this.showBattleEventOverlay();
    }

    resolveBattleEventChoice(choice) {
        if (!this.pendingBattleEvent || !choice) return;
        if (this.pendingBattleEvent.resolved) return;

        const ship = this.eventContextShip && !this.eventContextShip.isDestroyed
            ? this.eventContextShip
            : this.getShipById(this.pendingBattleEvent.shipId);

        if (!ship) {
            // Surface clear error message and enable continue button
            if (this.battleEventMessage) {
                this.battleEventMessage.textContent = 'Unable to resolve event: ship no longer available.';
            }
            if (this.battleEventChoices) {
                this.battleEventChoices.querySelectorAll('.battle-event-choice-btn').forEach(btn => {
                    btn.disabled = true;
                    btn.classList.add('disabled');
                });
            }
            if (this.battleEventContinueBtn) {
                this.battleEventContinueBtn.classList.remove('hidden');
            }
            this.pendingBattleEvent.resolved = true;
            return;
        }

        this.applyBattleEventEffects(ship, choice.effects || {});

        if (this.battleEventChoices) {
            this.battleEventChoices.querySelectorAll('.battle-event-choice-btn').forEach(btn => {
                btn.disabled = true;
                btn.classList.add('disabled');
            });
        }

        if (this.battleEventMessage) {
            this.battleEventMessage.textContent = choice.resultText || 'Outcome applied.';
        }

        if (this.battleEventContinueBtn) {
            this.battleEventContinueBtn.classList.remove('hidden');
        }

        this.pendingBattleEvent.resolved = true;

        if (this.combatLog) {
            this.combatLog.logInfo(choice.resultText || 'Event resolved.');
        }
    }

    applyBattleEventEffects(ship, effects) {
        if (!effects) return;

        const renderer = this.renderer;

        if (effects.restoreEnergy) {
            const before = ship.energy;
            ship.energy = Math.min(ship.maxEnergy, ship.energy + effects.restoreEnergy);
            if (renderer) renderer.addDamageIndicator(ship.position, `+${ship.energy - before}E`, '#ffaa00');
        }

        if (effects.restoreHullPercent) {
            const heal = Math.floor(ship.maxHull * effects.restoreHullPercent);
            ship.hull = Math.min(ship.maxHull, ship.hull + heal);
            if (renderer && heal > 0) renderer.addDamageIndicator(ship.position, `+${heal} Hull`, '#66ff88');
        }

        if (effects.restoreShieldPercent) {
            const heal = Math.floor(ship.maxShield * effects.restoreShieldPercent);
            ship.shield = Math.min(ship.maxShield, ship.shield + heal);
            if (renderer && heal > 0) renderer.addDamageIndicator(ship.position, `+${heal} Shield`, '#66ddff');
        }

        if (effects.apAdjust) {
            ship.actionPoints = Math.max(0, Math.min(ship.maxActionPoints + 2, ship.actionPoints + effects.apAdjust));
            this.hud.showMessage(`${ship.name} action points adjusted`, effects.apAdjust > 0 ? 'success' : 'warning', 2000);
        }

        if (effects.overchargeShots) {
            ship.statusEffects.overchargeShots = Math.min(3, ship.statusEffects.overchargeShots + effects.overchargeShots);
            this.hud.showMessage(`${ship.name} weapons overcharged`, 'success', 2000);
        }

        if (effects.evasiveCharges) {
            ship.statusEffects.evasiveCharges = Math.min(3, ship.statusEffects.evasiveCharges + effects.evasiveCharges);
            this.hud.showMessage(`${ship.name} executes evasive protocols`, 'info', 2000);
        }

        if (effects.enemyRetreat) {
            const success = this.forceEnemyRetreat();
            if (!success) {
                this.hud.showMessage('No enemy vessels fled.', 'warning', 2000);
            }
        }

        if (effects.enemyDamagePercent) {
            this.damageRandomEnemyPercent(effects.enemyDamagePercent);
        }

        if (effects.enemyPanic) {
            this.applyEnemyPanic(effects.enemyPanic);
        }

        if (effects.playerDamagePercent) {
            this.damageShipPercent(ship, effects.playerDamagePercent);
        }

        if (effects.skipTurn) {
            this.skipTurnAfterEvent = true;
        }

        if (effects.restoreEnergyAllies) {
            this.grid.getShipsByTeam('player').forEach(ally => {
                ally.energy = Math.min(ally.maxEnergy, ally.energy + effects.restoreEnergyAllies);
            });
        }

        if (effects.enemyEnergyDrain) {
            this.grid.getShipsByTeam('enemy').forEach(enemy => {
                enemy.energy = Math.max(0, enemy.energy - effects.enemyEnergyDrain);
            });
            if (effects.enemyEnergyDrain > 0) {
                this.hud.showMessage('Enemy reactors sputter!', 'success', 2000);
            }
        }

        if (effects.alliesEvasiveCharges) {
            this.grid.getShipsByTeam('player').forEach(ally => {
                ally.statusEffects.evasiveCharges = Math.min(3, ally.statusEffects.evasiveCharges + effects.alliesEvasiveCharges);
            });
            this.hud.showMessage('Fleet evasion boosted!', 'info', 2000);
        }

        if (effects.resetCooldowns) {
            ship.weapons.forEach(weapon => {
                weapon.cooldownRemaining = 0;
            });
            this.hud.showMessage(`${ship.name} weapons recalibrated`, 'success', 2000);
        }

        if (effects.resetAbilityCooldowns) {
            ship.abilities.forEach(ability => {
                ability.cooldownRemaining = 0;
            });
        }

        if (effects.playerEnergyDrain) {
            const before = ship.energy;
            ship.energy = Math.max(0, ship.energy - effects.playerEnergyDrain);
            if (before !== ship.energy) {
                this.renderer.addDamageIndicator(ship.position, `-${before - ship.energy}E`, '#ff9966');
            }
        }

        if (ship.isDestroyed) {
            if (this.selectedShip && this.selectedShip.id === ship.id) {
                this.deselectShip();
            }
        } else {
            this.renderer.setSelectedShip(ship, true);
            this.renderer.setSelectedWeapon(this.selectedWeapon);
        }

        this.hud.update();
        this.checkWinCondition();
    }

    forceEnemyRetreat() {
        const enemies = this.grid.getShipsByTeam('enemy');
        if (enemies.length === 0) return false;

        const target = enemies[Math.floor(Math.random() * enemies.length)];
        const retreatHex = target.position;
        const pixel = this.renderer.layout.hexToPixel(retreatHex);

        this.renderer.addDamageIndicator(retreatHex, 'Retreat!', '#ffaa00');
        this.renderer.particleSystem.createEngineTrail(pixel.x, pixel.y, Math.random() * Math.PI * 2, 25);

        this.turnManager.removeShipFromQueue(target.id);
        this.grid.removeShip(retreatHex);
        target.isDestroyed = true;
        this.hud.showMessage(`${target.name} retreats from battle!`, 'success', 2500);
        if (this.sound) {
            this.sound.playVictory();
        }
        this.battleStats.kills += 1;
        return true;
    }

    damageRandomEnemyPercent(percent) {
        const enemies = this.grid.getShipsByTeam('enemy');
        if (enemies.length === 0) return;

        const target = enemies[Math.floor(Math.random() * enemies.length)];
        this.damageShipPercent(target, percent);
        this.hud.showMessage(`${target.name} suffers structural damage`, 'success', 2000);
        if (target.isDestroyed) {
            this.turnManager.removeShipFromQueue(target.id);
            this.grid.removeShip(target.position);
            this.renderer.addExplosion(target.position);
            this.battleStats.kills += 1;
            this.checkWinCondition();
        }
    }

    applyEnemyPanic(apPenalty) {
        const enemies = this.grid.getShipsByTeam('enemy');
        enemies.forEach(enemy => {
            enemy.actionPoints = Math.max(0, enemy.actionPoints - apPenalty);
        });
        if (enemies.length > 0) {
            this.hud.showMessage('Enemy crews panic, losing coordination!', 'success', 2500);
        }
    }

    damageShipPercent(ship, percent) {
        if (!ship || ship.isDestroyed) return;
        const damage = Math.max(1, Math.floor(ship.maxHull * percent));
        const result = ship.takeDamage({ damage, weapon: { damageType: 'event' } });
        this.renderer.addDamageIndicator(ship.position, `-${damage}`, '#ff6666');

        const totalDamage = (result?.hullDamage || 0) + (result?.shieldDamage || 0);
        if (ship.team === 'player') {
            this.battleStats.damageTaken += totalDamage;
        } else {
            this.battleStats.damageDealt += totalDamage;
        }

        if (ship.isDestroyed) {
            this.renderer.addExplosion(ship.position);
            this.grid.removeShip(ship.position);
            this.turnManager.removeShipFromQueue(ship.id);
            if (this.selectedShip && this.selectedShip.id === ship.id) {
                this.deselectShip();
            }
            if (ship.team === 'player') {
                this.battleStats.losses += 1;
            } else {
                this.battleStats.kills += 1;
                if (this.turnManager.getCurrentShip()?.id === ship.id) {
                    this.turnManager.nextTurn();
                }
            }
        }
    }

    getShipById(id) {
        return this.grid.getAllShips().find(ship => ship.id === id) || null;
    }

    initializeBattleEventUI() {
        if (!this.battleEventOverlay) {
            return;
        }

        this.battleEventContinueBtn?.addEventListener('click', () => {
            this.closeBattleEventOverlay();
        });
    }

    setupShortcuts() {
        if (this._shortcutsBound) {
            return;
        }

        this._shortcutsBound = true;

        window.addEventListener('keydown', (event) => {
            if (this.gameOver) return;

            const activeElement = document.activeElement;
            if (activeElement && ['INPUT', 'TEXTAREA'].includes(activeElement.tagName)) {
                return;
            }

            const currentShip = this.turnManager.getCurrentShip();
            if (!currentShip || currentShip.team !== 'player') {
                return;
            }

            if (event.code.startsWith('Digit')) {
                const index = parseInt(event.key, 10) - 1;
                if (!Number.isNaN(index) && index >= 0) {
                    event.preventDefault();
                    this.hud.selectWeapon(index);
                }
            } else if (event.code === 'KeyQ' || event.code === 'KeyE') {
                const abilityIndex = event.code === 'KeyQ' ? 0 : 1;
                event.preventDefault();
                this.useAbility(abilityIndex);
            } else if (event.code === 'Space') {
                event.preventDefault();
                this.endTurn();
            }
        });
    }

    start() {
        this.lastTime = performance.now();
        this.gameLoop();
    }

    gameLoop = (currentTime) => {
        // Calculate delta time
        this.deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        // Update
        this.update(this.deltaTime);

        // Render
        this.renderer.render(this.deltaTime);

        // Continue loop
        requestAnimationFrame(this.gameLoop);
    }

    update(deltaTime) {
        // Update HUD
        this.hud.update();

        // Get current ship
        const currentShip = this.turnManager.getCurrentShip();

        if (!currentShip || this.gameOver) {
            return;
        }

        if (this.isResolvingEvent) {
            return;
        }

        // Process enemy turn if needed
        if (currentShip.team === 'enemy') {
            // Only process once
            if (!currentShip._aiProcessed) {
                console.log(`[Game Update] Processing AI for ${currentShip.name}, _aiProcessed: ${currentShip._aiProcessed}`);
                currentShip._aiProcessed = true;
                currentShip._aiProcessedAt = (typeof performance !== 'undefined' ? performance.now() : Date.now());
                setTimeout(() => {
                    console.log(`[Game Update] Timeout fired, calling processEnemyTurn for ${currentShip.name}`);
                    this.turnManager.processEnemyTurn(this.renderer, this);
                }, 500);
            } else if (!this.turnManager._processingAI) {
                const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
                const elapsed = now - (currentShip._aiProcessedAt || now);
                if (elapsed > 2000) {
                    console.warn(`AI safeguard re-triggered for ${currentShip.name}`);
                    currentShip._aiProcessed = false;
                    currentShip._aiProcessedAt = now;
                }
            }
        } else if (currentShip.team === 'player') {
            // Auto-select the active player ship
            if (!currentShip._autoSelected) {
                currentShip._autoSelected = true;
                this.selectShip(currentShip);
            }

            this.maybeTriggerBattleEvent(currentShip);
        }
    }

    selectShip(ship) {
        if (ship.isDestroyed) return;

        this.selectedShip = ship;
        this.selectedWeapon = null;

        // Only show reachable hexes if it's this ship's turn
        const currentShip = this.turnManager.getCurrentShip();
        const isThisShipsTurn = currentShip && currentShip.id === ship.id;

        this.renderer.setSelectedShip(ship, isThisShipsTurn);
        this.renderer.setSelectedWeapon(null);
        this.hud.update();
    }

    deselectShip() {
        this.selectedShip = null;
        this.selectedWeapon = null;
        this.renderer.setSelectedShip(null);
        this.renderer.setSelectedWeapon(null);
        this.hud.update();
    }

    moveShipTo(targetHex) {
        if (!this.selectedShip || !this.turnManager.isPlayerTurn()) {
            return;
        }

        if (this.isResolvingEvent) {
            this.hud.showMessage('Resolve the event first!', 'warning', 2000);
            return;
        }

        if (this.selectedShip.team !== 'player') {
            return;
        }

        // Find path
        const path = this.grid.findPath(
            this.selectedShip.position,
            targetHex,
            this.selectedShip
        );

        if (path && path.length > 0) {
            // Move ship
            const success = this.selectedShip.move(path, this.grid);

            if (success) {
                // Log movement
                if (this.combatLog) {
                    this.combatLog.logMovement(this.selectedShip.name, path.length);
                }

                // Update display
                this.renderer.setSelectedShip(this.selectedShip);
                this.hud.update();
            }
        }
    }

    useAbility(index) {
        const ship = this.selectedShip;
        if (!ship) {
            this.hud.showMessage('Select a ship first!', 'error', 2000);
            return;
        }

        if (this.isResolvingEvent) {
            this.hud.showMessage('Resolve the event first!', 'warning', 2000);
            return;
        }

        if (ship.team !== 'player') {
            this.hud.showMessage('Only player ships can use abilities.', 'error', 2000);
            return;
        }

        const currentShip = this.turnManager.getCurrentShip();
        if (!currentShip || currentShip.id !== ship.id) {
            this.hud.showMessage("It's not this ship's turn!", 'error', 2000);
            return;
        }

        if (!ship.abilities || !ship.abilities[index]) {
            this.hud.showMessage('Ability unavailable.', 'error', 2000);
            return;
        }

        const ability = ship.abilities[index];
        if (!ship.canUseAbility(ability)) {
            if (ability.cooldownRemaining > 0) {
                this.hud.showMessage(`Ability cooling down (${ability.cooldownRemaining})`, 'warning', 2000);
            } else if (ship.energy < ability.energyCost) {
                this.hud.showMessage('Not enough energy!', 'error', 2000);
            } else if (ship.actionPoints < ability.apCost) {
                this.hud.showMessage('Not enough AP!', 'error', 2000);
            } else {
                this.hud.showMessage('Ability unavailable.', 'error', 2000);
            }
            return;
        }

        const success = ship.useAbility(index, { game: this, renderer: this.renderer });

        if (success) {
            if (this.combatLog) {
                this.combatLog.logAbilityUse(ship.name, ability.name);
            }

            this.recordAbilityUse(ship);
            this.clearAbilityPreview(); // Clear preview after using ability
            this.hud.update();
        }
    }

    showAbilityPreview(ability, ship) {
        if (!ability || !ship || !this.renderer) return;

        if (typeof ability.getPreview === 'function') {
            const affectedHexes = ability.getPreview(ship, this.grid);
            if (affectedHexes && affectedHexes.length > 0) {
                this.renderer.setAbilityPreview(affectedHexes);
            }
        }
    }

    clearAbilityPreview() {
        if (this.renderer) {
            this.renderer.setAbilityPreview(null);
        }
    }

    attackTarget(target) {
        if (!this.selectedShip || !this.selectedWeapon) {
            this.hud.showMessage('No weapon selected!', 'error');
            return;
        }

        if (this.isResolvingEvent) {
            this.hud.showMessage('Resolve the event first!', 'warning');
            return;
        }

        // Check if it's this ship's turn
        const currentShip = this.turnManager.getCurrentShip();
        if (!currentShip || currentShip.id !== this.selectedShip.id) {
            this.hud.showMessage("It's not this ship's turn!", 'error');
            return;
        }

        if (this.selectedShip.team !== 'player') {
            return;
        }

        // Get weapon index
        const weaponIndex = this.selectedShip.weapons.indexOf(this.selectedWeapon);

        if (weaponIndex === -1) {
            this.hud.showMessage('Weapon not found!', 'error');
            return;
        }

        // Check range
        const distance = this.selectedShip.position.distance(target.position);
        if (distance > this.selectedWeapon.maxRange) {
            this.hud.showMessage(`Target out of range! (${distance} > ${this.selectedWeapon.maxRange})`, 'error');
            return;
        }

        if (distance < this.selectedWeapon.minRange) {
            this.hud.showMessage(`Target too close! (${distance} < ${this.selectedWeapon.minRange})`, 'error');
            return;
        }

        // Check if can fire
        if (!this.selectedShip.canFireWeapon(this.selectedWeapon, target)) {
            if (this.selectedShip.energy < this.selectedWeapon.energyCost) {
                this.hud.showMessage('Not enough energy!', 'error');
            } else if (this.selectedShip.actionPoints < this.selectedWeapon.apCost) {
                this.hud.showMessage('Not enough AP!', 'error');
            } else if (this.selectedWeapon.cooldownRemaining > 0) {
                this.hud.showMessage(`Weapon on cooldown! (${this.selectedWeapon.cooldownRemaining} turns)`, 'error');
            }
            return;
        }

        // Check line of sight
        if (!WeaponSystem.hasLineOfSight(this.selectedShip, target, this.grid)) {
            this.hud.showMessage('No line of sight!', 'error');
            return;
        }

        // Fire weapon
        const attackData = this.selectedShip.fireWeapon(weaponIndex, target);

        if (attackData) {
            // Log weapon fire
            if (this.combatLog) {
                this.combatLog.logWeaponFire(this.selectedShip.name, this.selectedWeapon.name, target.name);
            }

            // Show attack message
            this.hud.showMessage(`${this.selectedShip.name} fires ${this.selectedWeapon.name}!`, 'success', 2000);

            // Calculate damage
            const damageResult = WeaponSystem.calculateDamage(attackData);

            // Play weapon sound
            if (this.sound) {
                if (this.selectedWeapon.type === 'energy') {
                    this.sound.playLaser();
                } else if (this.selectedWeapon.type === 'missile') {
                    this.sound.playMissile();
                } else {
                    this.sound.playKinetic();
                }
            }

            // Create visual effects
            const startPixel = this.renderer.layout.hexToPixel(this.selectedShip.position);
            const endPixel = this.renderer.layout.hexToPixel(target.position);

            if (this.selectedWeapon.type === 'energy') {
                this.renderer.addBeam(startPixel, endPixel, this.selectedWeapon);
            } else {
                this.renderer.addProjectile(startPixel, endPixel, this.selectedWeapon);
            }

            // Show impact effect and damage
            setTimeout(() => {
                const totalDamage = Math.floor((damageResult.shieldDamage || 0) + (damageResult.hullDamage || 0));
                if (totalDamage > 0) {
                    this.renderer.addDamageIndicator(target.position, `-${totalDamage}`, '#ff6666');
                }

                this.recordDamage(this.selectedShip, target, damageResult);

                // Log damage
                if (this.combatLog) {
                    this.combatLog.logDamage(target.name, damageResult.shieldDamage, damageResult.hullDamage);
                }

                if (damageResult.shieldDamage > 0) {
                    this.renderer.addShieldHit(target.position);
                    this.hud.showMessage(`Shield absorbed ${Math.floor(damageResult.shieldDamage)} damage`, 'warning', 2000);
                    if (this.sound) this.sound.playShieldHit();
                }

                if (damageResult.hullDamage > 0) {
                    this.hud.showMessage(`${target.name} took ${Math.floor(damageResult.hullDamage)} hull damage!`, 'warning', 2000);
                    if (this.sound) this.sound.playHullHit();
                }

                if (damageResult.destroyed) {
                    // Log destruction
                    if (this.combatLog) {
                        this.combatLog.logDestruction(target.name);
                    }

                    this.renderer.addExplosion(target.position);
                    this.grid.removeShip(target.position);
                    this.hud.showMessage(`${target.name} DESTROYED!`, 'success', 3000);
                    if (this.sound) this.sound.playExplosion();

                    // Check win condition
                    this.checkWinCondition();
                }
            }, this.selectedWeapon.type === 'energy' ? 100 : 500);

            // Keep weapon selected if it can still be fired
            const weaponIndex = this.selectedShip.weapons.indexOf(this.selectedWeapon);
            if (weaponIndex !== -1) {
                const canStillFire = this.selectedShip.canFireWeapon(this.selectedWeapon, target);
                if (!canStillFire) {
                    // Deselect weapon only if it can't be fired again
                    this.selectedWeapon = null;
                    this.renderer.setSelectedWeapon(null);
                }
            } else {
                // Weapon not found, deselect
                this.selectedWeapon = null;
                this.renderer.setSelectedWeapon(null);
            }

            // Update HUD
            this.hud.update();
        }
    }

    endTurn() {
        if (!this.turnManager.isPlayerTurn()) {
            return;
        }

        if (this.isResolvingEvent) {
            this.hud.showMessage('Resolve the event first!', 'warning', 2000);
            return;
        }

        this.deselectShip();
        this.turnManager.endCurrentTurn();
    }

    checkWinCondition() {
        const playerShips = this.grid.getShipsByTeam('player');
        const enemyShips = this.grid.getShipsByTeam('enemy');

        if (playerShips.length === 0) {
            this.gameOver = true;
            this.showGameOverOverlay('defeat');

            this.battleStats.turnsElapsed = Math.max(1, this.turnManager.turnNumber);

            // Log defeat
            if (this.combatLog) {
                this.combatLog.logDefeat();
            }

            // Notify app of defeat
            if (window.app) {
                window.app.onBattleEnd(false, playerShips, enemyShips, this.getBattleSummary());
            } else if (this.modal) {
                this.modal.alert('Defeat', 'All your ships have been destroyed!');
            }
        } else if (enemyShips.length === 0) {
            this.gameOver = true;

            this.battleStats.turnsElapsed = Math.max(1, this.turnManager.turnNumber);

            // Log victory
            if (this.combatLog) {
                this.combatLog.logVictory();
            }

            // Notify app of victory
            if (window.app) {
                window.app.onBattleEnd(true, playerShips, enemyShips, this.getBattleSummary());
            } else if (this.modal) {
                this.modal.alert('Victory', 'All enemy ships destroyed!');
            }
        }
    }

    reset() {
        this.gameOver = false;
        this.hideGameOverOverlay();
        this.deselectShip();
        this.turnManager.reset();
        this.renderer.projectiles = [];
        this.renderer.beams = [];
        this.renderer.effects = [];
        this.renderer.particleSystem.clear();
        this.setupGame();
    }

    recordDamage(attacker, target, damageResult) {
        if (!damageResult) return;

        const totalDamage = (damageResult.shieldDamage || 0) + (damageResult.hullDamage || 0);

        if (attacker.team === 'player') {
            this.battleStats.damageDealt += totalDamage;
            if (damageResult.destroyed) {
                this.battleStats.kills += 1;
            }
        }

        if (target.team === 'player') {
            this.battleStats.damageTaken += totalDamage;
            if (damageResult.destroyed) {
                this.battleStats.losses += 1;
            }
        }
    }

    recordAbilityUse(ship) {
        if (ship.team === 'player') {
            this.battleStats.abilitiesUsed += 1;
        }
    }

    createBattleStats() {
        return {
            turnsElapsed: 0,
            damageDealt: 0,
            damageTaken: 0,
            abilitiesUsed: 0,
            kills: 0,
            losses: 0
        };
    }

    getBattleSummary() {
        return {
            ...this.battleStats,
            turnsElapsed: Math.max(1, this.turnManager.turnNumber)
        };
    }

    showGameOverOverlay(outcome = 'defeat') {
        if (!this.gameOverOverlay) {
            return;
        }

        if (this.gameOverTitle) {
            this.gameOverTitle.textContent = outcome === 'defeat' ? 'Defeat' : 'Battle Complete';
        }

        if (this.gameOverMessage) {
            this.gameOverMessage.textContent = outcome === 'defeat'
                ? 'All player ships have been destroyed.'
                : 'Enemy fleet neutralized.';
        }

        if (this.gameOverRetryBtn) {
            const shouldShowRetry = !window.app;
            this.gameOverRetryBtn.style.display = shouldShowRetry ? 'inline-flex' : 'none';
        }

        if (this.gameOverExitBtn) {
            this.gameOverExitBtn.textContent = window.app ? 'View Results' : 'Close';
        }

        this.gameOverOverlay.classList.remove('hidden');
    }

    hideGameOverOverlay() {
        if (!this.gameOverOverlay) {
            return;
        }

        this.gameOverOverlay.classList.add('hidden');
    }

    showBattleEventOverlay() {
        if (!this.battleEventOverlay) return;
        this.battleEventOverlay.classList.remove('hidden');
    }

    hideBattleEventOverlay() {
        if (!this.battleEventOverlay) return;
        this.battleEventOverlay.classList.add('hidden');
        this.battleEventChoices?.replaceChildren();
        if (this.battleEventMessage) {
            this.battleEventMessage.textContent = '';
        }
        if (this.battleEventContinueBtn) {
            this.battleEventContinueBtn.classList.add('hidden');
            this.battleEventContinueBtn.disabled = false;
        }
        this.isResolvingEvent = false;
        this.pendingBattleEvent = null;
        this.eventContextShip = null;
        this.skipTurnAfterEvent = false;
    }

    closeBattleEventOverlay() {
        this.hideBattleEventOverlay();
        if (this.skipTurnAfterEvent) {
            this.skipTurnAfterEvent = false;
            if (this.turnManager.isPlayerTurn()) {
                this.endTurn();
            }
        }
    }
}

const BATTLE_EVENT_LIBRARY = [
    {
        id: 'enemy_break',
        title: 'Morale Fracture',
        description: 'Enemy comms spike with panic. Their formation wavers as one captain begs for extraction.',
        minTurn: 2,
        weight: 1.2,
        condition: ({ game }) => game.grid.getShipsByTeam('enemy').length > 1,
        choices: [
            {
                id: 'offer-passage',
                label: 'Offer a withdrawal corridor (one enemy retreats)',
                resultText: 'A wounded enemy cruiser jumps to safety, leaving the rest exposed.',
                effects: {
                    enemyRetreat: true
                }
            },
            {
                id: 'press-advantage',
                label: 'Press the advantage (gain overcharge, enemies lose AP)',
                resultText: 'Your fleet surges forward as enemy crews scramble to respond.',
                effects: {
                    overchargeShots: 1,
                    enemyPanic: 1
                }
            }
        ]
    },
    {
        id: 'power_cache',
        title: 'Power Relay Cache',
        description: 'Scans flag a dormant relay buoy loaded with spare capacitors drifting alongside the battle.',
        minTurn: 1,
        weight: 1,
        choices: [
            {
                id: 'divert-power',
                label: 'Tap the cache (+40 energy, +15% shields)',
                resultText: 'Fresh power floods your systems, restoring crucial reserves.',
                effects: {
                    restoreEnergy: 40,
                    restoreShieldPercent: 0.15
                }
            },
            {
                id: 'share-grid',
                label: 'Feed the grid (allies gain +25 energy)',
                resultText: 'Fleet-wide relays hum as your allies recharge.',
                effects: {
                    restoreEnergyAllies: 25
                }
            }
        ]
    },
    {
        id: 'system_glitch',
        title: 'Subsystem Glitch',
        description: 'A surge rattles through your ship’s flight computer. Diagnostics warn of cascading faults.',
        minTurn: 3,
        weight: 0.9,
        choices: [
            {
                id: 'reboot',
                label: 'Hard reboot (skip turn, restore 20% hull)',
                resultText: 'Systems reboot cleanly, patching critical plating but costing precious time.',
                effects: {
                    restoreHullPercent: 0.2,
                    skipTurn: true
                }
            },
            {
                id: 'ride-out',
                label: 'Ride it out (-12% hull, gain evasive charge)',
                resultText: 'You muscle through the glitches, rerouting to emergency thrusters.',
                effects: {
                    playerDamagePercent: 0.12,
                    evasiveCharges: 1
                }
            }
        ]
    },
    {
        id: 'salvage_drone',
        title: 'Salvage Drone Rendezvous',
        description: 'An old Alliance drone offers docking clamps and a patch kit—if you take the time to interface.',
        minTurn: 1,
        weight: 1.1,
        choices: [
            {
                id: 'dock-drone',
                label: 'Dock and refit (+18% hull, +25 energy)',
                resultText: 'Micro-welders swarm your hull, sealing fractures while capacitors recharge.',
                effects: {
                    restoreHullPercent: 0.18,
                    restoreEnergy: 25
                }
            },
            {
                id: 'strip-drone',
                label: 'Strip its cores (enemies lose 25 energy, gain overcharge)',
                resultText: 'You siphon the drone’s cores, leaving the enemy short on reserves.',
                effects: {
                    enemyEnergyDrain: 25,
                    overchargeShots: 1
                }
            }
        ]
    },
    {
        id: 'minefield_drift',
        title: 'Minefield Drift',
        description: 'A forgotten mine cluster tumbles between the fleets, unstable but bristling with explosives.',
        minTurn: 2,
        weight: 1,
        choices: [
            {
                id: 'detonate',
                label: 'Trigger safely (random enemy takes 18% hull damage)',
                resultText: 'A chain reaction tears through an enemy vessel’s plating.',
                effects: {
                    enemyDamagePercent: 0.18
                }
            },
            {
                id: 'thread',
                label: 'Thread the gap (-8% hull, gain evasive stacks)',
                resultText: 'You weave through the mines, sustaining glancing hits but gaining momentum.',
                effects: {
                    playerDamagePercent: 0.08,
                    evasiveCharges: 2
                }
            }
        ]
    },
    {
        id: 'solar_flare',
        title: 'Solar Flare Surge',
        description: 'A coronal wave sweeps the grid. Shield harmonics spike and weapon capacitors crackle.',
        minTurn: 3,
        maxTurn: 6,
        weight: 1.1,
        choices: [
            {
                id: 'brace',
                label: 'Brace the shields (+20% shield, allies gain evasive)',
                resultText: 'You bleed the flare into your deflectors, bolstering the fleet.',
                effects: {
                    restoreShieldPercent: 0.2,
                    alliesEvasiveCharges: 1
                }
            },
            {
                id: 'amplify',
                label: 'Amplify weapon banks (reset cooldowns, enemies lose 20 energy)',
                resultText: 'Weapon coils howl as you channel the flare outward.',
                effects: {
                    resetCooldowns: true,
                    enemyEnergyDrain: 20
                }
            }
        ]
    },
    {
        id: 'encrypted_signal',
        title: 'Encrypted Signal',
        description: 'A hidden ally beams a coded burst. Deciphering it mid-fight could grant an edge.',
        minTurn: 2,
        weight: 0.8,
        choices: [
            {
                id: 'decode',
                label: 'Decode fully (reset ability cooldowns, +1 AP)',
                resultText: 'You crack the cipher, unlocking tactical subroutines.',
                effects: {
                    resetAbilityCooldowns: true,
                    apAdjust: 1
                }
            },
            {
                id: 'spoof',
                label: 'Spoof the signal (enemies lose AP, gain evasive)',
                resultText: 'Enemy decks light up with false orders while your helm executes evasive rolls.',
                effects: {
                    enemyPanic: 1,
                    evasiveCharges: 1
                }
            }
        ]
    },
    {
        id: 'escape_pod',
        title: 'Cryo Pod Distress',
        description: 'A battered escape pod pings for rescue, promising veteran expertise in return.',
        minTurn: 1,
        weight: 0.9,
        choices: [
            {
                id: 'rescue',
                label: 'Tractor the pod (+15% hull, enemies lose AP)',
                resultText: 'You reel the pod in; the grateful pilot feeds you enemy vectors.',
                effects: {
                    restoreHullPercent: 0.15,
                    enemyPanic: 1
                }
            },
            {
                id: 'plunder',
                label: 'Plunder the pod (-10% hull, gain overcharge & evasive)',
                resultText: 'Experimental munitions inside supercharge your weapons—at a moral cost.',
                effects: {
                    playerDamagePercent: 0.1,
                    overchargeShots: 2,
                    evasiveCharges: 1
                }
            }
        ]
    },
    {
        id: 'reactor_leak',
        title: 'Auxiliary Reactor Leak',
        description: 'Reactor alarms scream. Venting plasma could save the ship—or fuel your cannons.',
        minTurn: 4,
        weight: 0.7,
        choices: [
            {
                id: 'vent',
                label: 'Vent plasma (lose 30 energy, enemies take 14% damage)',
                resultText: 'Vent streams slash across the grid, scorching enemy hulls.',
                effects: {
                    playerEnergyDrain: 30,
                    enemyDamagePercent: 0.14
                }
            },
            {
                id: 'contain',
                label: 'Contain leak (+25 energy, gain evasive)',
                resultText: 'Engineers plug the leak, channeling the overflow back to the coil banks.',
                effects: {
                    restoreEnergy: 25,
                    evasiveCharges: 1
                }
            }
        ]
    },
    {
        id: 'drifting_arsenal',
        title: 'Drifting Arsenal',
        description: 'Crates of munitions float nearby, still sealed and surprisingly intact.',
        minTurn: 1,
        weight: 1,
        choices: [
            {
                id: 'arm-up',
                label: 'Arm up (reset weapon cooldowns, +1 AP)',
                resultText: 'Fresh ammo slides into place; crews stand ready.',
                effects: {
                    resetCooldowns: true,
                    apAdjust: 1
                }
            },
            {
                id: 'rig-traps',
                label: 'Rig mines (random enemy takes 15% damage, enemies lose AP)',
                resultText: 'Makeshift charges detonate under an enemy frigate, sowing chaos.',
                effects: {
                    enemyDamagePercent: 0.15,
                    enemyPanic: 1
                }
            }
        ]
    },
    {
        id: 'grav_surge',
        title: 'Gravity Surge',
        description: 'A gravity well flickers alive, threatening to drag ships off course.',
        minTurn: 2,
        weight: 0.9,
        choices: [
            {
                id: 'anchor',
                label: 'Anchor thrusters (-12% hull, gain evasive to all allies)',
                resultText: 'You burn stabilizers, keeping formation intact at a cost.',
                effects: {
                    playerDamagePercent: 0.12,
                    alliesEvasiveCharges: 1
                }
            },
            {
                id: 'shove_enemies',
                label: 'Shove enemies (enemies take 10% damage, lose AP)',
                resultText: 'You ride the surge, slamming opponents out of position.',
                effects: {
                    enemyDamagePercent: 0.10,
                    enemyPanic: 1
                }
            }
        ]
    }
];

// Game is now started by the App, not automatically

window.Game = Game;
