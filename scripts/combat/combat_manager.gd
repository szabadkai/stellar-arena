class_name CombatManager
extends Node

## Main combat controller that coordinates all combat systems
## Manages combat flow, player input, and system interactions

signal combat_started()
signal combat_ended(winner_team: int)
signal ship_selected(ship: ShipNode)
signal ship_deselected()

# System references
@onready var grid: GridManager = $GridManager
@onready var turn_manager: TurnManager = $TurnManager
@onready var movement_controller: MovementController = $MovementController
@onready var combat_action_controller: CombatActionController = $CombatActionController
@onready var combat_hud: CombatHUD = $"../CombatHUD"

# Combat state
enum CombatState {
	SETUP,
	PLAYER_TURN,
	ENEMY_TURN,
	ANIMATING,
	ENDED
}

enum PlayerMode {
	MOVEMENT,  # Selecting where to move
	TARGETING  # Selecting attack target
}

var current_state := CombatState.SETUP
var player_mode := PlayerMode.MOVEMENT
var selected_ship: ShipNode = null
var selected_weapon: WeaponData = null
var all_ships: Array[ShipNode] = []

# Input handling
var is_showing_movement_range: bool = false
var is_showing_attack_range: bool = false

# Preload resources
const SHIP_SCENE = preload("res://scenes/ships/ship_node.tscn")
const CORVETTE_DATA = preload("res://resources/ships/corvette.tres")
const INTERCEPTOR_DATA = preload("res://resources/ships/interceptor.tres")
const LIGHT_LASER = preload("res://resources/weapons/light_laser.tres")
const RAILGUN = preload("res://resources/weapons/railgun.tres")
const MISSILE_LAUNCHER = preload("res://resources/weapons/missile_launcher.tres")
const PILOT_ACE = preload("res://resources/crew/pilot_ace.tres")
const GUNNER_VETERAN = preload("res://resources/crew/gunner_veteran.tres")
const ENGINEER_TECH = preload("res://resources/crew/engineer_tech.tres")

func _ready() -> void:
	# Initialize systems
	if movement_controller:
		movement_controller.initialize(grid)

	if combat_action_controller:
		combat_action_controller.initialize(grid)

	# Initialize HUD
	if combat_hud:
		combat_hud.initialize(self, turn_manager)

	# Connect signals
	if grid:
		grid.cell_selected.connect(_on_cell_selected)

	if turn_manager:
		turn_manager.turn_started.connect(_on_turn_started)
		turn_manager.turn_ended.connect(_on_turn_ended)
		turn_manager.combat_ended.connect(_on_combat_ended)

	if movement_controller:
		movement_controller.movement_completed.connect(_on_movement_completed)

	# Start test combat after a brief delay
	setup_test_combat.call_deferred()

## Start combat with player and enemy ships
func start_combat(player_ships: Array[ShipNode], enemy_ships: Array[ShipNode]) -> void:
	all_ships.clear()
	all_ships.append_array(player_ships)
	all_ships.append_array(enemy_ships)

	# Initialize turn manager with all ships
	turn_manager.initialize_combat(all_ships)

	current_state = CombatState.PLAYER_TURN
	combat_started.emit()

## Setup test combat (for testing purposes)
func setup_test_combat() -> void:
	# Wait for grid to be ready
	await get_tree().process_frame

	# Create test ships
	var player_ship1: ShipNode = create_test_ship(Vector2i(3, 3), true)
	var player_ship2: ShipNode = create_test_ship(Vector2i(4, 3), true)
	var enemy_ship1: ShipNode = create_test_ship(Vector2i(10, 7), false)
	var enemy_ship2: ShipNode = create_test_ship(Vector2i(11, 7), false)

	# Start combat
	start_combat([player_ship1, player_ship2], [enemy_ship1, enemy_ship2])

## Create a test ship (for testing)
func create_test_ship(grid_pos: Vector2i, is_player: bool) -> ShipNode:
	# Instantiate ship from preloaded scene
	var ship: ShipNode = SHIP_SCENE.instantiate() as ShipNode

	# Use preloaded ship data
	var ship_data: ShipData
	if is_player:
		ship_data = CORVETTE_DATA
	else:
		ship_data = INTERCEPTOR_DATA

	ship.ship_data = ship_data
	ship.team = 0 if is_player else 1
	ship.is_player_controlled = is_player

	# Equip weapons
	if is_player:
		# Player corvettes get light laser and railgun
		ship.weapons.append(LIGHT_LASER)
		ship.weapons.append(RAILGUN)
		# Player ships get crew
		ship.crew.append(PILOT_ACE)
		ship.crew.append(GUNNER_VETERAN)
	else:
		# Enemy interceptors get light laser
		ship.weapons.append(LIGHT_LASER)
		# Enemy ships get basic crew (engineer only for testing)
		ship.crew.append(ENGINEER_TECH)

	# Add to scene
	add_child(ship)

	# Place on grid
	var cell: HexCell = grid.get_cell(grid_pos)
	if cell:
		ship.place_on_grid(cell, grid)

	# Add team visual indicator
	if not is_player and ship.visual_sprite:
		ship.visual_sprite.modulate = Color(1.0, 0.5, 0.5)  # Red tint for enemies

	# Connect ship signals
	ship.ship_selected.connect(_on_ship_clicked)

	all_ships.append(ship)
	return ship

