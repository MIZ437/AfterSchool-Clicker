const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const csv = require('csv-parser');
const { createReadStream } = require('fs');

class AfterSchoolClickerMain {
    constructor() {
        this.mainWindow = null;
        this.splashWindow = null;
        this.userData = null;
        this.gameData = {
            stages: null,
            items: null,
            images: null,
            audio: null,
            text: null
        };

        this.setupApp();
    }

    setupApp() {
        // Disable hardware acceleration to prevent GPU errors
        app.disableHardwareAcceleration();

        // App event handlers
        app.whenReady().then(() => this.createWindow());

        app.on('window-all-closed', () => {
            if (process.platform !== 'darwin') {
                app.quit();
            }
        });

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                this.createWindow();
            }
        });

        // Set up userData directory
        this.userData = app.getPath('userData');
        this.setupIPCHandlers();
    }

    createSplashWindow() {
        this.splashWindow = new BrowserWindow({
            width: 500,
            height: 300,
            frame: false,
            transparent: false,
            alwaysOnTop: true,
            center: true,
            backgroundColor: '#2c3e50',
            skipTaskbar: false,
            show: true,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true
            }
        });

        // Ensure splash is focused and visible
        this.splashWindow.setAlwaysOnTop(true, 'screen-saver');
        this.splashWindow.focus();
        this.splashWindow.showInactive();

        const splashHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body {
                        background: #2c3e50;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        height: 100vh;
                        color: white;
                        font-family: 'Hiragino Kaku Gothic ProN', 'メイリオ', Meiryo, sans-serif;
                    }
                    .title {
                        font-size: 28px;
                        font-weight: bold;
                        margin-bottom: 30px;
                        letter-spacing: 2px;
                    }
                    .spinner {
                        width: 40px;
                        height: 40px;
                        border: 3px solid rgba(255,255,255,0.3);
                        border-top-color: white;
                        border-radius: 50%;
                        animation: spin 0.8s linear infinite;
                    }
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                </style>
            </head>
            <body>
                <div class="title">放課後クリッカー</div>
                <div class="spinner"></div>
            </body>
            </html>
        `;

        this.splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(splashHTML)}`);
    }

    async createWindow() {
        // Show splash window first
        this.createSplashWindow();

        // Create the browser window
        this.mainWindow = new BrowserWindow({
            width: 1600,
            height: 900,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, 'preload.js'),
                backgroundThrottling: false
            },
            title: '放課後クリッカー',
            icon: path.join(__dirname, '../assets/images/ui/app_icon.png'),
            show: false,
            center: true,
            resizable: false,
            maximizable: false,
            autoHideMenuBar: true,
            backgroundColor: '#000000',
            titleBarStyle: 'default'
        });

        // Load the game
        try {
            const htmlPath = path.join(__dirname, 'index.html');
            console.log('Attempting to load HTML from:', htmlPath);
            await this.mainWindow.loadFile(htmlPath);
            console.log('Game loaded successfully');
        } catch (error) {
            console.error('Failed to load game:', error);
            console.error('Error details:', error.stack);
        }

        // Add keyboard shortcut for dev tools (F12)
        this.mainWindow.webContents.on('before-input-event', (event, input) => {
            if (input.key === 'F12') {
                if (this.mainWindow.webContents.isDevToolsOpened()) {
                    this.mainWindow.webContents.closeDevTools();
                } else {
                    this.mainWindow.webContents.openDevTools();
                }
            }
        });

        // Load game data (with timeout to prevent hanging)
        try {
            await Promise.race([
                this.loadGameData(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('CSV load timeout')), 5000))
            ]);
            console.log('Game data loaded successfully');
        } catch (error) {
            console.error('Failed to load game data:', error);
            console.log('Continuing with empty game data...');
        }

        // Wait for DOM to be ready
        await new Promise(resolve => {
            if (this.mainWindow.webContents.isLoading()) {
                this.mainWindow.webContents.once('did-finish-load', resolve);
            } else {
                resolve();
            }
        });

        // Small delay to ensure CSS is applied
        await new Promise(resolve => setTimeout(resolve, 100));

        // Close splash and show main window
        if (this.splashWindow && !this.splashWindow.isDestroyed()) {
            this.splashWindow.close();
            this.splashWindow = null;
        }

        // Show window
        this.mainWindow.show();
        this.mainWindow.focus();
        this.mainWindow.moveTop();
        this.mainWindow.setAlwaysOnTop(true);
        this.mainWindow.setAlwaysOnTop(false);
        console.log('Main window shown, splash closed');

        // Development mode - open devtools only in development
        if (process.env.NODE_ENV === 'development' || process.argv.includes('--dev')) {
            this.mainWindow.webContents.openDevTools();
        }
    }

    setupIPCHandlers() {
        // Save game data
        ipcMain.handle('save-game', async (event, saveData) => {
            try {
                const savePath = path.join(this.userData, 'save.json');
                await fs.writeFile(savePath, JSON.stringify(saveData, null, 2));
                return { success: true };
            } catch (error) {
                console.error('Save failed:', error);
                return { success: false, error: error.message };
            }
        });

        // Load game data
        ipcMain.handle('load-game', async () => {
            try {
                const savePath = path.join(this.userData, 'save.json');
                const data = await fs.readFile(savePath, 'utf8');
                const parsedData = JSON.parse(data);

                // Debug logging
                console.log('\n=== SAVE DATA DEBUG ===');
                console.log('Current Stage:', parsedData.gameProgress?.currentStage);
                console.log('Unlocked Stages:', parsedData.gameProgress?.unlockedStages);
                console.log('Current Display Image:', parsedData.collection?.currentDisplayImage);
                console.log('Stage 1 Collection:', parsedData.collection?.heroine?.stage1);
                console.log('Stage 2 Collection:', parsedData.collection?.heroine?.stage2);
                console.log('=======================\n');

                return { success: true, data: parsedData };
            } catch (error) {
                // Return default save data if file doesn't exist
                if (error.code === 'ENOENT') {
                    console.log('[Load Game] No save file found, returning default');
                    return { success: true, data: this.getDefaultSaveData() };
                }
                console.error('Load failed:', error);
                return { success: false, error: error.message };
            }
        });

        // Load CSV data
        ipcMain.handle('load-csv', async (event, csvFile) => {
            try {
                const csvPath = this.getDataPath(csvFile);
                const results = await this.parseCSV(csvPath);
                return { success: true, data: results };
            } catch (error) {
                console.error(`Failed to load ${csvFile}:`, error);
                return { success: false, error: error.message };
            }
        });

        // Get game data (cached CSV data)
        ipcMain.handle('get-game-data', async () => {
            console.log('[IPC] get-game-data called');
            console.log('[IPC] gameData availability:', {
                stages: this.gameData.stages?.length || 0,
                items: this.gameData.items?.length || 0,
                images: this.gameData.images?.length || 0,
                audio: this.gameData.audio?.length || 0,
                text: this.gameData.text?.length || 0
            });

            if (!this.gameData.items || this.gameData.items.length === 0) {
                console.error('[IPC] WARNING: No items data available!');
            }

            return { success: true, data: this.gameData };
        });

        // Backup save data
        ipcMain.handle('backup-save', async () => {
            try {
                const savePath = path.join(this.userData, 'save.json');
                const backupPath = path.join(this.userData, `save_backup_${Date.now()}.json`);
                await fs.copyFile(savePath, backupPath);
                return { success: true, path: backupPath };
            } catch (error) {
                console.error('Backup failed:', error);
                return { success: false, error: error.message };
            }
        });

        // Delete save data
        ipcMain.handle('delete-save', async () => {
            try {
                const savePath = path.join(this.userData, 'save.json');
                await fs.unlink(savePath);
                return { success: true };
            } catch (error) {
                if (error.code === 'ENOENT') {
                    return { success: true }; // File already doesn't exist
                }
                console.error('Delete failed:', error);
                return { success: false, error: error.message };
            }
        });
    }

    async loadGameData() {
        const csvFiles = ['stages.csv', 'items.csv', 'images.csv', 'audio.csv', 'text.csv'];

        console.log('[LoadGameData] Starting to load CSV files...');
        console.log('[LoadGameData] isPackaged:', app.isPackaged);

        const loadPromises = csvFiles.map(async (file) => {
            try {
                const csvPath = this.getDataPath(file);
                console.log(`[LoadGameData] Loading ${file} from:`, csvPath);
                const key = file.replace('.csv', '');

                // Add timeout for each CSV file
                const data = await Promise.race([
                    this.parseCSV(csvPath),
                    new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout loading ${file}`)), 3000))
                ]);

                this.gameData[key] = data;
                console.log(`[LoadGameData] ✓ Loaded ${file}: ${this.gameData[key].length} entries`);
            } catch (error) {
                console.error(`[LoadGameData] ✗ Failed to load ${file}:`, error.message);
                const key = file.replace('.csv', '');
                this.gameData[key] = [];
            }
        });

        await Promise.all(loadPromises);
        console.log('[LoadGameData] All CSV files processed. Total game data:', Object.keys(this.gameData).length);
    }

    getDataPath(filename) {
        // Get absolute path to CSV data file
        if (app.isPackaged) {
            // In production, data files are inside ASAR
            return path.join(__dirname, '..', 'assets', 'data', filename);
        } else {
            // In development
            return path.join(__dirname, '..', 'assets', 'data', filename);
        }
    }

    parseCSV(filePath) {
        return new Promise((resolve, reject) => {
            const results = [];
            createReadStream(filePath)
                .pipe(csv())
                .on('data', (data) => results.push(data))
                .on('end', () => resolve(results))
                .on('error', reject);
        });
    }

    getDefaultSaveData() {
        return {
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
                currentDisplayImage: "heroine_1_01"
            },
            purchases: {
                items: {
                    "ITM_CLICK_1": 1
                }
            },
            settings: {
                bgmVolume: 0.2,
                seVolume: 0.2
            },
            lastSaved: new Date().toISOString()
        };
    }

    getAssetPath(filename) {
        // Get absolute path to asset file
        if (app.isPackaged) {
            // In production, assets are inside ASAR (not unpacked)
            return path.join(__dirname, '..', 'assets', filename);
        } else {
            // In development
            return path.join(__dirname, '..', 'assets', filename);
        }
    }
}

// Initialize the application
const appInstance = new AfterSchoolClickerMain();

// Add asset path handler
ipcMain.handle('get-asset-path', async (event, filename) => {
    return appInstance.getAssetPath(filename);
});