import React, { useState, useEffect, useCallback } from 'react';
import { getClaims } from '../../admin-firebase';
import { ClaimDetailModalDisplay, ClaimsGridDisplay } from './ItemsList'; // Import both display components

const MyClaims = () => {
    const [activeStatus, setActiveStatus] = useState('all');
    const [allUserClaims, setAllUserClaims] = useState([]); // Stores all claims by the user
    const [filteredClaims, setFilteredClaims] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showClaimDetailModal, setShowClaimDetailModal] = useState(false);
    const [selectedClaimForDetail, setSelectedClaimForDetail] = useState(null);

    // Helper function to format date as MM - DD - YYYY
    const formatDateMDY = (dateObj) => {
        if (!dateObj || isNaN(dateObj)) return 'Date not available';
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const yyyy = dateObj.getFullYear();
        return `${mm}-${dd}-${yyyy}`;
    };

    // Fetch claims from Firestore
    useEffect(() => {
        const fetchUserClaims = async () => {
            setLoading(true);
            setError('');
            try {
                // Fetch claims from backend API (automatically filtered by user)
                const claimsDataFromApi = await getClaims();
                
                let fetchedClaims = claimsDataFromApi.map(data => {
                    // Parse ISO timestamp string back to Date object
                    const createdAtDate = data.createdAt ? new Date(data.createdAt) : new Date(0);
                    
                    return {
                        id: data.id,
                        itemName: data.itemName,
                        itemId: data.itemId,
                        itemImage: data.itemImage || null,
                        claimStatus: data.claimStatus,
                        claimerId: data.claimerId,
                        claimerName: data.claimerName,
                        lastSeenLocation: data.lastSeenLocation,
                        uniqueIdentifier: data.uniqueIdentifier,
                        additionalDetails: data.additionalDetails,
                        proofImageUrl: data.proofImageUrl,
                        rejectionReason: data.rejectionReason,
                        createdAt: createdAtDate,
                        displayDate: formatDateMDY(createdAtDate)
                    };
                });

                // Sort by newest first
                fetchedClaims.sort((a, b) => b.createdAt - a.createdAt);
                
                setAllUserClaims(fetchedClaims);
            } catch (err) {
                console.error("Error fetching claims:", err);
                setError('Failed to fetch your claims. Please try again later.');
                setAllUserClaims([]);
            } finally {
                setLoading(false);
            }
        };

        fetchUserClaims();
    }, []); // Dependency array is empty, so it runs once on mount

    // Function to filter claims based on status
    const filterClaims = useCallback((status) => {
        if (status === 'all') {
            setFilteredClaims(allUserClaims);
        } else {
            const filtered = allUserClaims.filter(
                // Ensure claimStatus exists before calling toLowerCase
                claim => claim.claimStatus && claim.claimStatus.toLowerCase() === status.toLowerCase()
            );
            setFilteredClaims(filtered);
        }
    }, [allUserClaims]);

    // Update filtered claims when allUserClaims or activeStatus changes
    useEffect(() => {
        filterClaims(activeStatus);
    }, [allUserClaims, activeStatus, filterClaims]);

    // Handle tab button click
    const handleTabClick = useCallback((status) => {
        setActiveStatus(status);
    }, []);

    // Updated viewClaimDetails to set state for the modal
    const viewClaimDetails = useCallback((claimId) => {
        const claim = allUserClaims.find(c => c.id === claimId);
        if (claim) {
            setSelectedClaimForDetail(claim);
            setShowClaimDetailModal(true);
        } else {
            console.error("Could not find claim details for ID:", claimId);
            // Optionally show an error to the user
        }
    }, [allUserClaims]);

    // Function to close the claim detail modal
    const closeClaimDetailModal = useCallback(() => {
        setShowClaimDetailModal(false);
        setSelectedClaimForDetail(null);
    }, []);

    // Count approved claims for the notification message
    const approvedClaimsCount = allUserClaims.filter(
        claim => claim.claimStatus && claim.claimStatus.toLowerCase() === 'approved'
    ).length;

    return (
        <section className="claims-section">
            <h1>My Claims</h1>
            <p className="subtitle">Track the status of your item claims</p>

            {/* Show notification for approved items */}
            {approvedClaimsCount > 0 && (
                <div className="approved-items-notification">
                    <i className="fas fa-info-circle"></i>
                    <span>
                        You have {approvedClaimsCount} item{approvedClaimsCount > 1 ? 's' : ''} available for claiming at the <strong>Room 122 (Disciplinary Office)</strong>.
                    </span>
                </div>
            )}

            <div className="claims-tabs">
                <button
                    className={`tab-btn ${activeStatus === 'all' ? 'active' : ''}`}
                    onClick={() => handleTabClick('all')}
                >
                    All claims
                </button>
                <button
                    className={`tab-btn ${activeStatus === 'pending' ? 'active' : ''}`}
                    onClick={() => handleTabClick('pending')}
                >
                    Pending
                </button>
                {/* For "Approved" status, ensure your DB uses 'Approved' or adapt the onClick value */}
                <button
                    className={`tab-btn ${activeStatus === 'approved' ? 'active' : ''}`}
                    onClick={() => handleTabClick('approved')}
                >
                    Approved
                </button>
                <button
                    className={`tab-btn ${activeStatus === 'rejected' ? 'active' : ''}`}
                    onClick={() => handleTabClick('rejected')}
                >
                    Rejected
                </button>
                <button
                    className={`tab-btn ${activeStatus === 'claimed' ? 'active' : ''}`}
                    onClick={() => handleTabClick('claimed')}
                >
                    Claimed
                </button>
            </div>

            {loading ? (
                <div>Loading your claims...</div>
            ) : error ? (
                <div>Error: {error}</div>
            ) : filteredClaims.length === 0 ? (
                <div>
                    {activeStatus !== 'all' ? `You have no ${activeStatus} items` : 'You have no claims yet'}.
                </div>
            ) : (
                // Use the imported ClaimsGridDisplay component
                <ClaimsGridDisplay 
                    claims={filteredClaims} 
                    onViewDetails={viewClaimDetails}
                />
            )}

            {/* Use the imported Claim Detail Modal Component */}
            {showClaimDetailModal && (
                <ClaimDetailModalDisplay 
                    claim={selectedClaimForDetail} 
                    onClose={closeClaimDetailModal} 
                />
            )}
        </section>
    );
};

export default MyClaims;
