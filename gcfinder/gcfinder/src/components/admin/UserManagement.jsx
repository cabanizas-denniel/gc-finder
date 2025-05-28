import React, { useState, useEffect } from 'react';
import { getAllUsers } from '../../admin-firebase';
import Toast, { useToast } from '../Toast';

const UserManagement = () => {
    const [activeTab, setActiveTab] = useState('active');
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [sortConfig, setSortConfig] = useState({
        key: null,
        direction: 'ascending'
    });
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10); // Users per page
    
    // Export Modal State
    const [exportModalOpen, setExportModalOpen] = useState(false);
    const [exportStartDate, setExportStartDate] = useState('');
    const [exportEndDate, setExportEndDate] = useState('');
    
    // Show Export Modal State
    const [showExportModal, setShowExportModal] = useState(false);

    // Toast notification
    const { toast, showToast, hideToast } = useToast();

    // Fetch users from Firestore
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                setLoading(true);
                const usersDataFromFirebase = await getAllUsers();

                // Mock data removed
                
                setUsers(usersDataFromFirebase);
            } catch (err) {
                console.error("Error fetching users:", err);
                setError("Failed to load users. Please try again later.");
            } finally {
                setLoading(false);
            }
        };
        
        fetchUsers();
    }, []);

    // Filter users based on active tab and search term, then paginate
    useEffect(() => {
        let processedUsers = users;

        // Filter by active tab first
        if (activeTab !== 'all') {
            processedUsers = users.filter(user => user.status === activeTab);
        }
        
        // Then, filter by search term
        if (searchTerm) {
            processedUsers = processedUsers.filter(user => 
                user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.email.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        
        // Apply pagination to the processed (tab-filtered and search-filtered) users
        const indexOfLastUser = currentPage * itemsPerPage;
        const indexOfFirstUser = indexOfLastUser - itemsPerPage;
        setFilteredUsers(processedUsers.slice(indexOfFirstUser, indexOfLastUser));

    }, [activeTab, searchTerm, users, currentPage, itemsPerPage]);

    // Effect to reset page when activeTab or searchTerm changes
    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, searchTerm]);

    // Sort users
    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
        
        const sortedUsers = [...filteredUsers].sort((a, b) => {
            if (a[key] < b[key]) {
                return sortConfig.direction === 'ascending' ? -1 : 1;
            }
            if (a[key] > b[key]) {
                return sortConfig.direction === 'ascending' ? 1 : -1;
            }
            return 0;
        });
        
        setFilteredUsers(sortedUsers);
    };

    // User actions

    const handleFlagUser = (user) => {
        // TODO: flagging a user
        showToast(`${user.name} has been flagged`, 'success');
    };

    const handleBanUser = (user) => {
        // TODO: banning a user
        showToast(`${user.name} has been banned`, 'success');
    };

    // Export Modal Handlers
    const handleOpenExportModal = () => {
        setExportModalOpen(true);
    };

    const handleCloseExportModal = () => {
        setExportModalOpen(false);
        setExportStartDate('');
        setExportEndDate('');
    };

    const handleTriggerExport = async (startDateOverride, endDateOverride) => {
        const finalStartDate = startDateOverride || exportStartDate;
        const finalEndDate = endDateOverride || exportEndDate;
    
        if (!finalStartDate || !finalEndDate) {
            showToast("Please select both a 'From' and 'To' date.", 'warning');
            return;
        }
        if (new Date(finalStartDate) > new Date(finalEndDate)) {
            showToast("'From' date cannot be after 'To' date.", 'error');
            return;
        }
    
        const apiUrl = process.env.REACT_APP_API_URL; // Get the API URL
        if (!apiUrl) {
            showToast("API URL is not configured. Please check environment settings.", 'error');
            console.error("REACT_APP_API_URL is not set");
            return;
        }
    
        try {
            const response = await fetch(`${apiUrl}/api/export?type=users&startDate=${finalStartDate}&endDate=${finalEndDate}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                }
            });
    
            if (!response.ok) {
                const errorData = await response.text();
                console.error('Export error response:', errorData);
                throw new Error('Export failed: ' + (errorData || response.statusText));
            }
    
            const contentType = response.headers.get('content-type');
             if (!contentType || !contentType.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')) {
                const errorText = await response.text();
                console.error("Unexpected response content type:", contentType, "Response body:", errorText);
                throw new Error('Invalid response format: Expected Excel file, but received ' + contentType);
            }
    
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = 'GCFinder_users_export.xlsx'; // Default filename
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                if (filenameMatch && filenameMatch[1]) {
                    filename = filenameMatch[1].replace(/['"]/g, '');
                }
            }
    
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            handleCloseExportModal();
    
        } catch (error) {
            console.error('Export error:', error);
            showToast('Failed to export user data: ' + error.message, 'error');
        }
    };

    const handleThisMonthExport = () => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
        setExportStartDate(firstDay);
        setExportEndDate(lastDay);
        handleTriggerExport(firstDay, lastDay);
    };

    const handleAllTimeExport = () => {
        const startDate = '2020-01-01'; // A nominal early date
        const endDate = new Date().toISOString().split('T')[0]; // Today
        setExportStartDate(startDate);
        setExportEndDate(endDate);
        handleTriggerExport(startDate, endDate);
    };

    const getTabCount = (status) => {
        return users.filter(user => user.status === status).length;
    };

    const renderStatusBadge = (status) => {
        switch (status) {
            case 'active':
                return <span className="user-status-badge active">Active</span>;
            case 'flagged':
                return <span className="user-status-badge flagged">Flagged</span>;
            case 'banned':
                return <span className="user-status-badge banned">Banned</span>;
            default:
                return null;
        }
    };

    return (
            <div className="user-management-container">
                <div className="page-header">
                    <div className="page-header-content">
                <h1>User Management</h1>
                <p className="admin-subtitle">View, flag, and manage user accounts in the GC Finder system</p>
                    </div>
                    <div className="action-buttons">
                        <button className="export-btn" onClick={handleOpenExportModal}>
                            <i className="fas fa-download"></i> Export Data
                        </button>
                        <button className="refresh-btn" onClick={() => window.location.reload()}>
                            <i className="fas fa-sync-alt"></i> Refresh
                        </button>
                    </div>
                </div>

                {/* Export Modal */}
                {exportModalOpen && (
                    <div className="export-modal-overlay">
                        <div className="export-modal-content">
                            <div className="export-modal-header">
                                <h2 className="export-modal-title">
                                    Export User Data
                                </h2>
                                <button onClick={handleCloseExportModal} className="export-modal-close-btn" aria-label="close">
                                    <i className="fas fa-times"></i>
                                </button>
                            </div>
                            <p className="export-modal-description">
                                Select the date range for the user data you want to export.
                            </p>
                            {/* Quick select buttons */}
                            <div className="export-modal-quick-select">
                                <button 
                                    onClick={handleThisMonthExport} 
                                    className="export-modal-quick-btn"
                                >
                                    This Month
                                </button>
                                <button 
                                    onClick={handleAllTimeExport}
                                    className="export-modal-quick-btn"
                                >
                                    All Time
                                </button>
                            </div>

                            {/* Date inputs with labels */}
                            <div className="export-modal-date-input-group">
                                <label htmlFor="exportStartDateModalUser">From Date:</label>
                                <input
                                    id="exportStartDateModalUser"
                                    type="date"
                                    value={exportStartDate}
                                    onChange={(e) => setExportStartDate(e.target.value)}
                                    className="export-modal-date-input"
                                />
                            </div>
                            <div className="export-modal-date-input-group">
                                <label htmlFor="exportEndDateModalUser">To Date:</label>
                                <input
                                    id="exportEndDateModalUser"
                                    type="date"
                                    value={exportEndDate}
                                    onChange={(e) => setExportEndDate(e.target.value)}
                                    className="export-modal-date-input"
                                />
                            </div>
                            <div className="export-modal-actions">
                                <button 
                                    onClick={handleCloseExportModal} 
                                    className="export-modal-cancel-btn"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={() => handleTriggerExport(exportStartDate, exportEndDate)} 
                                    className="export-modal-confirm-btn"
                                >
                                    Export
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="filter-section">
                <div className="tabs">
                        <button 
                            className={`item-tab ${activeTab === 'all' ? 'active' : ''}`}
                            onClick={() => setActiveTab('all')}
                        >
                            <i className="fas fa-th-list"></i> All Users
                            <span className="count">{users.length}</span>
                        </button>
                    <button 
                        className={`item-tab ${activeTab === 'active' ? 'active' : ''}`}
                        onClick={() => setActiveTab('active')}
                    >
                            <i className="fas fa-users"></i> Active
                            <span className="count">{getTabCount('active')}</span>
                    </button>
                    <button 
                        className={`item-tab ${activeTab === 'flagged' ? 'active' : ''}`}
                        onClick={() => setActiveTab('flagged')}
                    >
                            <i className="fas fa-flag"></i> Flagged
                            <span className="count">{getTabCount('flagged')}</span>
                    </button>
                    <button 
                        className={`item-tab ${activeTab === 'banned' ? 'active' : ''}`}
                        onClick={() => setActiveTab('banned')}
                    >
                            <i className="fas fa-ban"></i> Banned
                            <span className="count">{getTabCount('banned')}</span>
                    </button>
                </div>

                <div className="search-bar">
                        <i className="fas fa-search search-icon"></i>
                    <input 
                        type="text" 
                            placeholder="Search by name or email..."
                        className="search-input"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button 
                                className="clear-search" 
                                onClick={() => setSearchTerm('')}
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        )}
                    </div>
                </div>

                <div className="users-table-container">
                    {loading ? (
                        <div className="loading-message">
                            <i className="fas fa-spinner fa-pulse"></i>
                            <p>Loading users...</p>
                        </div>
                    ) : error ? (
                        <div className="error-message">
                            <i className="fas fa-exclamation-circle"></i>
                            <p>{error}</p>
                        </div>
                    ) : filteredUsers.length > 0 ? (
                        <table className="users-table">
                        <thead>
                            <tr>
                                    <th onClick={() => requestSort('name')}>
                                        Name 
                                        {sortConfig.key === 'name' && (
                                            <i className={`fas fa-sort-${sortConfig.direction === 'ascending' ? 'up' : 'down'}`}></i>
                                        )}
                                    </th>
                                    <th>Email</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map((user, index) => (
                                    <tr key={user.id || index} className={user.status}>
                                        <td className="user-name">{user.name}</td>
                                        <td>{user.email}</td>
                                        <td className="user-status-badge">{renderStatusBadge(user.status)}</td>
                                        <td className="actions">
                                            <button 
                                                className="action-btn flag" 
                                                aria-label="Flag"
                                                onClick={() => handleFlagUser(user)}
                                                title="Flag User"
                                                disabled={user.status === 'flagged' || user.status === 'banned'}
                                            >
                                                <i className="fas fa-flag"></i>
                                            </button>
                                            <button 
                                                className="action-btn ban" 
                                                aria-label="Ban"
                                                onClick={() => handleBanUser(user)}
                                                title="Ban User"
                                                disabled={user.status === 'banned'}
                                            >
                                                <i className="fas fa-user-slash"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="no-results">
                            <i className="fas fa-search"></i>
                            <h3>No users found</h3>
                            <p>Try adjusting your search or filter criteria</p>
                        </div>
                    )}
                </div>

                {/* Pagination Controls */}
                {(() => {
                    // Calculate total users after applying current tab and search filters
                    let usersForPaginationCount = users;
                    if (activeTab !== 'all') {
                        usersForPaginationCount = usersForPaginationCount.filter(user => user.status === activeTab);
                    }
                    if (searchTerm) {
                        usersForPaginationCount = usersForPaginationCount.filter(user =>
                            user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            user.email.toLowerCase().includes(searchTerm.toLowerCase())
                        );
                    }
                    const totalPages = Math.ceil(usersForPaginationCount.length / itemsPerPage);

                    if (totalPages > 1) {
                        return (
                            <div className="pagination-controls">
                                <button 
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                >
                                    <i className="fas fa-chevron-left"></i> Previous
                                </button>
                                <span>Page {currentPage} of {totalPages}</span>
                                <button 
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                >
                                    Next <i className="fas fa-chevron-right"></i>
                                </button>
                            </div>
                        );
                    }
                    return null; // No pagination needed if only one page or no users
                })()}

                {/* Toast Notification */}
                <Toast 
                    message={toast.message} 
                    show={toast.show} 
                    onClose={hideToast} 
                    type={toast.type} 
                />
            </div>
    );
};

export default UserManagement;