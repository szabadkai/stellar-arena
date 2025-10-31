// Weapon and damage calculation systems

class WeaponSystem {
    static calculateDamage(attackData) {
        const { weapon, damage, attacker, target } = attackData;

        // Base damage modified by weapon type vs armor type
        let finalDamage = damage;

        switch (weapon.damageType) {
            case 'kinetic':
                // Kinetic weapons are good against armor but weaker vs shields
                finalDamage *= 1.2;
                break;

            case 'energy':
                // Energy weapons are balanced
                finalDamage *= 1.0;
                break;

            case 'explosive':
                // Explosive weapons deal full damage to shields and hull
                finalDamage *= 1.3;
                break;

            case 'emp':
                // EMP damages energy systems
                target.energy = Math.max(0, target.energy - damage);
                return { type: 'emp', energyDamage: damage };
        }

        // Apply damage to target
        const result = target.takeDamage({ damage: finalDamage, weapon });

        return {
            type: 'damage',
            ...result,
            totalDamage: finalDamage
        };
    }

    // Check line of sight between attacker and target
    static hasLineOfSight(attacker, target, grid) {
        const line = attacker.position.lineTo(target.position);

        // Check each hex in the line (excluding start and end)
        for (let i = 1; i < line.length - 1; i++) {
            const hex = line[i];

            // Check if blocked by obstacle or ship
            if (grid.isBlocked(hex)) {
                return false;
            }
        }

        return true;
    }

    // Get targeting info for UI
    static getTargetingInfo(attacker, target, weapon) {
        const distance = attacker.position.distance(target.position);
        const inRange = distance >= weapon.minRange && distance <= weapon.maxRange;
        const hasEnergy = attacker.energy >= weapon.energyCost;
        const hasAP = attacker.actionPoints >= weapon.apCost;
        const notOnCooldown = weapon.cooldownRemaining === 0;

        return {
            distance,
            inRange,
            hasEnergy,
            hasAP,
            notOnCooldown,
            canFire: inRange && hasEnergy && hasAP && notOnCooldown
        };
    }
}

// Projectile class for kinetic weapons
class Projectile {
    constructor(start, end, weapon, speed = 10) {
        this.start = start; // pixel coordinates
        this.end = end;
        this.position = { ...start };
        this.weapon = weapon;
        this.speed = speed;
        this.active = true;

        // Calculate direction
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        this.velocity = {
            x: (dx / distance) * speed,
            y: (dy / distance) * speed
        };

        this.lifetime = distance / speed;
        this.age = 0;
    }

    update(deltaTime) {
        if (!this.active) return;

        this.age += deltaTime;

        if (this.age >= this.lifetime) {
            this.active = false;
            return;
        }

        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;
    }

    draw(ctx) {
        if (!this.active) return;

        ctx.save();

        // Draw based on weapon type
        switch (this.weapon.type) {
            case 'kinetic':
                // Draw bullet/projectile
                ctx.fillStyle = '#ffaa00';
                ctx.beginPath();
                ctx.arc(this.position.x, this.position.y, 3, 0, Math.PI * 2);
                ctx.fill();

                // Trail
                ctx.strokeStyle = 'rgba(255, 170, 0, 0.5)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(
                    this.position.x - this.velocity.x * 3,
                    this.position.y - this.velocity.y * 3
                );
                ctx.lineTo(this.position.x, this.position.y);
                ctx.stroke();
                break;

            case 'missile':
                // Draw missile
                const angle = Math.atan2(this.velocity.y, this.velocity.x);

                ctx.translate(this.position.x, this.position.y);
                ctx.rotate(angle);

                // Missile body
                ctx.fillStyle = '#ff4444';
                ctx.fillRect(-6, -2, 12, 4);

                // Flame trail
                ctx.fillStyle = '#ffaa00';
                ctx.beginPath();
                ctx.moveTo(-6, 0);
                ctx.lineTo(-10, -3);
                ctx.lineTo(-10, 3);
                ctx.closePath();
                ctx.fill();
                break;
        }

        ctx.restore();
    }
}

// Beam class for energy weapons
class Beam {
    constructor(start, end, weapon, duration = 0.3) {
        this.start = start;
        this.end = end;
        this.weapon = weapon;
        this.duration = duration;
        this.age = 0;
        this.active = true;
    }

    update(deltaTime) {
        this.age += deltaTime;

        if (this.age >= this.duration) {
            this.active = false;
        }
    }

    draw(ctx) {
        if (!this.active) return;

        const alpha = 1 - (this.age / this.duration);

        ctx.save();
        ctx.globalAlpha = alpha;

        // Draw beam
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 4;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00d4ff';

        ctx.beginPath();
        ctx.moveTo(this.start.x, this.start.y);
        ctx.lineTo(this.end.x, this.end.y);
        ctx.stroke();

        // Inner beam
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.moveTo(this.start.x, this.start.y);
        ctx.lineTo(this.end.x, this.end.y);
        ctx.stroke();

        ctx.restore();
    }
}

window.WeaponSystem = WeaponSystem;
window.Projectile = Projectile;
window.Beam = Beam;
