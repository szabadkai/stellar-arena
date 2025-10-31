// Combat log manager

class CombatLog {
    constructor() {
        this.container = document.getElementById('combat-log');
        this.entriesContainer = document.getElementById('combat-log-entries');
        this.toggleBtn = document.getElementById('combat-log-toggle');
        this.clearBtn = document.getElementById('combat-log-clear');
        this.isCollapsed = true;

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.toggleBtn.addEventListener('click', () => {
            this.toggle();
        });

        this.clearBtn.addEventListener('click', () => {
            this.clear();
        });
    }

    toggle() {
        this.isCollapsed = !this.isCollapsed;

        if (this.isCollapsed) {
            this.container.classList.add('collapsed');
            this.toggleBtn.textContent = '▼';
        } else {
            this.container.classList.remove('collapsed');
            this.toggleBtn.textContent = '▲';
        }
    }

    addEntry(message, category = 'info') {
        const entry = document.createElement('div');
        entry.className = `log-entry ${category}`;

        const timestamp = new Date().toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        entry.innerHTML = `
            <span class="log-timestamp">${timestamp}</span>
            <span class="log-message">${message}</span>
        `;

        this.entriesContainer.appendChild(entry);

        // Auto-scroll to bottom
        this.entriesContainer.scrollTop = this.entriesContainer.scrollHeight;

        // Limit to last 100 entries to prevent memory issues
        const entries = this.entriesContainer.querySelectorAll('.log-entry');
        if (entries.length > 100) {
            entries[0].remove();
        }
    }

    clear() {
        this.entriesContainer.innerHTML = '';
        this.addEntry('Combat log cleared', 'info');
    }

    // Convenience methods for different log types
    logInfo(message) {
        this.addEntry(message, 'info');
    }

    logSuccess(message) {
        this.addEntry(message, 'success');
    }

    logWarning(message) {
        this.addEntry(message, 'warning');
    }

    logError(message) {
        this.addEntry(message, 'error');
    }

    logEnemy(message) {
        this.addEntry(message, 'enemy');
    }

    // Game event handlers
    logTurnStart(shipName, turnNumber) {
        this.addEntry(`Turn ${turnNumber}: ${shipName}'s turn begins`, 'info');
    }

    logMovement(shipName, distance) {
        this.addEntry(`${shipName} moved ${distance} hexes`, 'info');
    }

    logWeaponFire(attackerName, weaponName, targetName) {
        this.addEntry(`${attackerName} fires ${weaponName} at ${targetName}`, 'warning');
    }

    logAbilityUse(shipName, abilityName) {
        this.addEntry(`${shipName} uses ${abilityName}`, 'info');
    }

    logDamage(targetName, shieldDamage, hullDamage) {
        if (shieldDamage > 0 && hullDamage > 0) {
            this.addEntry(`${targetName} took ${Math.floor(shieldDamage)} shield damage and ${Math.floor(hullDamage)} hull damage`, 'error');
        } else if (shieldDamage > 0) {
            this.addEntry(`${targetName}'s shields absorbed ${Math.floor(shieldDamage)} damage`, 'warning');
        } else if (hullDamage > 0) {
            this.addEntry(`${targetName} took ${Math.floor(hullDamage)} hull damage`, 'error');
        }
    }

    logDestruction(shipName) {
        this.addEntry(`💥 ${shipName} DESTROYED!`, 'error');
    }

    logEnergyAllocation(shipName) {
        this.addEntry(`${shipName} reallocated energy`, 'info');
    }

    logVictory() {
        this.addEntry('🎉 VICTORY! All enemy ships destroyed!', 'success');
    }

    logDefeat() {
        this.addEntry('💀 DEFEAT! All player ships destroyed!', 'error');
    }

    logRoundStart(roundNumber) {
        this.addEntry(`═══ Round ${roundNumber} ═══`, 'info');
    }
}

window.CombatLog = CombatLog;
