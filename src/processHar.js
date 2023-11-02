import Resolver from "@forge/resolver";
import api, { route } from "@forge/api";
import FormData from "form-data";
import { Buffer } from 'buffer';  // Import Buffer
import {InvocationError, InvocationErrorCode} from "@forge/events";

const resolver = new Resolver();

function extractIdFromAttachmentResponse(response) {
    // Assuming the response is an array and you're interested in the first element
    const selfUrl = response[0].self;

    // Use a regular expression to extract the desired ID
    const match = selfUrl.match(/ex\/jira\/([a-f0-9-]+)\//);

    if (match) {
        return match[1]; // This is the extracted ID
    } else {
        console.error("ID not found in URL:", selfUrl);
        return null;
    }
}

function extractUUID(url) {
    const regex = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/;
    const match = url.match(regex);
    return match ? match[0] : null;
}

async function updateComment(issueIdOrKey, commentId, originalAttachmentMediaId, newAttachmentId) {
    try {
        // Fetch the comment body
        const commentResponse = await api.asApp().requestJira(route`/rest/api/3/issue/${issueIdOrKey}/comment/${commentId}`, {
            headers: {
                'Accept': 'application/json'
            }
        });

        const commentData = await commentResponse.json();
        const commentBody = commentData.body;

        // Replace the original attachment ID with the new one
        commentBody.content.forEach(contentBlock => {
            if (contentBlock.type === 'mediaGroup') {
                contentBlock.content.forEach(media => {
                    if (media.type === 'media' && media.attrs.id === originalAttachmentMediaId) {
                        media.attrs.id = newAttachmentId;
                    }
                });
            }
        });

        // Update the comment

        // Currently this fails with:
        // INFO    09:49:46.063  1e238f12-05f3-4703-be2c-2720d7c4f8fd  Update Response: 400 Bad Request
        // INFO    09:49:46.063  1e238f12-05f3-4703-be2c-2720d7c4f8fd  { errorMessages: [ 'ATTACHMENT_VALIDATION_ERROR' ], errors: {} }
        const updateResponse = await api.asApp().requestJira(route`/rest/api/3/issue/${issueIdOrKey}/comment/${commentId}`, {
            method: 'PUT',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                body: commentBody,
                // Include other fields you want to update or keep the same
            })
        });

        console.log(`Update Response: ${updateResponse.status} ${updateResponse.statusText}`);
        console.log(await updateResponse.json());

    } catch (error) {
        console.error('Error updating comment:', error);
    }
}


async function processComments(issueIdOrKey, originalAttachmentMediaId, newAttachmentId) {
    try {
        // Fetch comments for the issue
        const issueCommentsResponse = await api.asApp().requestJira(route`/rest/api/3/issue/${issueIdOrKey}/comment`, {
            headers: {
                'Accept': 'application/json'
            }
        });

        const commentsData = await issueCommentsResponse.json();

        var ids = commentsData.comments.map(function(comment) {
            return parseInt(comment.id, 10);
          });
          
        var bodyData = JSON.stringify({ ids: ids }, null, 2);
          
        console.log(bodyData);
        
        //TODO - This needs to support pagination. Possibly to be split out into an event queue.
        const commentBodyResponse = await api.asApp().requestJira(route`/rest/api/3/comment/list`, {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            body: bodyData
          });

        const commentBodyResponseJson = await commentBodyResponse.json();

        console.log('comment body');
        console.log(JSON.stringify(commentBodyResponseJson));        
        //console.log(`Response: ${commentBodyResponse.status} ${commentBodyResponse.statusText}`);
        //console.log(await commentBodyResponse.text());


        const commentsWithAttachment = commentBodyResponseJson.values.filter(comment => {
            // Check if the comment's body contains a mediaGroup with a media element having the originalAttachmentMediaId
            return comment.body.content.some(contentBlock => 
                contentBlock.type === 'mediaGroup' && 
                contentBlock.content.some(media => 
                    media.type === 'media' && 
                    media.attrs.id === originalAttachmentMediaId
                )
            );
        });

        console.log(originalAttachmentMediaId);
        console.log('comments with attachments')
        console.log(JSON.stringify(commentsWithAttachment));

        commentsWithAttachment.forEach(comment => {
            updateComment(issueIdOrKey, comment.id, originalAttachmentMediaId, newAttachmentId);
        });

    } catch (error) {
        console.error('Error processing comments:', error);
    }
}

