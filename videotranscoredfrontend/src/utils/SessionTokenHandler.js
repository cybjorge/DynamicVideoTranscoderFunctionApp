import { v4 as uuidv4 } from 'uuid';

const generateSessionToken = () => {
    // Generate a UUID (Universally Unique Identifier) as the session token
    return uuidv4();
};

export default generateSessionToken;