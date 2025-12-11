import React, { useState, useEffect, useCallback, useRef } from 'react';
import { browseItems } from '../../admin-firebase';
import ItemsList from './ItemsList';

const ITEMS_PER_PAGE = 20;

const BrowseItems = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [includeClaimed, setIncludeClaimed] = useState(false);
    const [items, setItems] = useState([]);
    const [filteredItems, setFilteredItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const fileInputRef = useRef(null);
    
    // Pagination calculations
    const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedItems = filteredItems.slice(startIndex, endIndex);

    useEffect(() => {
        const fetchItemsAndUserClaims = async () => {
            setLoading(true);
            setError('');
            try {
                // Fetch items from backend API (already filtered by claims and visibility)
                const response = await browseItems();
                const fetchedItems = response.items || [];
                
                // Sort by newest first
                fetchedItems.sort((a, b) => {
                    if (a.createdAt && b.createdAt) {
                        return new Date(b.createdAt) - new Date(a.createdAt);
                    }
                    return new Date(b.date) - new Date(a.date);
                });
                
                setItems(fetchedItems);
            } catch (error) {
                console.error("Error fetching items/claims:", error);
                setError('Failed to load items.');
            } finally {
                setLoading(false);
            }
        };
        
        fetchItemsAndUserClaims();
    }, []);

    useEffect(() => {
        if (items.length > 0) {
            const filtered = items.filter(item => {
                const matchesSearch = 
                    !searchTerm || 
                    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    item.location.toLowerCase().includes(searchTerm.toLowerCase());
                
                const matchesCategory = !selectedCategory || item.category === selectedCategory;
                
                const matchesClaimed = includeClaimed || item.status !== 'Claimed';
    
                return matchesSearch && matchesCategory && matchesClaimed;
            });
    
            setFilteredItems(filtered);
            setCurrentPage(1); // Reset to first page when filters change
        }
    }, [searchTerm, selectedCategory, includeClaimed, items]);
    
    // Pagination handlers
    const handlePageChange = useCallback((page) => {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    const handleItemClaimedLocally = useCallback((itemId, newStatus) => {
        setItems(prevItems => prevItems.filter(item => item.id !== itemId));
    }, []);

    const handleCameraSearch = useCallback(() => {
        // Trigger the hidden file input
        fileInputRef.current?.click();
    }, []);

    const handleImageUpload = useCallback(async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsSearching(true);
        setError('');

        const apiUrl = process.env.REACT_APP_API_URL;
        if (!apiUrl) {
            setError('API URL is not configured. Please check environment settings.');
            console.error("REACT_APP_API_URL is not set");
            setIsSearching(false);
            return;
        }

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${apiUrl}/search`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Search failed');
            }

            const data = await response.json();
            
            if (!data.results?.length) {
                setError('No matching items found');
                setFilteredItems([]);
                return;
            }

            // Sort items by similarity score
            const similarityMap = new Map(data.results.map(result => [result.item.id, result.similarity]));
            const sortedItems = [...items]
                .filter(item => similarityMap.has(item.id))
                .sort((a, b) => similarityMap.get(b.id) - similarityMap.get(a.id));

            setFilteredItems(sortedItems);
        } catch (error) {
            console.error('Error during image search:', error);
            setError(error.message || 'Failed to perform image search. Please try again.');
            setFilteredItems([]);
        } finally {
            setIsSearching(false);
        }
    }, [items]);

    const handleSearchChange = useCallback((e) => {
        setSearchTerm(e.target.value);
    }, []);

    const handleCategoryChange = useCallback((e) => {
        setSelectedCategory(e.target.value);
    }, []);

    const handleIncludeClaimedChange = useCallback((e) => {
        setIncludeClaimed(e.target.checked);
    }, []);

    return (
        <section className="browse-items-section">
            <h1>Found Items</h1>
            <p className="subtitle">Browse through items that have been found on campus</p>
            
            <div className="search-filter-container">
                <div className="student-search-box">
                    <i className="fas fa-search"></i>
                    <input 
                        type="text" 
                        placeholder="Search items..." 
                        value={searchTerm}
                        onChange={handleSearchChange}
                    />
                    <button 
                        className="search-camera-btn"
                        onClick={handleCameraSearch}
                        disabled={isSearching}
                    >
                        <i className="fas fa-camera"></i>
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        accept="image/*"
                        style={{ display: 'none' }}
                    />
                </div>
                <div className="category-dropdown">
                    <select 
                        value={selectedCategory}
                        onChange={handleCategoryChange}
                    >
                        <option value="">All Categories</option>
                        <option value="ID's & Documents">ID's & Documents</option>
                        <option value="Electronics & Gadgets">Electronics & Gadgets</option>
                        <option value="Clothing & Wearables">Clothing & Wearables</option>
                        <option value="School Supplies">School Supplies</option>
                        <option value="Bags & Accessories">Bags & Accessories</option>
                        <option value="Personal Items">Personal Items</option>
                        <option value="Miscellaneous">Miscellaneous</option>
                    </select>
                </div>
            </div>

            <div className="toggle-claimed">
                <label className="switch">
                    <input 
                        type="checkbox" 
                        checked={includeClaimed}
                        onChange={handleIncludeClaimedChange}
                    />
                    <span className="slider round"></span>
                </label>
                <span>Also browse for claimed items?</span>
            </div>

            {loading || isSearching ? (
                <div className="loading-message">
                    <i className="fas fa-spinner fa-pulse"></i>
                    <p>Loading items...</p>
                </div>
            ) : error ? (
                <p style={{ color: 'red' }}>{error}</p>
            ) : (
                <>
                    {/* Show item count and current range */}
                    {filteredItems.length > 0 && (
                        <div className="pagination-info">
                            <p>Showing {startIndex + 1}-{Math.min(endIndex, filteredItems.length)} of {filteredItems.length} items</p>
                        </div>
                    )}
                    
                    <ItemsList 
                        items={paginatedItems} 
                        emptyMessage="No items match your search criteria or available to claim." 
                        onItemClaimed={handleItemClaimedLocally} 
                    />
                    
                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="pagination-controls">
                            <button 
                                className="pagination-btn"
                                onClick={() => handlePageChange(1)}
                                disabled={currentPage === 1}
                            >
                                <i className="fas fa-angle-double-left"></i>
                            </button>
                            <button 
                                className="pagination-btn"
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                            >
                                <i className="fas fa-angle-left"></i>
                            </button>
                            
                            {/* Page numbers */}
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter(page => {
                                    // Show first, last, current, and pages around current
                                    return page === 1 || 
                                           page === totalPages || 
                                           Math.abs(page - currentPage) <= 1;
                                })
                                .map((page, index, array) => (
                                    <React.Fragment key={page}>
                                        {index > 0 && array[index - 1] !== page - 1 && (
                                            <span className="pagination-ellipsis">...</span>
                                        )}
                                        <button
                                            className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                                            onClick={() => handlePageChange(page)}
                                        >
                                            {page}
                                        </button>
                                    </React.Fragment>
                                ))
                            }
                            
                            <button 
                                className="pagination-btn"
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                            >
                                <i className="fas fa-angle-right"></i>
                            </button>
                            <button 
                                className="pagination-btn"
                                onClick={() => handlePageChange(totalPages)}
                                disabled={currentPage === totalPages}
                            >
                                <i className="fas fa-angle-double-right"></i>
                            </button>
                        </div>
                    )}
                </>
            )}
        </section>
    );
};

export default BrowseItems;
