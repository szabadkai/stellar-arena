import assert from 'node:assert/strict';

globalThis.window = globalThis;

const log = (...args) => console.log('[test]', ...args);

async function loadModules() {
    await import('../web/js/utils/hex.js');
    await import('../web/js/utils/pathfinding.js');
    await import('../web/js/core/weapon.js');
    await import('../web/js/core/ship.js');
    await import('../web/js/core/grid.js');
    await import('../web/js/core/turnManager.js');
}

const tests = [];

function test(name, fn) {
    tests.push({ name, fn });
}

test('PathFinder navigates around obstacles', () => {
    const { HexCoord } = globalThis;
    const { Grid } = globalThis;
    const { Ship } = globalThis;

    const grid = new Grid(9, 9);
    const ship = new Ship({
        id: 'tester',
        name: 'Test Ship',
        position: new HexCoord(0, 0),
        team: 'player',
        weapons: []
    });
    grid.placeShip(ship, ship.position);

    const start = ship.position;
    const goal = new HexCoord(2, -2);

    const path = grid.findPath(start, goal, ship);

    assert.ok(path, 'Expected a valid path');
    assert.equal(path.length, 2, 'Path should contain two steps to reach the goal');
    assert.equal(path[path.length - 1].toString(), goal.toString(), 'Path should end at goal');
});

test('TurnManager sorts ships by initiative', () => {
    const { Grid } = globalThis;
    const { Ship } = globalThis;
    const { TurnManager } = globalThis;
    const { HexCoord } = globalThis;

    const grid = new Grid(7, 7);

    const slowEnemy = new Ship({
        id: 'enemy-slow',
        name: 'Slow Enemy',
        position: new HexCoord(2, 0),
        team: 'enemy',
        weapons: []
    });
    slowEnemy.rollInitiative = () => {
        slowEnemy.initiative = 20;
        return 20;
    };

    const fastEnemy = new Ship({
        id: 'enemy-fast',
        name: 'Fast Enemy',
        position: new HexCoord(3, -1),
        team: 'enemy',
        weapons: []
    });
    fastEnemy.rollInitiative = () => {
        fastEnemy.initiative = 45;
        return 45;
    };

    const player = new Ship({
        id: 'player-1',
        name: 'Player One',
        position: new HexCoord(-2, 0),
        team: 'player',
        weapons: []
    });
    player.rollInitiative = () => {
        player.initiative = 30;
        return 30;
    };

    grid.placeShip(player, player.position);
    grid.placeShip(slowEnemy, slowEnemy.position);
    grid.placeShip(fastEnemy, fastEnemy.position);

    const turnManager = new TurnManager(grid);
    turnManager.startRound();

    const queue = turnManager.getInitiativeQueue();
    const firstShip = queue[0].ship;
    const secondShip = queue[1].ship;
    const thirdShip = queue[2].ship;

    assert.equal(firstShip.id, 'enemy-fast', 'Fast enemy should have highest initiative');
    assert.equal(secondShip.id, 'player-1', 'Player should act before the slow enemy');
    assert.equal(thirdShip.id, 'enemy-slow', 'Slow enemy should be last');

    // Turn manager increments index when starting the round
    assert.equal(turnManager.currentShipIndex, 1, 'Manager should advance to the second ship after starting the round');
    assert.equal(turnManager.getCurrentShip().id, 'player-1', 'Player should be active after first advancement');

    turnManager.nextTurn();
    assert.equal(turnManager.getCurrentShip().id, 'enemy-slow', 'Next turn should rotate to the remaining enemy');
});

async function run() {
    await loadModules();

    let passed = 0;

    for (const { name, fn } of tests) {
        try {
            fn();
            log(`✔ ${name}`);
            passed++;
        } catch (error) {
            log(`✖ ${name}`);
            console.error(error);
            process.exitCode = 1;
        }
    }

    log(`${passed}/${tests.length} tests passed`);
}

run().catch(err => {
    console.error(err);
    process.exitCode = 1;
});
