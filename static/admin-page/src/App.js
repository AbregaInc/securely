import React, { useEffect, useState } from 'react';
import { invoke, view } from '@forge/bridge';
import Toggle from '@atlaskit/toggle';
import Page, { Grid, GridColumn } from '@atlaskit/page';
import '@atlaskit/css-reset';
import Heading from '@atlaskit/heading';
import { token } from '@atlaskit/tokens';
import TagGroup from '@atlaskit/tag-group';
import Tag from '@atlaskit/tag';
import TextField from '@atlaskit/textfield';
import Button from '@atlaskit/button';

await view.theme.enable();

function CustomLabel({ htmlFor, children, style }) {
    return (
      <label htmlFor={htmlFor} style={style}>
        {children}
      </label>
    );
  }

  function ToggleWithLabel({ 
    label, 
    checked, 
    onChange, 
    id, 
    description, 
    tagData, 
    onAddTag, 
    onRemoveTag,
    subHeadingOn, 
    subHeadingOff, 
    subDescriptionOn, 
    subDescriptionOff
}) {

    const labelStyle = {
        flexGrow: 1,
        marginRight: token('space.100', '8px'),
        fontSize: '16px', // adjust as needed
        fontWeight: 'bold', // adjust as needed
      };
      
      const toggleWrapperStyle = {
        display: 'flex',
        flexDirection: 'column',
        marginBottom: token('space.250', '20px'),
      };
      
      const toggleRowStyle = {
        display: 'flex',
        alignItems: 'center',
        marginBottom: token('space.200', '16px'),
      };
      
      const descriptionStyle = {
        fontSize: token('space.150', '14px'),
        color: token('color.text.accent.gray', '#6B778C'),
      };

      const tagInputStyle = {
        display: 'flex',
        alignItems: 'center',
        marginTop: '10px'
    };

    const subHeadingStyle = {
        fontSize: '14px', // adjust as needed
        fontWeight: 'bold', // adjust as needed
        marginTop: '10px'
    };

    const subDescriptionStyle = {
        fontSize: '14px', // adjust as needed
        color: 'grey', // adjust as needed
        marginTop: '5px'
    };

      const [inputValue, setInputValue] = useState('');

    const handleAddTagInternal = () => {
        if (inputValue.trim()) {
            onAddTag(inputValue);
            setInputValue('');
        }
    };

    // Condition to check if tag-related elements should be rendered
    const shouldRenderTags = tagData && onAddTag && onRemoveTag;



    return (
        <div style={toggleWrapperStyle}>
            <div style={toggleRowStyle}>
                <CustomLabel htmlFor={id} style={labelStyle}>{label}</CustomLabel>
                <Toggle id={id} isChecked={checked} onChange={onChange} />
            </div>
            <p style={descriptionStyle}>{description}</p>

            {shouldRenderTags && (
                <>
                    {checked 
                        ? subHeadingOn && <div style={subHeadingStyle}>{subHeadingOn}</div>
                        : subHeadingOff && <div style={subHeadingStyle}>{subHeadingOff}</div>}
                    {checked 
                        ? subDescriptionOn && <div style={subDescriptionStyle}>{subDescriptionOn}</div>
                        : subDescriptionOff && <div style={subDescriptionStyle}>{subDescriptionOff}</div>}
                    <TagGroup>
                        {tagData.map((tag) => (
                            <Tag
                                key={tag}
                                text={tag}
                                onAfterRemoveAction={() => onRemoveTag(tag)}
                                removeButtonText="Remove tag"
                            />
                        ))}
                    </TagGroup>
                    <div style={tagInputStyle}>
                        <TextField 
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Add a tag" 
                        />
                        <Button 
                            style={{ marginLeft: '10px' }}
                            onClick={handleAddTagInternal}
                            isDisabled={!inputValue.trim()}
                        >
                            Add
                        </Button>
                    </div>
                </>
            )}
        </div>
    );
}


