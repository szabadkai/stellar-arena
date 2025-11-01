// Main application coordinator

class App {
    constructor() {
        this.modal = new ModalManager();
        this.combatLog = new CombatLog();
        this.progression = new ProgressionSystem();
        this.campaign = new CampaignManager(this.progression);
        this.sound = new SoundSystem();
        this.menuManager = new MenuManager(this.campaign, this.progression, this.sound, this.modal);
        this.game = null;
        this._postBattleTimer = null;
        this.lastBattleSummary = null;

        // Initialize sound on first user interaction
        document.addEventListener('click', () => {
            this.sound.init();
        }, { once: true });

        // Make app globally available
        window.app = this;

        // Setup abilities guide
        this.setupAbilitiesGuide();

        console.log('Stellar Arena initialized');
    }

    setupAbilitiesGuide() {
        const guideBtn = document.getElementById('abilities-guide-btn');
        const overlay = document.getElementById('abilities-guide-overlay');
        const closeBtn = document.getElementById('close-abilities-guide-btn');
        const content = document.getElementById('abilities-guide-content');

        guideBtn.addEventListener('click', () => {
            this.populateAbilitiesGuide(content);
            overlay.style.display = 'flex';
        });

        closeBtn.addEventListener('click', () => {
            overlay.style.display = 'none';
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.style.display = 'none';
            }
        });
    }

    populateAbilitiesGuide(container) {
        container.innerHTML = '';

        // Get all abilities from ABILITY_LIBRARY
        const abilities = window.ABILITY_LIBRARY || {};

        Object.entries(abilities).forEach(([key, abilityFactory]) => {
            const ability = abilityFactory();

            const card = document.createElement('div');
            card.className = 'ability-guide-card';

            const header = document.createElement('div');
            header.className = 'ability-header';

            const icon = document.createElement('div');
            icon.className = 'ability-icon';
            icon.textContent = ability.icon || '⚡';

            const name = document.createElement('div');
            name.className = 'ability-name';
            name.textContent = ability.name;

            header.appendChild(icon);
            header.appendChild(name);

            const description = document.createElement('div');
            description.className = 'ability-description';
            description.textContent = ability.description;

            const stats = document.createElement('div');
            stats.className = 'ability-stats';

            const rangeDesc = typeof ability.getRangeDescription === 'function'
                ? ability.getRangeDescription()
                : 'N/A';

            stats.innerHTML = `
                <div class="ability-stat"><span class="label">⚡</span> ${ability.energyCost} Energy</div>
                <div class="ability-stat"><span class="label">⏱</span> ${ability.apCost} AP</div>
                <div class="ability-stat"><span class="label">❄️</span> ${ability.cooldown} turn cooldown</div>
                <div class="ability-stat"><span class="label">📏</span> ${rangeDesc}</div>
            `;

            card.appendChild(header);
            card.appendChild(description);
            card.appendChild(stats);

            container.appendChild(card);
        });
    }

    startBattle() {
        // Get player fleet from campaign
        const playerFleet = this.campaign.getFleet();

        // Generate enemy fleet
        const enemyFleet = this.campaign.generateEnemyFleet(this.campaign.battleNumber);

        // Create game instance if it doesn't exist
        if (!this.game) {
            this.game = new Game(this.sound, this.modal, this.combatLog);
        }

        // Clear combat log for new battle
        this.combatLog.clear();
        this.lastBattleSummary = null;

        // Setup battle with fleets
        this.game.setupGame(playerFleet, enemyFleet);
    }

    onBattleEnd(victory, playerShips, enemyShips, battleSummary = null) {
        console.log('Battle ended. Victory:', victory);
        this.lastBattleSummary = battleSummary;

        // Play victory/defeat sound
        if (victory) {
            this.sound.playVictory();
            // Process victory
            const results = this.campaign.battleVictory(playerShips, enemyShips);
            console.log('Victory results:', results);
        } else {
            this.sound.playDefeat();
            // Process defeat
            this.campaign.battleDefeat();
        }

        // Show post-battle screen after a delay
        if (this._postBattleTimer) {
            clearTimeout(this._postBattleTimer);
        }

        this._postBattleTimer = setTimeout(() => {
            this.menuManager.showPostBattle(victory, this.lastBattleSummary);
            this._postBattleTimer = null;
        }, 2000);
    }

    showPostBattleImmediately(victory) {
        if (this._postBattleTimer) {
            clearTimeout(this._postBattleTimer);
            this._postBattleTimer = null;
        }

        this.menuManager.showPostBattle(victory, this.lastBattleSummary);
    }
}

// Initialize app when page loads
window.addEventListener('load', () => {
    new App();
});

window.App = App;
