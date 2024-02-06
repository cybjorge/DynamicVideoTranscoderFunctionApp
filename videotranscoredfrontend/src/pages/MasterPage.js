import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import getUserData from '../utils/UserDataHandler';
import { setSessionData, getSessionData } from '../utils/SessionStorageHandler';
import { updateBandwidth, measureConnectionSpeed } from '../utils/BandwithHandler';
import 'whatwg-fetch';

const MasterPage = () => {
    const [userData, setUserData] = useState(null);
    const [thumbnails, setThumbnails] = useState([]);

    useEffect(() => {
        // Fetch thumbnails from Azure Function
        const fetchThumbnails = async () => {
            try {
                const response = await fetch('http://192.168.30.142:7049/api/get-thumbnails');
                const data = await response.json();
                setThumbnails(data);
            } catch (error) {
                console.error('Error fetching thumbnails:', error);
            }
        };

        // Fetch thumbnails when the component mounts
        fetchThumbnails();

        // Update bandwidth periodically
        const intervalId = setInterval(() => updateBandwidth(userData, setUserData), 5000);

        // Event listener for screen resize
        window.addEventListener('resize', updateUserOnResize);

        return () => {
            // Cleanup
            clearInterval(intervalId);
            window.removeEventListener('resize', updateUserOnResize);
        };

    }, []); // Run this effect once when the component mounts

    const updateUserOnResize = () => {
        // Update user data on screen resize
        setUserData(getUserData());
    };

    useEffect(() => {
        // Update session storage when userData changes
        if (userData) {
            setSessionData('userData', userData);
        }
    }, [userData]); // Run this effect when userData changes

    // Calculate the number of thumbnails to display in a row
    const thumbnailsPerRow = Math.min(5, Math.floor(window.innerWidth / 250));
    const debugDetailUrl = 'https://dynamicvideotranscoding.blob.core.windows.net/videos/yt5s.io-Imagine for 1 Minute-(1080p).mp4';

    return (
        <div>
            <h1>Main Page</h1>
            <Link to="/detail">Go to Detail Page</Link>

            {/* Display thumbnails */}
            {thumbnails.length > 0 && (
                <div>
                    <h2>Thumbnails</h2>
                    <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                        {thumbnails.slice(0, thumbnailsPerRow).map((thumbnail, index) => (
                            <Link
                                key={index}
                                to={`/detail/${encodeURIComponent(debugDetailUrl)}`}
                                style={{ marginRight: '10px', marginBottom: '10px', boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)' }}
                            >
                                {/* Display thumbnails with max size 250 x 100 pixels */}
                                <img
                                    src={thumbnail}
                                    alt={`Thumbnail ${index + 1}`}
                                    style={{ maxWidth: '250px', maxHeight: '100px', width: '100%', height: 'auto' }}
                                />
                                {/* Thumbnail caption below the image */}
                                <div style={{ textAlign: 'center', padding: '5px' }}>
                                    Caption
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
            {/* Display user data */}
            {userData && (
                <div>
                    <p>Device Type: {userData.deviceType}</p>
                    <p>Screen Resolution: {userData.screenResolution}</p>
                    <p>Window Resolution: {userData.windowResolution}</p>
                    <p>Browser Info: {userData.browserInfo}</p>
                    <p>Bandwidth: {userData.bandwidth}</p>
                    <p>Connection Speed: {userData.connectionSpeed}</p>
                    <p>Playback Environment: {userData.playbackEnvironment}</p>
                    <p>Device Processing Power: {userData.deviceProcessingPower}</p>
                </div>
            )}
        </div>
    );
};

export default MasterPage;
