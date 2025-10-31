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

        // Initialize sound on first user interaction
        document.addEventListener('click', () => {
            this.sound.init();
        }, { once: true });

        // Make app globally available
        window.app = this;

        console.log('Stellar Arena initialized');
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

        // Setup battle with fleets
        this.game.setupGame(playerFleet, enemyFleet);
    }

    onBattleEnd(victory, playerShips, enemyShips) {
        console.log('Battle ended. Victory:', victory);

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
        setTimeout(() => {
            this.menuManager.showPostBattle(victory);
        }, 2000);
    }
}

// Initialize app when page loads
window.addEventListener('load', () => {
    new App();
});

window.App = App;
