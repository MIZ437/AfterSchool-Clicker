// AfterSchool Clicker - Effect System
class EffectSystem {
    constructor() {
        this.effectsContainer = null;
        this.particlePool = [];
        this.pointsPool = [];
        this.ripplePool = [];
        this.starPool = [];
        this.textPool = [];
        this.maxPoolSize = 50;
        this.setupEffects();
    }

    setupEffects() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeElements());
        } else {
            this.initializeElements();
        }
    }

    initializeElements() {
        this.effectsContainer = document.getElementById('click-effects');
        this.initializeParticlePool();
    }

    initializeParticlePool() {
        // Pre-create particle elements for better performance
        for (let i = 0; i < this.maxPoolSize; i++) {
            // Heart particles
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.display = 'none';
            this.particlePool.push(particle);

            // Points display elements
            const pointsElement = document.createElement('div');
            pointsElement.className = 'points-element';
            pointsElement.style.display = 'none';
            this.pointsPool.push(pointsElement);

            // Ripple elements
            const rippleElement = document.createElement('div');
            rippleElement.className = 'ripple-element';
            rippleElement.style.display = 'none';
            this.ripplePool.push(rippleElement);

            // Star elements
            const starElement = document.createElement('div');
            starElement.className = 'star-element';
            starElement.style.display = 'none';
            this.starPool.push(starElement);

            // Text elements
            const textElement = document.createElement('div');
            textElement.className = 'text-element';
            textElement.style.display = 'none';
            this.textPool.push(textElement);
        }
    }

    // Play click effect at specific position
    playClickEffect(x, y, points) {
        this.createHeartParticle(x, y);
        this.createPointsDisplay(x, y, points);
        this.createRippleEffect(x, y);
    }

    createHeartParticle(x, y) {
        if (!this.effectsContainer) return;

        const heart = this.getParticleFromPool();
        if (!heart) return;

        heart.className = 'click-effect heart';
        heart.textContent = this.getRandomHeart();
        heart.style.cssText = `
            position: absolute;
            left: ${x}px;
            top: ${y}px;
            font-size: ${1.5 + Math.random()}rem;
            color: ${this.getRandomHeartColor()};
            pointer-events: none;
            z-index: 20;
            animation: floatUp 1.5s ease-out forwards;
            display: block;
        `;

        this.effectsContainer.appendChild(heart);

        setTimeout(() => {
            this.returnParticleToPool(heart);
        }, 1500);
    }

    createPointsDisplay(x, y, points) {
        if (!this.effectsContainer) return;

        const pointsElement = this.getPointsFromPool();
        if (!pointsElement) return;

        pointsElement.className = 'click-effect points';
        pointsElement.textContent = `+${this.formatPoints(points)}`;
        pointsElement.style.cssText = `
            position: absolute;
            left: ${x + 20 + Math.random() * 20}px;
            top: ${y - 10 + Math.random() * 20}px;
            font-size: 1.2rem;
            font-weight: bold;
            color: #00b894;
            background: rgba(255, 255, 255, 0.9);
            padding: 2px 8px;
            border-radius: 10px;
            border: 2px solid #00b894;
            pointer-events: none;
            z-index: 21;
            animation: floatUp 1.5s ease-out forwards;
            display: block;
        `;

        this.effectsContainer.appendChild(pointsElement);

        setTimeout(() => {
            this.returnPointsToPool(pointsElement);
        }, 1500);
    }

    createRippleEffect(x, y) {
        if (!this.effectsContainer) return;

        const ripple = this.getRippleFromPool();
        if (!ripple) return;

        ripple.className = 'ripple-effect';
        ripple.style.cssText = `
            position: absolute;
            left: ${x - 25}px;
            top: ${y - 25}px;
            width: 50px;
            height: 50px;
            border: 3px solid rgba(232, 67, 147, 0.6);
            border-radius: 50%;
            pointer-events: none;
            z-index: 19;
            animation: rippleExpand 0.6s ease-out forwards;
            display: block;
        `;

        this.effectsContainer.appendChild(ripple);

        setTimeout(() => {
            this.returnRippleToPool(ripple);
        }, 600);
    }

    // Star burst effect for special events
    createStarBurst(x, y, count = 8) {
        if (!this.effectsContainer) return;

        for (let i = 0; i < count; i++) {
            const star = document.createElement('div');
            const angle = (360 / count) * i;
            const distance = 30 + Math.random() * 30;

            star.className = 'star-particle';
            star.textContent = '✨';
            star.style.cssText = `
                position: absolute;
                left: ${x}px;
                top: ${y}px;
                font-size: 1rem;
                pointer-events: none;
                z-index: 22;
                animation: starFly 1s ease-out forwards;
                --angle: ${angle}deg;
                --distance: ${distance}px;
            `;

            this.effectsContainer.appendChild(star);

            setTimeout(() => {
                if (star.parentNode) {
                    star.parentNode.removeChild(star);
                }
            }, 1000);
        }
    }

    // Fireworks effect for major achievements
    createFireworks(centerX, centerY) {
        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#f0932b', '#eb4d4b', '#6c5ce7'];

        for (let i = 0; i < 15; i++) {
            setTimeout(() => {
                const firework = document.createElement('div');
                const angle = Math.random() * 360;
                const distance = 50 + Math.random() * 100;
                const color = colors[Math.floor(Math.random() * colors.length)];

                firework.textContent = '⭐';
                firework.style.cssText = `
                    position: absolute;
                    left: ${centerX}px;
                    top: ${centerY}px;
                    font-size: 1.5rem;
                    color: ${color};
                    pointer-events: none;
                    z-index: 25;
                    animation: fireworkExplode 2s ease-out forwards;
                    --angle: ${angle}deg;
                    --distance: ${distance}px;
                `;

                if (this.effectsContainer) {
                    this.effectsContainer.appendChild(firework);

                    setTimeout(() => {
                        if (firework.parentNode) {
                            firework.parentNode.removeChild(firework);
                        }
                    }, 2000);
                }
            }, i * 100);
        }
    }

    // Screen shake effect
    screenShake(duration = 500, intensity = 5) {
        const gameScreen = document.getElementById('game-screen');
        if (!gameScreen) return;

        const originalTransform = gameScreen.style.transform;
        let startTime = Date.now();

        const shake = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;

            if (progress >= 1) {
                gameScreen.style.transform = originalTransform;
                return;
            }

            const currentIntensity = intensity * (1 - progress);
            const x = (Math.random() - 0.5) * currentIntensity;
            const y = (Math.random() - 0.5) * currentIntensity;

            gameScreen.style.transform = `translate(${x}px, ${y}px)`;

            requestAnimationFrame(shake);
        };

        shake();
    }

    // Flash effect for the screen
    screenFlash(color = 'rgba(255, 255, 255, 0.8)', duration = 200) {
        const flash = document.createElement('div');
        flash.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: ${color};
            pointer-events: none;
            z-index: 9999;
            animation: flashFade ${duration}ms ease-out forwards;
        `;

        document.body.appendChild(flash);

        setTimeout(() => {
            if (flash.parentNode) {
                flash.parentNode.removeChild(flash);
            }
        }, duration);
    }

    // Floating text effect
    createFloatingText(text, x, y, options = {}) {
        const {
            color = '#333',
            size = '1.2rem',
            duration = 2000,
            direction = 'up'
        } = options;

        const textElement = this.getTextFromPool();
        if (!textElement || !this.effectsContainer) return;

        textElement.textContent = text;
        textElement.style.cssText = `
            position: absolute;
            left: ${x}px;
            top: ${y}px;
            font-size: ${size};
            font-weight: bold;
            color: ${color};
            pointer-events: none;
            z-index: 30;
            animation: float${direction.charAt(0).toUpperCase() + direction.slice(1)} ${duration}ms ease-out forwards;
            display: block;
        `;

        this.effectsContainer.appendChild(textElement);

        setTimeout(() => {
            this.returnTextToPool(textElement);
        }, duration);
    }

    // Particle system helpers
    getParticleFromPool() {
        const particle = this.particlePool.find(p => p.style.display === 'none');
        return particle || null;
    }

    returnParticleToPool(particle) {
        if (particle && particle.parentNode) {
            particle.parentNode.removeChild(particle);
            particle.style.display = 'none';
            particle.className = 'particle';
            particle.textContent = '';
        }
    }

    getPointsFromPool() {
        const element = this.pointsPool.find(p => p.style.display === 'none');
        return element || null;
    }

    returnPointsToPool(element) {
        if (element && element.parentNode) {
            element.parentNode.removeChild(element);
            element.style.display = 'none';
            element.className = 'points-element';
            element.textContent = '';
        }
    }

    getRippleFromPool() {
        const element = this.ripplePool.find(p => p.style.display === 'none');
        return element || null;
    }

    returnRippleToPool(element) {
        if (element && element.parentNode) {
            element.parentNode.removeChild(element);
            element.style.display = 'none';
            element.className = 'ripple-element';
            element.textContent = '';
        }
    }

    getStarFromPool() {
        const element = this.starPool.find(p => p.style.display === 'none');
        return element || null;
    }

    returnStarToPool(element) {
        if (element && element.parentNode) {
            element.parentNode.removeChild(element);
            element.style.display = 'none';
            element.className = 'star-element';
            element.textContent = '';
        }
    }

    getTextFromPool() {
        const element = this.textPool.find(p => p.style.display === 'none');
        return element || null;
    }

    returnTextToPool(element) {
        if (element && element.parentNode) {
            element.parentNode.removeChild(element);
            element.style.display = 'none';
            element.className = 'text-element';
            element.textContent = '';
        }
    }

    // Helper functions
    getRandomHeart() {
        const hearts = ['💖', '💕', '💓', '💗', '💝', '💘'];
        return hearts[Math.floor(Math.random() * hearts.length)];
    }

    getRandomHeartColor() {
        const colors = ['#e84393', '#fd79a8', '#e17055', '#74b9ff', '#a29bfe'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    formatPoints(points) {
        return Math.floor(points).toLocaleString();
    }

    // Add necessary CSS animations
    addEffectStyles() {
        if (document.getElementById('effect-styles')) return;

        const style = document.createElement('style');
        style.id = 'effect-styles';
        style.textContent = `
            @keyframes rippleExpand {
                0% { transform: scale(0); opacity: 1; }
                100% { transform: scale(4); opacity: 0; }
            }

            @keyframes starFly {
                0% { transform: translate(0, 0) scale(1); opacity: 1; }
                100% {
                    transform: translate(
                        calc(cos(var(--angle)) * var(--distance)),
                        calc(sin(var(--angle)) * var(--distance))
                    ) scale(0.3);
                    opacity: 0;
                }
            }

            @keyframes fireworkExplode {
                0% { transform: translate(0, 0) scale(0); opacity: 1; }
                50% { transform: translate(
                    calc(cos(var(--angle)) * var(--distance)),
                    calc(sin(var(--angle)) * var(--distance))
                ) scale(1); opacity: 1; }
                100% { transform: translate(
                    calc(cos(var(--angle)) * var(--distance)),
                    calc(sin(var(--angle)) * var(--distance))
                ) scale(0); opacity: 0; }
            }

            @keyframes flashFade {
                0% { opacity: 1; }
                100% { opacity: 0; }
            }

            @keyframes floatUp {
                0% { transform: translateY(0) scale(1); opacity: 1; }
                50% { transform: translateY(-30px) scale(1.2); opacity: 1; }
                100% { transform: translateY(-60px) scale(0.8); opacity: 0; }
            }

            @keyframes floatDown {
                0% { transform: translateY(0) scale(1); opacity: 1; }
                100% { transform: translateY(50px) scale(0.8); opacity: 0; }
            }
        `;

        document.head.appendChild(style);
    }

    // Initialize effects
    initialize() {
        this.addEffectStyles();
    }

    // ==================== Milestone Effect ====================

    // Show milestone achievement effect
    showMilestoneEffect(itemName, milestone, bonusPercent) {
        console.log(`Showing milestone effect: ${itemName} x${milestone}, bonus: ${bonusPercent}%`);

        // Create milestone notification overlay
        const overlay = document.createElement('div');
        overlay.className = 'milestone-overlay';
        overlay.innerHTML = `
            <div class="milestone-content">
                <div class="milestone-icon">★</div>
                <div class="milestone-title">マイルストーン達成！</div>
                <div class="milestone-item">${itemName}</div>
                <div class="milestone-count">×${milestone}個</div>
                <div class="milestone-bonus">ボーナス: +${bonusPercent}%</div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Animate in
        setTimeout(() => {
            overlay.classList.add('show');
        }, 10);

        // Remove after animation
        setTimeout(() => {
            overlay.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(overlay);
            }, 500);
        }, 3000);

        // Screen flash effect
        this.screenFlash('rgba(255, 215, 0, 0.3)', 500);
    }
}

// Initialize effect system
document.addEventListener('DOMContentLoaded', () => {
    window.effectSystem = new EffectSystem();
    window.effectSystem.initialize();
});