#!/usr/bin/env node
import assert from 'node:assert/strict';

globalThis.window = globalThis;

await import('../web/js/utils/hex.js');
await import('../web/js/utils/pathfinding.js');
await import('../web/js/core/weapon.js');
await import('../web/js/core/ship.js');
await import('../web/js/core/grid.js');
await import('../web/js/core/turnManager.js');

const { Ship, SHIP_PRESETS } = globalThis;
const { Grid } = globalThis;
const { TurnManager } = globalThis;
const { HexCoord } = globalThis;

function createShipFromPreset(presetKey, overrides = {}) {
    const preset = structuredClone(SHIP_PRESETS[presetKey]);
    assert(preset, `Preset not found: ${presetKey}`);
    return new Ship({ ...preset, ...overrides });
}

function createScenario({
    playerPresets = ['corvette', 'interceptor'],
    enemyPresets = ['corvette'],
    aiProfiles = [],
    seed = 0
} = {}) {
    const grid = new Grid(15, 15);
    const originalRandom = Math.random;
    globalThis.Math.random = createSeededRandom(seed);

    const playerShips = playerPresets.map((presetKey, index) => {
        const ship = createShipFromPreset(presetKey, {
            id: `player${index + 1}`,
            name: `Player ${index + 1}`,
            team: 'player',
            position: new HexCoord(-5, index * 2 - 1)
        });
        grid.placeShip(ship, ship.position);
        return ship;
    });

    const enemyShips = enemyPresets.map((presetKey, index) => {
        const aiProfile = aiProfiles[index] || 'standard';
        const ship = createShipFromPreset(presetKey, {
            id: `enemy${index + 1}`,
            name: `Enemy ${index + 1}`,
            team: 'enemy',
            position: new HexCoord(5, index * 2 - 1),
            aiProfile
        });
        grid.placeShip(ship, ship.position);
        return ship;
    });

    globalThis.Math.random = originalRandom;
    return { grid, playerShips, enemyShips };
}

function runSimulation({ scenario, maxRounds = 50 } = {}) {
    const { grid } = scenario;
    const turnManager = new TurnManager(grid);
    turnManager.immediateMode = true;
    const stats = {
        rounds: 0,
        turns: 0,
        playerDamage: 0,
        enemyDamage: 0,
        playerLosses: 0,
        enemyLosses: 0,
        winner: 'unknown'
    };

    turnManager.startRound();

    const recordDamage = (attacker, target, result) => {
        const total = (result?.shieldDamage || 0) + (result?.hullDamage || 0);
        if (attacker.team === 'player') {
            stats.enemyDamage += total;
            if (result?.destroyed) stats.enemyLosses += 1;
        } else {
            stats.playerDamage += total;
            if (result?.destroyed) stats.playerLosses += 1;
        }
    };

    const originalDamageCalc = globalThis.WeaponSystem.calculateDamage;
    globalThis.WeaponSystem.calculateDamage = (attackData) => {
        const outcome = originalDamageCalc(attackData);
        recordDamage(attackData.attacker, attackData.target, outcome);
        return outcome;
    };

    while (stats.rounds < maxRounds) {
        stats.rounds = turnManager.turnNumber;
        const active = turnManager.getCurrentShip();
        if (!active) break;

        stats.turns += 1;

        if (active.team === 'player') {
            active.startTurn();
            simulatePlayerTurn(active, turnManager);
            turnManager.nextTurn();
        } else {
            turnManager.processEnemyTurn({ layout: { hexToPixel: () => ({ x: 0, y: 0 }) }, addDamageIndicator() {}, addBeam() {}, addProjectile() {}, addExplosion() {} }, null);
        }

        const playerRemaining = scenario.playerShips.filter(ship => !ship.isDestroyed);
        const enemyRemaining = scenario.enemyShips.filter(ship => !ship.isDestroyed);

        if (playerRemaining.length === 0) {
            stats.winner = 'enemy';
            break;
        }
        if (enemyRemaining.length === 0) {
            stats.winner = 'player';
            break;
        }
    }

    globalThis.WeaponSystem.calculateDamage = originalDamageCalc;
    return stats;
}

