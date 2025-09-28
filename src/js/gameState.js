// AfterSchool Clicker - Game State Management
class GameState {
    constructor() {
        this.state = {
            version: "1.0.0",
            gameProgress: {
                currentStage: 1,
                unlockedStages: [1],
                totalPoints: 0,
                currentPoints: 0,
                totalClickBoost: 0,
                totalCPS: 0
            },
            collection: {
                heroine: {
                    stage1: ["heroine_1_1"],
                    stage2: [],
                    stage3: [],
                    stage4: []
                },
                videos: [],
                currentDisplayImage: "heroine_1_1"
            },
            purchases: {
                items: {}
            },
            settings: {
                bgmVolume: 0.7,
                seVolume: 0.8,
                autoSaveEnabled: true,
                autoSaveInterval: 60, // seconds
                debugMode: false
            },
            lastSaved: new Date().toISOString()
        };

        this.listeners = new Map();
        this.lastAutoSave = Date.now();
        this.autoSaveInterval = 60000; // 1 minute (default)
        this.debugMode = false;
    }

    // Get current state or specific property
    get(path) {
        if (!path) return this.state;

        const keys = path.split('.');
        let value = this.state;

        for (const key of keys) {
            if (value === null || value === undefined) return undefined;
            value = value[key];
        }

        return value;
    }

    // Set state property and notify listeners
    set(path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        let target = this.state;

        // Navigate to the parent object
        for (const key of keys) {
            if (target[key] === undefined) {
                target[key] = {};
            }
            target = target[key];
        }

        // Set the value
        const oldValue = target[lastKey];
        target[lastKey] = value;

        // Notify listeners
        this.notifyListeners(path, value, oldValue);

        // Check for auto-save triggers
        this.checkAutoSave(path);
    }

    // Add points to current and total
    addPoints(amount) {
        const currentPoints = this.get('gameProgress.currentPoints') + amount;
        const totalPoints = this.get('gameProgress.totalPoints') + amount;

        this.set('gameProgress.currentPoints', currentPoints);
        this.set('gameProgress.totalPoints', totalPoints);

        // Note: Stage unlocks are now manual only, not automatic
    }

    // Spend points (returns true if successful)
    spendPoints(amount) {
        // In debug mode, infinite points
        if (this.debugMode) {
            return true;
        }

        const currentPoints = this.get('gameProgress.currentPoints');

        if (currentPoints >= amount) {
            this.set('gameProgress.currentPoints', currentPoints - amount);
            return true;
        }

        return false;
    }

    // Add item purchase
    purchaseItem(itemId, effect, value) {
        // Track purchase count
        const currentCount = this.get(`purchases.items.${itemId}`) || 0;
        this.set(`purchases.items.${itemId}`, currentCount + 1);

        // Apply item effect
        if (effect === 'click') {
            const currentBoost = this.get('gameProgress.totalClickBoost');
            this.set('gameProgress.totalClickBoost', currentBoost + value);
        } else if (effect === 'cps') {
            const currentCPS = this.get('gameProgress.totalCPS');
            this.set('gameProgress.totalCPS', currentCPS + value);
        }
    }

    // Add heroine to collection
    addHeroine(stageId, heroineId) {
        const currentCollection = this.get(`collection.heroine.stage${stageId}`) || [];

        if (!currentCollection.includes(heroineId)) {
            currentCollection.push(heroineId);
            this.set(`collection.heroine.stage${stageId}`, currentCollection);
            return true;
        }

        return false;
    }

    // Unlock stage
    unlockStage(stageId) {
        const unlockedStages = this.get('gameProgress.unlockedStages');

        if (!unlockedStages.includes(stageId)) {
            unlockedStages.push(stageId);
            this.set('gameProgress.unlockedStages', unlockedStages);

            // Add reward video
            const videos = this.get('collection.videos');
            const rewardVideoId = `stage${stageId}_unlock`;
            if (!videos.includes(rewardVideoId)) {
                videos.push(rewardVideoId);
                this.set('collection.videos', videos);
            }

            // Show stage unlock notification
            if (window.showStageUnlockNotification) {
                window.showStageUnlockNotification(stageId);
            }

            return true;
        }

        return false;
    }

    // Check if stages should be unlocked based on total points
    checkStageUnlocks() {
        const totalPoints = this.get('gameProgress.totalPoints');
        const unlockedStages = this.get('gameProgress.unlockedStages');

        const stageRequirements = {
            2: 2000,
            3: 15000,
            4: 100000
        };

        for (const [stage, requirement] of Object.entries(stageRequirements)) {
            const stageNum = parseInt(stage);
            if (totalPoints >= requirement && !unlockedStages.includes(stageNum)) {
                this.unlockStage(stageNum);
            }
        }
    }

    // Get click value (base + bonuses)
    getClickValue() {
        const baseValue = 1;
        const boost = this.get('gameProgress.totalClickBoost');
        return baseValue + boost;
    }

    // Get points per second
    getPointsPerSecond() {
        return this.get('gameProgress.totalCPS');
    }

    // Check if item is affordable
    canAfford(cost) {
        // In debug mode, everything is affordable
        if (this.debugMode) {
            return true;
        }

        return this.get('gameProgress.currentPoints') >= cost;
    }

    // Get collection progress for a stage
    getCollectionProgress(stageId) {
        const collected = this.get(`collection.heroine.stage${stageId}`) || [];
        const stageMaxImages = {
            1: 10,
            2: 30,
            3: 50,
            4: 70
        };

        const max = stageMaxImages[stageId] || 0;
        return { collected: collected.length, total: max };
    }

