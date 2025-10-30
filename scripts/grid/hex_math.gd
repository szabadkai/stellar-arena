class_name HexMath
extends RefCounted

## Hexagonal grid math utilities using axial coordinates
## References: https://www.redblobgames.com/grids/hexagons/

# Hex grid constants
const HEX_SIZE := 1.0  # Base size of a hex
const HEX_LAYOUT_FLAT := true  # Flat-top hexagons (easier for tactical combat)

# Axial directions for neighbors (6 directions)
const AXIAL_DIRECTIONS := [
	Vector2i(1, 0), Vector2i(1, -1), Vector2i(0, -1),
	Vector2i(-1, 0), Vector2i(-1, 1), Vector2i(0, 1)
]

## Convert axial coordinates to world position (3D)
static func axial_to_world(axial: Vector2i, hex_size: float = HEX_SIZE) -> Vector3:
	var x: float
	var z: float

	if HEX_LAYOUT_FLAT:
		# Flat-top hexagon layout
		x = hex_size * (3.0 / 2.0 * axial.x)
		z = hex_size * (sqrt(3.0) / 2.0 * axial.x + sqrt(3.0) * axial.y)
	else:
		# Pointy-top hexagon layout
		x = hex_size * (sqrt(3.0) * axial.x + sqrt(3.0) / 2.0 * axial.y)
		z = hex_size * (3.0 / 2.0 * axial.y)

	return Vector3(x, 0, z)

## Convert world position to axial coordinates
static func world_to_axial(world_pos: Vector3, hex_size: float = HEX_SIZE) -> Vector2i:
	var q: float
	var r: float

	if HEX_LAYOUT_FLAT:
		# Flat-top hexagon layout
		q = (2.0 / 3.0 * world_pos.x) / hex_size
		r = (-1.0 / 3.0 * world_pos.x + sqrt(3.0) / 3.0 * world_pos.z) / hex_size
	else:
		# Pointy-top hexagon layout
		q = (sqrt(3.0) / 3.0 * world_pos.x - 1.0 / 3.0 * world_pos.z) / hex_size
		r = (2.0 / 3.0 * world_pos.z) / hex_size

	return axial_round(Vector2(q, r))

## Convert axial to cube coordinates (for easier math operations)
static func axial_to_cube(axial: Vector2i) -> Vector3i:
	var q := axial.x
	var r := axial.y
	var s := -q - r
	return Vector3i(q, r, s)

## Convert cube to axial coordinates
static func cube_to_axial(cube: Vector3i) -> Vector2i:
	return Vector2i(cube.x, cube.y)

## Round fractional axial coordinates to nearest hex
static func axial_round(axial: Vector2) -> Vector2i:
	# Convert to cube for easier rounding
	var q := axial.x
	var r := axial.y
	var s := -q - r

	var rq: float = round(q)
	var rr: float = round(r)
	var rs: float = round(s)

	var q_diff: float = abs(rq - q)
	var r_diff: float = abs(rr - r)
	var s_diff: float = abs(rs - s)

	# Reset the component with the largest difference
	if q_diff > r_diff and q_diff > s_diff:
		rq = -rr - rs
	elif r_diff > s_diff:
		rr = -rq - rs
	else:
		rs = -rq - rr

	return Vector2i(int(rq), int(rr))

## Get distance between two hexes (in hex steps)
static func hex_distance(a: Vector2i, b: Vector2i) -> int:
	var cube_a := axial_to_cube(a)
	var cube_b := axial_to_cube(b)
	return (abs(cube_a.x - cube_b.x) + abs(cube_a.y - cube_b.y) + abs(cube_a.z - cube_b.z)) / 2

## Get all neighbors of a hex
static func get_neighbors(axial: Vector2i) -> Array[Vector2i]:
	var neighbors: Array[Vector2i] = []
	for direction in AXIAL_DIRECTIONS:
		neighbors.append(axial + direction)
	return neighbors

## Get neighbor in specific direction (0-5)
static func get_neighbor(axial: Vector2i, direction: int) -> Vector2i:
	return axial + AXIAL_DIRECTIONS[direction % 6]

## Get all hexes within a certain range
static func get_hexes_in_range(center: Vector2i, radius: int) -> Array[Vector2i]:
	var results: Array[Vector2i] = []
	for q in range(-radius, radius + 1):
		var r1: int = maxi(-radius, -q - radius)
		var r2: int = mini(radius, -q + radius)
		for r in range(r1, r2 + 1):
			results.append(center + Vector2i(q, r))
	return results

## Get hexes in a ring at specific distance
static func get_hex_ring(center: Vector2i, radius: int) -> Array[Vector2i]:
	var results: Array[Vector2i] = []
	if radius == 0:
		results.append(center)
		return results

	var hex: Vector2i = center + AXIAL_DIRECTIONS[4] * radius
	for i in 6:
		for _j in radius:
			results.append(hex)
			hex = get_neighbor(hex, i)

	return results

## Get line of hexes from A to B (for line of sight checks)
static func hex_line(a: Vector2i, b: Vector2i) -> Array[Vector2i]:
	var distance := hex_distance(a, b)
	var results: Array[Vector2i] = []

	if distance == 0:
		results.append(a)
		return results

	for i in range(distance + 1):
		var t := float(i) / float(distance)
		var cube_a := Vector3(axial_to_cube(a))
		var cube_b := Vector3(axial_to_cube(b))
		var lerped := cube_a.lerp(cube_b, t)
		results.append(cube_to_axial(Vector3i(round(lerped.x), round(lerped.y), round(lerped.z))))

	return results

## Check if a hex is within grid bounds
static func is_in_bounds(axial: Vector2i, grid_radius: int) -> bool:
	var cube := axial_to_cube(axial)
	return abs(cube.x) <= grid_radius and abs(cube.y) <= grid_radius and abs(cube.z) <= grid_radius

## Check if a hex is within rectangular grid bounds (for 15x15 grid)
static func is_in_rect_bounds(axial: Vector2i, width: int, height: int) -> bool:
	return axial.x >= 0 and axial.x < width and axial.y >= 0 and axial.y < height

## Get direction angle from one hex to another (in radians)
static func get_direction_angle(from: Vector2i, to: Vector2i) -> float:
	var from_world := axial_to_world(from)
	var to_world := axial_to_world(to)
	var delta := to_world - from_world
	return atan2(delta.z, delta.x)

## Rotate a hex coordinate around center by 60-degree steps
static func rotate_hex(axial: Vector2i, center: Vector2i, rotations: int) -> Vector2i:
	var relative := axial - center
	var cube := axial_to_cube(relative)

	# Rotate in 60-degree increments (rotations can be negative)
	rotations = rotations % 6
	if rotations < 0:
		rotations += 6

	var rotated := cube
	for i in rotations:
		# 60-degree rotation in cube coordinates: (x,y,z) -> (-z,-x,-y)
		rotated = Vector3i(-rotated.z, -rotated.x, -rotated.y)

	return cube_to_axial(rotated) + center
