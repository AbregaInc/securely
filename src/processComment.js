import Resolver from "@forge/resolver";
import api, { route } from "@forge/api";
import { storage } from '@forge/api';

const resolver = new Resolver();

async function updateMediaIdsInContentBlock(contentBlock) {
    if (contentBlock.type === 'mediaGroup') {
        for (const media of contentBlock.content) {
            if (media.type === 'media') {
                const processLog = 'processLog' + media.attrs.id;
                const storedNewId = await storage.get(processLog);
                if (storedNewId) {
                    media.attrs.id = storedNewId;
                }
            }
        }
    }
}

async function updateComment(issueIdOrKey, commentId, originalAttachmentMediaId, newAttachmentId) {
    console.log('updateComment');


    try {
        console.log('issue id', issueIdOrKey);
        console.log('comment id', commentId);

        // Fetch the comment body
        const commentResponse = await api.asApp().requestJira(route`/rest/api/3/issue/${issueIdOrKey}/comment/${commentId}`, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        const commentData = await commentResponse.json();
        const commentBody = commentData.body;

        console.log("Original Comment Body:");
        console.log(JSON.stringify(commentBody));

        // Replace the original attachment ID with the new one
        for (const contentBlock of commentBody.content) {
            await updateMediaIdsInContentBlock(contentBlock);
        }
        
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
        //console.log(await updateResponse.json());

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
        
        // TODO - This needs to support pagination. Possibly to be split out into an event queue.
        // Maybe not? I tested this with a ton of comments and it seems fine? However, this may fall
        // apart when we go to process lots of old content
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
        //console.log(JSON.stringify(commentsWithAttachment));

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

async function processFields(issueIdOrKey, originalAttachmentMediaId, newAttachmentId) {
    try {
        // Fetch the issue
        const issueResponse = await api.asApp().requestJira(route`/rest/api/3/issue/${issueIdOrKey}`, {
            headers: {
                'Accept': 'application/json'
            }
        });

        const issueData = await issueResponse.json();
        console.log('issue data');
        //console.log(JSON.stringify(issueData));

        const updatedIssueData = {};

        // Iterate over all fields
        for (const [fieldName, fieldValue] of Object.entries(issueData.fields)) {
            if (fieldValue && fieldValue.type === 'doc') {
                const hasAttachment = fieldValue.content.some(contentBlock => 
                    contentBlock.type === 'mediaGroup' &&
                    contentBlock.content.some(media => 
                        media.type === 'media' && 
                        media.attrs.id === originalAttachmentMediaId
                    )
                );

                if (hasAttachment) {
                    console.log(`${fieldName} contains the specified attachment.`);

                    // Find and update the media group that contains the original attachment
                    for (const [fieldName, fieldValue] of Object.entries(issueData.fields)) {
                        if (fieldValue && fieldValue.type === 'doc') {
                            for (const contentBlock of fieldValue.content) {
                                await updateMediaIdsInContentBlock(contentBlock);
                            }
                        }
                    }

                    // Update the field in updatedIssueData
                    if (!updatedIssueData.fields) {
                        updatedIssueData.fields = {};
                    }
                    updatedIssueData.fields[fieldName] = fieldValue;
                }
            }
        }

        console.log('updatedIssueData');
        console.log(JSON.stringify(updatedIssueData));

        // Update the issue with the updated fields
        if (Object.keys(updatedIssueData).length) {
            try {
                const issueUpdateResponse = await api.asApp().requestJira(route`/rest/api/3/issue/${issueIdOrKey}`, {
                    method: 'PUT',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updatedIssueData)
                });

                console.log(`Response: ${issueUpdateResponse.status} ${issueUpdateResponse.statusText}`);

                if (issueUpdateResponse.ok && issueUpdateResponse.status !== 204) {
                    const responseBody = await issueUpdateResponse.json();
                    console.log(responseBody);
                } else if (issueUpdateResponse.status === 204) {
                    console.log('Issue updated successfully, but no content in response.');
                } else {
                    console.log('Response received, but it was not successful:', issueUpdateResponse.status);
                }
            } catch (error) {
                console.error('Error occurred while updating the issue:', error);
            }
        } else {
            console.log('No fields contain the specified attachment');
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
    console.log('processComments.js');
    console.log(JSON.stringify(context));

    const {attachmentId, issueIdOrKey, originalAttachmentMediaId, newAttachmentMediaId} = payload;

    console.log(attachmentId, issueIdOrKey, originalAttachmentMediaId, newAttachmentMediaId)

    try {
                await deleteAttachment(attachmentId);
                await processComments(issueIdOrKey, originalAttachmentMediaId, newAttachmentMediaId);
                await processFields(issueIdOrKey, originalAttachmentMediaId, newAttachmentMediaId);
                return Promise.resolve({
                    statusCode: 200 
                });
    } catch (error) {
        console.error('Error:', error);
    }
});

export const handler = resolver.getDefinitions();
