// DetailPage.js
import React from 'react';
import { Link } from 'react-router-dom';
import VideoPlayer from '../components/VideoPlayer';
import Dashboard from '../components/Dashboard';

const DetailPage = () => {
    return (
        <div>
            <h1>Detail Page</h1>
            <Link to="/">Go to Main Page</Link>
            <VideoPlayer />
            <Dashboard />
        </div>
    );
};

export default DetailPage;