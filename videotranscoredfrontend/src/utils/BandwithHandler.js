// bandwidthUtils.js
const updateBandwidth = (userData, setUserData) => {
    const newBandwidth = navigator.connection?.effectiveType || 'Unknown';

    // Check if userData is not null before accessing its properties
    if (userData && userData.bandwidth !== newBandwidth) {
        // Bandwidth has changed, update user data
        setUserData((prevUserData) => ({ ...prevUserData, bandwidth: newBandwidth }));
    }
};


// bandwidthMeasurement.js
const measureConnectionSpeed = async () => {
    const startTime = performance.now();

    // Use a small asset URL (e.g., thumbnail) for measuring download speed
    const testAssetUrl = 'URL_TO_YOUR_SMALL_ASSET';

    try {
        const response = await fetch(testAssetUrl);
        const endTime = performance.now();
        const duration = endTime - startTime;
        const downloadSpeed = response.headers.get('content-length') / (duration / 1000); // Bytes per second

        // Adjust this threshold based on your application's requirements
        const bandwidth = downloadSpeed < 500000 ? 'slow-2g' : '4g'; // Example threshold: 500 KB/s

        return bandwidth;
    } catch (error) {
        console.error('Error measuring connection speed:', error);
        return 'Unknown';
    }
};

export { updateBandwidth, measureConnectionSpeed } ;