function simulatePlayerTurn(ship, turnManager) {
    const grid = turnManager.grid;
    if (ship.actionPoints <= 0 || ship.energy <= 0) return;

    const enemies = grid.getShipsByTeam('enemy').filter(enemy => !enemy.isDestroyed);
    if (enemies.length === 0) return;

    enemies.sort((a, b) => {
        const threatA = a.weapons.reduce((sum, w) => sum + (w.damage || 0), 0);
        const threatB = b.weapons.reduce((sum, w) => sum + (w.damage || 0), 0);
        if (threatA !== threatB) return threatB - threatA;
        const distA = ship.position.distance(a.position);
        const distB = ship.position.distance(b.position);
        return distA - distB;
    });

    const target = enemies[0];
    if (!target) return;

    maybeUsePlayerAbility(ship, target, turnManager);

    const attackPlan = choosePlayerWeapon(ship, target);
    if (attackPlan) {
        const attackData = ship.fireWeapon(attackPlan.index, target);
        if (attackData) {
            globalThis.WeaponSystem.calculateDamage(attackData);
            return;
        }
    }

    const path = grid.findPath(ship.position, target.position, ship);
    if (!path || path.length === 0) return;

    const movePath = path.slice(0, 1);
    ship.move(movePath, grid);
}

function choosePlayerWeapon(ship, target) {
    let best = null;
    ship.weapons.forEach((weapon, index) => {
        const distance = ship.position.distance(target.position);
        if (distance > weapon.maxRange || distance < weapon.minRange) return;
        if (!ship.canFireWeapon(weapon, target)) return;
        const expected = weapon.damage || 0;
        if (!best || expected > best.expected) {
            best = { index, weapon, expected };
        }
    });
    return best;
}

function maybeUsePlayerAbility(ship, target, turnManager) {
    if (!ship.abilities || ship.abilities.length === 0) return;

    const hullRatio = ship.hull / Math.max(1, ship.maxHull);
    const shieldRatio = ship.maxShield ? ship.shield / ship.maxShield : 0;

    for (let i = 0; i < ship.abilities.length; i++) {
        const ability = ship.abilities[i];
        if (!ship.canUseAbility(ability)) continue;

        if (ability.key === 'shieldSurge' && (shieldRatio < 0.5 || hullRatio < 0.6)) {
            if (ship.useAbility(i, { game: null, renderer: null })) return;
        }

        if (ability.key === 'evasiveManeuver' && hullRatio < 0.45) {
            if (ship.useAbility(i, { game: null, renderer: null })) return;
        }

        if (ability.key === 'weaponOvercharge' && target && !target.isDestroyed) {
            if (ship.useAbility(i, { game: { grid: turnManager.grid }, renderer: null })) return;
       }

        if (ability.key === 'burstEngines' && turnManager) {
            if (ship.useAbility(i, { game: { grid: turnManager.grid }, renderer: null })) return;
        }

        if (ability.key === 'empBurst' && turnManager) {
            const enemies = turnManager.grid.getShipsByTeam('enemy').filter(e => !e.isDestroyed && ship.position.distance(e.position) <= 3);
            if (enemies.length > 0) {
                if (ship.useAbility(i, { game: { grid: turnManager.grid }, renderer: null })) return;
            }
        }
    }
}

function createSeededRandom(seed = 0) {
    let value = seed % 2147483647;
    if (value <= 0) value += 2147483646;
    return () => (value = value * 16807 % 2147483647) / 2147483647;
}

