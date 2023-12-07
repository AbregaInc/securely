import React, { useEffect, useState } from 'react';
import { invoke, view } from '@forge/bridge';
import Toggle from '@atlaskit/toggle';
import Page, { Grid, GridColumn } from '@atlaskit/page';
import '@atlaskit/css-reset';
import Heading from '@atlaskit/heading';
import { token } from '@atlaskit/tokens';
import TextField from '@atlaskit/textfield';
import Button from '@atlaskit/button';
import Tag from '@atlaskit/tag';

await view.theme.enable();

function SpecificScrubSettings({ settingsKey, settingsList, addFunc, removeFunc }) {
    const [newItem, setNewItem] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const handleAdd = () => {
        if (newItem) {
            addFunc(newItem);
            setNewItem('');
        } else {
            setErrorMessage('Please enter a value');
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: token('space.100', '8px'), marginBottom: token('space.200', '16px') }}>
                {settingsList.map((item) => (
                    <Tag key={item} text={item} removeButtonText="Remove" onAfterRemoveAction={() => removeFunc(item)} />
                ))}
            </div>
            <div style={{ marginBottom: token('space.500', '40px') }}>
                <TextField value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder={`Enter new ${settingsKey}`} elemAfterInput={
                    <Button appearance="primary" onClick={handleAdd}>Add</Button>
                } />
                {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}
            </div>
        </div>
    );
}

