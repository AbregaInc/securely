import Resolver from '@forge/resolver';
import { storage } from '@forge/api';
import http from 'http';
import mime from 'mime-types';
import { defaultMimeTypesList, defaultWordList } from './harSanitizer';

const defaultSettings = {
    'scrubAllRequestHeaders': false,
    'scrubSpecificHeader': defaultWordList,
    'scrubAllCookies': false,
    'scrubSpecificCookie': defaultWordList,
    'scrubAllQueryParams': false,
    'scrubSpecificQueryParam': defaultWordList,
    'scrubAllPostParams': false,
    'scrubSpecificPostParam': defaultWordList,
    'scrubAllResponseHeaders': false,
    'scrubSpecificResponseHeader': defaultWordList,
    'scrubAllBodyContents': false,
    'scrubSpecificMimeTypes': defaultMimeTypesList
};

const isValidHeaderOrPostParam = (name) => {
    try {
        // Using http module to validate header names
        http.validateHeaderName(name);
        return true;
    } catch (error) {
        return false;
    }
};
const isValidCookieName = (name) => /^[\x21\x23-\x2B\x2D-\x3A\x3C-\x5B\x5D-\x7E]+$/.test(name);
const isValidQueryParam = (param) => /^[A-Za-z0-9-_]+$/.test(param); // Simplified validation for demonstration
const isValidMimeType = (mimeType) => mime.lookup(mimeType) !== false;


const MAX_VALUE_LENGTH = 1024; // 1 KB per value
const MAX_TOTAL_LENGTH = 16384; // 16 KB total per setting

const validateSetting = (key, value) => {
    if (Array.isArray(value)) {
        if (value.some(v => typeof v === 'string' && v.length > MAX_VALUE_LENGTH)) {
            return false; // Individual value length exceeds 1 KB
        }
        const totalLength = value.reduce((acc, v) => acc + v.length, 0);
        if (totalLength > MAX_TOTAL_LENGTH) {
            return false; // Total length exceeds 16 KB
        }
    }
    switch (key) {
        case 'scrubSpecificHeader':
        case 'scrubSpecificPostParam':
            return value.every(isValidHeaderOrPostParam);
        case 'scrubSpecificCookie':
            return value.every(isValidCookieName);
        case 'scrubSpecificQueryParam':
            return value.every(isValidQueryParam);
        case 'scrubSpecificMimeTypes':
            return value.every(isValidMimeType);
        default:
            return true; // No validation needed for other settings
    }
};


const resolver = new Resolver();

resolver.define('setSettings', async (req) => {
    const { key, value } = req.payload;

    if (!validateSetting(key, value)) {
        console.warn(`Invalid value for setting '${key}'`);
    }

    await storage.set(key, value);
    console.log(`Setting '${key}' set to ${JSON.stringify(value)}`);
    return `Setting '${key}' set to ${JSON.stringify(value)}`;
});

resolver.define('getSettings', async () => {

    const settings = {};
    let isInitialized = false;

    for (const [key, defaultValue] of Object.entries(defaultSettings)) {
        const storedValue = await storage.get(key);
        if (storedValue === undefined) {
            isInitialized = true;
            settings[key] = defaultValue;
        } else {
            settings[key] = storedValue;
        }
    }

    if (isInitialized) {
        // Save default settings if it's the first run
        await Promise.all(
            Object.entries(settings).map(([key, value]) =>
                storage.set(key, value)
            )
        );
    }

    return settings;
});

resolver.define('resetToDefaults', async () => {
    await Promise.all(
        Object.entries(defaultSettings).map(([key, defaultValue]) =>
            storage.set(key, defaultValue)
        )
    );
    return 'Settings reset to defaults';
});

export const handler = resolver.getDefinitions();