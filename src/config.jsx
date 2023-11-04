import Resolver from '@forge/resolver';
import { storage } from '@forge/api';

const resolver = new Resolver();

resolver.define('getText', (req) => {
    console.log(req);
    return 'Hello, world!';
});

resolver.define('getToggleValue', async () => {
    return await storage.get('toggle-value');
});

resolver.define('setToggleValue', async (req) => {
    const { value } = req;
    await storage.set('toggle-value', value);
    return `Toggle value set to ${value}`;
});

export const handler = resolver.getDefinitions();
