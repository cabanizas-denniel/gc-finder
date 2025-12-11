import React, { useEffect, useState } from 'react';
import { getLostRequests, approveLostRequest, rejectLostRequest, deleteLostRequest, getLostItemsPublic, resolveLostItem, unresolveLostItem, archiveLostItem, unarchiveLostItem, deleteLostItem, deleteAllArchivedLostItems } from '../../admin-firebase';
import Toast, { useToast } from '../Toast';

const AdminLostItems = () => {
    const { toast, showToast, hideToast } = useToast();
    
    // Tab state: 'requests' or 'items'
    const [activeTab, setActiveTab] = useState('requests');
    
    // Requests state (pending lost requests)
    const [requests, setRequests] = useState([]);
    const [statusFilter, setStatusFilter] = useState('pending');
    const [requestsLoading, setRequestsLoading] = useState(false);
    const [rejectingId, setRejectingId] = useState(null);
    const [feedback, setFeedback] = useState('');
    
    // Items state (approved lost items)
    const [items, setItems] = useState([]);
    const [itemsLoading, setItemsLoading] = useState(true);
    const [error, setError] = useState('');
    const [sortBy, setSortBy] = useState('date-newest');
    const [confirmModal, setConfirmModal] = useState({ open: false, action: null, item: null });
    const [deleteModal, setDeleteModal] = useState(null);
    const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxSrc, setLightboxSrc] = useState(null);

    // Fetch requests
    const fetchRequests = async () => {
        try {
            setRequestsLoading(true);
            const data = await getLostRequests(statusFilter || undefined);
            setRequests(data);
        } catch (e) {
            console.error(e);
            showToast('Failed to load lost requests', 'error');
        } finally {
            setRequestsLoading(false);
        }
    };

    // Fetch items
    const fetchItems = async () => {
        try {
            setItemsLoading(true);
            setError('');
            const data = await getLostItemsPublic();
            setItems(data || []);
        } catch (e) {
            console.error(e);
            setError('Failed to load lost items');
        } finally {
            setItemsLoading(false);
        }
    };

    // Fetch requests when tab is active or filter changes
    useEffect(() => {
        if (activeTab === 'requests') {
            fetchRequests();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, statusFilter]);

    // Fetch items when items tab becomes active
    useEffect(() => {
        if (activeTab === 'items') {
            fetchItems();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    // Request handlers
    const handleApprove = async (id) => {
        try {
            await approveLostRequest(id);
            showToast('Request approved and published', 'success');
            fetchRequests();
        } catch (e) {
            console.error(e);
            showToast(e.message || 'Approve failed', 'error');
        }
    };

    const handleReject = async (id) => {
        try {
            await rejectLostRequest(id, feedback);
            // After rejecting, delete the request
            await deleteLostRequest(id);
            showToast('Request rejected and removed', 'success');
            setRejectingId(null);
            setFeedback('');
            fetchRequests();
        } catch (e) {
            console.error(e);
            showToast(e.message || 'Reject failed', 'error');
        }
    };

    // Sort items and requests with shared options
    const sortList = React.useCallback((list) => {
        const sorted = [...list];
        switch (sortBy) {
            case 'date-newest':
                return sorted.sort((a, b) => new Date(b.dateLost || 0) - new Date(a.dateLost || 0));
            case 'date-oldest':
                return sorted.sort((a, b) => new Date(a.dateLost || 0) - new Date(b.dateLost || 0));
            case 'name-asc':
                return sorted.sort((a, b) => (a.itemName || '').toLowerCase().localeCompare((b.itemName || '').toLowerCase()));
            case 'name-desc':
                return sorted.sort((a, b) => (b.itemName || '').toLowerCase().localeCompare((a.itemName || '').toLowerCase()));
            case 'location-asc':
                return sorted.sort((a, b) => (a.locationLost || '').toLowerCase().localeCompare((b.locationLost || '').toLowerCase()));
            case 'location-desc':
                return sorted.sort((a, b) => (b.locationLost || '').toLowerCase().localeCompare((a.locationLost || '').toLowerCase()));
            default:
                return sorted;
        }
    }, [sortBy]);

    const sortedItems = React.useMemo(() => sortList(items), [items, sortList]);
    const sortedRequests = React.useMemo(() => sortList(requests), [requests, sortList]);

    const openLightbox = (src) => { setLightboxSrc(src); setLightboxOpen(true); };
    const closeLightbox = () => { setLightboxOpen(false); setLightboxSrc(null); };

    // Item action handlers
    const openConfirm = (action, item) => setConfirmModal({ open: true, action, item });
    const closeConfirm = () => setConfirmModal({ open: false, action: null, item: null });
    
    const performAction = async () => {
        const { action, item } = confirmModal;
        try {
            if (!item || !action) return;
            if (action === 'resolve') await resolveLostItem(item.id);
            else if (action === 'unresolve') await unresolveLostItem(item.id);
            else if (action === 'archive') await archiveLostItem(item.id);
            else if (action === 'unarchive') await unarchiveLostItem(item.id);
            await fetchItems();
            showToast(`Item ${action}d successfully`, 'success');
        } catch (e) {
            console.error('Action failed', e);
            showToast('Failed to update item. Please try again.', 'error');
        } finally {
            closeConfirm();
        }
    };

    const handleDeleteItem = async (itemId) => {
        try {
            await deleteLostItem(itemId);
            showToast('Lost item deleted permanently', 'success');
            fetchItems();
        } catch (e) {
            console.error('Delete failed', e);
            showToast('Failed to delete item. Please try again.', 'error');
        }
    };

    const confirmDeleteItem = async () => {
        if (!deleteModal) return;
        await handleDeleteItem(deleteModal.id);
        setDeleteModal(null);
    };

    const handleDeleteAllArchived = async () => {
        try {
            setBulkDeleteLoading(true);
            const result = await deleteAllArchivedLostItems();
            const deletedCount = result?.deleted_count ?? 0;
            showToast(`Deleted ${deletedCount} archived item(s)`, 'success');
            fetchItems();
        } catch (e) {
            console.error('Bulk delete failed', e);
            showToast('Failed to delete archived items. Please try again.', 'error');
        } finally {
            setBulkDeleteLoading(false);
        }
    };

    // Count pending requests for badge
    const pendingCount = requests.filter(r => r.status === 'pending').length;

    return (
        <div className="user-management-container">
            <div className="page-header">
                <div className="page-header-content">
                    <h1>Lost Items Management</h1>
                    <p className="admin-subtitle">Review requests and manage published lost items</p>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="tab-navigation" style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid #e0e0e0' }}>
                <button
                    className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
                    onClick={() => setActiveTab('requests')}
                    style={{
                        padding: '12px 24px',
                        border: 'none',
                        background: activeTab === 'requests' ? 'var(--primary-color)' : 'transparent',
                        color: activeTab === 'requests' ? 'white' : '#666',
                        fontWeight: 600,
                        cursor: 'pointer',
                        borderRadius: '8px 8px 0 0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        transition: 'all 0.2s'
                    }}
                >
                    <i className="fas fa-clipboard-list"></i>
                    Pending Requests
                    {statusFilter === 'pending' && pendingCount > 0 && (
                        <span style={{
                            background: activeTab === 'requests' ? 'white' : 'var(--primary-color)',
                            color: activeTab === 'requests' ? 'var(--primary-color)' : 'white',
                            borderRadius: '50%',
                            width: 22,
                            height: 22,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 12,
                            fontWeight: 700
                        }}>
                            {pendingCount}
                        </span>
                    )}
                </button>
                <button
                    className={`tab-btn ${activeTab === 'items' ? 'active' : ''}`}
                    onClick={() => setActiveTab('items')}
                    style={{
                        padding: '12px 24px',
                        border: 'none',
                        background: activeTab === 'items' ? 'var(--primary-color)' : 'transparent',
                        color: activeTab === 'items' ? 'white' : '#666',
                        fontWeight: 600,
                        cursor: 'pointer',
                        borderRadius: '8px 8px 0 0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        transition: 'all 0.2s'
                    }}
                >
                    <i className="fas fa-search"></i>
                    Approved Lost Items
                </button>
            </div>

            {/* Requests Tab Content */}
            {activeTab === 'requests' && (
                <>
                    <div className="action-buttons" style={{ marginBottom: 15, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="lost-items-sort-select"
                        >
                            <option value="date-newest">Date Lost (Newest First)</option>
                            <option value="date-oldest">Date Lost (Oldest First)</option>
                            <option value="name-asc">Item Name (A-Z)</option>
                            <option value="name-desc">Item Name (Z-A)</option>
                            <option value="location-asc">Location (A-Z)</option>
                            <option value="location-desc">Location (Z-A)</option>
                        </select>
                        <button className="refresh-btn" onClick={fetchRequests}>
                            <i className="fas fa-sync-alt"></i> Refresh
                        </button>
                    </div>

                    <div className="users-table-container">
                        {requestsLoading ? (
                            <div className="loading-message">
                                <i className="fas fa-spinner fa-pulse"></i>
                                <p>Loading requests...</p>
                            </div>
                        ) : requests.length === 0 ? (
                            <div className="no-results">
                                <i className="fas fa-clipboard-check"></i>
                                <h3>No requests found</h3>
                                <p>Try adjusting the filter</p>
                            </div>
                        ) : (
                            <div className="mobile-table-wrapper">
                                <table className="users-table">
                                    <thead>
                                        <tr>
                                            <th>Item</th>
                                            <th>Date Lost</th>
                                            <th>Location</th>
                                            <th>Description</th>
                                            <th>Role</th>
                                            <th>Requester</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedRequests.map((r) => {
                                            const mediaList = Array.isArray(r.mediaUrls) ? r.mediaUrls : [];
                                            const primaryMedia = r.imageUrl || mediaList[0] || null;
                                            return (
                                            <tr key={r.id}>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                                        <div style={{ width: 64, height: 64, borderRadius: 6, overflow: 'hidden', border: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa' }}>
                                                            {primaryMedia ? (
                                                                String(primaryMedia).startsWith('data:video') || String(primaryMedia).toLowerCase().includes('.mp4') ? (
                                                                    <video
                                                                        src={primaryMedia}
                                                                        style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                                                                        onClick={() => openLightbox(primaryMedia)}
                                                                    />
                                                                ) : (
                                                                    <img
                                                                        src={primaryMedia}
                                                                        alt={r.itemName}
                                                                        loading="lazy"
                                                                        style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                                                                        onClick={() => openLightbox(primaryMedia)}
                                                                    />
                                                                )
                                                            ) : (
                                                                <i className="fas fa-image" style={{ color: '#bbb' }}></i>
                                                            )}
                                                        </div>
                                                        <div
                                                            className="user-name"
                                                            style={{
                                                                wordBreak: 'break-word',
                                                                overflowWrap: 'anywhere',
                                                                maxWidth: 260
                                                            }}
                                                        >
                                                            {r.itemName}
                                                        </div>
                                                        {mediaList.length > 1 && (
                                                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', maxWidth: 360 }}>
                                                                {mediaList.map((m, idx) => (
                                                                    <div key={idx} style={{ width: 40, height: 40, borderRadius: 6, overflow: 'hidden', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                        {String(m).startsWith('data:video') || String(m).toLowerCase().includes('.mp4') ? (
                                                                            <i
                                                                                className="fas fa-file-video"
                                                                                style={{ fontSize: 14, color: '#555', cursor: 'pointer' }}
                                                                                onClick={() => openLightbox(m)}
                                                                            ></i>
                                                                        ) : (
                                                                            <img
                                                                                src={m}
                                                                                alt={`media-${idx}`}
                                                                                loading="lazy"
                                                                                style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                                                                                onClick={() => openLightbox(m)}
                                                                            />
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td><span className="date-badge"><i className="fas fa-calendar"></i> {r.dateLost}</span></td>
                                                <td>
                                                    <span
                                                        className="location-badge-lost"
                                                        style={{
                                                            wordBreak: 'break-word',
                                                            overflowWrap: 'anywhere',
                                                            display: 'inline-block',
                                                            maxWidth: 220
                                                        }}
                                                    >
                                                        <i className="fas fa-map-marker-alt"></i> {r.locationLost}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div style={{ width: 300, whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                                                        {r.description || 'No description provided.'}
                                                    </div>
                                                </td>
                                                <td>
                                                    {(() => {
                                                        const role = r.requesterRole || 'student';
                                                        const displayRole = role === 'official' ? 'personnel' : role;
                                                        const roleLabel = displayRole.charAt(0).toUpperCase() + displayRole.slice(1);
                                                        return <span className={`role-badge ${displayRole}`}>{roleLabel}</span>;
                                                    })()}
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                        <span
                                                            className="user-name"
                                                            style={{
                                                                fontWeight: 600,
                                                                wordBreak: 'break-word',
                                                                overflowWrap: 'anywhere',
                                                                maxWidth: 220
                                                            }}
                                                        >
                                                            {r.requesterName || 'N/A'}
                                                        </span>
                                                        <span
                                                            style={{
                                                                color: '#666',
                                                                fontSize: 12,
                                                                wordBreak: 'break-word',
                                                                overflowWrap: 'anywhere',
                                                                maxWidth: 220
                                                            }}
                                                        >
                                                            {r.requesterEmail || 'N/A'}
                                                        </span>
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
                                                        <span style={{ color: '#666', fontSize: 12 }}>—</span>
                                                    )}
                                                </td>
                                            </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Items Tab Content */}
            {activeTab === 'items' && (
                <>
                    <div className="action-buttons" style={{ marginBottom: 15, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="lost-items-sort-select"
                        >
                            <option value="date-newest">Date Lost (Newest First)</option>
                            <option value="date-oldest">Date Lost (Oldest First)</option>
                            <option value="name-asc">Item Name (A-Z)</option>
                            <option value="name-desc">Item Name (Z-A)</option>
                            <option value="location-asc">Location (A-Z)</option>
                            <option value="location-desc">Location (Z-A)</option>
                        </select>
                        <button className="refresh-btn" onClick={fetchItems}>
                            <i className="fas fa-sync-alt"></i> Refresh
                        </button>
                        {items.some(it => (it.status || '').toLowerCase() === 'archived') && (
                            <button 
                                className="export-btn" 
                                onClick={handleDeleteAllArchived} 
                                disabled={bulkDeleteLoading}
                            >
                                <i className="fas fa-trash-alt"></i> {bulkDeleteLoading ? 'Deleting...' : 'Delete All Archived'}
                            </button>
                        )}
                    </div>

                    {itemsLoading ? (
                        <div className="loading-message">
                            <i className="fas fa-spinner fa-pulse"></i>
                            <p>Loading lost items...</p>
                        </div>
                    ) : error ? (
                        <div className="error-message">
                            <i className="fas fa-exclamation-circle"></i>
                            <p>{error}</p>
                        </div>
                    ) : items.length === 0 ? (
                        <div className="no-results">
                            <i className="fas fa-search"></i>
                            <h3>No published lost items</h3>
                            <p>Approved requests will appear here</p>
                        </div>
                    ) : (
                        <div className="forum-list">
                            {sortedItems.map((it) => {
                                const role = (it.requesterRole || it.postedByRole || it.role || 'student');
                                // Map 'official' role to 'personnel' for display
                                const displayRole = role === 'official' ? 'personnel' : role;
                                const roleLabel = displayRole.charAt(0).toUpperCase() + displayRole.slice(1);
                                const status = (it.status || 'approved');
                                const isResolved = status === 'resolved';
                                const isArchived = status === 'archived';
                                const mediaList = Array.isArray(it.mediaUrls) ? it.mediaUrls : [];
                                const primaryMedia = it.imageUrl || mediaList[0] || null;
                                return (
                                    <div
                                        key={it.id}
                                        className={`forum-thread ${isResolved ? 'item-resolved' : ''} ${isArchived ? 'item-archived' : ''}`}
                                    >
                                        <div className="thread-row">
                                            <div className="thread-thumb">
                                                {primaryMedia ? (
                                                    <img src={primaryMedia} alt={it.itemName} loading="lazy" decoding="async" style={{ cursor: 'pointer' }} onClick={() => openLightbox(primaryMedia)} />
                                                ) : (
                                                    <div className="thread-thumb-placeholder">
                                                        <i className="fas fa-image"></i>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="thread-content">
                                                <div className="thread-title-row" style={{ flexWrap: 'wrap', gap: 8 }}>
                                                    <h3 style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{it.itemName}</h3>
                                                    <span className={`thread-role-badge ${displayRole}`}>{roleLabel}</span>
                                                    {isResolved && (
                                                        <span className="lost-item-status-badge resolved">
                                                            <i className="fas fa-check-circle"></i> Found
                                                        </span>
                                                    )}
                                                    {isArchived && (
                                                        <span className="lost-item-status-badge archived">
                                                            <i className="fas fa-archive"></i> Archived
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="thread-meta" style={{ flexWrap: 'wrap', gap: 8 }}>
                                                    <span className="date-badge"><i className="fas fa-calendar"></i> {it.dateLost || 'Date unknown'}</span>
                                                    <span
                                                        className="location-badge-lost"
                                                        style={{ wordBreak: 'break-word', overflowWrap: 'anywhere', display: 'inline-flex', maxWidth: '100%' }}
                                                    >
                                                        <i className="fas fa-map-marker-alt"></i> {it.locationLost || 'Location unknown'}
                                                    </span>
                                                </div>
                                                <div
                                                    className="thread-description"
                                                    style={{ wordBreak: 'break-word', overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }}
                                                >
                                                    {it.description || 'No description provided.'}
                                                </div>
                                                {mediaList.length > 1 && (
                                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                                                        {mediaList.map((m, idx) => (
                                                            <div
                                                                key={idx}
                                                                style={{ width: 72, height: 72, borderRadius: 8, overflow: 'hidden', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                                                onClick={() => openLightbox(m)}
                                                            >
                                                                <img src={m} alt={`media-${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                <div className="thread-footer thread-credentials" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                                        <div className="credential-badge">
                                                            <i className="fas fa-user"></i> {it.requesterName || 'N/A'}
                                                        </div>
                                                        <a className="credential-email" href={it.requesterEmail ? `mailto:${it.requesterEmail}` : undefined} onClick={(e) => { if (!it.requesterEmail) e.preventDefault(); }}>
                                                            <i className="fas fa-envelope"></i> {it.requesterEmail || 'N/A'}
                                                        </a>
                                                    </div>
                                                    <div className="item-actions">
                                                        {status === 'resolved' ? (
                                                            <button className="item-action-btn" title="Unresolve" onClick={() => openConfirm('unresolve', it)}>
                                                                <i className="fas fa-undo"></i>
                                                            </button>
                                                        ) : (
                                                            <button className="item-action-btn" title="Mark as Found" onClick={() => openConfirm('resolve', it)}>
                                                                <i className="fas fa-check"></i>
                                                            </button>
                                                        )}
                                                        {status === 'archived' ? (
                                                            <button className="item-action-btn" title="Unarchive" onClick={() => openConfirm('unarchive', it)}>
                                                                <i className="fas fa-box-open"></i>
                                                            </button>
                                                        ) : (
                                                            <button className="item-action-btn" title="Archive" onClick={() => openConfirm('archive', it)}>
                                                                <i className="fas fa-archive"></i>
                                                            </button>
                                                        )}
                                                        <button 
                                                            className="item-action-btn" 
                                                            title="Delete" 
                                                            onClick={() => setDeleteModal(it)}
                                                            style={{ color: '#e74c3c' }}
                                                        >
                                                            <i className="fas fa-trash-alt"></i>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {/* Reject Modal */}
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

            {/* Confirm Action Modal */}
            {confirmModal.open && (
                <div className="confirm-modal-overlay" onClick={closeConfirm}>
                    <div className="confirm-modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="confirm-modal-header">
                            <div className={`confirm-modal-icon ${confirmModal.action === 'archive' || confirmModal.action === 'unarchive' ? 'confirm-modal-icon-info' : 'confirm-modal-icon-warning'}`}>
                                <i className={confirmModal.action === 'archive' || confirmModal.action === 'unarchive' ? 'fas fa-archive' : 'fas fa-exclamation'}></i>
                            </div>
                            <h3 className="confirm-modal-title">
                                {confirmModal.action === 'resolve' && 'Mark as Found?'}
                                {confirmModal.action === 'unresolve' && 'Unresolve Item?'}
                                {confirmModal.action === 'archive' && 'Archive Item?'}
                                {confirmModal.action === 'unarchive' && 'Unarchive Item?'}
                            </h3>
                        </div>
                        <div className="confirm-modal-message">
                            Are you sure you want to {confirmModal.action} "{confirmModal.item?.itemName}"?
                        </div>
                        <div className="confirm-modal-actions">
                            <button className="confirm-modal-cancel-btn" onClick={closeConfirm}>Cancel</button>
                            <button className={`confirm-modal-confirm-btn ${confirmModal.action === 'archive' ? 'confirm-modal-confirm-btn-info' : 'confirm-modal-confirm-btn-warning'}`} onClick={performAction}>
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {lightboxOpen && lightboxSrc && (
                <div
                    className="lightbox-overlay"
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.75)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 2000,
                        padding: '20px'
                    }}
                    onClick={closeLightbox}
                >
                    <div
                        style={{
                            maxWidth: '90vw',
                            maxHeight: '90vh',
                            background: '#000',
                            borderRadius: 8,
                            overflow: 'hidden',
                            position: 'relative'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={closeLightbox}
                            style={{
                                position: 'absolute',
                                top: 8,
                                right: 8,
                                background: 'rgba(0,0,0,0.6)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '50%',
                                width: 32,
                                height: 32,
                                cursor: 'pointer'
                            }}
                        >
                            ×
                        </button>
                        <img
                            src={lightboxSrc}
                            alt="media-full"
                            style={{ width: '100%', height: '100%', objectFit: 'contain', maxHeight: '90vh' }}
                        />
                    </div>
                </div>
            )}

            {deleteModal && (
                <div className="confirm-modal-overlay" onClick={() => setDeleteModal(null)}>
                    <div className="confirm-modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="confirm-modal-header">
                            <div className="confirm-modal-icon confirm-modal-icon-warning">
                                <i className="fas fa-exclamation"></i>
                            </div>
                            <h3 className="confirm-modal-title">Delete Published Item?</h3>
                        </div>
                        <div className="confirm-modal-message">
                            Are you sure you want to delete "{deleteModal.itemName}"? This cannot be undone.
                        </div>
                        <div className="confirm-modal-actions">
                            <button className="confirm-modal-cancel-btn" onClick={() => setDeleteModal(null)}>Cancel</button>
                            <button className="confirm-modal-confirm-btn confirm-modal-confirm-btn-warning" onClick={confirmDeleteItem}>
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Toast message={toast.message} show={toast.show} onClose={hideToast} type={toast.type} />
        </div>
    );
};

export default AdminLostItems;
