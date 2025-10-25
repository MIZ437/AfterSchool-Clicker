// 放課後クリッカー - Scene Manager
class SceneManager {
    constructor() {
        this.currentScene = 'loading';
        this.previousScene = null;
        this.scenes = new Map();
        this.isTransitioning = false;
        this.firstRun = true;
        this.audioContextInitialized = false;
        this.isMuted = false;
        this.titleImageRotationTimer = null;
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
        this.registerScene('scenario', document.getElementById('scenario-screen'));
        this.registerScene('tutorial', document.getElementById('tutorial-screen'));
        this.registerScene('ending1', document.getElementById('ending1-screen'));
        this.registerScene('ending2', document.getElementById('ending2-screen'));
        this.registerScene('game', document.getElementById('game-screen'));
        this.registerScene('album', document.getElementById('album-screen'));
        this.registerScene('settings', document.getElementById('settings-screen'));

        // Make sceneManager globally accessible for audioManager
        window.sceneManager = this;

        // Setup state listeners for automatic UI updates
        this.setupStateListeners();

        this.setupEventHandlers();
        this.setupAudioActivationOverlay();
        this.startGame();
    }

    setupStateListeners() {
        // Listen for all state changes using wildcard listener
        // This ensures we catch changes from batchUpdate()
        window.gameState.addListener('*', (newValue, oldValue, path) => {
            console.log('[setupStateListeners] State changed:', path);

            // Only respond to relevant changes when in game scene
            if (this.currentScene !== 'game') return;

            // Update heroine display when collection or stage changes
            if (path === 'collection.currentDisplayImage' ||
                path.startsWith('collection.heroine.') ||
                path === 'gameProgress.currentStage' ||
                path === '*') { // Catch batch updates

                console.log('[setupStateListeners] Triggering updateHeroineDisplay for path:', path);
                this.updateHeroineDisplay();

                if (path === 'gameProgress.currentStage' || path === '*') {
                    this.updateStageUI();
                }
            }
        });
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
            startGameBtn.addEventListener('click', async () => {
                await this.handleTitleButtonClick();
                this.handleGameStart();
            });
        }
        if (settingsBtn) {
            settingsBtn.addEventListener('click', async () => {
                await this.handleTitleButtonClick();
                this.showScene('settings');
            });
        }
        if (quitBtn) {
            quitBtn.addEventListener('click', async () => {
                await this.handleTitleButtonClick();
                this.quitGame();
            });
        }

        // Scenario screen buttons
        const scenarioSkipBtn = document.getElementById('scenario-skip-btn');
        const scenarioContinueBtn = document.getElementById('scenario-continue-btn');
        const scenarioBackToAlbumBtn = document.getElementById('scenario-back-to-album-btn');

        if (scenarioSkipBtn) {
            scenarioSkipBtn.addEventListener('click', (e) => {
                // Prevent action if button is disabled
                if (scenarioSkipBtn.disabled) {
                    console.log('[DEBUG] Skip button click blocked - button is disabled');
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }

                console.log('[DEBUG] Skip button clicked - transitioning to tutorial');
                // Mark scenario as viewed even when skipped
                if (window.gameState) {
                    window.gameState.markContentViewed('scenarios', 'scenario');
                }
                this.showScene('tutorial');
            });
        }

        if (scenarioContinueBtn) {
            scenarioContinueBtn.addEventListener('click', (e) => {
                // Prevent action if button is disabled
                if (scenarioContinueBtn.disabled) {
                    console.log('[DEBUG] Continue button click blocked - button is disabled');
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }

                console.log('[DEBUG] Continue button clicked - transitioning to tutorial');
                // Mark scenario as viewed
                if (window.gameState) {
                    window.gameState.markContentViewed('scenarios', 'scenario');
                }
                this.showScene('tutorial');
            });
        }

        if (scenarioBackToAlbumBtn) {
            scenarioBackToAlbumBtn.addEventListener('click', () => {
                this.showScene('album');
            });
        }

        // Tutorial screen buttons
        const startMainGameBtn = document.getElementById('start-main-game-btn');

        if (startMainGameBtn) {
            startMainGameBtn.addEventListener('click', () => {
                this.firstRun = false;
                this.showScene('game');
            });
        }

        // Ending screen buttons
        const ending1ContinueBtn = document.getElementById('ending1-continue-btn');
        const ending2GameBtn = document.getElementById('ending2-game-btn');
        const ending2TitleBtn = document.getElementById('ending2-title-btn');
        const ending2BackToAlbumBtn = document.getElementById('ending2-back-to-album-btn');

        if (ending1ContinueBtn) {
            ending1ContinueBtn.addEventListener('click', () => {
                this.showScene('ending2');
            });
        }

        if (ending2GameBtn) {
            ending2GameBtn.addEventListener('click', async () => {
                await this.handleTitleButtonClick();
                this.showScene('game');
            });
        }

        if (ending2TitleBtn) {
            ending2TitleBtn.addEventListener('click', async () => {
                await this.handleTitleButtonClick();
                this.showScene('title');
            });
        }

