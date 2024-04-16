import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import getUserData from '../utils/UserDataHandler';
import { getSessionData } from '../utils/SessionStorageHandler';
import { PRODUCTION_URL, DEVELOPMENT_URL } from '../VariableTable';
import '../styles/DetailStylesheet.css';
import MetricsModal from '../components/MetricsModal';

const DetailPage = () => {
    const [userData, setUserData] = useState(null);
    const [videoData, setVideoData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { videoId } = useParams();
    const [eof, setEof] = useState(false);
    const videoRef = useRef(null);
    const [requestSent, setRequestSent] = useState(false);
    const [showUserData, setShowUserData] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [pinnedModal, setPinnedModal] = useState(false); // State to control the pinned modal

    useEffect(() => {
        const sessionUserData = getSessionData('userData');
        if (sessionUserData) {
            setUserData(sessionUserData);
        } else {
            setUserData(getUserData());
        }
    }, []);

    // Function to generate a unique ID
    const generateUniqueID = (time) => {
        const bandwidth = userData ? getUserData().bandwidth : 'unknown';
        return `${time}-${Math.random().toString(36).substring(7)}-${bandwidth}`;
    };
    const idQueueRef = useRef([]);

    // Function to add an ID to the queue
    const addToQueue = (id) => {
        idQueueRef.current.push(id);
    };

    // Function to remove an ID from the queue
    const removeFromQueue = (id) => {
        idQueueRef.current = idQueueRef.current.filter(queueId => queueId !== id);
    };

    const fetchNextVideoChunk = async () => {
        try {
            const currentTime = videoRef.current ? videoRef.current.currentTime.toFixed(2) : "00:00:00";
            const currentDuration = videoRef.current ? videoRef.current.duration.toFixed(2) : "00:00:00";

            const existingID = idQueueRef.current.find(id => id.startsWith(videoData ? videoData.endTimestamp : "00:00:00"));
            if (existingID) {
                return; // Don't proceed with fetching the next video chunk
            }

            const uniqueID = generateUniqueID(videoData ? videoData.endTimestamp : "00:00:00");
            addToQueue(uniqueID); // Add the unique ID to the queue

            const response = await fetch(DEVELOPMENT_URL + '/api/transcode-video', {
                method: 'post',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    videoId: videoId,
                    timestamp: currentTime,
                    newStartTime: videoData ? videoData.endTimestamp : "00:00:00",
                    duration: currentDuration,
                    userData: getUserData(),
                    uniqueID: uniqueID, // Send unique ID with the request
                }),
            });

            if (response.ok) {
                const responseData = await response.json();
                if (idQueueRef.current.includes(responseData.uniqueID)) {
                    removeFromQueue(responseData.uniqueID); // Remove the unique ID from the queue
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
                    setError('Unique ID not found in the queue');
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

    const handlePinModal = () => {
        setShowModal(false);
        setPinnedModal(!pinnedModal);
    };

    return (
        <div className="h-screen flex flex-col justify-center items-center bg-gradient-to-br from-blue-200 to-purple-200 text-gray-800 relative">
            <div className="absolute top-0 left-0 m-4 text-xl font-bold">
                <Link to="/">My Site</Link>
            </div>
            <div className="mb-8 text-center">
                <h1 className="text-3xl font-bold">Detail Page</h1>
            </div>
            <div className="flex-grow w-95vw flex justify-center items-center relative">
                <div style={{ width: '75%', maxWidth: '100%', height: 'auto' }} className="relative">
                    {loading && !videoData && (
                        <div className="absolute flex-grow w-95vw inset-0 bg-gray-300 opacity-50 z-0"></div>
                    )}
                    {loading && (
                        <div className="absolute inset-0 flex justify-center items-center">
                            <div className="loader-spinner z-1"></div>
                        </div>
                    )}
                    {videoData && (
                        <video
                            ref={videoRef}
                            controls
                            style={{ width: '100%', height: 'auto' }}
                            onTimeUpdate={handleTimeUpdate}
                            onLoadedData={handleLoadedData}
                            autoPlay
                            className="z-2"
                        >
                            <source src={`data:video/webm;base64,${videoData.videoContent}`} type="video/webm" />
                            Your browser does not support the video tag.
                        </video>
                    )}
                </div>
                {/* Modal button */}
                {!pinnedModal && (
                    <button className="fixed bottom-20 right-5 m-4 p-2 bg-blue-500 hover:bg-blue-700 text-white font-bold rounded-full shadow-md transition-transform duration-300 transform" onClick={() => setShowModal(true)}>
                        Open Metrics
                    </button>
                )}

                {/* Metrics modal */}
                {(showModal || pinnedModal) && (
                    <MetricsModal
                        onClose={() => setShowModal(false)}
                        onPin={handlePinModal}
                        pinned={pinnedModal}
                    />
                )}

                {/* Display user data button */}
                <div className="fixed bottom-5 right-5 m-4 p-2 bg-blue-500 hover:bg-blue-700 text-white font-bold rounded-full shadow-md transition-transform duration-300 transform">
                    <button onClick={() => setShowUserData(!showUserData)}>
                        {showUserData ? 'Hide User Data' : 'Show User Data'}
                    </button>
                </div>

                {/* Display user data drawer */}
                <div className={`fixed bottom-0 left-0 right-0 bg-white p-4 transition-transform duration-300 transform ${showUserData ? 'translate-y-0' : 'translate-y-full'}`}>
                    <button
                        onClick={() => setShowUserData(false)}
                        className="absolute top-0 right-0 m-4 p-2 bg-gray-200 rounded-full"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
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
            </div>
        </div>
    );
};

export default DetailPage;
