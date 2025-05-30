import React, { useState, useEffect } from 'react';
import { getPendingItems, approveItem, disapproveItem } from '../../admin-firebase';

const ReviewReports = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [notifications, setNotifications] = useState([
        { id: 1, title: 'New Item submitted', description: 'A new lost item has been reported', time: '2 minutes ago' },
        { id: 2, title: 'Claims approved', description: '5 claims have been approved', time: '1 hour ago' },
        { id: 3, title: 'System update', description: 'System maintenance completed', time: '2 hours ago' }
    ]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentImageIndex, setCurrentImageIndex] = useState({});

    // Fetch pending items on component mount
    useEffect(() => {
        const fetchPendingItems = async () => {
            try {
                setLoading(true);
                const items = await getPendingItems();
                setReports(items);
                setError('');
            } catch (err) {
                console.error('Error fetching pending items:', err);
                setError('Failed to load pending items. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        fetchPendingItems();
    }, []);

    const filteredReports = reports.filter(report => {
        const matchesSearch = report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            report.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || report.category.toLowerCase() === selectedCategory.toLowerCase();
        return matchesSearch && matchesCategory;
    });

    const handleApproveAll = async () => {
        try {
            setLoading(true);
            const approvePromises = reports.map(report => approveItem(report.id));
            await Promise.all(approvePromises);
            
            // Refresh the list after approving all
            const updatedItems = await getPendingItems();
            setReports(updatedItems);
            
            // Add notification for successful approval
            setNotifications(prev => [{
                id: Date.now(),
                title: 'Items Approved',
                description: `${reports.length} items have been approved`,
                time: 'Just now'
            }, ...prev]);
        } catch (err) {
            console.error('Error approving all items:', err);
            setError('Failed to approve all items. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleApproveItem = async (itemId) => {
        try {
            setLoading(true);
            await approveItem(itemId);
            
            // Remove the approved item from the list
            setReports(prev => prev.filter(report => report.id !== itemId));
            
            // Add notification for successful approval
            setNotifications(prev => [{
                id: Date.now(),
                title: 'Item Approved',
                description: 'An item has been approved',
                time: 'Just now'
            }, ...prev]);
        } catch (err) {
            console.error('Error approving item:', err);
            setError('Failed to approve item. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleDisapproveItem = async (itemId) => {
        try {
            setLoading(true);
            await disapproveItem(itemId);
            
            // Remove the disapproved item from the list
            setReports(prev => prev.filter(report => report.id !== itemId));
            
            // Add notification for successful disapproval
            setNotifications(prev => [{
                id: Date.now(),
                title: 'Item Disapproved',
                description: 'An item has been disapproved',
                time: 'Just now'
            }, ...prev]);
        } catch (err) {
            console.error('Error disapproving item:', err);
            setError('Failed to disapprove item. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        setSearchQuery(e.target.value);
    };

    const handleCategoryChange = (e) => {
        setSelectedCategory(e.target.value);
    };

    const toggleNotifications = () => {
        setShowNotifications(!showNotifications);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending':
                return '#FFA500';
            case 'approved':
                return '#2D5A27';
            case 'rejected':
                return '#dc3545';
            default:
                return '#666';
        }
    };

    // Image navigation functions
    const nextImage = (reportId, totalImages) => {
        setCurrentImageIndex(prev => ({
            ...prev,
            [reportId]: ((prev[reportId] || 0) + 1) % totalImages
        }));
    };

    const prevImage = (reportId, totalImages) => {
        setCurrentImageIndex(prev => ({
            ...prev,
            [reportId]: prev[reportId] > 0 ? prev[reportId] - 1 : totalImages - 1
        }));
    };

    const goToImage = (reportId, index) => {
        setCurrentImageIndex(prev => ({
            ...prev,
            [reportId]: index
        }));
    };

    // Enhanced Image Gallery Component
    const ImageGallery = ({ report }) => {
        const images = report.images && report.images.length > 0 ? report.images : [report.image];
        const currentIndex = currentImageIndex[report.id] || 0;
        const hasMultipleImages = images.length > 1;

        const galleryStyles = {
            container: {
                position: 'relative',
                width: '100%',
                height: '200px',
                borderRadius: '8px',
                overflow: 'hidden',
                backgroundColor: '#f5f5f5'
            },
            image: {
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transition: 'opacity 0.3s ease'
            },
            navButton: {
                position: 'absolute',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '40px',
                height: '40px',
                border: 'none',
                borderRadius: '50%',
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                color: 'white',
                fontSize: '18px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                zIndex: 2
            },  
            prevButton: {
                left: '10px'
            },
            nextButton: {
                right: '10px'
            },
            dotsContainer: {
                position: 'absolute',
                bottom: '12px',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                gap: '6px',
                zIndex: 2
            },
            dot: {
                width: '8px',
                height: '8px',
                border: 'none',
                borderRadius: '50%',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
            },
            activeDot: {
                backgroundColor: 'white',
                boxShadow: '0 0 4px rgba(0,0,0,0.3)'
            },
            inactiveDot: {
                backgroundColor: 'rgba(255, 255, 255, 0.6)'
            },
            counter: {
                position: 'absolute',
                top: '12px',
                right: '12px',
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '500',
                zIndex: 2
            },
            imagesBadge: {
                position: 'absolute',
                top: '12px',
                left: '12px',
                backgroundColor: 'rgba(37, 99, 235, 0.9)',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                zIndex: 2
            }
        };

        return (
            <div style={galleryStyles.container}>
                <img 
                    src={images[currentIndex]} 
                    alt={`${report.title} - Image ${currentIndex + 1}`}
                    style={galleryStyles.image}
                />
                
                {hasMultipleImages && (
                    <>
                        {/* Images badge */}
                        <div style={galleryStyles.imagesBadge}>
                            <i className="fas fa-images"></i>
                            {images.length}
                        </div>

                        {/* Navigation buttons */}
                        <button
                            style={{...galleryStyles.navButton, ...galleryStyles.prevButton}}
                            onClick={() => prevImage(report.id, images.length)}
                            onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(0, 0, 0, 0.9)'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(0, 0, 0, 0.7)'}
                        >
                            <i className="fas fa-chevron-left"></i>
                        </button>
                        
                        <button
                            style={{...galleryStyles.navButton, ...galleryStyles.nextButton}}
                            onClick={() => nextImage(report.id, images.length)}
                            onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(0, 0, 0, 0.9)'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(0, 0, 0, 0.7)'}
                        >
                            <i className="fas fa-chevron-right"></i>
                        </button>

                        {/* Dot indicators */}
                        <div style={galleryStyles.dotsContainer}>
                            {images.map((_, index) => (
                                <button
                                    key={index}
                                    style={{
                                        ...galleryStyles.dot,
                                        ...(currentIndex === index ? galleryStyles.activeDot : galleryStyles.inactiveDot)
                                    }}
                                    onClick={() => goToImage(report.id, index)}
                                    onMouseEnter={(e) => {
                                        if (currentIndex !== index) {
                                            e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (currentIndex !== index) {
                                            e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.6)';
                                        }
                                    }}
                                />
                            ))}
                        </div>

                        {/* Counter */}
                        <div style={galleryStyles.counter}>
                            {currentIndex + 1} / {images.length}
                        </div>
                    </>
                )}
            </div>
        );
    };

    return (
            <div className="review-reports-container">
                <div className="report-actions">
                    <button 
                        className="approve-all-btn" 
                        onClick={handleApproveAll}
                        disabled={loading || reports.length === 0}
                    >
                        <i className="fas fa-check-circle"></i>
                        Approve All Pending
                    </button>
                    <div className="search-box">
                        <i className="fas fa-search"></i>
                        <input
                            type="text"
                            placeholder="Search reports..."
                            value={searchQuery}
                            onChange={handleSearch}
                        />
                    </div>
                    <select
                        className="category-filter"
                        value={selectedCategory}
                        onChange={handleCategoryChange}
                    >
                        <option value="all">All Categories</option>
                        <option value="ID's & Documents">ID's & Documents</option>
                        <option value="Electronics & Gadgets">Electronics & Gadgets</option>
                        <option value="Clothing & Wearables">Clothing & Wearables</option>
                        <option value="School Supplies">School Supplies</option>
                        <option value="Bags & Accessories">Bags & Accessories</option>
                        <option value="Personal Items">Personal Items</option>
                        <option value="Miscellaneous">Miscellaneous</option>
                    </select>
                </div>
 
                {loading && <div className="loading-message">Loading pending items...</div>}
                {error && <div className="error-message">{error}</div>}
                {!loading && reports.length === 0 && <div className="loading-message">No items awating for approval.</div>}
                    <div className="reports-grid">
                        {filteredReports.map(report => (
                            <div key={report.id} className="report-card">
                                <div className="report-status" style={{ backgroundColor: getStatusColor(report.status) }}>
                                    {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                                </div>
                                <div className="report-image">
                                    <ImageGallery report={report} />
                                </div>
                                <div className="report-info">
                                    <h3>{report.title}</h3>
                                    <p className="report-category">{report.category}</p>
                                    <p className="report-date">Reported on {report.date}</p>
                                    <p className="report-description">{report.description}</p>
                                    <p className="report-description-info"><i className="fas fa-map-marker-alt"></i> Location: {report.location}</p>
                                    {report.exactLocation && (
                                        <p className="report-description-info"><i className="fas fa-map-marker-alt"></i> Exact Location: {report.exactLocation}</p>
                                    )}
                                    {report.uniqueIdentifier && (
                                        <p className="report-description-info"><i className="fas fa-qrcode"></i> Identifier: {report.uniqueIdentifier}</p>
                                    )}
                                    {report.additionalDetails && (
                                        <p className="report-description-info"><i className="fas fa-info-circle"></i> Additional Details: {report.additionalDetails}</p>
                                    )}
                                    {report.submitter && (
                                        <p className="report-description-info">
                                            <i className="fas fa-user"></i> Submitted By: {report.submitter.full_name}
                                            {report.submitter.student_id && ` (ID: ${report.submitter.student_id})`}
                                        </p>
                                    )}
                                    <div className="report-actions">
                                        <button 
                                            className="report-approve-btn"
                                            onClick={() => handleApproveItem(report.id)}
                                            disabled={loading}
                                        >
                                            Approve Item
                                        </button>
                                        <button 
                                            className="disapprove-btn"
                                            onClick={() => handleDisapproveItem(report.id)}
                                            disabled={loading}
                                        >
                                            Disapprove Item
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                <div className="notifications-panel" style={{ display: showNotifications ? 'block' : 'none' }}>
                    <div className="notifications-header">
                        <h3>Notifications</h3>
                        <button className="close-notifications" onClick={toggleNotifications}>
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                    <div className="notifications-list">
                        {notifications.map(notification => (
                            <div key={notification.id} className="notification-item">
                                <div className="notification-content">
                                    <h4>{notification.title}</h4>
                                    <p>{notification.description}</p>
                                </div>
                                <span className="notification-time">{notification.time}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
    );
};

export default ReviewReports;