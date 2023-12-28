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
import TrashIcon from '@atlaskit/icon/glyph/trash'
import AddCircleIcon from '@atlaskit/icon/glyph/add-circle'
import { requestJira } from '@forge/bridge';
import BannerWarning from './BannerWarning';


await view.theme.enable();

function CustomLabel({ htmlFor, children, style }) {
    return (
        <label htmlFor={htmlFor} style={style}>
            {children}
        </label>
    );
}

// Finding attachments and analyzing them

//helper function to get total issues we're analyzing
const fetchTotalIssueCount = async () => {
    const jqlQuery = {
        jql: "attachments is not empty",
        startAt: 0,
        maxResults: 1, // We only need the total count, not the actual issues
        fields: [] // No fields needed, just the count
    };

    const response = await requestJira('/rest/api/3/search', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(jqlQuery)
    });

    const data = await response.json();
    console.log(data);
    return data.total; // 'total' field typically holds the total count of issues
};


const expressionHar = "issues.map(issue => issue.attachments.filter(attachment => attachment.filename.match('.har$') != null && !attachment.filename.match('-cleaned.har$')).length).reduce((total, count) => total + count, 0)";
const expressionCleanedHar = "issues.map(issue => issue.attachments.filter(attachment => attachment.filename.match('-cleaned.har$') != null).length).reduce((total, count) => total + count, 0)";


