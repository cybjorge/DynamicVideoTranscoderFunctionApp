import React, { useState } from 'react';

const MetricsModal = ({ onClose, onPin, pinned }) => {
    const handlePinToggle = () => {
        onPin(!pinned);
    };

    return (
        <>
            {!pinned && <div className="fixed top-0 left-0 w-full h-full flex justify-center items-center bg-gray-900 bg-opacity-50 z-50"></div>}
            <div className={`fixed ${pinned ? 'bottom-0 left-0 w-screen' : 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2'} max-w-md z-50`}>
                <div className="bg-white p-8 rounded-lg shadow-lg">
                    <h2 className="text-2xl font-bold mb-4">Metrics</h2>
                    {/* Add your performance charts and other content here */}
                    <div className="flex justify-between">
                        <button onClick={handlePinToggle} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-2">
                            {pinned ? 'Unpin' : 'Pin Under Video'}
                        </button>
                        {!pinned && (
                            <button onClick={onClose} className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
                            Close
                        </button>)}

                    </div>
                </div>
            </div>
        </>
    );
};

export default MetricsModal;
