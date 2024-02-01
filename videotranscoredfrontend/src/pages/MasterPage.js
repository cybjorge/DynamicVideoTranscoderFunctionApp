// MasterPage.js
import React from 'react';
import { Link } from 'react-router-dom';

const MasterPage = () => {
    return (
        <div>
            <h1>Main Page</h1>
            <Link to="/detail">Go to Detail Page</Link>
        </div>
    );
};

export default MasterPage;