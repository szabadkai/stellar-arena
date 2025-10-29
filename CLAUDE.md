# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Stellar Arena** is a turn-based tactical roguelike space combat game built in Godot 4.5. The game translates Mortal Glory's gladiator combat into a sci-fi space setting with orbital mechanics, energy management, and crew permadeath systems.

**Key Inspirations:** Mortal Glory, Into the Breach, FTL, Children of a Dead Earth

## Development Environment

### Running the Project

- **Open in Godot Editor:** Launch `/Users/lszabadkai/Applications/Godot Engine.app` and open the project
- **Run the game:** Press F5 in Godot Editor or use `Project > Run Project`
- **Run current scene:** Press F6 in Godot Editor

### Project Structure

The project follows Godot's resource-based architecture:

```
MainMenu
├── CampaignSelect
├── Shipyard (pre-combat phase)
└── Arena (combat phase)
    ├── GridManager (hex grid system)
    ├── TurnManager (initiative queue)
    ├── ShipNode (inherits CharacterBody3D)
    └── UI/HUD
```

## Core Game Systems

### 1. Hex Grid Combat System
- 15x15 hexagonal grid for tactical battles
- Custom A* pathfinding that accounts for drift mechanics
- Grid coordinates and line-of-sight calculations
- Spatial hazards (asteroid fields, debris clouds, solar flares, wormholes)

### 2. Ship System (ShipNode)
- Inherits from CharacterBody3D for 3D physics
- **Energy Management:** Reactor generates energy per turn, allocated to Weapons/Shields/Engines
- **Action Points (AP):** Used for movement and actions per turn
- **Velocity Vectors:** Ships maintain momentum and drift
- **Systems:** Hull, shields, armor, weapons, sensors
- Ship classes: Interceptor, Corvette, Destroyer, Carrier, Support

### 3. Crew System
- Each ship has 1-3 crew members with:
  - Active ability (once per battle)
  - Passive trait (always active)
  - Morale system affecting performance
- Crew can be incapacitated (ship survives) or killed (permanent loss)
- Survivors gain experience and unlock traits

### 4. Turn Manager
- Initiative-based turn order (sensors + crew skill)
- Turn phases: Initiative Roll → Movement → Action → End Phase
- Priority queue implementation for managing ship actions

### 5. Combat Mechanics
- **Weapon Types:** Kinetic (projectile travel time, gravity-affected), Energy (instant line-of-sight), Missiles (homing, interceptable), Special (EMP, tractor beams, mining lasers)
- **Defense:** Shields (recharge), Armor (permanent reduction), Evasion (dodge chance), Point Defense (auto-target)
- **Damage Calculator:** Modular system handling weapon/armor interactions

### 6. Physics System
- Simplified orbital mechanics (not full Newtonian simulation)
- Drift mechanic: ships continue moving unless thrusters fire
- Gravity wells from celestial objects
- No fuel limits in combat (arcade balance)
- Prediction lines show drift paths for player clarity

### 7. Resource Management
- **Credits:** Currency for purchases
- **Scrap:** Ship upgrades
- **Influence:** Special shop access
- **Intel:** Reveals enemy compositions

### 8. Meta-Progression
- Run-based roguelike with permadeath
- Unlockable ship blueprints, crew archetypes, equipment loadouts
- Achievement system with faction reputation
- Save system using JSON serialization

## Technical Considerations

### Performance Optimization
- Optimize grid calculations (hex pathfinding can be expensive)
- Use LOD (Level of Detail) for particle effects
- Keep combat grid operations efficient with spatial partitioning

### Game Balance
- Combat should feel like Into the Breach: predictable, tactical, rewarding planning
- Runs should take 30-45 minutes
- Tutorial system is critical given complexity
- Prediction lines for drift mechanics prevent frustration

### Code Organization
- Use Godot's scene-based composition
- Separate combat logic from UI
- Keep weapon/ability systems modular for easy content addition
- Use signals for event-driven architecture (e.g., ship destroyed, turn ended)

## Development Phases

### Phase 1: MVP (Current Focus)
- 3 ship classes
- 5 crew archetypes
- 10 weapon types
- 3 arena environments
- Single campaign path

### Phase 2: Expansion
- 8 ship classes total
- 15+ crew types
- Faction-specific abilities
- 6 environment types
- Branching tournament paths

### Phase 3: Polish
- Daily challenges
- Endless mode
- New Game+ modifiers
- Workshop support

## Key Design Principles

1. **Clarity over Realism:** Physics should be intuitive, not simulation-accurate
2. **Predictability:** Players should always know what will happen before committing actions
3. **Fast Iteration:** Combat should be snappy despite being turn-based
4. **Crew First:** Unlike FTL's ship focus, crew are the emotional center
5. **Modular Fleet Building:** Support various fleet compositions and strategies

## Art & Audio Direction

- **Visual Style:** 2.5D isometric view with pixel art ships (16x16 to 64x64 sprites)
- **UI:** Minimalist sci-fi HUD inspired by Into the Breach
- **Particles:** Explosions, thruster trails, shield impacts
- **Color Coding:** Faction-based ship palettes for quick identification
- **Audio:** Synthwave/ambient soundtrack, positional SFX, crew voice barks
