import React, { useState, useCallback, useRef } from 'react';
import { submitItemClaim } from '../../firebase';
import noItem from '../../assets/NoItemPlaceholder.png';

const ItemsList = ({ items, title, emptyMessage = "No items found.", onItemClaimed }) => {
    const [showModal, setShowModal] = useState(false);
    const [showClaimModal, setShowClaimModal] = useState(false);
    const [showImageUploadModal, setShowImageUploadModal] = useState(false);
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

    // Item detail view handler
    const viewDetails = useCallback((itemId) => {
        const item = items.find(item => item.id === itemId);
        if (item) {
            setSelectedItem(item);
            setShowModal(true);
        }
    }, [items]);
    
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
            alert('Claim submitted successfully! You can track its status in My Claims.');

            // Call the callback to update parent's state
            if (onItemClaimed && submissionResult.itemNewStatus) {
                onItemClaimed(selectedItem.id, submissionResult.itemNewStatus);
            }
            // navigate('/my-claims'); 

        } catch (error) {
            console.error("Error submitting claim from component:", error);
            setClaimError(error.message || 'Failed to submit claim. Please try again.');
        } finally {
            setIsSubmittingClaim(false);
        }
    }, [selectedItem, claimForm, onItemClaimed]);

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
                                    <img src={selectedItem.image || noItem} alt={selectedItem.name} />
                                </div>
                                <div className="item-info">
                                    <div className="info-group">
                                        <h3>Claim Location:</h3>
                                        <span className="location-badge">
                                            <i className="fas fa-map-marker-alt"></i>
                                            Disciplinary Office
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
                                                new Date(selectedItem.createdAt.seconds * 1000).toLocaleDateString()
                                            }
                                        </div>
                                    )}
                                    <p>{selectedItem.description}</p>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn back" onClick={closeModal}>Back to list</button>
                            {!isReporter(selectedItem) && selectedItem.status === 'Available' && (
                                <button className="btn claim" onClick={handleClaimClick}>
                                    <i className="fas fa-hand-holding"></i> Claim Item
                                </button>
                            )}
                            {isReporter(selectedItem) && selectedItem.status === 'Available' &&  (
                                <button className="btn edit" onClick={() => console.log('Edit item clicked:', selectedItem.id)}>
                                    <i className="fas fa-edit"></i> Edit Item
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
                            <p className="claim-subtitle">Please answer the security questions to verify ownership.</p>
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
            {items.length > 0 ? (
                <div className="items-grid">
                    {items.map(item => (
                        <div key={item.id} className="recent-item-card">
                            {isReporter(item) && (
                                <div className="user-submitted-indicator">
                                    <i className="fas fa-user-check"></i> Your Post
                                </div>
                            )}
                            <div className="item-card-image-container">
                                <img src={item.image || noItem} alt={item.name} />
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
                            <div className={`status-badge ${item.status ? item.status.toLowerCase() : 'unknown'}`}>
                                {item.status || 'N/A'}
                            </div>
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
        </section>
    );
};

export default ItemsList; 