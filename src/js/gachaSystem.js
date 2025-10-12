// AfterSchool Clicker - Gacha System
class GachaSystem {
    constructor() {
        this.gachaButton = null;
        this.gachaStageElement = null;
        this.gachaCostElement = null;
        this.gachaRemainingElement = null;
        this.gachaTotalElement = null;
        this.gachaResultElement = null;

        this.currentStage = 1;
        this.isDrawing = false;

        this.setupGacha();
    }

    setupGacha() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeElements());
        } else {
            this.initializeElements();
        }
    }

    async initializeElements() {
        this.gachaButton = document.getElementById('gacha-btn');
        this.gachaStageElement = document.getElementById('gacha-stage');
        this.gachaCostElement = document.getElementById('gacha-cost');
        this.gachaRemainingElement = document.getElementById('gacha-remaining');
        this.gachaTotalElement = document.getElementById('gacha-total');
        this.gachaResultElement = document.getElementById('gacha-result');

        if (this.gachaButton) {
            this.gachaButton.addEventListener('click', () => this.drawGacha());
        }

        // Wait for data manager to load
        if (window.dataManager) {
            await window.dataManager.loadAll();

            // Set current stage from game state
            if (window.gameState) {
                this.currentStage = window.gameState.get('gameProgress.currentStage');
            }

            this.updateGachaDisplay();
            this.setupEventListeners();
        }
    }

    async drawGacha() {
        if (this.isDrawing) return;

        const stageData = window.dataManager.getStage(this.currentStage);
        if (!stageData) {
            this.showGachaResult(false, 'ステージデータが見つかりません');
            return;
        }

        const cost = parseInt(stageData.gacha_cost);

        // Check if player can afford gacha
        if (!window.gameState.canAfford(cost)) {
            this.showGachaResult(false, 'ポイントが不足しています');
            this.shakeGachaButton();
            return;
        }

        // Check if there are any heroines left to unlock
        const availableHeroine = window.dataManager.getUnlockedHeroineFromGacha(this.currentStage);
        if (!availableHeroine) {
            this.showGachaResult(false, 'このステージの全てのキャラクターを獲得済みです');
            return;
        }

        this.isDrawing = true;
        this.setGachaButtonState(false);

        try {
            // Spend points
            const success = window.gameState.spendPoints(cost);

            if (success) {
                // Animate gacha draw
                await this.animateGachaDraw();

                // Block click area image updates during animation
                if (window.clickSystem) {
                    window.clickSystem.isGachaAnimating = true;
                }

                // Add heroine to collection
                const unlocked = window.gameState.addHeroine(this.currentStage, availableHeroine.id);

                if (unlocked) {
                    // Play gacha sound
                    if (window.audioManager) {
                        window.audioManager.playSE('gacha_sound');
                    }

                    // Show new overlay effect
                    await this.showGachaOverlayEffect(availableHeroine);

                    // Update displays
                    this.updateGachaDisplay();
                    this.updatePointsDisplay();

                    // Check if collection is complete
                    if (window.gameState.isCollectionComplete()) {
                        this.handleCollectionComplete();
                    }

                    console.log(`Unlocked heroine: ${availableHeroine.id}`);
                } else {
                    this.showGachaResult(false, '既に獲得済みのキャラクターです');
                }
            } else {
                this.showGachaResult(false, 'ガチャの実行に失敗しました');
            }

        } catch (error) {
            console.error('Gacha draw error:', error);
            this.showGachaResult(false, 'エラーが発生しました');
        } finally {
            this.isDrawing = false;
            this.setGachaButtonState(true);
        }
    }

    async animateGachaDraw() {
        return new Promise((resolve) => {
            if (this.gachaButton) {
                this.gachaButton.classList.add('gacha-animation');

                setTimeout(() => {
                    this.gachaButton.classList.remove('gacha-animation');
                    resolve();
                }, 2000);
            } else {
                resolve();
            }
        });
    }

    updateGachaDisplay() {
        const stageData = window.dataManager.getStage(this.currentStage);
        if (!stageData) return;

        // Update stage name
        if (this.gachaStageElement) {
            this.gachaStageElement.textContent = stageData.name;
        }

        // Update cost
        if (this.gachaCostElement) {
            this.gachaCostElement.textContent = this.formatNumber(parseInt(stageData.gacha_cost));
        }

        // Update remaining count
        const progress = window.gameState.getCollectionProgress(this.currentStage);
        const remaining = progress.total - progress.collected;

        if (this.gachaRemainingElement) {
            this.gachaRemainingElement.textContent = remaining;
        }

        if (this.gachaTotalElement) {
            this.gachaTotalElement.textContent = progress.total;
        }

        // Update button state
        const cost = parseInt(stageData.gacha_cost);
        const canAfford = window.gameState.canAfford(cost);
        const hasRemaining = remaining > 0;

        this.setGachaButtonState(canAfford && hasRemaining);

        // Update button text
        if (this.gachaButton) {
            if (!hasRemaining) {
                this.gachaButton.textContent = 'コンプリート！';
            } else if (!canAfford) {
                this.gachaButton.textContent = 'ポイント不足';
            } else {
                this.gachaButton.textContent = 'ガチャを引く';
            }
        }
    }

    setGachaButtonState(enabled) {
        if (this.gachaButton) {
            this.gachaButton.disabled = !enabled;
            this.gachaButton.style.cursor = enabled ? 'pointer' : 'not-allowed';
        }
    }

    shakeGachaButton() {
        if (this.gachaButton) {
            this.gachaButton.classList.add('shake');

            setTimeout(() => {
                this.gachaButton.classList.remove('shake');
            }, 500);
        }
    }

    async showGachaOverlayEffect(heroine) {
        return new Promise((resolve) => {
            // クリックエリアの位置を取得
            const clickArea = document.getElementById('current-heroine');
            if (!clickArea) {
                resolve();
                return;
            }

            const clickAreaRect = clickArea.getBoundingClientRect();
            const imageUrl = window.dataManager.getAssetPath(heroine.filename);

            // オーバーレイを作成
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                opacity: 0;
                transition: opacity 0.3s ease;
            `;

            // 画像を作成
            const img = document.createElement('img');
            img.src = imageUrl;
            img.alt = heroine.name;
            img.style.cssText = `
                max-width: 80%;
                max-height: 80%;
                object-fit: contain;
                transform: scale(0.5);
                transition: transform 0.5s ease;
            `;

            overlay.appendChild(img);
            document.body.appendChild(overlay);

            // フェードイン
            requestAnimationFrame(() => {
                overlay.style.opacity = '1';
                img.style.transform = 'scale(1)';
            });

            // 1.5秒待機後、吸い込みアニメーション
            setTimeout(() => {
                // クリックエリアへの移動アニメーション
                const targetX = clickAreaRect.left + clickAreaRect.width / 2;
                const targetY = clickAreaRect.top + clickAreaRect.height / 2;

                img.style.transition = 'all 0.8s cubic-bezier(0.4, 0.0, 0.2, 1)';
                img.style.transform = `translate(${targetX - window.innerWidth / 2}px, ${targetY - window.innerHeight / 2}px) scale(0.1)`;
                overlay.style.opacity = '0';

                // アニメーション完了後、オーバーレイを削除してクリックエリアに画像を設定
                setTimeout(() => {
                    overlay.remove();

                    // クリックエリアに画像を設定（フラグを一時的に解除して設定）
                    if (window.clickSystem) {
                        window.clickSystem.isGachaAnimating = false;
                        window.clickSystem.setHeroineImage(imageUrl);
                    }

                    resolve();
                }, 800);
            }, 1500);
        });
    }

    showGachaResult(success, message, heroine = null) {
        if (!this.gachaResultElement) return;

        // Clear previous result
        this.gachaResultElement.innerHTML = '';
        this.gachaResultElement.classList.remove('hidden');

        // Create result content
        const resultDiv = document.createElement('div');
        resultDiv.className = `gacha-result-content ${success ? 'success' : 'error'}`;

        if (success && heroine) {
            resultDiv.innerHTML = `
                <div class="result-heroine">
                    <div class="heroine-image">
                        <img src="${window.dataManager.getAssetPath(heroine.filename)}"
                             alt="${heroine.name}"
                             style="width: 100%; height: 100%; object-fit: contain;"
                             onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                        <div class="placeholder-heroine" style="display:none;">🌸</div>
                    </div>
                    <div class="heroine-name">${heroine.name || heroine.id}</div>
                </div>
                <div class="result-message">${message}</div>
            `;
        } else {
            resultDiv.innerHTML = `
                <div class="result-message ${success ? 'success' : 'error'}">${message}</div>
            `;
        }

        this.gachaResultElement.appendChild(resultDiv);

        // Add animation
        resultDiv.classList.add('fade-in');

        // Auto-hide after delay
        setTimeout(() => {
            if (this.gachaResultElement) {
                this.gachaResultElement.classList.add('hidden');
            }
        }, 3000);
    }

    updatePointsDisplay() {
        const currentPointsElement = document.getElementById('current-points');
        if (currentPointsElement) {
            const currentPoints = window.gameState.get('gameProgress.currentPoints');
            currentPointsElement.textContent = this.formatNumber(currentPoints);
        }
    }

    // Handle when all images are collected
    handleCollectionComplete() {
        // Show completion message
        this.showCompletionMessage();
    }

    showCompletionMessage() {
        // Create special completion popup
        const popup = document.createElement('div');
        popup.className = 'completion-popup';
        popup.innerHTML = `
            <div class="completion-content">
                <h2>🎉 コンプリート！ 🎉</h2>
                <p>全てのキャラクターを集めました！</p>
                <button onclick="this.parentElement.parentElement.remove()">OK</button>
            </div>
        `;

        popup.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0,0,0,0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;

        document.body.appendChild(popup);

        // Play special completion sound
        if (window.audioManager) {
            window.audioManager.playSE('gacha_sound');
        }
    }

    // Change current stage for gacha
    setStage(stageId) {
        this.currentStage = stageId;
        this.updateGachaDisplay();
    }

    formatNumber(num) {
        return Math.floor(num).toLocaleString();
    }

    setupEventListeners() {
        // Listen for stage changes
        window.gameState.addListener('gameProgress.currentStage', (newStage) => {
            this.setStage(newStage);
        });

        // Listen for points changes to update button state
        window.gameState.addListener('gameProgress.currentPoints', () => {
            this.updateGachaDisplay();
        });

        // Listen for collection changes to update remaining count
        window.gameState.addListener('collection.heroine.*', () => {
            this.updateGachaDisplay();
        });

        // Listen for wildcard updates (loadState, batchUpdate)
        window.gameState.addListener('*', (newValue, oldValue, path) => {
            if (path === '*') {
                // Update current stage from game state
                this.currentStage = window.gameState.get('gameProgress.currentStage');
                this.updateGachaDisplay();
            }
        });
    }

    // Get gacha statistics
    getGachaStats() {
        const totalCollected = window.gameState.getTotalCollectionProgress().collected;
        const totalPossible = window.gameState.getTotalCollectionProgress().total;

        return {
            totalCollected,
            totalPossible,
            completionPercentage: Math.round((totalCollected / totalPossible) * 100),
            currentStageProgress: window.gameState.getCollectionProgress(this.currentStage)
        };
    }
}

// Initialize gacha system when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.gachaSystem = new GachaSystem();
});