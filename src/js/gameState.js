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
                    stage1: ["heroine_1_01"],
                    stage2: [],
                    stage3: [],
                    stage4: []
                },
                videos: [],
                currentDisplayImage: "heroine_1_01"
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

        // Notify listeners (unless notifications are suspended)
        if (!this.suspendNotifications) {
            this.notifyListeners(path, value, oldValue);
        }

        // Check for auto-save triggers
        this.checkAutoSave(path);
    }

    // Batch update multiple state changes without triggering listeners until done
    batchUpdate(updateFn) {
        this.suspendNotifications = true;
        const changes = [];

        try {
            updateFn();
        } finally {
            this.suspendNotifications = false;
        }

        // Notify wildcard listeners after batch is complete
        this.notifyListeners('*', this.state, null);
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
            // Create new array to ensure state change detection
            const newCollection = [...currentCollection, heroineId];
            this.set(`collection.heroine.stage${stageId}`, newCollection);

            // Set as current display image when unlocked via gacha
            this.set('collection.currentDisplayImage', heroineId);

            return true;
        }

        return false;
    }

    // Unlock stage
    unlockStage(stageId) {
        const unlockedStages = this.get('gameProgress.unlockedStages');

        if (!unlockedStages.includes(stageId)) {
            console.log(`[unlockStage] Unlocking stage ${stageId}`);

            const firstHeroineId = `heroine_${stageId}_01`;

            // Use batchUpdate to update all state at once without triggering listeners multiple times
            this.batchUpdate(() => {
                // Create new array to ensure state change detection
                const newUnlockedStages = [...unlockedStages, stageId];
                this.set('gameProgress.unlockedStages', newUnlockedStages);

                // Add reward video
                const videos = this.get('collection.videos');
                const rewardVideoId = `stage${stageId}_unlock`;
                if (!videos.includes(rewardVideoId)) {
                    // Create new array to ensure state change detection
                    const newVideos = [...videos, rewardVideoId];
                    this.set('collection.videos', newVideos);
                }

                // IMPORTANT: Switch to the newly unlocked stage FIRST
                // This must be done before setting currentDisplayImage to avoid race conditions
                this.set('gameProgress.currentStage', stageId);
                console.log(`[unlockStage] Set currentStage to:`, stageId);

                // Add first heroine image of the new stage to collection
                const currentCollection = this.get(`collection.heroine.stage${stageId}`) || [];
                console.log(`[unlockStage] Before adding - stage${stageId} collection:`, currentCollection);

                if (!currentCollection.includes(firstHeroineId)) {
                    // Create new array to ensure state change detection
                    const newCollection = [...currentCollection, firstHeroineId];
                    this.set(`collection.heroine.stage${stageId}`, newCollection);
                    console.log(`[unlockStage] After adding - stage${stageId} collection:`, newCollection);
                }

                // Set as current display image (now currentStage is already updated)
                this.set('collection.currentDisplayImage', firstHeroineId);
                console.log(`[unlockStage] Set currentDisplayImage to:`, firstHeroineId);
            });

            // Update gacha system
            if (window.gachaSystem) {
                window.gachaSystem.setStage(stageId);
            }

            // UI will be updated automatically by the listener in sceneManager
            // No need to manually call updateHeroineDisplay here
            console.log(`[unlockStage] Stage unlocked, listener will update UI`);
            console.log(`[unlockStage] currentStage:`, this.get('gameProgress.currentStage'));
            console.log(`[unlockStage] stage${stageId} collection:`, this.get(`collection.heroine.stage${stageId}`));
            console.log(`[unlockStage] currentDisplayImage:`, this.get('collection.currentDisplayImage'));

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

            // Ensure first heroine image exists for all unlocked stages
            const unlockedStages = this.get('gameProgress.unlockedStages') || [];
            const currentStage = this.get('gameProgress.currentStage');
            const currentDisplayImage = this.get('collection.currentDisplayImage');

            // Use batchUpdate to ensure all changes happen atomically
            let needsUpdate = false;
            this.suspendNotifications = true; // Temporarily suspend notifications

            try {
                for (const stageId of unlockedStages) {
                    const firstHeroineId = `heroine_${stageId}_01`;
                    const currentCollection = this.get(`collection.heroine.stage${stageId}`) || [];

                    if (!currentCollection.includes(firstHeroineId)) {
                        const newCollection = [...currentCollection, firstHeroineId];
                        this.set(`collection.heroine.stage${stageId}`, newCollection);
                        needsUpdate = true;
                    }
                }

                // Update currentDisplayImage to match current stage if needed
                if (currentDisplayImage && currentStage) {
                    if (!currentDisplayImage.startsWith(`heroine_${currentStage}_`)) {
                        const correctFirstHeroineId = `heroine_${currentStage}_01`;
                        this.set('collection.currentDisplayImage', correctFirstHeroineId);
                        needsUpdate = true;
                    }
                }
            } finally {
                this.suspendNotifications = false; // Re-enable notifications
            }

            // If we added any images, trigger save immediately
            if (needsUpdate) {
                setTimeout(() => {
                    if (window.saveManager) {
                        window.saveManager.autoSave();
                    }
                }, 500);
            }

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
                    stage1: ["heroine_1_01"],
                    stage2: [],
                    stage3: [],
                    stage4: []
                },
                videos: [],
                currentDisplayImage: "heroine_1_01"
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