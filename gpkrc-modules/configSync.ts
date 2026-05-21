import type { CommandResult } from '../src/types/device';

import { CONFIG_SYNC_TIMING } from './communication';

// Config sections that are written to the device and can be verified.
export type ConfigSection = 'trackpad' | 'pomodoro' | 'led' | 'led_layer';

interface PendingEntry {
    bytes: number[];
    expiresAt: number;
    token: number;
}

// Desired values the user just saved, keyed by device id then section.
// While an entry is present (and not expired) the broadcast layer shields the UI
// from read-backs that would otherwise revert the value before the device catches up.
const pendingWrites = new Map<string, Map<ConfigSection, PendingEntry>>();

// Monotonic token identifying each setPendingWrite call, so a finishing verify loop
// only clears the entry it registered (and not a newer save's desired value).
let pendingWriteSeq = 0;

const sleep = (ms: number): Promise<void> =>
    new Promise<void>((resolve): ReturnType<typeof setTimeout> => setTimeout(resolve, ms));

const bytesEqual = (a: number[] | undefined, b: number[] | undefined): boolean => {
    if (!a || !b || a.length !== b.length) {
        return false;
    }
    return a.every((value, index): boolean => value === b[index]);
};

const setPendingWrite = (deviceId: string, section: ConfigSection, bytes: number[]): number => {
    let sections = pendingWrites.get(deviceId);
    if (!sections) {
        sections = new Map<ConfigSection, PendingEntry>();
        pendingWrites.set(deviceId, sections);
    }
    const token = ++pendingWriteSeq;
    sections.set(section, { bytes: [...bytes], expiresAt: Date.now() + CONFIG_SYNC_TIMING.pendingTtlMs, token });
    return token;
};

// Clears a pending entry. When a token is given, only clears if it still owns the
// entry, so an older verify loop cannot drop a newer save's desired value.
const clearPendingWrite = (deviceId: string, section: ConfigSection, token?: number): void => {
    const sections = pendingWrites.get(deviceId);
    const entry = sections?.get(section);
    if (!sections || !entry) {
        return;
    }
    if (token !== undefined && entry.token !== token) {
        return;
    }
    sections.delete(section);
    if (sections.size === 0) {
        pendingWrites.delete(deviceId);
    }
};

// Drops every pending write for a device. Called on disconnect/cleanup so a stale
// desired value cannot shield a freshly reconnected device's read-back.
export const clearAllPendingWrites = (deviceId: string): void => {
    pendingWrites.delete(deviceId);
};

// Returns the desired bytes for a section, or undefined when there is no pending
// write or it has expired. Expired entries are removed lazily on access.
export const getPendingWrite = (deviceId: string, section: ConfigSection): number[] | undefined => {
    const sections = pendingWrites.get(deviceId);
    const entry = sections?.get(section);
    if (!entry) {
        return undefined;
    }
    if (Date.now() > entry.expiresAt) {
        clearPendingWrite(deviceId, section);
        return undefined;
    }
    return entry.bytes;
};

export interface VerifiedSaveOptions {
    deviceId: string;
    section: ConfigSection;
    desiredBytes: number[];
    // Writes the desired value to the device. Implementations own any post-write settle.
    write: () => Promise<CommandResult>;
    // Requests a fresh read-back; the device's HID data listener updates deviceStatusMap.
    readback: () => Promise<CommandResult>;
    // Reads the section's current bytes back from deviceStatusMap (the truthful value).
    readActualBytes: () => number[] | undefined;
    // Optional masking applied to both sides before comparing, for sections whose
    // bytes mix saved config with runtime state (e.g. pomodoro timer_active/phase).
    compareMask?: (bytes: number[]) => number[];
}

// Writes a config section and verifies the device accepted it, retrying on mismatch.
// Registers the desired value synchronously (before the first await) so the broadcast
// shield is active immediately, even when the caller does not await this promise.
// Never throws: failures are returned as CommandResult.
export const saveConfigWithVerify = async (options: VerifiedSaveOptions): Promise<CommandResult> => {
    const { deviceId, section, desiredBytes, write, readback, readActualBytes, compareMask } = options;
    const mask = compareMask ?? ((bytes: number[]): number[] => bytes);
    const desiredForCompare = mask(desiredBytes);

    const token = setPendingWrite(deviceId, section, desiredBytes);

    try {
        for (let attempt = 0; attempt < CONFIG_SYNC_TIMING.maxAttempts; attempt++) {
            await write();

            const deadline = Date.now() + CONFIG_SYNC_TIMING.verifyTimeoutMs;
            while (Date.now() < deadline) {
                await readback();
                await sleep(CONFIG_SYNC_TIMING.pollIntervalMs);

                const actual = readActualBytes();
                if (actual && bytesEqual(mask(actual), desiredForCompare)) {
                    clearPendingWrite(deviceId, section, token);
                    return { success: true };
                }
            }
        }
        clearPendingWrite(deviceId, section, token);
        return { success: false, error: `Config verification failed for ${section} after retries` };
    } catch (error) {
        clearPendingWrite(deviceId, section, token);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
};
