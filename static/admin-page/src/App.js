import React, { useEffect, useState } from 'react';
import { invoke, view } from '@forge/bridge';
import Toggle from '@atlaskit/toggle';
import Page from '@atlaskit/page';
import { Grid } from '@atlaskit/primitives';
import '@atlaskit/css-reset';
import Heading from '@atlaskit/heading';
import { token } from '@atlaskit/tokens';
import TagGroup from '@atlaskit/tag-group';
import Tag from '@atlaskit/tag';
import TextField from '@atlaskit/textfield';
import Button from '@atlaskit/button';
import Spinner from '@atlaskit/spinner';

await view.theme.enable();

function CustomLabel({ htmlFor, children, style }) {
    return (
        <label htmlFor={htmlFor} style={style}>
            {children}
        </label>
    );
}

function TagManager({
    tagData,
    onAddTag,
    onRemoveTag,
    subHeading,
    subDescription
}) {
    console.log("Rendering TagManager, tagData:", tagData);
    const [inputValue, setInputValue] = useState('');

    const handleAddTagInternal = () => {
        if (inputValue.trim()) {
            onAddTag(inputValue);
            setInputValue('');
        }
    };

    const tagInputStyle = {
        display: 'flex',
        alignItems: 'center',
        marginTop: '10px',
        marginBottom: token('space.500', '40px')
    };

    const subHeadingStyle = {
        fontSize: '14px',
        fontWeight: 'bold',
        marginTop: '10px'
    };

    const subDescriptionStyle = {
        fontSize: '14px',
        color: 'grey',
        marginTop: '5px'
    };

    return (
        <div>
            {subHeading && <div style={subHeadingStyle}>{subHeading}</div>}
            {subDescription && <div style={subDescriptionStyle}>{subDescription}</div>}
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
        </div>
    );
}


