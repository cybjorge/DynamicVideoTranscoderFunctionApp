import React, { useState, useEffect, useRef } from 'react';
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
    const { videoId } = useParams(); // Extract videoId from URL parameters

    const [chunkIndex, setChunkIndex] = useState(0); // State to store the index of the current chunk

    const [videoData, setVideoData] = useState(null);
    const [eof, setEof] = useState(false);
    const videoRef = useRef(null);
    const [requestSent, setRequestSent] = useState(false); // State to track if the request has been sent


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

    const fetchNextVideoChunk = async () => {
        try {
            const currentTime = videoRef.current ? videoRef.current.currentTime.toFixed(2) : "00:00:00";
            console.log('fetchNextVideoChunk', currentTime);
            const response = await fetch('http://localhost:7049/api/transcode-video', {
                method: 'post',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    videoId: videoId,
                    timestamp: currentTime,
                }),
            });

            if (response.ok) {
                console.log("recieved for:", currentTime);
                const responseData = await response.json();
                if (responseData && responseData.VideoContentBase64) {
                    setVideoData({
                        videoContent: responseData.VideoContentBase64,
                        endTimestamp: responseData.EndTimestamp,
                        duration: responseData.Duration,
                    });
                    setEof(responseData.eof);
                } else {
                    console.error('Video content is missing in the response:', responseData);
                }
            } else {
                console.error('Error fetching video:', response.status, response.statusText);
            }
        } catch (error) {
            console.error('Error fetching video:', error);
        }
    };

    useEffect(() => {
        if (!eof) {
            fetchNextVideoChunk();
        }
    }, [eof]);

    const handleTimeUpdate = () => {
        if (
            videoRef.current &&
            videoRef.current.currentTime >= 0.2 * videoRef.current.duration &&
            !eof &&
            !requestSent // Check if the request has not been sent yet
        ) {
            fetchNextVideoChunk();
            setRequestSent(true); // Set the state to indicate that the request has been sent
        } else if (videoRef.current && videoRef.current.currentTime >= videoRef.current.duration && videoData) {
            // Play the next segment directly if available
            videoRef.current.src = `data:video/webm;base64,${videoData.videoContent}`;
            videoRef.current.play();
            setRequestSent(false); // Reset the state to allow sending requests for the next segment
        }
    };

    const handleLoadedData = () => {
        if (!eof) {
            videoRef.current.play(); // Start playing the video automatically
        }
    };
    return (
        <div>
            <h1>Detail Page</h1>
            <div>
                {videoData && (
                    <video
                        ref={videoRef}
                        controls
                        width="640"
                        height="360"
                        onTimeUpdate={handleTimeUpdate}
                        onLoadedData={handleLoadedData} // Triggered when video data is loaded

                    >
                        <source src={`data:video/webm;base64,${videoData.videoContent}`} type="video/webm" />
                        Your browser does not support the video tag.
                    </video>
                )}
            </div>
        </div>
    );
};

export default DetailPage;