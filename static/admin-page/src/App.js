import React, { useEffect, useState } from 'react';
import { invoke } from '@forge/bridge';
import Toggle from '@atlaskit/toggle';
import { Label } from '@atlaskit/field-base';
import Page, { Grid, GridColumn } from '@atlaskit/page';
import '@atlaskit/css-reset';


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
                    <div style={{ marginBottom: '20px' }}>
                        <Label htmlFor="all_headers">Remove all headers</Label>
                        <Toggle isChecked={settings.all_headers} onChange={(e) => handleChange('all_headers', e)} />
                        <p>A boolean indicating whether to scrub all headers from the HAR file.</p>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <Label htmlFor="all_cookies">Remove all cookies</Label>
                        <Toggle isChecked={settings.all_cookies} onChange={(e) => handleChange('all_cookies', e)} />
                        <p>A boolean indicating whether to scrub all cookies from the HAR file.</p>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <Label htmlFor="all_mimetypes">Remove all MIME types</Label>
                        <Toggle isChecked={settings.all_mimetypes} onChange={(e) => handleChange('all_mimetypes', e)} />
                        <p>A boolean indicating whether to scrub all MIME types from the HAR file.</p>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <Label htmlFor="all_queryargs">Remove all query arguments</Label>
                        <Toggle isChecked={settings.all_queryargs} onChange={(e) => handleChange('all_queryargs', e)} />
                        <p>A boolean indicating whether to scrub all query arguments from the HAR file.</p>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <Label htmlFor="all_postparams">Remove all POST parameters</Label>
                        <Toggle isChecked={settings.all_postparams} onChange={(e) => handleChange('all_postparams', e)} />
                        <p>A boolean indicating whether to scrub all post parameters from the HAR file.</p>
                    </div>
                </GridColumn>
            </Grid>
        </Page>
    );
}

export default App;
