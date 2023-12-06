import React, { useEffect, useState } from 'react';
import { invoke, view } from '@forge/bridge';
import Toggle from '@atlaskit/toggle';
import Page, { Grid, GridColumn } from '@atlaskit/page';
import '@atlaskit/css-reset';
import Heading from '@atlaskit/heading';
import { token } from '@atlaskit/tokens';

await view.theme.enable();

function CustomLabel({ htmlFor, children, style }) {
    return (
      <label htmlFor={htmlFor} style={style}>
        {children}
      </label>
    );
  }

function ToggleWithLabel({ label, checked, onChange, id, description }) {
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
        all_req_headers: false,
        all_resp_headers: false,
        all_cookies: false,
        all_mimetypes: false,
        all_queryargs: false,
        all_postparams: false,
    });

    const handleChange = async (key, event) => {
        const newValue = event.target.checked;
        const newSettings = { ...settings, [key]: newValue };
        setSettings(newSettings);
        await invoke('setSettings', { key, value: newValue });
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
                        checked={settings.all_req_headers}
                        onChange={(e) => handleChange('all_req_headers', e)}
                        id="all_req_headers"
                        description="HTTP headers contain metadata about the request or response, or about the object sent in the message body. Examples include Content-Type to describe the data format, Authorization for credentials, and User-Agent for client information."
                    />

                    <ToggleWithLabel
                        label="Remove all response headers"
                        checked={settings.all_resp_headers}
                        onChange={(e) => handleChange('all_resp_headers', e)}
                        id="all_resp_headers"
                        description="HTTP headers contain metadata about the request or response, or about the object sent in the message body. Examples include Content-Type to describe the data format, Authorization for credentials, and User-Agent for client information."
                    />

                    <ToggleWithLabel
                        label="Remove all cookies"
                        checked={settings.all_cookies}
                        onChange={(e) => handleChange('all_cookies', e)}
                        id="all_cookies"
                        description="Cookies are small pieces of data stored on the client side, which are sent to the server with each HTTP request. They are used to remember stateful information for the user between page requests, such as login status or preferences."
                    />

                    <ToggleWithLabel
                        label="Remove all MIME types"
                        checked={settings.all_mimetypes}
                        onChange={(e) => handleChange('all_mimetypes', e)}
                        id="all_mimetypes"
                        description="MIME types are identifiers used to specify the nature and format of a document, file, or assortment of bytes. They are important in HTTP to indicate the type of content being transmitted, such as text/html for HTML pages, application/json for JSON data, or image/png for PNG images."
                    />

                    <ToggleWithLabel
                        label="Remove all query arguments"
                        checked={settings.all_queryargs}
                        onChange={(e) => handleChange('all_queryargs', e)}
                        id="all_queryargs"
                        description="Query arguments are part of the URL that provide additional parameters to the request. Starting with a ? symbol in the URL, they are formatted as key-value pairs separated by &, for example, ?search=query&sort=asc."
                    />

                    <ToggleWithLabel
                        label="Remove all POST parameters"
                        checked={settings.all_postparams}
                        onChange={(e) => handleChange('all_postparams', e)}
                        id="all_postparams"
                        description="POST parameters are included in the body of an HTTP POST request. They are used to send data to the server to be processed, such as form submissions or file uploads. Unlike query arguments, POST parameters are part of the request body and are a more secure way of transmitting sensitive information, as they are not exposed in URLs or server logs."
                    />
                </GridColumn>
            </Grid>
        </Page>
    );
}

export default App;
