class_name ShipData
extends Resource

## Resource defining ship type statistics and properties
## Used to create ship instances with predefined stats

@export_group("Basic Info")
@export var ship_name: String = "Unknown Ship"
@export_multiline var description: String = ""
@export_enum("Interceptor", "Corvette", "Destroyer", "Frigate", "Carrier", "Battlecruiser", "Scout", "Bomber") var ship_class: String = "Corvette"

@export_group("Combat Stats")
@export var max_hull: int = 100
@export var max_shields: int = 50
@export var armor: int = 5
@export var evasion: int = 10  # Percentage chance to evade

@export_group("Systems")
@export var max_energy: int = 10  # Reactor capacity
@export var energy_regen: int = 3  # Energy generated per turn
@export var max_action_points: int = 4  # AP per turn
@export var sensor_range: int = 8  # For initiative and detection
@export var initiative_bonus: int = 0  # Added to initiative rolls

@export_group("Movement")
@export var base_movement_range: int = 4  # Max hexes per turn with full AP
@export var movement_ap_cost: int = 1  # AP cost per hex moved

@export_group("Crew")
@export var crew_slots: int = 2  # Number of crew members this ship can have
@export var crew_capacity: int = 3  # Maximum crew that can be aboard

@export_group("Weapons")
@export var weapon_slots: int = 2  # Number of weapon systems

@export_group("Visual")
@export var sprite_path: String = ""  # Path to ship sprite
@export var tint_color: Color = Color.WHITE
@export var ship_size: float = 1.0  # Visual scale

@export_group("Costs")
@export var credit_cost: int = 100
@export var scrap_cost: int = 0

## Get AP cost to move a specific distance
func get_movement_ap_cost(distance: int) -> int:
	return distance * movement_ap_cost

## Check if ship can afford movement
func can_afford_movement(current_ap: int, distance: int) -> bool:
	return current_ap >= get_movement_ap_cost(distance)
