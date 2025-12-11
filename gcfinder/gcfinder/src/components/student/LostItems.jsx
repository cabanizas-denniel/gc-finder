import React, { useEffect, useState, useCallback } from 'react';
import { getLostItemsPublic } from '../../admin-firebase';
import messageService from '../../services/messageService';

const LostItems = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [sortBy, setSortBy] = useState('date-newest');
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxSrc, setLightboxSrc] = useState(null);
    const [contacting, setContacting] = useState(false);
    const CONTACT_COOLDOWN_MS = 3000;
    const [lastContactAt, setLastContactAt] = useState(0);

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

    const openLightbox = (src) => { setLightboxSrc(src); setLightboxOpen(true); };
    const closeLightbox = () => { setLightboxOpen(false); setLightboxSrc(null); };

    const handleContactAdmin = async (lostItem) => {
        try {
            if (contacting) return;
            const now = Date.now();
            if (now - lastContactAt < CONTACT_COOLDOWN_MS) return;

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
            setContacting(true);
            setLastContactAt(now);
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
        } finally {
            setContacting(false);
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
                        // Map 'official' role to 'personnel' for display
                        const displayRole = role === 'official' ? 'personnel' : role;
                        const roleLabel = displayRole.charAt(0).toUpperCase() + displayRole.slice(1);
                        const status = (it.status || 'approved');
                        const isResolved = status === 'resolved';
                        const isArchived = status === 'archived';
                        const mediaList = it.mediaUrls && Array.isArray(it.mediaUrls) ? it.mediaUrls : [];
                        const primaryMedia = it.imageUrl || mediaList[0] || null;
                        return (
                            <div
                                key={it.id}
                                className={`forum-thread ${isResolved ? 'item-resolved' : ''} ${isArchived ? 'item-archived' : ''}`}
                            >
                                <div className="thread-row">
                                    <div className="thread-thumb">
                                        {primaryMedia ? (
                                            <img
                                                src={primaryMedia}
                                                alt={it.itemName}
                                                loading="lazy"
                                                decoding="async"
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => openLightbox(primaryMedia)}
                                            />
                                        ) : (
                                            <div className="thread-thumb-placeholder">
                                                <i className="fas fa-image"></i>
                                            </div>
                                        )}
                                    </div>
                                    <div className="thread-content" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                                        <div className="thread-title-row" style={{ flexWrap: 'wrap', gap: 8 }}>
                                            <h3 style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{it.itemName}</h3>
                                            <span className={`thread-role-badge ${displayRole}`}>
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
                                        <div className="thread-meta" style={{ flexWrap: 'wrap', gap: 8 }}>
                                            <span className="date-badge"><i className="fas fa-calendar"></i> {it.dateLost || 'Date unknown'}</span>
                                            <span
                                                className="location-badge-lost"
                                                style={{ wordBreak: 'break-word', overflowWrap: 'anywhere', display: 'inline-flex', maxWidth: '100%' }}
                                            >
                                                <i className="fas fa-map-marker-alt"></i> {it.locationLost || 'Location unknown'}
                                            </span>
                                        </div>
                                        <div className="thread-description" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
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
                                    </div>
                                </div>
                                {!isResolved && !isArchived && !(it?.isOwner === true) && !(it?.requesterEmail && currentEmail && String(it.requesterEmail).toLowerCase() === String(currentEmail).toLowerCase()) && (
                                    <div className="thread-actions">
                                        <span className="thread-actions-prompt">Think you found this?</span>
                                        <div className="thread-actions-btn-wrapper">
                                            <button className="claim" onClick={() => handleContactAdmin(it)} disabled={contacting}>
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
                    onClick={() => { setLightboxOpen(false); setLightboxSrc(null); }}
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
                            onClick={() => { setLightboxOpen(false); setLightboxSrc(null); }}
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
        </div>
    );
};

export default LostItems;


