import React, { useState, useEffect } from "react";
import type { JSX } from 'react';

import type { Device, TrackpadConfig } from '../types/device';
import type { SavedConfig } from '../types/store';
import { useLanguage } from "../i18n/LanguageContext";

interface DataTabProps {
    device: Device | null;
}

const TRACKPAD_SAVE_KEYS: ReadonlyArray<keyof TrackpadConfig> = [
    'default_speed',
    'can_drag', 'drag_strength_mode', 'drag_term', 'drag_strength',
    'can_reverse_scrolling_direction', 'can_reverse_h_scrolling_direction',
    'scroll_term', 'scroll_step', 'can_short_scroll', 'short_scroll_term',
    'tap_term', 'swipe_term', 'pinch_term', 'pinch_distance',
];

const btnSmall = "px-3 py-1 text-xs text-white rounded";

const DataTab: React.FC<DataTabProps> = ({ device }): JSX.Element => {
    const { t } = useLanguage();
    const [filename, setFilename] = useState('');
    const [allConfigs, setAllConfigs] = useState<SavedConfig[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');

    useEffect((): void => {
        void window.api.listSavedConfigs().then(setAllConfigs);
    }, []);

    const deviceConfigs = allConfigs.filter((c): boolean => c.deviceId === (device?.id ?? ''));

    const handleSave = async (): Promise<void> => {
        if (!device?.config || !filename.trim()) return;
        const src = device.config.trackpad ?? {};
        const filteredTrackpad = Object.fromEntries(
            TRACKPAD_SAVE_KEYS.filter((k): boolean => src[k] !== undefined).map((k): [string, unknown] => [k, src[k]])
        ) as TrackpadConfig;
        const entry: SavedConfig = {
            id: crypto.randomUUID(),
            name: filename.trim(),
            deviceId: device.id,
            config: { trackpad: filteredTrackpad, pomodoro: {} },
            savedAt: Date.now()
        };
        try {
            await window.api.saveConfig(entry);
            setFilename('');
            setAllConfigs((prev): SavedConfig[] => [...prev, entry]);
        } catch {
            // save failed — do not update local state
        }
    };

    const handleLoad = async (entry: SavedConfig): Promise<void> => {
        await window.api.loadConfig(entry);
    };

    const handleDelete = async (entry: SavedConfig): Promise<void> => {
        if (!window.confirm(t('data.deleteConfirm'))) return;
        await window.api.deleteConfig(entry.id);
        setAllConfigs((prev): SavedConfig[] => prev.filter((c): boolean => c.id !== entry.id));
    };

    const startEditing = (entry: SavedConfig): void => {
        setEditingId(entry.id);
        setEditingName(entry.name);
    };

    const commitRename = async (): Promise<void> => {
        if (!editingId) return;
        const trimmed = editingName.trim();
        if (trimmed) {
            await window.api.renameConfig(editingId, trimmed);
            setAllConfigs((prev): SavedConfig[] =>
                prev.map((c): SavedConfig => c.id === editingId ? { ...c, name: trimmed } : c)
            );
        }
        setEditingId(null);
    };

    const handleRenameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
        if (e.key === 'Enter') void commitRename();
        if (e.key === 'Escape') setEditingId(null);
    };

    return (
        <div className="p-4 text-text-primary dark:text-white">
            {/* Global: Import / Export */}
            <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-gray-500 dark:text-gray-400">Global</span>
                <div className="flex gap-2">
                    <button
                        onClick={(): void => { void window.api.importFile(); }}
                        className={`${btnSmall} bg-accent-primary hover:bg-accent-primary/90`}
                    >
                        {t('common.import')}
                    </button>
                    <button
                        onClick={(): void => { void window.api.exportFile(); }}
                        className={`${btnSmall} bg-accent-primary hover:bg-accent-primary/90`}
                    >
                        {t('common.export')}
                    </button>
                </div>
            </div>

            {/* Per-device section */}
            {device && (
                <>
                    {/* Device name */}
                    <div className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                        {device.product}
                    </div>

                    {/* Filename input + Save */}
                    <div className="flex gap-2 mb-4">
                        <input
                            type="text"
                            value={filename}
                            onChange={(e): void => setFilename(e.target.value)}
                            placeholder={t('data.saveHint')}
                            onKeyDown={(e): void => { if (e.key === 'Enter') void handleSave(); }}
                            className="flex-1 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                            onClick={(): void => { void handleSave(); }}
                            disabled={!filename.trim()}
                            className={`${btnSmall} bg-accent-primary hover:bg-accent-primary/90 disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {t('data.save')}
                        </button>
                    </div>

                    {/* Save list */}
                    <div className="border border-gray-200 dark:border-gray-700 rounded-md divide-y divide-gray-200 dark:divide-gray-700">
                        {deviceConfigs.length === 0 ? (
                            <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                                {t('data.noSaves')}
                            </div>
                        ) : (
                            deviceConfigs.map((entry): JSX.Element => (
                                <div key={entry.id} className="flex items-center gap-2 px-3 py-2">
                                    {editingId === entry.id ? (
                                        <input
                                            autoFocus
                                            type="text"
                                            value={editingName}
                                            onChange={(e): void => setEditingName(e.target.value)}
                                            onBlur={(): void => { void commitRename(); }}
                                            onKeyDown={handleRenameKeyDown}
                                            className="flex-1 px-2 py-1 border border-blue-500 rounded text-sm bg-white dark:bg-gray-700 focus:outline-none"
                                        />
                                    ) : (
                                        <span
                                            className="flex-1 text-sm cursor-pointer hover:text-blue-500 truncate"
                                            onClick={(): void => startEditing(entry)}
                                            title={entry.name}
                                        >
                                            {entry.name}
                                        </span>
                                    )}
                                    <button
                                        onClick={(): void => { void handleLoad(entry); }}
                                        className={`${btnSmall} bg-blue-500 hover:bg-blue-600`}
                                    >
                                        {t('data.load')}
                                    </button>
                                    <button
                                        onClick={(): void => { void handleDelete(entry); }}
                                        className={`${btnSmall} bg-red-500 hover:bg-red-600`}
                                    >
                                        {t('common.delete')}
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default DataTab;
