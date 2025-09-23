const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// Keep a global reference of the window object
let mainWindow;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../build/icon.png'),
    show: false,
    titleBarStyle: 'default'
  });

  // Load the app
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Remove menu bar in production
  if (!process.env.NODE_ENV || process.env.NODE_ENV === 'production') {
    mainWindow.setMenuBarVisibility(false);
  }
}

// App event handlers
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers for save data management
ipcMain.handle('save-game-data', async (event, saveData) => {
  try {
    const userDataPath = app.getPath('userData');
    const saveFilePath = path.join(userDataPath, 'save.json');

    await fs.promises.writeFile(saveFilePath, JSON.stringify(saveData, null, 2));
    return { success: true };
  } catch (error) {
    console.error('Save failed:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-game-data', async () => {
  try {
    const userDataPath = app.getPath('userData');
    const saveFilePath = path.join(userDataPath, 'save.json');

    if (fs.existsSync(saveFilePath)) {
      const saveData = await fs.promises.readFile(saveFilePath, 'utf8');
      return { success: true, data: JSON.parse(saveData) };
    } else {
      return { success: false, error: 'No save file found' };
    }
  } catch (error) {
    console.error('Load failed:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-save-data', async () => {
  try {
    const userDataPath = app.getPath('userData');
    const saveFilePath = path.join(userDataPath, 'save.json');

    if (fs.existsSync(saveFilePath)) {
      await fs.promises.unlink(saveFilePath);
    }
    return { success: true };
  } catch (error) {
    console.error('Delete save failed:', error);
    return { success: false, error: error.message };
  }
});

// IPC handler for loading CSV data
ipcMain.handle('load-csv-data', async (event, filename) => {
  try {
    const csvPath = path.join(__dirname, '../assets/data', filename);
    const csvData = await fs.promises.readFile(csvPath, 'utf8');
    return { success: true, data: csvData };
  } catch (error) {
    console.error('CSV load failed:', error);
    return { success: false, error: error.message };
  }
});

// IPC handler for quitting the app
ipcMain.handle('quit-app', () => {
  app.quit();
});