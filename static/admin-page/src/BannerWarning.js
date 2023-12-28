import React from 'react';
import WarningIcon from '@atlaskit/icon/glyph/warning';
import Banner from '@atlaskit/banner';
import { router } from '@forge/bridge';

const BannerWarning = () => {
    const handleNavigation = () => {
        router.navigate('/plugins/servlet/upm?source=side_nav_manage_addons');
    };

    // Style for the wrapper div
    const bannerWrapperStyle = {
        paddingBottom: '20px', // adjust this value as needed
    };

    return (
        <div style={bannerWrapperStyle}>
            <Banner
                appearance="warning"
                icon={<WarningIcon label="" secondaryColor="inherit" />}
            >
                Please go to{' '}
                <a onClick={handleNavigation}>
                    the Manage apps UI
                </a>
                {' '}and update Securely
            </Banner>
        </div>
    );
};

export default BannerWarning;
