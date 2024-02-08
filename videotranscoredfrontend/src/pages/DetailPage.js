import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import VideoPlayer from '../components/VideoPlayer';
import Dashboard from '../components/Dashboard';
import getUserData from '../utils/UserDataHandler';
import { setSessionData, getSessionData } from '../utils/SessionStorageHandler';

const DetailPage = () => {
    // Handle user data
    const [userData, setUserData] = useState(null);
    // Handle video state
    const [videoBlob, setVideoBlob] = useState(null);
    // Loading state
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Get user data from session storage
        const sessionUserData = getSessionData('userData');
        if (sessionUserData) {
            setUserData(sessionUserData);
        } else {
            // Get user data when the component mounts
            setUserData(getUserData());
        }
    }, []); // Run this effect once when the component mounts

    // Handle video request
    const  videoUrl  = 'https://dynamicvideotranscoding.blob.core.windows.net/videos/testminutevideo(1080p).mp4?sp=r&st=2024-02-08T16:21:40Z&se=2024-02-09T00:21:40Z&sv=2022-11-02&sr=b&sig=UNhxRlrbdjdJjuBBOgBxG3tRlSmLPMo7i1FF2rjGjZU%3D';
    const decodeUrl = decodeURIComponent(videoUrl);
    console.log(decodeUrl);
    useEffect(() => {
        const fetchVideo = async () => {
            try {
                console.log(userData);
                // Make an HTTP request to the Azure Function with videoUrl and user data
                const response = await fetch('http://localhost:7049/api/transcode-video', {
                    method: 'post',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        videoUrl: videoUrl,
                    }),
                });

                if (response.ok) {
                    const blob = await response.blob();
                    setVideoBlob(blob);  // Use setVideoBlob to update the state
                } else {
                    console.error('Error fetching video:', response.status, response.statusText);
                }
            } catch (error) {
                console.error('Error fetching video:', error);
            } finally {
                // Set loading to false when the video fetching is complete
                setLoading(false);
            }
        };

        fetchVideo();
    }, [videoUrl, userData]); // Depend on videoUrl and userData

    return (
        <div>
            <h1>Detail Page</h1>
            <Link to="/">Go to Main Page</Link>
            <Dashboard />
            <div>
                {/* Display video player */}
                {loading ? (
                    <p>Loading...</p>
                ) : (
                    videoBlob && (
                        <video controls width="640" height="360">
                            <source src={URL.createObjectURL(videoBlob)} type="video/webm" />
                            Your browser does not support the video tag.
                        </video>
                    )
                )}
                {/* Display user data */}
                {userData && (
                    <div>
                        <p>Video URL: {videoUrl}</p>
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
        </div>
    );
};

export default DetailPage;