        if (ending2BackToAlbumBtn) {
            ending2BackToAlbumBtn.addEventListener('click', () => {
                this.showScene('album');
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
            gameQuitBtn.addEventListener('click', async () => {
                await this.handleTitleButtonClick();
                this.showScene('title');
            });
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

    setupAudioActivationOverlay() {
        console.log('[DEBUG] Setting up audio activation overlay');

        const audioEnableBtn = document.getElementById('audio-enable-btn');
        const audioDisableBtn = document.getElementById('audio-disable-btn');

        if (audioEnableBtn && audioDisableBtn) {
            // Handle "する" (Enable) button
            audioEnableBtn.addEventListener('click', async (event) => {
                event.stopPropagation();
                console.log('[DEBUG] Audio ENABLE button clicked');

                try {
                    // Initialize audio context and system
                    await this.activateAudioSystem();

                    // Hide the overlay with smooth transition
                    this.hideAudioOverlay();

                    // Start title BGM if available
                    await this.startTitleBGM();

                    console.log('[DEBUG] Audio system enabled and BGM started');

                } catch (error) {
                    console.error('[DEBUG] Audio activation failed:', error);
                    // Hide overlay anyway to not block the game
                    this.hideAudioOverlay();
                }
            });

            // Handle "しない" (Disable) button
            audioDisableBtn.addEventListener('click', async (event) => {
                event.stopPropagation();
                console.log('[DEBUG] Audio DISABLE button clicked');

                // Set mute mode
                this.setMuteMode(true);

                // Hide the overlay with smooth transition
                this.hideAudioOverlay();

                console.log('[DEBUG] Audio system disabled (muted)');
            });

            console.log('[DEBUG] Audio choice button event listeners added');
        } else {
            console.warn('[DEBUG] Audio choice button elements not found');
        }
    }

    async activateAudioSystem() {
        console.log('[DEBUG] Activating audio system');

        // Create a temporary audio element to unlock the audio context
        const unlockAudio = new Audio();
        unlockAudio.src = '../assets/se/click.mp3';
        unlockAudio.volume = 0.01;

        try {
            // Play the unlock audio
            await unlockAudio.play();
            console.log('[DEBUG] Audio context unlocked successfully');

            // Initialize the main audio system
            if (window.audioManager) {
                await window.audioManager.initializeAudioContext();
                await window.audioManager.loadSoundsSync();
                window.audioManager.loadSettings();
                window.audioManager.setupUIAudioHandlers();
                console.log('[DEBUG] AudioManager fully initialized');
            }

            // Mark audio as activated
            this.audioContextInitialized = true;

        } catch (error) {
            console.error('[DEBUG] Audio system activation failed:', error);
            throw error;
        }
    }

    hideAudioOverlay() {
        console.log('[DEBUG] Hiding audio overlay');

        const audioOverlay = document.getElementById('audio-activation-overlay');
        if (audioOverlay) {
            // Add hidden class for smooth transition
            audioOverlay.classList.add('hidden');

            // Remove from DOM after transition
            setTimeout(() => {
                audioOverlay.style.display = 'none';
            }, 300);
        }
    }

    showAudioOverlay() {
        console.log('[DEBUG] Showing audio overlay');

        const audioOverlay = document.getElementById('audio-activation-overlay');
        if (audioOverlay) {
            // Make sure overlay is visible and remove hidden class
            audioOverlay.style.display = 'flex';
            audioOverlay.classList.remove('hidden');
            console.log('[DEBUG] Audio overlay displayed');
        } else {
            console.warn('[DEBUG] Audio overlay element not found');
        }
    }

    setMuteMode(isMuted) {
        console.log('[DEBUG] Setting mute mode:', isMuted);

        // Mark audio as initialized but muted
        this.audioContextInitialized = false;
        this.isMuted = isMuted;

        // Set audio manager to mute if available
        if (window.audioManager) {
            try {
                // Set mute flag in audio manager
                window.audioManager.setMuted(isMuted);
                console.log('[DEBUG] Audio manager mute state set to:', isMuted);
            } catch (error) {
                console.warn('[DEBUG] Failed to set audio manager mute:', error);
            }
        }
    }

    async startTitleBGM() {
        console.log('[DEBUG] Starting title BGM');
        console.log('[DEBUG] Mute status:', this.isMuted);
        console.log('[DEBUG] AudioManager available:', !!window.audioManager);

        // Don't start BGM if muted
        if (this.isMuted) {
            console.log('[DEBUG] Audio is muted - skipping title BGM');
            return;
        }

        if (!window.audioManager) {
            console.warn('[DEBUG] AudioManager not available');
            return;
        }

        // Wait for audio to be loaded if necessary
        let retryCount = 0;
        const maxRetries = 10;

        while (retryCount < maxRetries) {
            console.log(`[DEBUG] Checking for title_bgm (attempt ${retryCount + 1}/${maxRetries})`);
            console.log('[DEBUG] AudioManager sounds size:', window.audioManager.sounds.size);
            console.log('[DEBUG] Available sound IDs:', Array.from(window.audioManager.sounds.keys()));

            if (window.audioManager.sounds.has('title_bgm')) {
                try {
                    console.log('[DEBUG] Found title_bgm, attempting to play...');
                    window.audioManager.playBGM('title_bgm');
                    console.log('[DEBUG] Title BGM started successfully');
                    return;
                } catch (error) {
                    console.warn('[DEBUG] Failed to start title BGM:', error);
                    return;
                }
            }

            console.log('[DEBUG] title_bgm not found, waiting 500ms before retry...');
            await new Promise(resolve => setTimeout(resolve, 500));
            retryCount++;
        }

        console.warn('[DEBUG] Failed to find title_bgm after maximum retries');
        console.log('[DEBUG] Final available sounds:', Array.from(window.audioManager.sounds.keys()));
    }

    async handleSceneBGM(sceneName) {
        // Don't change BGM if muted
        if (this.isMuted || !window.audioManager) {
            console.log(`[DEBUG] Skipping BGM for scene ${sceneName} - muted or no audio manager`);
            return;
        }

        // Skip BGM changes during system refresh (save deletion)
        if (this.skipBGMDuringRefresh) {
            console.log(`[DEBUG] Skipping BGM for scene ${sceneName} - system refresh in progress`);
            return;
        }

        console.log(`[DEBUG] Handling BGM for scene: ${sceneName}`);

        // Special handling for settings scene based on previous scene
        if (sceneName === 'settings') {
            if (this.previousScene === 'title') {
                // Continue title BGM when coming from title (don't restart)
                console.log(`[DEBUG] Settings from title - continuing title_bgm without restart`);
                // Don't call playBGM to avoid restarting - let current BGM continue
                return;
            } else if (this.previousScene === 'game') {
                // Continue game BGM when coming from game (don't restart)
                console.log(`[DEBUG] Settings from game - continuing game BGM without restart`);
                // Don't call playBGM to avoid restarting - let current BGM continue
                return;
            } else {
                // Silent BGM when coming from other scenes (album)
                console.log(`[DEBUG] Settings from ${this.previousScene} - using silent BGM`);
                window.audioManager.playBGM('settings_bgm');
            }
            return;
        }

        // Special handling for title scene when returning from settings
        if (sceneName === 'title' && this.currentScene === 'settings') {
            // Check if title BGM is already playing
            if (window.audioManager.currentBGMId === 'title_bgm') {
                console.log(`[DEBUG] Returning to title from settings - continuing existing title_bgm`);
                // Don't restart BGM - let it continue
                return;
            }
        }

        // Get current stage for game BGM
        const currentStage = window.gameState ? window.gameState.get('gameProgress.currentStage') : 1;
        const currentGameBGM = `game_bgm_stage${currentStage}`;

        // Special handling for game scene when returning from settings or album
        if (sceneName === 'game' && (this.currentScene === 'settings' || this.currentScene === 'album')) {
            // Check if game BGM is already playing
            if (window.audioManager.currentBGMId === currentGameBGM) {
                console.log(`[DEBUG] Returning to game from ${this.currentScene} - continuing existing game BGM`);
                // Don't restart BGM - let it continue
                return;
            }
        }

        // Special handling for album scene when coming from game
        if (sceneName === 'album' && this.currentScene === 'game') {
            // Check if game BGM is playing - continue it in album
            if (window.audioManager.currentBGMId === currentGameBGM) {
                console.log(`[DEBUG] Moving to album from game - continuing game BGM`);
                // Don't change BGM - let it continue
                return;
            }
        }

        // Special handling for tutorial scene (continue title BGM)
        if (sceneName === 'tutorial' && this.currentScene === 'title') {
            if (window.audioManager.currentBGMId === 'title_bgm') {
                console.log(`[DEBUG] Transitioning to tutorial - continuing title BGM`);
                // Continue title_bgm without any changes (Plan B)
                return;
            }
        }

        // Special handling for game scene when coming from tutorial (crossfade)
        if (sceneName === 'game' && this.currentScene === 'tutorial') {
            const currentStageForCrossfade = window.gameState ? window.gameState.get('gameProgress.currentStage') : 1;
            const gameBGMId = `game_bgm_stage${currentStageForCrossfade}`;

            if (window.audioManager.currentBGMId === 'title_bgm') {
                console.log(`[DEBUG] Game start from tutorial - crossfading from title_bgm to ${gameBGMId}`);
                // Crossfade from title_bgm to game_bgm (5 seconds - smooth transition)
                window.audioManager.crossFadeBGM(gameBGMId, 5000);
                return;
            }
        }

        // Normal scene BGM mapping for other scenes
        const sceneBGMMap = {
            'title': 'title_bgm',
            'scenario': null,                // No BGM change - continue current BGM
            'tutorial': 'tutorial_bgm',      // Will be silent (empty filename)
            'game': currentGameBGM,          // Dynamic based on current stage
            'album': 'album_bgm',            // Will be silent (empty filename)
            'ending1': null,                 // No BGM change - continue current BGM
            'ending2': null                  // No BGM change - continue current BGM
        };

        const bgmId = sceneBGMMap[sceneName];
        if (bgmId) {
            const currentBGMId = window.audioManager.currentBGMId;

            // Determine appropriate BGM transition method
            if (currentBGMId && currentBGMId !== bgmId && window.audioManager.sounds.has(bgmId)) {
                // Different BGM exists - use crossfade
                console.log(`[DEBUG] Crossfading BGM for ${sceneName}: ${currentBGMId} -> ${bgmId}`);
                window.audioManager.crossFadeBGM(bgmId, 7000); // 7 second crossfade
            } else if (!currentBGMId && sceneName === 'game') {
                // No current BGM, game scene - use fade in with silent delay
                console.log(`[DEBUG] Fading in BGM for ${sceneName}: ${bgmId}`);
                window.audioManager.fadeInBGM(bgmId, 3000); // 3 second fade in
            } else if (!currentBGMId) {
                // No current BGM, other scenes - play normally
                console.log(`[DEBUG] Playing BGM for ${sceneName}: ${bgmId}`);
                window.audioManager.playBGM(bgmId);
            }
            // If currentBGMId === bgmId, do nothing (already handled by continue logic above)
        } else {
            console.log(`[DEBUG] No BGM defined for scene: ${sceneName}`);
        }
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

            // Check if scenario has been viewed to set firstRun flag
            const viewedScenarios = window.gameState.get('viewedContent.scenarios') || [];
            if (viewedScenarios.includes('scenario')) {
                this.firstRun = false;
                console.log('[startGame] Scenario already viewed, setting firstRun to false');
            }

            // Skip complete audio initialization - will be done when user clicks overlay
            console.log('[DEBUG] Skipping audio initialization - will activate on user click');

            // Add minimal delay for smooth transition, then show title with overlay
            await this.delay(200);
            this.showScene('title');
            this.showAudioOverlay();

        } catch (error) {
            console.error('Failed to start game:', error);
            this.showScene('title'); // Show title even if loading fails
            this.showAudioOverlay();
        }
    }

    handleTitleButtonClick() {
        console.log('[DEBUG] Title button clicked');

        // Check if audio is muted
        if (this.isMuted) {
            console.log('[DEBUG] Audio is muted - no sound will play');
            return;
        }

        // Only play audio if audio system has been activated by user
        if (!this.audioContextInitialized) {
            console.log('[DEBUG] Audio not activated yet - no sound will play');
            return;
        }

        // SINGLE AUDIO STRATEGY: Play only one sound

        // Strategy 1: Try AudioManager first (best quality)
        if (window.audioManager && window.audioManager.sounds.size > 0 && window.audioManager.sounds.has('button_click')) {
            console.log('[DEBUG] Playing button_click via AudioManager');
            window.audioManager.playSE('button_click');
            return;
        }

        console.log('[DEBUG] AudioManager button_click not available, skipping audio');
    }

    playImmediateBeep() {
        try {
            console.log('[DEBUG] Playing immediate beep');
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            // Higher frequency for more audible click
            oscillator.frequency.setValueAtTime(1200, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.08);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.08);

            console.log('[DEBUG] Immediate beep executed');
            this.audioContextInitialized = true;
        } catch (error) {
            console.log('[DEBUG] Immediate beep failed:', error);
        }
    }

    async tryPlayClickSound() {
        try {
            console.log('[DEBUG] Attempting to play click.mp3');
            const clickAudio = new Audio();
            clickAudio.src = '../assets/se/click.mp3';
            clickAudio.volume = 0.4; // Lower volume to blend with beep

            await clickAudio.play();
            console.log('[DEBUG] Click sound overlay successful');
        } catch (error) {
            console.log('[DEBUG] Click sound overlay failed (beep already played):', error);
        }
    }

    playDirectAudio() {
        try {
            console.log('[DEBUG] Playing direct audio');
            const directAudio = new Audio();
            directAudio.src = '../assets/se/click.mp3';
            directAudio.volume = 0.6;

            directAudio.play().then(() => {
                console.log('[DEBUG] Direct audio successful');
            }).catch(error => {
                console.log('[DEBUG] Direct audio failed:', error);
            });
        } catch (error) {
            console.log('[DEBUG] Direct audio creation failed:', error);
        }
    }

    async reinitializeAndPlay() {
        try {
            console.log('[DEBUG] Reinitializing audio and playing');

            // Force complete reinitialization
            if (window.audioManager) {
                await window.audioManager.initializeAudioContext();
                await window.audioManager.loadSoundsSync();

                // Try playing again
                window.audioManager.playSE('button_click');
            }
        } catch (error) {
            console.log('[DEBUG] Reinitialization failed:', error);
        }
    }

    playSimpleBeep() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);

