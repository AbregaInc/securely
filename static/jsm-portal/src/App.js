import React, { useState, useEffect } from 'react';
import { invoke } from '@forge/bridge';
import { useDropzone } from 'react-dropzone';
import JSZip from 'jszip';
import { sanitizeHar } from 'har-cleaner';
import Button from '@atlaskit/button/new';
import Spinner from '@atlaskit/spinner';
import Page from '@atlaskit/page';

function HarFileScrubber() {
    const [settings, setSettings] = useState({});
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [scrubbedFiles, setScrubbedFiles] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingCompleted, setProcessingCompleted] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            const loadedSettings = await invoke('getSettings');
            setSettings(loadedSettings);
        };
        fetchSettings();
    }, []);

    const onDrop = async (acceptedFiles) => {
        setUploadedFiles(acceptedFiles);
        setIsProcessing(true);
        setProcessingCompleted(false);

        setTimeout(async () => {
            try {
                const scrubbedFiles = await Promise.all(acceptedFiles.map(async (file) => {
                    const harContent = await file.text();
                    const harObject = JSON.parse(harContent);
                    const scrubbedHarContent = sanitizeHar(harObject, settings);
                    const scrubbedBlob = new Blob([JSON.stringify(scrubbedHarContent, null, 2)], { type: 'application/json' });
                    return { blob: scrubbedBlob, name: file.name.replace(/\.har$/, '-cleaned.har') };
                }));

                setScrubbedFiles(scrubbedFiles);
                setProcessingCompleted(true);
            } catch (error) {
                console.error('Error scrubbing HAR files:', error);
            } finally {
                setIsProcessing(false);
            }
        }, 1000);
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
        onDrop, 
        accept: {
            'application/*': ['.har'],
          },
        multiple: true
    });

    const resetScrubber = () => {
        setUploadedFiles([]);
        setScrubbedFiles([]);
        setIsProcessing(false);
        setProcessingCompleted(false);
    };


    const downloadSingleFile = (file) => {
        const url = window.URL.createObjectURL(file.blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', file.name);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const downloadAllFiles = async () => {
        const zip = new JSZip();
        scrubbedFiles.forEach(file => {
            zip.file(file.name, file.blob);
        });

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = window.URL.createObjectURL(zipBlob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'scrubbed_files.zip');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <Page>
            <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
                {scrubbedFiles.length === 0 && (
                    <div {...getRootProps()} style={{ border: '2px dashed #ccc', padding: '10px', textAlign: 'center' }}>
                    <input {...getInputProps()} />
                    {isDragActive ? 
                        <p style={{ margin: 'var(--ds-space-150,12px) 0 var(--ds-space-150,12px) 0'}}>Drop the HAR files here...</p> : 
                        <p style={{ margin: 'var(--ds-space-150,12px) 0 var(--ds-space-150,12px) 0'}}>If you need to attach HAR files, drag and drop the files here first.<br/>Sensitive data will be removed without leaving your browser.<br/>Then download the cleaned files, and upload them to the attachment field above.</p>
                    }
                </div>
                )}
                {isProcessing && <Spinner size="medium" />}
                {processingCompleted && <p style={{ margin: 'var(--ds-space-150,12px) 0 var(--ds-space-150,12px) 0'}}>Cleaning completed. Yes, it's that fast.<br/>Please download the cleaned HAR files and attach them above.</p>}
                {scrubbedFiles.length > 0 && (
                    <div style={{ marginTop: '20px' }}>
                    {scrubbedFiles.length === 1 && (
                                <Button 
                                    appearance="primary" 
                                    onClick={() => downloadSingleFile(scrubbedFiles[0])}
                                >
                                    Download cleaned file
                                </Button>
                            )}
                            {scrubbedFiles.length > 1 && (
                                <Button 
                                    appearance="primary" 
                                    onClick={downloadAllFiles}
                                >
                                    Download cleaned files
                                </Button>
                            )}
                            <Button onClick={resetScrubber} appearance="subtle" style={{ marginLeft: '10px' }}>
                                Reset
                            </Button>
                    </div>
                )}
            </div>
        </Page>
    );
}

export default HarFileScrubber;
