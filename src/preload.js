const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // Save and Load game data
    saveGame: (saveData) => ipcRenderer.invoke('save-game', saveData),
    loadGame: () => ipcRenderer.invoke('load-game'),

    // CSV data operations
    loadCSV: (csvFile) => ipcRenderer.invoke('load-csv', csvFile),
    getGameData: () => ipcRenderer.invoke('get-game-data'),

    // Save data management
    backupSave: () => ipcRenderer.invoke('backup-save'),
    deleteSave: () => ipcRenderer.invoke('delete-save'),

    // Platform information
    platform: process.platform,

    // Version information
    versions: {
        node: process.versions.node,
        chrome: process.versions.chrome,
        electron: process.versions.electron
    },

    // Asset path resolver
    getAssetPath: (filename) => ipcRenderer.invoke('get-asset-path', filename)
});

// Additional security: Remove any global Node.js variables that might have leaked
delete window.require;
delete window.exports;
delete window.module;

console.log('Preload script loaded successfully');