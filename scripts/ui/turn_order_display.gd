class_name TurnOrderDisplay
extends PanelContainer

## Displays the turn order for all ships in combat

@onready var turn_list: VBoxContainer = $MarginContainer/VBoxContainer/ScrollContainer/TurnList
@onready var round_label: Label = $MarginContainer/VBoxContainer/RoundLabel

# Turn manager reference
var turn_manager: TurnManager = null

# Turn entry scene (will be created programmatically)
const TURN_ENTRY_HEIGHT = 30

func _ready() -> void:
	pass

## Initialize with turn manager reference
func initialize(p_turn_manager: TurnManager) -> void:
	turn_manager = p_turn_manager

	# Connect to turn manager signals
	if turn_manager:
		turn_manager.initiative_order_changed.connect(_on_initiative_order_changed)
		turn_manager.round_started.connect(_on_round_started)
		turn_manager.turn_started.connect(_on_turn_started)

## Update the turn order display
func update_turn_order(ships: Array[ShipNode]) -> void:
	# Clear existing entries
	clear_turn_list()

	# Create entry for each ship
	for i in ships.size():
		var ship: ShipNode = ships[i]
		create_turn_entry(ship, i + 1)

## Create a turn entry for a ship
func create_turn_entry(ship: ShipNode, position: int) -> void:
	if not turn_list:
		return

	var entry := HBoxContainer.new()
	entry.custom_minimum_size.y = TURN_ENTRY_HEIGHT

	# Position label
	var pos_label := Label.new()
	pos_label.text = "%d." % position
	pos_label.custom_minimum_size.x = 30
	entry.add_child(pos_label)

	# Ship name
	var name_label := Label.new()
	name_label.text = ship.ship_display_name
	name_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	entry.add_child(name_label)

	# Team indicator
	var team_label := Label.new()
	team_label.text = "Player" if ship.team == 0 else "Enemy"
	team_label.custom_minimum_size.x = 60
	if ship.team == 0:
		team_label.modulate = Color(0.3, 0.8, 0.3)
	else:
		team_label.modulate = Color(0.8, 0.3, 0.3)
	entry.add_child(team_label)

	# Highlight current turn
	if turn_manager and turn_manager.get_active_ship() == ship:
		entry.modulate = Color(1.3, 1.3, 0.8)

	turn_list.add_child(entry)

## Clear all turn entries
func clear_turn_list() -> void:
	if not turn_list:
		return

	for child in turn_list.get_children():
		child.queue_free()

## Update round display
func update_round(round_number: int) -> void:
	if round_label:
		round_label.text = "Round: %d" % round_number

## Signal handlers
func _on_initiative_order_changed(order: Array[ShipNode]) -> void:
	update_turn_order(order)

func _on_round_started(round_number: int) -> void:
	update_round(round_number)

func _on_turn_started(_ship: ShipNode, _turn_number: int) -> void:
	# Refresh display to highlight current ship
	if turn_manager:
		var order := turn_manager.get_turn_order()
		update_turn_order(order)
