import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { getDoc, doc } from 'firebase/firestore';
import { db, getClaims, updateClaimStatus } from '../../admin-firebase';
import { AdminViewItemDetailsModal } from './ItemsLIst';
import Toast, { useToast } from '../Toast';

const ClaimVerification = () => {
    const [claims, setClaims] = useState([]);
    const [filteredClaims, setFilteredClaims] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 20; // show 20 at a time
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
    const claimItemsRef = useRef(null); // For maintaining scroll position

    // New state for rejection modal
    const [showRejectionModal, setShowRejectionModal] = useState(false);
    const [claimToReject, setClaimToReject] = useState(null);
    const [selectedRejectionReason, setSelectedRejectionReason] = useState('');
    const [customRejectionReason, setCustomRejectionReason] = useState('');

    // Toast notification
    const { toast, showToast, hideToast } = useToast();

    const formatDateMDY = (input) => {
        if (!input) return 'N/A';
        let dateObj = null;
        if (typeof input === 'string' || typeof input === 'number') {
            dateObj = new Date(input);
        } else if (input && typeof input.toDate === 'function') {
            dateObj = input.toDate();
        } else if (input && typeof input.seconds === 'number') {
            dateObj = new Date(input.seconds * 1000);
        } else {
            try {
                dateObj = new Date(input);
            } catch (_) {
                return 'N/A';
            }
        }
        if (isNaN(dateObj)) return 'N/A';
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const yyyy = dateObj.getFullYear();
        return `${mm}-${dd}-${yyyy}`;
    };

    useEffect(() => {
        fetchClaims();
    }, []);

    // Filter claims based on status
    useEffect(() => {
        const nextClaims = statusFilter === 'all'
            ? claims
            : claims.filter(claim => claim.status === statusFilter);
        setFilteredClaims(nextClaims);
        setCurrentPage(1); // reset pagination when filter changes
    }, [claims, statusFilter]);

    const fetchClaims = async () => {
        try {
            const claimsDataFromApi = await getClaims();
            
            const claimsData = claimsDataFromApi.map((data) => {
                // Parse ISO timestamp strings back to Date objects
                const createdAtDate = data.createdAt ? new Date(data.createdAt) : new Date(0);
                
                return {
                    id: data.id,
                    title: data.itemName,
                    status: data.claimStatus?.toLowerCase() || 'pending',
                    claimedBy: data.claimerName,
                    student_id: data.claimerId,
                    date: formatDateMDY(createdAtDate),
                    createdAt: createdAtDate,
                    itemId: data.itemId,
                    lastSeenLocation: data.lastSeenLocation,
                    uniqueIdentifier: data.uniqueIdentifier,
                    additionalDetails: data.additionalDetails,
                    proofImageUrl: data.proofImageUrl,
                    rejectionReason: data.rejectionReason || null,
                    ownershipProof: data.ownershipProof || null
                };
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
        const scrollTop = claimItemsRef.current?.scrollTop;
        setSelectedClaim(claim);
        requestAnimationFrame(() => {
            if (claimItemsRef.current && scrollTop !== undefined) {
                claimItemsRef.current.scrollTop = scrollTop;
            }
        });
    };

    const handleClaimAction = async (claimId, itemId, approve, rejectionReason = null) => {
        try {
            const updateData = {
                claimStatus: approve ? 'Approved' : 'Rejected',
                itemId: itemId
            };
            
            // Add rejection reason if rejecting
            if (!approve && rejectionReason) {
                updateData.rejectionReason = rejectionReason;
            }
            
            // Update claim via backend API (also updates item status automatically)
            await updateClaimStatus(claimId, updateData);

            await fetchClaims();
            
            setSelectedClaim(prev => ({
                ...prev,
                status: approve ? 'approved' : 'rejected',
                rejectionReason: !approve && rejectionReason ? rejectionReason : prev?.rejectionReason
            }));

            // Show notification message for approved claims
            if (approve) {
                showToast("The student has been notified of this change");
            } else {
                showToast("Claim has been rejected and student has been notified", "info");
            }

        } catch (error) {
            console.error('Error updating claim:', error);
            showToast("Failed to update claim. Please try again.", "error");
        }
    };

    const handleProofOfReturn = async (claimId, itemId, imageProofDataUrl) => {
        try {
            const updateData = {
                claimStatus: 'Claimed',
                ownershipProof: imageProofDataUrl,
                itemId: itemId
            };

            // Update claim via backend API (also updates item status automatically)
            await updateClaimStatus(claimId, updateData);

            await fetchClaims();
            
            setSelectedClaim(prev => ({
                ...prev,
                status: 'claimed'
            }));

        } catch (error) {
            console.error('Error updating proof of return:', error);
            showToast("Failed to update proof of return. Please try again.", "error");
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
                     date: itemData.date?.toDate ? formatDateMDY(itemData.date.toDate()) : formatDateMDY(itemData.date)
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

            <div className="claim-items" ref={claimItemsRef}>
                {loading ? (
                    <p>Loading claims...</p>
                ) : filteredClaims.length === 0 ? (
                    <p>No claims found for selected filter</p>
                ) : (
                    filteredClaims
                        .slice(0, currentPage * PAGE_SIZE)
                        .map((claim) => (
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
                {filteredClaims.length > currentPage * PAGE_SIZE && (
                    <div style={{ textAlign: 'center', padding: '12px' }}>
                        <button 
                            className="view-details-btn" 
                            onClick={() => setCurrentPage(prev => prev + 1)}
                        >
                            Load more
                        </button>
                    </div>
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
                        {selectedClaim.status === 'rejected' && selectedClaim.rejectionReason && (
                            <div className="info-group rejection-reason-box">
                                <label style={{ color: '#dc3545', fontWeight: '600' }}>
                                    <i className="fas fa-exclamation-circle" style={{ marginRight: '5px' }}></i>
                                    Rejection Reason
                                </label>
                                <p style={{ 
                                    backgroundColor: 'rgba(220, 53, 69, 0.05)', 
                                    padding: '10px', 
                                    borderRadius: '6px',
                                    border: '1px solid rgba(220, 53, 69, 0.2)',
                                    color: '#721c24',
                                    marginTop: '5px'
                                }}>
                                    {selectedClaim.rejectionReason}
                                </p>
                            </div>
                        )}
                        {selectedClaim.status === 'claimed' && selectedClaim.ownershipProof && (
                            <div className="info-group ownership-proof-box">
                                <label style={{ color: '#28a745', fontWeight: '600' }}>
                                    <i className="fas fa-check-circle" style={{ marginRight: '5px' }}></i>
                                    Proof of Return to Owner
                                </label>
                                <div style={{ 
                                    backgroundColor: 'rgba(40, 167, 69, 0.05)', 
                                    padding: '10px', 
                                    borderRadius: '6px',
                                    border: '1px solid rgba(40, 167, 69, 0.2)',
                                    marginTop: '5px',
                                    textAlign: 'center'
                                }}>
                                    <img 
                                        src={selectedClaim.ownershipProof} 
                                        alt="Proof of return" 
                                        style={{ 
                                            maxWidth: '100%', 
                                            maxHeight: '300px',
                                            borderRadius: '4px',
                                            border: '2px solid rgba(40, 167, 69, 0.3)'
                                        }}
                                    />
                                    <p style={{ 
                                        marginTop: '8px', 
                                        fontSize: '0.85rem', 
                                        color: '#155724',
                                        fontStyle: 'italic'
                                    }}>
                                        This image serves as documentation that the item was returned to its rightful owner.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="info-group">
                        <label>Proof Image (Claim Submission)</label>
                        <img 
                            src={selectedClaim.proofImageUrl} 
                            alt="No image provided" 
                            style={{ maxWidth: '350px', marginTop: '10px', marginRight: 'auto', display: 'block' }}
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