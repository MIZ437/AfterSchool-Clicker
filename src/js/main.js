// AfterSchool Clicker - Main Game Controller
class AfterSchoolClicker {
    constructor() {
        this.isInitialized = false;
        this.gameLoopInterval = null;
        this.autosaveInterval = null;
        this.setupGame();
    }

    async setupGame() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeGame());
        } else {
            await this.initializeGame();
        }
    }

    async initializeGame() {
        try {
            console.log('Initializing AfterSchool Clicker...');

            // Initialize core systems
            await this.initializeManagers();

            // Start game loops
            this.startGameLoop();
            this.startAutosave();

            // Setup global event handlers
            this.setupGlobalEventHandlers();

            // Setup keyboard shortcuts
            this.setupKeyboardShortcuts();

            this.isInitialized = true;
            console.log('Game initialization complete!');

        } catch (error) {
            console.error('Game initialization failed:', error);
            this.showErrorMessage('ゲームの初期化に失敗しました。ページをリロードしてください。');
        }
    }

    async initializeManagers() {
        // Wait for all managers to be available
        const maxAttempts = 50;
        let attempts = 0;

        while (attempts < maxAttempts) {
            if (this.areManagersReady()) {
                break;
            }
            await this.delay(100);
            attempts++;
        }

        if (!this.areManagersReady()) {
            throw new Error('Managers failed to initialize within timeout');
        }

        // Initialize data first
        if (window.dataManager) {
            await window.dataManager.loadAll();
        }

        // Load save data
        if (window.saveManager) {
            await window.saveManager.loadGame();
        }

        // Initialize audio
        if (window.audioManager) {
            await window.audioManager.preloadAudio();
            window.audioManager.loadSettings();
        }

        // Setup cross-manager connections
        this.setupManagerConnections();
    }

    areManagersReady() {
        return window.gameState &&
               window.dataManager &&
               window.saveManager &&
               window.sceneManager &&
               window.clickSystem &&
               window.shopSystem &&
               window.gachaSystem &&
               window.albumManager &&
               window.audioManager &&
               window.effectSystem;
    }

    setupManagerConnections() {
        // Connect click system to points
        if (window.clickSystem && window.gameState) {
            window.clickSystem.onPointsGained = (points) => {
                window.gameState.addPoints(points);
                this.updatePointsDisplay();
            };
        }

        // gameState already handles auto-save for purchases, gacha, and stage unlocks
        // Connect stage unlocks to UI updates
        if (window.gameState) {
            window.gameState.addListener('gameProgress.unlockedStages', () => {
                this.checkStageUnlocks();
            });
        }

        // Connect collection changes to album updates
        if (window.gameState && window.albumManager) {
            window.gameState.addListener('collection.*', () => {
                if (window.sceneManager.getCurrentScene() === 'album') {
                    window.albumManager.renderAlbum();
                }
            });
        }
    }

    startGameLoop() {
        // Main game loop - runs every 100ms for smooth updates
        this.gameLoopInterval = setInterval(() => {
            this.updateGame();
        }, 100);
    }

    updateGame() {
        if (!this.isInitialized) return;

        // Update displays if on game screen
        if (window.sceneManager && window.sceneManager.getCurrentScene() === 'game') {
            this.updateGameDisplays();
        }

        // Check for stage unlocks
        this.checkStageUnlocks();

        // Update shop affordability
        if (window.shopSystem) {
            window.shopSystem.updateAffordability();
        }

        // Update gacha button state
        if (window.gachaSystem) {
            window.gachaSystem.updateGachaDisplay();
        }
    }

    updateGameDisplays() {
        this.updatePointsDisplay();
        this.updateCPSDisplay();
        this.updateStageDisplay();
    }

    updatePointsDisplay() {
        const pointsElement = document.getElementById('current-points');
        if (pointsElement && window.gameState) {
            const points = window.gameState.get('gameProgress.currentPoints');
            pointsElement.textContent = this.formatNumber(points);
        }
    }

    updateCPSDisplay() {
        const cpsElement = document.getElementById('points-per-second');
        if (cpsElement && window.gameState) {
            const cps = window.gameState.get('gameProgress.totalCPS');
            cpsElement.textContent = this.formatNumber(cps);
        }
    }

    updateStageDisplay() {
        const stageElement = document.getElementById('current-stage');
        if (stageElement && window.gameState) {
            const stage = window.gameState.get('gameProgress.currentStage');
            stageElement.textContent = stage;
        }
    }

    checkStageUnlocks() {
        if (!window.gameState || !window.dataManager) return;

        const currentPoints = window.gameState.get('gameProgress.currentPoints');
        const unlockedStages = window.gameState.get('gameProgress.unlockedStages');
        const stages = window.dataManager.getStages();

        let newUnlocks = false;

        stages.forEach(stage => {
            const stageId = parseInt(stage.id);
            const unlockCost = parseInt(stage.unlock_cost);

            if (!unlockedStages.includes(stageId) && currentPoints >= unlockCost) {
                unlockedStages.push(stageId);
                newUnlocks = true;

                // Show unlock notification
                this.showStageUnlockNotification(stage);

                // Play unlock sound
                if (window.audioManager) {
                    window.audioManager.playSE('stage_unlock');
                }

                // Screen effect
                if (window.effectSystem) {
                    window.effectSystem.screenFlash('rgba(255, 215, 0, 0.5)', 1000);
                }
            }
        });

        if (newUnlocks) {
            window.gameState.set('gameProgress.unlockedStages', unlockedStages);
        }
    }

    showStageUnlockNotification(stage) {
        const notification = document.createElement('div');
        notification.className = 'stage-unlock-notification';
        notification.innerHTML = `
            <div class="unlock-content">
                <h3>🎉 新しいステージが解放されました！</h3>
                <p>${stage.name}</p>
            </div>
        `;

        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
            color: white;
            padding: 20px;
            border-radius: 15px;
            z-index: 10000;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            animation: bounceIn 0.6s ease-out;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'fadeOut 0.5s ease-out forwards';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 500);
            }
        }, 3000);
    }

    startAutosave() {
        // Start time-based auto-save
        this.restartAutosaveTimer();

        // Listen for interval setting changes
        if (window.gameState) {
            window.gameState.addListener('settings.autoSaveInterval', () => {
                this.restartAutosaveTimer();
            });
        }
    }

    restartAutosaveTimer() {
        // Clear existing timer
        if (this.autosaveInterval) {
            clearInterval(this.autosaveInterval);
            this.autosaveInterval = null;
        }

        // Get interval from settings
        const intervalSeconds = window.gameState ? window.gameState.getAutoSaveInterval() : 60;
        const intervalMs = intervalSeconds * 1000;

        console.log(`Starting auto-save timer: ${intervalSeconds} seconds`);

        // Start new timer
        this.autosaveInterval = setInterval(() => {
            if (window.saveManager && window.saveManager.isAutoSaveEnabled) {
                console.log('Time-based auto-save triggered');
                window.saveManager.autoSave();
            }
        }, intervalMs);
    }

    setupGlobalEventHandlers() {
        // Handle window focus/blur for performance
        window.addEventListener('focus', () => {
            if (this.gameLoopInterval) {
                clearInterval(this.gameLoopInterval);
            }
            this.startGameLoop();
        });

        window.addEventListener('blur', () => {
            // Slow down updates when window is not focused
            if (this.gameLoopInterval) {
                clearInterval(this.gameLoopInterval);
                this.gameLoopInterval = setInterval(() => {
                    this.updateGame();
                }, 1000); // Update every second instead of 100ms
            }
        });

        // Handle page unload
        window.addEventListener('beforeunload', () => {
            if (window.saveManager) {
                window.saveManager.saveGame();
            }
        });

        // Handle visibility change (mobile/tab switching)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Save game when tab becomes hidden
                if (window.saveManager) {
                    window.saveManager.saveGame();
                }
            }
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // Don't handle shortcuts if typing in input fields
            if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
                return;
            }

            switch (event.key.toLowerCase()) {
                case ' ': // Spacebar for clicking
                    event.preventDefault();
                    if (window.clickSystem && window.sceneManager.getCurrentScene() === 'game') {
                        window.clickSystem.handleClick({ pageX: window.innerWidth / 2, pageY: window.innerHeight / 2 });
                    }
                    break;

                case 'g': // G for gacha
                    if (window.gachaSystem && window.sceneManager.getCurrentScene() === 'game') {
                        window.gachaSystem.drawGacha();
                    }
                    break;

                case 'a': // A for album
                    if (window.sceneManager) {
                        window.sceneManager.showScene('album');
                    }
                    break;

                case 's': // S for settings
                    if (window.sceneManager) {
                        window.sceneManager.showScene('settings');
                    }
                    break;

                case 'escape': // Escape to go back
                    if (window.sceneManager) {
                        const currentScene = window.sceneManager.getCurrentScene();
                        if (currentScene === 'settings' || currentScene === 'album') {
                            window.sceneManager.showScene('game');
                        }
                    }
                    break;

                case '1':
                case '2':
                case '3':
                case '4': // Number keys for stage switching
                    const stageNum = parseInt(event.key);
                    if (window.sceneManager && window.sceneManager.getCurrentScene() === 'game') {
                        window.sceneManager.switchToStage(stageNum);
                    }
                    break;
            }
        });
    }

    // Utility methods
    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return Math.floor(num).toLocaleString();
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    showErrorMessage(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #e74c3c;
            color: white;
            padding: 15px 25px;
            border-radius: 5px;
            z-index: 10000;
            font-weight: bold;
        `;

        document.body.appendChild(errorDiv);

        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
    }

    // Debug methods
    getGameStatus() {
        return {
            initialized: this.isInitialized,
            currentScene: window.sceneManager ? window.sceneManager.getCurrentScene() : 'unknown',
            gameState: window.gameState ? window.gameState.get('gameProgress') : null,
            managersReady: this.areManagersReady(),
            audioStatus: window.audioManager ? window.audioManager.getAudioStatus() : null
        };
    }

    // Performance monitoring
    getPerformanceMetrics() {
        return {
            gameLoopActive: !!this.gameLoopInterval,
            autosaveActive: !!this.autosaveInterval,
            memoryUsage: performance.memory ? {
                used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + 'MB',
                total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024) + 'MB'
            } : 'unavailable'
        };
    }

    // Cleanup methods
    destroy() {
        if (this.gameLoopInterval) {
            clearInterval(this.gameLoopInterval);
            this.gameLoopInterval = null;
        }

        if (this.autosaveInterval) {
            clearInterval(this.autosaveInterval);
            this.autosaveInterval = null;
        }

        // Save before cleanup
        if (window.saveManager) {
            window.saveManager.saveGame();
        }

        this.isInitialized = false;
        console.log('Game cleanup completed');
    }
}

// Initialize the main game controller
document.addEventListener('DOMContentLoaded', () => {
    window.afterSchoolClicker = new AfterSchoolClicker();

    // Add CSS animations for notifications
    const style = document.createElement('style');
    style.textContent = `
        @keyframes bounceIn {
            0% { transform: translate(-50%, -50%) scale(0.3); opacity: 0; }
            50% { transform: translate(-50%, -50%) scale(1.05); }
            70% { transform: translate(-50%, -50%) scale(0.9); }
            100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }

        @keyframes fadeOut {
            0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
        }

        .stage-unlock-notification {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            text-align: center;
        }

        .unlock-content h3 {
            margin: 0 0 10px 0;
            font-size: 1.2rem;
        }

        .unlock-content p {
            margin: 0;
            font-size: 1rem;
            opacity: 0.9;
        }
    `;
    document.head.appendChild(style);
});

// Debug console commands
if (typeof window !== 'undefined') {
    window.debugGame = {
        status: () => window.afterSchoolClicker ? window.afterSchoolClicker.getGameStatus() : 'Game not initialized',
        performance: () => window.afterSchoolClicker ? window.afterSchoolClicker.getPerformanceMetrics() : 'Game not initialized',
        addPoints: (amount) => window.gameState ? window.gameState.addPoints(amount) : 'GameState not available',
        unlockStage: (stageId) => {
            if (window.gameState) {
                const stages = window.gameState.get('gameProgress.unlockedStages');
                if (!stages.includes(stageId)) {
                    stages.push(stageId);
                    window.gameState.set('gameProgress.unlockedStages', stages);
                }
            }
        },
        reset: () => {
            if (confirm('本当にゲームデータをリセットしますか？')) {
                localStorage.clear();
                location.reload();
            }
        }
    };
}