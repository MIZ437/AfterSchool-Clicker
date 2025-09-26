// AfterSchool Clicker - Audio Manager
class AudioManager {
    constructor() {
        this.bgmVolume = 0.7;
        this.seVolume = 0.8;
        this.currentBGM = null;
        this.audioContext = null;
        this.sounds = new Map();
        this.isInitialized = false;
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
            audio.src = `../assets/audio/${filename}`;
            audio.preload = 'auto';

            return new Promise((resolve, reject) => {
                audio.addEventListener('canplaythrough', () => {
                    this.sounds.set(id, audio);
                    resolve(audio);
                });

                audio.addEventListener('error', (e) => {
                    console.warn(`Failed to load audio: ${filename}`, e);
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
        if (!window.dataManager) return;

        try {
            const audioData = window.dataManager.getAudio();

            const loadPromises = audioData.map(async (audio) => {
                await this.loadSound(audio.id, audio.filename);
            });

            await Promise.all(loadPromises);
            console.log('Audio preloading completed');
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
        if (!this.isInitialized) return;

        const audio = this.sounds.get(id);
        if (audio) {
            // Clone audio for multiple simultaneous plays
            const audioClone = audio.cloneNode();
            audioClone.volume = this.seVolume;
            audioClone.currentTime = 0;

            const playPromise = audioClone.play();
            if (playPromise) {
                playPromise.catch(error => {
                    console.warn('SE play failed:', error);
                });
            }
        } else {
            // Create a simple beep if sound not found
            this.playBeep();
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
        // Add hover sounds to buttons
        const buttons = document.querySelectorAll('button');
        buttons.forEach(button => {
            button.addEventListener('mouseenter', () => {
                // this.playSE('button_hover');
            });

            button.addEventListener('click', () => {
                this.playSE('button_click');
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

// Initialize audio manager
document.addEventListener('DOMContentLoaded', () => {
    window.audioManager = new AudioManager();

    // Load settings and setup UI handlers
    setTimeout(() => {
        if (window.audioManager) {
            window.audioManager.loadSettings();
            window.audioManager.setupUIAudioHandlers();
        }
    }, 1000);
});