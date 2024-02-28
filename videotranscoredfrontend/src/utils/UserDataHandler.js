const getUserData = () => {
    return {
        deviceType: getDeviceType(),
        screenResolution: getScreenResolution(),
        windowResolution: getWindowResolution(),
        browserInfo: getBrowserInfo(),
        bandwidth: getBandwidth(),
        connectionSpeed : getConnectionSpeed(),
        playbackEnvironment: getPlaybackEnvironment(),
        deviceProcessingPower: getDeviceProcessingPower(),
        codecSupport : getCodecSupport(),
    };
};

const getDeviceType = () => {
    // Use the user agent to determine the device type
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('mobile')) {
        return 110;
    } else if (userAgent.includes('tablet')) {
        return 111;
    } else {
        return 101;
    }
};

const getScreenResolution = () => {
    return `${window.screen.width}x${window.screen.height}`;
};

const getWindowResolution = () => {
    return `${window.innerWidth}x${window.innerHeight}`;
};

const getBrowserInfo = () => {
    return navigator.userAgent;
};

const getBandwidth = () => {
    return navigator.connection?.effectiveType || 'Unknown';
};
const getConnectionSpeed = () => {
    // Implement logic to measure or estimate connection speed
    // You might use a library or perform network-related tasks
    // For example, you could use the Network Information API:
    if ('connection' in navigator) {
        const connection = navigator.connection;
        if (connection.effectiveType) {
            return connection.effectiveType;
        }
    }
    return 'N/A';
};

const getPlaybackEnvironment = () => {
    return window.self === window.top ? 'Direct' : 'Embedded';
};

const getDeviceProcessingPower = () => {
    return navigator.hardwareConcurrency || 'N/A';
};
const getCodecSupport = () => {
    return MediaRecorder.isTypeSupported('video/webm;codecs=vp9') === true ? 1 : 0; //1 for supported, 0 for not supported for vp9 codec
};
console.log(getUserData());
export default getUserData;
