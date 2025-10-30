class_name HexCell
extends Node3D

## Represents a single hex cell on the combat grid
## Handles visual states, occupancy, and interactions

signal cell_clicked(cell: HexCell)
signal cell_hovered(cell: HexCell)
signal cell_hover_exited(cell: HexCell)

# Cell properties
var axial_coords: Vector2i
var world_position: Vector3
var is_occupied := false
var occupying_ship: Node = null
var is_blocked := false  # For hazards/obstacles
var movement_cost := 1  # Base movement cost (can be modified by terrain)

# Visual states
enum CellState {
	NORMAL,
	HOVERED,
	SELECTED,
	VALID_MOVE,
	INVALID_MOVE,
	ATTACK_RANGE,
	PATH
}

var current_state := CellState.NORMAL

# Visual components
@onready var mesh_instance: MeshInstance3D = $MeshInstance3D
@onready var collision_area: Area3D = $Area3D

# Colors for different states
const COLOR_NORMAL := Color(0.2, 0.2, 0.3, 0.5)
const COLOR_HOVERED := Color(0.4, 0.4, 0.5, 0.7)
const COLOR_SELECTED := Color(0.3, 0.6, 0.8, 0.8)
const COLOR_VALID_MOVE := Color(0.3, 0.8, 0.3, 0.6)
const COLOR_INVALID_MOVE := Color(0.8, 0.3, 0.3, 0.6)
const COLOR_ATTACK_RANGE := Color(0.8, 0.6, 0.2, 0.6)
const COLOR_PATH := Color(0.5, 0.7, 0.9, 0.7)

func _ready() -> void:
	# Connect area signals for mouse interaction
	if collision_area:
		collision_area.input_event.connect(_on_area_input_event)
		collision_area.mouse_entered.connect(_on_mouse_entered)
		collision_area.mouse_exited.connect(_on_mouse_exited)

	# Apply initial visual state
	update_visual()

## Initialize cell with axial coordinates
func initialize(coords: Vector2i, hex_size: float = 1.0) -> void:
	axial_coords = coords
	world_position = HexMath.axial_to_world(coords, hex_size)
	position = world_position

	# Create hexagonal mesh if not already present
	if not mesh_instance or not mesh_instance.mesh:
		create_hex_mesh(hex_size)

## Create a hexagonal mesh for this cell
func create_hex_mesh(hex_size: float) -> void:
	# Use existing mesh_instance if available, otherwise create new one
	if not mesh_instance:
		mesh_instance = MeshInstance3D.new()
		add_child(mesh_instance)

	# Create hexagon mesh
	var surface_array := []
	surface_array.resize(Mesh.ARRAY_MAX)

	var vertices := PackedVector3Array()
	var indices := PackedInt32Array()
	var normals := PackedVector3Array()
	var uvs := PackedVector2Array()

	# Hexagon vertices (flat-top)
	var angle_step := PI / 3.0
	var radius := hex_size * 0.95  # Slightly smaller to show gaps between cells

	# Center vertex
	vertices.append(Vector3(0, 0.01, 0))  # Slightly above ground
	normals.append(Vector3.UP)
	uvs.append(Vector2(0.5, 0.5))

	# Outer vertices
	for i in 6:
		var angle := angle_step * i
		var x := cos(angle) * radius
		var z := sin(angle) * radius
		vertices.append(Vector3(x, 0.01, z))
		normals.append(Vector3.UP)
		uvs.append(Vector2(0.5 + cos(angle) * 0.5, 0.5 + sin(angle) * 0.5))

	# Create triangles
	for i in 6:
		indices.append(0)
		indices.append(i + 1)
		indices.append((i + 1) % 6 + 1)

	surface_array[Mesh.ARRAY_VERTEX] = vertices
	surface_array[Mesh.ARRAY_INDEX] = indices
	surface_array[Mesh.ARRAY_NORMAL] = normals
	surface_array[Mesh.ARRAY_TEX_UV] = uvs

	var array_mesh := ArrayMesh.new()
	array_mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, surface_array)

	mesh_instance.mesh = array_mesh

	# Create material
	var material := StandardMaterial3D.new()
	material.albedo_color = COLOR_NORMAL
	material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mesh_instance.set_surface_override_material(0, material)

	# Create collision area for mouse interaction if not exists
	if not collision_area:
		collision_area = Area3D.new()
		add_child(collision_area)

	# Get or create collision shape
	var collision_shape: CollisionShape3D
	if collision_area.get_child_count() > 0:
		collision_shape = collision_area.get_child(0) as CollisionShape3D

	if not collision_shape:
		collision_shape = CollisionShape3D.new()
		collision_area.add_child(collision_shape)

	# Set up the shape
	var shape := CylinderShape3D.new()
	shape.radius = radius
	shape.height = 0.1
	collision_shape.shape = shape
	collision_shape.position = Vector3(0, 0.05, 0)

	# Set up collision layers
	collision_area.collision_layer = 1  # Enable layer 1 so it can be clicked
	collision_area.collision_mask = 0   # Don't need to detect other objects
	collision_area.input_ray_pickable = true

	# Connect signals for mouse interaction (do it here since collision_area is just created)
	if not collision_area.input_event.is_connected(_on_area_input_event):
		collision_area.input_event.connect(_on_area_input_event)
	if not collision_area.mouse_entered.is_connected(_on_mouse_entered):
		collision_area.mouse_entered.connect(_on_mouse_entered)
	if not collision_area.mouse_exited.is_connected(_on_mouse_exited):
		collision_area.mouse_exited.connect(_on_mouse_exited)

## Set visual state
func set_state(new_state: CellState) -> void:
	current_state = new_state
	update_visual()

## Update visual appearance based on current state
func update_visual() -> void:
	if not mesh_instance or not mesh_instance.mesh:
		return

	var material: StandardMaterial3D = mesh_instance.get_surface_override_material(0) as StandardMaterial3D
	if not material:
		return

	match current_state:
		CellState.NORMAL:
			material.albedo_color = COLOR_NORMAL
		CellState.HOVERED:
			material.albedo_color = COLOR_HOVERED
		CellState.SELECTED:
			material.albedo_color = COLOR_SELECTED
		CellState.VALID_MOVE:
			material.albedo_color = COLOR_VALID_MOVE
		CellState.INVALID_MOVE:
			material.albedo_color = COLOR_INVALID_MOVE
		CellState.ATTACK_RANGE:
			material.albedo_color = COLOR_ATTACK_RANGE
		CellState.PATH:
			material.albedo_color = COLOR_PATH

## Mark cell as occupied by a ship
func set_occupied(ship: Node) -> void:
	is_occupied = true
	occupying_ship = ship

## Mark cell as unoccupied
func clear_occupied() -> void:
	is_occupied = false
	occupying_ship = null

## Mark cell as blocked (by hazard/obstacle)
func set_blocked(blocked: bool) -> void:
	is_blocked = blocked
	if blocked:
		movement_cost = 999  # Effectively impassable

## Get distance to another cell
func distance_to(other: HexCell) -> int:
	return HexMath.hex_distance(axial_coords, other.axial_coords)

## Check if this cell is adjacent to another
func is_adjacent_to(other: HexCell) -> int:
	return distance_to(other) == 1

## Input handling
func _on_area_input_event(_camera: Node, event: InputEvent, _pos: Vector3, _normal: Vector3, _shape: int) -> void:
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
			print("HexCell clicked: ", axial_coords)
			cell_clicked.emit(self)

func _on_mouse_entered() -> void:
	cell_hovered.emit(self)

func _on_mouse_exited() -> void:
	cell_hover_exited.emit(self)
