// 放課後クリッカー - Main Game Controller
class AfterSchoolClicker {
    constructor() {
        this.isInitialized = false;
        this.gameLoopInterval = null;
        this.autosaveInterval = null;

        // EMA calculation for real-time PPS
        this.lastPoints = null;
        this.lastUpdateTime = null;
        this.emaPPS = 0; // Exponential Moving Average for Points Per Second
        this.emaAlpha = 0.1; // Smoothing factor (0.1 = more smoothing, 0.9 = less smoothing)

        // Point tracking for rolling window calculation
        this.pointsHistory = []; // Store {timestamp, points} for last few seconds
        this.historyWindowMs = 1000; // 1 second window

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
            console.log('Initializing 放課後クリッカー...');

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

            // Hide loading screen and show title screen
            this.completeInitialization();

            // Force shop system update after everything is initialized (immediate)
            if (window.shopSystem) {
                console.log('Main: Force updating shop system after full initialization');
                window.shopSystem.updateAllItemsAffordability();
            }

        } catch (error) {
            console.error('Game initialization failed:', error);

            // Even if initialization fails, try to show title screen
            try {
                this.completeInitialization();
            } catch (fallbackError) {
                console.error('Fallback initialization also failed:', fallbackError);
            }

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
            await this.delay(25); // Reduced from 100ms to 25ms for faster startup
            attempts++;
        }

        if (!this.areManagersReady()) {
            console.warn('Some managers failed to initialize within timeout, continuing anyway...');
            console.log('Manager availability:', {
                gameState: !!window.gameState,
                dataManager: !!window.dataManager,
                saveManager: !!window.saveManager,
                sceneManager: !!window.sceneManager,
                clickSystem: !!window.clickSystem,
                shopSystem: !!window.shopSystem,
                gachaSystem: !!window.gachaSystem,
                albumManager: !!window.albumManager,
                audioManager: !!window.audioManager,
                effectSystem: !!window.effectSystem
            });
        }

        // Initialize data first
        if (window.dataManager) {
            await window.dataManager.loadAll();
        }

        // Initialize ShopSystem AFTER data is loaded
        if (typeof ShopSystem !== 'undefined') {
            console.log('Initializing ShopSystem after data load...');
            window.shopSystem = new ShopSystem();
            await window.shopSystem.initialize();
            console.log('ShopSystem initialization complete');
        } else {
            console.error('ShopSystem class not found!');
        }

        // Load save data
        if (window.saveManager) {
            await window.saveManager.loadGame();
        }

        // Initialize audio
        console.log('Checking audioManager:', !!window.audioManager);
        if (window.audioManager) {
            console.log('AudioManager found, calling preloadAudio');
            await window.audioManager.preloadAudio();
            window.audioManager.loadSettings();
        } else {
            console.error('AudioManager not found!');
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
            window.shopSystem.updateAllItemsAffordability();
        }

