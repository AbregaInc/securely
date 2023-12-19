import React, { useState, useEffect } from 'react';
import { invoke } from '@forge/bridge';
import { useDropzone } from 'react-dropzone';
import Button from '@atlaskit/button';
import Page from '@atlaskit/page';
import { sanitizeHar } from 'har-cleaner';

function HarFileScrubber() {
    const [settings, setSettings] = useState({});
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [scrubbedFiles, setScrubbedFiles] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        // Fetch settings
        const fetchSettings = async () => {
            const loadedSettings = await invoke('getSettings');
            setSettings(loadedSettings);
        };
        fetchSettings();
    }, []);

    const onDrop = async (acceptedFiles) => {
        setUploadedFiles(acceptedFiles);
        setIsProcessing(true);

        try {
            const scrubbedFiles = await Promise.all(acceptedFiles.map(async (file) => {
                const harContent = await file.text();
                const harObject = JSON.parse(harContent);
                const scrubbedHarContent = sanitizeHar(harObject, settings);
                const scrubbedBlob = new Blob([JSON.stringify(scrubbedHarContent, null, 2)], { type: 'application/json' });
                return { blob: scrubbedBlob, name: file.name.replace(/\.har$/, '-cleaned.har') };
            }));

            setScrubbedFiles(scrubbedFiles);
        } catch (error) {
            console.error('Error scrubbing HAR files:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
        onDrop, 
        accept: '.har', 
        maxSize: 75 * 1024 * 1024,
        multiple: true
    });

    const resetScrubber = () => {
        setUploadedFiles([]);
        setScrubbedFiles([]);
        setIsProcessing(false);
    };

    return (
        <Page>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                {scrubbedFiles.length === 0 && (
                    <div {...getRootProps()} style={{ border: '2px dashed #ccc', padding: '20px', textAlign: 'center' }}>
                        <input {...getInputProps()} />
                        {isDragActive ? 
                            <p>Drop the HAR files here...</p> : 
                            <p>If you need to provide HAR files, drag 'n' drop them here, or click to select files to remove sensitive data before attaching them to the request.</p>
                        }
                    </div>
                )}
                {isProcessing && <p>Processing...</p>}
                {scrubbedFiles.length > 0 && (
                    <div>
                        {scrubbedFiles.map((file, index) => (
                            <div key={index}>
                                <Button onClick={() => {
                                    const url = window.URL.createObjectURL(file.blob);
                                    const link = document.createElement('a');
                                    link.href = url;
                                    link.setAttribute('download', file.name);
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                }}>
                                    Download {file.name}
                                </Button>
                            </div>
                        ))}
                        <Button onClick={resetScrubber} appearance="warning">
                            Process New Files
                        </Button>
                    </div>
                )}
            </div>
        </Page>
    );
}

export default HarFileScrubber;
