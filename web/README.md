# Stellar Arena - Web Edition

A turn-based tactical space combat game with hex grid movement, energy management, and drift mechanics.

## How to Run

Simply open `index.html` in a modern web browser (Chrome, Firefox, Edge, Safari).

Or use a local server:

```bash
# Using Python 3
python3 -m http.server 8000

# Using Python 2
python -m SimpleHTTPServer 8000

# Using Node.js (if you have http-server installed)
npx http-server
```

Then navigate to `http://localhost:8000` in your browser.

## How to Play

### Controls

- **Click on your ships** (blue) to select them
- **Click on reachable hexes** (highlighted in blue) to move
- **Click on enemy ships** (red) after selecting a weapon to attack
- **Use number keys 1-4** to quickly select weapons
- **Press Space or Enter** to end your turn
- **Press Escape** to deselect

### Game Mechanics

#### Energy Management
- Adjust sliders to allocate reactor energy between:
  - **Weapons**: Increases weapon damage
  - **Shields**: Increases shield regeneration
  - **Engines**: Increases movement efficiency and drift control

#### Action Points (AP)
- Each ship has AP that refreshes every turn
- Moving costs 1 AP per hex
- Weapons cost AP to fire (shown on weapon buttons)

#### Drift Mechanics
- Ships maintain momentum based on movement
- Orange arrows show velocity vectors
- Moving with drift costs less AP
- Moving against drift costs more AP

#### Combat
- **Energy Weapons**: Instant beam attacks, good range
- **Kinetic Weapons**: Projectiles with travel time, high damage
- **Missiles**: Long range, minimum distance required, high cooldown
- Shields absorb damage first, then armor reduces damage to hull

#### Turn Order
- Initiative determines turn order each round
- Check the Initiative Order panel to see upcoming turns
- Enemy ships move automatically

### Ship Classes

- **Interceptor**: Fast, low armor, good for hit-and-run
- **Corvette**: Balanced stats, versatile combat ship
- **Destroyer**: Heavy armor, powerful weapons, slow movement

## Features

✅ Hex-based tactical movement
✅ Energy allocation system
✅ Action points economy
✅ Drift/momentum mechanics
✅ Multiple weapon types
✅ Shield and armor systems
✅ Initiative-based turn order
✅ Enemy AI
✅ Procedural pixel art ships
✅ Visual effects (beams, projectiles, explosions, particles)
✅ Obstacle terrain

## Technical Stack

- **Pure HTML5 Canvas** - No external dependencies
- **Vanilla JavaScript** - No frameworks
- **Hex Grid Math** - Axial coordinate system
- **A* Pathfinding** - With drift mechanics consideration
- **Procedural Graphics** - Generated sprites and effects

## Project Structure

```
web/
├── index.html              # Main HTML file
├── styles.css              # UI styling
└── js/
    ├── utils/
    │   ├── hex.js          # Hex coordinate math
    │   └── pathfinding.js  # A* pathfinding
    ├── core/
    │   ├── ship.js         # Ship class and combat stats
    │   ├── weapon.js       # Weapon systems and damage calc
    │   ├── grid.js         # Hex grid manager
    │   └── turnManager.js  # Turn order and initiative
    ├── rendering/
    │   ├── renderer.js     # Main rendering engine
    │   ├── sprites.js      # Procedural sprite generation
    │   └── particles.js    # Particle effects system
    ├── ui/
    │   └── hud.js          # HUD controller
    ├── input/
    │   └── inputHandler.js # Mouse and keyboard input
    └── game.js             # Main game loop
```

## Future Enhancements

- [ ] Crew system with abilities
- [ ] More ship classes and weapons
- [ ] Campaign mode with progression
- [ ] More environmental hazards
- [ ] Sound effects and music
- [ ] Save/load game state
- [ ] Multiplayer (hot-seat or online)
- [ ] Mobile touch controls
