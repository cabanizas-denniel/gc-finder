import React, { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase'; 
import noItem from '../../assets/NoItemPlaceholder.png'; // Fallback image

const MyClaims = () => {
    const [activeStatus, setActiveStatus] = useState('all');
    const [allUserClaims, setAllUserClaims] = useState([]); // Stores all claims by the user
    const [filteredClaims, setFilteredClaims] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    // State for Claim Detail Modal
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

    return (
        <section className="claims-section">
            <h1>My Claims</h1>
            <p className="subtitle">Track the status of your item claims</p>

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
            </div>

            {loading ? (
                <div>Loading your claims...</div>
            ) : error ? (
                <div>Error: {error}</div>
            ) : filteredClaims.length === 0 ? (
                <div>
                    {activeStatus !== 'all' ? `you have no ${activeStatus} items` : 'you have no claims yet'}.
                </div>
            ) : (
                <div className="claims-grid">
                    {filteredClaims.map(claim => (
                        <div key={claim.id} className="claim-card">
                            <div className={`claim-status status-${claim.claimStatus ? claim.claimStatus.toLowerCase() : 'unknown'}`}>
                                {claim.claimStatus || 'N/A'} {/* Display claimStatus */}
                            </div>
                            <img src={claim.itemImage || noItem} alt={claim.itemName || 'Item'} /> {/* Display itemImage and itemName */}
                            <div className="student-claim-info">
                                <h3>{claim.itemName || 'Item Name N/A'}</h3>
                                <p><i className="fas fa-calendar"></i> Claimed on: {claim.displayDate}</p> {/* Display formatted createdAt date */}
                                {/* Other details from your claim structure can be added here if needed */}
                                {/* e.g., <p>Item ID: {claim.itemId}</p> */}
                            </div>
                            <button
                                className="view-details-btn"
                                onClick={() => viewClaimDetails(claim.id)}
                            >
                                View Details
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Claim Detail Modal */}
            {showClaimDetailModal && selectedClaimForDetail && (
                <div className="modal-overlay" onClick={closeClaimDetailModal}> {/* Close on overlay click */}
                    {/* Use existing modal-content style, maybe add a specific class if needed */} 
                    <div className="modal-content claim-detail-modal" onClick={(e) => e.stopPropagation()}> {/* Stop propagation */}
                        <div className="modal-header">
                            <h2>Claim Details: {selectedClaimForDetail.itemName}</h2>
                            <button className="close-button" onClick={closeClaimDetailModal}>×</button>
                        </div>
                        <div className="modal-body">
                             {/* Mimic item-detail-container layout */}
                            <div className="item-detail-container"> 
                                <div className="item-image-container">
                                    <img src={selectedClaimForDetail.itemImage || noItem} alt={selectedClaimForDetail.itemName} />
                                    <div className={`claim-status status-${selectedClaimForDetail.claimStatus ? selectedClaimForDetail.claimStatus.toLowerCase() : 'unknown'}`} style={{ position: 'absolute', top: '10px', right: '10px', borderRadius: '15px' }}>
                                        Status: {selectedClaimForDetail.claimStatus}
                                    </div>
                                </div>
                                <div className="item-info"> {/* Reuse item-info for structure */}
                                    <h3>Security Answers Provided:</h3>
                                    <div className="detail-item">
                                        <i className="fas fa-map-pin"></i> <strong>Last Seen Location:</strong> 
                                        {selectedClaimForDetail.lastSeenLocation || 'N/A'}
                                    </div>
                                    <div className="detail-item">
                                        <i className="fas fa-fingerprint"></i> <strong>Unique Identifier:</strong> 
                                        {selectedClaimForDetail.uniqueIdentifier || 'N/A'}
                                    </div>
                                    <div className="detail-item" style={{ flexDirection: 'column', alignItems: 'flex-start'}}> {/* Custom style for textarea-like content */}
                                        <div><i className="fas fa-info-circle"></i> <strong>Additional Details:</strong></div>
                                        <p style={{ whiteSpace: 'pre-wrap', width: '100%', marginTop: '5px', background: 'transparent', padding: '0' }}>
                                            {selectedClaimForDetail.additionalDetails || 'None provided'}
                                        </p>
                                    </div>

                                    <h3>Proof Image Provided:</h3>
                                    {selectedClaimForDetail.proofImageUrl ? (
                                        <div className="proof-image-preview" style={{ marginTop: '10px', textAlign: 'center' }}>
                                            <img src={selectedClaimForDetail.proofImageUrl} alt="Proof provided" style={{ maxWidth: '100%', maxHeight: '250px', objectFit: 'contain' }}/>
                                        </div>
                                    ) : (
                                        <p>No proof image was uploaded with this claim.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn back" onClick={closeClaimDetailModal}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};

export default MyClaims;
