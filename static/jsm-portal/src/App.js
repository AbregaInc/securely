import React, { useState, useEffect } from 'react';
import { invoke } from '@forge/bridge';
import { useDropzone } from 'react-dropzone';
import JSZip from 'jszip';
import { sanitizeHar } from 'har-cleaner';
import DropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import Button, { IconButton, SplitButton } from '@atlaskit/button/new';
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
        accept: '.har', 
        maxSize: 75 * 1024 * 1024,
        multiple: true
    });

    const resetScrubber = () => {
        setUploadedFiles([]);
        setScrubbedFiles([]);
        setIsProcessing(false);
        setProcessingCompleted(false);
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
                    <div {...getRootProps()} style={{ border: '2px dashed #ccc', padding: '20px', textAlign: 'center' }}>
                    <input {...getInputProps()} />
                    {isDragActive ? 
                        <p>Drop the HAR files here...</p> : 
                        <p>If you need to attach HAR files, drag 'n' drop the files here first. They will have sensitive data removed without leaving your browser. Then upload the resulting files to the attachment field above.</p>
                    }
                </div>
                )}
                {isProcessing && <Spinner size="large" />}
                {processingCompleted && <p>Cleaning completed, yes it's that fast.</p>}
                {scrubbedFiles.length > 0 && (
                    <div style={{ marginTop: '20px' }}>
                        <Button appearance="primary" onClick={downloadAllFiles} style={{ marginRight: '8px' }}>
                            Download All
                        </Button>
                        <DropdownMenu
                            triggerButtonProps={{
                                iconAfter: <ChevronDownIcon label="More options" />,
                                appearance: 'primary',
                                isSelected: false
                            }}
                            triggerType="button"
                        >
                            <DropdownItemGroup title="Individual Files">
                                {scrubbedFiles.map((file, index) => (
                                    <DropdownItem key={index} onClick={() => {
                                        const url = window.URL.createObjectURL(file.blob);
                                        const link = document.createElement('a');
                                        link.href = url;
                                        link.setAttribute('download', file.name);
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                    }}>
                                        {file.name}
                                    </DropdownItem>
                                ))}
                            </DropdownItemGroup>
                        </DropdownMenu>
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