function App() {
    const [settings, setSettings] = useState({
        scrubAllRequestHeaders: false,
        scrubAllResponseHeaders: false,
        scrubAllCookies: false,
        scrubAllQueryParams: false,
        scrubAllPostParams: false,
        scrubAllBodyContents: false, 
        scrubSpecificHeader: [],
        scrubSpecificCookie: [],
        scrubSpecificQueryParam: [], 
        scrubSpecificPostParam: [], 
        scrubSpecificResponseHeader: [], 
        scrubSpecificMimeTypes: [],
    });

    const handleChange = async (key, event) => {
        const newValue = event.target.checked;
        setSettings(prevSettings => ({ ...prevSettings, [key]: newValue }));
        await invoke('setSettings', { key, value: newValue });
    };

    // Function to handle addition of a tag
    const handleAddTag = async (key, newTag) => {
        const currentTags = Array.isArray(settings[key]) ? settings[key] : [];
    
        // Check if the tag already exists
        if (!currentTags.includes(newTag)) {
            const updatedTags = [...currentTags, newTag];
            setSettings(prevSettings => ({ ...prevSettings, [key]: updatedTags }));
            await invoke('setSettings', { key, value: updatedTags });
        } else {
            // Optionally, provide feedback to the user that the tag already exists
            console.log("Tag already exists:", newTag);
            // Or use a UI element to show a message
        }
    };

    const handleRemoveTag = async (key, tagToRemove) => {
        const currentTags = Array.isArray(settings[key]) ? settings[key] : [];
        const updatedTags = currentTags.filter(tag => tag !== tagToRemove);
    
        console.log(`Before state update:`, settings[key]); // Log current state
        console.log(`Removing tag:`, tagToRemove);
        console.log(`Updated tags:`, updatedTags); // Log updated tags

        // Update the state
        setSettings(prevSettings => ({ ...prevSettings, [key]: updatedTags }));
    
        // Persist the change to the backend using the updatedTags array
        await invoke('setSettings', { key, value: updatedTags });
    };

    useEffect(() => {
        invoke('getSettings').then(setSettings);
    }, []);

    return (
        <Page>
            <Grid>
                <GridColumn medium={8}>
                <Heading level="h600">HAR File Scrubbing Configuration</Heading>
                <p style={{marginBottom: token('space.500', '40px')}}>By default, Securely will scrub portions of a HAR file. You can read about this in <a href="https://abrega.gitbook.io/securely/secure-har-file-management-with-securely/what-is-sanitized">our documentation</a>.
                If you would like to scrub all of a given data element, then please enable that below.</p>

                <ToggleWithLabel
                    label="Remove all request headers"
                    checked={settings.scrubAllRequestHeaders}
                    onChange={(e) => handleChange('scrubAllRequestHeaders', e)}
                    id="scrubAllRequestHeaders"
                    tagData={settings.scrubSpecificHeader}
                    onAddTag={(tag) => handleAddTag('scrubSpecificHeader', tag)}
                    onRemoveTag={(tag) => handleRemoveTag('scrubSpecificHeader', tag)}
                    description="HTTP headers contain metadata about the request or response, or about the object sent in the message body. Examples include Content-Type to describe the data format, Authorization for credentials, and User-Agent for client information."
                    subHeadingOn="Except for these request headers"
                    subHeadingOff="And remove these request headers"
                    subDescriptionOn="Removes all request headers except the ones listed below."
                    subDescriptionOff="Removes only the request headers listed below."
                />

                <ToggleWithLabel
                    label="Remove all response headers"
                    checked={settings.scrubAllResponseHeaders}
                    onChange={(e) => handleChange('scrubAllResponseHeaders', e)}
                    id="scrubAllResponseHeaders"
                    tagData={settings.scrubSpecificResponseHeader}
                    onAddTag={(tag) => handleAddTag('scrubSpecificResponseHeader', tag)}
                    onRemoveTag={(tag) => handleRemoveTag('scrubSpecificResponseHeader', tag)}
                    description="HTTP headers contain metadata about the request or response, or about the object sent in the message body. Examples include Content-Type to describe the data format, Authorization for credentials, and User-Agent for client information."
                    subHeadingOn="Except for these response headers"
                    subHeadingOff="And remove these response headers"
                    subDescriptionOn="Removes all request response except the ones listed below."
                    subDescriptionOff="Removes only the response headers listed below."
                />

                <ToggleWithLabel
                    label="Remove all cookies"
                    checked={settings.scrubAllCookies}
                    onChange={(e) => handleChange('scrubAllCookies', e)}
                    id="scrubAllCookies"
                    tagData={settings.scrubSpecificCookie}
                    onAddTag={(tag) => handleAddTag('scrubSpecificCookie', tag)}
                    onRemoveTag={(tag) => handleRemoveTag('scrubSpecificCookie', tag)}
                    description="Cookies are small pieces of data stored on the client side, which are sent to the server with each HTTP request. They are used to remember stateful information for the user between page requests, such as login status or preferences."
                    subHeadingOn="Except for these cookies"
                    subHeadingOff="And remove these cookies"
                    subDescriptionOn="Removes all cookies except the ones listed below."
                    subDescriptionOff="Removes only the cookies listed below."
                />

                <ToggleWithLabel
                    label="Remove all query arguments"
                    checked={settings.scrubAllQueryParams}
                    onChange={(e) => handleChange('scrubAllQueryParams', e)}
                    id="scrubAllQueryParams"
                    tagData={settings.scrubSpecificQueryParam}
                    onAddTag={(tag) => handleAddTag('scrubSpecificQueryParam', tag)}
                    onRemoveTag={(tag) => handleRemoveTag('scrubSpecificQueryParam', tag)}
                    description="Query arguments are part of the URL that provide additional parameters to the request. Starting with a ? symbol in the URL, they are formatted as key-value pairs separated by &, for example, ?search=query&sort=asc."
                    subHeadingOn="Except for these query arguments"
                    subHeadingOff="And remove these query arguments"
                    subDescriptionOn="Removes all query arguments except the ones listed below."
                    subDescriptionOff="Removes only the query arguments listed below."
                />

                <ToggleWithLabel
                    label="Remove all POST parameters"
                    checked={settings.scrubAllPostParams}
                    onChange={(e) => handleChange('scrubAllPostParams', e)}
                    id="scrubAllPostParams"
                    tagData={settings.scrubSpecificPostParam}
                    onAddTag={(tag) => handleAddTag('scrubSpecificPostParam', tag)}
                    onRemoveTag={(tag) => handleRemoveTag('scrubSpecificPostParam', tag)}
                    description="POST parameters are included in the body of an HTTP POST request. They are used to send data to the server to be processed, such as form submissions or file uploads. Unlike query arguments, POST parameters are part of the request body and are a more secure way of transmitting sensitive information, as they are not exposed in URLs or server logs."
                    subHeadingOn="Except for these POST parameters"
                    subHeadingOff="And remove these POST parameters"
                    subDescriptionOn="Removes all POST parameters except the ones listed below."
                    subDescriptionOff="Removes only the POST parameters listed below."
                />

                <ToggleWithLabel
                    label="Remove the whole response body"
                    checked={settings.scrubAllBodyContents}
                    onChange={(e) => handleChange('scrubAllBodyContents', e)}
                    id="scrubAllBodyContents"
                    description="The response body often contains the bulk of the data returned by a request, including HTML, JSON, XML, or other formats. Removing it can prevent sensitive data exposure, particularly in responses that include user or application data."
                />

                </GridColumn>
            </Grid>
        </Page>
    );
}

export default App;
