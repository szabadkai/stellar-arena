// Modal system to replace browser alerts and confirms

class ModalManager {
    constructor() {
        this.overlay = document.getElementById('modal-overlay');
        this.title = document.getElementById('modal-title');
        this.message = document.getElementById('modal-message');
        this.confirmBtn = document.getElementById('modal-confirm');
        this.cancelBtn = document.getElementById('modal-cancel');

        this.resolveCallback = null;

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.confirmBtn.addEventListener('click', () => {
            this.close(true);
        });

        this.cancelBtn.addEventListener('click', () => {
            this.close(false);
        });

        // Close on overlay click (outside modal)
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.close(false);
            }
        });

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.overlay.style.display !== 'none') {
                this.close(false);
            }
        });
    }

    show(title, msg, options = {}) {
        return new Promise((resolve) => {
            this.resolveCallback = resolve;

            this.title.textContent = title;
            this.message.textContent = msg;

            // Configure buttons
            if (options.showCancel) {
                this.cancelBtn.style.display = 'block';
                this.confirmBtn.textContent = options.confirmText || 'OK';
                this.cancelBtn.textContent = options.cancelText || 'Cancel';
            } else {
                this.cancelBtn.style.display = 'none';
                this.confirmBtn.textContent = 'OK';
            }

            this.overlay.style.display = 'flex';
        });
    }

    close(result) {
        this.overlay.style.display = 'none';
        if (this.resolveCallback) {
            this.resolveCallback(result);
            this.resolveCallback = null;
        }
    }

    // Convenience methods
    alert(title, message) {
        return this.show(title, message, { showCancel: false });
    }

    confirm(title, message) {
        return this.show(title, message, {
            showCancel: true,
            confirmText: 'Confirm',
            cancelText: 'Cancel'
        });
    }
}

window.ModalManager = ModalManager;
