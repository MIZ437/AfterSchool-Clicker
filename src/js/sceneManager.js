// AfterSchool Clicker - Scene Manager
class SceneManager {
    constructor() {
        this.currentScene = 'loading';
        this.scenes = new Map();
        this.isTransitioning = false;
        this.firstRun = true;
        this.setupScenes();
    }

    setupScenes() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeScenes());
        } else {
            this.initializeScenes();
        }
    }

    initializeScenes() {
        // Register all scenes
        this.registerScene('loading', document.getElementById('loading-screen'));
        this.registerScene('title', document.getElementById('title-screen'));
        this.registerScene('tutorial', document.getElementById('tutorial-screen'));
        this.registerScene('game', document.getElementById('game-screen'));
        this.registerScene('album', document.getElementById('album-screen'));
        this.registerScene('settings', document.getElementById('settings-screen'));

        this.setupEventHandlers();
        this.startGame();
    }

    registerScene(name, element) {
        if (element) {
            this.scenes.set(name, element);
        }
    }

    setupEventHandlers() {
        // Title screen buttons
        const startGameBtn = document.getElementById('start-game-btn');
        const settingsBtn = document.getElementById('settings-btn');
        const quitBtn = document.getElementById('quit-btn');

        if (startGameBtn) {
            startGameBtn.addEventListener('click', () => this.handleGameStart());
        }
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.showScene('settings'));
        }
        if (quitBtn) {
            quitBtn.addEventListener('click', () => this.quitGame());
        }

        // Tutorial screen buttons
        const startMainGameBtn = document.getElementById('start-main-game-btn');

        if (startMainGameBtn) {
            startMainGameBtn.addEventListener('click', () => {
                this.firstRun = false;
                this.showScene('game');
            });
        }

        // Game screen buttons
        const albumBtn = document.getElementById('album-btn');
        const gameSettingsBtn = document.getElementById('game-settings-btn');
        const gameQuitBtn = document.getElementById('game-quit-btn');

        if (albumBtn) {
            albumBtn.addEventListener('click', () => this.showScene('album'));
        }
        if (gameSettingsBtn) {
            gameSettingsBtn.addEventListener('click', () => this.showScene('settings'));
        }
        if (gameQuitBtn) {
            gameQuitBtn.addEventListener('click', () => this.showScene('title'));
        }

        // Settings screen buttons
        const settingsOkBtn = document.getElementById('settings-ok-btn');
        const settingsCancelBtn = document.getElementById('settings-cancel-btn');
        const deleteSaveBtn = document.getElementById('delete-save-btn');
        const backupSaveBtn = document.getElementById('backup-save-btn');

        if (settingsOkBtn) {
            settingsOkBtn.addEventListener('click', () => this.returnToPreviousScene());
        }
        if (settingsCancelBtn) {
            settingsCancelBtn.addEventListener('click', () => this.returnToPreviousScene());
        }
        if (deleteSaveBtn) {
            deleteSaveBtn.addEventListener('click', () => this.handleDeleteSave());
        }
        if (backupSaveBtn) {
            backupSaveBtn.addEventListener('click', () => this.handleManualSave());
        }

        // Stage tabs
        const stageTabs = document.querySelectorAll('.stage-tab');
        stageTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const stage = parseInt(tab.dataset.stage);
                this.switchToStage(stage);
            });
        });

        // Panel tabs
        const panelTabs = document.querySelectorAll('.panel-tab');
        panelTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const panel = tab.dataset.panel;
                this.switchToPanel(panel);
            });
        });
    }

    async startGame() {
        // Show loading screen initially
        this.showScene('loading');

        try {
            // Load game data
            await window.dataManager.loadAll();

            // Load save data
            if (window.saveManager) {
                await window.saveManager.loadGame();
            }

            // Add minimal delay for smooth transition, then show title
            await this.delay(200);
            this.showScene('title');

        } catch (error) {
            console.error('Failed to start game:', error);
            this.showScene('title'); // Show title even if loading fails
        }
    }

    handleGameStart() {
        if (this.firstRun) {
            this.showScene('tutorial');
        } else {
            this.showScene('game');
        }
    }

    showScene(sceneName, transition = 'fade') {
        if (this.isTransitioning || !this.scenes.has(sceneName)) {
            return;
        }

        this.isTransitioning = true;

        const currentSceneElement = this.scenes.get(this.currentScene);
        const newSceneElement = this.scenes.get(sceneName);

        // Instant transition to prevent flickering
        if (newSceneElement) {
            // Hide current scene immediately
            if (currentSceneElement && currentSceneElement !== newSceneElement) {
                currentSceneElement.classList.remove('active');
            }

            // Show new scene immediately
            newSceneElement.classList.add('active');

            this.currentScene = sceneName;
            this.isTransitioning = false;

            // Scene-specific initialization
            this.onSceneEnter(sceneName);
        } else {
            this.isTransitioning = false;
        }
    }

    onSceneEnter(sceneName) {
        switch (sceneName) {
            case 'game':
                this.initializeGameScene();
                break;
            case 'album':
                this.initializeAlbumScene();
                break;
            case 'settings':
                this.initializeSettingsScene();
                break;
        }
    }

    initializeGameScene() {
        // Update all game displays
        this.updateGameUI();
        this.updateStageUI();

        // Start idle point generation
        this.startIdleGeneration();

        // Update heroine display
        this.updateHeroineDisplay();
    }

    initializeAlbumScene() {
        if (window.albumManager) {
            window.albumManager.renderAlbum();
        }
    }

    initializeSettingsScene() {
        // Load current settings
        const settings = window.gameState.get('settings');
        const bgmSlider = document.getElementById('bgm-volume');
        const seSlider = document.getElementById('se-volume');

        if (bgmSlider && settings) {
            bgmSlider.value = settings.bgmVolume * 100;
            document.getElementById('bgm-value').textContent = Math.round(settings.bgmVolume * 100) + '%';
        }

        if (seSlider && settings) {
            seSlider.value = settings.seVolume * 100;
            document.getElementById('se-value').textContent = Math.round(settings.seVolume * 100) + '%';
        }
    }

    updateGameUI() {
        // Update points display
        const currentPoints = window.gameState.get('gameProgress.currentPoints');
        const pps = window.gameState.get('gameProgress.totalCPS');
        const currentStage = window.gameState.get('gameProgress.currentStage');

        document.getElementById('current-points').textContent = this.formatNumber(currentPoints);
        document.getElementById('points-per-second').textContent = this.formatNumber(pps);
        document.getElementById('current-stage').textContent = currentStage;
    }

    updateStageUI() {
        const unlockedStages = window.gameState.get('gameProgress.unlockedStages');
        const currentStage = window.gameState.get('gameProgress.currentStage');

        document.querySelectorAll('.stage-tab').forEach(tab => {
            const stage = parseInt(tab.dataset.stage);
            const isUnlocked = unlockedStages.includes(stage);
            const isActive = stage === currentStage;

            tab.classList.toggle('locked', !isUnlocked);
            tab.classList.toggle('active', isActive);
            tab.disabled = !isUnlocked;
        });
    }

    switchToStage(stageId) {
        // Get the most current unlocked stages
        const unlockedStages = window.gameState.get('gameProgress.unlockedStages');

        // Double-check with a small delay for race conditions
        if (!unlockedStages.includes(stageId)) {
            setTimeout(() => {
                const updatedUnlockedStages = window.gameState.get('gameProgress.unlockedStages');
                if (!updatedUnlockedStages.includes(stageId)) {
                    this.showMessage('このステージはまだ解放されていません');
                } else {
                    // Retry the switch after state update
                    this.switchToStageImmediate(stageId);
                }
            }, 50);
            return;
        }

        this.switchToStageImmediate(stageId);
    }

    switchToStageImmediate(stageId) {

        window.gameState.set('gameProgress.currentStage', stageId);
        this.updateStageUI();
        this.updateHeroineDisplay();

        // Update gacha display
        if (window.gachaSystem) {
            window.gachaSystem.setStage(stageId);
        }
    }

    switchToPanel(panelName) {
        // Update panel tabs
        document.querySelectorAll('.panel-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.panel === panelName);
        });

        // Update panel content
        document.querySelectorAll('.panel-content').forEach(panel => {
            panel.classList.toggle('active', panel.id === `${panelName}-panel`);
        });
    }

    updateHeroineDisplay() {
        const currentStage = window.gameState.get('gameProgress.currentStage');
        const unlockedHeroines = window.gameState.get(`collection.heroine.stage${currentStage}`) || [];

        if (unlockedHeroines.length > 0 && window.clickSystem) {
            // Show random unlocked heroine
            const randomHeroine = window.dataManager.getRandomHeroine(currentStage);
            if (randomHeroine) {
                const imagePath = window.dataManager.getAssetPath(randomHeroine.filename);
                window.clickSystem.setHeroineImage(imagePath);
            }
        }
    }

    startIdleGeneration() {
        // Stop any existing idle generation
        if (this.idleInterval) {
            clearInterval(this.idleInterval);
        }

        // Start new idle generation
        this.idleInterval = setInterval(() => {
            const pps = window.gameState.get('gameProgress.totalCPS');
            if (pps > 0) {
                window.gameState.addPoints(pps);
                this.updateGameUI();
            }
        }, 1000);
    }

    stopIdleGeneration() {
        if (this.idleInterval) {
            clearInterval(this.idleInterval);
            this.idleInterval = null;
        }
    }

    returnToPreviousScene() {
        // Simple logic: return to game if in settings, otherwise go to title
        if (this.currentScene === 'settings') {
            this.showScene('game');
        } else {
            this.showScene('title');
        }
    }

    async handleManualSave() {
        console.log('SceneManager: Manual save requested');

        try {
            if (window.saveManager) {
                const result = await window.saveManager.saveGameWithStatus();

                if (result.success) {
                    alert('現在の進捗をセーブしました。');
                } else {
                    alert('セーブに失敗しました: ' + result.message);
                }
            } else {
                alert('セーブマネージャーが見つかりません。');
            }
        } catch (error) {
            console.error('SceneManager: Manual save error:', error);
            alert('セーブ中にエラーが発生しました: ' + error.message);
        }
    }

    async handleDeleteSave() {
        // Show confirmation dialog
        const confirmed = confirm('本当にセーブデータを削除しますか？\nこの操作は取り消せません。');

        if (!confirmed) {
            return;
        }

        try {
            console.log('SceneManager: Starting save deletion process...');

            if (window.saveManager) {
                const result = await window.saveManager.deleteSave();

                if (result.success) {
                    console.log('SceneManager: Save deletion successful, starting system refresh...');

                    // Force complete system refresh without reload
                    await this.completeSystemRefresh();

                    alert('セーブデータを削除しました。');
                } else {
                    throw new Error(result.message || 'セーブデータの削除に失敗しました');
                }
            } else {
                throw new Error('セーブマネージャーが見つかりません');
            }
        } catch (error) {
            console.error('SceneManager: Delete save error:', error);
            alert('セーブデータの削除に失敗しました: ' + error.message);
        }
    }

    async completeSystemRefresh() {
        console.log('SceneManager: Starting complete system refresh...');

        try {
            // Step 1: Switch to game scene and update all UI
            this.showScene('game');
            this.switchToStageImmediate(1);
            this.switchToPanel('shop');

            // Step 2: Force refresh all managers
            await this.refreshAllManagers();

            // Step 3: Update all UI elements
            this.updateGameUI();
            this.updateStageUI();
            this.updateHeroineDisplay();

            // Step 4: Reset scroll positions for all scrollable elements
            this.resetAllScrollPositions();

            // Step 5: Force settings UI refresh (debug mode fix)
            setTimeout(() => {
                this.forceRefreshSettingsUI();
            }, 500);

            console.log('SceneManager: Complete system refresh finished');
        } catch (error) {
            console.error('SceneManager: System refresh failed:', error);
            throw error;
        }
    }

    async refreshAllManagers() {
        console.log('SceneManager: Refreshing all managers...');

        // Refresh shop system
        if (window.shopSystem && window.shopSystem.completeReinitialize) {
            console.log('SceneManager: Reinitializing shop system...');
            await window.shopSystem.completeReinitialize();
        }

        // Refresh gacha system
        if (window.gachaSystem) {
            console.log('SceneManager: Refreshing gacha system...');
            window.gachaSystem.setStage(1);
            window.gachaSystem.updateGachaDisplay();
        }

        // Refresh album manager
        if (window.albumManager && window.albumManager.renderAlbum) {
            console.log('SceneManager: Refreshing album manager...');
            window.albumManager.renderAlbum();
        }

        // Refresh audio manager settings
        if (window.audioManager && window.audioManager.loadSettings) {
            console.log('SceneManager: Refreshing audio manager...');
            window.audioManager.loadSettings();
        }
    }

    resetAllScrollPositions() {
        console.log('SceneManager: Resetting all scroll positions...');

        try {
            // Reset scroll position for game screen
            const gameScreen = document.getElementById('game-screen');
            if (gameScreen) {
                gameScreen.scrollTop = 0;
                console.log('SceneManager: Game screen scroll reset');
            }

            // Reset scroll position for shop panel and sub-panels
            const shopPanel = document.getElementById('shop-panel');
            if (shopPanel) {
                shopPanel.scrollTop = 0;
                console.log('SceneManager: Shop panel scroll reset');
            }

            // Reset scroll position for gacha panel
            const gachaPanel = document.getElementById('gacha-panel');
            if (gachaPanel) {
                gachaPanel.scrollTop = 0;
                console.log('SceneManager: Gacha panel scroll reset');
            }

            // Reset scroll position for shop items container
            const shopItemsContainer = document.querySelector('.shop-items-container');
            if (shopItemsContainer) {
                shopItemsContainer.scrollTop = 0;
                console.log('SceneManager: Shop items container scroll reset');
            }

            // Reset scroll position for all tab contents
            const tabContents = document.querySelectorAll('.shop-tab-content, .panel-content');
            tabContents.forEach((content, index) => {
                content.scrollTop = 0;
                console.log(`SceneManager: Tab content ${index} scroll reset`);
            });

            // Reset scroll position for specific item containers
            const itemContainers = document.querySelectorAll('#click-items-simple, #cps-items-simple');
            itemContainers.forEach((container, index) => {
                container.scrollTop = 0;
                console.log(`SceneManager: Item container ${index} scroll reset`);
            });

            // Force multiple scroll resets with delays to ensure effectiveness
            [100, 200, 500].forEach(delay => {
                setTimeout(() => {
                    if (shopItemsContainer) {
                        shopItemsContainer.scrollTop = 0;
                    }
                    itemContainers.forEach(container => {
                        container.scrollTop = 0;
                    });
                    console.log(`SceneManager: Delayed scroll reset (${delay}ms) completed`);
                }, delay);
            });

            console.log('SceneManager: All scroll positions reset to top');
        } catch (error) {
            console.error('SceneManager: Error resetting scroll positions:', error);
        }
    }

    forceRefreshSettingsUI() {
        console.log('SceneManager: Force refreshing settings UI...');

        try {
            // Refresh debug mode UI specifically
            const debugToggle = document.getElementById('debug-toggle');
            const debugStatus = document.getElementById('debug-status');

            if (debugToggle && debugStatus && window.gameState) {
                const actualDebugState = window.gameState.isDebugMode();
                const settingsDebugState = window.gameState.get('settings.debugMode');

                console.log('SceneManager: Debug mode states:', {
                    actualState: actualDebugState,
                    settingsState: settingsDebugState
                });

                // Sync UI with actual state
                debugToggle.checked = actualDebugState;
                debugStatus.textContent = actualDebugState ? 'ON' : 'OFF';

                console.log('SceneManager: Debug UI synchronized');
            }

            // Refresh other settings UI
            this.initializeSettingsScene();

            console.log('SceneManager: Settings UI refresh completed');
        } catch (error) {
            console.error('SceneManager: Settings UI refresh failed:', error);
        }
    }

    quitGame() {
        if (window.electronAPI) {
            window.close();
        } else {
            this.showMessage('ゲームを終了します');
        }
    }

    showMessage(message, type = 'info') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `scene-message ${type}`;
        messageDiv.textContent = message;
        messageDiv.style.cssText = `
            position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
            background: #333; color: white; padding: 10px 20px; border-radius: 5px;
            z-index: 10000; animation: fadeInOut 3s forwards;
        `;

        document.body.appendChild(messageDiv);

        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 3000);
    }

    formatNumber(num) {
        return Math.floor(num).toLocaleString();
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getCurrentScene() {
        return this.currentScene;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.sceneManager = new SceneManager();
});