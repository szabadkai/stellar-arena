class_name CameraController
extends Camera3D

## Camera controller for tactical combat view
## Handles panning, zooming, and rotation

# Camera movement
@export var pan_speed := 20.0
@export var edge_pan_margin := 50.0  # Pixels from edge to start panning
@export var zoom_speed := 5.0
@export var zoom_min := 15.0
@export var zoom_max := 50.0

# Camera rotation
@export var rotation_speed := 2.0
@export var allow_rotation := false  # Can be enabled later

# Current orthographic size for zooming
var current_size := 30.0

# Viewport size for edge detection
var viewport_size := Vector2.ZERO

func _ready() -> void:
	viewport_size = get_viewport().get_visible_rect().size
	current_size = size

func _process(delta: float) -> void:
	handle_camera_movement(delta)
	handle_camera_zoom(delta)

## Handle camera panning
func handle_camera_movement(delta: float) -> void:
	var move_direction := Vector3.ZERO

	# Keyboard controls (WASD or Arrow keys)
	if Input.is_action_pressed("ui_right") or Input.is_key_pressed(KEY_D):
		move_direction.x += 1
	if Input.is_action_pressed("ui_left") or Input.is_key_pressed(KEY_A):
		move_direction.x -= 1
	if Input.is_action_pressed("ui_down") or Input.is_key_pressed(KEY_S):
		move_direction.z += 1
	if Input.is_action_pressed("ui_up") or Input.is_key_pressed(KEY_W):
		move_direction.z -= 1

	# Mouse edge panning
	var mouse_pos := get_viewport().get_mouse_position()
	if mouse_pos.x < edge_pan_margin:
		move_direction.x -= 1
	elif mouse_pos.x > viewport_size.x - edge_pan_margin:
		move_direction.x += 1
	if mouse_pos.y < edge_pan_margin:
		move_direction.z -= 1
	elif mouse_pos.y > viewport_size.y - edge_pan_margin:
		move_direction.z += 1

	# Apply movement
	if move_direction != Vector3.ZERO:
		move_direction = move_direction.normalized()
		position += move_direction * pan_speed * delta

## Handle camera zoom
func handle_camera_zoom(delta: float) -> void:
	var zoom_delta := 0.0

	# Mouse wheel
	if Input.is_action_just_pressed("ui_page_up"):
		zoom_delta = -zoom_speed
	elif Input.is_action_just_pressed("ui_page_down"):
		zoom_delta = zoom_speed

	# Keyboard (Q/E keys)
	if Input.is_key_pressed(KEY_Q):
		zoom_delta = -zoom_speed * delta
	elif Input.is_key_pressed(KEY_E):
		zoom_delta = zoom_speed * delta

	if zoom_delta != 0:
		current_size = clamp(current_size + zoom_delta, zoom_min, zoom_max)
		size = current_size

## Focus camera on a specific world position
func focus_on_position(world_pos: Vector3, smooth := true) -> void:
	var target_pos := position
	target_pos.x = world_pos.x
	target_pos.z = world_pos.z

	if smooth:
		var tween := create_tween()
		tween.tween_property(self, "position", target_pos, 0.3).set_trans(Tween.TRANS_CUBIC)
	else:
		position = target_pos

## Reset camera to default position
func reset_camera() -> void:
	var tween := create_tween()
	tween.set_parallel(true)
	tween.tween_property(self, "position", Vector3(10.5, 25, 18), 0.5).set_trans(Tween.TRANS_CUBIC)
	tween.tween_property(self, "size", 30.0, 0.5).set_trans(Tween.TRANS_CUBIC)
	current_size = 30.0
