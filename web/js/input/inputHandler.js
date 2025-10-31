// Input handler for mouse and keyboard

class InputHandler {
    constructor(game) {
        this.game = game;
        this.canvas = game.renderer.canvas;

        this.mousePos = { x: 0, y: 0 };
        this.isMouseDown = false;

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Mouse events
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.canvas.addEventListener('click', (e) => this.onClick(e));
        this.canvas.addEventListener('mouseleave', () => this.onMouseLeave());

        // Keyboard events
        document.addEventListener('keydown', (e) => this.onKeyDown(e));

        // Window resize
        window.addEventListener('resize', () => this.onResize());
    }

    onMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.mousePos.x = e.clientX - rect.left;
        this.mousePos.y = e.clientY - rect.top;

        // Update hovered hex
        const hex = this.game.renderer.pixelToHex(this.mousePos.x, this.mousePos.y);
        this.game.renderer.setHoveredHex(hex);
        this.game.renderer.updateEdgeScroll(this.mousePos.x, this.mousePos.y);
    }

    onMouseDown(e) {
        this.isMouseDown = true;
    }

    onMouseUp(e) {
        this.isMouseDown = false;
    }

    onMouseLeave() {
        this.game.renderer.resetEdgeScroll();
    }

    onClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const clickedHex = this.game.renderer.pixelToHex(x, y);

        // Check if clicked on a ship
        const clickedShip = this.game.grid.getShipAt(clickedHex);

        if (clickedShip) {
            this.handleShipClick(clickedShip);
        } else {
            this.handleHexClick(clickedHex);
        }
    }

    handleShipClick(ship) {
        // Always allow selecting player ships (to view stats)
        if (ship.team === 'player' && !ship.isDestroyed) {
            this.game.selectShip(ship);
        }
        // If it's an enemy ship and we have a weapon selected, attack
        else if (ship.team === 'enemy' && this.game.selectedShip && this.game.selectedWeapon) {
            // Only allow attack if it's the selected ship's turn
            const currentShip = this.game.turnManager.getCurrentShip();
            if (currentShip && currentShip.id === this.game.selectedShip.id) {
                this.game.attackTarget(ship);
            }
        }
    }

    handleHexClick(hex) {
        // If we have a ship selected and the hex is reachable, move there
        if (this.game.selectedShip) {
            // Only allow movement if it's this ship's turn
            const currentShip = this.game.turnManager.getCurrentShip();
            if (currentShip && currentShip.id === this.game.selectedShip.id) {
                const reachable = this.game.renderer.reachableHexes.find(
                    item => item.hex.equals(hex)
                );

                if (reachable) {
                    this.game.moveShipTo(hex);
                }
            }
        }
    }

    onKeyDown(e) {
        switch (e.key) {
            case 'Escape':
                this.game.deselectShip();
                break;

            case ' ':
            case 'Enter':
                if (this.game.turnManager.isPlayerTurn()) {
                    this.game.endTurn();
                }
                break;

            case '1':
            case '2':
            case '3':
            case '4':
                // Quick weapon select
                const weaponIndex = parseInt(e.key) - 1;
                if (this.game.selectedShip) {
                    const weapon = this.game.selectedShip.weapons[weaponIndex];
                    if (weapon) {
                        this.game.hud.selectWeapon(weaponIndex);
                    }
                }
                break;
        }
    }

    onResize() {
        this.game.renderer.resize();
    }
}

window.InputHandler = InputHandler;
