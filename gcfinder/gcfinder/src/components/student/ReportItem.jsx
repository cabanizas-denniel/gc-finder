import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { submitFoundItem } from '../../firebase'; // Import the submitFoundItem function
import Toast, { useToast } from '../Toast';

const ReportItem = () => {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(0);
    const [hasAcceptedDisclaimer, setHasAcceptedDisclaimer] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        itemName: '',
        description: '',
        location: '',
        dateFound: '',
        category: '',
        exactLocation: '',
        uniqueIdentifier: '',
        additionalDetails: ''
    });
    const [uploadedImages, setUploadedImages] = useState([]);
    const fileInputRef = useRef(null);
    const dropzoneRef = useRef(null);

    // Toast notification
    const { toast, showToast, hideToast } = useToast();

    // Handle file upload - using useCallback to avoid dependency issues
    const handleFiles = useCallback((files) => {
        const newImages = [...uploadedImages];
        
        Array.from(files).forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    // Create an image element to resize
                    const img = new Image();
                    img.onload = () => {
                        // Create a canvas to resize the image
                        const canvas = document.createElement('canvas');
                        // Set max dimensions (e.g., 800x800 pixels)
                        const MAX_WIDTH = 800;
                        const MAX_HEIGHT = 800;
                        
                        let width = img.width;
                        let height = img.height;
                        
                        // Resize while maintaining aspect ratio
                        if (width > height) {
                            if (width > MAX_WIDTH) {
                                height *= MAX_WIDTH / width;
                                width = MAX_WIDTH;
                            }
                        } else {
                            if (height > MAX_HEIGHT) {
                                width *= MAX_HEIGHT / height;
                                height = MAX_HEIGHT;
                            }
                        }
                        
                        canvas.width = width;
                        canvas.height = height;
                        
                        // Draw resized image on canvas
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);
                        
                        // Get resized data URL - reduce quality
                        const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.7); // Reduce quality to 70%
                        
                        newImages.push({
                            id: Date.now() + Math.random().toString(36).substring(2, 9),
                            src: resizedDataUrl,
                            name: file.name
                        });
                        
                        setUploadedImages([...newImages]);
                    };
                    img.src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }, [uploadedImages]);
    
    // Handle drag and drop functionality
    useEffect(() => {
        const dropzone = dropzoneRef.current;
        
        if (dropzone) {
            const handleDragOver = (e) => {
                e.preventDefault();
                dropzone.classList.add('dragover');
            };
            
            const handleDragLeave = () => {
                dropzone.classList.remove('dragover');
            };
            
            const handleDrop = (e) => {
                e.preventDefault();
                dropzone.classList.remove('dragover');
                
                if (e.dataTransfer.files.length) {
                    handleFiles(e.dataTransfer.files);
                }
            };
            
            dropzone.addEventListener('dragover', handleDragOver);
            dropzone.addEventListener('dragleave', handleDragLeave);
            dropzone.addEventListener('drop', handleDrop);
            
            return () => {
                dropzone.removeEventListener('dragover', handleDragOver);
                dropzone.removeEventListener('dragleave', handleDragLeave);
                dropzone.removeEventListener('drop', handleDrop);
            };
        }
    }, [handleFiles]);

    // Handle form input changes
    const handleInputChange = useCallback((e) => {
        const { id, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [id]: value
        }));
    }, []);

    // Handle navigation between form steps
    const goToStep = useCallback((step) => {
        if (step >= 0 && step <= 3) {
            setCurrentStep(step);
        }
    }, []);

    // Validate current step before proceeding
    const validateStep = useCallback((step) => {
        switch(step) {
            case 0: // Item Details
                return formData.itemName && formData.description && formData.location && 
                       formData.dateFound && formData.category;
            case 1: // Media Upload
                return uploadedImages.length > 0; // Media is now required
            case 2: // Security Questions
                return formData.exactLocation; // Only exact location is required
            case 3: // Confirmation
                return true;
            default:
                return false;
        }
    }, [formData, uploadedImages]);

    // Handle form submission
    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        
        if (!validateStep(currentStep)) {
            alert('Please fill in all required fields');
            return;
        }
        
        setIsSubmitting(true);
        
        try {
            // Get user data from localStorage
            const userData = JSON.parse(localStorage.getItem('userData'));
            
            // Add user information to formData
            const submissionData = {
                ...formData,
                student_id: userData.student_id,
                full_name: userData.full_name,
                submitted_at: new Date().toISOString()
            };
            
            // Use the submitFoundItem function to send data to Firebase
            await submitFoundItem(submissionData, uploadedImages);
        
            // Show success toast first
            showToast('Report submitted successfully!', 'success');
            
            // Navigate to dashboard after a short delay to allow toast to be seen
            setTimeout(() => {
                navigate('/dashboard');
            }, 2000);
        } catch (error) {
            console.error('Error submitting form:', error);
            alert('An error occurred while submitting the report. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    }, [currentStep, formData, uploadedImages, validateStep, navigate]);

    // Handle file input change
    const handleFileInputChange = useCallback((e) => {
        if (e.target.files.length) {
            handleFiles(e.target.files);
        }
    }, [handleFiles]);

    // Trigger file input click
    const handleUploadButtonClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    // Remove uploaded image
    const handleRemoveImage = useCallback((id) => {
        setUploadedImages(prev => prev.filter(image => image.id !== id));
    }, []);

    // Accept disclaimer
    const handleAcceptDisclaimer = useCallback(() => {
        setHasAcceptedDisclaimer(true);
    }, []);

    // Handle next button click with validation
    const handleNextStep = useCallback(() => {
        // Special validation for media upload step
        if (currentStep === 1 && uploadedImages.length === 0) {
            showToast('Please upload at least one image before proceeding.', 'warning');
            return;
        }

        // Get the active form step
        const activeStep = document.querySelector(`.form-step.active`);
        
        // Check if all required fields in the current step are filled
        const requiredFields = activeStep.querySelectorAll('[required]');
        let allFieldsValid = true;
        
        // Trigger HTML5 validation on all required fields
        requiredFields.forEach(field => {
            if (!field.checkValidity()) {
                field.reportValidity(); // This will show the browser's validation message
                allFieldsValid = false;
            }
        });
        
        // Only proceed if all required fields are valid
        if (allFieldsValid && validateStep(currentStep)) {
            goToStep(currentStep + 1);
        }
    }, [currentStep, goToStep, validateStep, uploadedImages, showToast]);

    // Handle back button click
    const handlePreviousStep = useCallback(() => {
        goToStep(currentStep - 1);
    }, [currentStep, goToStep]);

    return (
        <div className="report-item-container">
            <div className="progress-bar">
                <div className={`step ${currentStep === 0 ? 'active' : ''}`}>Item Details</div>
                <div className={`step ${currentStep === 1 ? 'active' : ''}`}>Media Upload</div>
                <div className={`step ${currentStep === 2 ? 'active' : ''}`}>Security Questions</div>
                <div className={`step ${currentStep === 3 ? 'active' : ''}`}>Confirmation</div>
            </div>
            
            <div className="report-form-container">
                {/* Disclaimer Popup */}
                {!hasAcceptedDisclaimer && (
                    <div className="disclaimer-popup" style={{ display: 'flex' }}>
                        <div className="disclaimer-content">
                            <div className="disclaimer-icon">
                                <i className="fas fa-exclamation-triangle"></i>
                            </div>
                            <h2>Disclaimer</h2>
                            <p>Please be aware that reporting found items comes with responsibilities. Ensure that all information provided is accurate and truthful.</p>
                            <p>The following items and behaviors are <strong>prohibited</strong> from being reported:</p>
                            <div className="prohibited-items">
                                <span className="prohibited-tag">Weapons</span>
                                <span className="prohibited-tag">Dangerous Items</span>
                                <span className="prohibited-tag">Illegal Substances</span>
                                <span className="prohibited-tag">Spamming</span>
                                <span className="prohibited-tag">Misinformation</span>
                                <span className="prohibited-tag">False Reports</span>
                            </div>
                            <button className="understand-btn" onClick={handleAcceptDisclaimer}>I Understand</button>
                        </div>
                    </div>
                )}
              
                    {/* Submission Loading Overlay */}
                    {isSubmitting && (
                        <div className="submission-overlay">
                            <div className="submission-content">
                                <div className="submission-content-icon">
                                    <i className="fas fa-spinner fa-spin"></i>
                                </div>
                                <p>Submitting your report...</p>
                                <p>Please do not close this page.</p>
                            </div>
                        </div>
                    )}
                
                <form id="reportForm" className="report-form" onSubmit={handleSubmit}>
                    {/* Step 1: Item Details */}
                    <div className={`form-step ${currentStep === 0 ? 'active' : ''}`}>
                        <h2>Report Lost Item</h2>
                        <p>Please provide details about the item(s) you've found.</p>
                        
                        <div className="form-group">
                            <label htmlFor="itemName">Item Name</label>
                            <input 
                                type="text" 
                                id="itemName" 
                                placeholder="e.g. Blue Wallet, Student ID" 
                                value={formData.itemName}
                                onChange={handleInputChange}
                                required 
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="description">Description</label>
                            <textarea 
                                id="description" 
                                placeholder="Describe the item in detail" 
                                value={formData.description}
                                onChange={handleInputChange}
                                required
                            ></textarea>
                        </div>

                        <div className="form-group">
                            <label htmlFor="location">Location Found</label>
                            <input 
                                type="text" 
                                id="location" 
                                placeholder="e.g. Library, Cafeteria" 
                                value={formData.location}
                                onChange={handleInputChange}
                                required 
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="dateFound">Date Found</label>
                            <input 
                                type="date" 
                                id="dateFound" 
                                value={formData.dateFound}
                                onChange={handleInputChange}
                                required 
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="category">Category</label>
                            <select 
                                id="category" 
                                value={formData.category}
                                onChange={handleInputChange}
                                required
                            >
                                <option value="">Select a category</option>
                                <option value="ID's & Documents">ID's & Documents</option>
                                <option value="Electronics & Gadgets">Electronics & Gadgets</option>
                                <option value="Clothing & Wearables">Clothing & Wearables</option>
                                <option value="School Supplies">School Supplies</option>
                                <option value="Bags & Accessories">Bags & Accessories</option>
                                <option value="Personal Items">Personal Items</option>
                                <option value="Miscellaneous">Miscellaneous</option>
                            </select>
                        </div>

                        <div className="form-buttons">
                            <button 
                                type="button" 
                                className="next-btn"
                                onClick={handleNextStep}
                            >
                                Next
                            </button>
                        </div>
                    </div>

                    {/* Step 2: Media Upload */}
                    <div className={`form-step ${currentStep === 1 ? 'active' : ''}`}>
                        <h2>Upload Media</h2>
                        <p>Upload clear photos of the found item.</p>

                        <div className="upload-area">
                            <div className="dropzone" ref={dropzoneRef}>
                                <i className="fas fa-cloud-upload-alt"></i>
                                <p>Drag & drop files here</p>
                                <p>or</p>
                                <button type="button" className="upload-btn" onClick={handleUploadButtonClick}>
                                    Upload from computer
                                </button>
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    style={{ display: 'none' }} 
                                    accept="image/*" 
                                    multiple 
                                    onChange={handleFileInputChange} 
                                    required
                                />
                            </div>
                            
                            {uploadedImages.length > 0 && (
                                <div className="image-previews">
                                    {uploadedImages.map(image => (
                                        <div key={image.id} className="image-preview">
                                            <img src={image.src} alt="Preview" />
                                            <button 
                                                type="button" 
                                                className="remove-btn"
                                                onClick={() => handleRemoveImage(image.id)}
                                            >
                                                <i className="fas fa-times"></i>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="form-buttons">
                            <button type="button" className="back-btn" onClick={handlePreviousStep}>
                                Back
                            </button>
                            <button type="button" className="next-btn" onClick={handleNextStep}>
                                Next
                            </button>
                        </div>
                    </div>

                    {/* Step 3: Security Questions */}
                    <div className={`form-step ${currentStep === 2 ? 'active' : ''}`}>
                        <h2>Provide Security Details</h2>
                        <p>The question and answers will serve as security questions for the person who wishes to claim the item.</p>

                        <div className="form-group">
                            <label htmlFor="exactLocation">Exact location found</label>
                            <input 
                                type="text" 
                                id="exactLocation" 
                                placeholder="Try to specify the exact location in which the item was found" 
                                value={formData.exactLocation}
                                onChange={handleInputChange}
                                required 
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="uniqueIdentifier">Unique identifier</label>
                            <input 
                                type="text" 
                                id="uniqueIdentifier" 
                                placeholder="Engravings/ Special Markings if there are" 
                                value={formData.uniqueIdentifier}
                                onChange={handleInputChange}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="additionalDetails">Additional details</label>
                            <textarea 
                                id="additionalDetails" 
                                placeholder="Provide additional details if you can"
                                value={formData.additionalDetails}
                                onChange={handleInputChange}
                            ></textarea>
                        </div>

                        <div className="form-buttons">
                            <button type="button" className="back-btn" onClick={handlePreviousStep}>
                                Back
                            </button>
                            <button 
                                type="button" 
                                className="next-btn"
                                onClick={handleNextStep}
                            >
                                Next
                            </button>
                        </div>
                    </div>

                    {/* Step 4: Confirmation */}
                    <div className={`form-step ${currentStep === 3 ? 'active' : ''}`}>
                        <h2>Confirm Submission</h2>
                        <div className="confirmation-details">
                            <p>Please review the details before submitting:</p>
                            <div id="summaryDetails">
                                <div className="summary-item">
                                    <strong>Item Name:</strong> {formData.itemName}
                                </div>
                                <div className="summary-item">
                                    <strong>Description:</strong> {formData.description}
                                </div>
                                <div className="summary-item">
                                    <strong>Location:</strong> {formData.location}
                                </div>
                                <div className="summary-item">
                                    <strong>Date Found:</strong> {formData.dateFound}
                                </div>
                                <div className="summary-item">
                                    <strong>Category:</strong> {formData.category}
                                </div>
                                <div className="summary-item">
                                    <strong>Exact Location:</strong> {formData.exactLocation}
                                </div>
                                {formData.uniqueIdentifier && (
                                    <div className="summary-item">
                                        <strong>Unique Identifier:</strong> {formData.uniqueIdentifier}
                                    </div>
                                )}
                                {formData.additionalDetails && (
                                    <div className="summary-item">
                                        <strong>Additional Details:</strong> {formData.additionalDetails}
                                    </div>
                                )}
                                {uploadedImages.length > 0 && (
                                    <div className="summary-item">
                                        <strong>Uploaded Images:</strong> {uploadedImages.length} image(s)
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="disclaimer">
                        <p>By submitting this report, you confirm that all information provided is accurate and true, and that the item has already been, or will be, submitted to <strong>Room 122 (Disciplinary Office)</strong>.</p>
                        <p>Please be advised that not adhering to the disclaimer may have consequences, potentially leading to a <strong>flag</strong> or <strong>ban</strong>.</p>
                        </div>

                        <div className="form-buttons">
                        <button 
                            type="button" 
                            className="back-btn" 
                            onClick={handlePreviousStep}
                            disabled={isSubmitting}
                        >
                                Back
                            </button>
                        <button 
                            type="submit" 
                            className="submit-btn"
                            disabled={isSubmitting}
                            style={{
                                opacity: isSubmitting ? 0.7 : 1,
                                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                position: 'relative'
                            }}
                        >
                            {isSubmitting && (
                                <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
                            )}
                            {isSubmitting ? 'Submitting...' : 'Submit Report'}
                        </button>
                    </div>
                </div>
            </form>
            </div>

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

export default ReportItem;
