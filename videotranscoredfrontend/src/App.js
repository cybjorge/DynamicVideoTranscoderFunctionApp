//import './App.css';
//import './index.css';
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import DetailPage from './pages/DetailPage';
import MasterPage from './pages/MasterPage';



function App() {
    return (
        <Router>
            <Routes>
                <Route path="/detail/:videoId" element={<DetailPage />} />
                <Route path="/" element={<MasterPage />} />
            </Routes>
        </Router>
    );
}

export default App;