class_name GridManager
extends Node3D

## Manages the hex grid for tactical combat
## Handles grid generation, cell lookup, and grid-wide operations

signal cell_selected(cell: HexCell)
signal cell_deselected()

# Grid configuration
@export var grid_width := 15
@export var grid_height := 15
@export var hex_size := 1.0
@export var show_coordinates := false  # Debug: show coordinate labels

# Grid data
var cells: Dictionary = {}  # Vector2i (axial coords) -> HexCell
var selected_cell: HexCell = null

# Cell scene to instance
var hex_cell_scene := preload("res://scenes/combat/grid/hex_cell.tscn")

func _ready() -> void:
	generate_grid()

## Generate the complete hex grid
func generate_grid() -> void:
	clear_grid()

	# Generate cells in rectangular layout (offset coordinates for easier 15x15)
	for q in grid_width:
		for r in grid_height:
			var axial := Vector2i(q, r)
			create_cell(axial)

## Create a single hex cell
func create_cell(axial: Vector2i) -> HexCell:
	var cell: HexCell

	# Try to instance from scene, or create directly if scene doesn't exist
	if hex_cell_scene:
		cell = hex_cell_scene.instantiate()
	else:
		cell = HexCell.new()

	add_child(cell)
	cell.initialize(axial, hex_size)

	# Connect signals
	cell.cell_clicked.connect(_on_cell_clicked)
	cell.cell_hovered.connect(_on_cell_hovered)
	cell.cell_hover_exited.connect(_on_cell_hover_exited)

	# Store in dictionary
	cells[axial] = cell

	# Add coordinate label if debug mode
	if show_coordinates:
		add_coordinate_label(cell)

	return cell

## Add debug coordinate label to cell
func add_coordinate_label(cell: HexCell) -> void:
	var label := Label3D.new()
	label.text = "%d,%d" % [cell.axial_coords.x, cell.axial_coords.y]
	label.font_size = 12
	label.position = Vector3(0, 0.1, 0)
	label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	cell.add_child(label)

## Clear all cells from grid
func clear_grid() -> void:
	for cell in cells.values():
		cell.queue_free()
	cells.clear()
	selected_cell = null

## Get cell at axial coordinates
func get_cell(axial: Vector2i) -> HexCell:
	return cells.get(axial)

## Get cell at world position
func get_cell_at_world(world_pos: Vector3) -> HexCell:
	var axial := HexMath.world_to_axial(world_pos, hex_size)
	return get_cell(axial)

## Check if coordinates are within grid bounds
func is_valid_cell(axial: Vector2i) -> bool:
	return cells.has(axial)

## Get all neighbors of a cell
func get_neighbors(cell: HexCell) -> Array[HexCell]:
	var neighbors: Array[HexCell] = []
	var neighbor_coords := HexMath.get_neighbors(cell.axial_coords)

	for coord in neighbor_coords:
		var neighbor := get_cell(coord)
		if neighbor:
			neighbors.append(neighbor)

	return neighbors

## Get all cells within range of a cell
func get_cells_in_range(center: HexCell, range: int) -> Array[HexCell]:
	var result: Array[HexCell] = []
	var coords := HexMath.get_hexes_in_range(center.axial_coords, range)

	for coord in coords:
		var cell := get_cell(coord)
		if cell:
			result.append(cell)

	return result

## Get line of cells between two cells (for LOS checks)
func get_line_of_cells(from: HexCell, to: HexCell) -> Array[HexCell]:
	var result: Array[HexCell] = []
	var coords := HexMath.hex_line(from.axial_coords, to.axial_coords)

	for coord in coords:
		var cell := get_cell(coord)
		if cell:
			result.append(cell)

	return result

## Check line of sight between two cells
func has_line_of_sight(from: HexCell, to: HexCell) -> bool:
	var line := get_line_of_cells(from, to)

	# Check if any cell in between is blocked (excluding start and end)
	for i in range(1, line.size() - 1):
		if line[i].is_blocked:
			return false

	return true

## Highlight cells (for showing movement range, attack range, etc.)
func highlight_cells(cells_to_highlight: Array[HexCell], state: HexCell.CellState) -> void:
	for cell in cells_to_highlight:
		cell.set_state(state)

## Clear all cell highlights (reset to normal)
func clear_highlights() -> void:
	for cell in cells.values():
		if cell != selected_cell:
			cell.set_state(HexCell.CellState.NORMAL)

## Select a cell
func select_cell(cell: HexCell) -> void:
	# Deselect previous
	if selected_cell:
		selected_cell.set_state(HexCell.CellState.NORMAL)

	selected_cell = cell
	if cell:
		cell.set_state(HexCell.CellState.SELECTED)
		cell_selected.emit(cell)
	else:
		cell_deselected.emit()

## Deselect current cell
func deselect_cell() -> void:
	if selected_cell:
		selected_cell.set_state(HexCell.CellState.NORMAL)
		selected_cell = null
		cell_deselected.emit()

## Get all unoccupied cells
func get_unoccupied_cells() -> Array[HexCell]:
	var result: Array[HexCell] = []
	for cell in cells.values():
		if not cell.is_occupied and not cell.is_blocked:
			result.append(cell)
	return result

## Get cell containing a specific ship
func get_cell_with_ship(ship: Node) -> HexCell:
	for cell in cells.values():
		if cell.occupying_ship == ship:
			return cell
	return null

## Get distance between two cells
func get_distance(from: HexCell, to: HexCell) -> int:
	return HexMath.hex_distance(from.axial_coords, to.axial_coords)

## Signal handlers
func _on_cell_clicked(cell: HexCell) -> void:
	select_cell(cell)

func _on_cell_hovered(cell: HexCell) -> void:
	if cell != selected_cell and cell.current_state == HexCell.CellState.NORMAL:
		cell.set_state(HexCell.CellState.HOVERED)

func _on_cell_hover_exited(cell: HexCell) -> void:
	if cell != selected_cell and cell.current_state == HexCell.CellState.HOVERED:
		cell.set_state(HexCell.CellState.NORMAL)