## Handle player input
func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed:
		match event.keycode:
			KEY_ESCAPE:
				# Exit targeting mode or deselect ship
				if player_mode == PlayerMode.TARGETING:
					exit_targeting_mode()
				else:
					deselect_current_ship()
			KEY_SPACE, KEY_ENTER:
				# End turn
				if current_state == CombatState.PLAYER_TURN:
					end_player_turn()

## Select a ship
func select_ship(ship: ShipNode) -> void:
	# Deselect previous
	deselect_current_ship()

	selected_ship = ship
	ship.select()

	# Show movement range if it's the ship's turn
	if turn_manager.is_ship_turn(ship):
		show_movement_range()

	ship_selected.emit(ship)

## Deselect current ship
func deselect_current_ship() -> void:
	if selected_ship:
		selected_ship.deselect()
		movement_controller.clear_highlights()
		movement_controller.clear_path_visualization()
		is_showing_movement_range = false
	selected_ship = null
	ship_deselected.emit()

## Show movement range for selected ship
func show_movement_range() -> void:
	if selected_ship:
		print("Showing movement range for ", selected_ship.ship_display_name)
		movement_controller.show_movement_range(selected_ship)
		is_showing_movement_range = true
		print("Movement range shown. is_showing_movement_range = ", is_showing_movement_range)

## Enter targeting mode for a weapon
func enter_targeting_mode(weapon: WeaponData) -> void:
	if not selected_ship or not weapon:
		return

	player_mode = PlayerMode.TARGETING
	selected_weapon = weapon

	# Clear movement visualization
	movement_controller.clear_highlights()
	movement_controller.clear_path_visualization()
	is_showing_movement_range = false

	# Show weapon range
	show_attack_range()

	print("Targeting mode: Select an enemy ship to attack with %s" % weapon.weapon_name)

## Exit targeting mode
func exit_targeting_mode() -> void:
	player_mode = PlayerMode.MOVEMENT
	selected_weapon = null

	# Clear attack range visualization
	if is_showing_attack_range:
		movement_controller.clear_highlights()
		is_showing_attack_range = false

	# Show movement range again
	if selected_ship:
		show_movement_range()

## Show attack range for selected weapon
func show_attack_range() -> void:
	if not selected_ship or not selected_weapon:
		return

	var cells: Array[HexCell] = combat_action_controller.get_cells_in_weapon_range(selected_ship, selected_weapon)
	for cell in cells:
		cell.set_state(HexCell.CellState.ATTACK_RANGE)
	is_showing_attack_range = true

## End player's turn
func end_player_turn() -> void:
	deselect_current_ship()
	turn_manager.end_current_turn()

## Signal handlers
func _on_ship_clicked(ship: ShipNode) -> void:
	# Select ship if it's player controlled
	if ship.is_player_controlled:
		player_mode = PlayerMode.MOVEMENT
		select_ship(ship)
	# Target enemy ship if in targeting mode
	elif player_mode == PlayerMode.TARGETING and selected_ship and selected_weapon:
		if combat_action_controller.can_attack_target(selected_ship, ship, selected_weapon):
			# Execute attack
			combat_action_controller.execute_attack(selected_ship, ship, selected_weapon, false)
			# Return to movement mode
			exit_targeting_mode()
		else:
			print("Cannot attack that target with %s" % selected_weapon.weapon_name)

func _on_cell_selected(cell: HexCell) -> void:
	print("Cell selected: ", cell.axial_coords, " | State: ", current_state, " | Player mode: ", player_mode, " | Showing movement: ", is_showing_movement_range)

	# Handle cell clicks
	if current_state != CombatState.PLAYER_TURN:
		print("Not player turn, ignoring")
		return

	if not selected_ship or not turn_manager.is_ship_turn(selected_ship):
		print("No ship selected or not ship's turn")
		return

	# If in targeting mode, ignore cell clicks (need to click ships instead)
	if player_mode == PlayerMode.TARGETING:
		print("In targeting mode - click an enemy ship to attack, or ESC to cancel")
		return

	# If showing movement range, try to move
	if is_showing_movement_range and player_mode == PlayerMode.MOVEMENT:
		print("Checking if cell is reachable...")
		if movement_controller.is_cell_reachable(cell):
			# Move ship
			print("Moving ship to cell!")
			current_state = CombatState.ANIMATING
			movement_controller.move_ship_to_cell(selected_ship, cell)
		else:
			# Can't move there
			print("Cell not reachable")
	else:
		# Show movement range
		print("Showing movement range...")
		show_movement_range()

func _on_turn_started(ship: ShipNode, turn_number: int) -> void:
	print("Turn started: %s (Team %d)" % [ship.ship_display_name, ship.team])

	if ship.is_player_controlled:
		current_state = CombatState.PLAYER_TURN
		# Auto-select player ship on their turn
		select_ship(ship)
	else:
		current_state = CombatState.ENEMY_TURN
		# TODO: AI takes turn
		# For now, just end turn immediately
		await get_tree().create_timer(1.0).timeout
		turn_manager.end_current_turn()

func _on_turn_ended(ship: ShipNode) -> void:
	print("Turn ended: %s" % ship.ship_display_name)
	deselect_current_ship()

func _on_movement_completed(ship: ShipNode, destination: HexCell) -> void:
	print("Movement completed: %s moved to %s" % [ship.ship_display_name, destination.axial_coords])
	current_state = CombatState.PLAYER_TURN if ship.is_player_controlled else CombatState.ENEMY_TURN

func _on_combat_ended(winner_team: int) -> void:
	print("Combat ended! Winner: Team %d" % winner_team)
	current_state = CombatState.ENDED
	combat_ended.emit(winner_team)
