// Particle system for visual effects

class Particle {
    constructor(x, y, vx, vy, life, color, size) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.life = life;
        this.maxLife = life;
        this.color = color;
        this.size = size;
        this.alpha = 1;
    }

    update(deltaTime) {
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;
        this.life -= deltaTime;

        // Fade out
        this.alpha = this.life / this.maxLife;

        // Gravity/friction
        this.vy += 0.1;
        this.vx *= 0.99;
        this.vy *= 0.99;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    isDead() {
        return this.life <= 0;
    }
}

class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    update(deltaTime) {
        // Update all particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update(deltaTime);

            if (this.particles[i].isDead()) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        this.particles.forEach(particle => particle.draw(ctx));
    }

    // Create explosion particles
    createExplosion(x, y, count = 30, color = '#ff6600') {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 4;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            const life = 0.5 + Math.random() * 0.5;
            const size = 2 + Math.random() * 3;

            // Vary colors for more realistic explosion
            const colors = [color, '#ffaa00', '#ff4444', '#ffff00'];
            const particleColor = colors[Math.floor(Math.random() * colors.length)];

            this.particles.push(new Particle(x, y, vx, vy, life, particleColor, size));
        }
    }

    // Create engine trail
    createEngineTrail(x, y, direction, count = 5) {
        for (let i = 0; i < count; i++) {
            const spread = 0.3;
            const vx = -Math.cos(direction) * 2 + (Math.random() - 0.5) * spread;
            const vy = -Math.sin(direction) * 2 + (Math.random() - 0.5) * spread;
            const life = 0.3 + Math.random() * 0.2;
            const size = 1 + Math.random() * 2;

            this.particles.push(new Particle(x, y, vx, vy, life, '#ffaa00', size));
        }
    }

    // Create shield impact particles
    createShieldImpact(x, y, count = 15) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 2;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            const life = 0.3 + Math.random() * 0.3;
            const size = 1 + Math.random() * 2;

            this.particles.push(new Particle(x, y, vx, vy, life, '#00d4ff', size));
        }
    }

    // Create debris particles
    createDebris(x, y, count = 20) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 3;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            const life = 1 + Math.random();
            const size = 1 + Math.random() * 2;

            this.particles.push(new Particle(x, y, vx, vy, life, '#666666', size));
        }
    }

    clear() {
        this.particles = [];
    }
}

// Animation effect class for sprite-based animations
class AnimatedEffect {
    constructor(x, y, frames, fps = 30) {
        this.x = x;
        this.y = y;
        this.frames = frames;
        this.currentFrame = 0;
        this.frameTime = 1 / fps;
        this.elapsed = 0;
        this.active = true;
    }

    update(deltaTime) {
        this.elapsed += deltaTime;

        if (this.elapsed >= this.frameTime) {
            this.elapsed = 0;
            this.currentFrame++;

            if (this.currentFrame >= this.frames.length) {
                this.active = false;
            }
        }
    }

    draw(ctx) {
        if (!this.active || this.currentFrame >= this.frames.length) {
            return;
        }

        const frame = this.frames[this.currentFrame];
        ctx.drawImage(
            frame,
            this.x - frame.width / 2,
            this.y - frame.height / 2
        );
    }
}

window.Particle = Particle;
window.ParticleSystem = ParticleSystem;
window.AnimatedEffect = AnimatedEffect;
