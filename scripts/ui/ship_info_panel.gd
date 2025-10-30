class_name ShipInfoPanel
extends PanelContainer

## Displays detailed information about a selected ship

# UI elements
@onready var ship_name_label: Label = $MarginContainer/VBoxContainer/ShipName
@onready var ship_class_label: Label = $MarginContainer/VBoxContainer/ShipClass
@onready var hull_label: Label = $MarginContainer/VBoxContainer/Stats/HullLabel
@onready var shields_label: Label = $MarginContainer/VBoxContainer/Stats/ShieldsLabel
@onready var energy_label: Label = $MarginContainer/VBoxContainer/Stats/EnergyLabel
@onready var ap_label: Label = $MarginContainer/VBoxContainer/Stats/APLabel
@onready var hull_bar: ProgressBar = $MarginContainer/VBoxContainer/Bars/HullBar
@onready var shields_bar: ProgressBar = $MarginContainer/VBoxContainer/Bars/ShieldsBar
@onready var energy_bar: ProgressBar = $MarginContainer/VBoxContainer/Bars/EnergyBar

# Current ship being displayed
var current_ship: ShipNode = null

func _ready() -> void:
	hide()  # Hidden by default until ship is selected

## Display information for a ship
func display_ship(ship: ShipNode) -> void:
	if not ship:
		hide()
		return

	current_ship = ship

	# Connect to ship signals for real-time updates
	if not ship.hull_changed.is_connected(_on_ship_hull_changed):
		ship.hull_changed.connect(_on_ship_hull_changed)
	if not ship.shields_changed.is_connected(_on_ship_shields_changed):
		ship.shields_changed.connect(_on_ship_shields_changed)
	if not ship.energy_changed.is_connected(_on_ship_energy_changed):
		ship.energy_changed.connect(_on_ship_energy_changed)
	if not ship.ap_changed.is_connected(_on_ship_ap_changed):
		ship.ap_changed.connect(_on_ship_ap_changed)

	# Update display
	update_display()
	show()

## Update all display elements
func update_display() -> void:
	if not current_ship or not current_ship.ship_data:
		return

	# Update labels
	if ship_name_label:
		ship_name_label.text = current_ship.ship_display_name
	if ship_class_label:
		ship_class_label.text = current_ship.ship_data.ship_class

	update_stats()

## Update stat displays
func update_stats() -> void:
	if not current_ship or not current_ship.ship_data:
		return

	# Hull
	if hull_label:
		hull_label.text = "Hull: %d/%d" % [current_ship.current_hull, current_ship.ship_data.max_hull]
	if hull_bar:
		hull_bar.max_value = float(current_ship.ship_data.max_hull)
		hull_bar.value = float(current_ship.current_hull)

	# Shields
	if shields_label:
		shields_label.text = "Shields: %d/%d" % [current_ship.current_shields, current_ship.ship_data.max_shields]
	if shields_bar:
		shields_bar.max_value = float(current_ship.ship_data.max_shields)
		shields_bar.value = float(current_ship.current_shields)

	# Energy
	if energy_label:
		energy_label.text = "Energy: %d/%d" % [current_ship.current_energy, current_ship.ship_data.max_energy]
	if energy_bar:
		energy_bar.max_value = float(current_ship.ship_data.max_energy)
		energy_bar.value = float(current_ship.current_energy)

	# AP
	if ap_label:
		ap_label.text = "AP: %d/%d" % [current_ship.current_ap, current_ship.ship_data.max_action_points]

## Clear display
func clear_display() -> void:
	if not current_ship:
		return  # Already cleared, prevent unnecessary work

	# Disconnect signals
	if current_ship.hull_changed.is_connected(_on_ship_hull_changed):
		current_ship.hull_changed.disconnect(_on_ship_hull_changed)
	if current_ship.shields_changed.is_connected(_on_ship_shields_changed):
		current_ship.shields_changed.disconnect(_on_ship_shields_changed)
	if current_ship.energy_changed.is_connected(_on_ship_energy_changed):
		current_ship.energy_changed.disconnect(_on_ship_energy_changed)
	if current_ship.ap_changed.is_connected(_on_ship_ap_changed):
		current_ship.ap_changed.disconnect(_on_ship_ap_changed)

	current_ship = null
	visible = false  # Use visible = false instead of hide() to avoid potential signal issues

## Signal handlers
func _on_ship_hull_changed(_ship: ShipNode, _new_hull: int) -> void:
	update_stats()

func _on_ship_shields_changed(_ship: ShipNode, _new_shields: int) -> void:
	update_stats()

func _on_ship_energy_changed(_ship: ShipNode, _new_energy: int) -> void:
	update_stats()

func _on_ship_ap_changed(_ship: ShipNode, _new_ap: int) -> void:
	update_stats()
