// Translation system types

// More flexible type that accepts the actual translation file structure
export type TranslationObject = Record<string, unknown>;

export interface TranslationHelper {
  getValue(obj: TranslationObject, path: string): string | undefined;
}