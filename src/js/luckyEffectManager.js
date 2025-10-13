// AfterSchool Clicker - Lucky Effect Manager
class LuckyEffectManager {
    constructor() {
        this.isActive = false;
        this.currentEffect = null;
        this.effectDuration = 5000; // 5 seconds
        this.cooldownTime = 300000; // 5 minutes in milliseconds
        this.requiredClicks = 500;
        this.effectSize = 100; // 100x100px
        this.moveSpeed = 6.8; // pixels per frame (85% of original speed)

        console.log('[LuckyEffect] Manager initialized');
    }

    // Check if conditions are met to spawn lucky effect
    canSpawn() {
        if (!window.gameState) return false;

        // Debug mode: instant spawn (no cooldown)
        const isDebugMode = window.gameState.isDebugMode();
        if (isDebugMode) {
            console.log('[LuckyEffect] Debug mode: cooldown bypassed');
            return !this.isActive;
        }

        const lastSpawnTime = window.gameState.get('luckyEffect.lastSpawnTime') || 0;
        const clicksSinceLastSpawn = window.gameState.get('luckyEffect.clicksSinceLastSpawn') || 0;
        const currentTime = Date.now();

        const timePassed = currentTime - lastSpawnTime;
        const cooldownMet = timePassed >= this.cooldownTime;
        const clicksMet = clicksSinceLastSpawn >= this.requiredClicks;

        console.log('[LuckyEffect] Cooldown check:', {
            timePassed: Math.floor(timePassed / 1000) + 's',
            cooldownMet,
            clicks: clicksSinceLastSpawn,
            clicksMet
        });

        return cooldownMet && clicksMet && !this.isActive;
    }

    // Spawn the lucky effect
    spawn() {
        if (this.isActive) {
            console.log('[LuckyEffect] Already active, skipping spawn');
            return;
        }

        console.log('[LuckyEffect] Spawning lucky effect!');
        this.isActive = true;

        // Create the effect element
        this.currentEffect = this.createEffectElement();

        // Add to game area
        const gameScreen = document.getElementById('game-screen');
        if (gameScreen) {
            gameScreen.appendChild(this.currentEffect);
        }

        // Play spawn sound
        if (window.audioManager) {
            window.audioManager.playSE('lucky_spawn_sound');
        }

        // Start movement animation immediately (no delay)
        this.startMovement();

        // Auto-remove after duration
        this.effectTimeout = setTimeout(() => {
            this.removeEffect(false);
        }, this.effectDuration);
    }

    // Create the visual effect element
    createEffectElement() {
        const effect = document.createElement('div');
        effect.className = 'lucky-effect';
        effect.style.cssText = `
            position: fixed;
            width: ${this.effectSize}px;
            height: ${this.effectSize}px;
            cursor: pointer;
            z-index: 9999;
            animation: luckyFadeIn 0.1s ease-out, rainbowGlow 0.8s infinite;
            pointer-events: auto;
        `;

        // Create rainbow heart
        effect.innerHTML = `
            <div class="lucky-heart">
                <div class="heart-shape">❤️</div>
            </div>
        `;

        // Get click area bounds for movement
        const clickArea = document.getElementById('current-heroine');
        if (clickArea) {
            const bounds = clickArea.getBoundingClientRect();
            // Start at random position within click area
            effect.style.left = (bounds.left + Math.random() * (bounds.width - this.effectSize)) + 'px';
            effect.style.top = (bounds.top + Math.random() * (bounds.height - this.effectSize)) + 'px';
        } else {
            // Fallback to center screen
            effect.style.left = '50%';
            effect.style.top = '50%';
            effect.style.transform = 'translate(-50%, -50%)';
        }

        // Add click handler
        effect.addEventListener('click', (e) => {
            e.stopPropagation();
            this.onEffectClicked();
        });

        return effect;
    }

    // Start random movement
    startMovement() {
        if (!this.currentEffect) return;

        const clickArea = document.getElementById('current-heroine');
        if (!clickArea) return;

        const bounds = clickArea.getBoundingClientRect();
        let posX = parseFloat(this.currentEffect.style.left);
        let posY = parseFloat(this.currentEffect.style.top);

        // Random direction
        let dirX = (Math.random() - 0.5) * this.moveSpeed;
        let dirY = (Math.random() - 0.5) * this.moveSpeed;

        // Movement animation loop
        this.movementInterval = setInterval(() => {
            if (!this.currentEffect) {
                clearInterval(this.movementInterval);
                return;
            }

            // Update position
            posX += dirX;
            posY += dirY;

            // Bounce off boundaries
            if (posX <= bounds.left || posX >= bounds.right - this.effectSize) {
                dirX *= -1;
                posX = Math.max(bounds.left, Math.min(posX, bounds.right - this.effectSize));
            }
            if (posY <= bounds.top || posY >= bounds.bottom - this.effectSize) {
                dirY *= -1;
                posY = Math.max(bounds.top, Math.min(posY, bounds.bottom - this.effectSize));
            }

            // Occasionally change direction randomly
            if (Math.random() < 0.02) {
                dirX = (Math.random() - 0.5) * this.moveSpeed;
                dirY = (Math.random() - 0.5) * this.moveSpeed;
            }

            // Apply position
            this.currentEffect.style.left = posX + 'px';
            this.currentEffect.style.top = posY + 'px';
        }, 16); // ~60fps
    }

