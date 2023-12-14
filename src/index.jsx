import { Queue } from '@forge/events';
import { storage } from '@forge/api';
const { createHash } = require('crypto');

const queue = new Queue({ key: 'har-queue' });

function hash(string) {
    return createHash('sha256').update(string).digest('hex');
  }

export async function run(event, context) {
    console.log('starting run');
    console.log(JSON.stringify(event));

    if (event.eventType === 'avi:jira:created:attachment'){ 
        if (event.attachment.size < 419430400){
            const fileName = event.attachment.fileName.toLowerCase();
            if (fileName.endsWith(".har") && !fileName.includes("-cleaned.har")) {
    
                /*
                const dedupeId = event.attachment.issueId + event.attachment.fileName + event.attachment.id;
                console.log('Dedupe ID: ', hash(dedupeId));
    
                const hasProcessed = await storage.get(hash(dedupeId));
                console.log("got dedupeid", hasProcessed)
                if (hasProcessed) {
                    console.log(`Duplicate found for ${dedupeId}, skipping processing.`);
                    return; // Stop processing if duplicate is found
                }
                */

                
                const payload = {
                    issueIdOrKey: event.attachment.issueId,
                    fileName: event.attachment.fileName,
                    attachmentId: event.attachment.id,
                };
    
                console.log(payload);
                const jobId = await queue.push(payload);
    
                return Promise.resolve({
                    statusCode: 200 
                });
    
                /* 
                // Get the JobProgress object
                const jobProgress = queue.getJob(jobId);
    
                Get stats of a particular job for 25 seconds
                for (let i = 0; i < 5; i++) {
                    // Wait for 5 seconds
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    const asyncResponse = await jobProgress.getStats();
                    console.log(await asyncResponse.json());
                }
                */
            }
        } else {
            console.error("Attachment was > 99MB in size: ", event.attachment.fileName)
        }
    }
}