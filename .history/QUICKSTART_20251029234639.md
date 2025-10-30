# Stellar Arena - Quick Start Guide

## Setup Complete! ✅

All Phase 1 systems are implemented and ready to test:

- ✅ Hex grid with pathfinding
- ✅ Ship sprites loaded
- ✅ Turn-based combat system
- ✅ Movement with AP costs
- ✅ Combat HUD with ship stats
- ✅ In-game help overlay

## How to Run

1. **Open project in Godot 4.5**
2. **Press F5** (or click "Run Project")
3. Game launches directly into test combat!

## Quick Controls

| Key                      | Action              |
| ------------------------ | ------------------- |
| **Left-click ship**      | Select your ship    |
| **Left-click green hex** | Move to that hex    |
| **Space / Enter**        | End your turn       |
| **ESC**                  | Deselect ship       |
| **F1**                   | Toggle help overlay |
| **F2**                   | Toggle FPS counter  |

## What You'll See

### The Battlefield

- **15×15 hex grid** (greenish/blue hexagons)
- **2 player ships** (left side, normal colors)
- **2 enemy ships** (right side, red tint)
- **Blue selection circle** under selected ship
- **Green highlights** for valid moves

### UI Elements

- **Bottom-left**: Ship info (hull, shields, energy, AP)
- **Top-right**: Turn order
- **Top-center**: Current turn status
- **Bottom-right**: End turn button

## Test Combat Setup

**Your Team (Player - Team 0):**

- 2× Corvette (Medium, balanced ships)
- Position: (3,3) and (4,3)
- Stats: 100 HP, 50 shields, 4 AP

**Enemy Team (Team 1):**

- 2× Interceptor (Fast, light ships)
- Position: (10,7) and (11,7)
- Stats: 60 HP, 30 shields, 5 AP
- **Currently skip their turns** (no AI yet)

## Testing Checklist

Try these actions to verify everything works:

### Basic Movement

- [ ] Click one of your ships - see selection circle
- [ ] Green hexes appear showing movement range
- [ ] Click a green hex - ship moves smoothly
- [ ] AP counter decreases
- [ ] Move again until out of AP

### Turn System

- [ ] Press Space to end turn
- [ ] Next ship's turn begins
- [ ] Turn order updates
- [ ] After all ships, new round starts
- [ ] Initiative order may change

### UI Interaction

- [ ] Ship stats display when selected
- [ ] Health/shield/energy bars update
- [ ] Turn order shows current ship highlighted
- [ ] Press F1 - help overlay appears
- [ ] Press F2 - FPS counter shows

### Visual Feedback

- [ ] Ships display with sprites
- [ ] Enemy ships have red tint
- [ ] Selection indicator visible
- [ ] Hexes highlight on hover

## Known Behaviors (Phase 1)

**Expected:**

- Enemies skip turns immediately (no AI)
- No combat/weapons yet
- Game never ends (no win condition)
- Energy regenerates but isn't used
- Ships can't attack

**Not a Bug:**

- Enemy turns are instant
- Ships don't die
- No damage numbers
- Grid coordinates hidden (set `show_coordinates = true` in grid_manager.gd to see them)

## Troubleshooting

**Ships not visible?**

- Check sprites exist in `srpites/ships/` folder
- Verify .import files were created
- Try closing and reopening Godot

**Can't click ships?**

- Click directly on ship position
- Make sure Area3D collision is enabled

**Movement not working?**

- Ensure it's that ship's turn
- Check ship has AP remaining
- Verify cell is in green range

**UI not showing?**

- Check console for errors
- Verify combat_hud initialized properly

**Performance issues?**

- Press F2 to see FPS
- Should be 60 FPS on modern hardware
- Check console for warnings

## Console Debug Output

The game prints helpful info to console:

```
Turn started: Corvette (Team 0)
Movement completed: Corvette moved to (5,4)
Turn ended: Corvette
Turn started: Interceptor (Team 1)
```

## Next Phase Preview

Once you verify Phase 1 works, Phase 2 will add:

- **Weapon systems** (kinetic, energy, missiles)
- **Combat damage** with shields/armor
- **Enemy AI** that actually moves and fights
- **Ship destruction** and victory conditions

## Tips for Testing

1. **Try edge cases**: Move to grid edges, try invalid moves
2. **Test AP limits**: Move until you run out of AP
3. **Round transitions**: Play several rounds to see initiative changes
4. **UI responsiveness**: Click around rapidly, test all buttons
5. **Visual clarity**: Can you easily see what's happening?

## Performance Baseline

Expected on modern hardware:

- **FPS**: 60 (solid)
- **Grid generation**: < 500ms
- **Movement animation**: Smooth
- **UI updates**: Instant
- **Turn transitions**: < 100ms

## Ready to Test! 🚀

Press **F5** in Godot and start experimenting!

**Remember:** Press **F1** in-game for controls reference.

---

**Having issues?** Check `TESTING.md` for detailed troubleshooting.

**Ready for more?** When Phase 1 works perfectly, we'll add combat in Phase 2!
