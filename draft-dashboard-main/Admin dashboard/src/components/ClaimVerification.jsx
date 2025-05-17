import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

const ClaimVerification = () => {
    const [selectedClaim, setSelectedClaim] = useState(null);
    
    // Sample claims data
    const claims = [
        {
            id: '202311609',
            title: 'Yellow Notebook',
            status: 'pending',
            claimedBy: 'Coco Martin',
            date: '3/13/2025'
        },
        {
            id: '202311009',
            title: 'Pulse Oximeter',
            status: 'approved',
            claimedBy: 'Jane Smith',
            date: '3/2/2025'
        },
        {
            id: '202311705',
            title: 'LTT Screwdriver',
            status: 'rejected',
            claimedBy: 'Joy',
            date: '2/28/2025'
        }
    ];

    const handleClaimSelect = (claim) => {
        setSelectedClaim(claim);
    };

    // Claims List Component
    const ClaimsList = () => (
        <div className="claims-list">
            <h2>Claims list</h2>
            <p className="total-claims">Total: {claims.length} claims</p>

            <div className="claim-items">
                {claims.map((claim) => (
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
                ))}
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
                    </div>

                    <div className="claim-actions">
                        <button 
                            className="approve-btn"
                            disabled={selectedClaim.status === 'approved'}
                        >
                            Approve Claim
                        </button>
                        <button 
                            className="reject-btn"
                            disabled={selectedClaim.status === 'rejected'}
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