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
        const skipTutorialBtn = document.getElementById('skip-tutorial-btn');

        if (startMainGameBtn) {
            startMainGameBtn.addEventListener('click', () => {
                this.firstRun = false;
                this.showScene('game');
            });
        }
        if (skipTutorialBtn) {
            skipTutorialBtn.addEventListener('click', () => {
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

        if (settingsOkBtn) {
            settingsOkBtn.addEventListener('click', () => this.returnToPreviousScene());
        }
        if (settingsCancelBtn) {
            settingsCancelBtn.addEventListener('click', () => this.returnToPreviousScene());
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

            // Hide loading screen and show title
            setTimeout(() => {
                this.showScene('title');
            }, 2000);

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

        // Hide current scene
        if (currentSceneElement) {
            currentSceneElement.classList.remove('active');
        }

        // Show new scene
        if (newSceneElement) {
            setTimeout(() => {
                newSceneElement.classList.add('active');
                this.currentScene = sceneName;
                this.isTransitioning = false;

                // Scene-specific initialization
                this.onSceneEnter(sceneName);
            }, 300);
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
        const unlockedStages = window.gameState.get('gameProgress.unlockedStages');

        if (!unlockedStages.includes(stageId)) {
            this.showMessage('このステージはまだ解放されていません');
            return;
        }

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
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return Math.floor(num).toLocaleString();
    }

    getCurrentScene() {
        return this.currentScene;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.sceneManager = new SceneManager();
});