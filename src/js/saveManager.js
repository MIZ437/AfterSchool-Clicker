// AfterSchool Clicker - Save/Load Manager
class SaveManager {
    constructor() {
        this.isAutoSaveEnabled = true;
        this.lastSaveTime = 0;
        this.saveInProgress = false;
        this.saveStatusElement = null;
        this.setupSaveManager();
        this.setupAutoSave();
    }

    setupSaveManager() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeElements());
        } else {
            this.initializeElements();
        }
    }

    initializeElements() {
        this.saveStatusElement = document.getElementById('save-status');
        this.setupAutoSaveToggle();
    }

    setupAutoSaveToggle() {
        const autosaveToggle = document.getElementById('autosave-toggle');
        const autosaveStatus = document.getElementById('autosave-status');
        const autosaveInterval = document.getElementById('autosave-interval');
        const debugToggle = document.getElementById('debug-toggle');
        const debugStatus = document.getElementById('debug-status');

        if (autosaveToggle && autosaveStatus) {
            // Load saved setting
            const settings = window.gameState ? window.gameState.get('settings') : {};
            this.isAutoSaveEnabled = settings.autoSaveEnabled !== false;

            autosaveToggle.checked = this.isAutoSaveEnabled;
            autosaveStatus.textContent = this.isAutoSaveEnabled ? 'ON' : 'OFF';

            // Handle toggle changes
            autosaveToggle.addEventListener('change', (e) => {
                this.isAutoSaveEnabled = e.target.checked;
                autosaveStatus.textContent = this.isAutoSaveEnabled ? 'ON' : 'OFF';

                // Save setting
                if (window.gameState) {
                    window.gameState.set('settings.autoSaveEnabled', this.isAutoSaveEnabled);
                }

                this.showSaveStatus(this.isAutoSaveEnabled ? '自動保存が有効になりました' : '自動保存が無効になりました', 'success');
            });
        }

        if (autosaveInterval) {
            // Load saved interval setting
            const settings = window.gameState ? window.gameState.get('settings') : {};
            const savedInterval = settings.autoSaveInterval || 60;
            autosaveInterval.value = savedInterval;

            // Initialize gameState interval
            if (window.gameState) {
                window.gameState.initializeAutoSaveInterval();
            }

            // Handle interval changes
            autosaveInterval.addEventListener('change', (e) => {
                const intervalSeconds = parseInt(e.target.value);

                if (window.gameState) {
                    window.gameState.setAutoSaveInterval(intervalSeconds);
                }

                // Restart main.js timer with new interval
                if (window.afterSchoolClicker && window.afterSchoolClicker.restartAutosaveTimer) {
                    window.afterSchoolClicker.restartAutosaveTimer();
                }

                const intervalText = this.getIntervalText(intervalSeconds);
                this.showSaveStatus(`自動保存間隔を${intervalText}に設定しました`, 'success');
            });
        }

        if (debugToggle && debugStatus) {
            // Load saved debug setting
            const settings = window.gameState ? window.gameState.get('settings') : {};
            const isDebugEnabled = settings.debugMode === true;

            debugToggle.checked = isDebugEnabled;
            debugStatus.textContent = isDebugEnabled ? 'ON' : 'OFF';

            // Apply debug mode immediately if enabled
            if (window.gameState && isDebugEnabled) {
                window.gameState.setDebugMode(true);
                console.log('Debug mode restored from settings:', isDebugEnabled);
            }

            // Handle debug toggle changes
            debugToggle.addEventListener('change', (e) => {
                const enabled = e.target.checked;
                debugStatus.textContent = enabled ? 'ON' : 'OFF';

                // Save setting
                if (window.gameState) {
                    window.gameState.set('settings.debugMode', enabled);
                    window.gameState.setDebugMode(enabled);
                }

                console.log('Debug mode toggled:', enabled);
                this.showSaveStatus(enabled ? 'デバッグモードが有効になりました' : 'デバッグモードが無効になりました', 'success');
            });
        }
    }

    getIntervalText(seconds) {
        switch (seconds) {
            case 10: return '10秒';
            case 30: return '30秒';
            case 60: return '1分';
            case 300: return '5分';
            default: return `${seconds}秒`;
        }
    }

    // Auto-save setup for important events (gameState handles regular intervals)
    setupAutoSave() {
        // Save on page unload
        window.addEventListener('beforeunload', () => {
            this.saveGameSync();
        });

        // Save on visibility change (when user switches tabs/minimizes)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && !this.saveInProgress && this.isAutoSaveEnabled) {
                this.autoSave();
            }
        });
    }

    // Auto-save (non-blocking)
    async autoSave() {
        // Prevent multiple auto-saves from showing status simultaneously
        if (!this.isAutoSaveEnabled || this.saveInProgress) {
            return;
        }

        try {
            const result = await this.saveGame();
            if (result.success) {
                this.showSaveStatus('自動保存完了', 'success');
            } else {
                this.showSaveStatus('自動保存失敗', 'error');
            }
            console.log('Auto-save completed');
        } catch (error) {
            console.error('Auto-save failed:', error);
            this.showSaveStatus('自動保存エラー', 'error');
        }
    }

    // Show save status with smooth animation
    showSaveStatus(message, type = 'info') {
        if (!this.saveStatusElement) return;

        // Clear any existing timeout
        if (this.saveStatusTimeout) {
            clearTimeout(this.saveStatusTimeout);
        }

        // Update content and type
        const textElement = this.saveStatusElement.querySelector('#save-status-text');
        if (textElement) {
            textElement.textContent = message;
        }

        // Remove existing type classes
        this.saveStatusElement.className = 'save-status';

        // Add new type class and show
        this.saveStatusElement.classList.add(type, 'show');

        // Auto-hide after delay (longer for errors)
        const hideDelay = type === 'error' ? 5000 : 2000;
        this.saveStatusTimeout = setTimeout(() => {
            if (this.saveStatusElement) {
                this.saveStatusElement.classList.remove('show');
            }
        }, hideDelay);
    }

    // Manual save with status display
    async saveGameWithStatus() {
        try {
            this.showSaveStatus('保存中...', 'info');
            const result = await this.saveGame();
            if (result.success) {
                this.showSaveStatus('保存完了', 'success');
            } else {
                this.showSaveStatus('保存失敗', 'error');
            }
            return result;
        } catch (error) {
            console.error('Manual save failed:', error);
            this.showSaveStatus('保存エラー', 'error');
            return { success: false, message: error.message };
        }
    }

    // Internal save method (no status display)
    async saveGame() {
        if (this.saveInProgress) {
            console.log('Save already in progress, skipping');
            return { success: false, message: 'Save already in progress' };
        }

        this.saveInProgress = true;

        try {
            // Get current game state
            const saveData = window.gameState.getSaveData();
            saveData.lastSaved = new Date().toISOString();

            // Save via Electron API
            const result = await window.electronAPI.saveGame(saveData);

            if (result.success) {
                this.lastSaveTime = Date.now();
                console.log('Game saved successfully');

                return { success: true, message: 'ゲームを保存しました' };
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Save failed:', error);
            return { success: false, message: '保存に失敗しました: ' + error.message };
        } finally {
            this.saveInProgress = false;
        }
    }

    // Synchronous save for page unload
    saveGameSync() {
        try {
            const saveData = window.gameState.getSaveData();
            saveData.lastSaved = new Date().toISOString();

            // Use synchronous save for unload events
            localStorage.setItem('afterschool_clicker_backup', JSON.stringify(saveData));
        } catch (error) {
            console.error('Sync save failed:', error);
        }
    }

    // Load game data
    async loadGame() {
        try {
            // Try to load from Electron API first
            const result = await window.electronAPI.loadGame();

            if (result.success && result.data) {
                const success = window.gameState.loadState(result.data);

                if (success) {
                    console.log('Game loaded successfully');
                    this.lastSaveTime = Date.now();
                    return { success: true, message: 'ゲームを読み込みました' };
                } else {
                    throw new Error('Invalid save data format');
                }
            } else {
                // Try backup from localStorage
                return await this.loadFromBackup();
            }
        } catch (error) {
            console.error('Load failed:', error);

            // Try backup from localStorage
            try {
                return await this.loadFromBackup();
            } catch (backupError) {
                console.error('Backup load failed:', backupError);
                return { success: false, message: '読み込みに失敗しました: ' + error.message };
            }
        }
    }

    // Load from localStorage backup
    async loadFromBackup() {
        try {
            const backupData = localStorage.getItem('afterschool_clicker_backup');

            if (backupData) {
                const parsedData = JSON.parse(backupData);
                const success = window.gameState.loadState(parsedData);

                if (success) {
                    console.log('Game loaded from backup');
                    // Save to proper location
                    await this.saveGame();
                    return { success: true, message: 'バックアップから復元しました' };
                }
            }

            throw new Error('No backup data found');
        } catch (error) {
            console.error('Backup load failed:', error);
            return { success: false, message: 'バックアップの読み込みに失敗しました' };
        }
    }

    // Backup save data
    async backupSave() {
        try {
            const result = await window.electronAPI.backupSave();

            if (result.success) {
                return { success: true, message: 'バックアップを作成しました' };
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Backup failed:', error);
            return { success: false, message: 'バックアップに失敗しました: ' + error.message };
        }
    }

    // Delete save data
    async deleteSave() {
        try {
            const result = await window.electronAPI.deleteSave();

            if (result.success) {
                // Reset game state
                window.gameState.reset();

                // Clear localStorage backup
                localStorage.removeItem('afterschool_clicker_backup');

                console.log('Save data deleted');
                return { success: true, message: 'セーブデータを削除しました' };
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Delete failed:', error);
            return { success: false, message: '削除に失敗しました: ' + error.message };
        }
    }

    // Import save data from file
    async importSave(fileData) {
        try {
            const saveData = JSON.parse(fileData);

            // Validate save data
            if (!this.validateSaveData(saveData)) {
                throw new Error('Invalid save data format');
            }

            // Load the imported data
            const success = window.gameState.loadState(saveData);

            if (success) {
                // Save the imported data
                await this.saveGame();
                return { success: true, message: 'データをインポートしました' };
            } else {
                throw new Error('Failed to load imported data');
            }
        } catch (error) {
            console.error('Import failed:', error);
            return { success: false, message: 'インポートに失敗しました: ' + error.message };
        }
    }

    // Export save data
    async exportSave() {
        try {
            const saveData = window.gameState.getSaveData();
            const dataStr = JSON.stringify(saveData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });

            // Create download link
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `afterschool_clicker_save_${new Date().toISOString().split('T')[0]}.json`;

            // Trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Clean up
            URL.revokeObjectURL(url);

            return { success: true, message: 'セーブデータをエクスポートしました' };
        } catch (error) {
            console.error('Export failed:', error);
            return { success: false, message: 'エクスポートに失敗しました: ' + error.message };
        }
    }

    // Validate save data structure
    validateSaveData(data) {
        try {
            return (
                data &&
                data.version &&
                data.gameProgress &&
                data.collection &&
                data.purchases &&
                data.settings &&
                typeof data.gameProgress.totalPoints === 'number' &&
                typeof data.gameProgress.currentPoints === 'number' &&
                Array.isArray(data.gameProgress.unlockedStages) &&
                typeof data.collection === 'object' &&
                typeof data.purchases === 'object' &&
                typeof data.settings === 'object'
            );
        } catch (error) {
            return false;
        }
    }


    // Get save statistics
    getSaveStats() {
        const lastSaved = window.gameState.get('lastSaved');
        const timeSinceLastSave = lastSaved ? Date.now() - new Date(lastSaved).getTime() : null;

        return {
            lastSaved: lastSaved ? new Date(lastSaved).toLocaleString('ja-JP') : 'なし',
            timeSinceLastSave: timeSinceLastSave ? this.formatTimeDifference(timeSinceLastSave) : 'なし',
            autoSaveEnabled: this.isAutoSaveEnabled
        };
    }

    // Format time difference
    formatTimeDifference(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours}時間${minutes % 60}分前`;
        } else if (minutes > 0) {
            return `${minutes}分${seconds % 60}秒前`;
        } else {
            return `${seconds}秒前`;
        }
    }

    // Enable/disable auto-save
    setAutoSave(enabled) {
        this.isAutoSaveEnabled = enabled;
        console.log(`Auto-save ${enabled ? 'enabled' : 'disabled'}`);
    }
}

// Initialize save manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.saveManager = new SaveManager();
});