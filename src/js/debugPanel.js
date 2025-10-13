/**
 * Debug Panel Manager
 * Provides floating debug panel with drag functionality and debug utilities
 */

class DebugPanelManager {
    constructor() {
        this.panel = null;
        this.header = null;
        this.isDragging = false;
        this.currentX = 0;
        this.currentY = 0;
        this.initialX = 0;
        this.initialY = 0;
        this.xOffset = 0;
        this.yOffset = 0;
        this.infinitePointsEnabled = false;
    }

    initialize() {
        console.log('[DebugPanel] Initializing debug panel...');

        this.panel = document.getElementById('debug-panel');
        this.header = this.panel?.querySelector('.debug-panel-header');

        if (!this.panel || !this.header) {
            console.error('[DebugPanel] Debug panel elements not found');
            return;
        }

        this.setupEventListeners();
        this.setupDragHandlers();

        console.log('[DebugPanel] Debug panel initialized successfully');
    }

    setupEventListeners() {
        // Close button
        const closeBtn = document.getElementById('debug-panel-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hidePanel());
        }

        // Minimize button
        const minimizeBtn = document.getElementById('debug-panel-minimize');
        if (minimizeBtn) {
            minimizeBtn.addEventListener('click', () => this.toggleMinimize());
        }

        // Infinite points toggle
        const infinitePointsToggle = document.getElementById('debug-infinite-points');
        if (infinitePointsToggle) {
            infinitePointsToggle.addEventListener('change', (e) => {
                this.toggleInfinitePoints(e.target.checked);
            });
        }

        // Debug action buttons
        const debugButtons = document.querySelectorAll('.debug-btn');
        debugButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                const stage = btn.dataset.stage;
                this.handleDebugAction(action, stage);
            });
        });
    }

    setupDragHandlers() {
        this.header.addEventListener('mousedown', (e) => this.dragStart(e));
        document.addEventListener('mousemove', (e) => this.drag(e));
        document.addEventListener('mouseup', () => this.dragEnd());

        // Enable hardware acceleration hint
        this.panel.style.willChange = 'transform';
    }

    dragStart(e) {
        this.initialX = e.clientX - this.xOffset;
        this.initialY = e.clientY - this.yOffset;

        if (e.target === this.header || this.header.contains(e.target)) {
            this.isDragging = true;
            this.header.style.cursor = 'grabbing';
        }
    }

    drag(e) {
        if (!this.isDragging) return;

        e.preventDefault();

        // Calculate new position
        const newX = e.clientX - this.initialX;
        const newY = e.clientY - this.initialY;

        // Use requestAnimationFrame for smooth rendering
        if (this.dragRAF) {
            cancelAnimationFrame(this.dragRAF);
        }

        this.dragRAF = requestAnimationFrame(() => {
            this.currentX = newX;
            this.currentY = newY;
            this.xOffset = this.currentX;
            this.yOffset = this.currentY;
            this.setTranslate(this.currentX, this.currentY, this.panel);
        });
    }

    dragEnd() {
        if (!this.isDragging) return;

        // Cancel any pending animation frame
        if (this.dragRAF) {
            cancelAnimationFrame(this.dragRAF);
            this.dragRAF = null;
        }

        this.initialX = this.currentX;
        this.initialY = this.currentY;
        this.isDragging = false;
        this.header.style.cursor = '';
    }

    setTranslate(xPos, yPos, el) {
        // Use translate3d for hardware acceleration
        el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
    }

    showPanel() {
        if (this.panel) {
            this.panel.classList.remove('hidden');
            console.log('[DebugPanel] Panel shown');
        }
    }

    hidePanel() {
        if (this.panel) {
            this.panel.classList.add('hidden');
            console.log('[DebugPanel] Panel hidden');
        }
    }

    togglePanel() {
        if (this.panel) {
            this.panel.classList.toggle('hidden');
        }
    }

    toggleMinimize() {
        if (this.panel) {
            this.panel.classList.toggle('minimized');
        }
    }

    toggleInfinitePoints(enabled) {
        this.infinitePointsEnabled = enabled;
        const statusEl = document.getElementById('debug-infinite-status');

        if (statusEl) {
            statusEl.textContent = enabled ? 'ON' : 'OFF';
            statusEl.style.color = enabled ? '#00b894' : '#ffffff';
        }

        if (enabled) {
            console.log('[DebugPanel] Infinite points enabled');
            // Enable debug mode in gameState
            if (window.gameState) {
                window.gameState.enableDebugMode();
            }
        } else {
            console.log('[DebugPanel] Infinite points disabled');
            // Disable debug mode in gameState
            if (window.gameState) {
                window.gameState.disableDebugMode();
            }
        }
    }

    handleDebugAction(action, stage) {
        console.log(`[DebugPanel] Action: ${action}, Stage: ${stage}`);

        switch (action) {
            case 'unlock-stage':
                this.unlockStage(parseInt(stage));
                break;
            case 'unlock-all-stages':
                this.unlockAllStages();
                break;
            case 'unlock-images':
                this.unlockStageImages(parseInt(stage));
                break;
            case 'unlock-all-images':
                this.unlockAllImages();
                break;
            case 'trigger-ending':
                this.triggerEnding();
                break;
            case 'delete-all-data':
                this.deleteAllData();
                break;
            default:
                console.warn(`[DebugPanel] Unknown action: ${action}`);
        }
    }

    unlockStage(stageId) {
        if (!window.gameState) {
            console.error('[DebugPanel] gameState not available');
            return;
        }

        const unlockedStages = window.gameState.get('gameProgress.unlockedStages');
        if (!unlockedStages.includes(stageId)) {
            window.gameState.unlockStage(stageId);
            console.log(`[DebugPanel] Stage ${stageId} unlocked`);

            // Update UI
            if (window.updateStageButtons) {
                window.updateStageButtons();
            }

            this.showMessage(`ステージ${stageId}を解放しました`);
        } else {
            this.showMessage(`ステージ${stageId}は既に解放済みです`);
        }
    }

    unlockAllStages() {
        if (!window.gameState) {
            console.error('[DebugPanel] gameState not available');
            return;
        }

        for (let i = 2; i <= 4; i++) {
            const unlockedStages = window.gameState.get('gameProgress.unlockedStages');
            if (!unlockedStages.includes(i)) {
                window.gameState.unlockStage(i);
            }
        }

        console.log('[DebugPanel] All stages unlocked');

        // Update UI
        if (window.updateStageButtons) {
            window.updateStageButtons();
        }

        this.showMessage('全ステージを解放しました');
    }

    unlockStageImages(stageId) {
        if (!window.gameState || !window.dataManager) {
            console.error('[DebugPanel] Required managers not available');
            return;
        }

        // Get all heroine images for this stage using dataManager method
        const stageImages = window.dataManager.getImagesByStage(stageId, 'heroine');

        console.log(`[DebugPanel] Found ${stageImages.length} images for stage ${stageId}:`, stageImages);

        if (stageImages.length === 0) {
            console.warn(`[DebugPanel] No images found for stage ${stageId}`);
            this.showMessage(`ステージ${stageId}の画像が見つかりません`);
            return;
        }

        // Get current unlocked images array
        const unlockedImages = window.gameState.get('gameProgress.unlockedImages') || [];
        let unlocked = 0;

        // Add each image ID to unlocked images if not already present
        stageImages.forEach(img => {
            if (!unlockedImages.includes(img.id)) {
                unlockedImages.push(img.id);
                unlocked++;
                console.log(`[DebugPanel] Unlocking image: ${img.id}`);
            }
        });

        if (unlocked > 0) {
            // Save updated unlocked images
            window.gameState.set('gameProgress.unlockedImages', unlockedImages);

            // Also add to heroine collection for the stage
            const collectionKey = `collection.heroine.stage${stageId}`;
            const stageCollection = window.gameState.get(collectionKey) || [];

            stageImages.forEach(img => {
                if (!stageCollection.includes(img.id)) {
                    stageCollection.push(img.id);
                }
            });

            window.gameState.set(collectionKey, stageCollection);

            console.log(`[DebugPanel] Unlocked ${unlocked} images for stage ${stageId}`);
            this.showMessage(`ステージ${stageId}の画像${unlocked}枚を解放しました`);

            // Update album if open
            if (window.albumManager && window.albumManager.renderAlbum) {
                window.albumManager.renderAlbum();
            }
        } else {
            this.showMessage(`ステージ${stageId}の画像は既に全て解放済みです`);
        }
    }

    unlockAllImages() {
        if (!window.gameState || !window.dataManager) {
            console.error('[DebugPanel] Required managers not available');
            return;
        }

        // Get all heroine images from all stages
        const allImages = window.dataManager.getImages().filter(img => img.category === 'heroine');
        const unlockedImages = window.gameState.get('gameProgress.unlockedImages') || [];
        let unlocked = 0;

        console.log(`[DebugPanel] Found ${allImages.length} total heroine images`);

        allImages.forEach(img => {
            if (!unlockedImages.includes(img.id)) {
                unlockedImages.push(img.id);
                unlocked++;
                console.log(`[DebugPanel] Unlocking image: ${img.id}`);
            }
        });

        if (unlocked > 0) {
            window.gameState.set('gameProgress.unlockedImages', unlockedImages);

            // Also add to heroine collections for all stages
            for (let stageId = 1; stageId <= 4; stageId++) {
                const collectionKey = `collection.heroine.stage${stageId}`;
                const stageImages = window.dataManager.getImagesByStage(stageId, 'heroine');
                const stageCollection = window.gameState.get(collectionKey) || [];

                stageImages.forEach(img => {
                    if (!stageCollection.includes(img.id)) {
                        stageCollection.push(img.id);
                    }
                });

                window.gameState.set(collectionKey, stageCollection);
            }

            console.log(`[DebugPanel] Unlocked ${unlocked} images total`);
            this.showMessage(`全画像${unlocked}枚を解放しました`);

            // Update album if open
            if (window.albumManager && window.albumManager.renderAlbum) {
                window.albumManager.renderAlbum();
            }
        } else {
            this.showMessage('全画像は既に解放済みです');
        }
    }

    triggerEnding() {
        console.log('[DebugPanel] Triggering ending scene');

        if (window.sceneManager) {
            window.sceneManager.showScene('ending1');
            this.showMessage('エンディングを起動しました');
        } else {
            console.error('[DebugPanel] sceneManager not available');
            this.showMessage('エンディングの起動に失敗しました');
        }
    }

    async deleteAllData() {
        console.log('[DebugPanel] Delete all data requested');

        // Show confirmation dialog
        if (!window.confirm('本当に全てのデータを削除しますか？\nこの操作は取り消せません。')) {
            console.log('[DebugPanel] Data deletion cancelled by user');
            return;
        }

        if (!window.saveManager) {
            console.error('[DebugPanel] saveManager not available');
            this.showMessage('データ削除に失敗しました');
            return;
        }

        try {
            const result = await window.saveManager.deleteSave();

            if (result.success) {
                console.log('[DebugPanel] Data deleted successfully, reloading...');
                this.showMessage('データを削除しました。ゲームを再起動します。');

                // Reload the window after a short delay
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            } else {
                console.error('[DebugPanel] Data deletion failed:', result.error);
                this.showMessage('データ削除に失敗しました');
            }
        } catch (error) {
            console.error('[DebugPanel] Error deleting data:', error);
            this.showMessage('データ削除中にエラーが発生しました');
        }
    }

    showMessage(message) {
        if (window.sceneManager && window.sceneManager.showMessage) {
            window.sceneManager.showMessage(message);
        } else {
            console.log(`[DebugPanel] ${message}`);
        }
    }
}

// Initialize debug panel manager
window.debugPanelManager = new DebugPanelManager();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.debugPanelManager.initialize();
    });
} else {
    window.debugPanelManager.initialize();
}
