const setSessionData = (key, data) => {
    try {
        const serializedData = JSON.stringify(data);
        sessionStorage.setItem(key, serializedData);
    } catch (error) {
        console.error('Error setting session data:', error);
    }
};

const getSessionData = (key) => {
    try {
        const serializedData = sessionStorage.getItem(key);
        return serializedData ? JSON.parse(serializedData) : null;
    } catch (error) {
        console.error('Error getting session data:', error);
        return null;
    }
};

export { setSessionData, getSessionData };