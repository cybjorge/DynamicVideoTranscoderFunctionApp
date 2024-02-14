import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import getUserData from '../utils/UserDataHandler';
import { getSessionData } from '../utils/SessionStorageHandler';

import '../index.css';

const DetailPage = () => {
    const [userData, setUserData] = useState(null);
    const [videoData, setVideoData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { videoId } = useParams();
    const [eof, setEof] = useState(false);
    const videoRef = useRef(null);
    const [requestSent, setRequestSent] = useState(false);

    useEffect(() => {
        const sessionUserData = getSessionData('userData');
        if (sessionUserData) {
            setUserData(sessionUserData);
        } else {
            setUserData(getUserData());
        }
    }, []);

    const fetchNextVideoChunk = async () => {
        try {
            const currentTime = videoRef.current ? videoRef.current.currentTime.toFixed(2) : "00:00:00";
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
                const responseData = await response.json();
                if (responseData && responseData.VideoContentBase64) {
                    setVideoData({
                        videoContent: responseData.VideoContentBase64,
                        endTimestamp: responseData.EndTimestamp,
                        duration: responseData.Duration,
                    });
                    setEof(responseData.eof);
                    setLoading(false);
                } else {
                    setError('Video content is missing in the response');
                }
            } else {
                setError(`Error fetching video: ${response.status} ${response.statusText}`);
            }
        } catch (error) {
            setError(`Error fetching video: ${error}`);
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
            !requestSent
        ) {
            fetchNextVideoChunk();
            setRequestSent(true);
        } else if (videoRef.current && videoRef.current.currentTime >= videoRef.current.duration && videoData) {
            videoRef.current.src = `data:video/webm;base64,${videoData.videoContent}`;
            videoRef.current.play();
            setRequestSent(false);
        }
    };

    const handleLoadedData = () => {
        if (!eof) {
            if (videoRef.current.paused) {
                videoRef.current.play();
            }
        }
    };

    return (
        <div className="h-screen flex flex-col justify-center items-center bg-gray-100 relative">
            <div className="absolute top-0 left-0 m-4 text-xl font-bold">
                <Link to="/">My Site</Link>
            </div>
            <div className="mb-8 text-center">
                <h1 className="text-3xl font-bold">Detail Page</h1>
            </div>
            <div className="flex-grow w-full flex justify-center items-center">
                {videoData && (
                    <video
                        ref={videoRef}
                        controls
                        style={{ width: '75%', maxWidth: '100%', height: 'auto' }}
                        onTimeUpdate={handleTimeUpdate}
                        onLoadedData={handleLoadedData}
                        autoPlay
                    >
                        <source src={`data:video/webm;base64,${videoData.videoContent}`} type="video/webm" />
                        Your browser does not support the video tag.
                    </video>
                )}
                {loading && (
                    <div className="absolute top-0 left-0 w-full h-full flex justify-center items-center">
                        <div className="loader"></div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DetailPage;
