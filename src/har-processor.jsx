import Resolver from "@forge/resolver";
const resolver = new Resolver();

resolver.define("event-listener", async ({ payload, context }) => {
	console.log('Context: ', context);
    console.log('Payload: ', payload);
    return true;
});

export const handler = resolver.getDefinitions();