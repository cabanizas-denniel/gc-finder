import React, { useEffect, useState } from 'react';
import { getLostRequests, approveLostRequest, rejectLostRequest } from '../../admin-firebase';
import Toast, { useToast } from '../Toast';

const AdminLostRequests = () => {
    const { toast, showToast, hideToast } = useToast();
    const [requests, setRequests] = useState([]);
    const [statusFilter, setStatusFilter] = useState('pending');
    const [loading, setLoading] = useState(false);
    const [rejectingId, setRejectingId] = useState(null);
    const [feedback, setFeedback] = useState('');

    const fetchData = async () => {
        try {
            setLoading(true);
            const data = await getLostRequests(statusFilter || undefined);
            setRequests(data);
        } catch (e) {
            console.error(e);
            showToast('Failed to load lost requests', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); /* eslint-disable-next-line */ }, [statusFilter]);

    const handleApprove = async (id) => {
        try {
            await approveLostRequest(id);
            showToast('Request approved and published', 'success');
            fetchData();
        } catch (e) {
            console.error(e);
            showToast(e.message || 'Approve failed', 'error');
        }
    };

    const handleReject = async (id) => {
        try {
            await rejectLostRequest(id, feedback);
            showToast('Request rejected', 'success');
            setRejectingId(null);
            setFeedback('');
            fetchData();
        } catch (e) {
            console.error(e);
            showToast(e.message || 'Reject failed', 'error');
        }
    };

    return (
        <div className="user-management-container">
            <div className="page-header">
                <div className="page-header-content">
                    <h1>Lost Requests</h1>
                    <p className="admin-subtitle">Review and manage lost item requests submitted by students and staff</p>
                </div>
                <div className="action-buttons">
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="lost-items-sort-select">
                        <option value="">All</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                    </select>
                    <button className="refresh-btn" onClick={fetchData}><i className="fas fa-sync-alt"></i> Refresh</button>
                </div>
            </div>

            <div className="users-table-container">
                {loading ? (
                    <div className="loading-message">
                        <i className="fas fa-spinner fa-pulse"></i>
                        <p>Loading requests...</p>
                    </div>
                ) : requests.length === 0 ? (
                    <div className="no-results">
                        <i className="fas fa-search"></i>
                        <h3>No requests found</h3>
                        <p>Try adjusting the filter</p>
                    </div>
                ) : (
                    <table className="users-table">
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th>Date Lost</th>
                                <th>Location</th>
                                <th>Role</th>
                                <th>Requester</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {requests.map((r) => (
                                <tr key={r.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <img src={r.imageUrl} alt={r.itemName} style={{ width: 48, height: 48, borderRadius: 6, objectFit: 'cover', border: '1px solid #eee' }} />
                                                <div>
                                                    <div className="user-name">{r.itemName}</div>
                                                </div>
                                        </div>
                                    </td>
                                    <td><span className="date-badge"><i className="fas fa-calendar"></i> {r.dateLost}</span></td>
                                    <td><span className="location-badge-lost"><i className="fas fa-map-marker-alt"></i> {r.locationLost}</span></td>
                                    <td><span className={`role-badge ${r.requesterRole || 'student'}`}>{(r.requesterRole || 'student').charAt(0).toUpperCase() + (r.requesterRole || 'student').slice(1)}</span></td>
                                    <td>
                                        <div style={{display:'flex', flexDirection:'column'}}>
                                            <span className="user-name" style={{fontWeight:600}}>{r.requesterName || 'N/A'}</span>
                                            <span style={{color:'#666', fontSize:12}}>{r.requesterEmail || 'N/A'}</span>
                                        </div>
                                    </td>
                                    <td><span className={`user-status-badge ${r.status}`}>{r.status.charAt(0).toUpperCase() + r.status.slice(1)}</span></td>
                                    <td className="actions">
                                        {r.status === 'pending' ? (
                                            <>
                                                <button className="action-btn view" title="Approve" onClick={() => handleApprove(r.id)}>
                                                    <i className="fas fa-check"></i>
                                                </button>
                                                <button className="action-btn ban" title="Reject" onClick={() => setRejectingId(r.id)}>
                                                    <i className="fas fa-times"></i>
                                                </button>
                                            </>
                                        ) : (
                                            <span style={{ color: '#666', fontSize: 12 }}>No actions</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {rejectingId && (
                <div className="export-modal-overlay" onClick={() => setRejectingId(null)}>
                    <div className="export-modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="export-modal-header">
                            <h2 className="export-modal-title">Reject Request</h2>
                            <button onClick={() => setRejectingId(null)} className="export-modal-close-btn" aria-label="close">
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="export-modal-date-input-group">
                            <label>Feedback (optional)</label>
                            <textarea className="export-modal-date-input" rows="4" value={feedback} onChange={(e) => setFeedback(e.target.value)} />
                        </div>
                        <div className="export-modal-actions">
                            <button className="export-modal-cancel-btn" onClick={() => setRejectingId(null)}>Cancel</button>
                            <button className="export-modal-confirm-btn" onClick={() => handleReject(rejectingId)} style={{ backgroundColor: '#e74c3c' }}>Reject</button>
                        </div>
                    </div>
                </div>
            )}

            <Toast message={toast.message} show={toast.show} onClose={hideToast} type={toast.type} />
        </div>
    );
};

export default AdminLostRequests;