    // Handle effect clicked
    onEffectClicked() {
        console.log('[LuckyEffect] Effect clicked!');

        // Calculate reward
        const reward = this.calculateReward();
        console.log('[LuckyEffect] Reward:', reward);

        // Add points
        if (window.gameState) {
            window.gameState.addPoints(reward);
        }

        // Play success sound
        if (window.audioManager) {
            window.audioManager.playSE('gacha_sound'); // Use fanfare
        }

        // Show reward popup
        this.showRewardPopup(reward);

        // Remove effect
        this.removeEffect(true);
    }

    // Calculate reward based on formula
    calculateReward() {
        if (!window.gameState) return 1000;

        const clickPower = window.gameState.get('gameProgress.totalClickBoost') || 1;
        const cps = window.gameState.get('gameProgress.totalCPS') || 0;
        const maxStage = Math.max(...(window.gameState.get('gameProgress.unlockedStages') || [1]));
        const totalPoints = window.gameState.get('gameProgress.totalPoints') || 0;

        // Formula: (clickPower + CPS × 1.0) × maxStage + totalPoints × 0.05
        const baseReward = (clickPower + cps * 1.0) * maxStage;
        const bonus = totalPoints * 0.05;
        const finalReward = Math.floor(baseReward + bonus);

        console.log('[LuckyEffect] Reward calculation:', {
            clickPower,
            cps,
            maxStage,
            totalPoints,
            baseReward,
            bonus,
            finalReward
        });

        return finalReward;
    }

    // Show reward popup
    showRewardPopup(reward) {
        const popup = document.createElement('div');
        popup.className = 'lucky-reward-popup';
        popup.textContent = `+${this.formatNumber(reward)} ポイント!`;
        popup.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 48px;
            font-weight: bold;
            color: #FFD700;
            text-shadow: 0 0 20px rgba(255, 215, 0, 0.8),
                         0 0 40px rgba(255, 215, 0, 0.6),
                         2px 2px 4px rgba(0, 0, 0, 0.8);
            z-index: 10000;
            pointer-events: none;
            animation: luckyRewardPopup 2s ease-out forwards;
        `;

        document.body.appendChild(popup);

        setTimeout(() => {
            popup.remove();
        }, 2000);
    }

    // Remove effect
    removeEffect(success) {
        console.log('[LuckyEffect] Removing effect, success:', success);

        // Clear timers
        if (this.effectTimeout) {
            clearTimeout(this.effectTimeout);
            this.effectTimeout = null;
        }
        if (this.movementInterval) {
            clearInterval(this.movementInterval);
            this.movementInterval = null;
        }

        // Remove element
        if (this.currentEffect) {
            this.currentEffect.remove();
            this.currentEffect = null;
        }

        // Reset cooldown (both time and clicks)
        if (window.gameState) {
            window.gameState.set('luckyEffect.lastSpawnTime', Date.now());
            window.gameState.set('luckyEffect.clicksSinceLastSpawn', 0);
        }

        this.isActive = false;
        console.log('[LuckyEffect] Cooldown reset');
    }

    // Track clicks for cooldown
    trackClick() {
        if (!window.gameState) return;

        const currentClicks = window.gameState.get('luckyEffect.clicksSinceLastSpawn') || 0;
        window.gameState.set('luckyEffect.clicksSinceLastSpawn', currentClicks + 1);

        // Check if can spawn
        if (this.canSpawn()) {
            console.log('[LuckyEffect] Conditions met! Spawning...');
            this.spawn();
        }
    }

    // Format number with commas
    formatNumber(num) {
        return Math.floor(num).toLocaleString();
    }

    // Initialize
    initialize() {
        console.log('[LuckyEffect] Initializing...');

        // Initialize gameState properties if needed
        if (window.gameState) {
            if (!window.gameState.get('luckyEffect.lastSpawnTime')) {
                window.gameState.set('luckyEffect.lastSpawnTime', Date.now());
            }
            if (!window.gameState.get('luckyEffect.clicksSinceLastSpawn')) {
                window.gameState.set('luckyEffect.clicksSinceLastSpawn', 0);
            }
        }

        console.log('[LuckyEffect] Initialization complete');
    }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    window.luckyEffectManager = new LuckyEffectManager();
    window.luckyEffectManager.initialize();
    console.log('[LuckyEffect] Manager attached to window');
});
