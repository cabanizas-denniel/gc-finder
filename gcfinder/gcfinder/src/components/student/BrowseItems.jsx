import React, { useState, useEffect, useCallback, useRef } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import ItemsList from './ItemsList';

const BrowseItems = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [includeClaimed, setIncludeClaimed] = useState(false);
    const [items, setItems] = useState([]);
    const [filteredItems, setFilteredItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        const fetchItemsAndUserClaims = async () => {
            setLoading(true);
            setError('');
            try {
                const userDataString = localStorage.getItem('userData');
                const currentUserData = userDataString ? JSON.parse(userDataString) : null;
                const currentUserId = currentUserData?.student_id;

                let claimedItemIds = new Set();
                if (currentUserId) {
                    const claimsRef = collection(db, 'claims');
                    const userClaimsQuery = query(claimsRef, where('claimerId', '==', currentUserId));
                    const userClaimsSnapshot = await getDocs(userClaimsQuery);
                    userClaimsSnapshot.forEach(doc => claimedItemIds.add(doc.data().itemId));
                }

                const itemsRef = collection(db, 'items');
                // Fetch all items that are NOT archived
                const q = query(itemsRef, where('status', '!=', 'archived'));
                const querySnapshot = await getDocs(q);
                
                const fetchedItems = [];
                querySnapshot.forEach(doc => {
                    const data = doc.data();
                    const item_id = doc.id;
                    const isSubmitter = data.submitter && data.submitter.student_id === currentUserId;
                    const isDisapproved = data.status === "Disapproved";

                    let isVisible;
                    if (isDisapproved) {
                        isVisible = isSubmitter;
                    } else {
                        // Item is not disapproved (i.e., it's Approved or Pending)
                        // Visible if admin approved, OR if pending and current user is the submitter
                        isVisible = data.adminApproval === true || isSubmitter;
                    }

                    // Finally, combine with the claimed check
                    if (!claimedItemIds.has(item_id) && isVisible) {
                        fetchedItems.push({
                            id: item_id,
                            name: data.name || 'Unnamed Item',
                            category: data.category || 'Uncategorized',
                            location: data.location || 'Unknown location',
                            date: data.date || new Date().toLocaleDateString(),
                            status: data.status === 'Available' ? 'Unclaimed' : (data.status || 'Unclaimed'),
                            description: data.description || 'No description provided',
                            imageData: data.imageData || [],
                            image: data.imageData && data.imageData.length > 0 
                                ? data.imageData[0].dataUrl 
                                : null,
                            createdAt: data.createdAt,
                            submitter: data.submitter || null,
                            adminApproval: data.adminApproval
                        });
                    }
                });
                
                fetchedItems.sort((a, b) => {
                    if (a.createdAt && b.createdAt) {
                        return b.createdAt.seconds - a.createdAt.seconds;
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
        }
    }, [searchTerm, selectedCategory, includeClaimed, items]);

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
                        capture="environment"
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
                <p>Loading items...</p>
            ) : error ? (
                <p style={{ color: 'red' }}>{error}</p>
            ) : (
                <ItemsList 
                    items={filteredItems} 
                    emptyMessage="No items match your search criteria or available to claim." 
                    onItemClaimed={handleItemClaimedLocally} 
                />
            )}
        </section>
    );
};

export default BrowseItems;
