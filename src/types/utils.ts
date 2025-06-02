// Type utility functions and type guards for unknown to concrete type conversions

/**
 * Type guard to check if value is an Error
 */
export const isError = (value: unknown): value is Error => {
    return value instanceof Error;
};

/**
 * Type guard to check if value is a string
 */
export const isString = (value: unknown): value is string => {
    return typeof value === 'string';
};

/**
 * Type guard to check if value is a number
 */
export const isNumber = (value: unknown): value is number => {
    return typeof value === 'number' && !isNaN(value);
};

/**
 * Type guard to check if value is a boolean
 */
export const isBoolean = (value: unknown): value is boolean => {
    return typeof value === 'boolean';
};

/**
 * Type guard to check if value is an object (not null, not array)
 */
export const isObject = (value: unknown): value is Record<string, unknown> => {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
};

/**
 * Type guard to check if value is an array
 */
export const isArray = (value: unknown): value is unknown[] => {
    return Array.isArray(value);
};

/**
 * Store value types for type-safe store operations
 */
export type StoreValue = string | number | boolean | object | null;

/**
 * Translation parameter types
 */
export type TranslationParams = Record<string, string | number>;

/**
 * Safe error conversion from unknown
 */
export const toError = (error: unknown): Error => {
    if (isError(error)) {
        return error;
    }
    if (isString(error)) {
        return new Error(error);
    }
    return new Error('Unknown error occurred');
};

/**
 * Safe conversion from unknown to object
 */
export const toObject = (value: unknown): Record<string, unknown> => {
    if (isObject(value)) {
        return value;
    }
    return {};
};

/**
 * Safe conversion from unknown to array
 */
export const toArray = (value: unknown): unknown[] => {
    if (isArray(value)) {
        return value;
    }
    return [];
};