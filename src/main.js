const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const csv = require('csv-parser');
const { createReadStream } = require('fs');

class AfterSchoolClickerMain {
    constructor() {
        this.mainWindow = null;
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

    async createWindow() {
        // Create the browser window
        this.mainWindow = new BrowserWindow({
            width: 1200,
            height: 800,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, 'preload.js'),
                backgroundThrottling: false
            },
            title: 'AfterSchool Clicker',
            show: false, // Will show after maximizing in ready-to-show event
            center: true,
            resizable: true,
            autoHideMenuBar: true,
            backgroundColor: '#667eea', // Gradient start color to prevent white flash
            titleBarStyle: 'default'
        });

        // Maximize window before showing
        this.mainWindow.maximize();

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

        // Show window when ready to prevent white flash
        this.mainWindow.once('ready-to-show', () => {
            console.log('Window ready-to-show event fired');
            this.mainWindow.show();
            console.log('Window show() called');

            // Development mode - open devtools only in development
            if (process.env.NODE_ENV === 'development' || process.argv.includes('--dev')) {
                this.mainWindow.webContents.openDevTools();
            }
        });

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

        // Load game data on startup
        await this.loadGameData();

        // Ensure window is shown after data loading
        console.log('Window visibility check:');
        console.log('  isVisible:', this.mainWindow.isVisible());
        console.log('  isMinimized:', this.mainWindow.isMinimized());
        console.log('  isDestroyed:', this.mainWindow.isDestroyed());

        if (!this.mainWindow.isVisible()) {
            console.log('Window not visible, calling show()');
            this.mainWindow.show();
            console.log('Window show() called, new visibility:', this.mainWindow.isVisible());
        } else {
            console.log('Window is already visible');
        }

        // Force window to front
        this.mainWindow.focus();
        this.mainWindow.setAlwaysOnTop(true);
        this.mainWindow.setAlwaysOnTop(false);
        console.log('Window forced to front');
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
                const csvPath = path.join(__dirname, '../assets/data', csvFile);
                const results = await this.parseCSV(csvPath);
                return { success: true, data: results };
            } catch (error) {
                console.error(`Failed to load ${csvFile}:`, error);
                return { success: false, error: error.message };
            }
        });

        // Get game data (cached CSV data)
        ipcMain.handle('get-game-data', async () => {
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

        for (const file of csvFiles) {
            try {
                const csvPath = path.join(__dirname, '../assets/data', file);
                const key = file.replace('.csv', '');
                this.gameData[key] = await this.parseCSV(csvPath);
                console.log(`Loaded ${file}: ${this.gameData[key].length} entries`);
            } catch (error) {
                console.error(`Failed to load ${file}:`, error);
                this.gameData[file.replace('.csv', '')] = [];
            }
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
                items: {}
            },
            settings: {
                bgmVolume: 0.7,
                seVolume: 0.8
            },
            lastSaved: new Date().toISOString()
        };
    }
}

// Initialize the application
new AfterSchoolClickerMain();