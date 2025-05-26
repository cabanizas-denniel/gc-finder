import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { collection, getDocs, doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../../admin-firebase';
import { AdminViewItemDetailsModal } from './ItemsLIst';

const ClaimVerification = () => {
    const [claims, setClaims] = useState([]);
    const [selectedClaim, setSelectedClaim] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showItemDetailsModal, setShowItemDetailsModal] = useState(false);
    const [selectedItemForModal, setSelectedItemForModal] = useState(null);
    const [loadingItemDetails, setLoadingItemDetails] = useState(false);

    // New state for proof of return modal
    const [showProofModal, setShowProofModal] = useState(false);
    const [proofOfReturnImage, setProofOfReturnImage] = useState(null); // Will store data URL
    const [claimToApproveWithProof, setClaimToApproveWithProof] = useState(null);
    const proofFileInputRef = useRef(null); // For triggering file input

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
                    student_id: data.claimerId,
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
            const claimRef = doc(db, 'claims', claimId);
            const updateData = {
                claimStatus: approve ? 'Approved' : 'Rejected',
                updatedAt: serverTimestamp()
            };
            await updateDoc(claimRef, updateData);

            // If approved, update item status to "Claiming"
            if (approve) {
                const itemRef = doc(db, 'items', itemId);
                await updateDoc(itemRef, {
                    status: 'Claiming',
                    updatedAt: serverTimestamp()
                });
            }

            await fetchClaims();
            
            setSelectedClaim(prev => ({
                ...prev,
                status: approve ? 'approved' : 'rejected'
            }));

        } catch (error) {
            console.error('Error updating claim:', error);
        }
    };

    const handleProofOfReturn = async (claimId, itemId, imageProofDataUrl) => {
        try {
            const claimRef = doc(db, 'claims', claimId);
            await updateDoc(claimRef, {
                claimStatus: 'Claimed',
                ownershipProof: imageProofDataUrl,
                updatedAt: serverTimestamp()
            });

            const itemRef = doc(db, 'items', itemId);
            await updateDoc(itemRef, {
                status: 'Claimed',
                updatedAt: serverTimestamp()
            });

            await fetchClaims();
            
            setSelectedClaim(prev => ({
                ...prev,
                status: 'claimed'
            }));

        } catch (error) {
            console.error('Error updating proof of return:', error);
        }
    };

    const openProofModal = (claim) => {
        setClaimToApproveWithProof(claim);
        setProofOfReturnImage(null); // Reset previous image
        setShowProofModal(true);
    };

    const closeProofModal = () => {
        setShowProofModal(false);
        setProofOfReturnImage(null);
        setClaimToApproveWithProof(null);
    };

    const handleProofImageChange = (event) => {
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setProofOfReturnImage(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleConfirmApproval = async () => {
        if (!proofOfReturnImage) {
            alert("Please upload an image as proof of return.");
            return;
        }
        if (claimToApproveWithProof) {
            await handleProofOfReturn(
                claimToApproveWithProof.id,
                claimToApproveWithProof.itemId,
                proofOfReturnImage
            );
            closeProofModal();
        }
    };

    const handleViewItemDetails = async (itemId) => {
        if (!itemId) {
            alert("Item ID is missing.");
            return;
        }
        setLoadingItemDetails(true);
        setShowItemDetailsModal(true); 
        try {
            const itemRef = doc(db, 'items', itemId);
            const itemSnap = await getDoc(itemRef);
            if (itemSnap.exists()) {
                const itemData = itemSnap.data();
                setSelectedItemForModal({
                     id: itemSnap.id, 
                     ...itemData,
                     date: itemData.date?.toDate ? itemData.date.toDate().toLocaleDateString() : itemData.date
                    });
            } else {
                console.error("No such item document!");
                setSelectedItemForModal(null);
                alert('Item details not found.');
            }
        } catch (error) {
            console.error("Error fetching item details:", error);
            alert('Error fetching item details.');
            setSelectedItemForModal(null);
        }
        setLoadingItemDetails(false);
    };

    const closeItemDetailsModal = () => {
        setShowItemDetailsModal(false);
        setSelectedItemForModal(null);
    };

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
                            <div className="claim-item-header">
                            <h3>{claim.title}</h3>
                            <div className={`status ${claim.status}`}>
                                {claim.status.charAt(0).toUpperCase() + claim.status.slice(1)}
                            </div>
                            </div>
                            <div className="claim-item-info"><i className="fas fa-user"></i><label>Claim by: {claim.claimedBy}</label></div>
                            <div className="claim-item-info"><i className="fas fa-calendar"></i><label>{claim.date}</label></div>
                        </div>
                        
                    ))
                )}
            </div>
        </div>
    );

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
                    <div className="claim-content-header">
                    <div className="claim-item-details">
                        <div className="info-group">
                            <label>Claimant Student ID: </label>{selectedClaim.student_id}
                        </div>
                        <div className="info-group">
                            <label>Claimed By: </label>{selectedClaim.claimedBy}
                        </div>
                        <div className="info-group">
                            <label>Date Claimed: </label>{selectedClaim.date}
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
                    </div>

                    <div className="info-group">
                        <label>Proof Image</label>
                        <img 
                            src={selectedClaim.proofImageUrl} 
                            alt="Proof of ownership" 
                            style={{ maxWidth: '350px', marginTop: '10px', marginLeft: '10px', marginRight: 'auto', display: 'block' }}
                        />
                    </div>

                    </div>

                    <div className="claim-actions">
                        {selectedClaim.status === 'pending' && (
                            <>
                                <button 
                                    className="approve-btn"
                                    onClick={() => handleClaimAction(selectedClaim.id, selectedClaim.itemId, true)}
                                >
                                    Approve Claim
                                </button>
                                <button 
                                    className="reject-btn"
                                    onClick={() => handleClaimAction(selectedClaim.id, selectedClaim.itemId, false)}
                                >
                                    Reject Claim
                                </button>
                            </>
                        )}
                        {selectedClaim.status === 'approved' && (
                            <>
                            <button 
                                className="approve-btn"
                                onClick={() => openProofModal(selectedClaim)}
                            >
                                Proof of Return
                            </button>
                            <button 
                                className="reject-btn"
                                onClick={() => handleClaimAction(selectedClaim.id, selectedClaim.itemId, false)}
                            >
                                Reject Claim
                            </button>
                            </>
                        )}
                        {selectedClaim.status === 'rejected' && (
                            <>
                            <button 
                                className="approve-btn"
                                onClick={() => handleClaimAction(selectedClaim.id, selectedClaim.itemId, true)}
                            >
                                Approve Claim
                            </button>
                            <p className="status-message">This claim has been rejected.</p>
                            </>
                        )}
                        {selectedClaim.status === 'claimed' && (
                            <>
                            <p className="status-message">This item has been claimed and returned to owner.</p>
                            <button 
                                className="reject-btn"
                                onClick={() => handleClaimAction(selectedClaim.id, selectedClaim.itemId, false)}
                            >
                                Reject Claim
                            </button>
                            </>
                        )}
                        <button 
                            className="view-details-btn"
                            onClick={() => handleViewItemDetails(selectedClaim.itemId)}
                            disabled={!selectedClaim || !selectedClaim.itemId || loadingItemDetails}
                        >
                            {loadingItemDetails ? 'Loading...' : 'View Item Details'}
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
                    <p className="admin-subtitle">Verify and Change Status of Found Item in the GC Finder system</p>
                </div>
            </div>

            <div className="claims-container">
                <ClaimsList />
                <ClaimDetails />
            </div>

            <AdminViewItemDetailsModal 
                show={showItemDetailsModal}
                item={selectedItemForModal}
                onClose={closeItemDetailsModal}
                loading={loadingItemDetails}
            />

            {/* Proof of Return Modal */}
            {showProofModal && claimToApproveWithProof && (
                <div className="modal-overlay" onClick={closeProofModal}> {/* Optional: close on overlay click */}
                    <div className="modal-content proof-return-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Proof of Return to Owner</h2>
                            <button className="close-button" onClick={closeProofModal}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <p style={{ marginBottom: '15px', textAlign: 'center' }}>Upload an image as proof that the item has been returned to its rightful owner.</p>
                            <div style={{ marginBottom: '15px', textAlign: 'center' }}>
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    ref={proofFileInputRef}
                                    onChange={handleProofImageChange} 
                                    style={{ display: 'none' }} 
                                />
                                <button onClick={() => proofFileInputRef.current.click()} className="btn-upload-proof">
                                    <i className="fas fa-upload"></i> Upload Image
                                </button>
                            </div>
                            {proofOfReturnImage && (
                                <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                                    <img src={proofOfReturnImage} alt="Proof of return" style={{ maxWidth: '100%', maxHeight: '250px', borderRadius: '4px' }}/>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer" style={{ justifyContent: 'center'}}>
                            <button type="button" className="btn btn-secondary" onClick={closeProofModal} style={{marginRight: '10px'}}>
                                Cancel
                            </button>
                            <button 
                                type="button" 
                                className="btn btn-primary" 
                                onClick={handleConfirmApproval} 
                                disabled={!proofOfReturnImage}
                            >
                                Confirm Return
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClaimVerification;