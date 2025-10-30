class_name ShipNode
extends CharacterBody3D

## Represents a ship instance in combat
## Manages ship state, stats, and combat behavior

signal ship_selected(ship: ShipNode)
signal ship_destroyed(ship: ShipNode)
signal ship_damaged(ship: ShipNode, damage: int)
signal hull_changed(ship: ShipNode, new_hull: int)
signal shields_changed(ship: ShipNode, new_shields: int)
signal energy_changed(ship: ShipNode, new_energy: int)
signal ap_changed(ship: ShipNode, new_ap: int)

# Ship configuration
@export var ship_data: ShipData

# Ship identification
var ship_id: int = -1
var ship_display_name: String = ""
var is_player_controlled: bool = false
var team: int = 0  # 0 = player, 1+ = enemy teams

# Current stats (modified from base ship_data)
var current_hull: int = 100
var current_shields: int = 50
var current_armor: int = 5
var current_energy: int = 10
var current_ap: int = 4

# Grid position
var current_cell: HexCell = null
var grid_reference: GridManager = null

# Crew members
var crew: Array = []  # Array of CrewMember resources

# Equipment
var weapons: Array = []  # Array of weapon resources
var equipment: Array = []  # Array of equipment/upgrades

# Status effects
var is_disabled: bool = false  # EMP, system failure, etc.
var is_overheated: bool = false
var status_effects: Array = []  # Array of status effect data

# Visual components
@onready var visual_sprite: Sprite3D = $Visual/Sprite3D
@onready var selection_indicator: MeshInstance3D = $SelectionIndicator
@onready var collision_area: Area3D = $Area3D

# Selection state
var is_selected: bool = false
var is_hovered: bool = false

func _ready() -> void:
	# Initialize from ship_data
	if ship_data:
		initialize_from_data()

	# Set up collision for mouse interaction
	if collision_area:
		collision_area.input_event.connect(_on_area_input_event)
		collision_area.mouse_entered.connect(_on_mouse_entered)
		collision_area.mouse_exited.connect(_on_mouse_exited)

	# Hide selection indicator by default
	if selection_indicator:
		selection_indicator.visible = false

	update_visual()

## Initialize ship stats from ShipData resource
func initialize_from_data() -> void:
	if not ship_data:
		push_error("ShipNode: No ship_data assigned!")
		return

	ship_display_name = ship_data.ship_name
	current_hull = ship_data.max_hull
	current_shields = ship_data.max_shields
	current_armor = ship_data.armor
	current_energy = ship_data.max_energy
	current_ap = ship_data.max_action_points

	# Print crew info
	if crew.size() > 0:
		print("  %s crew:" % ship_display_name)
		for crew_member in crew:
			var cm := crew_member as CrewMember
			if cm:
				print("    - %s (%s, Lvl %d)" % [cm.crew_name, cm.role, cm.skill_level])

	# Load sprite
	if visual_sprite and ship_data.sprite_path != "":
		print("Loading sprite for ", ship_data.ship_name, " from: ", ship_data.sprite_path)
		if ResourceLoader.exists(ship_data.sprite_path):
			var loaded_resource: Resource = ResourceLoader.load(ship_data.sprite_path)
			print("Loaded resource type: ", loaded_resource.get_class() if loaded_resource else "null")

			# Texture2D is the base class, but Godot imports create CompressedTexture2D or ImageTexture
			if loaded_resource and loaded_resource is Texture2D:
				var texture: Texture2D = loaded_resource as Texture2D
				visual_sprite.texture = texture
				visual_sprite.pixel_size = 0.01 * ship_data.ship_size
				print("✓ Sprite loaded successfully! Size: ", texture.get_size(), " Pixel size: ", visual_sprite.pixel_size)
				print("Visual sprite position: ", visual_sprite.global_position)
			else:
				push_warning("Resource is not a Texture2D: " + ship_data.sprite_path + " (Type: " + str(loaded_resource.get_class() if loaded_resource else "null") + ")")
		else:
			push_warning("Sprite file not found: " + ship_data.sprite_path)
	else:
		if not visual_sprite:
			push_warning("No visual_sprite node found!")
		if ship_data.sprite_path == "":
			push_warning("No sprite_path set in ship_data!")

## Place ship on grid
func place_on_grid(cell: HexCell, grid: GridManager) -> void:
	if not cell or not grid:
		print("ERROR: Cannot place ship - cell or grid is null")
		return

	# Remove from previous cell if exists
	if current_cell:
		current_cell.clear_occupied()

	# Set new position
	current_cell = cell
	grid_reference = grid
	global_position = cell.world_position
	cell.set_occupied(self)

	print("Ship ", ship_display_name, " placed at cell ", cell.axial_coords, " world pos: ", global_position)

## Start of turn refresh
func start_turn() -> void:
	# Restore AP
	current_ap = ship_data.max_action_points
	ap_changed.emit(self, current_ap)

	# Regenerate energy
	add_energy(ship_data.energy_regen)

	# Regenerate shields (partial)
	if current_shields < ship_data.max_shields:
		var shield_regen: int = maxi(1, ship_data.max_shields / 10)
		add_shields(shield_regen)

## End of turn cleanup
func end_turn() -> void:
	# Process status effects
	process_status_effects()

## Take damage
func take_damage(amount: int, damage_type: String = "kinetic") -> void:
	print("  %s taking %d %s damage. Hull: %d/%d, Shields: %d/%d, Armor: %d" % [
		ship_display_name, amount, damage_type, current_hull, ship_data.max_hull,
		current_shields, ship_data.max_shields, current_armor
	])

	var remaining_damage := amount

	# Shields absorb first
	if current_shields > 0:
		var shield_absorb: int = mini(current_shields, remaining_damage)
		remove_shields(shield_absorb)
		remaining_damage -= shield_absorb
		print("    Shields absorbed %d damage. Remaining: %d" % [shield_absorb, remaining_damage])

	# Armor reduces remaining damage
	if remaining_damage > 0:
		var armor_reduction := current_armor
		if damage_type == "energy":
			armor_reduction = current_armor / 2  # Energy weapons ignore half armor

		remaining_damage = max(0, remaining_damage - armor_reduction)
		print("    Armor reduced damage by %d. Remaining: %d" % [armor_reduction, remaining_damage])

	# Apply to hull
	if remaining_damage > 0:
		remove_hull(remaining_damage)
		print("    Hull damage: %d. New hull: %d/%d" % [remaining_damage, current_hull, ship_data.max_hull])

	ship_damaged.emit(self, amount)

## Modify hull
func add_hull(amount: int) -> void:
	current_hull = mini(current_hull + amount, ship_data.max_hull)
	hull_changed.emit(self, current_hull)

func remove_hull(amount: int) -> void:
	current_hull = maxi(0, current_hull - amount)
	hull_changed.emit(self, current_hull)

	if current_hull <= 0:
		destroy_ship()

## Modify shields
func add_shields(amount: int) -> void:
	current_shields = mini(current_shields + amount, ship_data.max_shields)
	shields_changed.emit(self, current_shields)

func remove_shields(amount: int) -> void:
	current_shields = maxi(0, current_shields - amount)
	shields_changed.emit(self, current_shields)

## Modify energy
func add_energy(amount: int) -> void:
	current_energy = mini(current_energy + amount, ship_data.max_energy)
	energy_changed.emit(self, current_energy)

func spend_energy(amount: int) -> bool:
	if current_energy >= amount:
		current_energy -= amount
		energy_changed.emit(self, current_energy)
		return true
	return false

## Modify AP
func spend_ap(amount: int) -> bool:
	if current_ap >= amount:
		current_ap -= amount
		ap_changed.emit(self, current_ap)
		return true
	return false

func has_ap(amount: int) -> bool:
	return current_ap >= amount

## Ship destruction
func destroy_ship() -> void:
	ship_destroyed.emit(self)

	# Clear from grid cell
	if current_cell:
		current_cell.clear_occupied()

	# Play destruction effect (TODO: add VFX)
	# Handle crew escape pods (TODO: implement)

	# Remove from scene
	queue_free()

## Selection
func select() -> void:
	if is_selected:
		return  # Already selected, prevent signal loop
	is_selected = true
	if selection_indicator:
		selection_indicator.visible = true
	update_visual()

func deselect() -> void:
	is_selected = false
	if selection_indicator:
		selection_indicator.visible = false
	update_visual()

## Visual updates
func update_visual() -> void:
	if not visual_sprite or not ship_data:
		return

	# Update sprite based on hull damage
	var hull_percent := float(current_hull) / float(ship_data.max_hull)
	if hull_percent < 0.3:
		visual_sprite.modulate = Color(1.0, 0.3, 0.3)  # Red when low health
	elif hull_percent < 0.6:
		visual_sprite.modulate = Color(1.0, 0.8, 0.3)  # Yellow when damaged
	else:
		visual_sprite.modulate = ship_data.tint_color

	# Highlight when selected
	if is_selected:
		visual_sprite.modulate = visual_sprite.modulate.lightened(0.3)

## Status effects
func process_status_effects() -> void:
	# Process and remove expired status effects
	for effect in status_effects:
		# TODO: Implement status effect system
		pass

## Get crew bonus totals
func get_crew_accuracy_bonus() -> int:
	var bonus := 0
	for crew_member in crew:
		var cm := crew_member as CrewMember
		if cm:
			bonus += cm.get_effective_accuracy()
	return bonus

func get_crew_evasion_bonus() -> int:
	var bonus := 0
	for crew_member in crew:
		var cm := crew_member as CrewMember
		if cm:
			bonus += cm.get_effective_evasion()
	return bonus

func get_crew_initiative_bonus() -> int:
	var bonus := 0
	for crew_member in crew:
		var cm := crew_member as CrewMember
		if cm:
			bonus += cm.get_effective_initiative()
	return bonus

func get_crew_damage_bonus() -> int:
	var bonus := 0
	for crew_member in crew:
		var cm := crew_member as CrewMember
		if cm:
			bonus += cm.get_effective_damage()
	return bonus

func get_crew_repair_bonus() -> int:
	var bonus := 0
	for crew_member in crew:
		var cm := crew_member as CrewMember
		if cm and not cm.is_injured:
			bonus += cm.repair_bonus
	return bonus

## Get initiative value for turn order
func get_initiative() -> int:
	var base_initiative := ship_data.sensor_range + ship_data.initiative_bonus
	var crew_bonus := get_crew_initiative_bonus()
	return base_initiative + crew_bonus + randi() % 6  # Add crew bonus and randomness

## Get total evasion (ship + crew)
func get_total_evasion() -> int:
	return ship_data.evasion + get_crew_evasion_bonus()

## Check if ship is alive
func is_alive() -> bool:
	return current_hull > 0

## Input handling
func _on_area_input_event(_camera: Node, event: InputEvent, _pos: Vector3, _normal: Vector3, _shape: int) -> void:
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
			ship_selected.emit(self)

func _on_mouse_entered() -> void:
	is_hovered = true
	if not is_selected and visual_sprite:
		visual_sprite.modulate = visual_sprite.modulate.lightened(0.2)

func _on_mouse_exited() -> void:
	is_hovered = false
	update_visual()
