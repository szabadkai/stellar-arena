class_name CombatHUD
extends CanvasLayer

## Main HUD for combat screen
## Manages all UI panels and displays

# UI panels
@onready var ship_info_panel: ShipInfoPanel = $ShipInfoPanel
@onready var turn_order_display: TurnOrderDisplay = $TurnOrderDisplay
@onready var action_buttons: VBoxContainer = $ActionButtons
@onready var weapon0_button: Button = $ActionButtons/Weapon0Button
@onready var weapon1_button: Button = $ActionButtons/Weapon1Button
@onready var end_turn_button: Button = $ActionButtons/EndTurnButton
@onready var status_label: Label = $StatusLabel

# System references
var combat_manager: CombatManager = null
var turn_manager: TurnManager = null
var current_ship: ShipNode = null

func _ready() -> void:
	# Set up buttons
	if end_turn_button:
		end_turn_button.pressed.connect(_on_end_turn_pressed)
	if weapon0_button:
		weapon0_button.pressed.connect(_on_weapon0_pressed)
		weapon0_button.visible = false
	if weapon1_button:
		weapon1_button.pressed.connect(_on_weapon1_pressed)
		weapon1_button.visible = false

	# Hide action buttons initially
	if action_buttons:
		action_buttons.visible = false

## Initialize with references to combat systems
func initialize(p_combat_manager: CombatManager, p_turn_manager: TurnManager) -> void:
	combat_manager = p_combat_manager
	turn_manager = p_turn_manager

	# Initialize sub-panels
	if turn_order_display:
		turn_order_display.initialize(turn_manager)

	# Connect to combat manager signals
	if combat_manager:
		combat_manager.ship_selected.connect(_on_ship_selected)
		combat_manager.ship_deselected.connect(_on_ship_deselected)

	# Connect to turn manager signals
	if turn_manager:
		turn_manager.turn_started.connect(_on_turn_started)
		turn_manager.turn_ended.connect(_on_turn_ended)

## Update status message
func update_status(message: String) -> void:
	if status_label:
		status_label.text = message

## Show ship information
func show_ship_info(ship: ShipNode) -> void:
	if ship_info_panel:
		ship_info_panel.display_ship(ship)

## Hide ship information
func hide_ship_info() -> void:
	if ship_info_panel and ship_info_panel.current_ship:
		ship_info_panel.clear_display()

## Show action buttons for player turn
func show_action_buttons(is_visible: bool) -> void:
	if action_buttons:
		action_buttons.visible = is_visible

## Update weapon buttons based on ship's weapons
func update_weapon_buttons(ship: ShipNode) -> void:
	current_ship = ship

	if weapon0_button:
		if ship.weapons.size() > 0:
			var weapon: WeaponData = ship.weapons[0] as WeaponData
			weapon0_button.text = "%s (AP:%d E:%d)" % [weapon.weapon_name, weapon.ap_cost, weapon.energy_cost]
			weapon0_button.visible = true
			weapon0_button.disabled = not weapon.can_fire(ship.current_ap, ship.current_energy)
		else:
			weapon0_button.visible = false

	if weapon1_button:
		if ship.weapons.size() > 1:
			var weapon: WeaponData = ship.weapons[1] as WeaponData
			weapon1_button.text = "%s (AP:%d E:%d)" % [weapon.weapon_name, weapon.ap_cost, weapon.energy_cost]
			weapon1_button.visible = true
			weapon1_button.disabled = not weapon.can_fire(ship.current_ap, ship.current_energy)
		else:
			weapon1_button.visible = false

## Signal handlers
func _on_ship_selected(ship: ShipNode) -> void:
	show_ship_info(ship)
	if ship.is_player_controlled:
		update_weapon_buttons(ship)

func _on_ship_deselected() -> void:
	hide_ship_info()
	current_ship = null

func _on_turn_started(ship: ShipNode, _turn_number: int) -> void:
	var status := "%s's turn" % ship.ship_display_name
	update_status(status)

	# Show action buttons for player ships
	show_action_buttons(ship.is_player_controlled)

	if ship.is_player_controlled:
		update_weapon_buttons(ship)

func _on_turn_ended(_ship: ShipNode) -> void:
	show_action_buttons(false)

func _on_end_turn_pressed() -> void:
	if combat_manager:
		combat_manager.end_player_turn()

func _on_weapon0_pressed() -> void:
	if combat_manager and current_ship and current_ship.weapons.size() > 0:
		var weapon: WeaponData = current_ship.weapons[0] as WeaponData
		combat_manager.enter_targeting_mode(weapon)

func _on_weapon1_pressed() -> void:
	if combat_manager and current_ship and current_ship.weapons.size() > 1:
		var weapon: WeaponData = current_ship.weapons[1] as WeaponData
		combat_manager.enter_targeting_mode(weapon)
