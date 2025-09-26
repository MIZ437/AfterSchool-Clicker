// AfterSchool Clicker - Data Manager
class DataManager {
    constructor() {
        this.data = {
            stages: null,
            items: null,
            images: null,
            audio: null,
            videos: null,
            text: null
        };

        this.loaded = false;
        this.loadPromise = null;
    }

    // Load all CSV data
    async loadAll() {
        if (this.loadPromise) {
            return this.loadPromise;
        }

        this.loadPromise = this._loadAllData();
        return this.loadPromise;
    }

    async _loadAllData() {
        try {
            console.log('Loading game data...');

            // Get cached data from main process if available
            const cachedResult = await window.electronAPI.getGameData();

            if (cachedResult.success && cachedResult.data) {
                this.data = cachedResult.data;
                this.loaded = true;
                console.log('Loaded cached game data');
                return true;
            }

            // If no cached data, load from CSV files
            const csvFiles = ['stages', 'items', 'images', 'audio', 'videos', 'text'];
            const loadPromises = csvFiles.map(async (file) => {
                try {
                    const result = await window.electronAPI.loadCSV(`${file}.csv`);
                    if (result.success) {
                        this.data[file] = result.data;
                        console.log(`Loaded ${file}.csv: ${result.data.length} entries`);
                    } else {
                        console.error(`Failed to load ${file}.csv:`, result.error);
                        this.data[file] = [];
                    }
                } catch (error) {
                    console.error(`Error loading ${file}.csv:`, error);
                    this.data[file] = [];
                }
            });

            await Promise.all(loadPromises);
            this.loaded = true;
            console.log('All game data loaded');
            return true;

        } catch (error) {
            console.error('Failed to load game data:', error);
            this.loadDefaultData();
            return false;
        }
    }

    // Load default data if CSV loading fails
    loadDefaultData() {
        console.log('Loading default game data...');

        this.data = {
            stages: [
                { id: 'STAGE_1', name: 'ステージ1', unlock_cost: '0', gacha_cost: '100', description: '最初のステージ（解放済み）', heroine_count: '10' },
                { id: 'STAGE_2', name: 'ステージ2', unlock_cost: '2000', gacha_cost: '200', description: '中級ステージへの入り口', heroine_count: '30' },
                { id: 'STAGE_3', name: 'ステージ3', unlock_cost: '15000', gacha_cost: '300', description: '上級ステージの挑戦', heroine_count: '50' },
                { id: 'STAGE_4', name: 'ステージ4', unlock_cost: '100000', gacha_cost: '500', description: '最終ステージの到達', heroine_count: '70' }
            ],
            items: [
                { id: 'ITM_CLICK_1', name: 'CLICK_1', cost: '50', effect: 'click', value: '1', desc: 'クリックごとに+1ポイント' },
                { id: 'ITM_CLICK_2', name: 'CLICK_2', cost: '500', effect: 'click', value: '5', desc: 'クリックごとに+5ポイント' },
                { id: 'ITM_CPS_1', name: 'CPS_1', cost: '60', effect: 'cps', value: '1', desc: '毎秒+1ポイント' },
                { id: 'ITM_CPS_2', name: 'CPS_2', cost: '900', effect: 'cps', value: '5', desc: '毎秒+5ポイント' }
            ],
            images: [],
            audio: [],
            videos: [],
            text: [
                { id: 'game_start', category: 'button', japanese: 'ゲーム開始', scene: 'title', context: 'タイトル画面' },
                { id: 'current_points', category: 'label', japanese: 'ポイント:', scene: 'game', context: 'ゲーム画面ヘッダー' }
            ]
        };

        this.loaded = true;
    }

    // Get stage data
    getStages() {
        return this.data.stages || [];
    }

    // Get stage by ID
    getStage(stageId) {
        const stages = this.getStages();
        return stages.find(stage => stage.id === stageId || stage.id === `STAGE_${stageId}`);
    }

    // Get items data
    getItems() {
        return this.data.items || [];
    }

    // Get items by category
    getItemsByCategory(category) {
        const items = this.getItems();
        return items.filter(item => item.effect === category);
    }

    // Get item by ID
    getItem(itemId) {
        const items = this.getItems();
        return items.find(item => item.id === itemId);
    }

    // Get click upgrade items
    getClickItems() {
        return this.getItemsByCategory('click');
    }

    // Get CPS (auto-click) items
    getCPSItems() {
        return this.getItemsByCategory('cps');
    }

    // Get images data
    getImages() {
        return this.data.images || [];
    }

    // Get images by category and stage
    getImagesByStage(stageId, category = 'heroine') {
        const images = this.getImages();
        return images.filter(img =>
            img.stage === stageId.toString() &&
            img.category === category
        );
    }

    // Get image by ID
    getImage(imageId) {
        const images = this.getImages();
        return images.find(img => img.id === imageId);
    }