        // Update gacha button state
        if (window.gachaSystem) {
            window.gachaSystem.updateGachaDisplay();
        }
    }

    updateGameDisplays() {
        this.updatePointsDisplay();
        this.updateCPSDisplay();
        this.updateClickValueDisplay();
        this.updateAutoValueDisplay();
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
            const currentPoints = window.gameState.get('gameProgress.currentPoints');
            const currentTime = Date.now();

            // Get base CPS from purchased items (instant, no smoothing needed)
            const baseCPS = window.gameState.getPointsPerSecond();

            // Detect if points dramatically decreased (save reset, spending, etc.)
            if (this.pointsHistory.length > 0) {
                const lastEntry = this.pointsHistory[this.pointsHistory.length - 1];
                const pointsDropped = currentPoints < lastEntry.points - 1000; // Threshold for major point decrease

                if (pointsDropped) {
                    console.log('[DEBUG] Major points decrease detected, clearing history');
                    this.pointsHistory = [];
                    this.emaPPS = 0;
                }
            }

            // Add current data point to history
            this.pointsHistory.push({ timestamp: currentTime, points: currentPoints });

            // Remove old data points (older than window)
            this.pointsHistory = this.pointsHistory.filter(entry =>
                currentTime - entry.timestamp <= this.historyWindowMs
            );

            // Calculate click-based PPS using rolling window
            let clickPPS = 0;
            if (this.pointsHistory.length >= 2) {
                const oldest = this.pointsHistory[0];
                const newest = this.pointsHistory[this.pointsHistory.length - 1];

                const totalTimeDelta = (newest.timestamp - oldest.timestamp) / 1000; // seconds
                const totalPointsDelta = newest.points - oldest.points;

                // Check if there was recent activity (points changed in last 0.5 seconds)
                const recentActivityThreshold = 500; // 0.5 seconds
                const timeSinceLastChange = currentTime - newest.timestamp;
                const hasRecentActivity = totalPointsDelta > 0 && timeSinceLastChange < recentActivityThreshold;

                // Only calculate if we have meaningful time difference AND recent activity
                if (totalTimeDelta >= 0.3 && hasRecentActivity) {
                    // Calculate total PPS from rolling window
                    const totalPPS = totalPointsDelta / totalTimeDelta;
                    // Subtract base CPS to get click-only PPS
                    clickPPS = Math.max(0, totalPPS - baseCPS);
                } else {
                    // No recent activity or insufficient time - fast decay
                    clickPPS = this.emaPPS * 0.5; // Faster decay when no recent clicking
                }
            } else {
                // Not enough data points, fast decay
                clickPPS = this.emaPPS * 0.5;
            }

            // Apply EMA smoothing only to click-based PPS
            this.emaPPS = this.emaAlpha * clickPPS + (1 - this.emaAlpha) * this.emaPPS;

            // If EMA is very small, set it to 0 to prevent flickering
            // Use a much smaller threshold to avoid oscillating between 0 and non-zero
            if (this.emaPPS < 0.01) {
                this.emaPPS = 0;
            }

            // Display: Base CPS (instant) + Smoothed Click PPS
            const displayPPS = Math.max(0, Math.floor(baseCPS + this.emaPPS));
            console.log('[DEBUG] CPS Display - Base CPS:', baseCPS, 'Click PPS:', Math.round(clickPPS), 'Smoothed Click:', Math.round(this.emaPPS), 'Total Display:', displayPPS);
            cpsElement.textContent = this.formatNumber(displayPPS);
        }
    }

    updateStageDisplay() {
        const stageElement = document.getElementById('current-stage');
        if (stageElement && window.gameState) {
            const stage = window.gameState.get('gameProgress.currentStage');
            stageElement.textContent = stage;
        }
    }

    updateClickValueDisplay() {
        const clickValueElement = document.getElementById('current-click-value');
        if (clickValueElement && window.gameState) {
            const clickValue = window.gameState.getClickValue();
            clickValueElement.textContent = `+${this.formatNumber(clickValue)}ポイント`;
        }
    }

    updateAutoValueDisplay() {
        const autoValueElement = document.getElementById('current-auto-value');
        if (autoValueElement && window.gameState) {
            const autoValue = window.gameState.getPointsPerSecond();
            autoValueElement.textContent = `毎秒${this.formatNumber(autoValue)}ポイント`;
        }
    }

    checkStageUnlocks() {
        // Disabled automatic stage unlocking
        // Stages are now unlocked only by manual button click
        // This method is kept for compatibility but no longer performs auto-unlock
        return;
    }

    // Manual stage unlock method (called by button click)
    unlockStage(stageId) {
        if (!window.gameState || !window.dataManager) return false;

        const currentPoints = window.gameState.get('gameProgress.currentPoints');
        const unlockedStages = window.gameState.get('gameProgress.unlockedStages');
        const stages = window.dataManager.getStages();

        // Find the stage data
        const stage = stages.find(s => {
            const id = s.id === 'STAGE_1' ? 1 :
                      s.id === 'STAGE_2' ? 2 :
                      s.id === 'STAGE_3' ? 3 :
                      s.id === 'STAGE_4' ? 4 : parseInt(s.id);
            return id === stageId;
        });

        if (!stage) return false;

        const unlockCost = parseInt(stage.unlock_cost);

        // Skip stage 1 as it's always unlocked by default
        if (stageId === 1) return true;

        // Check if already unlocked
        if (unlockedStages.includes(stageId)) return true;

        // Check if player has enough points
        if (currentPoints < unlockCost) return false;

        // Deduct points and unlock stage
        window.gameState.spendPoints(unlockCost);
        unlockedStages.push(stageId);
        window.gameState.set('gameProgress.unlockedStages', unlockedStages);

        // Show unlock notification and play sound
        this.showStageUnlockNotification(stage);

        // Play unlock sound
        if (window.audioManager) {
            window.audioManager.playSE('stage_unlock_sound');
        }

        // Screen effect
        if (window.effectSystem) {
            window.effectSystem.screenFlash('rgba(255, 215, 0, 0.5)', 1000);
        }

        // Update stage UI after unlocking with slight delay to ensure state consistency
        setTimeout(() => {
            if (window.sceneManager) {
                window.sceneManager.updateStageUI();
            }
        }, 100);

        return true;
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
        return Math.floor(num).toLocaleString();
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    completeInitialization() {
        console.log('Main: Completing initialization and transitioning to title screen...');

        try {
            // Hide loading screen
            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen) {
                loadingScreen.style.display = 'none';
                console.log('Main: Loading screen hidden');
            }

            // Show title screen via scene manager
            if (window.sceneManager) {
                window.sceneManager.showScene('title');
                console.log('Main: Switched to title scene');
            } else {
                console.error('Main: SceneManager not available for scene switch');
                // Fallback: manually show title screen
                const titleScreen = document.getElementById('title-screen');
                if (titleScreen) {
                    titleScreen.style.display = 'block';
                    console.log('Main: Fallback - title screen shown manually');
                }
            }

            console.log('Main: Initialization completion successful');
        } catch (error) {
            console.error('Main: Error during initialization completion:', error);

            // Emergency fallback
            const loadingScreen = document.getElementById('loading-screen');
            const titleScreen = document.getElementById('title-screen');

            if (loadingScreen) loadingScreen.style.display = 'none';
            if (titleScreen) titleScreen.style.display = 'block';

            console.log('Main: Emergency fallback completed');
        }
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
        enableDebug: () => {
            if (window.gameState) {
                window.gameState.setDebugMode(true);
                window.gameState.set('settings.debugMode', true);
                console.log('Debug mode enabled via console');
                return 'Debug mode enabled - infinite points activated';
            }
            return 'GameState not available';
        },
        disableDebug: () => {
            if (window.gameState) {
                window.gameState.setDebugMode(false);
                window.gameState.set('settings.debugMode', false);
                console.log('Debug mode disabled via console');
                return 'Debug mode disabled';
            }
            return 'GameState not available';
        },
        checkDebugStatus: () => {
            if (window.gameState) {
                return `Debug mode: ${window.gameState.isDebugMode()}, Can afford 999999: ${window.gameState.canAfford(999999)}`;
            }
            return 'GameState not available';
        },
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