// Analyse the expression
const analyseExpression = async (expression) => {
    const expressionData = JSON.stringify({
        contextVariables: {
            "issues": "List<Issue>"
        },
        expressions: [expression]
    });

    const queryParams = new URLSearchParams({ check: 'complexity' }).toString();

    const response = await requestJira(`/rest/api/3/expression/analyse?${queryParams}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: expressionData
    });

    return response.json();
};


// Evaluate the expression
const evaluateExpression = async (expression, totalIssues) => {
    let startAt = 0;
    const maxResults = 1000; // Adjust as needed
    const maxLoops = 90; // Maximum number of loops
    let loopCount = 0; // Current loop count
    let totalCount = 0;

    while (startAt < totalIssues && loopCount < maxLoops) {
        const evalData = JSON.stringify({
            context: {
                "issues": {
                    "jql": {
                        "query": "attachments is not empty",
                        "maxResults": maxResults,
                        "startAt": startAt
                    }
                }
            },
            expression: expression
        });

        const response = await requestJira('/rest/api/3/expression/eval', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: evalData
        });

        const result = await response.json();
        totalCount += result.value; // Assuming 'value' is the count from the expression

        startAt += maxResults;
        loopCount++;
    }

    return totalCount;
};


// Using the functions
const analysisResultHar = await analyseExpression(expressionHar);
const analysisResultCleanedHar = await analyseExpression(expressionCleanedHar);

// Function to check complexity
const isComplexityAcceptable = (analysisResult) => {
    return analysisResult.results.every(result => {
        const complexity = result.complexity;
        if (complexity) {
            const expensiveOps = parseInt(complexity.expensiveOperations, 10);
            return !isNaN(expensiveOps) && expensiveOps <= 10;
        }
        return true;
    });
};

// Check if both expressions are valid and not too complex
if (analysisResultHar.results.every(result => result.valid) && isComplexityAcceptable(analysisResultHar) &&
    analysisResultCleanedHar.results.every(result => result.valid) && isComplexityAcceptable(analysisResultCleanedHar)) {

    const totalIssueCount = await fetchTotalIssueCount();

    // Assuming analysis is done and expressions are valid
    const harCountResult = await evaluateExpression(expressionHar, totalIssueCount);
    console.log(`Total Count of .har files: ${harCountResult}`);

    const cleanedHarCountResult = await evaluateExpression(expressionCleanedHar, totalIssueCount);
    console.log(`Total Count of -cleaned.har files: ${cleanedHarCountResult}`);


} else {
    console.log("One or both expressions are invalid or too complex to evaluate.");
}

// end attachment analysis thing

const MAX_VALUE_LENGTH = 1024; // 1 KB per value
const MAX_TOTAL_LENGTH = 16384; // 16 KB total per setting

const validateInput = (inputValue, existingValues, type) => {
    if (inputValue.length > MAX_VALUE_LENGTH) {
        console.log("Value exceeds maximum length of 1 KB");
        return false;
    }

    const totalLength = existingValues.reduce((acc, value) => acc + value.length, inputValue.length);
    if (totalLength > MAX_TOTAL_LENGTH) {
        console.log("Total size of values exceeds limit of 16 KB");
        return false;
    }

    switch (type) {
        case 'header':
        case 'postParam':
            // Only allow A-Z, a-z, 0-9, hyphen (-), and underscore (_)
            return /^[A-Za-z0-9-_]+$/.test(inputValue);
        case 'cookie':
            // Allow printable ASCII except for control characters, spaces, tabs, and separators
            return /^[\u0021\u0023-\u002B\u002D-\u003A\u003C-\u005B\u005D-\u007E]+$/.test(inputValue);
        case 'queryArg':
            // Only allow A-Z, a-z, 0-9, hyphen (-), and underscore (_)
            return /^[A-Za-z0-9-_]+$/.test(inputValue);
        case 'mimeType':
            // Basic validation for MIME types
            return /^[A-Za-z0-9-/+]+$/.test(inputValue);
        default:
            return false;
    }
};


function TagManager({
    tagData,
    onAddTag,
    onRemoveTag,
    subHeading,
    subDescription,
    type
}) {
    const [inputValue, setInputValue] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [error, setError] = useState(''); // New state for error message

    const handleAddTagClick = () => {
        setIsAdding(true);
        setError('');
    };

    const handleAddTagInternal = () => {
        if (inputValue.trim() && validateInput(inputValue, tagData, type)) {
            onAddTag(inputValue);
            setInputValue('');
            setIsAdding(false);
        } else {
            setError('Invalid input'); // Set an error message
        }
    };

    // Update the handleInputChange function
    const handleInputChange = (e) => {
        setInputValue(e.target.value);
        if (!validateInput(e.target.value, tagData, type)) {
            setError('Invalid input');
        } else {
            setError('');
        }
    };

    const handleCancel = () => {
        setInputValue('');
        setIsAdding(false);
        setError(''); // Clear error message on cancel
    };

    const tagInputStyle = {
        display: 'flex',
        alignItems: 'center',
        marginTop: '20px',
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

    const buttonStyle = {
        marginLeft: '10px', // Spacing between buttons and input field
    };

    const addTagButtonStyle = {
        marginTop: '20px',
        appearance: isAdding ? 'primary' : 'initial',
    };

    const headingRowStyle = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between', // Aligns items to start and end of the container
        marginBottom: '10px' // Adjust as needed
    };

    return (
        <div>
            <div style={headingRowStyle}>
                {subHeading && <div style={subHeadingStyle}>{subHeading}</div>}
                {!isAdding && (
                    <Button onClick={handleAddTagClick}
                        style={addTagButtonStyle}
                        iconAfter={<AddCircleIcon label="" size="small" />}
                    >
                        Add
                    </Button>
                )}
            </div>
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
            {isAdding && (
                <div>
                    <div style={tagInputStyle}>
                        <TextField
                            value={inputValue}
                            onChange={handleInputChange}
                            placeholder="Add a tag"
                            autoFocus
                        />
                        <Button style={buttonStyle} onClick={handleAddTagInternal} isDisabled={!inputValue.trim()}>Add</Button>
                        <Button style={buttonStyle} onClick={handleCancel}>X</Button>
                    </div>
                    {error && <div style={{ color: 'red', marginTop: '5px' }}>{error}</div>} {/* Display error message */}
                </div>
            )}
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
    
    const [showBanner, setShowBanner] = useState(true); // State to control banner visibility


    // State to hold the counts
    const [harCountResult, setHarCountResult] = useState(0);
    const [cleanedHarCountResult, setCleanedHarCountResult] = useState(0);
    const [isHarDataLoading, setIsHarDataLoading] = useState(true); 
    

    const [isLoading, setIsLoading] = useState(false); // Used for general settings

    const handleChange = async (key, event) => {
        //event.preventDefault(); // Prevent the default form submission behavior
        //setIsLoading(true); // Start loading. If uncommented, will cause flicker. Likely due to overlay issues in spinner.

        const newValue = event.target.checked;
        setSettings(prevSettings => ({ ...prevSettings, [key]: newValue }));

        await invoke('setSettings', { key, value: newValue });

        //setIsLoading(false); // End loading
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

        // Async function to load HAR file data
        const loadHarData = async () => {
            setIsHarDataLoading(true); // Set loading state for HAR data

            // Perform your analysis and evaluation here
            const totalIssueCount = await fetchTotalIssueCount();
            const harCount = await evaluateExpression(expressionHar, totalIssueCount);
            const cleanedHarCount = await evaluateExpression(expressionCleanedHar, totalIssueCount);

            // Update state with the HAR file counts
            setHarCountResult(harCount);
            setCleanedHarCountResult(cleanedHarCount);
            setIsHarDataLoading(false); // HAR data loading is complete
        };

        loadHarData();
    }, []);

    return (
        <Page>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            {showBanner && <BannerWarning />}
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
                                    If you would like to scrub all of a given data element, then please enable that below:
                                </p>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                <div style={{ alignSelf: 'stretch', textAlign: 'right' }}>
                                    <Button onClick={handleResetToDefaults} iconAfter={<TrashIcon label="" size="small" />}>
                                        Reset All Settings to Default
                                    </Button>
                                </div>
                                <div style={{ alignSelf: 'stretch', textAlign: 'right', marginTop: 'var(--ds-space-150, 12px)' }}>
                                    {isHarDataLoading ? (
                                        <div>Loading HAR Cleaning data...</div>
                                    ) : (
                                        <div>
                                            <p>HAR files at risk: {harCountResult}</p>
                                            <p>Cleaned HAR files: {cleanedHarCountResult}</p>
                                        </div>
                                    )}
                                </div>
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
                            type="header"
                            onAddTag={(tag) => handleAddTag('scrubSpecificHeader', tag)}
                            onRemoveTag={(tag) => handleRemoveTag('scrubSpecificHeader', tag)}
                            subHeading={settings.scrubAllRequestHeaders ? "Exclude these request headers" : "Only remove these request headers"}
                            subDescription={settings.scrubAllRequestHeaders ? "Removes all request headers except the ones listed below:" : "Removes only the request headers listed below:"}
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
                            type="header"
                            onAddTag={(tag) => handleAddTag('scrubSpecificResponseHeader', tag)}
                            onRemoveTag={(tag) => handleRemoveTag('scrubSpecificResponseHeader', tag)}
                            subHeading={settings.scrubAllResponseHeaders ? "Exclude these response headers" : "Only remove these response headers"}
                            subDescription={settings.scrubAllResponseHeaders ? "Removes all request response except the ones listed below:" : "Removes only the response headers listed below:"}
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
                            type="cookie"
                            onAddTag={(tag) => handleAddTag('scrubSpecificCookie', tag)}
                            onRemoveTag={(tag) => handleRemoveTag('scrubSpecificCookie', tag)}
                            subHeading={settings.scrubAllCookies ? "Exclude these cookies" : "Only remove these cookies"}
                            subDescription={settings.scrubAllCookies ? "Removes all cookies except the ones listed below:" : "Removes only the cookies listed below:"}
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
                            type="queryArg"
                            onAddTag={(tag) => handleAddTag('scrubSpecificQueryParam', tag)}
                            onRemoveTag={(tag) => handleRemoveTag('scrubSpecificQueryParam', tag)}
                            subHeading={settings.scrubAllQueryParams ? "Exclude these query arguments" : "Only remove these query arguments"}
                            subDescription={settings.scrubAllQueryParams ? "Removes all query arguments except the ones listed below:" : "Removes only the query arguments listed below:"}
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
                            type="postParam"
                            onAddTag={(tag) => handleAddTag('scrubSpecificPostParamm', tag)}
                            onRemoveTag={(tag) => handleRemoveTag('scrubSpecificPostParam', tag)}
                            subHeading={settings.scrubSpecificPostParam ? "Exclude these POST parameters" : "Only remove these POST parameters"}
                            subDescription={settings.scrubAllPostParams ? "Removes all POST parameters except the ones listed below:" : "Removes only the POST parameters listed below:"}
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
                            type="mimeType"
                            onAddTag={(tag) => handleAddTag('scrubSpecificMimeTypes', tag)}
                            onRemoveTag={(tag) => handleRemoveTag('scrubSpecificMimeTypes', tag)}
                            subHeading={settings.scrubAllBodyContents ? "Exclude responses with these MIME Types" : "Only remove responses with these MIME Types"}
                            subDescription={settings.scrubAllBodyContents ? "Removes all responses with MIME Types except the ones listed below:" : "Removes only the responses with the MIME Types listed below:"}
                        />
                    </Grid>
                )}
            </div>
        </Page>
    );
}

export default App;
