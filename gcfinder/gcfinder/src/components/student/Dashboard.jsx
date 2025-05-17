import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import ItemsList from './ItemsList';

const Dashboard = () => {
    console.log("Dashboard component is rendering");
    const navigate = useNavigate();
    
    const [dashboardStats, setDashboardStats] = useState({
        activeReports: "0",
        pendingClaims: "0"
    });
    
    // State for items
    const [recentItems, setRecentItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    // Fetch items from Firestore
    useEffect(() => {
        const fetchItemsAndUserClaimsForDashboard = async () => {
            setLoading(true);
            setError('');
            try {
                const userDataString = localStorage.getItem('userData');
                const currentUserData = userDataString ? JSON.parse(userDataString) : null;
                const currentUserId = currentUserData?.student_id;

                // 1. Fetch IDs of items claimed by the user
                let claimedItemIds = new Set();
                if (currentUserId) {
                    const claimsRef = collection(db, 'claims');
                    const userClaimsQuery = query(claimsRef, where('claimerId', '==', currentUserId));
                    const userClaimsSnapshot = await getDocs(userClaimsQuery);
                    userClaimsSnapshot.forEach(doc => claimedItemIds.add(doc.data().itemId));
                }

                // 2. Fetch items
                const itemsRef = collection(db, 'items');
                const allItemsQuery = query(itemsRef);
                const allItemsSnapshot = await getDocs(allItemsQuery);
                
                const itemsData = [];
                allItemsSnapshot.forEach(doc => {
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
                        itemsData.push({
                            id: item_id,
                            name: data.name || 'Unnamed Item',
                            category: data.category || 'Uncategorized',
                            location: data.location || 'Unknown location',
                            date: data.date || new Date().toLocaleDateString(),
                            status: data.status || 'Available',
                            description: data.description || 'No description provided',
                            image: data.imageData && data.imageData.length > 0 
                                ? data.imageData[0].dataUrl 
                                : null,
                            createdAt: data.createdAt,
                            submitter: data.submitter || null,
                            adminApproval: data.adminApproval
                        });
                    }
                });
                
                // Sort and limit for dashboard
                itemsData.sort((a, b) => {
                    if (a.createdAt && b.createdAt) {
                        return b.createdAt.seconds - a.createdAt.seconds;
                    }
                    return new Date(b.date) - new Date(a.date);
                });
                const limitedItems = itemsData.slice(0, 6);
                setRecentItems(limitedItems);
                
                // Update dashboard stats (optional: base on filtered data or total data before filtering?)
                // Let's keep basing activeReports on the number shown (after filtering)
                setDashboardStats(prev => ({ ...prev, activeReports: itemsData.length.toString() }));

            } catch (error) {
                console.error("Error fetching dashboard items/claims:", error);
                setError('Failed to load recent items.');
            } finally {
                setLoading(false);
            }
        };
        
        fetchItemsAndUserClaimsForDashboard();
    }, []);
    
    // Fetch PENDING claims count for the current user
    useEffect(() => {
        const fetchPendingClaimsCount = async () => {
            try {
                const userDataString = localStorage.getItem('userData');
                const currentUserData = userDataString ? JSON.parse(userDataString) : null;
                const currentUserId = currentUserData?.student_id;

                if (!currentUserId) {
                    console.log("No user ID found, cannot fetch pending claims count.");
                    setDashboardStats(prev => ({ ...prev, pendingClaims: "0" }));
                    return; // Exit if no user ID
                }

                const claimsRef = collection(db, 'claims');
                const q = query(
                    claimsRef, 
                    where('claimerId', '==', currentUserId),
                    where('claimStatus', '==', 'Pending') // Filter specifically for Pending status
                );
                
                const querySnapshot = await getDocs(q);
                const pendingCount = querySnapshot.size;
                
                setDashboardStats(prev => ({
                    ...prev,
                    pendingClaims: pendingCount.toString() // Update state with the actual count
                }));

            } catch (error) {
                console.error("Error fetching pending claims count:", error);
                setDashboardStats(prev => ({ ...prev, pendingClaims: "-" })); // Indicate error
            }
        };
        
        fetchPendingClaimsCount();
    }, []); // Runs once on mount

    // Callback to update item status locally when a claim is made
    const handleDashboardItemClaimed = useCallback((itemId, newStatus) => {
        // Remove the item from the dashboard list immediately after claiming
        setRecentItems(prevItems => prevItems.filter(item => item.id !== itemId));
    }, []);

    return (
        <div className="main-content-inner">
            {/* Stats Cards */}
            <div className="stats-container">
                <div className="stat-card">
                    <h3>Active Reports</h3>
                    <div className="stat-number">{dashboardStats.activeReports}</div>
                    <p>Items you've reported as lost</p>
                </div>
                <div className="stat-card">
                    <h3>Pending Claims</h3>
                    <div className="stat-number">{dashboardStats.pendingClaims}</div>
                    <p>Your claims awaiting approval</p>
                </div>
                <div className="stat-card quick-actions">
                    <h3>Quick Actions</h3>
                    <ul>
                        <li onClick={() => navigate('/report-item')}>
                            <i className="fas fa-file-alt"></i> Report Found Item
                        </li>
                        <li onClick={() => navigate('/browse-items')}>
                            <i className="fas fa-search"></i> Browse Found Items
                        </li>
                        <li onClick={() => navigate('/my-claims')}>
                            <i className="fas fa-check-circle"></i> Check Claim Status
                        </li>
                    </ul>
                </div>
            </div>

            {/* Recently Found Items */}
            {loading ? (
                <p>Loading items...</p>
            ) : error ? (
                <p style={{ color: 'red' }}>{error}</p>
            ) : (
                <ItemsList 
                    items={recentItems} 
                    title="Recently Found Items" 
                    emptyMessage="No recent items found or available to claim." 
                    onItemClaimed={handleDashboardItemClaimed} 
                />
            )}
        </div>
    );
};

export default Dashboard; 