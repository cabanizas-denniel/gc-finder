import React, { useState, useEffect } from 'react';

// Generalized Item Details Modal for Admin side
export const AdminViewItemDetailsModal = ({ show, item, onClose, loading }) => {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    useEffect(() => {
        setCurrentImageIndex(0); // Reset when item or show status changes, to ensure fresh state
    }, [item, show]);

    if (!show) {
        return null;
    }

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handlePrevImage = () => {
        setCurrentImageIndex(prevIndex => Math.max(0, prevIndex - 1));
    };

    const handleNextImage = () => {
        if (item && item.imageData && currentImageIndex < item.imageData.length - 1) {
            setCurrentImageIndex(prevIndex => prevIndex + 1);
        }
    };

    const displayImages = item && item.imageData && item.imageData.length > 0;
    const singleFallbackImage = !displayImages && item && item.image;
    const multipleImages = displayImages && item.imageData.length > 1;

    return (
        <div className="modal-overlay" onClick={handleOverlayClick}>
            <div className="modal-content item-details-modal">
                <div className="modal-header">
                    <h2>
                        {loading ? 'Loading Item Details...' : 
                         item ? `Item Details: ${item.name || 'N/A'}` : 'Item Details'}
                    </h2>
                    <button className="close-button" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body">
                    {loading && <p>Loading item details...</p>}
                    {!loading && item && (
                        <div className="item-detail-container">
                            <div className="item-image-container">
                                {displayImages ? (
                                    <img 
                                        src={item.imageData[currentImageIndex].dataUrl} 
                                        alt={item.imageData[currentImageIndex].name || `${item.name} - Image ${currentImageIndex + 1}`}
                                        loading="lazy"
                                        decoding="async"
                                    />
                                ) : singleFallbackImage ? (
                                    <img 
                                        src={item.image} 
                                        alt={item.name || 'Item Image'}
                                        loading="lazy"
                                        decoding="async"
                                    />
                                ) : (
                                    <p>No image available</p>
                                )}
                                {multipleImages && (
                                    <div className="image-pagination-controls" style={{ textAlign: 'center', marginTop: '10px' }}>
                                        <button onClick={handlePrevImage} disabled={currentImageIndex === 0}>
                                            Previous
                                        </button>
                                        <span>
                                            Image {currentImageIndex + 1} of {item.imageData.length}
                                        </span>
                                        <button onClick={handleNextImage} disabled={currentImageIndex === item.imageData.length - 1}>
                                            Next
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="item-info">
                                <h3>{item.name || 'N/A'}</h3>
                                <div className="detail-item">
                                    <i className="fas fa-align-left"></i><strong>Description:</strong> {item.description || 'N/A'}
                                </div>
                                <div className="detail-item">
                                    <i className="fas fa-tag"></i> <strong>Category:</strong> {item.category || 'N/A'}
                                </div>
                                <div className="detail-item">
                                    <i className="fas fa-calendar"></i> <strong>Date Found:</strong> {item.date || 'N/A'} 
                                    {/* Assumes date is pre-formatted or a simple string from item.date */}
                                </div>
                                <div className="detail-item">
                                    <i className="fas fa-map-marker-alt"></i> <strong>Location Found:</strong> {item.location || 'N/A'}
                                </div>
                                {item.exactLocation && (
                                    <div className="detail-item">
                                        <i className="fas fa-map-pin"></i> <strong>Exact Location:</strong> {item.exactLocation}
                                    </div>
                                )}
                                {item.uniqueIdentifier && (
                                    <div className="detail-item">
                                        <i className="fas fa-fingerprint"></i> <strong>Unique Identifier:</strong> {item.uniqueIdentifier}
                                    </div>
                                )}
                                {item.submitter && (
                                <div className="detail-item">
                                    <i className="fas fa-user"></i> <strong>Submitted By:</strong> {item.submitter.full_name || 'N/A'}
                                    {item.submitter.student_id && ` (ID: ${item.submitter.student_id})`}
                                </div>
                                )}
                                {item.additionalDetails && (
                                    <div className="item-info"> 
                                     <p>{item.additionalDetails}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    {!loading && !item && <p>Item details could not be loaded or found.</p>}
                </div>
                <div className="modal-footer">
                    <button className="btn back" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
};
