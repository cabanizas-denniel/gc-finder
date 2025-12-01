import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { browseItems, getClaims } from '../../admin-firebase';
import ItemsList from './ItemsList';



const Dashboard = () => {
    const navigate = useNavigate();
    
    // Get current user status
    const userDataString = localStorage.getItem('userData');
    const currentUser = userDataString ? JSON.parse(userDataString) : null;
    const isFlagged = currentUser?.status === 'flagged';
    const isBanned = currentUser?.status === 'banned';
    
    const [dashboardStats, setDashboardStats] = useState({
        activeReports: "0",
        pendingClaims: "0"
    });
    
    // State for items
    const [recentItems, setRecentItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    // Fetch items from backend API
    useEffect(() => {
        const fetchItemsAndUserClaimsForDashboard = async () => {
            setLoading(true);
            setError('');
            try {
                // Fetch items from backend API (already filtered by claims and visibility)
                const response = await browseItems();
                const allItems = response.items || [];
                const userSubmittedCount = response.userSubmittedCount || 0;

                // Apply 7-day filter for dashboard
                const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                const recentItemsData = allItems.filter(item => {
                    if (!item.createdAt) return false;
                    const createdDate = new Date(item.createdAt);
                    return createdDate >= sevenDaysAgo;
                });

                // Sort by newest first
                recentItemsData.sort((a, b) => {
                    if (a.createdAt && b.createdAt) {
                        return new Date(b.createdAt) - new Date(a.createdAt);
                    }
                    return new Date(b.date) - new Date(a.date);
                });

                // Limit to 6 items for dashboard
                const limitedItems = recentItemsData.slice(0, 6);
                setRecentItems(limitedItems);
                
                // Update dashboard stats
                setDashboardStats(prev => ({ 
                    ...prev, 
                    activeReports: userSubmittedCount.toString()
                }));

            } catch (error) {
                console.error("Error fetching dashboard items/claims:", error);
                setError('Failed to load recent items.');
            } finally {
                setLoading(false);
            }
        };
        
        fetchItemsAndUserClaimsForDashboard();
    }, []);
    
    // Fetch PENDING claims count for the current user from backend API
    useEffect(() => {
        const fetchPendingClaimsCount = async () => {
            try {
                // Fetch all user's claims from backend API
                const allClaims = await getClaims();
                
                // Filter for pending claims on client-side
                const pendingClaims = allClaims.filter(claim => 
                    claim.claimStatus && claim.claimStatus.toLowerCase() === 'pending'
                );
                
                setDashboardStats(prev => ({
                    ...prev,
                    pendingClaims: pendingClaims.length.toString()
                }));

            } catch (error) {
                console.error("Error fetching pending claims count:", error);
                setDashboardStats(prev => ({ ...prev, pendingClaims: "-" }));
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
                    {isBanned ? (
                        <div style={{color: '#e74c3c', textAlign: 'center', padding: '20px'}}>
                            <i className="fas fa-ban" style={{fontSize: '24px', marginBottom: '10px'}}></i>
                            <p><strong>Account Banned</strong></p>
                            <p>Your account has been banned. Contact support for assistance.</p>
                        </div>
                    ) : isFlagged ? (
                        <div style={{color: '#f39c12', textAlign: 'center', padding: '20px'}}>
                            <i className="fas fa-flag" style={{fontSize: '24px', marginBottom: '10px'}}></i>
                            <p><strong>Account Flagged</strong></p>
                            <p>Your account is under review. Some features are temporarily restricted.</p>
                        </div>
                    ) : (
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
                    )}
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