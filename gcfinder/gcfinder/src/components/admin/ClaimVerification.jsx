import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { collection, getDocs, doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../../admin-firebase';
import { AdminViewItemDetailsModal } from './ItemsLIst';
import Toast, { useToast } from '../Toast';

const ClaimVerification = () => {
    const [claims, setClaims] = useState([]);
    const [filteredClaims, setFilteredClaims] = useState([]);
    const [statusFilter, setStatusFilter] = useState('all');
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

    // New state for rejection modal
    const [showRejectionModal, setShowRejectionModal] = useState(false);
    const [claimToReject, setClaimToReject] = useState(null);
    const [selectedRejectionReason, setSelectedRejectionReason] = useState('');
    const [customRejectionReason, setCustomRejectionReason] = useState('');

    // Toast notification
    const { toast, showToast, hideToast } = useToast();

    useEffect(() => {
        fetchClaims();
    }, []);

    // Filter claims based on status
    useEffect(() => {
        if (statusFilter === 'all') {
            setFilteredClaims(claims);
        } else {
            setFilteredClaims(claims.filter(claim => claim.status === statusFilter));
        }
    }, [claims, statusFilter]);

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
                    createdAt: data.createdAt?.toDate() || new Date(0),
                    itemId: data.itemId,
                    lastSeenLocation: data.lastSeenLocation,
                    uniqueIdentifier: data.uniqueIdentifier,
                    additionalDetails: data.additionalDetails,
                    proofImageUrl: data.proofImageUrl
                });
            });
            
            // Sort by newest first
            claimsData.sort((a, b) => b.createdAt - a.createdAt);
            
            setClaims(claimsData);
            setFilteredClaims(claimsData);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching claims:', error);
            setLoading(false);
        }
    };

    const handleClaimSelect = (claim) => {
        setSelectedClaim(claim);
    };

    const handleClaimAction = async (claimId, itemId, approve, rejectionReason = null) => {
        try {
            const claimRef = doc(db, 'claims', claimId);
            const updateData = {
                claimStatus: approve ? 'Approved' : 'Rejected',
                updatedAt: serverTimestamp()
            };
            
            // Add rejection reason if rejecting
            if (!approve && rejectionReason) {
                updateData.rejectionReason = rejectionReason;
            }
            
            await updateDoc(claimRef, updateData);

            // Update item status based on approval/rejection
            const itemRef = doc(db, 'items', itemId);
            if (approve) {
                // If approved, update item status to "Claiming"
                await updateDoc(itemRef, {
                    status: 'Claiming',
                    updatedAt: serverTimestamp()
                });
            } else {
                // If rejected, update item status to "Unclaimed"
                await updateDoc(itemRef, {
                    status: 'Unclaimed',
                    updatedAt: serverTimestamp()
                });
            }

            await fetchClaims();
            
            setSelectedClaim(prev => ({
                ...prev,
                status: approve ? 'approved' : 'rejected'
            }));

            // Show notification message for approved claims
            if (approve) {
                showToast("The student has been notified of this change");
            }

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

    const openRejectionModal = (claim) => {
        setClaimToReject(claim);
        setSelectedRejectionReason('');
        setCustomRejectionReason('');
        setShowRejectionModal(true);
    };

    const closeRejectionModal = () => {
        setShowRejectionModal(false);
        setClaimToReject(null);
        setSelectedRejectionReason('');
        setCustomRejectionReason('');
    };

    const handleConfirmRejection = async () => {
        if (!selectedRejectionReason && !customRejectionReason.trim()) {
            showToast("Please select a reason or provide a custom reason for rejection.", "warning");
            return;
        }

        const finalReason = selectedRejectionReason === 'other' 
            ? customRejectionReason.trim() 
            : selectedRejectionReason;

        if (claimToReject) {
            await handleClaimAction(
                claimToReject.id,
                claimToReject.itemId,
                false, // reject
                finalReason
            );
            closeRejectionModal();
        }
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
            showToast("Please upload an image as proof of return.", "warning");
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
            showToast("Item ID is missing.", "error");
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
                showToast('Item details not found.', "error");
            }
        } catch (error) {
            console.error("Error fetching item details:", error);
            showToast('Error fetching item details.', "error");
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
            <div className="claim-filter-status">
            <div className="claims-list-header">
                <h2>Claims list</h2>
                <p className="total-claims">Showing: {filteredClaims.length} claims</p>
            </div>
            <div className="claim-filter-section">
                    <select 
                        id="statusFilter"
                        value={statusFilter} 
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="status-filter-dropdown"
                    >
                        <option value="all">All ({claims.length})</option>
                        <option value="pending">Pending ({claims.filter(c => c.status === 'pending').length})</option>
                        <option value="approved">Approved ({claims.filter(c => c.status === 'approved').length})</option>
                        <option value="claimed">Claimed ({claims.filter(c => c.status === 'claimed').length})</option>
                        <option value="rejected">Rejected ({claims.filter(c => c.status === 'rejected').length})</option>
                    </select>
                </div>
            </div>

            <div className="claim-items">
                {loading ? (
                    <p>Loading claims...</p>
                ) : filteredClaims.length === 0 ? (
                    <p>No claims found for selected filter</p>
                ) : (
                    filteredClaims.map((claim) => (
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
                                    onClick={() => openRejectionModal(selectedClaim)}
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
                                onClick={() => openRejectionModal(selectedClaim)}
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
                                onClick={() => openRejectionModal(selectedClaim)}
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

            {/* Rejection Modal */}
            {showRejectionModal && claimToReject && (
                <div className="modal-overlay" onClick={closeRejectionModal}>
                    <div className="modal-content rejection-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Reject Claim</h2>
                            <button className="close-button" onClick={closeRejectionModal}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <p style={{ marginBottom: '20px', textAlign: 'center' }}>Please select a reason for rejecting this claim:</p>
                            
                            <div className="rejection-reasons">
                                <label className="reason-option">
                                    <input 
                                        type="radio" 
                                        name="rejectionReason" 
                                        value="Insufficient proof of ownership"
                                        checked={selectedRejectionReason === 'Insufficient proof of ownership'}
                                        onChange={(e) => setSelectedRejectionReason(e.target.value)}
                                    />
                                    <span>Insufficient proof of ownership</span>
                                </label>
                                
                                <label className="reason-option">
                                    <input 
                                        type="radio" 
                                        name="rejectionReason" 
                                        value="Item description does not match"
                                        checked={selectedRejectionReason === 'Item description does not match'}
                                        onChange={(e) => setSelectedRejectionReason(e.target.value)}
                                    />
                                    <span>Item description does not match</span>
                                </label>
                                
                                <label className="reason-option">
                                    <input 
                                        type="radio" 
                                        name="rejectionReason" 
                                        value="Fraudulent claim"
                                        checked={selectedRejectionReason === 'Fraudulent claim'}
                                        onChange={(e) => setSelectedRejectionReason(e.target.value)}
                                    />
                                    <span>Fraudulent claim</span>
                                </label>
                                
                                <label className="reason-option">
                                    <input 
                                        type="radio" 
                                        name="rejectionReason" 
                                        value="Item already claimed by rightful owner"
                                        checked={selectedRejectionReason === 'Item already claimed by rightful owner'}
                                        onChange={(e) => setSelectedRejectionReason(e.target.value)}
                                    />
                                    <span>Item already claimed by rightful owner</span>
                                </label>
                                
                                <label className="reason-option">
                                    <input 
                                        type="radio" 
                                        name="rejectionReason" 
                                        value="other"
                                        checked={selectedRejectionReason === 'other'}
                                        onChange={(e) => setSelectedRejectionReason(e.target.value)}
                                    />
                                    <span>Other (please specify)</span>
                                </label>
                            </div>
                            
                            {selectedRejectionReason === 'other' && (
                                <div style={{ marginTop: '15px' }}>
                                    <textarea
                                        placeholder="Please provide a specific reason for rejection..."
                                        value={customRejectionReason}
                                        onChange={(e) => setCustomRejectionReason(e.target.value)}
                                        style={{
                                            width: '100%',
                                            minHeight: '80px',
                                            padding: '10px',
                                            border: '1px solid #ddd',
                                            borderRadius: '4px',
                                            resize: 'vertical',
                                            fontFamily: 'inherit'
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                        <div className="modal-footer" style={{ justifyContent: 'center' }}>
                            <button type="button" className="btn btn-secondary" onClick={closeRejectionModal} style={{ marginRight: '10px' }}>
                                Cancel
                            </button>
                            <button 
                                type="button" 
                                className="btn btn-danger" 
                                onClick={handleConfirmRejection}
                                disabled={!selectedRejectionReason && !customRejectionReason.trim()}
                            >
                                Confirm Rejection
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Notification */}
            <Toast 
                message={toast.message}
                show={toast.show}
                onClose={hideToast}
                type={toast.type}
            />
        </div>
    );
};

export default ClaimVerification;