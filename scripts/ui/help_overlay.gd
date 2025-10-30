class_name HelpOverlay
extends CanvasLayer

## In-game help overlay that can be toggled with F1

@onready var panel: PanelContainer = $Panel
@onready var help_text: RichTextLabel = $Panel/MarginContainer/HelpText

var help_visible := false

func _ready() -> void:
	# Start hidden
	hide_help()

	# Set up help text
	if help_text:
		help_text.bbcode_enabled = true
		help_text.text = get_help_text()

func _input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and event.keycode == KEY_F1:
		toggle_help()
		get_viewport().set_input_as_handled()

func toggle_help() -> void:
	help_visible = not help_visible
	if help_visible:
		show_help()
	else:
		hide_help()

func show_help() -> void:
	if panel:
		panel.visible = true

func hide_help() -> void:
	if panel:
		panel.visible = false

func get_help_text() -> String:
	return """[center][b]STELLAR ARENA - CONTROLS[/b][/center]

[b]CAMERA CONTROLS[/b]
• [color=cyan]WASD / Arrow Keys[/color] - Pan camera
• [color=cyan]Mouse edge scroll[/color] - Pan by moving mouse to screen edges
• [color=cyan]Q / E[/color] - Zoom in/out
• [color=cyan]Mouse Wheel[/color] - Zoom in/out

[b]MOUSE CONTROLS[/b]
• [color=cyan]Left-click ship[/color] - Select your ship
• [color=cyan]Left-click green hex[/color] - Move ship there
• [color=cyan]Hover over ship[/color] - Preview info

[b]KEYBOARD CONTROLS[/b]
• [color=cyan]Space / Enter[/color] - End turn
• [color=cyan]ESC[/color] - Deselect ship
• [color=cyan]F1[/color] - Toggle this help
• [color=cyan]F2[/color] - Toggle FPS counter

[b]GAMEPLAY[/b]
• [color=lime]Green hexes[/color] - Valid movement range
• [color=cyan]Blue circle[/color] - Selected ship
• [color=red]Red tint[/color] - Enemy ships
• [color=yellow]AP (Action Points)[/color] - Movement cost

[b]UI PANELS[/b]
• [color=cyan]Bottom-left[/color] - Ship stats
• [color=cyan]Top-right[/color] - Turn order
• [color=cyan]Top-center[/color] - Current turn
• [color=cyan]Bottom-right[/color] - End turn button

[b]CURRENT LIMITATIONS (Phase 1)[/b]
• No weapons/combat yet
• Enemies skip their turns
• No win condition

[center][i]Press F1 to close[/i][/center]"""
