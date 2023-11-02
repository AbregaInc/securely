import { Queue } from '@forge/events';

const queue = new Queue({ key: 'har-queue' });

export async function run(event, context) {
    console.log('starting run');
    console.log(JSON.stringify(event));

    if (event.eventType === 'avi:jira:created:attachment'){ 
        const fileName = event.attachment.fileName.toLowerCase();
        if (fileName.endsWith(".har") && !fileName.includes("-cleaned.har")) {

            const payload = {
                issueIdOrKey: event.attachment.issueId,
                fileName: event.attachment.fileName,
                attachmentId: event.attachment.id,
            };
            
            const jobId = await queue.push(payload);

            // Get the JobProgress object
            const jobProgress = queue.getJob(jobId);

            // Get stats of a particular job
            for (let i = 0; i < 5; i++) {
                // Wait for 5 seconds
                await new Promise(resolve => setTimeout(resolve, 5000));
                const asyncResponse = await jobProgress.getStats();
                console.log(await asyncResponse.json());
            }
        }
    }
}
