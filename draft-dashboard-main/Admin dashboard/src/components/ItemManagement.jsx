import React, { useState, useEffect } from 'react';
import { getAllItems } from '../firebase';

const ItemManagement = () => {
    const [activeTab, setActiveTab] = useState('active');
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredItems, setFilteredItems] = useState([]);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [sortConfig, setSortConfig] = useState({
        key: null,
        direction: 'ascending'
    });
    
    // Sample items data - replace with actual Firebase fetch
    useEffect(() => {
        const fetchItems = async () => {
            try {
                setLoading(true);
                // Replace with actual Firebase call when available
                // const itemsData = await getAllItems();
                
                // Temporary mock data
                const itemsData = [
                    {
                        id: '1',
                        name: 'School ID',
                        location: 'Main Building',
                        category: 'ID/Documents',
                        reportedBy: 'John Doe',
                        dateFound: '2023-05-15',
                        status: 'active',
                        claimRequests: 2,
                    },
                    {
                        id: '2',
                        name: 'Blue Umbrella',
                        location: 'Library',
                        category: 'Accessories',
                        reportedBy: 'Jane Smith',
                        dateFound: '2023-05-17',
                        status: 'claimed',
                        claimRequests: 1,
                    },
                    {
                        id: '3',
                        name: 'Water Bottle',
                        location: 'Gym',
                        category: 'Personal Items',
                        reportedBy: 'Mike Johnson',
                        dateFound: '2023-05-18',
                        status: 'active',
                        claimRequests: 0,
                    },
                    {
                        id: '4',
                        name: 'Laptop Charger',
                        location: 'Computer Lab',
                        category: 'Electronics',
                        reportedBy: 'Sarah Williams',
                        dateFound: '2023-05-20',
                        status: 'flagged',
                        claimRequests: 3,
                    },
                    {
                        id: '5',
                        name: 'Calculator',
                        location: 'Math Department',
                        category: 'School Supplies',
                        reportedBy: 'David Brown',
                        dateFound: '2023-05-22',
                        status: 'archived',
                        claimRequests: 0,
                    }
                ];
                
                setItems(itemsData);
                setLoading(false);
            } catch (err) {
                console.error("Error fetching items:", err);
                setError("Failed to load items. Please try again later.");
                setLoading(false);
            }
        };
        
        fetchItems();
    }, []);

    // Filter items based on active tab and search term
    useEffect(() => {
        const filtered = items.filter(item => {
            // Filter by tab
            if (activeTab !== 'all' && item.status !== activeTab) {
                return false;
            }
            
            // Filter by search term
            if (searchTerm) {
                return (
                    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    item.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    item.category.toLowerCase().includes(searchTerm.toLowerCase())
                );
            }
            
            return true;
        });
        
        setFilteredItems(filtered);
    }, [activeTab, searchTerm, items]);

    // Sort items
    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
        
        const sortedItems = [...filteredItems].sort((a, b) => {
            if (a[key] < b[key]) {
                return sortConfig.direction === 'ascending' ? -1 : 1;
            }
            if (a[key] > b[key]) {
                return sortConfig.direction === 'ascending' ? 1 : -1;
            }
            return 0;
        });
        
        setFilteredItems(sortedItems);
    };

    // Status badge renderer
    const renderStatusBadge = (status) => {
        switch (status) {
            case 'active':
                return <span className="item-status-badge active">Active</span>;
            case 'claimed':
                return <span className="item-status-badge claimed">Claimed</span>;
            case 'flagged':
                return <span className="item-status-badge flagged">Flagged</span>;
            case 'archived':
                return <span className="item-status-badge archived">Archived</span>;
            default:
                return null;
        }
    };

    // Item actions
    const handleViewItem = (item) => {
        alert(`Viewing details for ${item.name}`);
        // Implementation for viewing item details
    };

    const handleFlagItem = (item) => {
        // Implementation for flagging an item
        alert(`${item.name} has been flagged`);
    };

    const handleArchiveItem = (item) => {
        // Implementation for archiving an item
        alert(`${item.name} has been archived`);
    };

    const getTabCount = (status) => {
        return items.filter(item => item.status === status).length;
    };

    return (
            <div className="item-management-container">
                <div className="page-header">
                    <div className="page-header-content">
                        <h1>Item Management</h1>
                        <p className="subtitle">View, flag, and manage lost and found items in the GC Finder system</p>
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
                            <i className="fas fa-th-list"></i> All Items
                            <span className="item-count">{items.length}</span>
                        </button>
                        <button 
                            className={`item-tab ${activeTab === 'active' ? 'active' : ''}`}
                            onClick={() => setActiveTab('active')}
                        >
                            <i className="fas fa-box-open"></i> Active
                            <span className="item-count">{getTabCount('active')}</span>
                        </button>
                        <button 
                            className={`item-tab ${activeTab === 'claimed' ? 'active' : ''}`}
                            onClick={() => setActiveTab('claimed')}
                        >
                            <i className="fas fa-check-circle"></i> Claimed
                            <span className="item-count">{getTabCount('claimed')}</span>
                        </button>
                        <button 
                            className={`item-tab ${activeTab === 'flagged' ? 'active' : ''}`}
                            onClick={() => setActiveTab('flagged')}
                        >
                            <i className="fas fa-flag"></i> Flagged
                            <span className="item-count">{getTabCount('flagged')}</span>
                        </button>
                        <button 
                            className={`item-tab ${activeTab === 'archived' ? 'active' : ''}`}
                            onClick={() => setActiveTab('archived')}
                        >
                            <i className="fas fa-archive"></i> Archived
                            <span className="item-count">{getTabCount('archived')}</span>
                        </button>
                    </div>

                    <div className="search-bar">
                        <i className="fas fa-search search-icon"></i>
                        <input 
                            type="text" 
                            placeholder="Search by name, location, or category..."
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

                <div className="items-table-container">
                    {loading ? (
                        <div className="item-loading-message">
                            <i className="fas fa-spinner fa-pulse"></i>
                            <p>Loading items...</p>
                        </div>
                    ) : error ? (
                        <div className="item-error-message">
                            <i className="fas fa-exclamation-circle"></i>
                            <p>{error}</p>
                        </div>
                    ) : filteredItems.length > 0 ? (
                        <table className="items-table">
                            <thead>
                                <tr>
                                    <th onClick={() => requestSort('name')}>
                                        Item Name 
                                        {sortConfig.key === 'name' && (
                                            <i className={`fas fa-sort-${sortConfig.direction === 'ascending' ? 'up' : 'down'}`}></i>
                                        )}
                                    </th>
                                    <th onClick={() => requestSort('category')}>
                                        Category
                                        {sortConfig.key === 'category' && (
                                            <i className={`fas fa-sort-${sortConfig.direction === 'ascending' ? 'up' : 'down'}`}></i>
                                        )}
                                    </th>
                                    <th onClick={() => requestSort('location')}>
                                        Location
                                        {sortConfig.key === 'location' && (
                                            <i className={`fas fa-sort-${sortConfig.direction === 'ascending' ? 'up' : 'down'}`}></i>
                                        )}
                                    </th>
                                    <th onClick={() => requestSort('dateFound')}>
                                        Date Found
                                        {sortConfig.key === 'dateFound' && (
                                            <i className={`fas fa-sort-${sortConfig.direction === 'ascending' ? 'up' : 'down'}`}></i>
                                        )}
                                    </th>
                                    <th>Status</th>
                                    <th>Claim Requests</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredItems.map((item, index) => (
                                    <tr key={item.id || index} className={`item-row-${item.status}`}>
                                        <td className="item-name">{item.name}</td>
                                        <td>{item.category}</td>
                                        <td>{item.location}</td>
                                        <td>{item.dateFound}</td>
                                        <td>{renderStatusBadge(item.status)}</td>
                                        <td className="item-claim-requests">{item.claimRequests}</td>
                                        <td className="item-actions">
                                            <button 
                                                className="item-action-btn view" 
                                                aria-label="View"
                                                onClick={() => handleViewItem(item)}
                                                title="View Item Details"
                                            >
                                                <i className="fas fa-eye"></i>
                                            </button>
                                            <button 
                                                className="item-action-btn flag" 
                                                aria-label="Flag"
                                                onClick={() => handleFlagItem(item)}
                                                title="Flag Item"
                                                disabled={item.status === 'flagged' || item.status === 'archived'}
                                            >
                                                <i className="fas fa-flag"></i>
                                            </button>
                                            <button 
                                                className="item-action-btn archive" 
                                                aria-label="Archive"
                                                onClick={() => handleArchiveItem(item)}
                                                title="Archive Item"
                                                disabled={item.status === 'archived'}
                                            >
                                                <i className="fas fa-archive"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="item-no-results">
                            <i className="fas fa-search"></i>
                            <h3>No items found</h3>
                            <p>Try adjusting your search or filter criteria</p>
                        </div>
                    )}
                </div>
            </div>
    );
};

export default ItemManagement;