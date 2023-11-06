import React, { useEffect, useState } from 'react';
import { invoke } from '@forge/bridge';
import Toggle from '@atlaskit/toggle';
import { Label } from '@atlaskit/field-base';
import Page, { Grid, GridColumn } from '@atlaskit/page';
import '@atlaskit/css-reset';
import Heading from '@atlaskit/heading';


function App() {
    const [settings, setSettings] = useState({
        all_headers: false,
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
                    <p>By default, Securely will scrub portions of a HAR file. You can read about this in <a href="https://abrega.gitbook.io/securely/secure-har-file-management-with-securely/what-is-sanitized">our documentation</a>.
                    If you would like to scrub all of a given data element, then please enable that below.</p>

                    <div style={{ marginBottom: '20px' }}>
                        <Label htmlFor="all_headers">Remove all headers</Label>
                        <Toggle isChecked={settings.all_headers} onChange={(e) => handleChange('all_headers', e)} />
                        <p>HTTP headers contain metadata about the request or response, or about the object sent in the message body. Examples include Content-Type to describe the data format, Authorization for credentials, and User-Agent for client information.</p>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <Label htmlFor="all_cookies">Remove all cookies</Label>
                        <Toggle isChecked={settings.all_cookies} onChange={(e) => handleChange('all_cookies', e)} />
                        <p>Cookies are small pieces of data stored on the client side, which are sent to the server with each HTTP request. They are used to remember stateful information for the user between page requests, such as login status or preferences.</p>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <Label htmlFor="all_mimetypes">Remove all MIME types</Label>
                        <Toggle isChecked={settings.all_mimetypes} onChange={(e) => handleChange('all_mimetypes', e)} />
                        <p>MIME types are identifiers used to specify the nature and format of a document, file, or assortment of bytes. They are important in HTTP to indicate the type of content being transmitted, such as text/html for HTML pages, application/json for JSON data, or image/png for PNG images.</p>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <Label htmlFor="all_queryargs">Remove all query arguments</Label>
                        <Toggle isChecked={settings.all_queryargs} onChange={(e) => handleChange('all_queryargs', e)} />
                        <p>Query arguments are part of the URL that provide additional parameters to the request. Starting with a ? symbol in the URL, they are formatted as key-value pairs separated by &, for example, ?search=query&sort=asc.</p>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <Label htmlFor="all_postparams">Remove all POST parameters</Label>
                        <Toggle isChecked={settings.all_postparams} onChange={(e) => handleChange('all_postparams', e)} />
                        <p>POST parameters are included in the body of an HTTP POST request. They are used to send data to the server to be processed, such as form submissions or file uploads. Unlike query arguments, POST parameters are part of the request body and are a more secure way of transmitting sensitive information, as they are not exposed in URLs or server logs.</p>
                    </div>
                </GridColumn>
            </Grid>
        </Page>
    );
}

export default App;
