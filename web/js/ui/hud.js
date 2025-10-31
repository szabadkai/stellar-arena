// HUD controller for managing UI updates

class HUD {
    constructor(game) {
        this.game = game;

        // Get DOM elements
        this.turnNumber = document.getElementById('turn-number');
        this.shipName = document.getElementById('ship-name');
        this.hullBar = document.getElementById('hull-bar');
        this.hullText = document.getElementById('hull-text');
        this.shieldBar = document.getElementById('shield-bar');
        this.shieldText = document.getElementById('shield-text');
        this.energyBar = document.getElementById('energy-bar');
        this.energyText = document.getElementById('energy-text');
        this.apText = document.getElementById('ap-text');

        // Energy allocation sliders
        this.weaponsSlider = document.getElementById('weapons-slider');
        this.shieldsSlider = document.getElementById('shields-slider');
        this.enginesSlider = document.getElementById('engines-slider');

        this.weaponsAlloc = document.getElementById('weapons-alloc');
        this.shieldsAlloc = document.getElementById('shields-alloc');
        this.enginesAlloc = document.getElementById('engines-alloc');

        this.weaponButtons = document.getElementById('weapon-buttons');
        this.queueList = document.getElementById('queue-list');

        // Track which ship we last updated weapons for
        this.lastWeaponUpdateShipId = null;

        // Setup event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Energy allocation sliders
        this.weaponsSlider.addEventListener('input', () => this.updateEnergyAllocation());
        this.shieldsSlider.addEventListener('input', () => this.updateEnergyAllocation());
        this.enginesSlider.addEventListener('input', () => this.updateEnergyAllocation());
    }

    update() {
        this.updateTurnInfo();
        this.updateShipInfo();
        this.updateInitiativeQueue();
    }

    updateTurnInfo() {
        this.turnNumber.textContent = this.game.turnManager.turnNumber;
    }

    updateShipInfo() {
        const ship = this.game.selectedShip;

        if (!ship) {
            this.shipName.textContent = 'Select a ship';
            return;
        }

        // Check if it's this ship's turn
        const currentShip = this.game.turnManager.getCurrentShip();
        const isThisShipsTurn = currentShip && currentShip.id === ship.id;

        this.shipName.textContent = ship.name + (isThisShipsTurn ? ' [ACTIVE]' : '');

        // Hull
        const hullPercent = (ship.hull / ship.maxHull) * 100;
        this.hullBar.style.width = `${hullPercent}%`;
        this.hullText.textContent = `${Math.floor(ship.hull)}/${ship.maxHull}`;

        // Shield
        const shieldPercent = (ship.shield / ship.maxShield) * 100;
        this.shieldBar.style.width = `${shieldPercent}%`;
        this.shieldText.textContent = `${Math.floor(ship.shield)}/${ship.maxShield}`;

        // Energy
        const energyPercent = (ship.energy / ship.maxEnergy) * 100;
        this.energyBar.style.width = `${energyPercent}%`;
        this.energyText.textContent = `${Math.floor(ship.energy)}/${ship.maxEnergy}`;

        // AP
        this.apText.textContent = `${ship.actionPoints}/${ship.maxActionPoints}`;

        // Energy allocation
        this.updateEnergySliders(ship);

        // Weapons - only update if ship changed or turn changed
        // (reuse currentShip from above)
        const shipKey = `${ship.id}_${currentShip?.id}`;

        // Only rebuild buttons if the selected ship or active ship changed
        if (this.lastWeaponUpdateShipId !== shipKey) {
            this.lastWeaponUpdateShipId = shipKey;
            this.updateWeaponButtons(ship);
        } else {
            // Just update button states without rebuilding
            this.updateWeaponButtonStates(ship);
        }
    }

