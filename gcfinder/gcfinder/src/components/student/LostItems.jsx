import React, { useEffect, useState, useCallback } from 'react';
import { getLostItemsPublic } from '../../admin-firebase';
import messageService from '../../services/messageService';

const LostItems = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [sortBy, setSortBy] = useState('date-newest');

    // Resolve current user's email for ownership checks (supports students and faculty)
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const currentEmail = (userData && (userData.email || (userData.student_id ? `${userData.student_id}@gordoncollege.edu.ph` : ''))) || '';

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
            default:
                return sorted;
        }
    }, [items, sortBy]);

    const handleContactAdmin = async (lostItem) => {
        try {
            // Client-side guard: prevent contacting DO if this is the requester's own post
            const ownerByFlag = lostItem?.isOwner === true;
            const ownerByEmail = !!(lostItem?.requesterEmail && currentEmail) &&
                String(lostItem.requesterEmail).toLowerCase() === String(currentEmail).toLowerCase();
            if (ownerByFlag || ownerByEmail) {
                alert('This is your own lost request.');
                return;
            }

            const userData = JSON.parse(localStorage.getItem('userData')) || {};
            const studentId = userData.id || userData.student_id;
            const displayName = userData.full_name || userData.displayName || 'Student';
            if (!studentId) {
                alert('Unable to start conversation. Please re-login.');
                return;
            }
            const conversationId = await messageService.getOrCreateConversation([studentId], false);
            const text = `I think I found a lost item: ${lostItem.itemName}. Please assist.`;
            await messageService.sendMessage(
                conversationId, 
                studentId, 
                displayName, 
                text, 
                false, 
                null, 
                lostItem.id || lostItem.sourceRequestId, 
                lostItem.imageUrl, 
                lostItem.itemName
            );
            window.location.href = '/messages';
        } catch (e) {
            console.error('Failed to contact admin:', e);
            alert('Failed to contact the Disciplinary Office. Please try again later.');
        }
    };

    return (
        <div className="browse-items-section">
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: 20,
                    flexWrap: 'wrap'
                }}
            >
                <div style={{ minWidth: 0 }}>
                    <h1>Lost Items</h1>
                    <p className="subtitle">Approved lost requests posted by students and staff.</p>
                </div>
                {!loading && items.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <select
                            id="sort-lost-items"
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="lost-items-sort-select"
                            style={{ minWidth: 200 }}
                        >
                            <option value="date-newest">Date Lost (Newest First)</option>
                            <option value="date-oldest">Date Lost (Oldest First)</option>
                            <option value="name-asc">Item Name (A-Z)</option>
                            <option value="name-desc">Item Name (Z-A)</option>
                            <option value="location-asc">Location (A-Z)</option>
                            <option value="location-desc">Location (Z-A)</option>
                            <option value="role-asc">Posted By (Student → Staff)</option>
                            <option value="role-desc">Posted By (Staff → Student)</option>
                        </select>
                    </div>
                )}
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
                    <h3>No approved lost items yet</h3>
                    <p>Check back later</p>
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
                                                loading="lazy"
                                                decoding="async"
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
                                    </div>
                                </div>
                                {!isResolved && !isArchived && !(it?.isOwner === true) && !(it?.requesterEmail && currentEmail && String(it.requesterEmail).toLowerCase() === String(currentEmail).toLowerCase()) && (
                                    <div className="thread-actions">
                                        <span className="thread-actions-prompt">Think you found this?</span>
                                        <div className="thread-actions-btn-wrapper">
                                            <button className="claim" onClick={() => handleContactAdmin(it)}>
                                                <i className="fas fa-phone"></i> Contact the Disciplinary Office
                                            </button>
                                        </div>
                                    </div>
                                )}
                                {isResolved && (
                                    <div className="thread-actions" style={{ justifyContent: 'center' }}>
                                        <span className="thread-actions-prompt" style={{ color: '#28a745' }}>
                                            <i className="fas fa-check-circle"></i> This item has been found and returned to the owner!
                                        </span>
                                    </div>
                                )}
                                {isArchived && (
                                    <div className="thread-actions" style={{ justifyContent: 'center' }}>
                                        <span className="thread-actions-prompt" style={{ color: '#6c757d' }}>
                                            <i className="fas fa-archive"></i> This lost item report has been archived.
                                        </span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default LostItems;


