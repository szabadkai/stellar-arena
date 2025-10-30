class_name WeaponData
extends Resource

## Weapon data resource for all weapon types
## Defines stats, behavior, and visual properties

@export_group("Basic Info")
@export var weapon_name: String = "Weapon"
@export_multiline var description: String = ""
@export_enum("Kinetic", "Energy", "Explosive", "Missile") var damage_type: String = "Kinetic"

@export_group("Combat Stats")
@export var base_damage: int = 10
@export var accuracy: int = 80  # Base hit chance (0-100)
@export var armor_penetration: int = 0  # Ignores this much armor
@export var shield_modifier: float = 1.0  # Damage multiplier vs shields (0.5 = half damage, 2.0 = double)

@export_group("Range & Targeting")
@export var min_range: int = 1  # Minimum attack range in hexes
@export var max_range: int = 5  # Maximum attack range in hexes
@export var line_of_sight_required: bool = true  # Needs clear LOS to target
@export var aoe_radius: int = 0  # Area of effect radius (0 = single target)

@export_group("Resource Costs")
@export var ap_cost: int = 2  # Action points to fire
@export var energy_cost: int = 3  # Energy consumed per shot
@export var cooldown_turns: int = 0  # Turns before can fire again (0 = every turn)

@export_group("Ammunition")
@export var has_ammo: bool = false  # Does this weapon use limited ammo?
@export var max_ammo: int = 0  # Maximum ammunition capacity
@export var ammo_per_shot: int = 1  # Ammo consumed per shot

@export_group("Special Effects")
@export var can_overload: bool = false  # Can spend extra energy for more damage
@export var overload_damage_bonus: int = 5  # Extra damage when overloaded
@export var overload_energy_cost: int = 5  # Extra energy for overload

@export_group("Visuals & Audio")
@export var projectile_color: Color = Color.RED
@export var projectile_speed: float = 20.0  # Units per second
@export var muzzle_flash_color: Color = Color.ORANGE
@export var impact_color: Color = Color.YELLOW
@export var sound_fire: String = ""  # Path to fire sound effect
@export var sound_impact: String = ""  # Path to impact sound effect

@export_group("Acquisition")
@export var credit_cost: int = 50
@export var scrap_cost: int = 0
@export var rarity: int = 1  # 1=Common, 2=Uncommon, 3=Rare, 4=Legendary

## Calculate hit chance against a target
func calculate_hit_chance(shooter_accuracy_bonus: int, target_evasion: int) -> int:
	var hit_chance := accuracy + shooter_accuracy_bonus - target_evasion
	return clampi(hit_chance, 5, 95)  # Always 5-95% hit chance

## Calculate final damage (before armor/shields)
func calculate_damage(is_overloaded: bool = false) -> int:
	var damage := base_damage
	if is_overloaded and can_overload:
		damage += overload_damage_bonus
	return damage

## Check if weapon can fire (has resources)
func can_fire(current_ap: int, current_energy: int, current_ammo: int = -1) -> bool:
	if current_ap < ap_cost:
		return false
	if current_energy < energy_cost:
		return false
	if has_ammo and current_ammo < ammo_per_shot:
		return false
	return true

## Get total energy cost (including overload if applicable)
func get_total_energy_cost(is_overloaded: bool = false) -> int:
	var cost := energy_cost
	if is_overloaded and can_overload:
		cost += overload_energy_cost
	return cost
