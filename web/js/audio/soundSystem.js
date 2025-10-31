// Sound system using Web Audio API for synthetic sci-fi sounds

class SoundSystem {
    constructor() {
        this.context = null;
        this.masterGain = null;
        this.enabled = true;
        this.volume = 0.3;

        // Lazy init on first interaction (required by browsers)
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;

        try {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.context.createGain();
            this.masterGain.gain.value = this.volume;
            this.masterGain.connect(this.context.destination);
            this.initialized = true;
            console.log('Sound system initialized');
        } catch (e) {
            console.warn('Web Audio API not supported:', e);
            this.enabled = false;
        }
    }

    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        if (this.masterGain) {
            this.masterGain.gain.value = this.volume;
        }
    }

    setEnabled(enabled) {
        this.enabled = enabled;
    }

    // Helper to create oscillator
    createOscillator(type, frequency) {
        const osc = this.context.createOscillator();
        osc.type = type;
        osc.frequency.value = frequency;
        return osc;
    }

    // UI SOUNDS

    playClick() {
        if (!this.enabled || !this.initialized) return;

        const osc = this.createOscillator('square', 800);
        const gain = this.context.createGain();

        gain.gain.value = 0.1;
        gain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + 0.05);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.context.currentTime + 0.05);
    }

    playMenuTransition() {
        if (!this.enabled || !this.initialized) return;

        const osc = this.createOscillator('sine', 600);
        const gain = this.context.createGain();

        osc.frequency.exponentialRampToValueAtTime(300, this.context.currentTime + 0.2);
        gain.gain.value = 0.15;
        gain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + 0.2);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.context.currentTime + 0.2);
    }

    // WEAPON SOUNDS

    playLaser() {
        if (!this.enabled || !this.initialized) return;

        const osc = this.createOscillator('sawtooth', 440);
        const gain = this.context.createGain();

        osc.frequency.exponentialRampToValueAtTime(110, this.context.currentTime + 0.1);
        gain.gain.value = 0.2;
        gain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + 0.1);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.context.currentTime + 0.1);
    }

    playKinetic() {
        if (!this.enabled || !this.initialized) return;

        const osc = this.createOscillator('square', 100);
        const gain = this.context.createGain();

        gain.gain.value = 0.25;
        gain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + 0.08);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.context.currentTime + 0.08);
    }

    playMissile() {
        if (!this.enabled || !this.initialized) return;

        const osc1 = this.createOscillator('sawtooth', 200);
        const osc2 = this.createOscillator('sine', 50);
        const gain = this.context.createGain();

        osc1.frequency.linearRampToValueAtTime(400, this.context.currentTime + 0.3);
        gain.gain.value = 0.15;
        gain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + 0.3);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.masterGain);

        osc1.start();
        osc2.start();
        osc1.stop(this.context.currentTime + 0.3);
        osc2.stop(this.context.currentTime + 0.3);
    }

    // IMPACT SOUNDS

    playShieldHit() {
        if (!this.enabled || !this.initialized) return;

        const osc = this.createOscillator('sine', 600);
        const gain = this.context.createGain();

        osc.frequency.exponentialRampToValueAtTime(200, this.context.currentTime + 0.15);
        gain.gain.value = 0.2;
        gain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + 0.15);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.context.currentTime + 0.15);
    }

    playHullHit() {
        if (!this.enabled || !this.initialized) return;

        const osc = this.createOscillator('square', 150);
        const gain = this.context.createGain();

        gain.gain.value = 0.2;
        gain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + 0.12);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.context.currentTime + 0.12);
    }

    playExplosion() {
        if (!this.enabled || !this.initialized) return;

        // Create noise for explosion
        const bufferSize = this.context.sampleRate * 0.5;
        const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.context.createBufferSource();
        noise.buffer = buffer;

        const filter = this.context.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 1000;
        filter.frequency.exponentialRampToValueAtTime(50, this.context.currentTime + 0.5);

        const gain = this.context.createGain();
        gain.gain.value = 0.3;
        gain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + 0.5);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        noise.start();
        noise.stop(this.context.currentTime + 0.5);
    }

    // ENGINE/MOVEMENT SOUNDS

    playEngineThrust() {
        if (!this.enabled || !this.initialized) return;

        const osc = this.createOscillator('sawtooth', 80);
        const gain = this.context.createGain();

        osc.frequency.linearRampToValueAtTime(120, this.context.currentTime + 0.2);
        gain.gain.value = 0.1;
        gain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + 0.2);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.context.currentTime + 0.2);
    }

    // TURN/GAME STATE SOUNDS

    playTurnStart() {
        if (!this.enabled || !this.initialized) return;

        const osc = this.createOscillator('sine', 400);
        const gain = this.context.createGain();

        osc.frequency.linearRampToValueAtTime(500, this.context.currentTime + 0.1);
        gain.gain.value = 0.12;
        gain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + 0.1);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.context.currentTime + 0.1);
    }

    playVictory() {
        if (!this.enabled || !this.initialized) return;

        // Victory fanfare
        const notes = [440, 554, 659, 880];
        notes.forEach((freq, i) => {
            const osc = this.createOscillator('sine', freq);
            const gain = this.context.createGain();

            const startTime = this.context.currentTime + i * 0.15;
            gain.gain.value = 0.2;
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(startTime);
            osc.stop(startTime + 0.3);
        });
    }

    playDefeat() {
        if (!this.enabled || !this.initialized) return;

        // Sad descending notes
        const notes = [440, 370, 330, 220];
        notes.forEach((freq, i) => {
            const osc = this.createOscillator('sine', freq);
            const gain = this.context.createGain();

            const startTime = this.context.currentTime + i * 0.2;
            gain.gain.value = 0.15;
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(startTime);
            osc.stop(startTime + 0.4);
        });
    }
}

window.SoundSystem = SoundSystem;
