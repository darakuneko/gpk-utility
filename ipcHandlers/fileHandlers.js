import { ipcMain, dialog } from "electron";
import { promises as fs } from 'fs';

// File operations
const exportFile = (data) => {
    dialog.showSaveDialog({
        title: 'Export Config File',
        defaultPath: 'gpk_utility.json',
        buttonLabel: 'Save',
        filters: [
            { name: 'JSON Files', extensions: ['json'] },
            { name: 'All Files', extensions: ['*'] }
        ]
    }).then(async result  => {
        if (!result.canceled) {
            await fs.writeFile(result.filePath, JSON.stringify(data, null, 2))
        }
    }).catch(err => {
        // Ignore errors
    });
};

const importFile = async () => {
    try {
        const result = await dialog.showOpenDialog({
            title: 'Import Config File',
            buttonLabel: 'Open',
            filters: [
                { name: 'JSON Files', extensions: ['json'] },
                { name: 'All Files', extensions: ['*'] }
            ],
            properties: ['openFile']
        });

        if (result.canceled || result.filePaths.length === 0) {
            return null;
        }
        
        const filePath = result.filePaths[0];
        try {
            const fileContent = await fs.readFile(filePath, 'utf-8');
            return fileContent;
        } catch (readErr) {
            console.error(`Error reading file ${filePath}:`, readErr);
            throw new Error(`Failed to read file: ${readErr.message}`);
        }
    } catch (err) {
        console.error("Error in import file dialog:", err);
        throw err;
    }
};

export const setupFileHandlers = () => {
    // File operations
    ipcMain.handle('exportFile', async (event, data) => await exportFile(data));
    ipcMain.handle('importFile', async (event, fn) => await importFile(fn));
};