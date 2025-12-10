import React, { useEffect, useState, useCallback } from 'react';
import { getLostItemsPublic, resolveLostItem, unresolveLostItem, archiveLostItem, unarchiveLostItem } from '../../admin-firebase';

const AdminLostItems = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [sortBy, setSortBy] = useState('date-newest');
    const [confirmModal, setConfirmModal] = useState({ open: false, action: null, item: null });

    const fetchItems = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            const data = await getLostItemsPublic();
            setItems(data || []);
        } catch (e) {
            console.error(e);
            setError('Failed to load lost items');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchItems(); }, [fetchItems]);

    // Sort items based on selected sort option
    const sortedItems = React.useMemo(() => {
        const sorted = [...items];
        switch (sortBy) {
            case 'date-newest':
                return sorted.sort((a, b) => {
                    const dateA = new Date(a.dateLost || 0);
                    const dateB = new Date(b.dateLost || 0);
                    return dateB - dateA;
                });
            case 'date-oldest':
                return sorted.sort((a, b) => {
                    const dateA = new Date(a.dateLost || 0);
                    const dateB = new Date(b.dateLost || 0);
                    return dateA - dateB;
                });
            case 'name-asc':
                return sorted.sort((a, b) => {
                    const nameA = (a.itemName || '').toLowerCase();
                    const nameB = (b.itemName || '').toLowerCase();
                    return nameA.localeCompare(nameB);
                });
            case 'name-desc':
                return sorted.sort((a, b) => {
                    const nameA = (a.itemName || '').toLowerCase();
                    const nameB = (b.itemName || '').toLowerCase();
                    return nameB.localeCompare(nameA);
                });
            case 'location-asc':
                return sorted.sort((a, b) => {
                    const locA = (a.locationLost || '').toLowerCase();
                    const locB = (b.locationLost || '').toLowerCase();
                    return locA.localeCompare(locB);
                });
            case 'location-desc':
                return sorted.sort((a, b) => {
                    const locA = (a.locationLost || '').toLowerCase();
                    const locB = (b.locationLost || '').toLowerCase();
                    return locB.localeCompare(locA);
                });
            case 'role-asc':
                return sorted.sort((a, b) => {
                    const roleA = (a.postedByRole || 'student').toLowerCase();
                    const roleB = (b.postedByRole || 'student').toLowerCase();
                    return roleA.localeCompare(roleB);
                });
            case 'role-desc':
                return sorted.sort((a, b) => {
                    const roleA = (a.postedByRole || 'student').toLowerCase();
                    const roleB = (b.postedByRole || 'student').toLowerCase();
                    return roleB.localeCompare(roleA);
                });
            case 'requester-asc':
                return sorted.sort((a, b) => {
                    const nameA = (a.requesterName || '').toLowerCase();
                    const nameB = (b.requesterName || '').toLowerCase();
                    return nameA.localeCompare(nameB);
                });
            case 'requester-desc':
                return sorted.sort((a, b) => {
                    const nameA = (a.requesterName || '').toLowerCase();
                    const nameB = (b.requesterName || '').toLowerCase();
                    return nameB.localeCompare(nameA);
                });
            default:
                return sorted;
        }
    }, [items, sortBy]);

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
        } catch (e) {
            console.error('Action failed', e);
            alert('Failed to update item. Please try again.');
        } finally {
            closeConfirm();
        }
    };

    return (
        <div className="browse-items-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                    <h1>Lost Items</h1>
                    <p className="subtitle">Approved lost requests (admin view shows requester)</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {!loading && items.length > 0 && (
                        <>
                            <select
                                id="sort-lost-items-admin"
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
                                <option value="role-asc">Posted By (Student → Staff)</option>
                                <option value="role-desc">Posted By (Staff → Student)</option>
                                <option value="requester-asc">Requester Name (A-Z)</option>
                                <option value="requester-desc">Requester Name (Z-A)</option>
                            </select>
                        </>
                    )}
                    <button className="refresh-btn" onClick={fetchItems}><i className="fas fa-sync-alt"></i> Refresh</button>
                </div>
            </div>
            {loading ? (
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
                    <h3>No lost items found</h3>
                    <p>Try refreshing the list</p>
                </div>
            ) : (
                <div className="forum-list">
                    {sortedItems.map((it) => {
                        const role = (it.postedByRole || 'student');
                        const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
                        const status = (it.status || 'approved');
                        const isResolved = status === 'resolved';
                        const isArchived = status === 'archived';
                        return (
                            <div
                                key={it.id}
                                className={`forum-thread ${isResolved ? 'item-resolved' : ''} ${isArchived ? 'item-archived' : ''}`}
                            >
                                <div className="thread-row">
                                    <div className="thread-thumb">
                                        {it.imageUrl ? (
                                            <img
                                                src={it.imageUrl}
                                                alt={it.itemName}
                                            />
                                        ) : (
                                            <div className="thread-thumb-placeholder">
                                                <i className="fas fa-image"></i>
                                            </div>
                                        )}
                                    </div>
                                    <div className="thread-content">
                                        <div className="thread-title-row">
                                            <h3>{it.itemName}</h3>
                                            <span className="thread-role-badge">
                                                {roleLabel}
                                            </span>
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
                                        <div className="thread-meta">
                                            <span className="date-badge"><i className="fas fa-calendar"></i> {it.dateLost || 'Date unknown'}</span>
                                            <span className="location-badge-lost"><i className="fas fa-map-marker-alt"></i> {it.locationLost || 'Location unknown'}</span>
                                        </div>
                                        <div className="thread-description">
                                            {it.description || 'No description provided.'}
                                        </div>
                                        <div className="thread-footer thread-credentials" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                                <div className="credential-badge">
                                                    <i className="fas fa-user"></i> {it.requesterName || 'Requester: N/A'}
                                                </div>
                                                <a
                                                    className="credential-email"
                                                    href={it.requesterEmail ? `mailto:${it.requesterEmail}` : undefined}
                                                    onClick={(e) => { if (!it.requesterEmail) e.preventDefault(); }}
                                                >
                                                    <i className="fas fa-envelope"></i> {it.requesterEmail || 'N/A'}
                                                </a>
                                            </div>
                                            <div className="item-actions">
                                                {(() => { const status = (it.status || 'approved'); return (
                                                    <>
                                                        {status === 'resolved' ? (
                                                            <button className="item-action-btn" title="Unresolve" onClick={() => openConfirm('unresolve', it)}>
                                                                <i className="fas fa-undo"></i>
                                                            </button>
                                                        ) : (
                                                            <button className="item-action-btn" title="Mark Resolved" onClick={() => openConfirm('resolve', it)}>
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
                                                    </>
                                                ); })()}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {confirmModal.open && (
                <div className="confirm-modal-overlay" onClick={closeConfirm}>
                    <div className="confirm-modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="confirm-modal-header">
                            <div className={`confirm-modal-icon ${confirmModal.action === 'archive' || confirmModal.action === 'unarchive' ? 'confirm-modal-icon-info' : 'confirm-modal-icon-warning'}`}>
                                <i className={confirmModal.action === 'archive' || confirmModal.action === 'unarchive' ? 'fas fa-archive' : 'fas fa-exclamation'}></i>
                            </div>
                            <h3 className="confirm-modal-title">
                                {confirmModal.action === 'resolve' && 'Mark as Resolved?'}
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
        </div>
    );
};

export default AdminLostItems;


