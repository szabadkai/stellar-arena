// Sprite generator for ships and effects using procedural pixel art

class SpriteGenerator {
    constructor() {
        this.cache = new Map();
    }

    // Generate ship sprite based on class
    generateShipSprite(shipClass, team) {
        const key = `${shipClass}_${team}`;

        if (this.cache.has(key)) {
            return this.cache.get(key);
        }

        const size = 32;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        const color = team === 'player' ? '#4a9eff' : '#ff4444';
        const darkColor = team === 'player' ? '#2a5f9f' : '#aa2222';
        const lightColor = team === 'player' ? '#6ab9ff' : '#ff6666';

        ctx.imageSmoothingEnabled = false;

        switch (shipClass) {
            case 'interceptor':
                this.drawInterceptor(ctx, size, color, darkColor, lightColor);
                break;

            case 'corvette':
                this.drawCorvette(ctx, size, color, darkColor, lightColor);
                break;

            case 'destroyer':
                this.drawDestroyer(ctx, size, color, darkColor, lightColor);
                break;

            default:
                this.drawCorvette(ctx, size, color, darkColor, lightColor);
        }

        this.cache.set(key, canvas);
        return canvas;
    }

    drawInterceptor(ctx, size, color, darkColor, lightColor) {
        const cx = size / 2;
        const cy = size / 2;

        // Small, fast ship - triangle with wings
        ctx.fillStyle = color;

        // Main body
        ctx.beginPath();
        ctx.moveTo(cx, cy - 10);
        ctx.lineTo(cx + 6, cy + 6);
        ctx.lineTo(cx, cy + 4);
        ctx.lineTo(cx - 6, cy + 6);
        ctx.closePath();
        ctx.fill();

        // Wings
        ctx.fillStyle = darkColor;
        ctx.fillRect(cx - 8, cy, 3, 8);
        ctx.fillRect(cx + 5, cy, 3, 8);

        // Cockpit
        ctx.fillStyle = lightColor;
        ctx.fillRect(cx - 1, cy - 6, 2, 4);

        // Engine glow
        ctx.fillStyle = '#ffaa00';
        ctx.fillRect(cx - 1, cy + 6, 2, 2);
    }

    drawCorvette(ctx, size, color, darkColor, lightColor) {
        const cx = size / 2;
        const cy = size / 2;

        // Medium ship - more angular
        ctx.fillStyle = color;

        // Main hull
        ctx.fillRect(cx - 4, cy - 8, 8, 16);

        // Front nose
        ctx.beginPath();
        ctx.moveTo(cx, cy - 12);
        ctx.lineTo(cx + 4, cy - 8);
        ctx.lineTo(cx - 4, cy - 8);
        ctx.closePath();
        ctx.fill();

        // Wings
        ctx.fillStyle = darkColor;
        ctx.fillRect(cx - 8, cy - 2, 4, 10);
        ctx.fillRect(cx + 4, cy - 2, 4, 10);

        // Bridge
        ctx.fillStyle = lightColor;
        ctx.fillRect(cx - 2, cy - 4, 4, 3);

        // Engines
        ctx.fillStyle = '#ffaa00';
        ctx.fillRect(cx - 3, cy + 8, 2, 2);
        ctx.fillRect(cx + 1, cy + 8, 2, 2);
    }

    drawDestroyer(ctx, size, color, darkColor, lightColor) {
        const cx = size / 2;
        const cy = size / 2;

        // Large, heavy ship
        ctx.fillStyle = color;

        // Main hull - broader
        ctx.fillRect(cx - 6, cy - 10, 12, 20);

        // Front armor
        ctx.fillStyle = darkColor;
        ctx.fillRect(cx - 6, cy - 10, 12, 4);

        // Weapons mounts
        ctx.fillStyle = darkColor;
        ctx.fillRect(cx - 10, cy - 4, 4, 8);
        ctx.fillRect(cx + 6, cy - 4, 4, 8);

        // Bridge tower
        ctx.fillStyle = lightColor;
        ctx.fillRect(cx - 3, cy - 6, 6, 6);

        // Engines (multiple)
        ctx.fillStyle = '#ffaa00';
        ctx.fillRect(cx - 5, cy + 10, 2, 2);
        ctx.fillRect(cx - 1, cy + 10, 2, 2);
        ctx.fillRect(cx + 3, cy + 10, 2, 2);
    }

    // Generate explosion frames
    generateExplosion() {
        const frames = [];
        const size = 64;

        for (let frame = 0; frame < 12; frame++) {
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');

            const progress = frame / 12;
            const radius = progress * 30;
            const cx = size / 2;
            const cy = size / 2;

            // Outer explosion
            const gradient1 = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
            gradient1.addColorStop(0, `rgba(255, 255, 200, ${1 - progress})`);
            gradient1.addColorStop(0.3, `rgba(255, 150, 0, ${0.8 - progress * 0.8})`);
            gradient1.addColorStop(0.6, `rgba(255, 50, 0, ${0.5 - progress * 0.5})`);
            gradient1.addColorStop(1, 'rgba(100, 0, 0, 0)');

            ctx.fillStyle = gradient1;
            ctx.fillRect(0, 0, size, size);

            // Inner bright core
            if (progress < 0.5) {
                const coreRadius = (0.5 - progress) * 20;
                const gradient2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreRadius);
                gradient2.addColorStop(0, 'rgba(255, 255, 255, 1)');
                gradient2.addColorStop(1, 'rgba(255, 255, 200, 0)');

                ctx.fillStyle = gradient2;
                ctx.fillRect(0, 0, size, size);
            }

            frames.push(canvas);
        }

        return frames;
    }

    // Generate shield hit effect
    generateShieldHit() {
        const frames = [];
        const size = 48;

        for (let frame = 0; frame < 8; frame++) {
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');

            const progress = frame / 8;
            const cx = size / 2;
            const cy = size / 2;

            // Hexagonal shield ripple
            ctx.strokeStyle = `rgba(0, 212, 255, ${1 - progress})`;
            ctx.lineWidth = 3;

            const radius = 15 + progress * 10;

            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i;
                const x = cx + radius * Math.cos(angle);
                const y = cy + radius * Math.sin(angle);

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.closePath();
            ctx.stroke();

            frames.push(canvas);
        }

        return frames;
    }
}

window.SpriteGenerator = SpriteGenerator;
