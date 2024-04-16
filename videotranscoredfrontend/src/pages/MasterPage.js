import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import getUserData from '../utils/UserDataHandler';
import { setSessionData, getSessionData } from '../utils/SessionStorageHandler';
import { updateBandwidth, measureConnectionSpeed } from '../utils/BandwithHandler';
import 'whatwg-fetch';
import { PRODUCTION_URL, DEVELOPMENT_URL } from '../VariableTable';

const MasterPage = () => {
    const [userData, setUserData] = useState(null);
    const [thumbnails, setThumbnails] = useState([]);
    const [error, setError] = useState(null);
    const [showUserData, setShowUserData] = useState(false); // State to control visibility of user data drawer

    useEffect(() => {
        setUserData(getUserData());
        console.log(PRODUCTION_URL);
        // Fetch thumbnails from Azure Function
        const fetchThumbnails = async () => {
            try {
                const response = await fetch(DEVELOPMENT_URL + '/api/get-thumbnails');
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
        <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-200 to-purple-200 text-gray-800 relative"> {/* Added relative positioning */}
            <div className="flex justify-between items-center p-4">
                <h1 className="text-3xl font-bold border border-gray-300 rounded-lg p-2 shadow-md">T-APP</h1>
                <div></div>
            </div>
            <div className="flex justify-center items-center">
                <div className="w-95vw max-w-6xl text-center px-4">
                    <h1 className="text-4xl font-semibold mt-8 mb-10">Main Page</h1>
                    {thumbnails.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {thumbnails.map((thumbnail, index) => (
                                <Link
                                    key={index}
                                    to={`/detail/${thumbnail.videoId}`}
                                    className="flex flex-col bg-white rounded-lg overflow-hidden shadow-md transition-transform duration-300 hover:scale-105"
                                >
                                    <img
                                        src={thumbnail.thumbnailUrl}
                                        alt={`Thumbnail ${index + 1}`}
                                        className="w-full h-auto"
                                    />
                                    <div className="p-4">
                                        <p className="text-lg font-semibold mb-2">{thumbnail.videoName}</p>
                                        <p className="text-sm text-gray-600">{thumbnail.description}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}

                    {/* Display user data drawer */}
                    <div className={`fixed bottom-10 right-5 m-4 p-2 bg-blue-500 hover:bg-blue-700 text-white font-bold rounded-full shadow-md transition-transform duration-300 transform ${showUserData ? 'translate-y-0' : 'translate-y-full'}`}>
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

                    {/* Display error message */}
                    {error && (
                        <div className="fixed bottom-0 left-0 right-0 bg-red-500 text-white text-center py-2">
                            {error}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MasterPage;