class_name TurnManager
extends Node

## Manages turn-based combat flow
## Handles initiative, turn order, and phase transitions

signal turn_started(ship: ShipNode, turn_number: int)
signal turn_ended(ship: ShipNode)
signal round_started(round_number: int)
signal round_ended(round_number: int)
signal combat_ended(winner_team: int)
signal initiative_order_changed(order: Array[ShipNode])

# Turn state
var current_round: int = 0
var current_turn_index: int = 0
var is_combat_active: bool = false

# Ships in combat
var all_ships: Array[ShipNode] = []
var initiative_order: Array[ShipNode] = []
var active_ship: ShipNode = null

# Team tracking
var player_ships: Array[ShipNode] = []
var enemy_ships: Array[ShipNode] = []

func _ready() -> void:
	pass

## Initialize combat with ships
func initialize_combat(ships: Array[ShipNode]) -> void:
	all_ships = ships.duplicate()

	# Categorize ships by team
	player_ships.clear()
	enemy_ships.clear()

	for ship in all_ships:
		if ship.team == 0:
			player_ships.append(ship)
		else:
			enemy_ships.append(ship)

		# Connect to ship destroyed signal
		ship.ship_destroyed.connect(_on_ship_destroyed)

	# Roll initiative
	roll_initiative()

	# Start first round
	current_round = 1
	current_turn_index = 0
	is_combat_active = true

	start_round()

## Roll initiative for all ships and sort by result
func roll_initiative() -> void:
	# Create array of [ship, initiative_value] pairs
	var initiative_rolls: Array = []

	for ship in all_ships:
		if ship.is_alive():
			var initiative_value := ship.get_initiative()
			initiative_rolls.append({"ship": ship, "initiative": initiative_value})

	# Sort by initiative (highest first)
	initiative_rolls.sort_custom(func(a, b):
		return a.initiative > b.initiative
	)

	# Extract sorted ships
	initiative_order.clear()
	for entry in initiative_rolls:
		initiative_order.append(entry.ship)

	initiative_order_changed.emit(initiative_order)

## Start a new round
func start_round() -> void:
	round_started.emit(current_round)
	current_turn_index = 0

	# Start first turn
	if initiative_order.size() > 0:
		start_next_turn()
	else:
		end_combat()

## Start the next ship's turn
func start_next_turn() -> void:
	# Find next alive ship
	while current_turn_index < initiative_order.size():
		var ship: ShipNode = initiative_order[current_turn_index]
		if ship.is_alive():
			active_ship = ship
			active_ship.start_turn()
			turn_started.emit(active_ship, current_round)
			return
		else:
			# Skip dead ships
			current_turn_index += 1

	# If we're here, all ships have taken their turn
	end_round()

## End current ship's turn
func end_current_turn() -> void:
	if active_ship:
		active_ship.end_turn()
		turn_ended.emit(active_ship)

	current_turn_index += 1

	# Check for combat end conditions
	if check_combat_end():
		end_combat()
		return

	# Start next turn or end round
	if current_turn_index < initiative_order.size():
		start_next_turn()
	else:
		end_round()

## End current round
func end_round() -> void:
	round_ended.emit(current_round)

	# Check for combat end
	if check_combat_end():
		end_combat()
		return

	# Re-roll initiative for next round
	roll_initiative()

	# Start next round
	current_round += 1
	start_round()

## Check if combat should end
func check_combat_end() -> bool:
	# Count alive ships per team
	var alive_player := 0
	var alive_enemy := 0

	for ship in player_ships:
		if ship.is_alive():
			alive_player += 1

	for ship in enemy_ships:
		if ship.is_alive():
			alive_enemy += 1

	# Combat ends if one team is eliminated
	return alive_player == 0 or alive_enemy == 0

## End combat
func end_combat() -> void:
	is_combat_active = false

	# Determine winner
	var winner_team := -1
	for ship in player_ships:
		if ship.is_alive():
			winner_team = 0
			break

	if winner_team == -1:
		for ship in enemy_ships:
			if ship.is_alive():
				winner_team = ship.team
				break

	combat_ended.emit(winner_team)

## Get current active ship
func get_active_ship() -> ShipNode:
	return active_ship

## Check if it's a specific ship's turn
func is_ship_turn(ship: ShipNode) -> bool:
	return active_ship == ship

## Check if it's player's turn
func is_player_turn() -> bool:
	return active_ship != null and active_ship.team == 0

## Get turn order for UI display
func get_turn_order() -> Array[ShipNode]:
	return initiative_order.duplicate()

## Get remaining ships in current round
func get_remaining_ships_this_round() -> Array[ShipNode]:
	var remaining: Array[ShipNode] = []
	for i in range(current_turn_index + 1, initiative_order.size()):
		if initiative_order[i].is_alive():
			remaining.append(initiative_order[i])
	return remaining

## Signal handlers
func _on_ship_destroyed(ship: ShipNode) -> void:
	# Remove from initiative order
	initiative_order.erase(ship)
	all_ships.erase(ship)

	# Check if combat should end
	if check_combat_end():
		end_combat()
	elif active_ship == ship:
		# If destroyed ship was active, move to next turn
		end_current_turn()
