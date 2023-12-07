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

  function ToggleWithLabel({ label, checked, onChange, id, description, tagData, onAddTag, onRemoveTag }) {


    const labelStyle = {
        flexGrow: 1,
        marginRight: token('space.100', '8px'), 
      };
      
      const toggleWrapperStyle = {
        display: 'flex',
        flexDirection: 'column',
        marginBottom: token('space.250', '20px'),
      };
      
      const toggleRowStyle = {
        display: 'flex',
        alignItems: 'center',
        marginBottom: token('space.100', '8px'),
      };
      
      const descriptionStyle = {
        fontSize: token('space.200', '16px'),
        color: token('color.text.accent.gray', '#6B778C'),
      };

      const [inputValue, setInputValue] = useState('');

      const handleAddTag = () => {
        if (inputValue.trim()) {
            onAddTag(inputValue); // Pass the inputValue, not the id
            setInputValue('');
        }
      };

      return (
        <div style={toggleWrapperStyle}>
            <div style={toggleRowStyle}>
                <CustomLabel htmlFor={id} style={labelStyle}>{label}</CustomLabel>
                <Toggle id={id} isChecked={checked} onChange={onChange} />
            </div>
            <p style={descriptionStyle}>{description}</p>
            {tagData && Array.isArray(tagData) && (
                <TagGroup>
                    {tagData.map((tag, index) => (
                        <Tag
                            key={index}
                            text={tag}
                            onAfterRemoveAction={() => onRemoveTag(id, tag)}
                            removeButtonText="Remove tag"
                        />
                    ))}
                </TagGroup>
            )}
            <div style={{ marginTop: '10px' }}>
                <TextField 
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Add a tag" 
                />
                <Button 
                    style={{ marginLeft: '10px' }} 
                    onClick={handleAddTag}
                    isDisabled={!inputValue.trim()}
                >
                    Add
                </Button>
            </div>
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
        const updatedTags = settings[key].filter(tag => tag !== tagToRemove);
        setSettings(prevSettings => ({ ...prevSettings, [key]: updatedTags }));
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
