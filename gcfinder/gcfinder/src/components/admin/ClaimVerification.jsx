import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { collection, query, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../admin-firebase';

const ClaimVerification = () => {
    const [claims, setClaims] = useState([]);
    const [selectedClaim, setSelectedClaim] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchClaims();
    }, []);

    const fetchClaims = async () => {
        try {
            const claimsRef = collection(db, 'claims');
            const querySnapshot = await getDocs(claimsRef);
            
            const claimsData = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                claimsData.push({
                    id: doc.id,
                    title: data.itemName,
                    status: data.claimStatus.toLowerCase(),
                    claimedBy: data.claimerName,
                    date: new Date(data.createdAt?.toDate()).toLocaleDateString(),
                    itemId: data.itemId,
                    lastSeenLocation: data.lastSeenLocation,
                    uniqueIdentifier: data.uniqueIdentifier,
                    additionalDetails: data.additionalDetails,
                    proofImageUrl: data.proofImageUrl
                });
            });
            
            setClaims(claimsData);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching claims:', error);
            setLoading(false);
        }
    };

    const handleClaimSelect = (claim) => {
        setSelectedClaim(claim);
    };

    const handleClaimAction = async (claimId, itemId, approve) => {
        try {
            // Update claim status
            const claimRef = doc(db, 'claims', claimId);
            await updateDoc(claimRef, {
                claimStatus: approve ? 'Approved' : 'Rejected',
                updatedAt: serverTimestamp()
            });

            // Update item status
            const itemRef = doc(db, 'items', itemId);
            await updateDoc(itemRef, {
                status: approve ? 'Claimed' : 'Available',
                updatedAt: serverTimestamp()
            });

            // Refresh claims list
            await fetchClaims();
            
            // Update selected claim
            setSelectedClaim(prev => ({
                ...prev,
                status: approve ? 'approved' : 'rejected'
            }));

        } catch (error) {
            console.error('Error updating claim:', error);
        }
    };

    // Claims List Component
    const ClaimsList = () => (
        <div className="claims-list">
            <h2>Claims list</h2>
            <p className="total-claims">Total: {claims.length} claims</p>

            <div className="claim-items">
                {loading ? (
                    <p>Loading claims...</p>
                ) : claims.length === 0 ? (
                    <p>No claims found</p>
                ) : (
                    claims.map((claim) => (
                        <div 
                            key={claim.id}
                            className={`claim-item ${selectedClaim?.id === claim.id ? 'selected' : ''}`}
                            onClick={() => handleClaimSelect(claim)}
                        >
                            <h3>{claim.title}</h3>
                            <div className={`status ${claim.status}`}>
                                {claim.status.charAt(0).toUpperCase() + claim.status.slice(1)}
                            </div>
                            <p>Claim by: {claim.claimedBy}</p>
                            <p className="claim-id">ID: {claim.id}</p>
                            <p className="claim-date">{claim.date}</p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );

    // Claim Details Component
    const ClaimDetails = () => {
        if (!selectedClaim) {
            return (
                <div className="claim-details">
                    <div className="no-claim-selected">
                        <FontAwesomeIcon className="exclamation-triangle" icon={faExclamationTriangle} />
                        <h2>No Claim Selected</h2>
                        <p>Select a claim from the list to view details</p>
                    </div>
                </div>
            );
        }

        return (
            <div className="claim-details">
                <div className="claim-details-content">
                    <div className="claim-header">
                        <h2>{selectedClaim.title}</h2>
                        <div className={`status ${selectedClaim.status}`}>
                            {selectedClaim.status.charAt(0).toUpperCase() + selectedClaim.status.slice(1)}
                        </div>
                    </div>

                    <div className="claim-info">
                        <div className="info-group">
                            <label>Claim ID</label>
                            <p>{selectedClaim.id}</p>
                        </div>
                        <div className="info-group">
                            <label>Claimed By</label>
                            <p>{selectedClaim.claimedBy}</p>
                        </div>
                        <div className="info-group">
                            <label>Date Claimed</label>
                            <p>{selectedClaim.date}</p>
                        </div>
                        <div className="info-group">
                            <label>Last Seen Location</label>
                            <p>{selectedClaim.lastSeenLocation}</p>
                        </div>
                        {selectedClaim.uniqueIdentifier && (
                            <div className="info-group">
                                <label>Unique Identifier</label>
                                <p>{selectedClaim.uniqueIdentifier}</p>
                            </div>
                        )}
                        {selectedClaim.additionalDetails && (
                            <div className="info-group">
                                <label>Additional Details</label>
                                <p>{selectedClaim.additionalDetails}</p>
                            </div>
                        )}
                        {selectedClaim.proofImageUrl && (
                            <div className="info-group">
                                <label>Proof Image</label>
                                <img 
                                    src={selectedClaim.proofImageUrl} 
                                    alt="Proof of ownership" 
                                    style={{ maxWidth: '100%', marginTop: '10px' }}
                                />
                            </div>
                        )}
                    </div>

                    <div className="claim-actions">
                        <button 
                            className="approve-btn"
                            disabled={selectedClaim.status === 'approved'}
                            onClick={() => handleClaimAction(selectedClaim.id, selectedClaim.itemId, true)}
                        >
                            Approve Claim
                        </button>
                        <button 
                            className="reject-btn"
                            disabled={selectedClaim.status === 'rejected'}
                            onClick={() => handleClaimAction(selectedClaim.id, selectedClaim.itemId, false)}
                        >
                            Reject Claim
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="claim-verification">
            <div className="page-header">
                <div className="page-header-content">
                    <h1>Claim Verification</h1>
                    <p className="subtitle">Verify and Change Status of Found Item in the GC Finder system</p>
                </div>
            </div>

            <div className="claims-container">
                <ClaimsList />
                <ClaimDetails />
            </div>
        </div>
    );
};

export default ClaimVerification;