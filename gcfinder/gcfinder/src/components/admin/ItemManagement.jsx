import React, { useState, useEffect } from 'react';
import { getAllItems, deleteItemFromDb, archiveItemInDb, unarchiveItemInDb } from '../../admin-firebase';
import { AdminViewItemDetailsModal } from './ItemsLIst'; // Import the shared modal
import Toast, { useToast } from '../Toast';

const ItemManagement = () => {
    const [activeTab, setActiveTab] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredItems, setFilteredItems] = useState([]);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [sortConfig, setSortConfig] = useState({
        key: null,
        direction: 'ascending'
    });
    // State for Item Details Modal
    const [showItemDetailsModal, setShowItemDetailsModal] = useState(false);
    const [selectedItemForModal, setSelectedItemForModal] = useState(null);
    
    // Pagination state (generalized)
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10); // Items per page for all tabs

    // Helper: format date as MM - DD - YYYY
    const formatDateMDY = (input) => {
        if (!input) return 'N/A';
        let dateObj = null;
        if (typeof input === 'string' || typeof input === 'number') {
            dateObj = new Date(input);
        } else if (input && typeof input.toDate === 'function') {
            dateObj = input.toDate();
        } else if (input && typeof input.seconds === 'number') {
            dateObj = new Date(input.seconds * 1000);
        } else {
            try {
                dateObj = new Date(input);
            } catch (_) {
                return 'N/A';
            }
        }
        if (isNaN(dateObj)) return 'N/A';
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const yyyy = dateObj.getFullYear();
        return `${mm} - ${dd} - ${yyyy}`;
    };

    // Export Modal State
    const [exportModalOpen, setExportModalOpen] = useState(false);
    const [exportStartDate, setExportStartDate] = useState('');
    const [exportEndDate, setExportEndDate] = useState('');
    
    // Toast notification
    const { toast, showToast, hideToast } = useToast();

    // Fetch items data from Firebase
    const fetchItems = async () => {
        try {
            setLoading(true);
            const itemsDataFromFirebase = await getAllItems();
            const mappedItems = itemsDataFromFirebase.map(item => ({
                id: item.id,
                name: item.name || 'N/A',
                location: item.location || 'N/A',
                category: item.category || 'N/A',
                reportedBy: item.submitter?.full_name || item.reportedBy || item.full_name || item.submitted_by_name || 'N/A', 
                date: item.date ? formatDateMDY(item.date) : 'N/A', 
                status: item.status ? item.status.toLowerCase() : 'unknown',
                originalItemName: item.originalItemName || item.name,
                description: item.description,
                imageData: item.imageData,
                exactLocation: item.exactLocation,
                uniqueIdentifier: item.uniqueIdentifier,
                additionalDetails: item.additionalDetails,
                submitter: item.submitter || null, 
                adminApproval: item.adminApproval 
            }));
            
            setItems(mappedItems);
            setError('');
        } catch (err) {
            console.error("Error fetching items:", err);
            setError("Failed to load items. Please try again later.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchItems();
    }, []);

    // Filter items based on active tab and search term, and paginate for all tabs
    useEffect(() => {
        // Start with all items and then filter by adminApproval
        let processedItems = items.filter(item => item.adminApproval === true);

        // Filter by active tab if not 'all'
        if (activeTab !== 'all') {
            processedItems = processedItems.filter(item => item.status === activeTab);
        }

        // Then, filter by search term if a search term exists
        if (searchTerm) {
            processedItems = processedItems.filter(item =>
                item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.category.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Apply pagination to the processed (tab-filtered and search-filtered) items
        const indexOfLastItem = currentPage * itemsPerPage;
        const indexOfFirstItem = indexOfLastItem - itemsPerPage;
        setFilteredItems(processedItems.slice(indexOfFirstItem, indexOfLastItem));

    }, [activeTab, searchTerm, items, currentPage, itemsPerPage]);
    
    // Effect to reset page when activeTab or searchTerm changes
    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, searchTerm]);

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
            case 'unclaimed':
                return <span className="item-status-badge active">Unclaimed</span>;
            case 'claiming':
                return <span className="item-status-badge claiming">Claiming</span>;
            case 'claimed':
                return <span className="item-status-badge claimed">Claimed</span>;
            case 'disapproved':
                return <span className="item-status-badge disapproved">Disapproved</span>;
            case 'pending':
                return <span className="item-status-badge pending">Pending</span>;
            case 'archived':
                return <span className="item-status-badge archived">Archived</span>;
            default:
                return null;
        }
    };

    // Item actions
    const handleViewItem = (item) => {
        setSelectedItemForModal(item);
        setShowItemDetailsModal(true);
    };

    const handleCloseItemModal = () => {
        setShowItemDetailsModal(false);
        setSelectedItemForModal(null);
    };

    const handleDeleteItem = async (itemId) => {
        if (window.confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
            try {
                await deleteItemFromDb(itemId);
                showToast('Item deleted successfully!', 'success');
                fetchItems(); // Refresh the list after deletion
            } catch (error) {
                console.error("Error deleting item: ", error);
                showToast('Failed to delete item. See console for details.', 'error');
            }
        }
    };

    const handleArchiveItem = async (itemId) => {
        if (window.confirm('Are you sure you want to archive this item?')) {
            try {
                await archiveItemInDb(itemId);
                showToast('Item archived successfully!', 'success');
                fetchItems(); // Refresh the list after archiving
            } catch (error) {
                console.error("Error archiving item: ", error);
                showToast('Failed to archive item. See console for details.', 'error');
            }
        }
    };

    const handleUnarchiveItem = async (itemId) => {
        if (window.confirm('Are you sure you want to unarchive this item?')) {
            try {
                await unarchiveItemInDb(itemId);
                showToast('Item unarchived successfully!', 'success');
                fetchItems(); // Refresh the list after unarchiving
            } catch (error) {
                console.error("Error unarchiving item: ", error);
                showToast('Failed to unarchive item. See console for details.', 'error');
            }
        }
    };

    const getTabCount = (status) => {
        return items.filter(item => item.status === status).length;
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
            const response = await fetch(`${apiUrl}/api/export?type=items&startDate=${finalStartDate}&endDate=${finalEndDate}`, {
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
            let filename = 'GCFinder_items_export.xlsx'; // Default filename
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
            showToast('Failed to export data: ' + error.message, 'error');
        }
    };

    const handleThisMonthExport = () => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
        setExportStartDate(firstDay);
        setExportEndDate(lastDay);
        handleTriggerExport(firstDay, lastDay); // Pass dates directly to avoid state lag
    };

    const handleAllTimeExport = () => {
        const startDate = '2020-01-01'; // A nominal early date
        const endDate = new Date().toISOString().split('T')[0]; // Today
        setExportStartDate(startDate);
        setExportEndDate(endDate);
        handleTriggerExport(startDate, endDate); // Pass dates directly
    };

    return (
            <div className="item-management-container">
                <div className="page-header">
                    <div className="page-header-content">
                        <h1>Item Management</h1>
                        <p className="admin-subtitle">View, flag, and manage lost and found items in the GC Finder system</p>
                    </div>
                    <div className="action-buttons">
                        <button className="export-btn" onClick={handleOpenExportModal}>
                            <i className="fas fa-download"></i> Export Data
                        </button>
                        <button className="refresh-btn" onClick={fetchItems}>
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
                                    Export Item Data
                                </h2>
                                <button onClick={handleCloseExportModal} className="export-modal-close-btn" aria-label="close">
                                    <i className="fas fa-times"></i>
                                </button>
                            </div>
                            <p className="export-modal-description">
                                Select the date range for the item data you want to export.
                            </p>
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
                            <div className="export-modal-date-input-group">
                                <label htmlFor="exportStartDateModalItem">From Date:</label>
                                <input
                                    id="exportStartDateModalItem"
                                    type="date"
                                    value={exportStartDate}
                                    onChange={(e) => setExportStartDate(e.target.value)}
                                    className="export-modal-date-input"
                                />
                            </div>
                            <div className="export-modal-date-input-group">
                                <label htmlFor="exportEndDateModalItem">To Date:</label>
                                <input
                                    id="exportEndDateModalItem"
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
                            <i className="fas fa-th-list"></i> All Items
                            <span className="item-count">{items.length}</span>
                        </button>
                        <button 
                            className={`item-tab ${activeTab === 'unclaimed' ? 'active' : ''}`}
                            onClick={() => setActiveTab('unclaimed')}
                        >
                            <i className="fas fa-box-open"></i> Unclaimed
                            <span className="item-count">{getTabCount('unclaimed')}</span>
                        </button>
                        <button 
                            className={`item-tab ${activeTab === 'claiming' ? 'active' : ''}`}
                            onClick={() => setActiveTab('claiming')}
                        >
                            <i className="fas fa-hand-holding"></i> Claiming
                            <span className="item-count">{getTabCount('claiming')}</span>
                        </button>
                        <button 
                            className={`item-tab ${activeTab === 'claimed' ? 'active' : ''}`}
                            onClick={() => setActiveTab('claimed')}
                        >
                            <i className="fas fa-check-circle"></i> Claimed
                            <span className="item-count">{getTabCount('claimed')}</span>
                        </button>
                        <button 
                            className={`item-tab ${activeTab === 'disapproved' ? 'active' : ''}`}
                            onClick={() => setActiveTab('disapproved')}
                        >
                            <i className="fas fa-times-circle"></i> Disapproved
                            <span className="item-count">{getTabCount('disapproved')}</span>
                        </button>
                        <button 
                            className={`item-tab ${activeTab === 'pending' ? 'active' : ''}`}
                            onClick={() => setActiveTab('pending')}
                        >
                            <i className="fas fa-hourglass-half"></i> Pending
                            <span className="item-count">{getTabCount('pending')}</span>
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
                                    <th onClick={() => requestSort('date')}>
                                        Date Found
                                        {sortConfig.key === 'date' && (
                                            <i className={`fas fa-sort-${sortConfig.direction === 'ascending' ? 'up' : 'down'}`}></i>
                                        )}
                                    </th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredItems.map((item, index) => (
                                    <tr key={item.id || index} className={`item-row-${item.status}`}>
                                        <td className="item-name">{item.name}</td>
                                        <td>{item.category}</td>
                                        <td>{item.location}</td>
                                        <td>{item.date}</td>
                                        <td>{renderStatusBadge(item.status)}</td>
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
                                                className="item-action-btn delete"
                                                aria-label="Delete"
                                                onClick={() => handleDeleteItem(item.id)}
                                                title="Delete Item"
                                            >
                                                <i className="fas fa-trash-alt"></i>
                                            </button>
                                            {item.status === 'archived' ? (
                                                <button 
                                                    className="item-action-btn unarchive" 
                                                    aria-label="Unarchive"
                                                    onClick={() => handleUnarchiveItem(item.id)}
                                                    title="Unarchive Item"
                                                >
                                                    <i className="fas fa-box-open"></i>
                                                </button>
                                            ) : (
                                                <button 
                                                    className="item-action-btn archive" 
                                                    aria-label="Archive"
                                                    onClick={() => handleArchiveItem(item.id)}
                                                    title="Archive Item"
                                                >
                                                    <i className="fas fa-archive"></i>
                                                </button>
                                            )}
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

                {/* Pagination Controls */}
                {(() => {
                    // Calculate total items after applying current tab and search filters
                    let itemsForPaginationCount = items;
                    if (activeTab !== 'all') {
                        itemsForPaginationCount = itemsForPaginationCount.filter(item => item.status === activeTab);
                    }
                    if (searchTerm) {
                        itemsForPaginationCount = itemsForPaginationCount.filter(item =>
                            item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            item.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            item.category.toLowerCase().includes(searchTerm.toLowerCase())
                        );
                    }
                    const totalPages = Math.ceil(itemsForPaginationCount.length / itemsPerPage);

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
                    return null; // No pagination needed if only one page or no items
                })()}

                {/* Use the shared AdminViewItemDetailsModal */}
                <AdminViewItemDetailsModal 
                    show={showItemDetailsModal}
                    item={selectedItemForModal}
                    onClose={handleCloseItemModal} 
                    // loading prop can be added if ItemManagement has a specific loading state for this modal
                />

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

export default ItemManagement;