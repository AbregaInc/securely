import Resolver from '@forge/resolver';
import { storage } from '@forge/api';
import { http } from '@forge/api';
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


const resolver = new Resolver();

resolver.define('setSettings', async (req) => {
    const { key, value } = req.payload;
    await storage.set(key, value);
    await storage.set('scrubAllBodyContents', '');
    console.log(`Setting ${key} set to ${JSON.stringify(value)}`);
    return `Setting ${key} set to ${JSON.stringify(value)}`;
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