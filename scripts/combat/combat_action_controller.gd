class_name CombatActionController
extends Node

## Handles combat actions like attacking, using abilities, etc.
## Coordinates between weapons, targets, and damage resolution

signal attack_started(attacker: ShipNode, target: ShipNode, weapon: WeaponData)
signal attack_completed(attacker: ShipNode, target: ShipNode, damage_dealt: int, hit: bool)
signal weapon_fired(attacker: ShipNode, weapon: WeaponData, target_position: Vector3)

# References
var grid: GridManager = null

func initialize(p_grid: GridManager) -> void:
	grid = p_grid

## Check if a ship can attack a target with a specific weapon
func can_attack_target(attacker: ShipNode, target: ShipNode, weapon: WeaponData) -> bool:
	if not attacker or not target or not weapon:
		return false

	# Can't attack self
	if attacker == target:
		return false

	# Can't attack allies (same team)
	if attacker.team == target.team:
		return false

	# Target must be alive
	if not target.is_alive():
		return false

	# Check if attacker has enough resources
	if not weapon.can_fire(attacker.current_ap, attacker.current_energy):
		return false

	# Check range
	var distance := HexMath.hex_distance(attacker.current_cell.axial_coords, target.current_cell.axial_coords)
	if distance < weapon.min_range or distance > weapon.max_range:
		return false

	# Check line of sight if required
	if weapon.line_of_sight_required:
		if not grid.has_line_of_sight(attacker.current_cell, target.current_cell):
			return false

	return true

## Get all valid targets for a weapon
func get_valid_targets(attacker: ShipNode, weapon: WeaponData, all_ships: Array[ShipNode]) -> Array[ShipNode]:
	var valid_targets: Array[ShipNode] = []

	for ship in all_ships:
		if can_attack_target(attacker, ship, weapon):
			valid_targets.append(ship)

	return valid_targets

## Get cells within weapon range
func get_cells_in_weapon_range(attacker: ShipNode, weapon: WeaponData) -> Array[HexCell]:
	if not attacker or not attacker.current_cell or not weapon:
		return []

	var cells: Array[HexCell] = []
	var center := attacker.current_cell.axial_coords

	# Get all cells within max range
	for dist in range(weapon.min_range, weapon.max_range + 1):
		var ring_cells := grid.get_cells_in_range(attacker.current_cell, dist)
		for cell in ring_cells:
			var actual_distance := HexMath.hex_distance(center, cell.axial_coords)
			if actual_distance >= weapon.min_range and actual_distance <= weapon.max_range:
				# Check LOS if required
				if weapon.line_of_sight_required:
					if grid.has_line_of_sight(attacker.current_cell, cell):
						cells.append(cell)
				else:
					cells.append(cell)

	return cells

## Execute an attack
func execute_attack(attacker: ShipNode, target: ShipNode, weapon: WeaponData, overload: bool = false) -> void:
	if not can_attack_target(attacker, target, weapon):
		push_warning("Cannot execute attack - invalid target or weapon")
		return

	# Emit start signal
	attack_started.emit(attacker, target, weapon)

	# Consume resources
	var energy_cost := weapon.get_total_energy_cost(overload)
	attacker.spend_energy(energy_cost)
	attacker.spend_ap(weapon.ap_cost)

	# Calculate hit chance with crew bonuses
	var attacker_accuracy_bonus := attacker.get_crew_accuracy_bonus()
	var target_evasion: int = target.get_total_evasion()
	var hit_chance := weapon.calculate_hit_chance(attacker_accuracy_bonus, target_evasion)
	var roll := randi() % 100
	var hit := roll < hit_chance

	print("Attack: %s fires %s at %s - Hit chance: %d%%, Roll: %d, Hit: %s" % [
		attacker.ship_display_name,
		weapon.weapon_name,
		target.ship_display_name,
		hit_chance,
		roll,
		"YES" if hit else "MISS"
	])

	# Fire weapon visual
	weapon_fired.emit(attacker, weapon, target.current_cell.world_position)

	var damage_dealt := 0
	if hit:
		# Calculate damage with crew bonuses
		var base_damage := weapon.calculate_damage(overload)
		var crew_damage_bonus := attacker.get_crew_damage_bonus()
		damage_dealt = base_damage + crew_damage_bonus

		# Apply damage to target
		target.take_damage(damage_dealt, weapon.damage_type.to_lower())

		print("  → Dealt %d damage! Target hull: %d/%d" % [
			damage_dealt,
			target.current_hull,
			target.ship_data.max_hull
		])
	else:
		print("  → Attack missed!")

	# Emit completion signal
	attack_completed.emit(attacker, target, damage_dealt, hit)

## Get attack preview info
func get_attack_preview(attacker: ShipNode, target: ShipNode, weapon: WeaponData) -> Dictionary:
	var preview := {
		"can_attack": false,
		"hit_chance": 0,
		"damage_range": Vector2i.ZERO,
		"will_destroy": false,
		"reason": ""
	}

	if not can_attack_target(attacker, target, weapon):
		preview.reason = "Invalid target"
		return preview

	preview.can_attack = true
	preview.hit_chance = weapon.calculate_hit_chance(0, target.ship_data.evasion)

	var base_damage := weapon.calculate_damage(false)
	# Rough damage estimate (actual damage depends on shields/armor)
	preview.damage_range = Vector2i(base_damage - 3, base_damage + 3)
	preview.will_destroy = target.current_hull <= base_damage

	return preview
