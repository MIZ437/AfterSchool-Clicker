// AfterSchool Clicker - Audio Manager
class AudioManager {
    constructor() {
        console.log('AudioManager constructor called');
        this.bgmVolume = 0.7;
        this.seVolume = 0.8;
        this.currentBGM = null;
        this.currentBGMId = null;
        this.audioContext = null;
        this.sounds = new Map();
        this.isInitialized = false;
        this.uiHandlersSetup = false;
        this.lastPlayTime = new Map(); // Track last play time for each sound
        this.isMuted = false; // Global mute state
        this.fadeTimers = { timeout: null, interval: null }; // Track fade timers
        console.log('AudioManager constructor completed, calling setupAudio');
        this.setupAudio();
    }

    async setupAudio() {
        try {
            // Initialize audio context (requires user interaction)
            document.addEventListener('click', () => this.initializeAudioContext(), { once: true });
            document.addEventListener('keydown', () => this.initializeAudioContext(), { once: true });
        } catch (error) {
            console.error('Audio setup failed:', error);
        }
    }

    async initializeAudioContext() {
        if (this.isInitialized) return;

        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.isInitialized = true;
            console.log('Audio context initialized');
        } catch (error) {
            console.error('Audio context initialization failed:', error);
        }
    }

    async loadSound(id, filename) {
        try {
            // Skip loading if filename is empty (silent BGM)
            if (!filename || filename.trim() === '') {
                console.log(`[DEBUG] Skipping load for ${id} - empty filename (silent)`);
                return null;
            }

            const audio = new Audio();
            const fullPath = `../assets/${filename}`;
            audio.src = fullPath;
            audio.preload = 'auto';
            console.log(`[DEBUG] Loading sound ${id} from path: ${fullPath}`);
            console.log(`[DEBUG] Audio element created for ${id}:`, audio);

            return new Promise((resolve, reject) => {
                audio.addEventListener('canplaythrough', () => {
                    console.log(`Audio ${id} loaded successfully, adding to sounds map`);
                    this.sounds.set(id, audio);
                    resolve(audio);
                });

                audio.addEventListener('error', (e) => {
                    console.warn(`Failed to load audio: ${filename} (${fullPath})`, e);
                    resolve(null); // Don't reject, just resolve with null
                });

                audio.load();
            });
        } catch (error) {
            console.warn(`Audio loading error for ${filename}:`, error);
            return null;
        }
    }

    async preloadAudio() {
        console.log('PreloadAudio called');
        if (!window.dataManager) {
            console.error('DataManager not available for audio preloading');
            return;
        }

        try {
            // Ensure data is loaded first
            await window.dataManager.loadAll();

            const audioData = window.dataManager.getAudio();
            console.log('Audio data loaded:', audioData.length, 'items');
            console.log('Available audio IDs:', audioData.map(a => a.id));

            const loadPromises = audioData.map(async (audio) => {
                console.log(`Loading audio: ${audio.id} -> ${audio.filename}`);
                const result = await this.loadSound(audio.id, audio.filename);
                console.log(`Load result for ${audio.id}:`, result ? 'SUCCESS' : 'FAILED');
                return result;
            });

            const results = await Promise.all(loadPromises);
            console.log('Audio preloading completed');
            console.log('Loaded sounds:', Array.from(this.sounds.keys()));
            console.log('Total sounds in Map:', this.sounds.size);
            console.log('Load results:', results.filter(r => r !== null).length, 'successful,', results.filter(r => r === null).length, 'failed');
        } catch (error) {
            console.error('Audio preloading failed:', error);
        }
    }

    playBGM(id, loop = true) {
        console.log(`[DEBUG] playBGM called with ID: ${id}`);
        console.log(`[DEBUG] AudioManager initialized: ${this.isInitialized}`);
        console.log(`[DEBUG] AudioManager muted: ${this.isMuted}`);

        if (!this.isInitialized) {
            console.warn(`[DEBUG] AudioManager not initialized, skipping BGM ${id}`);
            return;
        }

        // Check if muted
        if (this.isMuted) {
            console.log(`[DEBUG] Skipping BGM ${id} - audio is muted`);
            return;
        }

        // Clear any ongoing fade timers
        this.clearFadeTimers();

        // Stop current BGM
        if (this.currentBGM) {
            console.log(`[DEBUG] Stopping current BGM`);
            this.currentBGM.pause();
            this.currentBGM.currentTime = 0;
        }

        const audio = this.sounds.get(id);
        console.log(`[DEBUG] Audio element for ${id}:`, !!audio);

        if (audio) {
            // Get individual volume from CSV data
            const individualVolume = this.getIndividualVolume(id);
            const finalVolume = this.bgmVolume * individualVolume;
            console.log(`[DEBUG] Setting volume for ${id}: ${finalVolume} (bgm: ${this.bgmVolume} * individual: ${individualVolume})`);

            audio.volume = finalVolume;
            audio.loop = loop;
            audio.currentTime = 0;

            console.log(`[DEBUG] Attempting to play ${id}...`);
            const playPromise = audio.play();
            if (playPromise) {
                playPromise.then(() => {
                    console.log(`[DEBUG] Successfully started playing ${id}`);
                }).catch(error => {
                    console.warn(`[DEBUG] BGM play failed for ${id}:`, error);
                });
            }

            this.currentBGM = audio;
            this.currentBGMId = id;
        } else {
            console.log(`[DEBUG] BGM not found in sounds map: ${id} (likely silent BGM)`);
            console.log(`[DEBUG] Available sounds:`, Array.from(this.sounds.keys()));
            // Simply stop current BGM if trying to play a silent BGM
            if (this.currentBGM) {
                console.log(`[DEBUG] Stopping current BGM for silent BGM: ${id}`);
                this.currentBGM.pause();
                this.currentBGM.currentTime = 0;
                this.currentBGM = null;
                this.currentBGMId = null;
            }
        }
    }

    stopBGM() {
        // Clear any ongoing fade timers
        this.clearFadeTimers();

        if (this.currentBGM) {
            this.currentBGM.pause();
            this.currentBGM.currentTime = 0;
            this.currentBGM = null;
            this.currentBGMId = null;
        }
    }

    async fadeOutBGM(duration = 1000) {
        return new Promise((resolve) => {
            if (!this.currentBGM) {
                resolve();
                return;
            }

            const audio = this.currentBGM;
            const startVolume = audio.volume;
            const fadeStep = startVolume / (duration / 50); // 50ms intervals

            console.log(`[DEBUG] Starting BGM fade out: ${startVolume} -> 0 over ${duration}ms`);

            const fadeInterval = setInterval(() => {
                if (audio.volume > fadeStep) {
                    audio.volume = Math.max(0, audio.volume - fadeStep);
                } else {
                    // Fade complete
                    audio.volume = 0;
                    audio.pause();
                    audio.currentTime = 0;
                    clearInterval(fadeInterval);

                    // Clear current BGM references
                    this.currentBGM = null;
                    this.currentBGMId = null;

                    console.log(`[DEBUG] BGM fade out completed`);
                    resolve();
                }
            }, 50);
        });
    }

    fadeInBGM(id, duration = 3000, loop = true, silentDelay = 500) {
        console.log(`[DEBUG] fadeInBGM called with ID: ${id}, duration: ${duration}ms, silent delay: ${silentDelay}ms`);

        if (!this.isInitialized) {
            console.warn(`[DEBUG] AudioManager not initialized, skipping fade in for ${id}`);
            return;
        }

        if (this.isMuted) {
            console.log(`[DEBUG] AudioManager is muted, skipping fade in for ${id}`);
            return;
        }

        // Clear any ongoing fade timers
        this.clearFadeTimers();

        // Stop current BGM
        if (this.currentBGM) {
            console.log(`[DEBUG] Stopping current BGM for fade in`);
            this.currentBGM.pause();
            this.currentBGM.currentTime = 0;
        }

        const audio = this.sounds.get(id);
        if (!audio) {
            console.log(`[DEBUG] BGM not found: ${id}`);
            return;
        }

        // Get target volume
        const individualVolume = this.getIndividualVolume(id);
        const targetVolume = this.bgmVolume * individualVolume;

        console.log(`[DEBUG] Target volume for ${id}: ${targetVolume}`);

        // Start at volume 0
        audio.volume = 0;
        audio.loop = loop;
        audio.currentTime = 0;

        // Start playing
        const playPromise = audio.play();
        if (playPromise) {
            playPromise.then(() => {
                console.log(`[DEBUG] Started fade in for ${id}`);
            }).catch(error => {
                console.warn(`[DEBUG] Fade in play failed for ${id}:`, error);
            });
        }

        this.currentBGM = audio;
        this.currentBGMId = id;

        // Wait for silent delay, then fade in gradually (non-blocking)
        console.log(`[DEBUG] Waiting ${silentDelay}ms before starting fade in`);
        this.fadeTimers.timeout = setTimeout(() => {
            console.log(`[DEBUG] Starting fade in after silent period`);
            const fadeStep = targetVolume / (duration / 50); // 50ms intervals
            this.fadeTimers.interval = setInterval(() => {
                if (audio.volume < targetVolume - fadeStep) {
                    audio.volume = Math.min(targetVolume, audio.volume + fadeStep);
                } else {
                    // Fade complete
                    audio.volume = targetVolume;
                    clearInterval(this.fadeTimers.interval);
                    this.fadeTimers.interval = null;
                    console.log(`[DEBUG] Fade in completed for ${id} at volume ${targetVolume}`);
                }
            }, 50);
        }, silentDelay);
    }

    clearFadeTimers() {
        if (this.fadeTimers.timeout) {
            console.log(`[DEBUG] Clearing fade timeout`);
            clearTimeout(this.fadeTimers.timeout);
            this.fadeTimers.timeout = null;
        }
        if (this.fadeTimers.interval) {
            console.log(`[DEBUG] Clearing fade interval`);
            clearInterval(this.fadeTimers.interval);
            this.fadeTimers.interval = null;
        }
    }

    setMuted(muted) {
        console.log('[DEBUG] AudioManager setMuted called with:', muted);
        this.isMuted = muted;

        // Stop current BGM if muting
        if (muted && this.currentBGM) {
            this.stopBGM();
        }
    }

    async playSE(id) {
        console.log(`[DEBUG] playSE called with id: ${id}`);

        // Check if muted
        if (this.isMuted) {
            console.log(`[DEBUG] Skipping ${id} - audio is muted`);
            return;
        }

        // Prevent rapid duplicate sounds (within 100ms)
        const now = Date.now();
        const lastPlayed = this.lastPlayTime.get(id) || 0;
        const timeSince = now - lastPlayed;

        if (timeSince < 100) {
            console.log(`[DEBUG] Skipping ${id} - too soon after last play (${timeSince}ms)`);
            return;
        }

        this.lastPlayTime.set(id, now);

        // Force load sounds if not loaded
        if (this.sounds.size === 0) {
            console.log(`[DEBUG] No sounds loaded, calling loadSoundsSync()`);
            await this.loadSoundsSync();
        }

        // Initialize audio context on first user interaction
        if (!this.isInitialized) {
            this.initializeAudioContext();
        }

        const audio = this.sounds.get(id);
        if (audio) {
            try {
                // Reset audio instead of cloning for better performance
                audio.currentTime = 0;

                // Get individual volume from CSV data
                const individualVolume = this.getIndividualVolume(id);
                const finalVolume = this.seVolume * individualVolume;

                // Volume calculation (reduced logging for performance)
                // console.log(`[DEBUG] Volume calculation for ${id}: ${finalVolume}`);

                audio.volume = finalVolume;

                const playPromise = audio.play();
                if (playPromise) {
                    playPromise.catch(error => {
                        console.warn('SE play failed:', error);
                        // Fallback to beep if file play fails
                        this.playBeep();
                    });
                }
            } catch (error) {
                console.warn('Audio play failed:', error);
                this.playBeep();
            }
        } else {
            console.warn(`SE not found: ${id}, playing beep instead`);
            console.log(`[DEBUG] Available sounds in map:`, Array.from(this.sounds.keys()));
            console.log(`[DEBUG] Total sounds loaded:`, this.sounds.size);
            // Create a simple beep if sound not found
            this.playBeep();
        }
    }

    playClickBeep() {
        if (!this.audioContext) {
            this.initializeAudioContext();
        }

        if (!this.audioContext) return;

        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            // Higher pitched, shorter sound for clicks
            oscillator.frequency.setValueAtTime(1200, this.audioContext.currentTime);
            gainNode.gain.setValueAtTime(this.seVolume * 0.1, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.05);

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.05);
        } catch (error) {
            console.warn('Click beep generation failed:', error);
        }
    }

    async loadSoundsSync() {
        console.log(`[DEBUG] loadSoundsSync called`);

        // Ensure DataManager is loaded
        if (window.dataManager) {
            if (!window.dataManager.isLoaded()) {
                console.log(`[DEBUG] DataManager not loaded, forcing load...`);
                await window.dataManager.loadAll();
            }

            // Force reload if audio data is null/empty
            const currentAudioData = window.dataManager.getAudio();
            if (!currentAudioData || currentAudioData.length === 0) {
                console.log(`[DEBUG] Audio data is null/empty, forcing DataManager reload...`);
                await window.dataManager.reload();
            }
        }

        // Try to use CSV data first
        if (window.dataManager && window.dataManager.isLoaded()) {
            console.log(`[DEBUG] Using CSV data for sound loading`);
            console.log(`[DEBUG] DataManager loaded status:`, window.dataManager.isLoaded());
            console.log(`[DEBUG] DataManager data:`, window.dataManager.data);
            console.log(`[DEBUG] DataManager audio data:`, window.dataManager.data.audio);

            const audioData = window.dataManager.getAudio();
            console.log(`[DEBUG] audioData content:`, audioData);
            console.log(`[DEBUG] audioData length:`, audioData.length);
            console.log(`[DEBUG] audioData type:`, typeof audioData);

            audioData.forEach((audioItem, index) => {
                console.log(`[DEBUG] Processing item ${index}:`, audioItem);
                console.log(`[DEBUG] Item id: ${audioItem.id}, has in sounds: ${this.sounds.has(audioItem.id)}`);

                if (!this.sounds.has(audioItem.id)) {
                    console.log(`[DEBUG] Will load ${audioItem.id}`);
                    try {
                        const audio = new Audio();
                        const fullPath = `../assets/${audioItem.filename}`;
                        audio.src = fullPath;
                        audio.preload = 'auto';
                        console.log(`[DEBUG] Attempting to load: ${audioItem.id} from path: ${fullPath}`);

                        audio.addEventListener('loadstart', () => {
                            console.log(`[DEBUG] Load started for ${audioItem.id}`);
                        });

                        audio.addEventListener('canplaythrough', () => {
                            console.log(`[DEBUG] Successfully loaded ${audioItem.id}`);
                            this.sounds.set(audioItem.id, audio);
                        });

                        audio.addEventListener('error', (e) => {
                            console.warn(`[DEBUG] Failed to load ${audioItem.id} from ${fullPath}:`, e);
                        });

                        audio.load();
                    } catch (error) {
                        console.warn(`Failed to load ${audioItem.id}:`, error);
                    }
                } else {
                    console.log(`[DEBUG] Skipping ${audioItem.id} (already loaded)`);
                }
            });
        } else {
            console.log(`[DEBUG] CSV data not available, using fallback sounds`);
            // Fallback to essential sounds
            const essentialSounds = [
                { id: 'click_sound', path: '../assets/se/click.mp3' },
                { id: 'purchase_sound', path: '../assets/se/purchase.mp3' },
                { id: 'stage_unlock_sound', path: '../assets/se/fanfare.mp3' },
                { id: 'button_click', path: '../assets/se/button_click.wav' }
            ];

            essentialSounds.forEach(sound => {
                if (!this.sounds.has(sound.id)) {
                    try {
                        const audio = new Audio();
                        audio.src = sound.path;
                        audio.preload = 'auto';
                        this.sounds.set(sound.id, audio);
                        console.log(`[DEBUG] Loaded fallback sound: ${sound.id}`);
                    } catch (error) {
                        console.warn(`Failed to load ${sound.id}:`, error);
                    }
                }
            });
        }
    }

    playBeep() {
        if (!this.audioContext) return;

        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
            gainNode.gain.setValueAtTime(this.seVolume * 0.1, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.1);
        } catch (error) {
            console.warn('Beep generation failed:', error);
        }
    }

    // Get individual volume setting from CSV data
    getIndividualVolume(audioId) {
        console.log(`[DEBUG] getIndividualVolume called for: ${audioId}`);

        if (!window.dataManager) {
            console.warn('[DEBUG] DataManager not available for volume lookup');
            return 1.0; // Default volume multiplier
        }

        // Check if data is loaded
        if (!window.dataManager.isLoaded()) {
            console.warn('[DEBUG] DataManager data not loaded yet, using default volume');
            return 1.0;
        }

        try {
            const audioData = window.dataManager.getAudio();
            console.log(`[DEBUG] Audio data from DataManager:`, audioData);

            if (!audioData || audioData.length === 0) {
                console.warn('[DEBUG] No audio data available, using default volume');
                return 1.0;
            }

            console.log(`[DEBUG] Searching for audioId: ${audioId} in ${audioData.length} items`);
            const audioItem = audioData.find(item => {
                console.log(`[DEBUG] Checking item: ${item.id} === ${audioId}?`);
                return item.id === audioId;
            });

            console.log(`[DEBUG] Found audio item:`, audioItem);

            if (audioItem && audioItem.volume !== undefined) {
                const volume = parseFloat(audioItem.volume);
                console.log(`[DEBUG] Individual volume for ${audioId}: ${volume} (original: ${audioItem.volume})`);
                return isNaN(volume) ? 1.0 : volume;
            } else {
                console.warn(`[DEBUG] Audio item not found for ${audioId}, using default volume`);
            }
        } catch (error) {
            console.warn(`[DEBUG] Failed to get individual volume for ${audioId}:`, error);
        }

        console.log(`[DEBUG] Returning default volume 1.0 for ${audioId}`);
        return 1.0; // Default volume multiplier if not found
    }

    setBGMVolume(volume) {
        this.bgmVolume = Math.max(0, Math.min(1, volume));

        if (this.currentBGM) {
            this.currentBGM.volume = this.bgmVolume;
        }

        // Save to game state
        if (window.gameState) {
            window.gameState.set('settings.bgmVolume', this.bgmVolume);
        }
    }

    setSEVolume(volume) {
        this.seVolume = Math.max(0, Math.min(1, volume));

        // Save to game state
        if (window.gameState) {
            window.gameState.set('settings.seVolume', this.seVolume);
        }
    }

    getBGMVolume() {
        return this.bgmVolume;
    }

    getSEVolume() {
        return this.seVolume;
    }

    muteAll() {
        this.setBGMVolume(0);
        this.setSEVolume(0);
    }

    unmuteAll() {
        this.setBGMVolume(0.7);
        this.setSEVolume(0.8);
    }

    // Scene-specific audio management
    playSceneBGM(sceneName) {
        const bgmMap = {
            'title': 'title_bgm',
            'tutorial': 'tutorial_bgm',
            'game': 'game_bgm_stage1',
            'album': 'album_bgm',
            'settings': 'settings_bgm'
        };

        const bgmId = bgmMap[sceneName];
        if (bgmId) {
            this.playBGM(bgmId);
        }
    }

    playStageBackground(stageId) {
        const bgmId = `game_bgm_stage${stageId}`;
        this.playBGM(bgmId);
    }

    // Load settings from game state
    loadSettings() {
        if (window.gameState) {
            const settings = window.gameState.get('settings');
            if (settings) {
                this.bgmVolume = settings.bgmVolume || 0.7;
                this.seVolume = settings.seVolume || 0.8;
            }
        }
    }

    // Audio event handlers for UI
    setupUIAudioHandlers() {
        // Prevent multiple setup calls
        if (this.uiHandlersSetup) {
            console.log('[DEBUG] UI handlers already setup, skipping');
            return;
        }

        console.log('[DEBUG] Setting up UI audio handlers with event delegation');

        // Use event delegation for better performance and automatic handling of dynamic elements
        this.handleUIClick = this.handleUIClick.bind(this);
        this.handleUIChange = this.handleUIChange.bind(this);

        document.addEventListener('click', this.handleUIClick);
        document.addEventListener('change', this.handleUIChange);

        this.uiHandlersSetup = true;

        // Add volume slider handlers
        const bgmSlider = document.getElementById('bgm-volume');
        const seSlider = document.getElementById('se-volume');

        if (bgmSlider) {
            bgmSlider.addEventListener('input', (e) => {
                const volume = e.target.value / 100;

                // If user adjusts volume and it's not zero, unmute
                if (volume > 0 && this.isMuted) {
                    console.log('[DEBUG] User adjusted BGM volume, unmuting audio');
                    this.setMuted(false);
                    // Also notify sceneManager
                    if (window.sceneManager) {
                        window.sceneManager.isMuted = false;
                    }
                }

                this.setBGMVolume(volume);
                document.getElementById('bgm-value').textContent = e.target.value + '%';

                // Real-time BGM volume feedback
                if (this.currentBGM && !this.isMuted) {
                    // Use a reasonable default individual volume if ID is unknown
                    let individualVolume = 0.7; // Default volume
                    try {
                        // Try to get individual volume, but fallback to default if failed
                        individualVolume = this.getIndividualVolume('title_bgm');
                    } catch (error) {
                        console.warn('[DEBUG] Could not get individual volume, using default:', error);
                    }

                    this.currentBGM.volume = volume * individualVolume;
                    console.log('[DEBUG] BGM volume updated in real-time:', this.currentBGM.volume);
                }
            });
        }

        if (seSlider) {
            // Add throttling for SE feedback to avoid spam
            let seSliderTimeout = null;

            seSlider.addEventListener('input', (e) => {
                const volume = e.target.value / 100;

                // If user adjusts volume and it's not zero, unmute
                if (volume > 0 && this.isMuted) {
                    console.log('[DEBUG] User adjusted SE volume, unmuting audio');
                    this.setMuted(false);
                    // Also notify sceneManager
                    if (window.sceneManager) {
                        window.sceneManager.isMuted = false;
                    }
                }

                this.setSEVolume(volume);
                document.getElementById('se-value').textContent = e.target.value + '%';

                // Real-time SE feedback with throttling
                if (!this.isMuted && volume > 0) {
                    // Clear previous timeout
                    if (seSliderTimeout) {
                        clearTimeout(seSliderTimeout);
                    }

                    // Set new timeout for SE playback (throttled to avoid spam)
                    seSliderTimeout = setTimeout(() => {
                        this.playSE('click_sound');
                        console.log('[DEBUG] SE feedback played for volume:', volume);
                    }, 150); // 150ms throttle
                }
            });
        }
    }

    // Check audio support
    isAudioSupported() {
        return !!(window.Audio && window.AudioContext);
    }

    // Get audio status
    getAudioStatus() {
        return {
            initialized: this.isInitialized,
            supported: this.isAudioSupported(),
            bgmVolume: this.bgmVolume,
            seVolume: this.seVolume,
            currentBGM: this.currentBGM ? 'playing' : 'stopped',
            loadedSounds: this.sounds.size
        };
    }

    // Event delegation handler for button clicks
    handleUIClick(event) {
        const target = event.target;

        // Only handle button clicks
        if (target.tagName !== 'BUTTON') return;

        // Skip audio for buttons that handle their own audio or have special handling
        const skipAudioButtons = [
            'start-game-btn',      // Handles own audio in sceneManager
            'settings-btn',        // Handles own audio in sceneManager
            'quit-btn',           // Handles own audio in sceneManager
            'game-quit-btn',      // Handles own audio in sceneManager
            'audio-enable-btn',   // Special overlay button
            'audio-disable-btn'   // Special overlay button
        ];

        // Check for exact matches or class matches for specific buttons
        const shouldSkip = skipAudioButtons.includes(target.id) ||
                         target.classList.contains('buy-btn') || // Exclude buy buttons as they play purchase sound
                         target.classList.contains('purchase-btn') ||
                         target.classList.contains('stage-tab'); // Exclude stage buttons as they have special handling

        // Additional debug info
        if (target.id) {
            console.log('[DEBUG] Button check:', target.id, 'shouldSkip:', shouldSkip);
        }

        if (!shouldSkip) {
            console.log('[DEBUG] Playing click_sound via event delegation for button:', target.id || target.className);
            this.playSE('click_sound');
        } else {
            console.log('[DEBUG] Skipped audio for button:', target.id || target.className, 'Reason: in skip list');
        }
    }

    // Event delegation handler for input changes (toggles)
    handleUIChange(event) {
        const target = event.target;

        // Only handle checkbox inputs (toggle switches)
        if (target.tagName === 'INPUT' && target.type === 'checkbox') {
            console.log('[DEBUG] Playing click_sound for toggle input via event delegation:', target.id);
            this.playSE('click_sound');
        }
    }

    // Cleanup method for removing event listeners
    removeUIAudioHandlers() {
        if (this.uiHandlersSetup && this.handleUIClick && this.handleUIChange) {
            document.removeEventListener('click', this.handleUIClick);
            document.removeEventListener('change', this.handleUIChange);
            this.uiHandlersSetup = false;
            console.log('[DEBUG] UI audio handlers removed');
        }
    }
}

// Initialize audio manager immediately
console.log('AudioManager script loaded, initializing immediately');
try {
    window.audioManager = new AudioManager();
    console.log('AudioManager created and attached to window');
    console.log('AudioManager verification:', !!window.audioManager);
} catch (error) {
    console.error('Failed to create AudioManager:', error);
}

// Also initialize on DOMContentLoaded as backup
document.addEventListener('DOMContentLoaded', () => {
    console.log('AudioManager DOMContentLoaded event fired');
    if (!window.audioManager) {
        console.log('AudioManager not found, creating new one');
        window.audioManager = new AudioManager();
    } else {
        console.log('AudioManager already exists');
    }

    // Load settings and setup UI handlers
    setTimeout(() => {
        if (window.audioManager) {
            window.audioManager.loadSettings();
            window.audioManager.setupUIAudioHandlers();
        }
    }, 1000);
});