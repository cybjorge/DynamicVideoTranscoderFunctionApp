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

    useEffect(() => {
        const fetchVideo = async () => {
            try {
                const response = await fetch('http://localhost:7049/api/transcode-video', {
                    method: 'post',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        videoId: videoId,
                        startTimestamp: "00:00:00", //i added this just now
                    }),
                });

                if (response.ok) {
                    const responseData = await response.json();
                    if (responseData && responseData.VideoContentBase64) {
                        try {
                            const videoContent = atob(responseData.VideoContentBase64); // Decode Base64 video content
                            setVideoData({
                                videoContent: videoContent,
                                endTimestamp: responseData.endTimestamp,
                                duration: responseData.duration,
                            });
                        } catch (error) {
                            console.error('Error decoding video content:', error);
                        }
                    } else {
                        console.log(responseData);
                        console.log(responseData.VideoContentBase64.length);

                        console.error('Video content is missing in the response:', responseData);
                    }
                } else {
                    console.error('Error fetching video:', response.status, response.statusText);
                }
            } catch (error) {
                console.error('Error fetching video:', error);
            }
        };

        fetchVideo();
    }, [videoId]);

    return (
        <div>
            <h1>Detail Page</h1>
            <Link to="/">Go to Main Page</Link>
            <div>
                {/* Display video player */}
                {videoData && (
                    console.log(videoData),
                    console.log(videoData.videoContent),
                    <video controls width="640" height="360">
                        <source src={`data:video/webm;base64,${btoa(videoData.videoContent)}`} type="video/webm"  />
                        Your browser does not support the video tag.
                    </video>
                )}
                {/* Display metadata */}
                {videoData && (
                    <div>
                        <p>End Timestamp: {videoData.endTimestamp}</p>
                        <p>Duration: {videoData.duration}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DetailPage;