const fs = require('fs');
const path = require('path');
const { app } = require('electron');

// Get save file path
const userDataPath = app.getPath('userData');
const savePath = path.join(userDataPath, 'game_save.json');

console.log('Save file path:', savePath);

try {
    const saveData = JSON.parse(fs.readFileSync(savePath, 'utf8'));

    console.log('\n=== SAVE DATA DEBUG ===');
    console.log('Current Stage:', saveData.gameProgress.currentStage);
    console.log('Unlocked Stages:', saveData.gameProgress.unlockedStages);
    console.log('Current Display Image:', saveData.collection.currentDisplayImage);
    console.log('\nStage 1 Collection:', saveData.collection.heroine.stage1);
    console.log('Stage 2 Collection:', saveData.collection.heroine.stage2);
    console.log('Stage 3 Collection:', saveData.collection.heroine.stage3);
    console.log('Stage 4 Collection:', saveData.collection.heroine.stage4);
    console.log('======================\n');
} catch (error) {
    console.error('Error reading save file:', error);
}