    updateEnergySliders(ship) {
        // Update slider positions (discrete points)
        this.weaponsSlider.value = ship.energyAllocation.weapons;
        this.shieldsSlider.value = ship.energyAllocation.shields;
        this.enginesSlider.value = ship.energyAllocation.engines;

        // Update labels to show discrete points
        this.weaponsAlloc.textContent = `${ship.energyAllocation.weapons}`;
        this.shieldsAlloc.textContent = `${ship.energyAllocation.shields}`;
        this.enginesAlloc.textContent = `${ship.energyAllocation.engines}`;

        // Disable sliders if not this ship's turn or not enough AP
        const currentShip = this.game.turnManager.getCurrentShip();
        const isThisShipsTurn = currentShip && currentShip.id === ship.id;
        const hasAPForChange = ship.actionPoints >= 1;

        const canAdjust = isThisShipsTurn && hasAPForChange;

        this.weaponsSlider.disabled = !canAdjust;
        this.shieldsSlider.disabled = !canAdjust;
        this.enginesSlider.disabled = !canAdjust;
    }

    updateEnergyAllocation() {
        const ship = this.game.selectedShip;
        if (!ship || ship.team !== 'player') return;

        const weapons = parseInt(this.weaponsSlider.value);
        const shields = parseInt(this.shieldsSlider.value);
        const engines = parseInt(this.enginesSlider.value);

        // Normalize to maxAllocationPoints (10)
        const total = weapons + shields + engines;
        if (total > 0) {
            const factor = ship.maxAllocationPoints / total;
            const normalizedWeapons = Math.round(weapons * factor);
            const normalizedShields = Math.round(shields * factor);
            const normalizedEngines = ship.maxAllocationPoints - normalizedWeapons - normalizedShields;

            const success = ship.setEnergyAllocation(normalizedWeapons, normalizedShields, normalizedEngines);

            if (!success) {
                // Not enough AP or invalid allocation
                this.showMessage('Need 1 AP to change energy allocation!', 'error', 2000);
                // Revert sliders to current allocation
                this.updateEnergySliders(ship);
                return;
            }

            // Log energy allocation change
            if (this.game.combatLog) {
                this.game.combatLog.logEnergyAllocation(ship.name);
            }
        }

        // Update display
        this.weaponsAlloc.textContent = ship.energyAllocation.weapons;
        this.shieldsAlloc.textContent = ship.energyAllocation.shields;
        this.enginesAlloc.textContent = ship.energyAllocation.engines;

        // Update ship info to reflect new AP
        this.updateShipInfo();
    }

    // Update button states (text, enabled/disabled) without rebuilding
    updateWeaponButtonStates(ship) {
        const currentShip = this.game.turnManager.getCurrentShip();
        const isThisShipsTurn = currentShip && currentShip.id === ship.id;

        const buttons = this.weaponButtons.querySelectorAll('.weapon-btn');

        buttons.forEach((button, index) => {
            const weapon = ship.weapons[index];
            if (!weapon) return;

            // Update text with clearer formatting
            let text = `${weapon.name}\n`;
            text += `⚡${weapon.energyCost}E  ⏱${weapon.apCost}AP  📏${weapon.minRange}-${weapon.maxRange}`;

            if (weapon.cooldownRemaining > 0) {
                text += `  ❄️${weapon.cooldownRemaining}`;
            }

            button.textContent = text;

            // Update enabled/disabled state
            const hasResources = ship.energy >= weapon.energyCost &&
                                ship.actionPoints >= weapon.apCost &&
                                weapon.cooldownRemaining === 0;

            button.classList.toggle('disabled', !hasResources || !isThisShipsTurn);
            button.disabled = !isThisShipsTurn;

            // Maintain active state
            button.classList.toggle('active', this.game.selectedWeapon === weapon);
        });
    }

