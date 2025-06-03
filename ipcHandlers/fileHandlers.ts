import { ipcMain, dialog } from "electron";
import { promises as fs } from 'fs';
import type { ExportData } from '../preload/types';

// File operations
const exportFile = async (data: ExportData): Promise<void> => {
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
        const dialogResult = result as unknown as Electron.SaveDialogReturnValue;
        if (!dialogResult.canceled && dialogResult.filePath) {
            await fs.writeFile(dialogResult.filePath, JSON.stringify(data, null, 2))
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

        const dialogResult = result as unknown as Electron.OpenDialogReturnValue;
        if (dialogResult.canceled || dialogResult.filePaths.length === 0) {
            return null;
        }
        
        const filePath = dialogResult.filePaths[0]!;
        try {
            const fileContent = await fs.readFile(filePath, 'utf-8');
            return fileContent;
        } catch (readErr) {
            console.error(`Error reading file ${filePath}:`, readErr);
            throw new Error(`Failed to read file: ${readErr instanceof Error ? readErr.message : String(readErr)}`);
        }
    } catch (err) {
        console.error("Error in import file dialog:", err);
        throw err;
    }
};

export const setupFileHandlers = (): void => {
    // File operations
    ipcMain.handle('exportFile', async (_event, data: ExportData) => {
        await exportFile(data);
    });
    ipcMain.handle('importFile', async (_event, _fn?: string) => {
        return await importFile();
    });
};