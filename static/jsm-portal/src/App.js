import React, { useState, useEffect } from 'react';
import { invoke } from '@forge/bridge';
import { DropzoneArea } from 'material-ui-dropzone';
import Button from '@atlaskit/button';
import Page from '@atlaskit/page';
import { sanitizeHar } from 'har-cleaner';

function HarFileScrubber() {
    const [settings, setSettings] = useState({});
    const [harFile, setHarFile] = useState(null);
    const [scrubbedHarFile, setScrubbedHarFile] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        // Fetch settings
        const fetchSettings = async () => {
            const loadedSettings = await invoke('getSettings');
            setSettings(loadedSettings);
        };
        fetchSettings();
    }, []);

    const handleFileUpload = (files) => {
        const file = files[0];
        setHarFile(file);
    };

    const scrubHarFile = async () => {
        if (!harFile) return;

        setIsProcessing(true);

        try {
            const harContent = await harFile.text();
            const harObject = JSON.parse(harContent);

            // Apply the sanitizeHar function
            const scrubbedHarContent = sanitizeHar(harObject, settings);
            const scrubbedBlob = new Blob([JSON.stringify(scrubbedHarContent)], { type: 'application/json' });
            setScrubbedHarFile(scrubbedBlob);
        } catch (error) {
            console.error('Error scrubbing HAR file:', error);
            // Handle the error appropriately
        } finally {
            setIsProcessing(false);
        }
    };

    const downloadScrubbedFile = () => {
        if (!scrubbedHarFile) return;

        const url = window.URL.createObjectURL(scrubbedHarFile);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'scrubbed.har');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <Page>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                <DropzoneArea
                    onChange={handleFileUpload}
                    acceptedFiles={['application/json', '.har']}
                    dropzoneText="Drag and drop a HAR file here or click"
                    filesLimit={1}
                    maxFileSize={75 * 1024 * 1024}
                />
                <Button onClick={scrubHarFile} appearance="primary" isDisabled={isProcessing}>
                    {isProcessing ? 'Processing...' : 'Scrub HAR File'}
                </Button>
                {scrubbedHarFile && (
                    <Button onClick={downloadScrubbedFile}>
                        Download Scrubbed File
                    </Button>
                )}
            </div>
        </Page>
    );
}

export default HarFileScrubber;