    // Get audio data
    getAudio() {
        return this.data.audio || [];
    }

    // Get audio by category
    getAudioByCategory(category) {
        const audio = this.getAudio();
        return audio.filter(a => a.category === category);
    }

    // Get audio by ID
    getAudioById(audioId) {
        const audio = this.getAudio();
        return audio.find(a => a.id === audioId);
    }

    // Get videos data
    getVideos() {
        return this.data.videos || [];
    }

    // Get video by ID
    getVideo(videoId) {
        const videos = this.getVideos();
        return videos.find(v => v.id === videoId);
    }

    // Get text data
    getText() {
        return this.data.text || [];
    }

    // Get text by ID
    getTextById(textId) {
        const text = this.getText();
        const textEntry = text.find(t => t.id === textId);
        return textEntry ? textEntry.japanese : textId;
    }

    // Get text by category
    getTextByCategory(category) {
        const text = this.getText();
        return text.filter(t => t.category === category);
    }

    // Generate heroine image list for a stage
    generateHeroineList(stageId) {
        const stageData = this.getStage(stageId);
        if (!stageData) return [];

        const count = parseInt(stageData.heroine_count) || 10;
        const heroines = [];

        for (let i = 1; i <= count; i++) {
            heroines.push({
                id: `heroine_${stageId}_${i}`,
                filename: `heroines/stage${stageId}/heroine_${stageId}_${i}.png`,
                name: `ヒロイン${stageId}-${i}`,
                stage: stageId
            });
        }

        return heroines;
    }

    // Get heroine collection for a stage
    getHeroineCollection(stageId) {
        // First try to get from images data
        const stageHeroines = this.getImagesByStage(stageId, 'heroine');

        if (stageHeroines.length > 0) {
            return stageHeroines;
        }

        // If no data in CSV, generate default list
        return this.generateHeroineList(stageId);
    }

    // Get random heroine for display
    getRandomHeroine(stageId) {
        const heroines = this.getHeroineCollection(stageId);
        const unlockedHeroines = window.gameState.get(`collection.heroine.stage${stageId}`) || [];

        if (unlockedHeroines.length === 0) {
            return null;
        }

        const availableHeroines = heroines.filter(h =>
            unlockedHeroines.includes(h.id)
        );

        if (availableHeroines.length === 0) {
            return null;
        }

        const randomIndex = Math.floor(Math.random() * availableHeroines.length);
        return availableHeroines[randomIndex];
    }

    // Get unlocked heroine for gacha
    getUnlockedHeroineFromGacha(stageId) {
        const heroines = this.getHeroineCollection(stageId);
        const unlockedHeroines = window.gameState.get(`collection.heroine.stage${stageId}`) || [];

        const lockedHeroines = heroines.filter(h =>
            !unlockedHeroines.includes(h.id)
        );

        if (lockedHeroines.length === 0) {
            return null; // All heroines unlocked
        }

        const randomIndex = Math.floor(Math.random() * lockedHeroines.length);
        return lockedHeroines[randomIndex];
    }

    // Get asset path
    getAssetPath(filename) {
        return `../assets/${filename}`;
    }

    // Preload critical assets
    async preloadAssets() {
        try {
            // Preload UI images
            const uiImages = this.getImages().filter(img => img.category === 'ui');

            const loadPromises = uiImages.map(img => {
                return new Promise((resolve) => {
                    const image = new Image();
                    image.onload = () => resolve(true);
                    image.onerror = () => resolve(false);
                    image.src = this.getAssetPath(img.filename);
                });
            });

            await Promise.all(loadPromises);
            console.log('UI assets preloaded');

        } catch (error) {
            console.error('Asset preloading failed:', error);
        }
    }

    // Validate data integrity
    validateData() {
        const issues = [];

        // Check if all required data is loaded
        if (!this.data.stages || this.data.stages.length === 0) {
            issues.push('No stage data loaded');
        }

        if (!this.data.items || this.data.items.length === 0) {
            issues.push('No item data loaded');
        }

        // Check stage data integrity
        const stages = this.getStages();
        stages.forEach(stage => {
            if (!stage.id || !stage.name || !stage.unlock_cost || !stage.gacha_cost) {
                issues.push(`Invalid stage data: ${stage.id || 'unknown'}`);
            }
        });

        // Check item data integrity
        const items = this.getItems();
        items.forEach(item => {
            if (!item.id || !item.cost || !item.effect || !item.value) {
                issues.push(`Invalid item data: ${item.id || 'unknown'}`);
            }
        });

        if (issues.length > 0) {
            console.warn('Data validation issues:', issues);
        }

        return issues.length === 0;
    }

    // Get data loading status
    isLoaded() {
        return this.loaded;
    }

    // Reload data
    async reload() {
        this.loaded = false;
        this.loadPromise = null;
        return await this.loadAll();
    }
}

// Initialize data manager
window.dataManager = new DataManager();