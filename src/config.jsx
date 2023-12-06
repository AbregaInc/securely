import Resolver from '@forge/resolver';
import { storage } from '@forge/api';

const resolver = new Resolver();

resolver.define('setSettings', async (req) => {
    const { key, value } = req.payload;
    await storage.set(key, { toggle: value });
    return `Setting ${key} set to ${value}`;
});

resolver.define('getSettings', async () => {
    const keys = ['all_req_headers', 'all_resp_headers', 'all_cookies', 'all_queryargs', 'all_postparams', 'all_resp_body'];
    const settings = {};
    
    for (const key of keys) {
        const storedValue = await storage.get(key);
        settings[key] = storedValue?.toggle ?? false;
    }

    return settings;
});

export const handler = resolver.getDefinitions();
