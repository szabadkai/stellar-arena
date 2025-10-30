class_name MovementController
extends Node

## Handles ship movement on the hex grid
## Manages pathfinding, movement validation, and animation

signal movement_started(ship: ShipNode, path: Array[HexCell])
signal movement_completed(ship: ShipNode, destination: HexCell)
signal movement_cancelled()

# References
var grid: GridManager
var current_ship: ShipNode = null
var movement_path: Array[HexCell] = []
var is_moving: bool = false

# Movement animation
var movement_speed := 5.0  # Units per second
var current_path_index: int = 0

# Visualization
var highlighted_cells: Array[HexCell] = []
var path_cells: Array[HexCell] = []

func _ready() -> void:
	set_process(false)  # Only process when moving

func _process(delta: float) -> void:
	if is_moving and current_ship:
		animate_movement(delta)

## Initialize with grid reference
func initialize(p_grid: GridManager) -> void:
	grid = p_grid

## Show movement range for a ship
func show_movement_range(ship: ShipNode) -> void:
	if not ship or not grid:
		return

	current_ship = ship
	clear_highlights()

	# Get current cell
	var current_cell := ship.current_cell
	if not current_cell:
		return

	# Calculate reachable cells based on AP
	var max_cost := float(ship.current_ap)
	var reachable := HexPathfinding.get_reachable_cells(current_cell, grid, max_cost)

	# Highlight reachable cells
	highlighted_cells.clear()
	for coords in reachable.keys():
		var cell := grid.get_cell(coords)
		if cell and not cell.is_occupied:
			highlighted_cells.append(cell)
			cell.set_state(HexCell.CellState.VALID_MOVE)

## Show path to a target cell
func show_path_to_cell(target_cell: HexCell) -> void:
	if not current_ship or not grid:
		return

	# Clear previous path visualization
	clear_path_visualization()

	# Get current cell
	var current_cell := current_ship.current_cell
	if not current_cell or current_cell == target_cell:
		return

	# Find path
	var max_cost := float(current_ship.current_ap)
	var path := HexPathfinding.find_path(current_cell, target_cell, grid, max_cost)

	if path.size() > 0:
		# Visualize path
		path_cells = path.duplicate()
		for cell in path_cells:
			if cell != current_cell:
				cell.set_state(HexCell.CellState.PATH)

## Move ship to target cell
func move_ship_to_cell(ship: ShipNode, target_cell: HexCell) -> bool:
	if not ship or not target_cell or not grid:
		return false

	# Can't move if already moving
	if is_moving:
		return false

	current_ship = ship
	var current_cell := ship.current_cell
	if not current_cell:
		return false

	# Find path
	var max_cost := float(ship.current_ap)
	movement_path = HexPathfinding.find_path(current_cell, target_cell, grid, max_cost)

	if movement_path.size() == 0:
		return false

	# Calculate movement cost
	var path_cost := HexPathfinding.get_path_cost(movement_path)
	var ap_cost := int(ceil(path_cost))

	# Check if ship can afford movement
	if not ship.has_ap(ap_cost):
		return false

	# Spend AP
	ship.spend_ap(ap_cost)

	# Start movement animation
	start_movement()

	return true

## Start movement animation
func start_movement() -> void:
	if movement_path.size() < 2:
		return

	is_moving = true
	current_path_index = 0
	set_process(true)
	clear_highlights()

	movement_started.emit(current_ship, movement_path)

## Animate ship movement along path
func animate_movement(delta: float) -> void:
	if current_path_index >= movement_path.size() - 1:
		# Movement complete
		complete_movement()
		return

	var current_cell: HexCell = movement_path[current_path_index]
	var next_cell: HexCell = movement_path[current_path_index + 1]

	var end_pos: Vector3 = next_cell.world_position

	# Move towards next cell
	var direction := (end_pos - current_ship.global_position).normalized()
	var move_delta := direction * movement_speed * delta

	var distance_to_next := current_ship.global_position.distance_to(end_pos)

	if distance_to_next <= move_delta.length():
		# Reached next cell
		current_ship.global_position = end_pos
		current_path_index += 1
	else:
		# Move towards next cell
		current_ship.global_position += move_delta

## Complete movement
func complete_movement() -> void:
	is_moving = false
	set_process(false)

	# Update ship's grid position
	var final_cell: HexCell = movement_path[movement_path.size() - 1]
	current_ship.place_on_grid(final_cell, grid)

	movement_completed.emit(current_ship, final_cell)

	# Clear path
	movement_path.clear()
	current_path_index = 0

## Cancel current movement
func cancel_movement() -> void:
	if is_moving:
		is_moving = false
		set_process(false)
		movement_path.clear()
		current_path_index = 0
		movement_cancelled.emit()

	clear_highlights()
	clear_path_visualization()

## Clear movement range highlights
func clear_highlights() -> void:
	for cell in highlighted_cells:
		cell.set_state(HexCell.CellState.NORMAL)
	highlighted_cells.clear()

## Clear path visualization
func clear_path_visualization() -> void:
	for cell in path_cells:
		cell.set_state(HexCell.CellState.NORMAL)
	path_cells.clear()

## Check if a cell is within movement range
func is_cell_reachable(cell: HexCell) -> bool:
	return highlighted_cells.has(cell)

## Get movement cost to a cell
func get_movement_cost_to_cell(target_cell: HexCell) -> int:
	if not current_ship or not grid:
		return 999

	var current_cell := current_ship.current_cell
	if not current_cell:
		return 999

	var path := HexPathfinding.find_path(current_cell, target_cell, grid)
	if path.size() == 0:
		return 999

	return int(ceil(HexPathfinding.get_path_cost(path)))
