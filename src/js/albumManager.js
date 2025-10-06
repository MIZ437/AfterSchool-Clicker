// AfterSchool Clicker - Album Manager
class AlbumManager {
    constructor() {
        this.currentStageTab = 1;
        this.isVideoMode = false;
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
                if (stage === 'videos') {
                    this.showVideos();
                } else {
                    this.showStage(parseInt(stage));
                }
                this.updateActiveTab(tab);
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
        this.renderStageImages(stageId);
        this.updateCollectionCounter();
    }

    showVideos() {
        this.isVideoMode = true;
        this.renderVideos();
        this.updateCollectionCounter();
    }

    renderStageImages(stageId) {
        const imageGrid = document.getElementById('album-images');
        const videoGrid = document.getElementById('album-videos');

        if (imageGrid) {
            imageGrid.classList.remove('hidden');
            imageGrid.innerHTML = '';
        }
        if (videoGrid) {
            videoGrid.classList.add('hidden');
        }

        const heroines = window.dataManager.getHeroineCollection(stageId);
        const unlockedHeroines = window.gameState.get(`collection.heroine.stage${stageId}`) || [];

        heroines.forEach(heroine => {
            const isUnlocked = unlockedHeroines.includes(heroine.id);
            const itemElement = this.createAlbumItem(heroine, isUnlocked, 'image');
            imageGrid.appendChild(itemElement);
        });
    }

    renderVideos() {
        const imageGrid = document.getElementById('album-images');
        const videoGrid = document.getElementById('album-videos');

        if (imageGrid) {
            imageGrid.classList.add('hidden');
        }
        if (videoGrid) {
            videoGrid.classList.remove('hidden');
            videoGrid.innerHTML = '';
        }

        const videos = window.dataManager.getVideos();
        const unlockedVideos = window.gameState.get('collection.videos') || [];

        videos.forEach(video => {
            const isUnlocked = unlockedVideos.includes(video.id);
            const itemElement = this.createAlbumItem(video, isUnlocked, 'video');
            videoGrid.appendChild(itemElement);
        });
    }

    createAlbumItem(item, isUnlocked, type) {
        const itemDiv = document.createElement('div');
        itemDiv.className = `album-item ${isUnlocked ? '' : 'locked'}`;
        itemDiv.dataset.itemId = item.id;

        if (isUnlocked) {
            if (type === 'image') {
                itemDiv.innerHTML = `
                    <img src="${window.dataManager.getAssetPath(item.filename)}"
                         alt="${item.name || item.id}"
                         style="width: 100%; height: 100%; object-fit: contain;"
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                    <div class="placeholder-icon" style="display:none;">🌸</div>
                `;
            } else {
                itemDiv.innerHTML = `
                    <div class="video-thumbnail">
                        <img src="${window.dataManager.getAssetPath(item.thumbnail)}"
                             alt="${item.title}"
                             style="width: 100%; height: 100%; object-fit: contain;"
                             onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                        <div class="placeholder-icon" style="display:none;">🎬</div>
                        <div class="play-icon">▶️</div>
                    </div>
                `;
            }

            itemDiv.addEventListener('click', () => this.viewItem(item, type));
        } else {
            itemDiv.innerHTML = '<div class="locked-icon">🔒</div>';
        }

        return itemDiv;
    }

    viewItem(item, type) {
        if (type === 'image') {
            this.showImageModal(item);
        } else {
            this.showVideoModal(item);
        }
    }

    showImageModal(image) {
        const modal = document.createElement('div');
        modal.className = 'image-modal';
        modal.innerHTML = `
            <div class="modal-backdrop" onclick="this.parentElement.remove()"></div>
            <div class="modal-content">
                <img src="${window.dataManager.getAssetPath(image.filename)}"
                     alt="${image.name || image.id}"
                     style="max-width: 90vw; max-height: 90vh; object-fit: contain;">
                <div class="modal-close" onclick="this.parentElement.parentElement.remove()">×</div>
            </div>
        `;

        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0,0,0,0.9); display: flex; align-items: center;
            justify-content: center; z-index: 10000;
        `;

        document.body.appendChild(modal);
    }

    showVideoModal(video) {
        const modal = document.createElement('div');
        modal.className = 'video-modal';
        modal.innerHTML = `
            <div class="modal-backdrop" onclick="this.parentElement.remove()"></div>
            <div class="modal-content">
                <video controls autoplay style="max-width: 90vw; max-height: 90vh;">
                    <source src="${window.dataManager.getAssetPath(video.filename)}" type="video/mp4">
                </video>
                <div class="modal-close" onclick="this.parentElement.parentElement.remove()">×</div>
            </div>
        `;

        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0,0,0,0.9); display: flex; align-items: center;
            justify-content: center; z-index: 10000;
        `;

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
        this.showStage(1);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.albumManager = new AlbumManager();
});