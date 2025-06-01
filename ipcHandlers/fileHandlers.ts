import { ipcMain, dialog } from "electron";
import { promises as fs } from 'fs';

// File operations
const exportFile = async (data: any): Promise<void> => {
    try {
        const result = await dialog.showSaveDialog({
            title: 'Export Config File',
            defaultPath: 'gpk_utility.json',
            buttonLabel: 'Save',
            filters: [
                { name: 'JSON Files', extensions: ['json'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });
        if (!(result as any).canceled && (result as any).filePath) {
            await fs.writeFile((result as any).filePath, JSON.stringify(data, null, 2))
        }
    } catch (err) {
        // Ignore errors
    }
};

const importFile = async (): Promise<string | null> => {
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

        if ((result as any).canceled || (result as any).filePaths.length === 0) {
            return null;
        }
        
        const filePath = (result as any).filePaths[0];
        try {
            const fileContent = await fs.readFile(filePath, 'utf-8');
            return fileContent;
        } catch (readErr: any) {
            console.error(`Error reading file ${filePath}:`, readErr);
            throw new Error(`Failed to read file: ${readErr.message}`);
        }
    } catch (err) {
        console.error("Error in import file dialog:", err);
        throw err;
    }
};

export const setupFileHandlers = (): void => {
    // File operations
    ipcMain.handle('exportFile', async (event, data: any) => await exportFile(data));
    ipcMain.handle('importFile', async (event, fn?: any) => await importFile());
};