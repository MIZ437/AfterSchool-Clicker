// AfterSchool Clicker - Click System
class ClickSystem {
    constructor() {
        this.clickTarget = null;
        this.effectsContainer = null;
        this.isEnabled = true;
        this.setupClickHandler();
    }

    setupClickHandler() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeElements());
        } else {
            this.initializeElements();
        }
    }

    initializeElements() {
        this.clickTarget = document.getElementById('current-heroine');
        this.effectsContainer = document.getElementById('click-effects');

        if (this.clickTarget) {
            this.clickTarget.addEventListener('click', (event) => this.handleClick(event));
            this.clickTarget.addEventListener('mousedown', () => this.onMouseDown());
            this.clickTarget.addEventListener('mouseup', () => this.onMouseUp());
        }
    }

    handleClick(event) {
        if (!this.isEnabled) return;

        event.preventDefault();

        // Get click position relative to the target
        const rect = this.clickTarget.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        // Calculate points earned
        const pointsEarned = window.gameState.getClickValue();

        // Add points to game state
        window.gameState.addPoints(pointsEarned);

        // Create visual effects
        this.createClickEffects(x, y, pointsEarned);

        // Play click sound
        if (window.audioManager) {
            window.audioManager.playSE('click_sound');
        }

        // Update UI
        this.updateClickDisplay();
    }

    createClickEffects(x, y, points) {
        // Create heart effect
        this.createHeartEffect(x, y);

        // Create points effect
        this.createPointsEffect(x, y, points);

        // Create glow effect
        this.createGlowEffect();

        // Add click animation to target
        this.animateClickTarget();
    }

    createHeartEffect(x, y) {
        const heart = document.createElement('div');
        heart.className = 'click-effect heart';
        heart.textContent = '💖';
        heart.style.left = x + 'px';
        heart.style.top = y + 'px';

        this.effectsContainer.appendChild(heart);

        // Remove after animation
        setTimeout(() => {
            if (heart.parentNode) {
                heart.parentNode.removeChild(heart);
            }
        }, 1500);
    }

    createPointsEffect(x, y, points) {
        const pointsElement = document.createElement('div');
        pointsElement.className = 'click-effect points';
        pointsElement.textContent = `+${this.formatNumber(points)}`;
        pointsElement.style.left = (x + 30) + 'px';
        pointsElement.style.top = (y - 10) + 'px';

        this.effectsContainer.appendChild(pointsElement);

        // Remove after animation
        setTimeout(() => {
            if (pointsElement.parentNode) {
                pointsElement.parentNode.removeChild(pointsElement);
            }
        }, 1500);
    }

    createGlowEffect() {
        const existingGlow = this.clickTarget.querySelector('.glow-effect');
        if (existingGlow) {
            existingGlow.remove();
        }

        const glow = document.createElement('div');
        glow.className = 'glow-effect';
        this.clickTarget.appendChild(glow);

        // Remove after animation
        setTimeout(() => {
            if (glow.parentNode) {
                glow.parentNode.removeChild(glow);
            }
        }, 300);
    }

    animateClickTarget() {
        this.clickTarget.classList.add('bounce');

        setTimeout(() => {
            this.clickTarget.classList.remove('bounce');
        }, 1000);
    }

    onMouseDown() {
        if (this.isEnabled) {
            this.clickTarget.style.transform = 'scale(0.95)';
        }
    }

    onMouseUp() {
        if (this.isEnabled) {
            this.clickTarget.style.transform = 'scale(1)';
        }
    }

    updateClickDisplay() {
        // Update current points display
        const currentPointsElement = document.getElementById('current-points');
        if (currentPointsElement) {
            const currentPoints = window.gameState.get('gameProgress.currentPoints');
            currentPointsElement.textContent = this.formatNumber(currentPoints);
            currentPointsElement.classList.add('counter-animation');

            setTimeout(() => {
                currentPointsElement.classList.remove('counter-animation');
            }, 300);
        }
    }

    formatNumber(num) {
        return Math.floor(num).toLocaleString();
    }

    // Enable/disable clicking
    setEnabled(enabled) {
        this.isEnabled = enabled;
        if (this.clickTarget) {
            this.clickTarget.style.cursor = enabled ? 'pointer' : 'default';
            this.clickTarget.style.opacity = enabled ? '1' : '0.5';
        }
    }

    // Change heroine image
    setHeroineImage(imageUrl) {
        if (this.clickTarget) {
            // Remove placeholder content
            this.clickTarget.innerHTML = '';
            this.clickTarget.classList.remove('placeholder');

            // Create image element
            const img = document.createElement('img');
            img.src = imageUrl;
            img.alt = 'Heroine';
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'contain';
            img.style.borderRadius = '15px';

            // Handle image load
            img.onload = () => {
                this.clickTarget.appendChild(img);
            };

            // Handle image error
            img.onerror = () => {
                this.setPlaceholderImage();
            };
        }
    }

    setPlaceholderImage() {
        if (this.clickTarget) {
            this.clickTarget.innerHTML = `
                <span>🌸</span>
                <p>クリックしてポイント獲得！</p>
            `;
            this.clickTarget.classList.add('placeholder');
        }
    }

    // Get click statistics
    getClickStats() {
        const clickValue = window.gameState.getClickValue();
        const totalClicks = Math.floor(window.gameState.get('gameProgress.totalPoints') / clickValue);

        return {
            clickValue,
            totalClicks,
            efficiency: clickValue > 1 ? `${clickValue}x` : '1x'
        };
    }
}

// Initialize click system when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.clickSystem = new ClickSystem();
});