    updateWeaponButtons(ship) {
        this.weaponButtons.innerHTML = '';

        // Check if it's this ship's turn
        const currentShip = this.game.turnManager.getCurrentShip();
        const isThisShipsTurn = currentShip && currentShip.id === ship.id;

        ship.weapons.forEach((weapon, index) => {

            const button = document.createElement('button');
            button.className = 'weapon-btn';

            // Format text with clearer info
            let text = `${weapon.name}\n`;
            text += `⚡${weapon.energyCost}E  ⏱${weapon.apCost}AP  📏${weapon.minRange}-${weapon.maxRange}`;

            if (weapon.cooldownRemaining > 0) {
                text += `  ❄️${weapon.cooldownRemaining}`;
            }

            button.textContent = text;

            // Check if weapon can be used
            const hasResources = ship.energy >= weapon.energyCost &&
                                ship.actionPoints >= weapon.apCost &&
                                weapon.cooldownRemaining === 0;

            const canUse = hasResources && isThisShipsTurn;

            if (!hasResources) {
                button.classList.add('disabled');
            }

            if (!isThisShipsTurn) {
                button.disabled = true;
                button.classList.add('disabled');
            }

            // Always add click handler - let selectWeapon do the validation
            button.addEventListener('click', (e) => {
                this.selectWeapon(index);
            });

            // Check if this weapon is currently selected
            if (this.game.selectedWeapon === weapon) {
                button.classList.add('active');
            }

            this.weaponButtons.appendChild(button);
        });
    }

    selectWeapon(index) {
        const ship = this.game.selectedShip;
        if (!ship) return;

        // Check if it's this ship's turn
        const currentShip = this.game.turnManager.getCurrentShip();
        const isThisShipsTurn = currentShip && currentShip.id === ship.id;

        if (!isThisShipsTurn) {
            this.showMessage("It's not this ship's turn!", 'error', 2000);
            return;
        }

        const weapon = ship.weapons[index];

        // Check resources
        const hasEnergy = ship.energy >= weapon.energyCost;
        const hasAP = ship.actionPoints >= weapon.apCost;
        const notOnCooldown = weapon.cooldownRemaining === 0;

        if (!hasEnergy || !hasAP || !notOnCooldown) {
            if (!hasEnergy) this.showMessage('Not enough energy!', 'error', 2000);
            else if (!hasAP) this.showMessage('Not enough AP!', 'error', 2000);
            else if (!notOnCooldown) this.showMessage('Weapon on cooldown!', 'error', 2000);
            return;
        }

        // Clear previous selection
        const buttons = this.weaponButtons.querySelectorAll('.weapon-btn');
        buttons.forEach(btn => btn.classList.remove('active'));

        // Toggle weapon selection
        if (this.game.selectedWeapon === weapon) {
            // Deselect
            this.game.selectedWeapon = null;
            this.game.renderer.setSelectedWeapon(null);
            this.showMessage('Weapon deselected', 'info', 1500);
        } else {
            // Select new weapon
            buttons[index].classList.add('active');
            this.game.selectedWeapon = weapon;
            this.game.renderer.setSelectedWeapon(weapon);
            this.showMessage(`${weapon.name} selected - Click enemy to attack`, 'success', 2000);
        }
    }

    updateInitiativeQueue() {
        this.queueList.innerHTML = '';

        const queue = this.game.turnManager.getInitiativeQueue();

        queue.forEach(({ ship, isActive }) => {
            const item = document.createElement('div');
            item.className = 'queue-item';

            if (isActive) {
                item.classList.add('active');
            }

            if (ship.team === 'enemy') {
                item.classList.add('enemy');
            }

            item.textContent = `${ship.name} (Init: ${ship.initiative})`;

            this.queueList.appendChild(item);
        });
    }

    showMessage(message, type = 'info', duration = 3000) {
        const container = document.getElementById('message-container');

        const messageEl = document.createElement('div');
        messageEl.className = `game-message ${type}`;
        messageEl.textContent = message;

        container.appendChild(messageEl);

        // Remove after duration
        setTimeout(() => {
            messageEl.remove();
        }, duration);
    }

    showDamage(ship, damage) {
        this.showMessage(`${ship.name} took ${Math.floor(damage)} damage!`, 'warning', 2000);
    }
}

window.HUD = HUD;
