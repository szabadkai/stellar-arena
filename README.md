# Stellar Arena

Turn-based tactical space combat game with hex-grid movement, energy management, and roguelike campaign progression.

## Features

- **Hex-Grid Combat**: Tactical turn-based battles on a 15x15 hex grid
- **Energy Management**: Allocate reactor energy between weapons, shields, and engines
- **Drift Mechanics**: Ships maintain momentum - plan your moves carefully!
- **Multiple Ship Classes**: Interceptors, Corvettes, and Destroyers with unique stats
- **Weapon Variety**: Energy beams, kinetic projectiles, and missiles
- **Campaign Mode**: 5-battle runs with escalating difficulty
- **Fleet Building**: Choose and upgrade your ships between battles
- **Persistence**: Progress saved automatically in browser localStorage

## Development

### Prerequisites

- Node.js (v16 or higher)
- npm

### Setup

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

### Development Server

The dev server runs on `http://localhost:3000` with hot module replacement.

### Production Build

Build outputs to the `/docs` folder for easy GitHub Pages deployment.

```bash
npm run build
```

## Deployment to GitHub Pages

1. Build the project:
   ```bash
   npm run build
   ```

2. Commit the `docs/` folder:
   ```bash
   git add docs/
   git commit -m "Build for GitHub Pages"
   git push
   ```

3. Enable GitHub Pages in repository settings:
   - Go to Settings > Pages
   - Set Source to "Deploy from a branch"
   - Select "main" branch and "/docs" folder
   - Click Save

4. Your game will be live at `https://[username].github.io/stellar-arena/`

## Project Structure

```
stellar-arena/
├── web/                    # Source files
│   ├── index.html         # Main HTML file
│   ├── styles.css         # All styles
│   ├── main.js            # Vite entry point
│   ├── favicon.svg        # Favicon
│   └── js/
│       ├── utils/         # Hex math, pathfinding
│       ├── core/          # Ship, grid, weapon, turn systems
│       ├── rendering/     # Canvas renderer, particles, sprites
│       ├── input/         # Mouse/keyboard handling
│       ├── ui/            # HUD and menu management
│       └── campaign/      # Campaign and progression systems
├── docs/                  # Built output (for GitHub Pages)
├── vite.config.js         # Vite configuration
└── package.json           # Dependencies and scripts
```

## Game Controls

- **Click** to select ships and targets
- **Click hex** to move selected ship
- **Select weapon** then click enemy to fire
- **End Turn** button to pass turn to next ship
- Energy sliders allocate power between systems

## Tech Stack

- **Vanilla JavaScript** - No frameworks, just pure JS
- **HTML5 Canvas** - For rendering hex grid and effects
- **CSS3** - For UI styling
- **Vite** - Build tool and dev server
- **localStorage** - For save persistence

## License

MIT

## Credits

Created by lszabadkai
Inspired by Mortal Glory, Into the Breach, and FTL
