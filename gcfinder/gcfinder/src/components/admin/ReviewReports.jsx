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
                                    <img src={report.image} alt={report.title} />
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
                                            className="approve-btn"
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