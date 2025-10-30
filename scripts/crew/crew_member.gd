class_name CrewMember
extends Resource

## Crew member resource with stats, skills, and abilities
## Crew provide passive bonuses and can activate special abilities

@export_group("Basic Info")
@export var crew_name: String = "Crew Member"
@export_multiline var background: String = ""
@export var portrait_path: String = ""  # Path to portrait image

@export_group("Role & Skills")
@export_enum("Pilot", "Gunner", "Engineer", "Medic", "Officer", "Specialist") var role: String = "Pilot"
@export_range(1, 5) var skill_level: int = 1  # 1=Novice, 5=Elite

@export_group("Combat Bonuses")
@export var accuracy_bonus: int = 0  # Added to weapon hit chance
@export var evasion_bonus: int = 0  # Added to ship evasion
@export var initiative_bonus: int = 0  # Added to turn order roll
@export var damage_bonus: int = 0  # Added to weapon damage
@export var repair_bonus: int = 0  # Bonus hull/shield repair per turn

@export_group("Ship Stats Bonuses")
@export var movement_bonus: int = 0  # Extra movement range
@export var energy_regen_bonus: int = 0  # Extra energy per turn
@export var ap_bonus: int = 0  # Extra action points

@export_group("Special Ability")
@export var has_ability: bool = false
@export var ability_name: String = ""
@export_multiline var ability_description: String = ""
@export var ability_ap_cost: int = 2
@export var ability_energy_cost: int = 3
@export var ability_cooldown: int = 3  # Turns before can use again

# Ability types (defined by ability_name)
# "Emergency Repairs" - Restore 25% hull
# "Overcharge Weapons" - +50% damage next attack
# "Evasive Maneuvers" - +50% evasion for 2 turns
# "Target Analysis" - +30% accuracy for 2 turns
# "Rally Crew" - All crew cooldowns reduced by 1

@export_group("Status")
@export var current_cooldown: int = 0  # Turns remaining until ability ready
@export var is_injured: bool = false  # Injured crew give reduced bonuses

@export_group("Acquisition")
@export var credit_cost: int = 100
@export_enum("Common", "Uncommon", "Rare", "Legendary") var rarity: String = "Common"

## Check if ability is ready to use
func can_use_ability() -> bool:
	if not has_ability:
		return false
	if is_injured:
		return false
	if current_cooldown > 0:
		return false
	return true

## Use the ability (cooldown management)
func use_ability() -> void:
	if not can_use_ability():
		return
	current_cooldown = ability_cooldown

## Reduce cooldown at end of turn
func reduce_cooldown() -> void:
	if current_cooldown > 0:
		current_cooldown -= 1

## Get effective bonuses (reduced if injured)
func get_effective_accuracy() -> int:
	return accuracy_bonus if not is_injured else accuracy_bonus / 2

func get_effective_evasion() -> int:
	return evasion_bonus if not is_injured else evasion_bonus / 2

func get_effective_initiative() -> int:
	return initiative_bonus if not is_injured else initiative_bonus / 2

func get_effective_damage() -> int:
	return damage_bonus if not is_injured else damage_bonus / 2

## Get display text for UI
func get_status_text() -> String:
	if is_injured:
		return "INJURED"
	elif current_cooldown > 0:
		return "Cooldown: %d" % current_cooldown
	elif has_ability:
		return "READY"
	return ""

func get_role_icon() -> String:
	match role:
		"Pilot": return "🎯"
		"Gunner": return "💥"
		"Engineer": return "🔧"
		"Medic": return "⚕"
		"Officer": return "⭐"
		"Specialist": return "🎓"
	return "👤"
