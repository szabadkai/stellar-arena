class_name HexPathfinding
extends RefCounted

## A* pathfinding implementation for hexagonal grids
## Supports movement cost, obstacles, and AP limitations

## Internal class for A* node data
class PathNode:
	var cell: HexCell
	var parent: PathNode
	var g_cost: float = 0.0  # Cost from start
	var h_cost: float = 0.0  # Heuristic cost to goal
	var f_cost: float = 0.0  # Total cost (g + h)

	func _init(p_cell: HexCell, p_parent: PathNode = null) -> void:
		cell = p_cell
		parent = p_parent

	func calculate_f_cost() -> void:
		f_cost = g_cost + h_cost

## Find path from start cell to goal cell
## Returns array of HexCells representing the path (including start and goal)
static func find_path(start: HexCell, goal: HexCell, grid: GridManager, max_cost: float = INF) -> Array[HexCell]:
	if not start or not goal:
		return []

	if start == goal:
		return [start]

	# Check if goal is walkable
	if goal.is_blocked:
		return []

	var open_list: Array[PathNode] = []
	var closed_list: Dictionary = {}  # Vector2i -> PathNode
	var path: Array[HexCell] = []

	# Create start node
	var start_node := PathNode.new(start)
	start_node.g_cost = 0
	start_node.h_cost = heuristic(start, goal)
	start_node.calculate_f_cost()
	open_list.append(start_node)

	while open_list.size() > 0:
		# Find node with lowest f_cost
		var current_node: PathNode = get_lowest_f_cost_node(open_list)
		open_list.erase(current_node)
		closed_list[current_node.cell.axial_coords] = current_node

		# Check if we reached the goal
		if current_node.cell == goal:
			# Reconstruct path
			path = reconstruct_path(current_node)
			return path

		# Explore neighbors
		var neighbors := grid.get_neighbors(current_node.cell)
		for neighbor in neighbors:
			# Skip if already evaluated
			if closed_list.has(neighbor.axial_coords):
				continue

			# Skip if blocked or occupied (unless it's the goal)
			if neighbor.is_blocked or (neighbor.is_occupied and neighbor != goal):
				continue

			var movement_cost := float(neighbor.movement_cost)
			var tentative_g_cost := current_node.g_cost + movement_cost

			# Skip if exceeds max cost (AP limit)
			if tentative_g_cost > max_cost:
				continue

			# Check if this path to neighbor is better
			var neighbor_node := find_node_in_list(open_list, neighbor)

			if not neighbor_node:
				# New node
				neighbor_node = PathNode.new(neighbor, current_node)
				neighbor_node.g_cost = tentative_g_cost
				neighbor_node.h_cost = heuristic(neighbor, goal)
				neighbor_node.calculate_f_cost()
				open_list.append(neighbor_node)
			elif tentative_g_cost < neighbor_node.g_cost:
				# Better path found
				neighbor_node.parent = current_node
				neighbor_node.g_cost = tentative_g_cost
				neighbor_node.calculate_f_cost()

	# No path found
	return []

## Get all reachable cells within AP range
## Returns dictionary of Vector2i -> path cost
static func get_reachable_cells(start: HexCell, grid: GridManager, max_cost: float) -> Dictionary:
	if not start:
		return {}

	var reachable: Dictionary = {}  # Vector2i -> cost
	var open_list: Array[PathNode] = []
	var closed_list: Dictionary = {}  # Vector2i -> PathNode

	# Create start node
	var start_node := PathNode.new(start)
	start_node.g_cost = 0
	start_node.calculate_f_cost()
	open_list.append(start_node)
	reachable[start.axial_coords] = 0.0

	while open_list.size() > 0:
		var current_node: PathNode = open_list.pop_front()
		closed_list[current_node.cell.axial_coords] = current_node

		# Explore neighbors
		var neighbors := grid.get_neighbors(current_node.cell)
		for neighbor in neighbors:
			# Skip if already evaluated
			if closed_list.has(neighbor.axial_coords):
				continue

			# Skip if blocked
			if neighbor.is_blocked:
				continue

			var movement_cost := float(neighbor.movement_cost)
			var tentative_g_cost := current_node.g_cost + movement_cost

			# Skip if exceeds max cost
			if tentative_g_cost > max_cost:
				continue

			# Skip if occupied (can't end move on occupied cell, but can path through for range)
			if neighbor.is_occupied:
				continue

			# Check if better path exists
			if not reachable.has(neighbor.axial_coords) or tentative_g_cost < float(reachable[neighbor.axial_coords]):
				reachable[neighbor.axial_coords] = tentative_g_cost

				var neighbor_node := PathNode.new(neighbor, current_node)
				neighbor_node.g_cost = tentative_g_cost
				neighbor_node.calculate_f_cost()
				open_list.append(neighbor_node)

	return reachable

## Heuristic function (Manhattan distance for hex grids)
static func heuristic(from: HexCell, to: HexCell) -> float:
	return float(HexMath.hex_distance(from.axial_coords, to.axial_coords))

## Get node with lowest f_cost from list
static func get_lowest_f_cost_node(nodes: Array[PathNode]) -> PathNode:
	var lowest_node: PathNode = nodes[0]
	for node in nodes:
		if node.f_cost < lowest_node.f_cost:
			lowest_node = node
		elif node.f_cost == lowest_node.f_cost and node.h_cost < lowest_node.h_cost:
			# Tiebreaker: prefer lower h_cost
			lowest_node = node
	return lowest_node

## Find node in list by cell
static func find_node_in_list(nodes: Array[PathNode], cell: HexCell) -> PathNode:
	for node in nodes:
		if node.cell == cell:
			return node
	return null

## Reconstruct path from goal node to start
static func reconstruct_path(goal_node: PathNode) -> Array[HexCell]:
	var path: Array[HexCell] = []
	var current_node := goal_node

	while current_node != null:
		path.push_front(current_node.cell)
		current_node = current_node.parent

	return path

## Calculate total path cost
static func get_path_cost(path: Array[HexCell]) -> float:
	var cost := 0.0
	for i in range(1, path.size()):
		cost += path[i].movement_cost
	return cost
