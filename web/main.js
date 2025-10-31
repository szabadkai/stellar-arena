// Vite entry point - imports all modules in correct order

// Utils
import './js/utils/hex.js';
import './js/utils/pathfinding.js';

// Core systems
import './js/core/weapon.js';
import './js/core/ship.js';
import './js/core/grid.js';
import './js/core/turnManager.js';

// Rendering
import './js/rendering/sprites.js';
import './js/rendering/particles.js';
import './js/rendering/renderer.js';

// Audio
import './js/audio/soundSystem.js';

// Input
import './js/input/inputHandler.js';

// UI
import './js/ui/hud.js';
import './js/ui/modalManager.js';
import './js/ui/combatLog.js';
import './js/ui/menuManager.js';

// Campaign
import './js/campaign/progression.js';
import './js/campaign/campaignManager.js';
import './js/campaign/upgrades.js';

// Game
import './js/game.js';
import './js/app.js';
