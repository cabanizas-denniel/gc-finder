import React, { useEffect, useState } from 'react';
import { submitLostRequest, getLostRequests } from '../../admin-firebase';
import Toast, { useToast } from '../Toast';

const LostRequests = () => {
    const { toast, showToast, hideToast } = useToast();

    const [form, setForm] = useState({
        itemName: '',
        description: '',
        dateLost: '',
        locationLost: ''
    });
    const [file, setFile] = useState(null);
    const [imageDataUrl, setImageDataUrl] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [requests, setRequests] = useState([]);
    const [filterStatus, setFilterStatus] = useState('');
    const [showReminder, setShowReminder] = useState(false);
    const [loadingRequests, setLoadingRequests] = useState(true);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const resetForm = () => {
        setForm({ itemName: '', description: '', dateLost: '', locationLost: '' });
        setFile(null);
        setImageDataUrl('');
    };

    const prepareImage = (selectedFile) => {
        return new Promise((resolve, reject) => {
            try {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const MAX_WIDTH = 800;
                        const MAX_HEIGHT = 800;
                        let width = img.width;
                        let height = img.height;
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
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);
                        const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.9); // 90% quality
                        resolve(resizedDataUrl);
                    };
                    img.onerror = reject;
                    img.src = e.target.result;
                };
                reader.onerror = reject;
                reader.readAsDataURL(selectedFile);
            } catch (err) {
                reject(err);
            }
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.itemName || !form.description || !form.dateLost || !form.locationLost) {
            showToast('Please complete all fields', 'warning');
            return;
        }
        if (!imageDataUrl) {
            showToast('Please upload an image of the lost item', 'warning');
            return;
        }
        try {
            setSubmitting(true);
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            const requesterName = userData.full_name || userData.displayName || userData.name || 'N/A';
            const requesterEmail = userData.userEmail || userData.email || userData.username || `${userData.student_id || userData.employee_id || ''}@gordoncollege.edu.ph`;
            await submitLostRequest({ ...form, imageUrl: imageDataUrl, requesterName, requesterEmail });
            showToast('Lost request submitted for review', 'success');
            resetForm();
            await fetchRequests();
            setShowReminder(true);
        } catch (err) {
            console.error(err);
            showToast(err.message || 'Submission failed', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const fetchRequests = async () => {
        try {
            setLoadingRequests(true);
            const data = await getLostRequests(filterStatus || undefined);
            setRequests(data);
        } catch (e) {
            console.error('Error fetching lost requests:', e);
        } finally {
            setLoadingRequests(false);
        }
    };

    useEffect(() => { fetchRequests(); /* eslint-disable-next-line */ }, [filterStatus]);

    return (
        <div className="lost-requests-container" style={{ padding: 20 }}>
            <div className="lost-requests-header">
                <h1>Report Lost</h1>
                <p className="admin-subtitle">All submissions are reviewed before being shown publicly.</p>
            </div>

            <form onSubmit={handleSubmit} className="lost-request-form">
                <div className="form-row">
                    <label>Item Name</label>
                    <input className="lr-input" type="text" name="itemName" value={form.itemName} onChange={handleChange} />
                </div>
                <div className="form-row">
                    <label>Description</label>
                    <textarea className="lr-input" name="description" value={form.description} onChange={handleChange} rows="3" />
                </div>
                <div className="form-grid">
                    <div className="form-row">
                        <label>Date Lost</label>
                        <input className="lr-input" type="date" name="dateLost" value={form.dateLost} onChange={handleChange} />
                    </div>
                    <div className="form-row">
                        <label>Location Lost</label>
                        <input className="lr-input" type="text" name="locationLost" value={form.locationLost} onChange={handleChange} />
                    </div>
                </div>
                <div className="form-row">
                    <label>Image Upload</label>
                    <div className="lr-image-upload-container">
                        <input
                            id="lost-item-image-upload"
                            className="lr-image-input"
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                                const f = e.target.files?.[0] || null;
                                setFile(f);
                                setImageDataUrl('');
                                if (f) {
                                    try {
                                        const dataUrl = await prepareImage(f);
                                        setImageDataUrl(dataUrl);
                                    } catch (err) {
                                        console.error(err);
                                        showToast('Failed to process image', 'error');
                                    }
                                }
                            }}
                        />
                        {!imageDataUrl ? (
                            <label htmlFor="lost-item-image-upload" className="lr-image-upload-area">
                                <div className="lr-upload-icon">
                                    <i className="fas fa-cloud-upload-alt"></i>
                                </div>
                                <div className="lr-upload-text">
                                    <span className="lr-upload-main-text">Click to upload or drag and drop</span>
                                    <span className="lr-upload-sub-text">PNG, JPG, JPEG up to 800x800px</span>
                                </div>
                            </label>
                        ) : (
                            <div className="lr-image-preview-container">
                                <div className="lr-image-preview">
                                    <img alt="preview" src={imageDataUrl} />
                                    <button
                                        type="button"
                                        className="lr-remove-image"
                                        onClick={() => {
                                            setImageDataUrl('');
                                            setFile(null);
                                            const input = document.getElementById('lost-item-image-upload');
                                            if (input) input.value = '';
                                        }}
                                    >
                                        <i className="fas fa-times"></i>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <div className="form-actions">
                    <button type="submit" className="export-modal-confirm-btn" disabled={submitting}>{submitting ? 'Submitting...' : 'Submit Request'}</button>
                </div>
            </form>

            <div className="lost-requests-list">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h2>My Requests</h2>
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="export-modal-date-input" style={{ maxWidth: 220 }}>
                        <option value="">All</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                    </select>
                </div>
                {loadingRequests ? (
                    <div className="loading-message" style={{ textAlign: 'center', padding: '40px 20px' }}>
                        <i className="fas fa-spinner fa-pulse" style={{ fontSize: '2rem', color: 'var(--primary-color)', marginBottom: '15px' }}></i>
                        <p style={{ color: '#666', margin: 0 }}>Loading your requests...</p>
                    </div>
                ) : requests.length === 0 ? (
                    <div className="no-results">
                        <i className="fas fa-search"></i>
                        <h3>No requests found</h3>
                        <p>Try a different filter</p>
                    </div>
                ) : (
                    <div className="mobile-table-wrapper">
                        <table className="users-table">
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th>Date Lost</th>
                                    <th>Location</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.map((r) => (
                                    <tr key={r.id}>
                                        <td>{r.itemName}</td>
                                        <td><span className="date-badge"><i className="fas fa-calendar"></i> {r.dateLost}</span></td>
                                        <td><span className="location-badge-lost"><i className="fas fa-map-marker-alt"></i> {r.locationLost}</span></td>
                                        <td><span className={`user-status-badge ${r.status}`}>{r.status.charAt(0).toUpperCase() + r.status.slice(1)}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <Toast message={toast.message} show={toast.show} onClose={hideToast} type={toast.type} />

            {showReminder && (
                <div className="export-modal-overlay" onClick={() => setShowReminder(false)}>
                    <div className="export-modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="export-modal-header">
                            <h2 className="export-modal-title">Important Reminder</h2>
                            <button onClick={() => setShowReminder(false)} className="export-modal-close-btn" aria-label="close">
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="export-modal-description" style={{ padding: '20px 0', textAlign: 'center' }}>
                            <div style={{ fontSize: '3rem', color: 'var(--primary-color)', marginBottom: '15px' }}>
                                <i className="fas fa-exclamation-circle"></i>
                            </div>
                            <p style={{ fontSize: '1rem', lineHeight: '1.6', color: '#333', margin: 0 }}>
                                Please note that <strong>the Disciplinary Office is not responsible if the item is not found</strong>.
                            </p>
                            <p style={{ fontSize: '0.9rem', lineHeight: '1.6', color: '#666', marginTop: '15px', marginBottom: 0 }}>
                                This service is provided to help connect you with potential finders, but we cannot guarantee the recovery of lost items.
                            </p>
                        </div>
                        <div className="export-modal-actions">
                            <button className="export-modal-confirm-btn" onClick={() => setShowReminder(false)} style={{ width: '100%' }}>
                                I Understand
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LostRequests;


