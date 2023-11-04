import React, { useEffect, useState } from 'react';
import { invoke } from '@forge/bridge';
import Toggle from '@atlaskit/toggle';

function App() {
    const [data, setData] = useState(null);
    const [toggleValue, setToggleValue] = useState(false);

    useEffect(() => {
        invoke('getText', { example: 'my-invoke-variable' }).then(setData);
        invoke('getToggleValue').then(value => setToggleValue(value || false));
    }, []);

    const handleToggleChange = async (event) => {
        const newValue = event.target.checked;
        setToggleValue(newValue);
        await invoke('setToggleValue', { value: newValue });
    };

    return (
        <div>
            {data ? data : 'Loading...'}
            <br />
            <label>
                My Toggle:
                <Toggle isChecked={toggleValue} onChange={handleToggleChange} />
            </label>
        </div>
    );
}

export default App;
