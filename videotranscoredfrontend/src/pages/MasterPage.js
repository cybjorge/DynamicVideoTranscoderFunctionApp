import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import getUserData from '../utils/UserDataHandler';
import { setSessionData, getSessionData } from '../utils/SessionStorageHandler';
import { updateBandwidth, measureConnectionSpeed } from '../utils/BandwithHandler';
import 'whatwg-fetch';
import '../index.css'; // Import your CSS file here

const MasterPage = () => {
    const [userData, setUserData] = useState(null);
    const [thumbnails, setThumbnails] = useState([]);
    const [error, setError] = useState(null);
    const [showUserData, setShowUserData] = useState(false); // State to control visibility of user data drawer

    useEffect(() => {
        setUserData(getUserData());

        // Fetch thumbnails from Azure Function
        const fetchThumbnails = async () => {
            try {
                const response = await fetch('http://localhost:7049/api/get-thumbnails');
                const data = await response.json();
                setThumbnails(data);
            } catch (error) {
                console.error('Error fetching thumbnails:', error);
                setError('Error fetching thumbnails. Please try again later.');
                setTimeout(() => {
                    setError(null);
                }, 5000); // Clear error after 5 seconds
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
    const thumbnailWidth = window.innerWidth > window.innerHeight ? '200px' : '150px';
    const thumbnailHeight = window.innerWidth > window.innerHeight ? '150px' : '100px';

    return (
        <div className="flex justify-center items-center min-h-screen bg-gray-100">
            <div className="w-full max-w-5xl text-center">
                <h1 className="text-3xl font-bold mb-4">Main Page</h1>
                {/* Display thumbnails */}
                {thumbnails.length > 0 && (
                    <div className="w-full mb-8">
                        <h2 className="mb-4">Thumbnails</h2>
                        <div className="flex flex-wrap justify-center">
                            {thumbnails.map((thumbnail, index) => (
                                <Link
                                    key={index}
                                    to={`/detail/${thumbnail.videoId}`} // Pass videoId instead of URL
                                    className="m-2 p-2 border border-gray-200 rounded-md shadow-md overflow-hidden transition-transform duration-300 hover:scale-110"
                                    style={{ maxWidth: thumbnailWidth }}
                                >
                                    {/* Display thumbnails with dynamic size */}
                                    <img
                                        src={thumbnail.thumbnailUrl}
                                        alt={`Thumbnail ${index + 1}`}
                                        className="w-full h-auto"
                                        style={{ maxHeight: thumbnailHeight }}
                                    />
                                    {/* Thumbnail caption below the image */}
                                    <div className="text-center overflow-hidden whitespace-nowrap">
                                        {thumbnail.videoName.length > 10 ? `${thumbnail.videoName.slice(0, 10)}...` : thumbnail.videoName} {/* Display video name as caption */}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* Display user data button */}
                <button onClick={() => setShowUserData(!showUserData)} className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                    {showUserData ? 'Hide User Data' : 'Show User Data'}
                </button>

                {/* Display user data drawer */}
                <div className={`fixed bottom-0 left-0 right-0 bg-white p-4 transition-transform duration-300 transform ${showUserData ? 'translate-y-0' : 'translate-y-full'}`}>
                    <button
                        onClick={() => setShowUserData(false)}
                        className="absolute top-0 right-0 m-4 p-2 bg-white rounded-full"
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

                {/* Display error message */}
                {error && (
                    <div className="fixed bottom-0 left-0 right-0 bg-red-500 text-white text-center py-2">
                        {error}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MasterPage;
