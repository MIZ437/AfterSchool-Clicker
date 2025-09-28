// AfterSchool Clicker - Audio Manager
class AudioManager {
    constructor() {
        console.log('AudioManager constructor called');
        this.bgmVolume = 0.7;
        this.seVolume = 0.8;
        this.currentBGM = null;
        this.audioContext = null;
        this.sounds = new Map();
        this.isInitialized = false;
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
            const audio = new Audio();
            const fullPath = `../assets/${filename}`;
            audio.src = fullPath;
            audio.preload = 'auto';
            console.log(`Loading sound ${id} from path: ${fullPath}`);

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
        if (!this.isInitialized) return;

        // Stop current BGM
        if (this.currentBGM) {
            this.currentBGM.pause();
            this.currentBGM.currentTime = 0;
        }

        const audio = this.sounds.get(id);
        if (audio) {
            audio.volume = this.bgmVolume;
            audio.loop = loop;
            audio.currentTime = 0;

            const playPromise = audio.play();
            if (playPromise) {
                playPromise.catch(error => {
                    console.warn('BGM play failed:', error);
                });
            }

            this.currentBGM = audio;
        } else {
            console.warn(`BGM not found: ${id}`);
        }
    }

    stopBGM() {
        if (this.currentBGM) {
            this.currentBGM.pause();
            this.currentBGM.currentTime = 0;
            this.currentBGM = null;
        }
    }

    playSE(id) {
        // Force load sounds if not loaded
        if (this.sounds.size === 0) {
            this.loadSoundsSync();
        }

        // Initialize audio context on first user interaction
        if (!this.isInitialized) {
            this.initializeAudioContext();
        }

        const audio = this.sounds.get(id);
        if (audio) {
            try {
                // Clone audio for multiple simultaneous plays
                const audioClone = audio.cloneNode();
                audioClone.volume = this.seVolume;
                audioClone.currentTime = 0;

                const playPromise = audioClone.play();
                if (playPromise) {
                    playPromise.catch(error => {
                        console.warn('SE play failed:', error);
                        // Fallback to beep if file play fails
                        this.playBeep();
                    });
                }
            } catch (error) {
                console.warn('Audio clone failed:', error);
                this.playBeep();
            }
        } else {
            console.warn(`SE not found: ${id}, playing beep instead`);
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

    loadSoundsSync() {
        // Load essential sounds immediately
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
                } catch (error) {
                    console.warn(`Failed to load ${sound.id}:`, error);
                }
            }
        });
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
        // Add click sounds to all buttons
        const buttons = document.querySelectorAll('button');
        buttons.forEach(button => {
            button.addEventListener('click', () => {
                // Skip audio for purchase buttons (they have their own audio)
                if (!button.id.includes('purchase') && !button.classList.contains('purchase-btn')) {
                    this.playSE('click_sound');
                }
            });
        });

        // Add volume slider handlers
        const bgmSlider = document.getElementById('bgm-volume');
        const seSlider = document.getElementById('se-volume');

        if (bgmSlider) {
            bgmSlider.addEventListener('input', (e) => {
                const volume = e.target.value / 100;
                this.setBGMVolume(volume);
                document.getElementById('bgm-value').textContent = e.target.value + '%';
            });
        }

        if (seSlider) {
            seSlider.addEventListener('input', (e) => {
                const volume = e.target.value / 100;
                this.setSEVolume(volume);
                document.getElementById('se-value').textContent = e.target.value + '%';
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