    // Get total collection progress
    getTotalCollectionProgress() {
        let totalCollected = 0;
        let totalMax = 160; // Total images across all stages

        for (let stage = 1; stage <= 4; stage++) {
            const progress = this.getCollectionProgress(stage);
            totalCollected += progress.collected;
        }

        return { collected: totalCollected, total: totalMax };
    }

    // Check if all images are collected
    isCollectionComplete() {
        const progress = this.getTotalCollectionProgress();
        return progress.collected >= progress.total;
    }

    // Register listener for state changes
    addListener(path, callback) {
        if (!this.listeners.has(path)) {
            this.listeners.set(path, new Set());
        }
        this.listeners.get(path).add(callback);
    }

    // Remove listener
    removeListener(path, callback) {
        if (this.listeners.has(path)) {
            this.listeners.get(path).delete(callback);
        }
    }

    // Notify listeners of state changes
    notifyListeners(path, newValue, oldValue) {
        // Notify exact path listeners
        if (this.listeners.has(path)) {
            this.listeners.get(path).forEach(callback => {
                callback(newValue, oldValue, path);
            });
        }

        // Notify wildcard listeners (e.g., "gameProgress.*")
        for (const [listenerPath, callbacks] of this.listeners) {
            if (listenerPath.endsWith('*')) {
                const basePath = listenerPath.slice(0, -1);
                if (path.startsWith(basePath)) {
                    callbacks.forEach(callback => {
                        callback(newValue, oldValue, path);
                    });
                }
            }
        }
    }

    // Check if auto-save should be triggered
    checkAutoSave(path) {
        // Only immediate save for important changes (not points)
        // Time-based saving is handled by main.js timer
        const immediateSave = [
            'purchases.items',
            'collection.heroine',
            'gameProgress.unlockedStages'
        ];

        const shouldTriggerImmediately = immediateSave.some(triggerPath =>
            path.startsWith(triggerPath)
        );

        // Immediate save for important changes only
        if (shouldTriggerImmediately) {
            this.triggerAutoSave();
        }
        // Point changes are handled by time-based auto-save in main.js
    }

    // Trigger auto-save
    triggerAutoSave() {
        this.lastAutoSave = Date.now();
        this.set('lastSaved', new Date().toISOString());

        // Notify save manager
        if (window.saveManager) {
            window.saveManager.autoSave();
        }
    }

    // Load state from saved data
    loadState(savedState) {
        if (savedState && savedState.version) {
            // Merge saved state with default state to handle new properties
            this.state = this.mergeState(this.state, savedState);

            // Load debug mode setting
            this.debugMode = this.get('settings.debugMode') || false;

            // Notify all listeners that state has been loaded
            this.notifyListeners('*', this.state, null);

            return true;
        }

        return false;
    }

    // Merge states (for handling version upgrades)
    mergeState(defaultState, savedState) {
        const merged = JSON.parse(JSON.stringify(defaultState));

        const merge = (target, source) => {
            for (const key in source) {
                if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    if (!target[key]) target[key] = {};
                    merge(target[key], source[key]);
                } else {
                    target[key] = source[key];
                }
            }
        };

        merge(merged, savedState);
        return merged;
    }

    // Get state for saving
    getSaveData() {
        return JSON.parse(JSON.stringify(this.state));
    }

    // Reset state to default
    reset() {
        const defaultState = {
            version: "1.0.0",
            gameProgress: {
                currentStage: 1,
                unlockedStages: [1],
                totalPoints: 0,
                currentPoints: 0,
                totalClickBoost: 0,
                totalCPS: 0
            },
            collection: {
                heroine: {
                    stage1: ["heroine_1_1"],
                    stage2: [],
                    stage3: [],
                    stage4: []
                },
                videos: [],
                currentDisplayImage: "heroine_1_1"
            },
            purchases: {
                items: {}
            },
            settings: {
                bgmVolume: 0.7,
                seVolume: 0.8,
                autoSaveEnabled: true,
                autoSaveInterval: 60, // seconds
                debugMode: false
            },
            lastSaved: new Date().toISOString()
        };

        this.state = defaultState;
        this.debugMode = false; // Reset runtime debug mode

        // Notify all listeners about the complete reset
        this.notifyListeners('*', this.state, null);

        // Specifically notify about critical state changes
        setTimeout(() => {
            this.notifyListeners('gameProgress.currentPoints', this.state.gameProgress.currentPoints, 0);
            this.notifyListeners('purchases.items.*', this.state.purchases.items, null);
            this.notifyListeners('settings.debugMode', false, true);
            console.log('GameState: Reset notifications sent');
        }, 50);

        // Additional notification after longer delay to ensure all systems receive it
        setTimeout(() => {
            this.notifyListeners('gameProgress.currentPoints', this.state.gameProgress.currentPoints, 0);
            console.log('GameState: Secondary reset notifications sent');
        }, 200);
    }

    // Set auto-save interval
    setAutoSaveInterval(seconds) {
        this.autoSaveInterval = seconds * 1000; // Convert to milliseconds
        this.set('settings.autoSaveInterval', seconds);
        console.log(`Auto-save interval set to ${seconds} seconds`);
    }

    // Get auto-save interval in seconds
    getAutoSaveInterval() {
        return this.get('settings.autoSaveInterval') || 60;
    }

    // Initialize auto-save interval from settings
    initializeAutoSaveInterval() {
        const intervalSeconds = this.getAutoSaveInterval();
        this.autoSaveInterval = intervalSeconds * 1000;
    }

    // Set debug mode
    setDebugMode(enabled) {
        this.debugMode = enabled;
        this.set('settings.debugMode', enabled);
        console.log(`Debug mode ${enabled ? 'enabled' : 'disabled'}. Infinite points: ${enabled}`);
    }

    // Check if debug mode is enabled
    isDebugMode() {
        return this.debugMode;
    }
}

// Create global game state instance
window.gameState = new GameState();