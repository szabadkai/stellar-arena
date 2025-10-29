## **PRODUCT REQUIREMENTS DOCUMENT**

### **Project Title:** Stellar Arena

**Genre:** Turn-based Tactical Roguelike  
**Platform:** Godot 4.x  
**Target Market:** Fans of Mortal Glory, Into the Breach, FTL, and tactical space combat

---

## **1. EXECUTIVE SUMMARY**

Stellar Arena is a turn-based tactical roguelike that translates Mortal Glory's gladiator combat into a sci-fi space setting. Players recruit a fleet of diverse spacecraft, each piloted by unique characters, and compete in orbital combat arenas for glory, resources, and survival across procedurally generated tournament circuits.

**Core Differentiators from Mortal Glory:**

- **3D orbital mechanics** (2.5D isometric view)
- **Ship energy management system** replacing mana
- **Environmental hazards** (asteroid fields, nebulae, solar flares)
- **Crew permadeath** with persistent traits
- **Fleet composition strategy** beyond individual units

---

## **2. CORE GAMEPLAY LOOP**

### **2.1 Tournament Structure** (Mortal Glory DNA)

- Run-based roguelike with branching tournament paths
- 3-5 combat phases per sector
- Boss encounters at sector terminals
- Permadeath with meta-progression unlocks

### **2.2 Pre-Combat Phase**

**Shipyard & Recruitment:**

- Recruit ships from 8 factions (unlockable)
- Each ship has 2-3 crew slots
- Purchase/upgrade equipment between battles
- Ship classes: Interceptor, Corvette, Destroyer, Carrier, Support

**Resource Management:**

- **Credits** (currency)
- **Scrap** (ship upgrades)
- **Influence** (special shop access)
- **Intel** (reveals enemy compositions)

### **2.3 Combat Phase**

**Grid-Based Tactical Combat:**

- Hexagonal grid (15x15 standard arena)
- Initiative-based turn order
- Action Points (AP) system per ship
- Victory conditions: Eliminate enemies OR capture objective

---

## **3. UNIQUE MECHANICS** (Differentiating Features)

### **3.1 Orbital Physics Lite**

- Ships maintain **velocity vectors** (simplified)
- **Drift mechanic:** Ships continue moving in last direction unless thrusters fire
- **Gravity wells** from celestial objects affect trajectories
- **No fuel limits** in combat (arcade balance)

### **3.2 Energy Management System**

Replaces Mortal Glory's mana:

- **Reactor Core** generates energy/turn
- **Energy Allocation:** Weapons / Shields / Engines
- **Overcharge:** Boost one system but risk overheating damage
- **EMP mechanics:** Disable enemy systems temporarily

### **3.3 Crew System**

- Each ship has 1-3 **crew members** with:
  - **Active Ability** (once per battle)
  - **Passive Trait** (always active)
  - **Morale System** (affects performance)
- Crew can be **incapacitated** (ship remains) or **killed** (permanent loss)
- Survivors gain **experience** and unlock traits

### **3.4 Spatial Hazards**

Dynamic battlefield elements:

- **Asteroid Fields** (LOS blocking, cover)
- **Debris Clouds** (slow movement, damage)
- **Solar Flares** (periodic energy drain)
- **Wormholes** (teleportation points)
- **Derelict Ships** (can be salvaged mid-battle)

---

## **4. COMBAT MECHANICS**

### **4.1 Turn Structure**

1. **Initiative Roll** (based on ship sensors + crew skill)
2. **Movement Phase** (spend AP, account for drift)
3. **Action Phase:**
   - Fire weapons (varies by type)
   - Activate abilities
   - Board enemy ships (if adjacent)
   - Repair systems
4. **End Phase** (energy regeneration, status effects resolve)

### **4.2 Weapon Systems**

**Kinetic Weapons:**

- High damage vs. armor
- Projectile travel time
- Affected by gravity

**Energy Weapons:**

- Instant hit, line-of-sight
- Reduced by shields
- Overheat mechanics

**Missiles:**

- Homing capability
- Can be intercepted by point defense
- High burst damage

**Special Weapons:**

- EMP torpedoes
- Tractor beams
- Mining lasers (hazard manipulation)

### **4.3 Defensive Systems**

- **Shields:** Absorb damage until depleted (recharge slowly)
- **Armor:** Permanent damage reduction (requires repairs)
- **Evasion:** Chance to dodge based on size/speed
- **Point Defense:** Auto-targets missiles/fighters

