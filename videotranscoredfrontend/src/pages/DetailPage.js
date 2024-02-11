import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import VideoPlayer from '../components/VideoPlayer';
import Dashboard from '../components/Dashboard';
import getUserData from '../utils/UserDataHandler';
import { setSessionData, getSessionData } from '../utils/SessionStorageHandler';

const DetailPage = () => {
    const [userData, setUserData] = useState(null); // State to store user data
    const [videoSegments, setVideoSegments] = useState([]); // State to store video segments
    const [loading, setLoading] = useState(true); // Loading state
    const [chunkIndex, setChunkIndex] = useState(0); // State to store the index of the current chunk
    const videoRef = useRef(null); // Reference to the video element
    const { videoId } = useParams(); // Extract videoId from URL parameters

    useEffect(() => {
        // Get user data from session storage
        const sessionUserData = getSessionData('userData');
        if (sessionUserData) {
            setUserData(sessionUserData);
        } else {
            // Get user data when the component mounts
            setUserData(getUserData());
        }
    }, []);

    useEffect(() => {
        const fetchVideoSegments = async () => {
            try {
                const response = await fetch('http://localhost:7049/api/transcode-video', {
                    method: 'post',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        videoId: videoId, // Pass videoId instead of videoUrl
                        chunkIndex: chunkIndex,
                        sessionID: '12345',
                        videoStrategy: 'LowLatency',
                    }),
                });

                if (response.ok) {
                    const data = await response.json();
                    setVideoSegments(data.VideoSegments);
                } else {
                    console.error('Error fetching video segments:', response.status, response.statusText);
                }
            } catch (error) {
                console.error('Error fetching video segments:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchVideoSegments();
    }, [videoId, chunkIndex]);

    useEffect(() => {
        // Monitor video playback progress
        const handlePlaybackProgress = () => {
            const video = videoRef.current;
            if (video && video.currentTime >= video.duration) {
                // Video playback reached the end, switch to playing from cache
                setChunkIndex(prevIndex => prevIndex + 1);
            }
        };

        const video = videoRef.current;
        if (video) {
            video.addEventListener('timeupdate', handlePlaybackProgress);
        }

        return () => {
            if (video) {
                video.removeEventListener('timeupdate', handlePlaybackProgress);
            }
        };
    }, [videoSegments, chunkIndex]);

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
                    <div>
                        {/* Display each video segment */}
                        {videoSegments.map((segment, index) => (
                            <video key={index} ref={videoRef} controls width="640" height="360">
                                <source src={URL.createObjectURL(new Blob([segment]))} type="video/webm" />
                                Your browser does not support the video tag.
                            </video>
                        ))}
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
                )}
            </div>
        </div>
    );
};

export default DetailPage;
