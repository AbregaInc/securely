import Resolver from "@forge/resolver";
import { Queue } from '@forge/events';
import api, { route } from "@forge/api";
import FormData from "form-data";
import { Buffer } from 'buffer'; 
import { storage } from '@forge/api';
import { sanitizeHar } from "./harSanitizer";

import { setFlagsFromString } from 'v8';
import { runInNewContext } from 'vm';

setFlagsFromString('--expose_gc');
const gc = runInNewContext('gc'); // nocommit
gc();

const resolver = new Resolver();

const queue = new Queue({ key: 'comment-queue' });

function extractUUID(url) {
    const regex = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/;
    const match = url.match(regex);
    return match ? match[0] : null;
}

function logMemory(){
    const formatMemoryUsage = (data) => `${Math.round(data / 1024 / 1024 * 100) / 100} MB`;

    const memoryData = process.memoryUsage();

    const memoryUsage = {
    rss: `${formatMemoryUsage(memoryData.rss)} -> Resident Set Size - total memory allocated for the process execution`,
    //heapTotal: `${formatMemoryUsage(memoryData.heapTotal)} -> total size of the allocated heap`,
    //heapUsed: `${formatMemoryUsage(memoryData.heapUsed)} -> actual memory used during the execution`,
    //external: `${formatMemoryUsage(memoryData.external)} -> V8 external memory`,
    };

    console.log(memoryUsage);
}

async function createAttachment(issueIdOrKey, sanitizedContent, fileName) {
    try {
        var n = fileName.lastIndexOf(".");
        var newFileName = fileName.substring(0, n) + "-cleaned" + fileName.substring(n);
        
        const form = new FormData();

        // Convert sanitizedContent to a Buffer if it's a string or an object
        let fileBuffer = Buffer.from(JSON.stringify(sanitizedContent));
        sanitizedContent = null; //Freeing up memory
        form.append('file', fileBuffer, { filename: newFileName });
        fileBuffer = null; // Freeing up memory
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
    
        console.log(`Creating Attachment Response: ${response.status} ${response.statusText}`);

        const responseJson = await response.json();
        //console.log(JSON.stringify(responseJson[0].id));

        const attachmentResponse = await api.asApp().requestJira(route`/rest/api/3/attachment/content/${responseJson[0].id}`, {
            headers: {
                'Accept': 'application/json'
            }
        });
        
        console.log(`New Attachment Metadata Response: ${attachmentResponse.status} ${attachmentResponse.statusText} ${attachmentResponse.url}`);   

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
    //console.log('processHar.js consumer function invoked');
    //console.log(JSON.stringify(context));

    const {issueIdOrKey, fileName, attachmentId} = payload;
    console.log(issueIdOrKey, fileName, attachmentId)

    try {
        let attachmentResponse;
        try {
            attachmentResponse = await api.asApp().requestJira(route`/rest/api/3/attachment/content/${attachmentId}`, {
                headers: {
                    'Accept': 'application/json'
                }
            });
    
            console.log(`get attachment response: ${attachmentResponse.status} ${attachmentResponse.statusText} ${attachmentResponse.url}`);
    
            if (!attachmentResponse.ok){
                console.log("Attachment not found in Jira");
                return Promise.resolve({
                    statusCode: 200 
                });
            }

        } catch (e) {
            console.error('Error fetching attachment:', e);
        }

        const originalAttachmentMediaId = extractUUID(attachmentResponse.url);

        let harObject = await attachmentResponse.json();  // Parse the response once
        attachmentResponse = null; // freeing up memory

        // Fetch the settings from Forge storage
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
            try {
                const storedValue = await storage.get(key);
                settings[key] = storedValue ?? (key.includes('scrubAll') ? false : []); // Default to false for booleans, empty array for lists
            } catch (error) {
                console.error('key of Keys Error:', error);
            }
        }
        // Construct the options object
        const options = {
            ...settings  // Spread the settings into the options object
        };
        
        //console.log('Scrub options: ', JSON.stringify(options));

        try {

            let scrubbedHar;
            try {
                // TODO: THE IMPORTANT THING IS THAT WE NEED TO FIGURE OUT SOME KIND OF HANDLING HERE FOR TIMEOUTS I GUESS?
                scrubbedHar = sanitizeHar(harObject, {
                    scrubAllCookies: options.scrubAllCookies,
                    scrubSpecificCookie: options.scrubSpecificCookie,
                    scrubAllRequestHeaders: options.scrubAllRequestHeaders,
                    scrubSpecificHeader: options.scrubSpecificHeader,
                    scrubAllResponseHeaders: options.scrubAllResponseHeaders,
                    scrubSpecificResponseHeader: options.scrubSpecificResponseHeader,
                    scrubAllQueryParams: options.scrubAllQueryParams,
                    scrubSpecificQueryParam: options.scrubSpecificQueryParam,
                    scrubAllPostParams: options.scrubAllPostParams,
                    scrubSpecificPostParam: options.scrubSpecificPostParam,
                    scrubAllBodyContents: options.scrubAllBodyContents,
                    scrubSpecificMimeTypes: options.scrubSpecificMimeTypes
                });
                //console.log('Sanitization completed');
            } catch (e) {
                console.error('Error during sanitization:', e);
                // Handle the error appropriately
            }

            // Create a new attachment with the sanitized content
            let createAttachmentSuccessful;
            try{
                createAttachmentSuccessful = await createAttachment(issueIdOrKey, scrubbedHar, fileName);
            } catch (e) {
                console.error('Error when adding new attachment: ', e);
                // Handle the error appropriately
            }

            scrubbedHar = null;

            // Process the original attachments only if the new attachment was created successfully
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

                //console.log(payload);
                const jobId = await queue.push(payload);
            
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