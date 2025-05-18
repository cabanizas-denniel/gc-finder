import React, { useState, useEffect } from 'react';
import { getAllUsers } from '../../admin-firebase';

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
    
    // Fetch users from Firestore
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                setLoading(true);
                const usersData = await getAllUsers();
                setUsers(usersData);
                setLoading(false);
            } catch (err) {
                console.error("Error fetching users:", err);
                setError("Failed to load users. Please try again later.");
                setLoading(false);
            }
        };
        
        fetchUsers();
    }, []);

    // Filter users based on active tab and search term
    useEffect(() => {
        const filtered = users.filter(user => {
            // Tab
            if (activeTab !== 'all' && user.status !== activeTab) {
                return false;
            }
            
            // Search term
            if (searchTerm) {
                return (
                    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    user.email.toLowerCase().includes(searchTerm.toLowerCase())
                );
            }
            
            return true;
        });
        
        setFilteredUsers(filtered);
    }, [activeTab, searchTerm, users]);

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

    // Status badge
    const renderStatusBadge = (status) => {
        switch (status) {
            case 'active':
                return <span className="status-badge active">Active</span>;
            case 'flagged':
                return <span className="status-badge flagged">Flagged</span>;
            case 'banned':
                return <span className="status-badge banned">Banned</span>;
            default:
                return null;
        }
    };

    // User actions
    const handleViewUser = (user) => {
        alert(`Viewing profile for ${user.name}`);
        // TODO: viewing user details
    };

    const handleFlagUser = (user) => {
        // TODO: flagging a user
        alert(`${user.name} has been flagged`);
    };

    const handleBanUser = (user) => {
        // TODO: banning a user
        alert(`${user.name} has been banned`);
    };

    const getTabCount = (status) => {
        return users.filter(user => user.status === status).length;
    };

    return (
            <div className="user-management-container">
                <div className="page-header">
                    <div className="page-header-content">
                <h1>User Management</h1>
                <p className="admin-subtitle">View, flag, and manage user accounts in the GC Finder system</p>
                    </div>
                    <div className="action-buttons">
                        <button className="export-btn">
                            <i className="fas fa-download"></i> Export Data
                        </button>
                        <button className="refresh-btn" onClick={() => window.location.reload()}>
                            <i className="fas fa-sync-alt"></i> Refresh
                        </button>
                    </div>
                </div>

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
                                    <th>Items Claimed</th>
                                    <th>Items Reported</th>
                                    <th>Items Archived</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map((user, index) => (
                                    <tr key={user.id || index} className={user.status}>
                                        <td className="user-name">{user.name}</td>
                                        <td>{user.email}</td>
                                        <td>{renderStatusBadge(user.status)}</td>
                                        <td className="items-claimed">{user.itemsClaimed}</td>
                                        <td className="items-reported">{user.itemsReported}</td>
                                        <td className="items-archived">{user.itemsArchived}</td>
                                        <td className="actions">
                                            <button 
                                                className="action-btn view" 
                                                aria-label="View"
                                                onClick={() => handleViewUser(user)}
                                                title="View User Details"
                                            >
                                                <i className="fas fa-eye"></i>
                                            </button>
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
            </div>
    );
};

export default UserManagement;