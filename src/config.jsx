import Resolver from '@forge/resolver';
import { storage } from '@forge/api';

const resolver = new Resolver();

resolver.define('setSettings', async (req) => {
    const { key, value } = req.payload;
    await storage.set(key, value);
    console.log(`Setting ${key} set to ${JSON.stringify(value)}`);
    return `Setting ${key} set to ${JSON.stringify(value)}`;
});

resolver.define('getSettings', async () => {
    const keys = [
        'scrubAllRequestHeaders', 'scrubSpecificHeader', 
        'scrubAllCookies', 'scrubSpecificCookie', 
        'scrubAllQueryParams', 'scrubSpecificQueryParam', 
        'scrubAllPostParams', 'scrubSpecificPostParam', 
        'scrubAllResponseHeaders', 'scrubSpecificResponseHeader', 
        'scrubAllBodyContents', 'scrubSpecificMimeTypes'
    ];
    const settings = {};

    for (const key of keys) {
        const storedValue = await storage.get(key);
        settings[key] = storedValue ?? (key.includes('scrubAll') ? false : []);
    }

    return settings;
});

export const handler = resolver.getDefinitions();