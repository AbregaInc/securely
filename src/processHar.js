import Resolver from "@forge/resolver";

const resolver = new Resolver();

resolver.define("processEvent", async ({ payload, context }) => {
    console.log('Consumer function invoked');
    // Move the code from processHarObject here
    const {issueIdOrKey, fileName, attachmentId, originalAttachmentMediaId } = payload;
    // ... rest of the code
    console.log('processHar.js');
    console.log(issueIdOrKey, fileName, attachmentId, originalAttachmentMediaId)
});

export const handler = resolver.getDefinitions();
