// Main renderer for the game

class Renderer {
    constructor(canvas, grid) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.grid = grid;

        // Hex layout
        this.hexSize = 30;
        this.layout = new HexLayout(
            this.hexSize,
            { x: canvas.width / 2, y: canvas.height / 2 }
        );

        // Camera
        this.camera = {
            x: 0,
            y: 0,
            zoom: 1
        };

        // Visual effects
        this.projectiles = [];
        this.beams = [];
        this.effects = [];
        this.particleSystem = new ParticleSystem();
        this.spriteGenerator = new SpriteGenerator();

        // Explosion and shield hit animations
        this.explosionFrames = this.spriteGenerator.generateExplosion();
        this.shieldHitFrames = this.spriteGenerator.generateShieldHit();

        // Rendering state
        this.selectedShip = null;
        this.hoveredHex = null;
        this.reachableHexes = [];
        this.selectedWeapon = null;
        this.driftPaths = new Map(); // Ship ID -> predicted drift path

        this.resize();
    }

    resize() {
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
        this.layout.origin = { x: this.canvas.width / 2, y: this.canvas.height / 2 };
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    render(deltaTime) {
        this.clear();

        // Update ship animations
        this.grid.getAllShips().forEach(ship => {
            ship.updateAnimation(deltaTime);
        });

        // Draw background
        this.drawBackground();

        // Draw grid
        this.drawGrid();

        // Draw reachable hexes (if ship selected)
        if (this.selectedShip && this.reachableHexes.length > 0) {
            this.drawReachableHexes();
        }

        // Draw obstacles
        this.drawObstacles(deltaTime);

        // Draw ships
        this.drawShips();

        // Draw drift prediction paths
        this.drawDriftPaths();

        // Draw weapon range indicators
        if (this.selectedShip && this.selectedWeapon) {
            this.drawWeaponRange(this.selectedShip, this.selectedWeapon);
            this.highlightValidTargets();
        }

        // Draw hover highlight
        if (this.hoveredHex) {
            const hoveredShip = this.grid.getShipAt(this.hoveredHex);
            if (hoveredShip && this.selectedWeapon && hoveredShip.team === 'enemy') {
                // Show if target is valid
                const canTarget = this.canTargetShip(this.selectedShip, hoveredShip, this.selectedWeapon);
                const color = canTarget ? 'rgba(68, 255, 68, 0.3)' : 'rgba(255, 68, 68, 0.3)';
                this.drawHexHighlight(this.hoveredHex, color);
            } else {
                this.drawHexHighlight(this.hoveredHex, 'rgba(255, 255, 255, 0.2)');
            }
        }

        // Draw projectiles and beams
        this.updateAndDrawProjectiles(deltaTime);
        this.updateAndDrawBeams(deltaTime);

        // Draw animated effects
        this.updateAndDrawEffects(deltaTime);

        // Draw particles
        this.particleSystem.update(deltaTime);
        this.particleSystem.draw(this.ctx);

        // Draw weapon range indicators
        if (this.selectedShip && this.selectedWeapon) {
            this.drawWeaponRange(this.selectedShip, this.selectedWeapon);
        }
    }

    drawBackground() {
        // Space background
        this.ctx.fillStyle = '#0a0e1a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Stars
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        for (let i = 0; i < 100; i++) {
            const x = (i * 73) % this.canvas.width;
            const y = (i * 137) % this.canvas.height;
            const size = (i % 3) + 1;
            this.ctx.fillRect(x, y, size, size);
        }
    }

    drawGrid() {
        const maxQ = Math.floor(this.grid.width / 2);
        const maxR = Math.floor(this.grid.height / 2);

        this.ctx.strokeStyle = '#1a2a3a';
        this.ctx.lineWidth = 1;

        for (let q = -maxQ; q <= maxQ; q++) {
            for (let r = -maxR; r <= maxR; r++) {
                const hex = new HexCoord(q, r);

                if (!this.grid.isValidHex(hex)) continue;

                this.drawHex(hex, null, '#1a2a3a');
            }
        }
    }

    drawHex(hex, fillStyle = null, strokeStyle = null) {
        const corners = this.layout.hexCorners(hex);

        this.ctx.beginPath();
        corners.forEach((corner, i) => {
            if (i === 0) {
                this.ctx.moveTo(corner.x, corner.y);
            } else {
                this.ctx.lineTo(corner.x, corner.y);
            }
        });
        this.ctx.closePath();

        if (fillStyle) {
            this.ctx.fillStyle = fillStyle;
            this.ctx.fill();
        }

        if (strokeStyle) {
            this.ctx.strokeStyle = strokeStyle;
            this.ctx.stroke();
        }
    }

    drawHexHighlight(hex, color) {
        this.drawHex(hex, color, null);
    }

    drawReachableHexes() {
        this.reachableHexes.forEach(({ hex, cost }) => {
            const alpha = 1 - (cost / 10);
            this.drawHex(hex, `rgba(74, 158, 255, ${0.2 * alpha})`, null);
        });
    }

    drawObstacles(deltaTime) {
        // Initialize rotation tracker if not exists
        if (!this.obstacleRotations) {
            this.obstacleRotations = new Map();
        }

        // Safety check for deltaTime
        if (!deltaTime || deltaTime <= 0 || deltaTime > 1) {
            deltaTime = 0.016; // Default to ~60fps
        }

        this.ctx.fillStyle = '#3a3a3a';

        this.grid.obstacles.forEach(obstacleKey => {
            const hex = HexCoord.fromString(obstacleKey);
            const center = this.layout.hexToPixel(hex);

            // Use hex coordinates as seed for consistent shape and rotation speed
            const seed = hex.q * 1000 + hex.r;

            // Get or initialize rotation for this obstacle
            if (!this.obstacleRotations.has(obstacleKey)) {
                this.obstacleRotations.set(obstacleKey, 0);
            }

            // Calculate rotation speed based on seed (different speeds for each asteroid)
            const speedSeed = ((seed * 7919) % 1000) / 1000; // 0-1
            const rotationSpeed = 0.05 + speedSeed * 0.15; // 0.05 to 0.2 radians per second

            // Update rotation
            let rotation = this.obstacleRotations.get(obstacleKey);
            rotation += rotationSpeed * deltaTime;
            this.obstacleRotations.set(obstacleKey, rotation);

            // Draw as irregular asteroid with consistent shape (seeded random)
            this.ctx.save();
            this.ctx.translate(center.x, center.y);
            this.ctx.rotate(rotation);

            this.ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                const angle = (Math.PI * 2 * i) / 8;
                // Seeded random using simple hash
                const pseudoRandom = ((seed + i) * 9301 + 49297) % 233280 / 233280;
                const radius = 15 + pseudoRandom * 10;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;

                if (i === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            }
            this.ctx.closePath();
            this.ctx.fill();

            this.ctx.restore();
        });
    }

    drawShips() {
        const ships = this.grid.getAllShips();

        ships.forEach(ship => {
            if (ship.isDestroyed) return;

            // Use animated position if ship is moving
            const renderPos = ship.getRenderPosition();
            const center = this.layout.hexToPixel(renderPos);

            // Check if mouse is hovering over this ship
            const isHovered = this.hoveredHex &&
                             ship.position.equals(this.hoveredHex);

            // Get or generate sprite
            const sprite = this.spriteGenerator.generateShipSprite(ship.shipClass, ship.team);

            // Draw hover highlight for enemy ships
            if (isHovered && ship.team === 'enemy') {
                this.ctx.save();
                this.ctx.strokeStyle = 'rgba(255, 255, 100, 0.6)';
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                this.ctx.arc(center.x, center.y, 28, 0, Math.PI * 2);
                this.ctx.stroke();
                this.ctx.restore();
            }

            // Draw shield if active
            if (ship.shield > 0) {
                this.ctx.save();
                this.ctx.strokeStyle = 'rgba(0, 212, 255, 0.5)';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.arc(center.x, center.y, 20, 0, Math.PI * 2);
                this.ctx.stroke();
                this.ctx.restore();
            }

            // Draw ship sprite
            this.ctx.drawImage(
                sprite,
                center.x - sprite.width / 2,
                center.y - sprite.height / 2
            );

            // Draw selection highlight
            if (this.selectedShip && this.selectedShip.id === ship.id) {
                this.ctx.strokeStyle = '#ffaa00';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.arc(center.x, center.y, 25, 0, Math.PI * 2);
                this.ctx.stroke();
            }

            // Draw health bar
            this.drawHealthBar(ship, center);

            // Draw hover info for enemy ships
            if (isHovered && ship.team === 'enemy') {
                this.drawEnemyInfo(ship, center);
            }

            // Draw velocity vector
            if (ship.velocity.q !== 0 || ship.velocity.r !== 0) {
                this.drawVelocityVector(ship, center);
            }
        });
    }

    drawEnemyInfo(ship, center) {
        const padding = 10;
        const lineHeight = 18;
        const boxWidth = 200;
        const boxHeight = 120;

        const x = center.x + 40;
        const y = center.y - boxHeight / 2;

        // Draw background
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(20, 20, 40, 0.95)';
        this.ctx.strokeStyle = '#ffff66';
        this.ctx.lineWidth = 2;
        this.ctx.fillRect(x, y, boxWidth, boxHeight);
        this.ctx.strokeRect(x, y, boxWidth, boxHeight);

        // Draw text
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 14px monospace';
        this.ctx.fillText(ship.name, x + padding, y + padding + 14);

        this.ctx.font = '12px monospace';
        this.ctx.fillStyle = '#ff6666';
        this.ctx.fillText(`Hull: ${Math.floor(ship.hull)}/${ship.maxHull}`, x + padding, y + padding + 14 + lineHeight);

        this.ctx.fillStyle = '#66ccff';
        this.ctx.fillText(`Shield: ${Math.floor(ship.shield)}/${ship.maxShield}`, x + padding, y + padding + 14 + lineHeight * 2);

        this.ctx.fillStyle = '#cccccc';
        this.ctx.fillText(`Armor: ${ship.armor}`, x + padding, y + padding + 14 + lineHeight * 3);

        this.ctx.fillStyle = '#ffff66';
        this.ctx.fillText(`AP: ${ship.actionPoints}/${ship.maxActionPoints}`, x + padding, y + padding + 14 + lineHeight * 4);

        this.ctx.fillStyle = '#66ff66';
        this.ctx.fillText(`Energy: ${Math.floor(ship.energy)}/${ship.maxEnergy}`, x + padding, y + padding + 14 + lineHeight * 5);

        this.ctx.restore();
    }

    drawHealthBar(ship, center) {
        const barWidth = 30;
        const barHeight = 4;
        const x = center.x - barWidth / 2;
        const y = center.y + 25;

        // Background
        this.ctx.fillStyle = '#0a0e1a';
        this.ctx.fillRect(x, y, barWidth, barHeight);

        // Hull
        const hullPercent = ship.hull / ship.maxHull;
        this.ctx.fillStyle = '#4a9eff';
        this.ctx.fillRect(x, y, barWidth * hullPercent, barHeight);

        // Border
        this.ctx.strokeStyle = '#2a3f5f';
        this.ctx.strokeRect(x, y, barWidth, barHeight);
    }

    drawVelocityVector(ship, center) {
        const scale = 20;
        const vx = ship.velocity.q * scale;
        const vy = ship.velocity.r * scale;

        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(255, 170, 0, 0.6)';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);

        this.ctx.beginPath();
        this.ctx.moveTo(center.x, center.y);
        this.ctx.lineTo(center.x + vx, center.y + vy);
        this.ctx.stroke();

        // Arrow head
        const angle = Math.atan2(vy, vx);
        const arrowSize = 8;

        this.ctx.setLineDash([]);
        this.ctx.beginPath();
        this.ctx.moveTo(center.x + vx, center.y + vy);
        this.ctx.lineTo(
            center.x + vx - arrowSize * Math.cos(angle - Math.PI / 6),
            center.y + vy - arrowSize * Math.sin(angle - Math.PI / 6)
        );
        this.ctx.moveTo(center.x + vx, center.y + vy);
        this.ctx.lineTo(
            center.x + vx - arrowSize * Math.cos(angle + Math.PI / 6),
            center.y + vy - arrowSize * Math.sin(angle + Math.PI / 6)
        );
        this.ctx.stroke();

        this.ctx.restore();
    }

    drawDriftPaths() {
        this.driftPaths.forEach((path, shipId) => {
            if (path.length === 0) return;

            this.ctx.save();
            this.ctx.strokeStyle = 'rgba(255, 170, 0, 0.3)';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([3, 3]);

            this.ctx.beginPath();
            path.forEach((hex, i) => {
                const pixel = this.layout.hexToPixel(hex);
                if (i === 0) {
                    this.ctx.moveTo(pixel.x, pixel.y);
                } else {
                    this.ctx.lineTo(pixel.x, pixel.y);
                }
            });
            this.ctx.stroke();

            this.ctx.restore();
        });
    }

    drawWeaponRange(ship, weapon) {
        const center = this.layout.hexToPixel(ship.position);

        // Draw range circles more visibly
        this.ctx.save();

        // Max range circle - more visible
        this.ctx.strokeStyle = 'rgba(255, 68, 68, 0.5)';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([8, 4]);
        this.ctx.beginPath();
        this.ctx.arc(center.x, center.y, weapon.maxRange * this.hexSize * 1.5, 0, Math.PI * 2);
        this.ctx.stroke();

        // Highlight hexes in range
        const maxQ = Math.floor(this.grid.width / 2);
        const maxR = Math.floor(this.grid.height / 2);

        for (let q = -maxQ; q <= maxQ; q++) {
            for (let r = -maxR; r <= maxR; r++) {
                const hex = new HexCoord(q, r);
                if (!this.grid.isValidHex(hex)) continue;

                const distance = ship.position.distance(hex);

                // In weapon range
                if (distance <= weapon.maxRange && distance >= weapon.minRange) {
                    const targetShip = this.grid.getShipAt(hex);
                    if (targetShip && targetShip.team !== ship.team) {
                        // Enemy in range - green highlight
                        this.drawHex(hex, 'rgba(68, 255, 68, 0.15)', null);
                    } else if (!targetShip) {
                        // Empty hex in range - subtle highlight
                        this.drawHex(hex, 'rgba(255, 68, 68, 0.05)', null);
                    }
                } else if (distance < weapon.minRange && weapon.minRange > 0) {
                    // Too close - orange
                    this.drawHex(hex, 'rgba(255, 170, 0, 0.1)', null);
                }
            }
        }

        // Min range circle if applicable
        if (weapon.minRange > 0) {
            this.ctx.strokeStyle = 'rgba(255, 170, 0, 0.5)';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([5, 5]);
            this.ctx.beginPath();
            this.ctx.arc(center.x, center.y, weapon.minRange * this.hexSize * 1.5, 0, Math.PI * 2);
            this.ctx.stroke();
        }

        this.ctx.restore();
    }

    updateAndDrawProjectiles(deltaTime) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            proj.update(deltaTime);
            proj.draw(this.ctx);

            if (!proj.active) {
                this.projectiles.splice(i, 1);
            }
        }
    }

    updateAndDrawBeams(deltaTime) {
        for (let i = this.beams.length - 1; i >= 0; i--) {
            const beam = this.beams[i];
            beam.update(deltaTime);
            beam.draw(this.ctx);

            if (!beam.active) {
                this.beams.splice(i, 1);
            }
        }
    }

    updateAndDrawEffects(deltaTime) {
        for (let i = this.effects.length - 1; i >= 0; i--) {
            const effect = this.effects[i];
            effect.update(deltaTime);
            effect.draw(this.ctx);

            if (!effect.active) {
                this.effects.splice(i, 1);
            }
        }
    }

    // Add visual effects
    addProjectile(start, end, weapon) {
        this.projectiles.push(new Projectile(start, end, weapon, 300));
    }

    addBeam(start, end, weapon) {
        this.beams.push(new Beam(start, end, weapon, 0.3));
    }

    addExplosion(position) {
        const pixel = this.layout.hexToPixel(position);
        this.effects.push(new AnimatedEffect(pixel.x, pixel.y, this.explosionFrames, 30));
        this.particleSystem.createExplosion(pixel.x, pixel.y, 40);
    }

    addShieldHit(position) {
        const pixel = this.layout.hexToPixel(position);
        this.effects.push(new AnimatedEffect(pixel.x, pixel.y, this.shieldHitFrames, 30));
        this.particleSystem.createShieldImpact(pixel.x, pixel.y, 20);
    }

    // Input helpers
    pixelToHex(x, y) {
        return this.layout.pixelToHex({ x, y });
    }

    setSelectedShip(ship, showReachable = true) {
        this.selectedShip = ship;

        if (ship && showReachable) {
            this.reachableHexes = this.grid.getReachableHexes(ship);
        } else {
            this.reachableHexes = [];
        }
    }

    setHoveredHex(hex) {
        this.hoveredHex = hex;
    }

    setSelectedWeapon(weapon) {
        this.selectedWeapon = weapon;
    }

    // Check if a ship can be targeted with the selected weapon
    canTargetShip(attacker, target, weapon) {
        if (!attacker || !target || !weapon) return false;

        // Check if it's attacker's turn
        // (This should be checked elsewhere, but double-check here)

        // Check range
        const distance = attacker.position.distance(target.position);
        if (distance > weapon.maxRange || distance < weapon.minRange) {
            return false;
        }

        // Check if weapon can fire
        if (!attacker.canFireWeapon(weapon, target)) {
            return false;
        }

        // Check line of sight
        if (!WeaponSystem.hasLineOfSight(attacker, target, this.grid)) {
            return false;
        }

        return true;
    }

    // Highlight valid targets when weapon is selected
    highlightValidTargets() {
        if (!this.selectedShip || !this.selectedWeapon) return;

        const enemyShips = this.grid.getShipsByTeam(
            this.selectedShip.team === 'player' ? 'enemy' : 'player'
        );

        enemyShips.forEach(enemy => {
            const canTarget = this.canTargetShip(this.selectedShip, enemy, this.selectedWeapon);

            if (canTarget) {
                // Draw green circle around valid targets
                const center = this.layout.hexToPixel(enemy.position);

                this.ctx.save();
                this.ctx.strokeStyle = 'rgba(68, 255, 68, 0.6)';
                this.ctx.lineWidth = 3;
                this.ctx.setLineDash([5, 5]);
                this.ctx.beginPath();
                this.ctx.arc(center.x, center.y, 28, 0, Math.PI * 2);
                this.ctx.stroke();
                this.ctx.restore();
            }
        });
    }
}

window.Renderer = Renderer;