function ToggleWithLabel({
    label,
    checked,
    onChange,
    id,
    description,
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
    };

    const toggleRowStyle = {
        display: 'flex',
        alignItems: 'center',
    };

    const descriptionStyle = {
        fontSize: token('space.150', '14px'),
        color: token('color.text.accent.gray', '#6B778C'),
    };

    return (
        <div style={toggleWrapperStyle}>
            <div style={toggleRowStyle}>
                <CustomLabel htmlFor={id} style={labelStyle}>{label}</CustomLabel>
                <Toggle id={id} isChecked={checked} onChange={onChange} />
            </div>
            <p style={descriptionStyle}>{description}</p>
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


    const [isLoading, setIsLoading] = useState(false); // New loading state

    const handleChange = async (key, event) => {
        setIsLoading(true); // Start loading
        const newValue = event.target.checked;
        setSettings(prevSettings => ({ ...prevSettings, [key]: newValue }));
        await invoke('setSettings', { key, value: newValue });
        setIsLoading(false); // End loading
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

    const handleResetToDefaults = async () => {
        await invoke('resetToDefaults');
        // Fetch and set the updated settings from the backend
        const updatedSettings = await invoke('getSettings');
        setSettings(updatedSettings);
    };

    useEffect(() => {
        const fetchSettings = async () => {
            setIsLoading(true); // Start loading on first load
            const loadedSettings = await invoke('getSettings');
            setSettings(loadedSettings);
            setIsLoading(false); // Stop loading after settings are loaded
        };
    
        fetchSettings();
    }, []);

    return (
        <Page>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            {isLoading ? (
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                        <Spinner size="large" />
                    </div>
                ) : (
                    <Grid templateColumns="1fr" gap="space.200">
                            <Grid templateColumns="repeat(2, 1fr)" gap="space.200">
                            <div>
                                <Heading level="h600">HAR File Scrubbing Configuration</Heading>
                                <p style={{ marginBottom: token('space.500', '40px') }}>
                                    By default, Securely will scrub portions of a HAR file. You can read about this in <a href="https://abrega.gitbook.io/securely/secure-har-file-management-with-securely/what-is-sanitized">our documentation</a>.
                                    If you would like to scrub all of a given data element, then please enable that below.
                                </p>                
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <Button onClick={handleResetToDefaults}>Reset All Settings to Default</Button>
                            </div>
                            </Grid>
                            <ToggleWithLabel
                                label="Remove all request headers"
                                checked={settings.scrubAllRequestHeaders}
                                onChange={(e) => handleChange('scrubAllRequestHeaders', e)}
                                id="scrubAllRequestHeaders"
                                description="HTTP headers contain metadata about the request or response, or about the object sent in the message body. Examples include Content-Type to describe the data format, Authorization for credentials, and User-Agent for client information."
                            />

                            <TagManager
                                tagData={settings.scrubSpecificHeader}
                                onAddTag={(tag) => handleAddTag('scrubSpecificHeader', tag)}
                                onRemoveTag={(tag) => handleRemoveTag('scrubSpecificHeader', tag)}
                                subHeading={settings.scrubAllRequestHeaders ? "Exclude these request headers" : "Only remove these request headers"}
                                subDescription={settings.scrubAllRequestHeaders ? "Removes all request headers except the ones listed below." : "Removes only the request headers listed below."}
                            />

                            <hr />

                            <ToggleWithLabel
                                label="Remove all response headers"
                                checked={settings.scrubAllResponseHeaders}
                                onChange={(e) => handleChange('scrubAllResponseHeaders', e)}
                                id="scrubAllResponseHeaders"
                                description="HTTP headers contain metadata about the request or response, or about the object sent in the message body. Examples include Content-Type to describe the data format, Authorization for credentials, and User-Agent for client information."
                            />
                            <TagManager
                                tagData={settings.scrubSpecificResponseHeader}
                                onAddTag={(tag) => handleAddTag('scrubSpecificResponseHeader', tag)}
                                onRemoveTag={(tag) => handleRemoveTag('scrubSpecificResponseHeader', tag)}
                                subHeading={settings.scrubAllResponseHeaders ? "Exclude these response headers" : "Only remove these response headers"}
                                subDescription={settings.scrubAllResponseHeaders ? "Removes all request response except the ones listed below." : "Removes only the response headers listed below."}
                            />

                            <hr />
                            <ToggleWithLabel
                                label="Remove all cookies"
                                checked={settings.scrubAllCookies}
                                onChange={(e) => handleChange('scrubAllCookies', e)}
                                id="scrubAllCookies"
                                description="Cookies are small pieces of data stored on the client side, which are sent to the server with each HTTP request. They are used to remember stateful information for the user between page requests, such as login status or preferences."
                            />
                            <TagManager
                                tagData={settings.scrubSpecificCookie}
                                onAddTag={(tag) => handleAddTag('scrubSpecificCookie', tag)}
                                onRemoveTag={(tag) => handleRemoveTag('scrubSpecificCookie', tag)}
                                subHeading={settings.scrubAllCookies ? "Exclude these cookies" : "Only remove these cookies"}
                                subDescription={settings.scrubAllCookies ? "Removes all cookies except the ones listed below." : "Removes only the cookies listed below."}
                            />
                            <hr />

                            <ToggleWithLabel
                                label="Remove all query arguments"
                                checked={settings.scrubAllQueryParams}
                                onChange={(e) => handleChange('scrubAllQueryParams', e)}
                                id="scrubAllQueryParams"
                                description="Query arguments are part of the URL that provide additional parameters to the request. Starting with a ? symbol in the URL, they are formatted as key-value pairs separated by &, for example, ?search=query&sort=asc."
                            />
                            <TagManager
                                tagData={settings.scrubSpecificQueryParam}
                                onAddTag={(tag) => handleAddTag('scrubSpecificQueryParam', tag)}
                                onRemoveTag={(tag) => handleRemoveTag('scrubSpecificQueryParam', tag)}
                                subHeading={settings.scrubAllQueryParams ? "Exclude these query arguments" : "Only remove these query arguments"}
                                subDescription={settings.scrubAllQueryParams ? "Removes all query arguments except the ones listed below." : "Removes only the query arguments listed below."}
                            />
                            <hr />

                            <ToggleWithLabel
                                label="Remove all POST parameters"
                                checked={settings.scrubAllPostParams}
                                onChange={(e) => handleChange('scrubAllPostParams', e)}
                                id="scrubAllPostParams"
                                description="POST parameters are included in the body of an HTTP POST request. They are used to send data to the server to be processed, such as form submissions or file uploads. Unlike query arguments, POST parameters are not visible in the URL."
                                />
                            <TagManager
                                tagData={settings.scrubSpecificPostParam}
                                onAddTag={(tag) => handleAddTag('scrubSpecificPostParamm', tag)}
                                onRemoveTag={(tag) => handleRemoveTag('scrubSpecificPostParam', tag)}
                                subHeading={settings.scrubSpecificPostParam ? "Exclude these query arguments" : "Only remove these query arguments"}
                                subDescription={settings.scrubAllPostParams ? "Removes all POST parameters except the ones listed below." : "Removes only the POST parameters listed below."}
                                />
                            <hr />
                            <ToggleWithLabel
                                label="Remove the whole response body"
                                checked={settings.scrubAllBodyContents}
                                onChange={(e) => handleChange('scrubAllBodyContents', e)}
                                id="scrubAllBodyContents"
                                description="The response body often contains the bulk of the data returned by a request, including HTML, JSON, XML, or other formats. Removing it can prevent sensitive data exposure, particularly in responses that include user or application data."
                            />
                            <TagManager
                                tagData={settings.scrubSpecificMimeTypes}
                                onAddTag={(tag) => handleAddTag('scrubSpecificMimeTypes', tag)}
                                onRemoveTag={(tag) => handleRemoveTag('scrubSpecificMimeTypes', tag)}
                                subHeading={settings.scrubAllBodyContents ? "Exclude responses with these MIME Types" : "Only remove responses with these MIME Types"}
                                subDescription={settings.scrubAllBodyContents ? "Removes all responses with MIME Types except the ones listed below." : "Removes only the responses with the MIME Types listed below."}
                            />
                        </Grid>
                    )}
            </div>
        </Page>
    );
}

export default App;
