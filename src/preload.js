const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Save/Load functionality
  saveGameData: (saveData) => ipcRenderer.invoke('save-game-data', saveData),
  loadGameData: () => ipcRenderer.invoke('load-game-data'),
  deleteSaveData: () => ipcRenderer.invoke('delete-save-data'),

  // CSV data loading
  loadCSVData: (filename) => ipcRenderer.invoke('load-csv-data', filename),

  // App control
  quitApp: () => ipcRenderer.invoke('quit-app'),

  // Platform detection
  platform: process.platform
});