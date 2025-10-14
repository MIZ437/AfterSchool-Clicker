// AfterSchool Clicker - Album Manager
class AlbumManager {
    constructor() {
        this.currentStageTab = 1;
        this.isVideoMode = false;
        this.currentTab = { type: 'stage', value: 1 }; // Track current tab state
        this.setupAlbum();
    }

    setupAlbum() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeElements());
        } else {
            this.initializeElements();
        }
    }

    initializeElements() {
        this.setupTabHandlers();
        this.setupBackButton();
        this.renderAlbum();
    }

    setupTabHandlers() {
        const albumTabs = document.querySelectorAll('.album-tab');
        albumTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const stage = tab.dataset.albumStage;
                const type = tab.dataset.albumType;

                if (type === 'scenario') {
                    this.currentTab = { type: 'scenario' };
                    this.showScenarios();
                    this.updateActiveTab(tab);
                } else if (type === 'ending') {
                    this.currentTab = { type: 'ending' };
                    this.showEndings();
                    this.updateActiveTab(tab);
                } else if (stage) {
                    this.currentTab = { type: 'stage', value: parseInt(stage) };
                    this.showStage(parseInt(stage));
                    this.updateActiveTab(tab);
                }
            });
        });
    }

    setupBackButton() {
        const backButton = document.getElementById('album-back-btn');
        if (backButton) {
            backButton.addEventListener('click', () => {
                if (window.sceneManager) {
                    window.sceneManager.showScene('game');
                }
            });
        }
    }

    updateActiveTab(activeTab) {
        document.querySelectorAll('.album-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        activeTab.classList.add('active');
    }

    showStage(stageId) {
        this.currentStageTab = stageId;
        this.isVideoMode = false;

        // Hide other content
        this.hideAllContent();

        // Show image grid
        const imageGrid = document.getElementById('album-images');
        if (imageGrid) {
            imageGrid.style.display = 'grid';
        }

        this.renderStageImages(stageId);
        this.updateCollectionCounter();
    }

    hideAllContent() {
        const imageGrid = document.getElementById('album-images');
        const scenarioList = document.getElementById('album-scenarios');
        const endingList = document.getElementById('album-endings');

        if (imageGrid) imageGrid.style.display = 'none';
        if (scenarioList) scenarioList.style.display = 'none';
        if (endingList) endingList.style.display = 'none';
    }

    showScenarios() {
        this.hideAllContent();

        const scenarioList = document.getElementById('album-scenarios');
        if (scenarioList) {
            scenarioList.style.display = 'flex';
            scenarioList.innerHTML = '';

            // Get viewed scenarios from gameState
            const viewedScenarios = window.gameState?.get('viewedContent.scenarios') || [];

            // Create button for the initial scenario
            const scenarioId = 'scenario';
            const isViewed = viewedScenarios.includes(scenarioId);

            const button = this.createContentButton(
                'シナリオ',
                isViewed,
                () => this.playScenario()
            );

            scenarioList.appendChild(button);
        }
    }

    showEndings() {
        this.hideAllContent();

        const endingList = document.getElementById('album-endings');
        if (endingList) {
            endingList.style.display = 'flex';
            endingList.innerHTML = '';

            // Get viewed endings from gameState
            const viewedEndings = window.gameState?.get('viewedContent.endings') || [];

            // Create button for single ending
            const endingId = 'ending';
            const isViewed = viewedEndings.includes(endingId);

            const button = this.createContentButton(
                'エンディング',
                isViewed,
                () => this.playEnding(endingId)
            );

            endingList.appendChild(button);
        }
    }

    createContentButton(label, isUnlocked, onClick) {
        const button = document.createElement('button');
        button.className = `content-button ${isUnlocked ? '' : 'locked'}`;

        if (isUnlocked) {
            button.innerHTML = `
                <span class="content-icon">▶</span>
                <span class="content-label">${label}</span>
            `;
            button.addEventListener('click', onClick);
        } else {
            button.innerHTML = `
                <span class="content-icon">🔒</span>
                <span class="content-label">${label}</span>
                <span class="content-hint">未視聴</span>
            `;
            button.disabled = true;
        }

        return button;
    }

    playScenario() {
        if (window.sceneManager) {
            // Pass fromAlbum flag to indicate this is from album
            window.sceneManager.showScene('scenario', 'fade', true);
        }
    }

    playEnding(endingId) {
        if (window.sceneManager) {
            // Always use ending2 (true ending) as the single ending
            // Pass fromAlbum flag to indicate this is from album
            window.sceneManager.showScene('ending2', 'fade', true);
        }
    }

    renderStageImages(stageId) {
        const imageGrid = document.getElementById('album-images');

        if (imageGrid) {
            imageGrid.innerHTML = '';
        }

        const heroines = window.dataManager.getHeroineCollection(stageId);
        const unlockedHeroines = window.gameState.get(`collection.heroine.stage${stageId}`) || [];

        heroines.forEach(heroine => {
            const isUnlocked = unlockedHeroines.includes(heroine.id);
            const itemElement = this.createAlbumItem(heroine, isUnlocked, 'image');
            imageGrid.appendChild(itemElement);
        });
    }

    createAlbumItem(item, isUnlocked, type) {
        const itemDiv = document.createElement('div');
        itemDiv.className = `album-item ${isUnlocked ? '' : 'locked'}`;
        itemDiv.dataset.itemId = item.id;

        if (isUnlocked) {
            itemDiv.innerHTML = `
                <img src="${window.dataManager.getAssetPath(item.filename)}"
                     alt="${item.name || item.id}"
                     style="width: 100%; height: 100%; object-fit: contain;"
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                <div class="placeholder-icon" style="display:none;">🌸</div>
            `;

            itemDiv.addEventListener('click', () => this.showImageModal(item));
        } else {
            itemDiv.innerHTML = '<div class="locked-icon">🔒</div>';
        }

        return itemDiv;
    }

    showImageModal(image) {
        const modal = document.createElement('div');
        modal.className = 'image-modal';
        modal.innerHTML = `
            <div class="modal-backdrop"></div>
            <div class="modal-image-container">
                <img src="${window.dataManager.getAssetPath(image.filename)}"
                     alt="${image.name || image.id}"
                     style="max-width: 80vw; max-height: 80vh; object-fit: contain; display: block;">
                <div class="modal-close">×</div>
            </div>
        `;

        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0,0,0,0.9); display: flex; align-items: center;
            justify-content: center; z-index: 10000; cursor: pointer;
        `;

        const imageContainer = modal.querySelector('.modal-image-container');
        imageContainer.style.cssText = `
            position: relative;
            background: rgba(255, 255, 255, 0.95);
            border-radius: 20px;
            padding: 2rem;
            box-shadow: 0 10px 50px rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: default;
        `;

        const closeButton = modal.querySelector('.modal-close');
        closeButton.style.cssText = `
            position: absolute;
            top: -15px;
            right: -15px;
            font-size: 2.5rem;
            color: #2d3436;
            cursor: pointer;
            background: white;
            width: 45px;
            height: 45px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            line-height: 0;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            transition: all 0.2s ease;
            padding: 0;
            font-family: Arial, sans-serif;
            font-weight: normal;
            z-index: 10001;
        `;

        // Close on backdrop click
        const backdrop = modal.querySelector('.modal-backdrop');
        backdrop.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            cursor: pointer;
        `;
        backdrop.addEventListener('click', () => {
            modal.remove();
        });

        // Close on close button click
        closeButton.addEventListener('click', (e) => {
            e.stopPropagation();
            modal.remove();
        });

        // Prevent modal from closing when clicking on image container
        imageContainer.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Close button hover effects
        closeButton.addEventListener('mouseenter', () => {
            closeButton.style.transform = 'scale(1.1)';
            closeButton.style.background = '#e84393';
            closeButton.style.color = 'white';
        });

        closeButton.addEventListener('mouseleave', () => {
            closeButton.style.transform = 'scale(1)';
            closeButton.style.background = 'white';
            closeButton.style.color = '#2d3436';
        });

        document.body.appendChild(modal);
    }

    updateCollectionCounter() {
        const counterElement = document.getElementById('collection-count');
        const totalElement = document.getElementById('collection-total');

        if (counterElement && totalElement) {
            const progress = window.gameState.getTotalCollectionProgress();
            counterElement.textContent = progress.collected;
            totalElement.textContent = progress.total;
        }
    }

    renderAlbum() {
        // Restore the last viewed tab state
        if (this.currentTab.type === 'scenario') {
            this.restoreScenarioTab();
        } else if (this.currentTab.type === 'ending') {
            this.restoreEndingTab();
        } else if (this.currentTab.type === 'stage') {
            this.showStage(this.currentTab.value || 1);
        } else {
            // Default to stage 1
            this.showStage(1);
        }
    }

    restoreScenarioTab() {
        // Find and activate scenario tab
        const scenarioTab = document.querySelector('.album-tab[data-album-type="scenario"]');
        if (scenarioTab) {
            this.updateActiveTab(scenarioTab);
        }
        this.showScenarios();
    }

    restoreEndingTab() {
        // Find and activate ending tab
        const endingTab = document.querySelector('.album-tab[data-album-type="ending"]');
        if (endingTab) {
            this.updateActiveTab(endingTab);
        }
        this.showEndings();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.albumManager = new AlbumManager();
});