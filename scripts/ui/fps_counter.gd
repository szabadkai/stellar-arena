extends Label

## Simple FPS counter for performance testing
## Toggle with F2

var show_fps := false

func _ready() -> void:
	hide()

func _process(_delta: float) -> void:
	if show_fps:
		text = "FPS: %d" % Engine.get_frames_per_second()

func _input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and event.keycode == KEY_F2:
		show_fps = not show_fps
		visible = show_fps
		get_viewport().set_input_as_handled()
