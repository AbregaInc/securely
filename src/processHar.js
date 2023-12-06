import Resolver from "@forge/resolver";
import { Queue } from '@forge/events';
import api, { route } from "@forge/api";
import FormData from "form-data";
import { Buffer } from 'buffer'; 
import { storage } from '@forge/api';
import { sanitizeHar } from "./harSanitizer"; // Import your sanitize function
const { createHash } = require('crypto');


const resolver = new Resolver();

const queue = new Queue({ key: 'comment-queue' });

function hash(string) {
    return createHash('sha256').update(string).digest('hex');
  }

function extractUUID(url) {
    const regex = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/;
    const match = url.match(regex);
    return match ? match[0] : null;
}

async function createAttachment(issueIdOrKey, sanitizedContent, fileName) {
    try {
        var n = fileName.lastIndexOf(".");
        var newFileName = fileName.substring(0, n) + "-cleaned" + fileName.substring(n);
        
        const form = new FormData();

        // Convert sanitizedContent to a Buffer if it's a string or an object
        const fileBuffer = Buffer.from(JSON.stringify(sanitizedContent));
        form.append('file', fileBuffer, { filename: newFileName });
        console.log('uploading file to jira');
        const response = await api.asApp().requestJira(route`/rest/api/3/issue/${issueIdOrKey}/attachments`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'X-Atlassian-Token': 'no-check',  // This header is required for file uploads
                ...form.getHeaders()
            },
            body: form
        });

        console.log(`Response: ${response.status} ${response.statusText}`);

        const responseJson = await response.json();
        //console.log(JSON.stringify(responseJson[0].id));

        const attachmentResponse = await api.asApp().requestJira(route`/rest/api/3/attachment/content/${responseJson[0].id}`, {
            headers: {
                'Accept': 'application/json'
            }
        });
        
        console.log(`New Attachment Response: ${attachmentResponse.status} ${attachmentResponse.statusText} ${attachmentResponse.url}`);   

        const mediaURL = await attachmentResponse.url;
        const newMediaId = extractUUID(mediaURL);

        return {
            status: response.status === 200,
            id: newMediaId
        };
        
    } catch (error) {
        console.error('Error creating attachment:', error);
    }
}

resolver.define("processHar", async ({ payload, context }) => {
    console.log('processHar.js consumer function invoked');
    console.log(JSON.stringify(context));

    const {issueIdOrKey, fileName, attachmentId} = payload;
    console.log(issueIdOrKey, fileName, attachmentId)

    try {

        const attachmentResponse = await api.asApp().requestJira(route`/rest/api/3/attachment/content/${attachmentId}`, {
            headers: {
                'Accept': 'application/json'
            }
        });
        
        console.log(`Response: ${attachmentResponse.status} ${attachmentResponse.statusText} ${attachmentResponse.url}`);

        if (!attachmentResponse.ok){
            console.log("Attachment not found in Jira");
            return Promise.resolve({
                statusCode: 200 
            });
        }

        const originalAttachmentMediaId = extractUUID(attachmentResponse.url);

        const harObject = await attachmentResponse.json();  // Parse the response once


        // Fetch the settings from Forge storage
        const keys = ['all_req_headers', 'all_resp_headers', 'all_cookies', 'all_mimetypes', 'all_queryargs', 'all_postparams'];
        const settings = {};

        for (const key of keys) {
            const storedValue = await storage.get(key);
            settings[key] = storedValue?.toggle ?? false;
        }

        // Construct the options object
        const options = {
            har: harObject,  // The HAR data
            // You can include other options like 'words' here if needed
            ...settings  // Spread the settings into the options object
        };

        //console.log('Scrub options: ', JSON.stringify(options));



        try {
            // TODO - this probably also needs some kind of trigger callback in case scrubbing takes longer
            // than the max function runtime.

            console.log('scrubbing the file');

            const harData = typeof harObject === 'string' ? harObject : JSON.stringify(harObject);

            let scrubbedHarString;
            try {
                // TODO: THE IMPORTANT THING IS THAT WE NEED TO FIGURE OUT SOME KIND OF HANDLING HERE FOR TIMEOUTS I GUESS?
                scrubbedHarString = sanitizeHar(harData, {
                    scrubAllCookies: options.all_cookies,
                    scrubAllRequestHeaders: options.all_req_headers,
                    scrubAllResponseHeaders: options.all_resp_headers,
                    scrubAllQueryParams: options.all_queryargs,
                    scrubAllPostParams: options.all_postparams,
                });
                console.log('Sanitization completed');
            } catch (e) {
                console.error('Error during sanitization:', e);
                // Handle the error appropriately
            }

            // Parse the string back into a JSON object
            let scrubbedHar = JSON.parse(scrubbedHarString);

            // Create a new attachment with the sanitized content
            const createAttachmentSuccessful = await createAttachment(issueIdOrKey, scrubbedHar, fileName);
            // Delete the original attachments only if the new attachment was created successfully
            if (createAttachmentSuccessful.status) {

                // We use this to look up previously processed attachments. Helps in scenarios where
                // we have multiple triggers impacting a single object like 2 attachments in one
                // comment or field.
                const processLog = 'processLog' + originalAttachmentMediaId;
                await storage.set(processLog, createAttachmentSuccessful.id);

                // Dispatch comment cleanup to seperate queue
                const payload = {
                    attachmentId: attachmentId,
                    issueIdOrKey: issueIdOrKey,
                    originalAttachmentMediaId: originalAttachmentMediaId,
                    newAttachmentMediaId: createAttachmentSuccessful.id,
                };

                console.log(payload);
                const jobId = await queue.push(payload);

                // TODO - looks like when an attachment comes in on an issue created event, we handle it correctly via the standard process
                // however, we need to update the description (and maybe other fields that can include media?) similar to what we're doing
                // with comments. The problem is that the attachment happens in it's own event, so we would need to ensure we go through and 
                // look for description and other fields to update only once the attachment replacing is completed. 
                
                // TODO P1 - this logic isn't right. We need to persist the dedupe long enough so that when Atlassian sends dupe events, we can reject them for a while. 
                // Deleting the dedpue id here doesn't help. Instead we should probably be storing a timestamp, then searching for all keys with a timestamp 
                // that is at least some amount of time in the past and then cleaning those up
                const dedupeId = issueIdOrKey + fileName + attachmentId;
                await storage.delete(hash(dedupeId));
                return Promise.resolve({
                    statusCode: 200 
                });

                }
        } catch (error) {
            console.error('Error:', error);
        }
    } catch (error) {
        console.error('Getting Attachment Error:', error);
    }

});

export const handler = resolver.getDefinitions();