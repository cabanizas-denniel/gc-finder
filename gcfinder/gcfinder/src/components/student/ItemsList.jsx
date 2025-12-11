import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { submitItemClaim, deleteStudentReportedItem } from '../../firebase';
import Toast, { useToast } from '../Toast';

const ItemsList = ({ items, title, emptyMessage = "No items found.", onItemUpdated }) => {
    // Get current user status
    const userDataString = localStorage.getItem('userData');
    const currentUser = userDataString ? JSON.parse(userDataString) : null;
    const isFlagged = currentUser?.status === 'flagged';
    
    const [showModal, setShowModal] = useState(false);
    const [showClaimModal, setShowClaimModal] = useState(false);
    const [showImageUploadModal, setShowImageUploadModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [pendingDeleteId, setPendingDeleteId] = useState(null);
    const [displayItems, setDisplayItems] = useState(items || []);
    const [selectedItem, setSelectedItem] = useState(null);
    const [claimForm, setClaimForm] = useState({
        lastSeenLocation: '',
        uniqueIdentifier: '',
        additionalDetails: '',
        proofImage: null
    });
    const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);
    const [claimError, setClaimError] = useState('');
    const fileInputRef = useRef(null);
    const dropzoneRef = useRef(null);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const navigate = useNavigate();

    // Toast notification
    const { toast, showToast, hideToast } = useToast();

    useEffect(() => {
        setDisplayItems(items || []);
    }, [items]);

    const handleContact = useCallback(() => {
        navigate('/messages');
    }, [navigate]);

    useEffect(() => {
        setCurrentImageIndex(0); // Reset when selectedItem or modal visibility changes
    }, [selectedItem, showModal]);

    
    const handlePrevImage = () => {
        setCurrentImageIndex(prevIndex => Math.max(0, prevIndex - 1));
    };

    const handleNextImage = () => {
        // Ensure selectedItem and its imageData exist before trying to access length
        if (selectedItem && selectedItem.imageData && currentImageIndex < selectedItem.imageData.length - 1) {
            setCurrentImageIndex(prevIndex => prevIndex + 1);
        }
    };

    // Derived state for image display logic, based on selectedItem
    const displayImages = selectedItem && selectedItem.imageData && selectedItem.imageData.length > 0;
    const singleFallbackImage = !displayImages && selectedItem && selectedItem.image;
    const multipleImages = displayImages && selectedItem.imageData.length > 1;


    // Item detail view handler
    const viewDetails = useCallback((itemId) => {
        const item = displayItems.find(item => item.id === itemId);
        if (item) {
            setSelectedItem(item);
            setShowModal(true);
        }
    }, [displayItems]);
    
    // Close modal
    const closeModal = useCallback(() => {
        setShowModal(false);
        setSelectedItem(null);
    }, []);

    // Handle claim button click
    const handleClaimClick = useCallback(() => {
        setShowModal(false);
        setShowClaimModal(true);
    }, []);

    // Close claim modal
    const closeClaimModal = useCallback(() => {
        setShowClaimModal(false);
        setClaimForm({
            lastSeenLocation: '',
            uniqueIdentifier: '',
            additionalDetails: '',
            proofImage: null
        });
        setShowModal(true);
    }, []);

    // Handle claim form input changes
    const handleClaimInputChange = useCallback((e) => {
        const { name, value } = e.target;
        setClaimForm(prev => ({
            ...prev,
            [name]: value
        }));
    }, []);

    // Handle claim submission
    const handleSubmitClaim = useCallback(async (e) => {
        e.preventDefault();
        if (!selectedItem) {
            setClaimError('No item selected for claim.');
            return;
        }

        const userDataString = localStorage.getItem('userData');
        if (!userDataString) {
            setClaimError('User not logged in. Cannot submit claim.');
            return;
        }
        const claimerData = JSON.parse(userDataString);

        if (!claimerData.student_id || !claimerData.full_name) {
            setClaimError('User data is incomplete. Cannot submit claim.');
            return;
        }

        setIsSubmittingClaim(true);
        setClaimError('');

        try {
            const submissionResult = await submitItemClaim(selectedItem, claimerData, claimForm);
            
            setShowClaimModal(false);
            setClaimForm({
                lastSeenLocation: '',
                uniqueIdentifier: '',
                additionalDetails: '',
                proofImage: null
            });
            showToast('Claim submitted successfully! You can track its status in My Claims.', 'success');

            // Call the callback to update parent's state
            if (onItemUpdated && submissionResult.itemNewStatus) {
                onItemUpdated(selectedItem.id, submissionResult.itemNewStatus);
            }
            navigate('/my-claims'); 

        } catch (error) {
            console.error("Error submitting claim from component:", error);
            setClaimError(error.message || 'Failed to submit claim. Please try again.');
        } finally {
            setIsSubmittingClaim(false);
        }
    }, [selectedItem, claimForm, onItemUpdated]);

    // Check if current user is the item reporter
    const isReporter = useCallback((item) => {
        const userData = JSON.parse(localStorage.getItem('userData'));
        return userData && item.submitter && item.submitter.student_id === userData.student_id;
    }, []);

    // Handle file upload
    const handleFiles = useCallback((files) => {
        if (files.length) {
            const file = files[0];
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    setClaimForm(prev => ({
                        ...prev,
                        proofImage: e.target.result
                    }));
                    setShowImageUploadModal(false);
                };
                reader.readAsDataURL(file);
            }
        }
    }, []);

    // Handle drag and drop
    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        if (dropzoneRef.current) {
            dropzoneRef.current.classList.add('dragover');
        }
    }, []);

    const handleDragLeave = useCallback(() => {
        if (dropzoneRef.current) {
            dropzoneRef.current.classList.remove('dragover');
        }
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        if (dropzoneRef.current) {
            dropzoneRef.current.classList.remove('dragover');
            handleFiles(e.dataTransfer.files);
        }
    }, [handleFiles]);

    // Handle file input change
    const handleFileInputChange = useCallback((e) => {
        if (e.target.files.length) {
            handleFiles(e.target.files);
        }
    }, [handleFiles]);

    // Open image upload modal
    const openImageUploadModal = useCallback(() => {
        setShowImageUploadModal(true);
    }, []);

    // Close image upload modal
    const closeImageUploadModal = useCallback(() => {
        setShowImageUploadModal(false);
    }, []);

    // Trigger file input click
    const triggerFileInput = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const requestDeleteItem = (itemIdToDelete) => {
        setPendingDeleteId(itemIdToDelete);
        setShowDeleteConfirm(true);
    };

    const confirmDeleteItem = async () => {
        if (!pendingDeleteId) return;
        try {
            await deleteStudentReportedItem(pendingDeleteId);
            showToast('Report deleted successfully.', 'success');
            // Update local list immediately
            setDisplayItems(prev => prev.filter(item => item.id !== pendingDeleteId));
            if (onItemUpdated) {
                onItemUpdated(pendingDeleteId, 'deleted'); // Notify parent to remove the item
            }
            setShowModal(false);
            setSelectedItem(null);
        } catch (error) {
            console.error("Error deleting item:", error);
            showToast('Failed to delete report. Please try again.', 'error');
        } finally {
            setShowDeleteConfirm(false);
            setPendingDeleteId(null);
        }
    };

    const cancelDeleteItem = () => {
        setShowDeleteConfirm(false);
        setPendingDeleteId(null);
    };

    return (
        <section className="recent-items">
            {title && <h2>{title}</h2>}
            
            {/* Item Details Modal */}
            {showModal && selectedItem && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{selectedItem.name}</h2>
                            <button className="close-button" onClick={closeModal}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="item-detail-container">
                                <div className="item-image-container">
                                    {displayImages ? (
                                        <img 
                                            src={selectedItem.imageData[currentImageIndex].dataUrl} 
                                            alt={selectedItem.imageData[currentImageIndex].name || `${selectedItem.name} - Image ${currentImageIndex + 1}`}
                                            style={{ width: '100%', height: 'auto', maxHeight: '300px', objectFit: 'contain', borderRadius: '4px', marginBottom: multipleImages ? '10px' : '0' }}
                                        />
                                    ) : singleFallbackImage ? (
                                        <img 
                                            src={selectedItem.image} 
                                            alt={selectedItem.name || 'Item Image'} 
                                            style={{ width: '100%', height: 'auto', maxHeight: '300px', objectFit: 'contain', borderRadius: '4px' }}
                                        />
                                    ) : (
                                        <p style={{ textAlign: 'center', padding: '20px' }}>No image available</p>
                                    )}
                                    {multipleImages && (
                                        <div className="image-pagination-controls" style={{ textAlign: 'center', marginTop: '10px' }}>
                                            <button onClick={handlePrevImage} disabled={currentImageIndex === 0}>
                                                Previous
                                            </button>
                                            <span style={{ margin: '0 10px', fontSize: '0.9em' }}>
                                                Image {currentImageIndex + 1} of {selectedItem.imageData.length}
                                            </span>
                                            <button onClick={handleNextImage} disabled={currentImageIndex === selectedItem.imageData.length - 1}>
                                                Next
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="item-info">
                                    <div className="info-group">
                                        <h3>Claim Location:</h3>
                                        <span className="location-badge">
                                            <i className="fas fa-map-marker-alt"></i>
                                            Room 122 (Disciplinary Office)
                                        </span>
                                    </div>
                                    
                                    <h3>Item details</h3>
                                    <div className="detail-item">
                                        <i className="fas fa-tag"></i> <strong>Category:</strong> {selectedItem.category}
                                    </div>
                                    <div className="detail-item">
                                        <i className="fas fa-map-marker-alt"></i> <strong>Location:</strong> {selectedItem.location}
                                    </div>
                                    <div className="detail-item">
                                        <i className="fas fa-calendar"></i> <strong>Found on:</strong> {selectedItem.date}
                                    </div>
                                    {selectedItem.createdAt && (
                                        <div className="detail-item">
                                            <i className="fas fa-clock"></i> <strong>Reported on:</strong> {
                                                (() => {
                                                    // Handle both Firestore timestamp and ISO string formats
                                                    let date;
                                                    if (selectedItem.createdAt.seconds) {
                                                        date = new Date(selectedItem.createdAt.seconds * 1000);
                                                    } else {
                                                        date = new Date(selectedItem.createdAt);
                                                    }
                                                    // Format as YYYY-MM-DD
                                                    return date.toISOString().split('T')[0];
                                                })()
                                            }
                                        </div>
                                    )}
                                    <p>{selectedItem.description}</p>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn back" onClick={closeModal}>Back to list</button>
                            {!isReporter(selectedItem) && selectedItem.status === 'Unclaimed' && (
                                <button className="btn claim" onClick={handleClaimClick}>
                                    <i className="fas fa-hand-holding"></i> Claim Item
                                </button>
                            )}
                            {!isReporter(selectedItem) && (selectedItem.status === "Claimed" || selectedItem.status === "Claiming") && (
                                <div style={{display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px'}}>
                                    <p>Believe this item is yours?</p>
                                    <button 
                                        className="btn edit" 
                                        onClick={handleContact}
                                        disabled={isFlagged}
                                        style={{
                                            opacity: isFlagged ? 0.5 : 1,
                                            cursor: isFlagged ? 'not-allowed' : 'pointer'
                                        }}
                                        title={isFlagged ? 'Feature restricted for flagged accounts' : 'Contact Disciplinary Office'}
                                    >
                                        <i className="fas fa-edit"></i> Contact Disciplinary Office.
                                    </button>
                                </div>
                            )}
                            {isReporter(selectedItem) && selectedItem.adminApproval === false && (
                                <button 
                                    className="btn delete-report-modal-btn"
                                    onClick={() => requestDeleteItem(selectedItem.id)}
                                    title="Delete this report"
                                >
                                    <i className="fas fa-trash-alt"></i> Delete Report
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Claim Modal */}
            {showClaimModal && selectedItem && (
                <div className="modal-overlay" onClick={closeClaimModal}>
                    <div className="modal-content claim-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Claim "{selectedItem.name}"</h2>
                            <button className="close-button" onClick={closeClaimModal}>×</button>
                        </div>
                        <div className="modal-body">
                            <p className="claim-subtitle">
                            Please be advised that spamming or submitting claims for items you do not own may result in a <strong>flag</strong> or <strong>ban</strong>.<br />
                            To proceed, please answer the security questions to verify item ownership.
                            </p>
                            {claimError && <p className="error-message" style={{textAlign: 'center'}}>{claimError}</p>}
                            <form onSubmit={handleSubmitClaim} className="claim-form">
                                <div className="form-group">
                                    <label>Where was the item last seen?</label>
                                    <input
                                        type="text"
                                        name="lastSeenLocation"
                                        value={claimForm.lastSeenLocation}
                                        onChange={handleClaimInputChange}
                                        placeholder="Specify the approximate location where the item was likely lost"
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Unique Identifier for the item?</label>
                                    <input
                                        type="text"
                                        name="uniqueIdentifier"
                                        value={claimForm.uniqueIdentifier}
                                        onChange={handleClaimInputChange}
                                        placeholder="Engravings/ Special Markings if there are"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Additional Details?</label>
                                    <div className="textarea-with-icon">
                                        <textarea
                                            name="additionalDetails"
                                            value={claimForm.additionalDetails}
                                            onChange={handleClaimInputChange}
                                            placeholder="Provide additional details if you can"
                                            rows={4}
                                        />
                                        <button 
                                            type="button" 
                                            className="image-upload-icon"
                                            onClick={openImageUploadModal}
                                        >
                                            <i className="fas fa-image"></i>
                                        </button>
                                    </div>
                                    {claimForm.proofImage && (
                                        <div className="proof-image-preview">
                                            <img src={claimForm.proofImage} alt="Proof" />
                                            <button 
                                                type="button" 
                                                className="remove-image"
                                                onClick={() => setClaimForm(prev => ({ ...prev, proofImage: null }))}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="claim-form-buttons">
                                    <button type="button" className="btn cancel" onClick={closeClaimModal} disabled={isSubmittingClaim}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn submit-claim" disabled={isSubmittingClaim}>
                                        {isSubmittingClaim ? 'Submitting...' : 'Submit Claim'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Image Upload Modal */}
            {showImageUploadModal && (
                <div className="modal-overlay" onClick={closeImageUploadModal}>
                    <div className="modal-content upload-modal" onClick={(e) => e.stopPropagation()}>
                        <div 
                            className="dropzone" 
                            ref={dropzoneRef}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                        >
                            <h3>Drag & drop files here</h3>
                            <p>or</p>
                            <button type="button" className="upload-btn" onClick={triggerFileInput}>
                                Upload from computer
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                                accept="image/*"
                                onChange={handleFileInputChange}
                            />
                        </div>
                        <div className="upload-modal-footer">
                            <button className="btn back" onClick={closeImageUploadModal}>
                                Back
                            </button>
                            <button className="btn submit" onClick={closeImageUploadModal}>
                                Submit
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Items Grid */}
            {displayItems.length > 0 ? (
                <div className="items-grid">
                    {displayItems.map(item => (
                        <div key={item.id} className="recent-item-card">
                            {isReporter(item) && (
                                <div className="user-submitted-indicator">
                                    <i className="fas fa-user-check"></i> Your Post
                                </div>
                            )}
                            <div className="item-card-image-container">
                                <img 
                                    src={item.image || ''} 
                                    alt={item.image ? item.name : 'No image available'}
                                    loading="lazy"
                                    decoding="async"
                                />
                                {item.adminApproval === false && item.status !== 'Disapproved' && (
                                    <div className="pending-approval-indicator">
                                        <i className="fas fa-hourglass-half"></i> Pending Approval from Admin
                                    </div>
                                )}
                                {item.status === 'Disapproved' && (
                                    <div className="disapproved-indicator">
                                        <i className="fas fa-times-circle"></i> Item Disapproved
                                    </div>
                                )}
                            </div>
                            {item.status !== 'Disapproved' && (
                                <div className={`status-badge ${item.status ? item.status.toLowerCase() : 'unknown'}`}>
                                    {item.status === 'Claiming' ? 'Being Claimed' : (item.status || 'N/A')}
                                </div>
                            )}
                            <h3>{item.name}</h3>
                            <p><i className="fas fa-tag"> </i> {item.category}</p>
                            <p><i className="fas fa-map-marker-alt"> </i> {item.location}</p>
                            <p><i className="fas fa-calendar"></i> {item.date}</p>
                            <button onClick={() => viewDetails(item.id)}>View Details</button>
                        </div>
                    ))}
                </div>
            ) : (
                <p>{emptyMessage}</p>
            )}

            {/* Delete confirmation modal */}
            {showDeleteConfirm && (
                <div className="modal-overlay" onClick={cancelDeleteItem}>
                    <div
                        className="modal-content"
                        style={{ maxWidth: '420px', width: '90%' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="modal-header">
                            <h2>Delete Report</h2>
                            <button className="close-button" onClick={cancelDeleteItem}>×</button>
                        </div>
                        <div className="modal-body">
                            <p>Are you sure you want to delete this report? This action cannot be undone.</p>
                        </div>
                        <div className="modal-footer" style={{ justifyContent: 'flex-end', gap: '10px' }}>
                            <button className="btn back" onClick={cancelDeleteItem}>Cancel</button>
                            <button className="btn delete-report-modal-btn" onClick={confirmDeleteItem}>
                                <i className="fas fa-trash-alt"></i> Delete
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
        </section>
    );
};

export default ItemsList; 

// New Component for Claim Detail Modal
export const ClaimDetailModalDisplay = ({ claim, onClose }) => {
    if (!claim) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content claim-detail-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Claim Details: {claim.itemName}</h2>
                    <button className="close-button" onClick={onClose}>×</button>
                </div>
                <div className="modal-body">
                    <div className="item-detail-container">
                        <div className="item-image-container">
                            {claim.itemImage ? (
                                <img src={claim.itemImage} alt={claim.itemName} />
                            ) : (
                                <p style={{ textAlign: 'center', padding: '20px' }}>No item image available</p>
                            )}
                            <div className={`claim-status status-${claim.claimStatus ? claim.claimStatus.toLowerCase() : 'unknown'}`} style={{ position: 'absolute', top: '10px', right: '10px', borderRadius: '15px' }}>
                                Status: {claim.claimStatus}
                            </div>
                        </div>
                        <div className="item-info">
                            <h3>Security Answers Provided:</h3>
                            <div className="detail-item">
                                <i className="fas fa-map-pin"></i> <strong>Last Seen Location:</strong> 
                                {claim.lastSeenLocation || 'N/A'}
                            </div>
                            <div className="detail-item">
                                <i className="fas fa-fingerprint"></i> <strong>Unique Identifier:</strong> 
                                {claim.uniqueIdentifier || 'N/A'}
                            </div>
                            <div className="detail-item" style={{ flexDirection: 'column', alignItems: 'flex-start'}}>
                                <div><i className="fas fa-info-circle"></i> <strong>Additional Details:</strong></div>
                                <p style={{ whiteSpace: 'pre-wrap', width: '100%', marginTop: '5px', background: 'transparent', padding: '0' }}>
                                    {claim.additionalDetails || 'None provided'}
                                </p>
                            </div>

                            <h3>Proof Image Provided:</h3>
                            {claim.proofImageUrl ? (
                                <div className="proof-image-preview" style={{ marginTop: '10px', textAlign: 'center' }}>
                                    <img src={claim.proofImageUrl} alt="Proof provided" style={{ maxWidth: '100%', maxHeight: '250px', objectFit: 'contain' }}/>
                                </div>
                            ) : (
                                <p>No proof image was uploaded with this claim.</p>
                            )}
                        </div>
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn back" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
};

// New Component for Displaying Claims Grid
export const ClaimsGridDisplay = ({ claims, onViewDetails }) => {
    if (!claims || claims.length === 0) {
        // This case should ideally be handled by the parent component (MyClaims)
        // before even rendering this grid component.
        return null; 
    }

    return (
        <div className="claims-grid">
            {claims.map(claim => (
                <div key={claim.id} className="claim-card">
                    <div className={`claim-status status-${claim.claimStatus ? claim.claimStatus.toLowerCase() : 'unknown'}`}>
                        {claim.claimStatus || 'N/A'}
                    </div>
                    {claim.itemImage ? (
                        <img src={claim.itemImage} alt={claim.itemName} loading="lazy" decoding="async" />
                    ) : (
                        <div style={{
                            width: '100%',
                            height: '200px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#f0f0f0',
                            color: '#999',
                            fontSize: '14px'
                        }}>
                            No image available
                        </div>
                    )}
                    <div className="student-claim-info">
                        <h3>{claim.itemName || 'Item Name N/A'}</h3>
                        <p><i className="fas fa-calendar"></i> Claimed on: {claim.displayDate}</p>
                    </div>
                    <button
                        className="view-details-btn"
                        onClick={() => onViewDetails(claim.id)}
                    >
                        View Details
                    </button>
                </div>
            ))}
        </div>
    );
}; 