### **4.4 Ship Destruction**

- **0 Hull:** Ship disabled (can be salvaged)
- **Critical Failures:** Reactor explosion damages surrounding hexes
- **Escape Pods:** Crew can survive ship loss (50% chance)

---

## **5. META-PROGRESSION**

### **5.1 Unlockables**

- New ship blueprints
- Crew archetypes
- Starting equipment loadouts
- Alternate game modes

### **5.2 Achievement System**

- Milestone rewards (e.g., "Win without losing a ship")
- Faction reputation unlocks unique items
- Codex entries (lore building)

### **5.3 Daily Challenges**

- Preset fleets + arena conditions
- Leaderboard integration

---

## **6. TECHNICAL SPECIFICATIONS**

### **6.1 Godot Engine Implementation**

**Scene Structure:**

```
MainMenu
├── CampaignSelect
├── Shipyard (pre-combat)
└── Arena (combat)
    ├── GridManager (hex grid)
    ├── TurnManager (initiative queue)
    ├── ShipNode (inherits CharacterBody3D)
    └── UI/HUD
```

**Key Systems:**

- **Hex Grid:** Custom A\* pathfinding with drift calculation
- **Turn Manager:** Priority queue for initiative
- **Damage Calculator:** Modular system for weapon/armor interactions
- **Save System:** JSON-based run serialization

### **6.2 Art Direction**

- **2.5D Isometric View** (top-down tactical camera)
- **Pixel Art Ships** (16x16 to 64x64 base sprites)
- **Particle Effects:** Explosions, thruster trails, shield impacts
- **Color Coding:** Faction-based ship palettes
- **UI:** Minimalist sci-fi HUD inspired by _Into the Breach_

### **6.3 Audio**

- **Soundtrack:** Synthwave/ambient electronic
- **SFX:** Positional audio for weapon fire
- **Voice Barks:** Crew call-outs during combat

---

## **7. CONTENT ROADMAP**

### **Phase 1: Core Loop (MVP)**

- 3 ship classes
- 5 crew archetypes
- 10 weapon types
- 3 arena environments
- Single campaign path

### **Phase 2: Expansion**

- 8 ship classes total
- 15+ crew types
- Faction-specific abilities
- 6 environment types
- Branching tournament paths

### **Phase 3: Polish & Endgame**

- Daily challenges
- Endless mode
- New Game+ modifiers
- Workshop support (custom arenas)

---

## **8. UNIQUE SELLING POINTS**

1. **Orbital Combat Evolution:** First roguelike to combine gladiatorial tactics with space physics
2. **Crew-Centric Strategy:** Unlike FTL's ship focus, crew are front-and-center
3. **Newtonian Lite:** Accessible momentum mechanics (not full simulation)
4. **Fast Runs:** 30-45 minute campaigns (vs. Mortal Glory's 15-20)
5. **Modular Fleet Building:** Mix ship sizes unlike MG's fixed team size

---

## **9. MONETIZATION** (Post-Launch)

- **Base Game:** Premium ($12-15)
- **DLC Packs:** New factions, campaigns
- **Cosmetics:** Ship skins, crew portraits
- **No Microtransactions** in single-player

---

## **10. SUCCESS METRICS**

- **Retention:** 40% of players complete 1 full run
- **Replayability:** Avg. 5+ runs per player
- **Community:** Active mod scene (if released)
- **Critical Reception:** 80+ on Metacritic/Steam

---

## **11. RISK MITIGATION**

| Risk                             | Mitigation                                        |
| -------------------------------- | ------------------------------------------------- |
| Combat feels too complex         | Extensive playtesting; tutorial system            |
| Physics = unfun unpredictability | "Prediction lines" show drift paths               |
| Too similar to Mortal Glory      | Emphasize unique crew/energy systems in marketing |
| Godot performance issues         | Optimize grid calculations; LOD for particles     |

---

## **12. REFERENCES & INSPIRATION**

- **Mortal Glory 2:** Core combat pacing, reward loops
- **Into the Breach:** Grid clarity, predictive combat
- **FTL:** Resource management, crew permadeath
- **Children of a Dead Earth:** Hard sci-fi space combat (simplified)
- **Star Command:** Crew management UI

---

**Document Version:** 1.0  
**Date:** October 29, 2025  
**Author:** AI Product Designer  
**Status:** Ready for Prototyping