function ScrubWordsManager({ words, onAddWord, onRemoveWord, onReset, newWord, setNewWord, errorMessage }) {
    return (
        <>
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: token('space.100', '8px'),
                marginBottom: token('space.200', '16px')
            }}>
                {words.map((word) => (
                    <Tag 
                        key={word}
                        text={word}
                        removeButtonText="Remove"
                        onAfterRemoveAction={() => onRemoveWord(word)}
                    />
                ))}
            </div>
            <div style={{ marginBottom: token('space.500', '40px') }}>
                <TextField
                    value={newWord}
                    onChange={(e) => setNewWord(e.target.value)}
                    placeholder="Enter new word"
                    elemAfterInput={
                        <Button 
                            appearance="primary" 
                            onClick={onAddWord}
                        >
                            Add Word
                        </Button>
                    }
                />
                <p style={{ marginTop: token('space.100', '8px') }}>
                    Enter a word to add to the scrub list.
                </p>
                {errorMessage && (
                    <p style={{ color: 'red' }}>{errorMessage}</p>
                )}
                <Button 
                    appearance="warning" 
                    onClick={onReset}
                    style={{ marginTop: token('space.100', '8px') }}
                >
                    Reset Scrubed Words to Default
                </Button>
            </div>
        </>
    );
}


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
    addFunc, 
    removeFunc, 
    specificCategory = "", 
    words,
    addItem, 
    removeItem, 
    newWord, 
    setNewWord, 
    errorMessage 
}){
    
    console.log('Words:', words);

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

    // Function to generate dynamic description text
    const getDescriptionText = (category, isChecked) => {
        const baseText = `List of ${category} to scrub.`;
        const alternativeText = `List of ${category} not to scrub.`;
        return isChecked ? alternativeText : baseText;
    };

    // Use function to get description text only if specificCategory is provided
    const descriptionText = specificCategory ? getDescriptionText(specificCategory, checked) : null;
/*
    return (
        <div style={toggleWrapperStyle}>
            <div style={toggleRowStyle}>
                <CustomLabel htmlFor={id} style={labelStyle}>{label}</CustomLabel>
                <Toggle id={id} isChecked={checked} onChange={onChange} />
            </div>
            <p style={descriptionStyle}>{description}</p>
            {specificCategory && (
                <SpecificScrubSettings 
                    settingsKey={specificCategory} 
                    settingsList={words}
                    addFunc={addFunc} 
                    removeFunc={removeFunc} 
                />
            )}
            {specificCategory && descriptionText && <p style={descriptionStyle}>{descriptionText}</p>}
            {
                words && (
                    <ScrubWordsManager
                        words={words} // Use the words prop directly
                        onAddWord={(word) => addItem(wordsCategory, word)}
                        onRemoveWord={(word) => removeItem(wordsCategory, word)}
                        newWord={newWord}
                        setNewWord={setNewWord}
                        errorMessage={errorMessage}
                    />
                )
            }
        </div>
    );

    */

    return (
        <div style={toggleWrapperStyle}>
            <div style={toggleRowStyle}>
                <CustomLabel htmlFor={id} style={labelStyle}>{label}</CustomLabel>
                <Toggle id={id} isChecked={checked} onChange={onChange} />
            </div>
            <p style={descriptionStyle}>{description}</p>
            {specificCategory && descriptionText && <p style={descriptionStyle}>{descriptionText}</p>}
            {
                words && (  // Only render if words is provided
                    <ScrubWordsManager
                        words={words}
                        onAddWord={(word) => addItem(wordsCategory, word)}
                        onRemoveWord={(word) => removeItem(wordsCategory, word)}
                        newWord={newWord}
                        setNewWord={setNewWord}
                        errorMessage={errorMessage}
                    />
                )
            }
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
        scrubAllBodyContents: false, // Assuming this represents 'Remove the whole response body'
        specificHeaders: [],
        specificCookies: [],
        specificQueryParams: [],
        specificPostParams: [],
        specificResponseHeaders: [],
        specificMimeTypes: [],
    });

    const handleChange = async (key, event) => {
        const newValue = event.target.checked;
        const newSettings = { ...settings, [key]: newValue };
        setSettings(newSettings);
        await invoke('setSettings', { key, value: newValue });
    };

    const [newWord, setNewWord] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const addItem = (category, item) => {
        if (item && !settings[category].includes(item)) {
            setSettings(prevSettings => ({
                ...prevSettings,
                [category]: [...prevSettings[category], item]
            }));
            setNewWord('');  // Reset new word input
        } else {
            setErrorMessage('Item already exists or is invalid');
        }
    };
    
    const removeItem = (category, item) => {
        setSettings(prevSettings => ({
            ...prevSettings,
            [category]: prevSettings[category].filter(i => i !== item)
        }));
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
                    specificCategory="request headers"
                    description="HTTP headers contain metadata about the request or response, or about the object sent in the message body. Examples include Content-Type to describe the data format, Authorization for credentials, and User-Agent for client information."
                    words={settings.specificHeaders}
                    addItem={(item) => addItem('specificHeaders', item)}
                    removeItem={(item) => removeItem('specificHeaders', item)}
                    newWord={newWord}
                    setNewWord={setNewWord}
                    errorMessage={errorMessage}
                />

                <ToggleWithLabel
                    label="Remove all response headers"
                    checked={settings.scrubAllResponseHeaders}
                    onChange={(e) => handleChange('scrubAllResponseHeaders', e)}
                    id="scrubAllResponseHeaders"
                    specificCategory="response headers"
                    description="HTTP headers contain metadata about the request or response, or about the object sent in the message body. Examples include Content-Type to describe the data format, Authorization for credentials, and User-Agent for client information."
                    words={settings.specificResponseHeaders}
                    addItem={(item) => addItem('specificResponseHeaders', item)}
                    removeItem={(item) => removeItem('specificResponseHeaders', item)}
                    newWord={newWord}
                    setNewWord={setNewWord}
                    errorMessage={errorMessage}
                />

                <ToggleWithLabel
                    label="Remove all cookies"
                    checked={settings.scrubAllCookies}
                    onChange={(e) => handleChange('scrubAllCookies', e)}
                    id="scrubAllCookies"
                    specificCategory="request cookies"
                    description="Cookies are small pieces of data stored on the client side, which are sent to the server with each HTTP request. They are used to remember stateful information for the user between page requests, such as login status or preferences."
                    words={settings.specificCookies}
                    addItem={(item) => addItem('specificCookies', item)}
                    removeItem={(item) => removeItem('specificCookies', item)}
                    newWord={newWord}
                    setNewWord={setNewWord}
                    errorMessage={errorMessage}
                />

                <ToggleWithLabel
                    label="Remove all query arguments"
                    checked={settings.scrubAllQueryParams}
                    onChange={(e) => handleChange('scrubAllQueryParams', e)}
                    id="scrubAllQueryParams"
                    specificCategory="query arguements"
                    description="Query arguments are part of the URL that provide additional parameters to the request. Starting with a ? symbol in the URL, they are formatted as key-value pairs separated by &, for example, ?search=query&sort=asc."
                    words={settings.specificQueryParams}
                    addItem={(item) => addItem('specificQueryParams', item)}
                    removeItem={(item) => removeItem('specificQueryParams', item)}
                    newWord={newWord}
                    setNewWord={setNewWord}
                    errorMessage={errorMessage}
                />

                <ToggleWithLabel
                    label="Remove all POST parameters"
                    checked={settings.scrubAllPostParams}
                    onChange={(e) => handleChange('scrubAllPostParams', e)}
                    id="scrubAllPostParams"
                    specificCategory="POST parameters"
                    description="POST parameters are included in the body of an HTTP POST request. They are used to send data to the server to be processed, such as form submissions or file uploads. Unlike query arguments, POST parameters are part of the request body and are a more secure way of transmitting sensitive information, as they are not exposed in URLs or server logs."
                    words={settings.specificPostParams}
                    addItem={(item) => addItem('specificPostParams', item)}
                    removeItem={(item) => removeItem('specificPostParams', item)}
                    newWord={newWord}
                    setNewWord={setNewWord}
                    errorMessage={errorMessage}
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