            console.log('[DEBUG] Simple beep played');
        } catch (error) {
            console.log('[DEBUG] Beep generation failed:', error);
        }
    }

    async preloadTitleAudio() {
        console.log('[DEBUG] Pre-loading title audio...');

        if (window.audioManager) {
            try {
                // Force audio manager initialization
                await window.audioManager.loadSoundsSync();

                // Pre-create click audio element for instant playback
                this.titleClickAudio = new Audio();
                this.titleClickAudio.src = '../assets/se/click.mp3';
                this.titleClickAudio.volume = 0.8 * 0.8;
                this.titleClickAudio.preload = 'auto';

                // Wait for audio to be ready
                await new Promise((resolve) => {
                    this.titleClickAudio.addEventListener('canplaythrough', resolve, { once: true });
                    this.titleClickAudio.addEventListener('error', resolve, { once: true });
                    this.titleClickAudio.load();
                });

                console.log('[DEBUG] Title audio pre-loaded successfully');
            } catch (error) {
                console.warn('[DEBUG] Title audio pre-loading failed:', error);
            }
        }
    }

    handleGameStart() {
        if (this.firstRun) {
            this.showScene('scenario');
        } else {
            this.showScene('game');
        }
    }

    async showScene(sceneName, transition = 'fade', fromAlbum = false) {
        if (this.isTransitioning || !this.scenes.has(sceneName)) {
            return;
        }

        this.isTransitioning = true;

        const currentSceneElement = this.scenes.get(this.currentScene);
        const newSceneElement = this.scenes.get(sceneName);

        // Instant transition to prevent flickering
        if (newSceneElement) {
            // Record previous scene when transitioning to settings or when fromAlbum flag is set
            if (sceneName === 'settings') {
                this.previousScene = this.currentScene;
            } else if (fromAlbum && (sceneName === 'scenario' || sceneName === 'ending2')) {
                // Mark that we're coming from album for scenario/ending
                this.previousScene = 'album';
            }

            // Hide ALL scenes first to ensure no overlap (synchronous operation)
            for (const [name, sceneElement] of this.scenes) {
                if (sceneElement !== newSceneElement) {
                    sceneElement.classList.remove('active');
                }
            }

            // Force a layout recalculation to ensure removal is applied
            void document.body.offsetHeight;

            // Show new scene immediately
            newSceneElement.classList.add('active');

            // Scene-specific initialization (before updating currentScene for BGM logic)
            await this.onSceneEnter(sceneName);

            this.currentScene = sceneName;
            this.isTransitioning = false;
        } else {
            this.isTransitioning = false;
        }
    }

    async onSceneEnter(sceneName) {
        // Reset ending button pointer-events when leaving ending screens
        if (this.currentScene === 'ending1' || this.currentScene === 'ending2') {
            // Reset all ending button pointer-events to allow CSS to control them
            const ending1Btn = document.getElementById('ending1-continue-btn');
            const ending2GameBtn = document.getElementById('ending2-game-btn');
            const ending2TitleBtn = document.getElementById('ending2-title-btn');
            const ending2BackToAlbumBtn = document.getElementById('ending2-back-to-album-btn');

            if (ending1Btn) {
                ending1Btn.style.pointerEvents = '';
                console.log('[onSceneEnter] Reset ending1 button pointer-events');
            }
            if (ending2GameBtn) {
                ending2GameBtn.style.pointerEvents = '';
                console.log('[onSceneEnter] Reset ending2 game button pointer-events');
            }
            if (ending2TitleBtn) {
                ending2TitleBtn.style.pointerEvents = '';
                console.log('[onSceneEnter] Reset ending2 title button pointer-events');
            }
            if (ending2BackToAlbumBtn) {
                ending2BackToAlbumBtn.style.pointerEvents = '';
                console.log('[onSceneEnter] Reset ending2 back to album button pointer-events');
            }
        }

        // Handle BGM transitions between scenes
        await this.handleSceneBGM(sceneName);

        // Stop title image rotation when leaving title screen
        if (sceneName !== 'title') {
            this.stopTitleImageRotation();
        }

        // Disable click system for scenario and ending screens
        if (window.clickSystem) {
            if (sceneName === 'scenario' || sceneName === 'ending1' || sceneName === 'ending2') {
                window.clickSystem.setEnabled(false);
                console.log('[DEBUG] Click system disabled for screen:', sceneName);
            } else if (sceneName === 'game') {
                window.clickSystem.setEnabled(true);
                console.log('[DEBUG] Click system enabled for game screen');
            }
        }

        switch (sceneName) {
            case 'title':
                this.initializeTitleScene();
                break;
            case 'scenario':
                await this.initializeScenarioScene();
                break;
            case 'tutorial':
                this.initializeTutorialScene();
                break;
            case 'ending1':
                await this.initializeEnding1Scene();
                break;
            case 'ending2':
                await this.initializeEnding2Scene();
                break;
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

    async initializeCompleteAudioSystem() {
        console.log('[DEBUG] Starting complete audio system initialization');

        if (!window.audioManager) {
            console.log('[DEBUG] AudioManager not available');
            return;
        }

        try {
            // Step 1: Initialize AudioContext
            console.log('[DEBUG] Step 1: AudioContext initialization');
            await window.audioManager.initializeAudioContext();

            // Step 2: Load all sounds completely
            console.log('[DEBUG] Step 2: Loading all sounds');
            await window.audioManager.loadSoundsSync();

            // Step 3: Load settings (like settings screen does)
            console.log('[DEBUG] Step 3: Loading settings');
            window.audioManager.loadSettings();

            // Step 4: Setup UI handlers (like settings screen does)
            console.log('[DEBUG] Step 4: Setting up UI handlers');
            window.audioManager.setupUIAudioHandlers();

            // Step 5: Pre-create title audio
            console.log('[DEBUG] Step 5: Pre-creating title audio');
            await this.preloadTitleAudio();

            // Step 6: Wait for everything to settle
            await this.delay(300);

            console.log('[DEBUG] Complete audio system initialization finished');
            console.log('[DEBUG] Loaded sounds count:', window.audioManager.sounds.size);
            console.log('[DEBUG] Available sounds:', Array.from(window.audioManager.sounds.keys()));

        } catch (error) {
            console.error('[DEBUG] Complete audio initialization failed:', error);
        }
    }

    async initializeTitleScene() {
        console.log('[DEBUG] Title scene initialization (audio already pre-loaded)');

        // Audio system should already be fully initialized before title screen
        if (window.audioManager) {
            console.log('[DEBUG] Audio status - Loaded sounds:', window.audioManager.sounds.size);
            console.log('[DEBUG] Audio status - Available sounds:', Array.from(window.audioManager.sounds.keys()));
        }

        // Start title character image rotation
        this.startTitleImageRotation();
    }

    async initializeScenarioScene() {
        console.log('[initializeScenarioScene] Loading scenario text from CSV');

        if (!window.dataManager) {
            console.error('[initializeScenarioScene] DataManager not available');
            return;
        }

        // Ensure data is loaded before retrieving text
        await window.dataManager.loadAll();
        console.log('[initializeScenarioScene] Data loaded, text available:', window.dataManager.getText().length, 'entries');

        // Check if coming from album
        const isFromAlbum = this.previousScene === 'album';

        // Show/hide buttons based on source
        const skipBtn = document.getElementById('scenario-skip-btn');
        const continueBtn = document.getElementById('scenario-continue-btn');
        const backToAlbumBtn = document.getElementById('scenario-back-to-album-btn');

        if (isFromAlbum) {
            // From album: show only back to album button
            if (skipBtn) skipBtn.style.display = 'none';
            if (continueBtn) continueBtn.style.display = 'none';
            if (backToAlbumBtn) {
                // Show button
                backToAlbumBtn.style.display = 'block';

                // Force immediate interactivity with maximum priority
                backToAlbumBtn.style.setProperty('animation', 'none', 'important');
                backToAlbumBtn.style.setProperty('pointer-events', 'auto', 'important');
                backToAlbumBtn.style.setProperty('opacity', '1', 'important');

                console.log('[initializeScenarioScene] Back to album button enabled immediately (no cloning)');
            }
        } else {
            // Normal game flow: show skip and continue buttons
            if (skipBtn) {
                skipBtn.style.display = 'inline-block';
                skipBtn.disabled = true; // Use native disabled attribute

                // Override CSS animation
                skipBtn.style.setProperty('animation', 'none', 'important');
                skipBtn.style.setProperty('opacity', '1', 'important');

                console.log('[initializeScenarioScene] Skip button initialized - disabled');

                // Enable button after a delay (simulating animation timing)
                setTimeout(() => {
                    if (skipBtn && this.currentScene === 'scenario') {
                        skipBtn.disabled = false;
                        console.log('[initializeScenarioScene] Skip button enabled after delay');
                    } else {
                        console.log('[initializeScenarioScene] Skip button NOT enabled - scene changed or button removed');
                    }
                }, 1500); // 1s delay + 0.5s animation from CSS
            }

            if (continueBtn) {
                // Keep button hidden and disabled initially
                continueBtn.style.display = 'none';
                continueBtn.disabled = true; // Use native disabled attribute
                continueBtn.style.setProperty('opacity', '0', 'important');

                console.log('[initializeScenarioScene] Continue button hidden - waiting for scenario completion');

                // Listen for the last scenario line animation to complete
                const lastScenarioLine = document.querySelector('#scenario-screen .scenario-line:nth-child(7)');

                if (lastScenarioLine) {
                    const handleScenarioComplete = () => {
                        // Only show button if still on scenario scene
                        if (this.currentScene === 'scenario') {
                            console.log('[initializeScenarioScene] Last scenario line animated - showing continue button');

                            // Show and enable the button
                            continueBtn.style.display = 'inline-block';
                            continueBtn.style.setProperty('opacity', '1', 'important');
                            continueBtn.disabled = false;
                        }

                        lastScenarioLine.removeEventListener('animationend', handleScenarioComplete);
                    };

                    lastScenarioLine.addEventListener('animationend', handleScenarioComplete, { once: true });
                    console.log('[initializeScenarioScene] Listening for last scenario line animation completion');
                } else {
                    console.warn('[initializeScenarioScene] Last scenario line not found - using fallback timeout');
                    // Fallback: show button after calculated delay if element not found
                    setTimeout(() => {
                        if (continueBtn && this.currentScene === 'scenario') {
                            continueBtn.style.display = 'inline-block';
                            continueBtn.style.setProperty('opacity', '1', 'important');
                            continueBtn.disabled = false;
                            console.log('[initializeScenarioScene] Continue button shown (fallback)');
                        }
                    }, 10000); // 9.5s delay + 0.4s animation + 0.1s buffer
                }
            }

            if (backToAlbumBtn) backToAlbumBtn.style.display = 'none';
        }

        // Load scenario texts from CSV
        for (let i = 1; i <= 7; i++) {
            const textId = `scenario_line_${i}`;
            const text = window.dataManager.getTextById(textId);
            const element = document.getElementById(textId);

            if (element && text) {
                element.textContent = text;
                console.log(`[initializeScenarioScene] Loaded ${textId}: ${text}`);
            } else {
                console.warn(`[initializeScenarioScene] Missing element or text for ${textId}`);
            }
        }

        // Load button text
        if (continueBtn) {
            const btnText = window.dataManager.getTextById('scenario_continue');
            if (btnText) {
                continueBtn.textContent = btnText;
            }
        }

        // Load character image from CSV
        const characterImg = document.getElementById('scenario-character-img');
        if (characterImg) {
            console.log('[initializeScenarioScene] Character img element found');

            const imageData = window.dataManager.getImage('scenario_character');
            console.log('[initializeScenarioScene] Image data from CSV:', imageData);

            if (imageData) {
                const imagePath = window.dataManager.getAssetPath(imageData.filename);
                console.log('[initializeScenarioScene] Constructed image path:', imagePath);
                console.log('[initializeScenarioScene] Image data filename:', imageData.filename);

                // Add error handler before setting src
                characterImg.onerror = (e) => {
                    console.error('[initializeScenarioScene] Image failed to load!');
                    console.error('[initializeScenarioScene] Failed path:', imagePath);
                    console.error('[initializeScenarioScene] Error event:', e);
                };

                // Add load handler to confirm success
                characterImg.onload = () => {
                    console.log('[initializeScenarioScene] ✓ Image loaded successfully!');
                    console.log('[initializeScenarioScene] ✓ Image dimensions:', characterImg.naturalWidth, 'x', characterImg.naturalHeight);
                };

                characterImg.src = imagePath;
                console.log('[initializeScenarioScene] Image src set to:', characterImg.src);
            } else {
                console.warn('[initializeScenarioScene] scenario_character image not found in CSV');
                console.warn('[initializeScenarioScene] Available images:', window.dataManager ? window.dataManager.images.size : 'DataManager not available');
            }
        } else {
            console.error('[initializeScenarioScene] Character img element NOT FOUND!');
        }
    }

    initializeTutorialScene() {
        console.log('[initializeTutorialScene] Loading tutorial text from CSV');

        if (!window.dataManager) {
            console.error('[initializeTutorialScene] DataManager not available');
            return;
        }

        // Load tutorial step texts from CSV
        for (let i = 1; i <= 4; i++) {
            const textId = `tutorial_step${i}`;
            const text = window.dataManager.getTextById(textId);
            const element = document.getElementById(`tutorial-step-${i}`);

            if (element && text) {
                element.textContent = text;
                console.log(`[initializeTutorialScene] Loaded ${textId}: ${text}`);
            } else {
                console.warn(`[initializeTutorialScene] Missing element or text for ${textId}`);
            }
        }
    }

    async initializeEnding1Scene() {
        console.log('[initializeEnding1Scene] Loading ending 1 text from CSV');

        if (!window.dataManager) {
            console.error('[initializeEnding1Scene] DataManager not available');
            return;
        }

        // Ensure data is loaded before retrieving text
        await window.dataManager.loadAll();
        console.log('[initializeEnding1Scene] Data loaded, text available:', window.dataManager.getText().length, 'entries');

        // Load ending 1 texts from CSV (2 lines)
        for (let i = 1; i <= 2; i++) {
            const textId = `ending1_line_${i}`;
            const text = window.dataManager.getTextById(textId);
            const element = document.getElementById(textId);

            if (element && text) {
                element.textContent = text;
                console.log(`[initializeEnding1Scene] Loaded ${textId}: ${text}`);
            } else {
                console.warn(`[initializeEnding1Scene] Missing element or text for ${textId}`);
            }
        }

        // Load button text
        const continueBtn = document.getElementById('ending1-continue-btn');
        if (continueBtn) {
            const btnText = window.dataManager.getTextById('ending1_continue');
            if (btnText) {
                continueBtn.textContent = btnText;
            }

            // Reset pointer-events to none and clear animation
            continueBtn.style.pointerEvents = 'none';
            continueBtn.style.animation = 'none';

            // Force reflow to restart animation
            void continueBtn.offsetWidth;
            continueBtn.style.animation = '';

            // Remove any existing event listeners by cloning and replacing the button
            const newBtn = continueBtn.cloneNode(true);
            continueBtn.parentNode.replaceChild(newBtn, continueBtn);

            // Add click event listener to the new button
            newBtn.addEventListener('click', () => {
                this.showScene('ending2');
            });

            // Add animationend listener to the new button
            newBtn.addEventListener('animationend', () => {
                newBtn.style.pointerEvents = 'auto';
                console.log('[initializeEnding1Scene] Button pointer-events enabled after animation');
            }, { once: true });
        }
    }

    async initializeEnding2Scene() {
        console.log('[initializeEnding2Scene] Loading ending 2 text from CSV');

        // Mark ending as viewed
        if (window.gameState) {
            window.gameState.markContentViewed('endings', 'ending');
        }

        if (!window.dataManager) {
            console.error('[initializeEnding2Scene] DataManager not available');
            return;
        }

        // Ensure data is loaded before retrieving text
        await window.dataManager.loadAll();
        console.log('[initializeEnding2Scene] Data loaded, text available:', window.dataManager.getText().length, 'entries');

        // Load ending 2 texts from CSV (5 lines)
        for (let i = 1; i <= 5; i++) {
            const textId = `ending2_line_${i}`;
            const text = window.dataManager.getTextById(textId);
            const element = document.getElementById(textId);

            if (element && text) {
                element.textContent = text;
                console.log(`[initializeEnding2Scene] Loaded ${textId}: ${text}`);
            } else {
                console.warn(`[initializeEnding2Scene] Missing element or text for ${textId}`);
            }
        }

        // Check if coming from album
        const isFromAlbum = this.previousScene === 'album';

        // Show/hide buttons based on source
        const gameBtn = document.getElementById('ending2-game-btn');
        const titleBtn = document.getElementById('ending2-title-btn');
        const backToAlbumBtn = document.getElementById('ending2-back-to-album-btn');

        if (isFromAlbum) {
            // From album: show only back to album button
            if (gameBtn) gameBtn.style.display = 'none';
            if (titleBtn) titleBtn.style.display = 'none';
            if (backToAlbumBtn) backToAlbumBtn.style.display = 'block';
        } else {
            // Normal game flow: show game and title buttons
            if (gameBtn) gameBtn.style.display = 'inline-block';
            if (titleBtn) titleBtn.style.display = 'inline-block';
            if (backToAlbumBtn) backToAlbumBtn.style.display = 'none';
        }

        // Load button text and setup animation listeners for game button
        if (gameBtn && !isFromAlbum) {
            // Reset pointer-events to none and clear animation
            gameBtn.style.pointerEvents = 'none';
            gameBtn.style.animation = 'none';

            // Force reflow to restart animation
            void gameBtn.offsetWidth;
            gameBtn.style.animation = '';

            // Remove any existing event listeners by cloning and replacing
            const newGameBtn = gameBtn.cloneNode(true);
            gameBtn.parentNode.replaceChild(newGameBtn, gameBtn);

            // Add click event listener to the new button
            newGameBtn.addEventListener('click', async () => {
                await this.handleTitleButtonClick();
                this.showScene('game');
            });

            // Add animationend listener to the new button
            newGameBtn.addEventListener('animationend', () => {
                newGameBtn.style.pointerEvents = 'auto';
                console.log('[initializeEnding2Scene] Game button pointer-events enabled after animation');
            }, { once: true });
        }

        // Setup title button
        if (titleBtn && !isFromAlbum) {
            const btnText = window.dataManager.getTextById('ending2_title');
            if (btnText) {
                titleBtn.textContent = btnText;
            }

            // Reset pointer-events to none and clear animation
            titleBtn.style.pointerEvents = 'none';
            titleBtn.style.animation = 'none';

            // Force reflow to restart animation
            void titleBtn.offsetWidth;
            titleBtn.style.animation = '';

            // Remove any existing event listeners by cloning and replacing
            const newTitleBtn = titleBtn.cloneNode(true);
            titleBtn.parentNode.replaceChild(newTitleBtn, titleBtn);

            // Add click event listener to the new button
            newTitleBtn.addEventListener('click', async () => {
                await this.handleTitleButtonClick();
                this.showScene('title');
            });

            // Add animationend listener to the new button
            newTitleBtn.addEventListener('animationend', () => {
                newTitleBtn.style.pointerEvents = 'auto';
                console.log('[initializeEnding2Scene] Title button pointer-events enabled after animation');
            }, { once: true });
        }

        // Setup back to album button
        if (backToAlbumBtn && isFromAlbum) {
            // Show button
            backToAlbumBtn.style.display = 'block';

            // Force immediate interactivity with maximum priority (same as scenario)
            backToAlbumBtn.style.setProperty('animation', 'none', 'important');
            backToAlbumBtn.style.setProperty('pointer-events', 'auto', 'important');
            backToAlbumBtn.style.setProperty('opacity', '1', 'important');

            console.log('[initializeEnding2Scene] Back to album button enabled immediately (no cloning)');
        }

        // Load character image
        const characterImg = document.getElementById('ending-character-img');
        if (characterImg) {
            console.log('[initializeEnding2Scene] Character img element found');

            const imageData = window.dataManager.getImage('ending_character');
            console.log('[initializeEnding2Scene] Image data from CSV:', imageData);

            if (imageData) {
                const imagePath = window.dataManager.getAssetPath(imageData.filename);
                console.log('[initializeEnding2Scene] Constructed image path:', imagePath);

                characterImg.onerror = (e) => {
                    console.error('[initializeEnding2Scene] Image failed to load:', imagePath);
                };

                characterImg.onload = () => {
                    console.log('[initializeEnding2Scene] ✓ Image loaded successfully!');
                };

                characterImg.src = imagePath;
                console.log('[initializeEnding2Scene] Image src set to:', characterImg.src);
            } else {
                console.warn('[initializeEnding2Scene] scenario_character image not found in CSV');
            }
        } else {
            console.error('[initializeEnding2Scene] Character img element NOT FOUND!');
        }
    }

    startTitleImageRotation() {
        // Clear any existing timer
        if (this.titleImageRotationTimer) {
            clearInterval(this.titleImageRotationTimer);
        }

        // Get stage 1 heroine images
        if (!window.dataManager) {
            console.warn('[DEBUG] DataManager not available for title image rotation');
            return;
        }

        const stage1Images = [];
        for (let i = 1; i <= 9; i++) {
            const paddedNum = String(i).padStart(2, '0');
            stage1Images.push(`images/heroines/stage1/heroine_1_${paddedNum}.png`);
        }

        if (stage1Images.length === 0) {
            console.warn('[DEBUG] No stage 1 images found for rotation');
            return;
        }

        const titleCharacterImg = document.querySelector('.title-character-image');
        if (!titleCharacterImg) {
            console.warn('[DEBUG] Title character image element not found');
            return;
        }

        const titleCharacterContainer = document.querySelector('.title-character');
        if (!titleCharacterContainer) {
            console.warn('[DEBUG] Title character container not found');
            return;
        }

        // Add mousemove handler for precise hover detection on original image area
        this.titleImageHoverHandler = (e) => {
            const rect = titleCharacterContainer.getBoundingClientRect();
            const mouseX = e.clientX;
            const mouseY = e.clientY;

            // Check if mouse is within original image container bounds (fixed 300x350px)
            if (mouseX >= rect.left && mouseX <= rect.right &&
                mouseY >= rect.top && mouseY <= rect.bottom) {
                titleCharacterImg.classList.add('zoomed');
            } else {
                titleCharacterImg.classList.remove('zoomed');
            }
        };

        document.addEventListener('mousemove', this.titleImageHoverHandler);

        let currentIndex = 0;
        let lastDisplayedIndex = -1; // Track last displayed image to prevent duplicates

        // Set initial image immediately
        const initialPath = window.dataManager.getAssetPath(stage1Images[0]);
        titleCharacterImg.src = initialPath;
        titleCharacterImg.style.opacity = '1';
        lastDisplayedIndex = 0;
        currentIndex = 1;

        // Change image every 2 seconds with cross-dissolve effect
        this.titleImageRotationTimer = setInterval(() => {
            // Make sure we don't show the same image twice in a row
            if (currentIndex === lastDisplayedIndex) {
                currentIndex = (currentIndex + 1) % stage1Images.length;
            }

            // Fade out
            titleCharacterImg.style.opacity = '0';

            // Wait for fade out, then change image and fade in
            setTimeout(() => {
                const imagePath = stage1Images[currentIndex];
                const fullPath = window.dataManager.getAssetPath(imagePath);
                titleCharacterImg.src = fullPath;
                console.log('[DEBUG] Rotated to image:', imagePath, '(previous:', lastDisplayedIndex, ')');

                // Fade in
                titleCharacterImg.style.opacity = '1';

                lastDisplayedIndex = currentIndex;
                currentIndex = (currentIndex + 1) % stage1Images.length;
            }, 800); // Wait for fade out animation (0.8s)
        }, 2000);

        console.log('[DEBUG] Title image rotation started with', stage1Images.length, 'images');
    }

    stopTitleImageRotation() {
        if (this.titleImageRotationTimer) {
            clearInterval(this.titleImageRotationTimer);
            this.titleImageRotationTimer = null;
            console.log('[DEBUG] Title image rotation stopped');
        }

        // Remove hover handler
        if (this.titleImageHoverHandler) {
            document.removeEventListener('mousemove', this.titleImageHoverHandler);
            this.titleImageHoverHandler = null;

            // Remove zoomed class if present
            const titleCharacterImg = document.querySelector('.title-character-image');
            if (titleCharacterImg) {
                titleCharacterImg.classList.remove('zoomed');
            }
        }
    }

    unlockAudioWithSilentPlay() {
        try {
            console.log('[DEBUG] Attempting silent audio unlock');

            // Create silent audio to unlock the context
            const silentAudio = new Audio();
            silentAudio.src = '../assets/se/click.mp3';
            silentAudio.volume = 0.01; // Very quiet
            silentAudio.muted = true;

            silentAudio.play().then(() => {
                console.log('[DEBUG] Silent audio unlock successful');
                silentAudio.muted = false;
                silentAudio.volume = 0;
            }).catch(error => {
                console.log('[DEBUG] Silent audio unlock failed:', error);
            });

        } catch (error) {
            console.log('[DEBUG] Silent unlock creation failed:', error);
        }
    }

    initializeGameScene() {
        console.log('[initializeGameScene] Initializing game scene');

        // Ensure current display image matches current stage
        const currentStage = window.gameState.get('gameProgress.currentStage');
        const currentDisplayImage = window.gameState.get('collection.currentDisplayImage');
        const firstHeroineId = `heroine_${currentStage}_01`;
        const stageCollection = window.gameState.get(`collection.heroine.stage${currentStage}`) || [];

        console.log('[initializeGameScene] currentStage:', currentStage);
        console.log('[initializeGameScene] currentDisplayImage:', currentDisplayImage);
        console.log('[initializeGameScene] stageCollection:', stageCollection);

        // If current display image doesn't match current stage, update it
        if (currentDisplayImage && !currentDisplayImage.startsWith(`heroine_${currentStage}_`)) {
            if (stageCollection.includes(firstHeroineId)) {
                console.log('[initializeGameScene] Updating currentDisplayImage to match stage:', firstHeroineId);
                window.gameState.set('collection.currentDisplayImage', firstHeroineId);
            }
        }

        // Update all game displays
        this.updateGameUI();
        this.updateStageUI();

        // Start idle point generation
        this.startIdleGeneration();

        // Update heroine display
        this.updateHeroineDisplay();

        // Check if shop needs refresh after save data load
        if (window.saveManager && window.saveManager.shopNeedsRefresh && window.shopSystem) {
            console.log('[initializeGameScene] Refreshing shop after save data load');
            window.shopSystem.refresh();
            window.saveManager.shopNeedsRefresh = false;
        }
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

        // Check if audio is muted
        const isMuted = this.isMuted || (window.audioManager && window.audioManager.isMuted);

        if (bgmSlider && settings) {
            if (isMuted) {
                // Show 0% when muted, but keep original value in slider for restoration
                bgmSlider.value = 0;
                document.getElementById('bgm-value').textContent = '0% (ミュート)';
            } else {
                bgmSlider.value = settings.bgmVolume * 100;
                document.getElementById('bgm-value').textContent = Math.round(settings.bgmVolume * 100) + '%';
            }
        }

        if (seSlider && settings) {
            if (isMuted) {
                // Show 0% when muted, but keep original value in slider for restoration
                seSlider.value = 0;
                document.getElementById('se-value').textContent = '0% (ミュート)';
            } else {
                seSlider.value = settings.seVolume * 100;
                document.getElementById('se-value').textContent = Math.round(settings.seVolume * 100) + '%';
            }
        }

        // Setup debug toggle to show/hide floating debug panel
        const debugToggle = document.getElementById('debug-toggle');
        const debugStatus = document.getElementById('debug-status');

        if (debugToggle && debugStatus) {
            // Set initial state
            const isDebugMode = window.gameState ? window.gameState.isDebugMode() : false;
            debugToggle.checked = isDebugMode;
            debugStatus.textContent = isDebugMode ? 'ON' : 'OFF';

            // Show debug panel if debug mode is on
            if (isDebugMode && window.debugPanelManager) {
                window.debugPanelManager.showPanel();
            }

            // Add change event listener
            debugToggle.addEventListener('change', (e) => {
                const enabled = e.target.checked;
                debugStatus.textContent = enabled ? 'ON' : 'OFF';

                if (enabled) {
                    // Enable debug mode and show panel
                    if (window.gameState) {
                        window.gameState.enableDebugMode();
                    }
                    if (window.debugPanelManager) {
                        window.debugPanelManager.showPanel();
                    }
                } else {
                    // Disable debug mode and hide panel
                    if (window.gameState) {
                        window.gameState.disableDebugMode();
                    }
                    if (window.debugPanelManager) {
                        window.debugPanelManager.hidePanel();
                    }
                }
            });
        }

        console.log('[DEBUG] Settings initialized - isMuted:', isMuted, 'settings:', settings);
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

            // Remove all state classes first
            tab.classList.remove('locked', 'unlocked', 'active');

            // Add appropriate class
            if (isActive) {
                tab.classList.add('active');
            } else if (isUnlocked) {
                tab.classList.add('unlocked');
            } else {
                tab.classList.add('locked');
            }

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
        console.log(`[switchToStageImmediate] Switching to stage ${stageId}`);

        window.gameState.set('gameProgress.currentStage', stageId);

        // Set current display image to first heroine of this stage
        const firstHeroineId = `heroine_${stageId}_01`;
        const stageCollection = window.gameState.get(`collection.heroine.stage${stageId}`) || [];

        console.log(`[switchToStageImmediate] Stage ${stageId} collection:`, stageCollection);

        if (stageCollection.includes(firstHeroineId)) {
            window.gameState.set('collection.currentDisplayImage', firstHeroineId);
            console.log(`[switchToStageImmediate] Set currentDisplayImage to:`, firstHeroineId);
        }

        this.updateStageUI();
        this.updateHeroineDisplay();

        // Update gacha display
        if (window.gachaSystem) {
            window.gachaSystem.setStage(stageId);
        }

        // Play stage switch sound
        if (window.audioManager && !this.isMuted && !window.audioManager.isMuted) {
            window.audioManager.playSE('stage_switch_sound');
        }

        // Switch BGM to new stage's BGM
        if (window.audioManager && !this.isMuted && !window.audioManager.isMuted) {
            const newBGMId = `game_bgm_stage${stageId}`;
            const currentBGMId = window.audioManager.currentBGMId;

            // Only crossfade if different BGM and audio is available
            if (currentBGMId !== newBGMId && window.audioManager.sounds.has(newBGMId)) {
                console.log(`[DEBUG] Stage switched to ${stageId} - crossfading to ${newBGMId}`);
                window.audioManager.crossFadeBGM(newBGMId, 7000); // 7 second crossfade
            }
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
        const currentDisplayImage = window.gameState.get('collection.currentDisplayImage');

        console.log('[DEBUG] updateHeroineDisplay - currentStage:', currentStage);
        console.log('[DEBUG] updateHeroineDisplay - unlockedHeroines:', unlockedHeroines);
        console.log('[DEBUG] updateHeroineDisplay - currentDisplayImage:', currentDisplayImage);

        if (unlockedHeroines.length > 0 && window.clickSystem) {
            let heroineToDisplay = null;

            // If currentDisplayImage is set and unlocked in current stage, use it
            if (currentDisplayImage && unlockedHeroines.includes(currentDisplayImage)) {
                // Try to get from dataManager first
                const imageData = window.dataManager.getImage(currentDisplayImage);
                if (imageData) {
                    heroineToDisplay = imageData;
                    console.log('[DEBUG] Using saved currentDisplayImage from CSV:', currentDisplayImage);
                } else {
                    // If not in CSV, generate from collection
                    const heroines = window.dataManager.getHeroineCollection(currentStage);
                    heroineToDisplay = heroines.find(h => h.id === currentDisplayImage);
                    console.log('[DEBUG] Using saved currentDisplayImage from generated list:', currentDisplayImage);
                }
            }

            // If no saved image or not unlocked in current stage, pick random and save
            if (!heroineToDisplay) {
                heroineToDisplay = window.dataManager.getRandomHeroine(currentStage);
                console.log('[DEBUG] Using random heroine:', heroineToDisplay);

                // Save the random selection as currentDisplayImage
                if (heroineToDisplay) {
                    window.gameState.set('collection.currentDisplayImage', heroineToDisplay.id);
                }
            }

            if (heroineToDisplay) {
                const imagePath = window.dataManager.getAssetPath(heroineToDisplay.filename);
                console.log('[DEBUG] updateHeroineDisplay - imagePath:', imagePath);
                window.clickSystem.setHeroineImage(imagePath);
            } else {
                console.warn('[DEBUG] updateHeroineDisplay - No heroine found!');
            }
        } else {
            console.warn('[DEBUG] updateHeroineDisplay - No unlocked heroines or clickSystem not ready');
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
        // Return to the scene that was active before settings
        if (this.currentScene === 'settings' && this.previousScene) {
            this.showScene(this.previousScene);
            this.previousScene = null; // Clear after use
        } else {
            // Fallback to title if no previous scene recorded
            this.showScene('title');
        }
    }

    async handleManualSave() {
        // Play click sound first
        if (window.audioManager) {
            window.audioManager.playSE('click_sound');
        }

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
        // Play click sound first
        if (window.audioManager) {
            window.audioManager.playSE('click_sound');
        }

        // Show confirmation dialog
        const confirmed = confirm('本当にセーブデータを削除しますか？\nこの操作は取り消せません。');

        if (!confirmed) {
            return;
        }

        try {
            console.log('SceneManager: Starting save deletion process...');

            // Save current audio settings before deletion
            const savedBGMVolume = window.audioManager ? window.audioManager.getBGMVolume() : 0.5;
            const savedSEVolume = window.audioManager ? window.audioManager.getSEVolume() : 0.5;
            console.log('SceneManager: Saved audio settings before deletion - BGM:', savedBGMVolume, 'SE:', savedSEVolume);

            if (window.saveManager) {
                const result = await window.saveManager.deleteSave();

                if (result.success) {
                    console.log('SceneManager: Save deletion successful, starting system refresh...');

                    // Stop all BGM during system refresh
                    if (window.audioManager) {
                        window.audioManager.stopBGM();
                    }

                    // Set flag to skip BGM during system refresh
                    this.skipBGMDuringRefresh = true;

                    // Force complete system refresh without reload
                    await this.completeSystemRefresh();

                    // Restore audio settings after system refresh
                    if (window.audioManager) {
                        window.audioManager.setBGMVolume(savedBGMVolume);
                        window.audioManager.setSEVolume(savedSEVolume);
                        console.log('SceneManager: Restored audio settings - BGM:', savedBGMVolume, 'SE:', savedSEVolume);
                    }

                    // Reset firstRun flag to show scenario on next game start
                    this.firstRun = true;
                    console.log('SceneManager: Reset firstRun flag to true for scenario replay');

                    // After deletion, return to title screen but keep BGM muted
                    this.showScene('title');
                    this.previousScene = null; // Clear previous scene tracking

                    // Show completion dialog first
                    alert('セーブデータを削除しました。');

                    // Clear skip flag and start title BGM after dialog is closed
                    this.skipBGMDuringRefresh = false;
                    if (window.audioManager && !this.isMuted) {
                        window.audioManager.playBGM('title_bgm');
                    }
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

    async quitGame() {
        console.log('[DEBUG] Quit game called');

        // Check if audio is muted
        if (this.isMuted || (window.audioManager && window.audioManager.isMuted)) {
            console.log('[DEBUG] Audio is muted - quitting without sound');
            // Quit immediately without sound
            if (window.electronAPI) {
                window.close();
            } else {
                this.showMessage('ゲームを終了します');
            }
            return;
        }

        // Only play sound if audio is enabled
        if (!this.audioContextInitialized) {
            console.log('[DEBUG] Audio not initialized - quitting without sound');
            // Quit immediately without sound
            if (window.electronAPI) {
                window.close();
            } else {
                this.showMessage('ゲームを終了します');
            }
            return;
        }

        // Try to play quit sound through AudioManager first
        try {
            if (window.audioManager && window.audioManager.sounds.has('button_click')) {
                window.audioManager.playSE('button_click');
                console.log('[DEBUG] Quit sound played via AudioManager');

                // Wait for sound to finish
                setTimeout(() => {
                    if (window.electronAPI) {
                        window.close();
                    } else {
                        this.showMessage('ゲームを終了します');
                    }
                }, 300);
            } else {
                // No audio manager available, quit immediately
                if (window.electronAPI) {
                    window.close();
                } else {
                    this.showMessage('ゲームを終了します');
                }
            }
        } catch (error) {
            console.log('[DEBUG] Quit audio failed:', error);
            // Quit immediately on error
            if (window.electronAPI) {
                window.close();
            } else {
                this.showMessage('ゲームを終了します');
            }
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