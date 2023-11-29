import Resolver from "@forge/resolver";
import api, { route } from "@forge/api";

const resolver = new Resolver();

async function updateComment(issueIdOrKey, commentId, originalAttachmentMediaId, newAttachmentId) {
    console.log('updateComment');


    try {
        console.log('issue id', issueIdOrKey);
        console.log('comment id', commentId);

        // Fetch the comment body
        console.log("VERSION TEST 123456")
        const commentResponse = await api.asApp().requestJira(route`/rest/api/3/issue/${issueIdOrKey}/comment/${commentId}`, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        console.log('2');
        const commentData = await commentResponse.json();
        console.log('3');
        const commentBody = commentData.body;

        console.log("Original Comment Body:");
        console.log(JSON.stringify(commentBody));

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


        console.log("Updated Comment Body:");
        console.log(JSON.stringify(commentBody));

        // Update the comment 
        const updateResponse = await api.asApp().requestJira(route`/rest/api/3/issue/${issueIdOrKey}/comment/${commentId}`, {
            method: 'PUT',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                body: commentBody
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

        //console.log('All comments on the issue (within a given page)');
        //console.log(JSON.stringify(commentBodyResponseJson));        
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

        for (const comment of commentsWithAttachment) {
            try {
                await updateComment(issueIdOrKey, comment.id, originalAttachmentMediaId, newAttachmentId);
    
            } catch (commentError) {
                console.error('Error updating comment:', commentError);
            }
        }
        
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

resolver.define("processComment", async ({ payload, context }) => {
    console.log('Consumer function invoked');
    console.log(JSON.stringify(context));

    const {attachmentId, issueIdOrKey, originalAttachmentMediaId, newAttachmentMediaId} = payload;
    console.log('processComments.js');
    console.log(attachmentId, issueIdOrKey, originalAttachmentMediaId, newAttachmentMediaId)

    try {
                await deleteAttachment(attachmentId);
                await processComments(issueIdOrKey, originalAttachmentMediaId, newAttachmentMediaId);
                return Promise.resolve({
                    statusCode: 200 
                });
    } catch (error) {
        console.error('Error:', error);
    }
});

export const handler = resolver.getDefinitions();