async function deleteAttachment(attachmentId) {
    try {
        const response = await api.asApp().requestJira(route`/rest/api/3/attachment/${attachmentId}`, {
            method: 'DELETE'
        });

        console.log(`Response: ${response.status} ${response.statusText}`);
        console.log(await response.text());
    } catch (error) {
        console.error('Error deleting attachment:', error);
    }
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
        const extractedId = extractIdFromAttachmentResponse(responseJson);
        console.log('New Attachment ID:')
        console.log("Create Attachment extracted id", extractedId);
        console.log("Create Attachment Response Json:", responseJson);

        return {
            status: response.status === 200,
            id: extractedId
        };
        
    } catch (error) {
        console.error('Error creating attachment:', error);
    }
}

resolver.define("processEvent", async ({ payload, context }) => {
    console.log('Consumer function invoked');

    const {issueIdOrKey, fileName, attachmentId} = payload;
    // ... rest of the code
    console.log('processHar.js');
    console.log(issueIdOrKey, fileName, attachmentId)


    const requestUrl = `/rest/api/3/attachment/content/${attachmentId}`;
    console.log(requestUrl);

    const response = await api.asApp().requestJira(route`${requestUrl}`, {
        headers: {
            'Accept': 'application/json'
        }
    });
    
    console.log(`Response: ${response.status} ${response.statusText} ${response.url}`);

    const originalAttachmentMediaId = extractUUID(response.url);

    const harObject = await response.json();  // Parse the response once


    const modifiedJson = { har: harObject };

    try {
        console.log('scrubbing the file');
        // TODO - this probably also needs some kind of trigger callback in case scrubbing takes longer
        // than the max function runtime.
        const response = await api.fetch(`https://har.securely.abrega.com/scrub`, {
            body: JSON.stringify(modifiedJson),
            method: "post",
            headers: { 'Content-Type': 'application/json' },
        });
        
        const responseText = await response.text();
        console.log('Har Cleaner Response Status:', response.status);

        if (response.ok) {  // Checks if status code is 200-299
            const sanitizedContent = JSON.parse(responseText);  // Parse the response text
            console.log('scrubbed the file');
            // Create a new attachment with the sanitized content
            const createAttachmentSuccessful = await createAttachment(issueIdOrKey, sanitizedContent, fileName);
            // Delete the original attachments only if the new attachment was created successfully
            if (createAttachmentSuccessful.status) {
                await deleteAttachment(attachmentId);
                
                console.log('Create attachment new id:', createAttachmentSuccessful.id);

                // TODO - fix this, failure documented above.
                //await processComments(issueIdOrKey, originalAttachmentMediaId, createAttachmentSuccessful.id);

                // TODO - looks like when an attachment comes in on an issue created event, we handle it correctly via the standard process
                // however, we need to update the description (and maybe other fields that can include media?) similar to what we're doing
                // with comments. The problem is that the attachment happens in it's own event, so we would need to ensure we go through and 
                // look for description and other fields to update only once the attachment replacing is completed. 

            }
        } else {
            // This happens when something fails on the Cloudflare side of things
            // Docs at https://developer.atlassian.com/platform/forge/runtime-reference/async-events-api/#retry-events

            console.error('Error from server:', responseText);
            return new InvocationError({

                // The App can request the retry to happen after a certain time period elapses
          
                retryAfter: 60, // seconds
          
                // The App should provide a reason as to why they are retrying.
          
                retryReason: InvocationErrorCode.FUNCTION_RETRY_REQUEST
              });
        }
    } catch (error) {
        console.error('Error:', error);
    }

});

export const handler = resolver.getDefinitions();
