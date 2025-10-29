// 放課後クリッカー - Data Manager
class DataManager {
    constructor() {
        this.data = {
            stages: null,
            items: null,
            images: null,
            audio: null,
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
            console.log('[DataManager] Loading game data...');

            // Get cached data from main process if available
            const cachedResult = await window.electronAPI.getGameData();
            console.log('[DataManager] Cached data result:', cachedResult);

            if (cachedResult.success && cachedResult.data) {
                this.data = cachedResult.data;
                this.loaded = true;
                console.log('[DataManager] ✓ Loaded cached game data from main process');
                console.log('[DataManager] - stages:', this.data.stages?.length);
                console.log('[DataManager] - items:', this.data.items?.length);
                console.log('[DataManager] - images:', this.data.images?.length);
                console.log('[DataManager] - audio:', this.data.audio?.length);
                console.log('[DataManager] - text:', this.data.text?.length);
                return true;
            }

            console.log('[DataManager] No cached data available, loading from CSV files...');

            // If no cached data, load from CSV files
            const csvFiles = ['stages', 'items', 'images', 'audio', 'text'];
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
                { id: 'ITM_CLICK_2', name: 'CLICK_2', cost: '2000', effect: 'click', value: '5', desc: 'クリックごとに+5ポイント' },
                { id: 'ITM_CLICK_3', name: 'CLICK_3', cost: '25000', effect: 'click', value: '20', desc: 'クリックごとに+20ポイント' },
                { id: 'ITM_CLICK_4', name: 'CLICK_4', cost: '300000', effect: 'click', value: '75', desc: 'クリックごとに+75ポイント' },
                { id: 'ITM_CLICK_5', name: 'CLICK_5', cost: '3000000', effect: 'click', value: '300', desc: 'クリックごとに+300ポイント' },
                { id: 'ITM_CPS_1', name: 'CPS_1', cost: '500', effect: 'cps', value: '1', desc: '毎秒+1ポイント' },
                { id: 'ITM_CPS_2', name: 'CPS_2', cost: '5000', effect: 'cps', value: '5', desc: '毎秒+5ポイント' },
                { id: 'ITM_CPS_3', name: 'CPS_3', cost: '50000', effect: 'cps', value: '20', desc: '毎秒+20ポイント' },
                { id: 'ITM_CPS_4', name: 'CPS_4', cost: '500000', effect: 'cps', value: '75', desc: '毎秒+75ポイント' },
                { id: 'ITM_CPS_5', name: 'CPS_5', cost: '5000000', effect: 'cps', value: '300', desc: '毎秒+300ポイント' }
            ],
            images: [],
            audio: [],
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
        console.log(`getStage(${stageId}) - Available stages:`, stages);

        // Try multiple ID formats
        let stage = stages.find(s => s.id === stageId || s.id === `STAGE_${stageId}`);

        if (!stage) {
            console.log(`Stage ${stageId} not found in data, using fallback`);
            // Fallback data
            const fallbackStages = {
                1: { id: 'STAGE_1', unlock_cost: '0', name: 'ステージ1' },
                2: { id: 'STAGE_2', unlock_cost: '2000', name: 'ステージ2' },
                3: { id: 'STAGE_3', unlock_cost: '15000', name: 'ステージ3' },
                4: { id: 'STAGE_4', unlock_cost: '100000', name: 'ステージ4' }
            };
            stage = fallbackStages[stageId];
        }

        console.log(`getStage(${stageId}) result:`, stage);
        return stage;
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
        const filtered = images.filter(img => {
            const stageMatch = img.stage === stageId.toString();
            const categoryMatch = img.category === category;
            return stageMatch && categoryMatch;
        });

        console.log('[DEBUG] getImagesByStage - stageId:', stageId, 'category:', category);
        console.log('[DEBUG] getImagesByStage - all images:', images);
        console.log('[DEBUG] getImagesByStage - filtered:', filtered);

        return filtered;
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
            // Use 2-digit zero-padded format (01, 02, etc.)
            const paddedNum = String(i).padStart(2, '0');
            heroines.push({
                id: `heroine_${stageId}_${paddedNum}`,
                filename: `images/heroines/stage${stageId}/heroine_${stageId}_${paddedNum}.png`,
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

        console.log('[DEBUG] getHeroineCollection - stageId:', stageId);
        console.log('[DEBUG] getHeroineCollection - stageHeroines from CSV:', stageHeroines);

        if (stageHeroines.length > 0) {
            return stageHeroines;
        }

        // If no data in CSV, generate default list
        const generated = this.generateHeroineList(stageId);
        console.log('[DEBUG] getHeroineCollection - generated list:', generated);
        return generated;
    }

    // Get random heroine for display
    getRandomHeroine(stageId) {
        const heroines = this.getHeroineCollection(stageId);
        const unlockedHeroines = window.gameState.get(`collection.heroine.stage${stageId}`) || [];

        console.log('[DEBUG] getRandomHeroine - heroines:', heroines);
        console.log('[DEBUG] getRandomHeroine - unlockedHeroines:', unlockedHeroines);

        if (unlockedHeroines.length === 0) {
            console.warn('[DEBUG] getRandomHeroine - No unlocked heroines');
            return null;
        }

        const availableHeroines = heroines.filter(h =>
            unlockedHeroines.includes(h.id)
        );

        console.log('[DEBUG] getRandomHeroine - availableHeroines:', availableHeroines);

        if (availableHeroines.length === 0) {
            console.warn('[DEBUG] getRandomHeroine - No available heroines after filtering');
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
        console.log('DataManager reload called - forcing CSV reload');
        this.loaded = false;
        this.loadPromise = null;
        this.data = {
            stages: null,
            items: null,
            images: null,
            audio: null,
            text: null
        };
        return await this._loadAllDataForced();
    }

    // Force load data directly from CSV, ignoring cache
    async _loadAllDataForced() {
        try {
            console.log('Loading game data directly from CSV...');

            // Force load from CSV files, ignore cache
            const csvFiles = ['stages', 'items', 'images', 'audio', 'text'];
            const loadPromises = csvFiles.map(async (file) => {
                try {
                    console.log(`Force loading ${file}.csv...`);
                    const result = await window.electronAPI.loadCSV(`${file}.csv`);
                    if (result.success) {
                        this.data[file] = result.data;
                        console.log(`Force loaded ${file}.csv: ${result.data.length} entries`);
                        console.log(`Sample data for ${file}:`, result.data.slice(0, 2));
                    } else {
                        console.error(`Failed to force load ${file}.csv:`, result.error);
                        this.data[file] = [];
                    }
                } catch (error) {
                    console.error(`Error force loading ${file}.csv:`, error);
                    this.data[file] = [];
                }
            });

            await Promise.all(loadPromises);
            this.loaded = true;
            console.log('All game data force loaded');
            console.log('Final data state:', this.data);
            return true;

        } catch (error) {
            console.error('Failed to force load game data:', error);
            this.loadDefaultData();
            return false;
        }
    }
}

// Initialize data manager
window.dataManager = new DataManager();