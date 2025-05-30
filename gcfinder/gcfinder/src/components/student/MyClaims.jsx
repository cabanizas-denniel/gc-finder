import React, { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase'; 
import { ClaimDetailModalDisplay, ClaimsGridDisplay } from './ItemsList'; // Import both display components
import noItem from '../../assets/NoItemPlaceholder.png'; // Re-import noItem for claim card images

const MyClaims = () => {
    const [activeStatus, setActiveStatus] = useState('all');
    const [allUserClaims, setAllUserClaims] = useState([]); // Stores all claims by the user
    const [filteredClaims, setFilteredClaims] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showClaimDetailModal, setShowClaimDetailModal] = useState(false);
    const [selectedClaimForDetail, setSelectedClaimForDetail] = useState(null);

    // Fetch claims from Firestore
    useEffect(() => {
        const fetchUserClaims = async () => {
            setLoading(true);
            setError('');
            try {
                const userDataString = localStorage.getItem('userData');
                if (!userDataString) {
                    setError('User not logged in. Please sign in to view your claims.');
                    setLoading(false);
                    setAllUserClaims([]); // Clear any existing claims
                    return;
                }
                const currentUserData = JSON.parse(userDataString);
                const currentUserId = currentUserData?.student_id;

                if (!currentUserId) {
                    setError('Could not retrieve your user ID. Cannot fetch claims.');
                    setLoading(false);
                    setAllUserClaims([]);
                    return;
                }

                const claimsRef = collection(db, 'claims');
                // Query based on the provided Firestore structure, without ordering for now
                const q = query(
                    claimsRef, 
                    where('claimerId', '==', currentUserId)
                    // orderBy('createdAt', 'desc') // Temporarily removed to avoid composite index issue
                    // THIS KEEPS ERRORING
                );
                const querySnapshot = await getDocs(q);
                
                let fetchedClaims = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    displayDate: doc.data().createdAt?.toDate ? 
                                 doc.data().createdAt.toDate().toLocaleDateString() : 
                                 'Date not available',
                }));

                // Optional: Client-side sorting if needed, after fetching
                fetchedClaims.sort((a, b) => {
                    const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
                    const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
                    return dateB - dateA; // Sorts descending (newest first)
                });
                
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
                    noItemPlaceholder={noItem} // Pass the imported noItem as a prop
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
