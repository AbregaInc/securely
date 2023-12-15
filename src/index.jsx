import { Queue } from '@forge/events';
import { storage } from '@forge/api';
const { createHash } = require('crypto');

const queue = new Queue({ key: 'har-queue' });

function hash(string) {
    return createHash('sha256').update(string).digest('hex');
  }

export async function run(event, context) {
    //console.log('starting run');
    //console.log(JSON.stringify(event));

    if (event.eventType === 'avi:jira:created:attachment'){ 
        if (event.attachment.size < 78643200){  //in bytes
            const fileName = event.attachment.fileName.toLowerCase();
            if (fileName.endsWith(".har") && !fileName.includes("-cleaned.har")) {
                
                const payload = {
                    issueIdOrKey: event.attachment.issueId,
                    fileName: event.attachment.fileName,
                    attachmentId: event.attachment.id,
                };
    
                console.log(payload);
                const jobId = await queue.push(payload);

                console.log()
    
                return Promise.resolve({
                    statusCode: 200 
                });
    
            } else {
                console.error("Attachment was not a HAR file");
            }
        } else {
            console.error("Attachment was > 75MB in size: ", event.attachment.fileName);
        }
    }
}