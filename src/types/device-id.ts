// Device ID type definitions for type safety

// Branded type for encoded device IDs
export type EncodedDeviceId = string & { readonly __brand: 'EncodedDeviceId' };

// Type guard to check if a string is an encoded device ID
export const isEncodedDeviceId = (value: string): value is EncodedDeviceId => {
    // Check if the string follows the pattern: manufacturer::product::vendorId::productId
    const parts = value.split('::');
    if (parts.length !== 4) return false;
    
    const [, , vendorId, productId] = parts;
    return !isNaN(Number(vendorId)) && !isNaN(Number(productId));
};

// Helper to create an EncodedDeviceId (for use in encodeDeviceId function)
export const createEncodedDeviceId = (value: string): EncodedDeviceId => {
    if (!isEncodedDeviceId(value)) {
        throw new Error(`Invalid device ID format: ${value}`);
    }
    return value as EncodedDeviceId;
};

// Device types with clear distinction
export interface RawHIDDevice {
    vendorId: number;
    productId: number;
    manufacturer: string;
    product: string;
    path?: string;
    serialNumber?: string;
    release?: number;
    interface?: number;
    usagePage?: number;
    usage?: number;
}

export interface DeviceWithEncodedId {
    id: EncodedDeviceId;
    [key: string]: unknown;
}