// Main game class

class Game {
    constructor(sound = null, modal = null, combatLog = null) {
        this.modal = modal;
        this.canvas = document.getElementById('game-canvas');
        this.sound = sound;
        this.combatLog = combatLog;

        // Initialize grid
        this.grid = new Grid(15, 15);

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

        // Timing
        this.lastTime = 0;
        this.deltaTime = 0;

        // Setup initial game
        this.setupGame();

        // Setup tutorial
        this.setupTutorial();

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
                    position: new HexCoord(5, 0),
                    team: 'enemy'
                }),
                new Ship({
                    ...SHIP_PRESETS.destroyer,
                    id: 'enemy2',
                    name: 'Destroyer Beta',
                    position: new HexCoord(6, -2),
                    team: 'enemy'
                })
            ];
        }

        // Place all ships
        playerFleet.forEach(ship => {
            this.grid.placeShip(ship, ship.position);
        });

        enemyFleet.forEach(ship => {
            this.grid.placeShip(ship, ship.position);
        });

        // Generate some obstacles
        this.grid.generateObstacles(10);

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
        document.getElementById('end-turn-btn').addEventListener('click', () => {
            this.endTurn();
        });

        document.getElementById('reset-btn').addEventListener('click', () => {
            this.reset();
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

        // Process enemy turn if needed
        if (currentShip.team === 'enemy') {
            // Only process once
            if (!currentShip._aiProcessed) {
                console.log(`[Game Update] Processing AI for ${currentShip.name}, _aiProcessed: ${currentShip._aiProcessed}`);
                currentShip._aiProcessed = true;
                setTimeout(() => {
                    console.log(`[Game Update] Timeout fired, calling processEnemyTurn for ${currentShip.name}`);
                    this.turnManager.processEnemyTurn(this.renderer);
                }, 500);
            }
        } else if (currentShip.team === 'player') {
            // Auto-select the active player ship
            if (!currentShip._autoSelected) {
                currentShip._autoSelected = true;
                this.selectShip(currentShip);
            }
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

    attackTarget(target) {
        if (!this.selectedShip || !this.selectedWeapon) {
            this.hud.showMessage('No weapon selected!', 'error');
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

        this.deselectShip();
        this.turnManager.endCurrentTurn();
    }

    checkWinCondition() {
        const playerShips = this.grid.getShipsByTeam('player');
        const enemyShips = this.grid.getShipsByTeam('enemy');

        if (playerShips.length === 0) {
            this.gameOver = true;

            // Log defeat
            if (this.combatLog) {
                this.combatLog.logDefeat();
            }

            // Notify app of defeat
            if (window.app) {
                window.app.onBattleEnd(false, playerShips, enemyShips);
            } else if (this.modal) {
                this.modal.alert('Defeat', 'All your ships have been destroyed!');
            }
        } else if (enemyShips.length === 0) {
            this.gameOver = true;

            // Log victory
            if (this.combatLog) {
                this.combatLog.logVictory();
            }

            // Notify app of victory
            if (window.app) {
                window.app.onBattleEnd(true, playerShips, enemyShips);
            } else if (this.modal) {
                this.modal.alert('Victory', 'All enemy ships destroyed!');
            }
        }
    }

    reset() {
        this.gameOver = false;
        this.deselectShip();
        this.turnManager.reset();
        this.renderer.projectiles = [];
        this.renderer.beams = [];
        this.renderer.effects = [];
        this.renderer.particleSystem.clear();
        this.setupGame();
    }
}

// Game is now started by the App, not automatically

window.Game = Game;