function simulateBatch({ scenarios, iterations = 5, maxRounds = 50 }) {
    const quiet = process.env.SIM_VERBOSE !== '1';
    const originalConsole = { ...console };
    if (quiet) {
        console.log = () => {};
        console.warn = () => {};
    }

    const report = [];

    scenarios.forEach((scenarioConfig, idx) => {
        const aggregate = {
            index: idx,
            config: scenarioConfig,
            wins: 0,
            losses: 0,
            avgRounds: 0,
            avgTurns: 0,
            avgPlayerDamage: 0,
            avgEnemyDamage: 0
        };

        for (let i = 0; i < iterations; i++) {
            const scenario = createScenario({ ...scenarioConfig, seed: i + 1 });
            const result = runSimulation({ scenario, maxRounds });
            if (result.winner === 'player') aggregate.wins += 1;
            if (result.winner === 'enemy') aggregate.losses += 1;
            aggregate.avgRounds += result.rounds;
            aggregate.avgTurns += result.turns;
            aggregate.avgPlayerDamage += result.playerDamage;
            aggregate.avgEnemyDamage += result.enemyDamage;
        }

        const divisor = iterations || 1;
        aggregate.avgRounds = (aggregate.avgRounds / divisor).toFixed(2);
        aggregate.avgTurns = (aggregate.avgTurns / divisor).toFixed(2);
        aggregate.avgPlayerDamage = (aggregate.avgPlayerDamage / divisor).toFixed(1);
        aggregate.avgEnemyDamage = (aggregate.avgEnemyDamage / divisor).toFixed(1);
        report.push(aggregate);
    });

    if (quiet) {
        console.log = originalConsole.log;
        console.warn = originalConsole.warn;
    }

    return report;
}

function prettyPrint(report) {
    console.log('\n=== AI Simulation Report ===');
    report.forEach(entry => {
        console.log(`Scenario ${entry.index + 1}`);
        const playerList = entry.config.playerPresets || ['(default)'];
        const enemyList = entry.config.enemyPresets || ['(default)'];
        const profileList = entry.config.aiProfiles || [];
        console.log(`  Player Presets: ${playerList.join(', ')}`);
        console.log(`  Enemy Presets:  ${enemyList.join(', ')}`);
        console.log(`  AI Profiles:     ${profileList.length ? profileList.join(', ') : 'auto'}`);
        console.log(`  Wins: ${entry.wins}, Losses: ${entry.losses}`);
        console.log(`  Avg Rounds: ${entry.avgRounds}, Avg Turns: ${entry.avgTurns}`);
        console.log(`  Avg Player Damage: ${entry.avgPlayerDamage}`);
        console.log(`  Avg Enemy Damage:  ${entry.avgEnemyDamage}`);
        console.log('');
    });
}

function parseArgs() {
    const args = process.argv.slice(2);
    const configArgIndex = args.indexOf('--config');
    let config = null;
    if (configArgIndex !== -1 && args[configArgIndex + 1]) {
        config = JSON.parse(args[configArgIndex + 1]);
    }
    const iterationsIndex = args.indexOf('--iterations');
    const maxRoundsIndex = args.indexOf('--maxRounds');
    const iterations = iterationsIndex !== -1 && args[iterationsIndex + 1]
        ? parseInt(args[iterationsIndex + 1], 10)
        : 5;
    const maxRounds = maxRoundsIndex !== -1 && args[maxRoundsIndex + 1]
        ? parseInt(args[maxRoundsIndex + 1], 10)
        : 50;

    if (args.includes('--verbose')) {
        process.env.SIM_VERBOSE = '1';
    }

    return { config, iterations, maxRounds };
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const { config, iterations, maxRounds } = parseArgs();
    const scenarios = config?.scenarios || [
        { enemyPresets: ['corvette'], aiProfiles: ['cautious'] },
        { enemyPresets: ['interceptor', 'corvette'], aiProfiles: ['skirmisher', 'cautious'] }
    ];
    const report = simulateBatch({ scenarios, iterations, maxRounds });
    prettyPrint(report);
}

export {
    createScenario,
    runSimulation,
    simulateBatch,
    prettyPrint
};
