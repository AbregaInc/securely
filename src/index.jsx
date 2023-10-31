import api, { route } from "@forge/api";
import FormData from "form-data";
import { Buffer } from 'buffer';  // Import Buffer


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
        console.log(await response.json());

        return response.status === 200;
    } catch (error) {
        console.error('Error creating attachment:', error);
    }
}

async function processHarObject(harObject, issueIdOrKey, fileName, attachmentId) {
    console.log(Object.keys(harObject).length);
    const modifiedJson = { har: harObject };
    console.log(Object.keys(modifiedJson).length);

    try {
        const response = await api.fetch(`https://har.securely.abrega.com/scrub`, {
            body: JSON.stringify(modifiedJson),
            method: "post",
            headers: { 'Content-Type': 'application/json' },
        });

        const sanitizedContent = await response.json();
        console.log('scrubbed the file');

        // Create a new attachment with the sanitized content
        const isSuccess = await createAttachment(issueIdOrKey, sanitizedContent, fileName);

        // Delete the original attachment only if the new attachment was created successfully
        if (isSuccess) {
            await deleteAttachment(attachmentId);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

export async function run(event, context) {
    console.log('starting run');
    console.log(event);

    const fileName = event.attachment.fileName.toLowerCase();

    // Check if the event is a created attachment, the filename ends with ".har", and does not contain "-cleaned.har"
    if (event.eventType === 'avi:jira:created:attachment' && fileName.endsWith(".har") && !fileName.includes("-cleaned.har")) {
        const requestUrl = `/rest/api/3/attachment/content/${event.attachment.id}`;
        console.log(requestUrl);

        const response = await api.asApp().requestJira(route`${requestUrl}`, {
            headers: {
                'Accept': 'application/json'
            }
        });
        
        console.log(`Response: ${response.status} ${response.statusText}`);
        const jsonResponse = await response.json();  // Parse the response once

        await processHarObject(jsonResponse, event.attachment.issueId, event.attachment.fileName, event.attachment.id);  // Await the processing function
    }
}
