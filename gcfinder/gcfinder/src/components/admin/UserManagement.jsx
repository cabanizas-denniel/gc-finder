import React, { useState, useEffect } from 'react';
import { getAllUsers, batchCreateStudents, updateUserStatus } from '../../admin-firebase';
import Toast, { useToast } from '../Toast';

const UserManagement = () => {
    const [activeTab, setActiveTab] = useState('active');
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [sortConfig, setSortConfig] = useState({
        key: null,
        direction: 'ascending'
    });
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10); // Users per page
    
    // Export Modal State
    const [exportModalOpen, setExportModalOpen] = useState(false);
    const [exportStartDate, setExportStartDate] = useState('');
    const [exportEndDate, setExportEndDate] = useState('');
    
    // Show Export Modal State
    const [showExportModal, setShowExportModal] = useState(false);

    // Flag/Ban Modal State
    const [flagModalOpen, setFlagModalOpen] = useState(false);
    const [banModalOpen, setBanModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [actionReason, setActionReason] = useState('');
    const [banDuration, setBanDuration] = useState('permanent'); // '1day', '3days', '7days', '1month', 'permanent'
    const [flagDuration, setFlagDuration] = useState('1day'); // '1day', '3days', '7days'

    // Batch Add Students Modal State
    const [batchAddModalOpen, setBatchAddModalOpen] = useState(false);
    const [studentData, setStudentData] = useState('');
    const [uploadFile, setUploadFile] = useState(null);
    const [uploadMode, setUploadMode] = useState('manual'); // 'manual' or 'file'
    const [isProcessing, setIsProcessing] = useState(false);

    // Toast notification
    const { toast, showToast, hideToast } = useToast();

    // Fetch users from Firestore
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                setLoading(true);
                const usersDataFromFirebase = await getAllUsers();

                // Mock data removed
                
                setUsers(usersDataFromFirebase);
            } catch (err) {
                console.error("Error fetching users:", err);
                setError("Failed to load users. Please try again later.");
            } finally {
                setLoading(false);
            }
        };
        
        fetchUsers();
    }, []);

    // Filter users based on active tab and search term, then paginate
    useEffect(() => {
        let processedUsers = users;

        // Filter by active tab first
        if (activeTab !== 'all') {
            processedUsers = users.filter(user => user.status === activeTab);
        }
        
        // Then, filter by search term
        if (searchTerm) {
            processedUsers = processedUsers.filter(user => 
                user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.email.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        
        // Apply pagination to the processed (tab-filtered and search-filtered) users
        const indexOfLastUser = currentPage * itemsPerPage;
        const indexOfFirstUser = indexOfLastUser - itemsPerPage;
        setFilteredUsers(processedUsers.slice(indexOfFirstUser, indexOfLastUser));

    }, [activeTab, searchTerm, users, currentPage, itemsPerPage]);

    // Effect to reset page when activeTab or searchTerm changes
    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, searchTerm]);

    // Sort users
    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
        
        const sortedUsers = [...filteredUsers].sort((a, b) => {
            if (a[key] < b[key]) {
                return sortConfig.direction === 'ascending' ? -1 : 1;
            }
            if (a[key] > b[key]) {
                return sortConfig.direction === 'ascending' ? 1 : -1;
            }
            return 0;
        });
        
        setFilteredUsers(sortedUsers);
    };

    // User actions

    const handleFlagUser = (user) => {
        setSelectedUser(user);
        setFlagModalOpen(true);
        setActionReason('');
        setFlagDuration('1day');
    };

    const handleBanUser = (user) => {
        setSelectedUser(user);
        setBanModalOpen(true);
        setActionReason('');
        setBanDuration('permanent');
    };

    const handleConfirmFlag = () => {
        const isCurrentlyFlagged = selectedUser.status === 'flagged';
        
        if (!isCurrentlyFlagged && !actionReason.trim()) {
            showToast('Please provide a reason for flagging this user', 'warning');
            return;
        }
        
        let flagExpiresAt = null;
        if (!isCurrentlyFlagged) {
            const now = new Date();
            switch (flagDuration) {
                case '1day':
                    flagExpiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
                    break;
                case '3days':
                    flagExpiresAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
                    break;
                case '7days':
                    flagExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                    break;
            }
        }
        
        // Toggle flag status
        setUsers(prevUsers => 
            prevUsers.map(user => 
                user.id === selectedUser.id 
                    ? { 
                        ...user, 
                        status: isCurrentlyFlagged ? 'active' : 'flagged',
                        flagReason: isCurrentlyFlagged ? undefined : actionReason,
                        flagDuration: isCurrentlyFlagged ? undefined : flagDuration,
                        flagExpiresAt: isCurrentlyFlagged ? undefined : flagExpiresAt
                    }
                    : user
            )
        );
        
        // Update user status in database
        const statusData = {
            status: isCurrentlyFlagged ? 'active' : 'flagged',
            ...(isCurrentlyFlagged ? {} : {
                flagReason: actionReason,
                flagDuration: flagDuration,
                flagExpiresAt: flagExpiresAt
            })
        };
        updateUserStatus(selectedUser.id, statusData).catch(error => {
            console.error('Failed to update database:', error);
            showToast('Failed to update database', 'error');
        });
        
        const getDurationText = (duration) => {
            switch (duration) {
                case '1day': return ' for 1 day';
                case '3days': return ' for 3 days';
                case '7days': return ' for 7 days';
                default: return '';
            }
        };
        
        const durationText = isCurrentlyFlagged ? '' : getDurationText(flagDuration);
        showToast(`${selectedUser.name} has been ${isCurrentlyFlagged ? 'unflagged' : `flagged${durationText}`}`, 'success');
        setFlagModalOpen(false);
        setSelectedUser(null);
        setActionReason('');
        setFlagDuration('1day');
    };

    const handleConfirmBan = () => {
        const isCurrentlyBanned = selectedUser.status === 'banned';
        
        if (!isCurrentlyBanned && !actionReason.trim()) {
            showToast('Please provide a reason for banning this user', 'warning');
            return;
        }
        
        let banExpiresAt = null;
        if (!isCurrentlyBanned && banDuration !== 'permanent') {
            const now = new Date();
            switch (banDuration) {
                case '1day':
                    banExpiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
                    break;
                case '3days':
                    banExpiresAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
                    break;
                case '7days':
                    banExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                    break;
                case '1month':
                    banExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
                    break;
                default:
                    banExpiresAt = null; // Permanent
            }
        }
        
        // Toggle ban status
        setUsers(prevUsers => 
            prevUsers.map(user => 
                user.id === selectedUser.id 
                    ? { 
                        ...user, 
                        status: isCurrentlyBanned ? 'active' : 'banned',
                        banReason: isCurrentlyBanned ? undefined : actionReason,
                        banDuration: isCurrentlyBanned ? undefined : banDuration,
                        banExpiresAt: isCurrentlyBanned ? undefined : banExpiresAt
                    }
                    : user
            )
        );
        
        // Update user status in database
        const statusData = {
            status: isCurrentlyBanned ? 'active' : 'banned',
            ...(isCurrentlyBanned ? {} : {
                banReason: actionReason,
                banDuration: banDuration,
                banExpiresAt: banExpiresAt
            })
        };
        updateUserStatus(selectedUser.id, statusData).catch(error => {
            console.error('Failed to update database:', error);
            showToast('Failed to update database', 'error');
        });
        
        const getDurationText = (duration) => {
            switch (duration) {
                case '1day': return ' for 1 day';
                case '3days': return ' for 3 days';
                case '7days': return ' for 7 days';
                case '1month': return ' for 1 month';
                case 'permanent': return ' permanently';
                default: return ' permanently';
            }
        };
        
        const durationText = isCurrentlyBanned ? '' : getDurationText(banDuration);
        showToast(`${selectedUser.name} has been ${isCurrentlyBanned ? 'unbanned' : `banned${durationText}`}`, 'success');
        setBanModalOpen(false);
        setSelectedUser(null);
        setActionReason('');
        setBanDuration('permanent');
    };

    const handleCancelAction = () => {
        setFlagModalOpen(false);
        setBanModalOpen(false);
        setDeleteModalOpen(false);
        setSelectedUser(null);
        setActionReason('');
        setBanDuration('permanent');
        setFlagDuration('1day');
    };

    const handleDeleteUser = (user) => {
        setSelectedUser(user);
        setDeleteModalOpen(true);
    };

    const handleConfirmDelete = () => {
        // Remove user and all their associated data from state
        setUsers(prevUsers => prevUsers.filter(u => u.id !== selectedUser.id));
        
        // TODO: Comprehensive deletion from database:
        // - Delete user account
        // - Delete all user's items
        // - Delete all user's claims  
        // - Delete all user's messages
        // - Delete any user-related notifications
        
        showToast(`${selectedUser.name} and all associated data has been deleted`, 'success');
        setDeleteModalOpen(false);
        setSelectedUser(null);
    };

    // Export Modal Handlers
    const handleOpenExportModal = () => {
        setExportModalOpen(true);
    };

    const handleCloseExportModal = () => {
        setExportModalOpen(false);
        setExportStartDate('');
        setExportEndDate('');
    };

    const handleTriggerExport = async (startDateOverride, endDateOverride) => {
        const finalStartDate = startDateOverride || exportStartDate;
        const finalEndDate = endDateOverride || exportEndDate;
    
        if (!finalStartDate || !finalEndDate) {
            showToast("Please select both a 'From' and 'To' date.", 'warning');
            return;
        }
        if (new Date(finalStartDate) > new Date(finalEndDate)) {
            showToast("'From' date cannot be after 'To' date.", 'error');
            return;
        }
    
        const apiUrl = process.env.REACT_APP_API_URL; // Get the API URL
        if (!apiUrl) {
            showToast("API URL is not configured. Please check environment settings.", 'error');
            console.error("REACT_APP_API_URL is not set");
            return;
        }
    
        try {
            const response = await fetch(`${apiUrl}/api/export?type=users&startDate=${finalStartDate}&endDate=${finalEndDate}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                }
            });
    
            if (!response.ok) {
                const errorData = await response.text();
                console.error('Export error response:', errorData);
                throw new Error('Export failed: ' + (errorData || response.statusText));
            }
    
            const contentType = response.headers.get('content-type');
             if (!contentType || !contentType.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')) {
                const errorText = await response.text();
                console.error("Unexpected response content type:", contentType, "Response body:", errorText);
                throw new Error('Invalid response format: Expected Excel file, but received ' + contentType);
            }
    
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = 'GCFinder_users_export.xlsx'; // Default filename
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                if (filenameMatch && filenameMatch[1]) {
                    filename = filenameMatch[1].replace(/['"]/g, '');
                }
            }
    
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            handleCloseExportModal();
    
        } catch (error) {
            console.error('Export error:', error);
            showToast('Failed to export user data: ' + error.message, 'error');
        }
    };

    const handleThisMonthExport = () => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
        setExportStartDate(firstDay);
        setExportEndDate(lastDay);
        handleTriggerExport(firstDay, lastDay);
    };

    const handleAllTimeExport = () => {
        const startDate = '2020-01-01'; // A nominal early date
        const endDate = new Date().toISOString().split('T')[0]; // Today
        setExportStartDate(startDate);
        setExportEndDate(endDate);
        handleTriggerExport(startDate, endDate);
    };

    // Batch Add Students Modal Handlers
    const handleOpenBatchAddModal = () => {
        setBatchAddModalOpen(true);
    };

    const handleCloseBatchAddModal = () => {
        setBatchAddModalOpen(false);
        setStudentData('');
        setUploadFile(null);
        setUploadMode('manual');
        setIsProcessing(false);
    };

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (file && (file.type === 'text/csv' || file.type === 'application/vnd.ms-excel' || file.name.endsWith('.csv'))) {
            setUploadFile(file);
            const reader = new FileReader();
            reader.onload = (e) => {
                setStudentData(e.target.result);
            };
            reader.readAsText(file);
        } else {
            showToast('Please upload a valid CSV file', 'error');
        }
    };

    const generateRandomPassword = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let password = '';
        for (let i = 0; i < 8; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    };

    const parseStudentData = (data) => {
        const lines = data.trim().split('\n');
        const students = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const parts = line.split(',');
            if (parts.length >= 3) {
                const studentId = parts[0].trim();
                const name = parts[1].trim();
                const email = parts[2].trim();
                const password = parts[3] ? parts[3].trim() : generateRandomPassword();
                const status = parts[4] ? parts[4].trim() : 'active';
                
                students.push({
                    id: Date.now() + i,
                    studentId,
                    name,
                    email,
                    password,
                    status,
                    createdAt: new Date().toISOString(),
                    role: 'student'
                });
            }
        }
        
        return students;
    };

    const handleBatchAddStudents = async () => {
        if (!studentData.trim()) {
            showToast('Please provide student data', 'warning');
            return;
        }

        try {
            setIsProcessing(true);
            const newStudents = parseStudentData(studentData);
            
            if (newStudents.length === 0) {
                showToast('No valid student data found. Please check the format.', 'error');
                return;
            }

            // Save students to database
            const createdStudents = await batchCreateStudents(newStudents);
            
            // Update local state with created students
            setUsers(prevUsers => [...prevUsers, ...createdStudents]);
            
            showToast(`Successfully added ${createdStudents.length} students to database`, 'success');
            handleCloseBatchAddModal();
            
        } catch (error) {
            console.error('Batch add error:', error);
            showToast('Failed to add students: ' + error.message, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const getTabCount = (status) => {
        return users.filter(user => user.status === status).length;
    };

    const renderStatusBadge = (status) => {
        switch (status) {
            case 'active':
                return <span className="user-status-badge active">Active</span>;
            case 'flagged':
                return <span className="user-status-badge flagged">Flagged</span>;
            case 'banned':
                return <span className="user-status-badge banned">Banned</span>;
            default:
                return null;
        }
    };

    return (
            <div className="user-management-container">
                <div className="page-header">
                    <div className="page-header-content">
                <h1>User Management</h1>
                <p className="admin-subtitle">View, flag, and manage user accounts in the GC Finder system</p>
                    </div>
                    <div className="action-buttons">
                        <button className="export-btn" onClick={handleOpenExportModal}>
                            <i className="fas fa-download"></i> Export Data
                        </button>
                        <button className="batch-add-btn" onClick={handleOpenBatchAddModal}>
                            <i className="fas fa-user-plus"></i> Batch Add Students
                        </button>
                        <button className="refresh-btn" onClick={() => window.location.reload()}>
                            <i className="fas fa-sync-alt"></i> Refresh
                        </button>
                    </div>
                </div>

                {/* Export Modal */}
                {exportModalOpen && (
                    <div className="export-modal-overlay">
                        <div className="export-modal-content">
                            <div className="export-modal-header">
                                <h2 className="export-modal-title">
                                    Export User Data
                                </h2>
                                <button onClick={handleCloseExportModal} className="export-modal-close-btn" aria-label="close">
                                    <i className="fas fa-times"></i>
                                </button>
                            </div>
                            <p className="export-modal-description">
                                Select the date range for the user data you want to export.
                            </p>
                            {/* Quick select buttons */}
                            <div className="export-modal-quick-select">
                                <button 
                                    onClick={handleThisMonthExport} 
                                    className="export-modal-quick-btn"
                                >
                                    This Month
                                </button>
                                <button 
                                    onClick={handleAllTimeExport}
                                    className="export-modal-quick-btn"
                                >
                                    All Time
                                </button>
                            </div>

                            {/* Date inputs with labels */}
                            <div className="export-modal-date-input-group">
                                <label htmlFor="exportStartDateModalUser">From Date:</label>
                                <input
                                    id="exportStartDateModalUser"
                                    type="date"
                                    value={exportStartDate}
                                    onChange={(e) => setExportStartDate(e.target.value)}
                                    className="export-modal-date-input"
                                />
                            </div>
                            <div className="export-modal-date-input-group">
                                <label htmlFor="exportEndDateModalUser">To Date:</label>
                                <input
                                    id="exportEndDateModalUser"
                                    type="date"
                                    value={exportEndDate}
                                    onChange={(e) => setExportEndDate(e.target.value)}
                                    className="export-modal-date-input"
                                />
                            </div>
                            <div className="export-modal-actions">
                                <button 
                                    onClick={handleCloseExportModal} 
                                    className="export-modal-cancel-btn"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={() => handleTriggerExport(exportStartDate, exportEndDate)} 
                                    className="export-modal-confirm-btn"
                                >
                                    Export
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Flag User Modal */}
                {flagModalOpen && selectedUser && (
                    <div className="export-modal-overlay">
                        <div className="export-modal-content">
                            <div className="export-modal-header">
                                <h2 className="export-modal-title">
                                    {selectedUser.status === 'flagged' ? 'Unflag User' : 'Flag User'}
                                </h2>
                                <button onClick={handleCancelAction} className="export-modal-close-btn" aria-label="close">
                                    <i className="fas fa-times"></i>
                                </button>
                            </div>
                            <p className="export-modal-description">
                                You are about to {selectedUser.status === 'flagged' ? 'unflag' : 'flag'} <strong>{selectedUser.name}</strong> ({selectedUser.email}).
                                {selectedUser.status === 'flagged' 
                                    ? ' This will restore their account to active status.' 
                                    : ' Please provide a reason for this action.'
                                }
                            </p>
                            {selectedUser.status !== 'flagged' && (
                                <>
                                    <div className="export-modal-date-input-group">
                                        <label htmlFor="flagDuration">Flag Duration:</label>
                                        <select
                                            id="flagDuration"
                                            value={flagDuration}
                                            onChange={(e) => setFlagDuration(e.target.value)}
                                            className="export-modal-date-input"
                                            style={{padding: '8px'}}
                                        >
                                            <option value="1day">1 Day</option>
                                            <option value="3days">3 Days</option>
                                            <option value="7days">7 Days</option>
                                        </select>
                                    </div>
                                    <div className="export-modal-date-input-group">
                                        <label htmlFor="flagReason">Reason for flagging:</label>
                                        <textarea
                                            id="flagReason"
                                            value={actionReason}
                                            onChange={(e) => setActionReason(e.target.value)}
                                            className="export-modal-date-input"
                                            placeholder="Enter the reason for flagging this user..."
                                            rows="4"
                                            style={{resize: 'vertical', fontFamily: 'inherit'}}
                                        />
                                    </div>
                                </>
                            )}
                            <div className="export-modal-actions">
                                <button 
                                    onClick={handleCancelAction} 
                                    className="export-modal-cancel-btn"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleConfirmFlag} 
                                    className="export-modal-confirm-btn"
                                    style={{backgroundColor: selectedUser.status === 'flagged' ? '#27ae60' : '#f39c12'}}
                                >
                                    {selectedUser.status === 'flagged' ? 'Unflag User' : 'Flag User'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Ban User Modal */}
                {banModalOpen && selectedUser && (
                    <div className="export-modal-overlay">
                        <div className="export-modal-content">
                            <div className="export-modal-header">
                                <h2 className="export-modal-title">
                                    {selectedUser.status === 'banned' ? 'Unban User' : 'Ban User'}
                                </h2>
                                <button onClick={handleCancelAction} className="export-modal-close-btn" aria-label="close">
                                    <i className="fas fa-times"></i>
                                </button>
                            </div>
                            <p className="export-modal-description">
                                You are about to {selectedUser.status === 'banned' ? 'unban' : 'ban'} <strong>{selectedUser.name}</strong> ({selectedUser.email}).
                                {selectedUser.status === 'banned' 
                                    ? ' This will restore their account to active status.' 
                                    : ' This will prevent them from accessing the system. Please provide a reason for this action.'
                                }
                            </p>
                            {selectedUser.status !== 'banned' && (
                                <>
                                    <div className="export-modal-date-input-group">
                                        <label htmlFor="banDuration">Ban Duration:</label>
                                        <select
                                            id="banDuration"
                                            value={banDuration}
                                            onChange={(e) => setBanDuration(e.target.value)}
                                            className="export-modal-date-input"
                                            style={{padding: '8px'}}
                                        >
                                            <option value="1day">1 Day</option>
                                            <option value="3days">3 Days</option>
                                            <option value="7days">7 Days</option>
                                            <option value="1month">1 Month</option>
                                            <option value="permanent">Permanent (Forever)</option>
                                        </select>
                                    </div>
                                    <div className="export-modal-date-input-group">
                                        <label htmlFor="banReason">Reason for banning:</label>
                                        <textarea
                                            id="banReason"
                                            value={actionReason}
                                            onChange={(e) => setActionReason(e.target.value)}
                                            className="export-modal-date-input"
                                            placeholder="Enter the reason for banning this user..."
                                            rows="4"
                                            style={{resize: 'vertical', fontFamily: 'inherit'}}
                                        />
                                    </div>
                                </>
                            )}
                            <div className="export-modal-actions">
                                <button 
                                    onClick={handleCancelAction} 
                                    className="export-modal-cancel-btn"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleConfirmBan} 
                                    className="export-modal-confirm-btn"
                                    style={{backgroundColor: selectedUser.status === 'banned' ? '#27ae60' : '#e74c3c'}}
                                >
                                    {selectedUser.status === 'banned' ? 'Unban User' : 'Ban User'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Delete User Modal */}
                {deleteModalOpen && selectedUser && (
                    <div className="export-modal-overlay">
                        <div className="export-modal-content">
                            <div className="export-modal-header">
                                <h2 className="export-modal-title" style={{color: '#e74c3c'}}>
                                    <i className="fas fa-exclamation-triangle"></i> Delete User
                                </h2>
                                <button onClick={handleCancelAction} className="export-modal-close-btn" aria-label="close">
                                    <i className="fas fa-times"></i>
                                </button>
                            </div>
                            <p className="export-modal-description">
                                <strong style={{color: '#e74c3c'}}>⚠️ WARNING: This action cannot be undone!</strong>
                            </p>
                            <p className="export-modal-description">
                                You are about to permanently delete <strong>{selectedUser.name}</strong> ({selectedUser.email}) and <strong>all associated data</strong>:
                            </p>
                            <ul style={{marginLeft: '20px', marginBottom: '20px', color: '#666'}}>
                                <li>• User account and profile</li>
                                <li>• All posted items</li>
                                <li>• All claims made by this user</li>
                                <li>• All messages sent/received</li>
                                <li>• All notifications and activity history</li>
                            </ul>
                            <p style={{color: '#e74c3c', fontWeight: 'bold'}}>
                                This will completely remove the user from the system.
                            </p>
                            <div className="export-modal-actions">
                                <button 
                                    onClick={handleCancelAction} 
                                    className="export-modal-cancel-btn"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleConfirmDelete} 
                                    className="export-modal-confirm-btn"
                                    style={{backgroundColor: '#e74c3c'}}
                                >
                                    <i className="fas fa-trash"></i> Delete Everything
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Batch Add Students Modal */}
                {batchAddModalOpen && (
                    <div className="export-modal-overlay">
                        <div className="export-modal-content" style={{maxWidth: '600px'}}>
                            <div className="export-modal-header">
                                <h2 className="export-modal-title">
                                    <i className="fas fa-user-plus"></i> Batch Add Students
                                </h2>
                                <button onClick={handleCloseBatchAddModal} className="export-modal-close-btn" aria-label="close">
                                    <i className="fas fa-times"></i>
                                </button>
                            </div>
                            <p className="export-modal-description">
                                Add multiple students to the system using CSV format or manual entry.
                            </p>
                            
                            {/* Upload Mode Selection */}
                            <div className="export-modal-quick-select">
                                <button 
                                    onClick={() => setUploadMode('manual')} 
                                    className={`export-modal-quick-btn ${uploadMode === 'manual' ? 'active' : ''}`}
                                >
                                    Manual Entry
                                </button>
                                <button 
                                    onClick={() => setUploadMode('file')}
                                    className={`export-modal-quick-btn ${uploadMode === 'file' ? 'active' : ''}`}
                                >
                                    CSV Upload
                                </button>
                            </div>

                            {uploadMode === 'file' && (
                                <div className="export-modal-date-input-group">
                                    <label htmlFor="csvFile">Upload CSV File:</label>
                                    <input
                                        id="csvFile"
                                        type="file"
                                        accept=".csv"
                                        onChange={handleFileUpload}
                                        className="export-modal-date-input"
                                    />
                                    <small style={{color: '#666', fontSize: '12px'}}>
                                        CSV format: ID, Name, Email, Password (optional), Status (optional)
                                    </small>
                                </div>
                            )}

                            <div className="export-modal-date-input-group">
                                <label htmlFor="studentDataTextarea">
                                    {uploadMode === 'manual' ? 'Student Data (one per line):' : 'Preview/Edit Data:'}
                                </label>
                                <textarea
                                    id="studentDataTextarea"
                                    value={studentData}
                                    onChange={(e) => setStudentData(e.target.value)}
                                    className="export-modal-date-input"
                                    placeholder={uploadMode === 'manual' 
                                        ? "Enter student data in CSV format:\n202400001, Bob Wilson, 202400001@example.com, password123\n\nFormat: ID, Name, Email, Password (optional), Status (optional)\nStatus options: active, flagged, banned"
                                        : "CSV data will appear here..."}
                                    rows="8"
                                    style={{resize: 'vertical', fontFamily: 'monospace', fontSize: '13px'}}
                                />
                            </div>

                            <div className="export-modal-actions">
                                <button 
                                    onClick={handleCloseBatchAddModal} 
                                    className="export-modal-cancel-btn"
                                    disabled={isProcessing}
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleBatchAddStudents} 
                                    className="export-modal-confirm-btn"
                                    disabled={isProcessing || !studentData.trim()}
                                    style={{backgroundColor: isProcessing ? '#045195' : '#045195'}}
                                >
                                    {isProcessing ? (
                                        <>
                                            <i className="fas fa-spinner fa-spin"></i> Processing...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fas fa-user-plus"></i> Add Students
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="filter-section">
                <div className="tabs">
                        <button 
                            className={`item-tab ${activeTab === 'all' ? 'active' : ''}`}
                            onClick={() => setActiveTab('all')}
                        >
                            <i className="fas fa-th-list"></i> All Users
                            <span className="count">{users.length}</span>
                        </button>
                    <button 
                        className={`item-tab ${activeTab === 'active' ? 'active' : ''}`}
                        onClick={() => setActiveTab('active')}
                    >
                            <i className="fas fa-users"></i> Active
                            <span className="count">{getTabCount('active')}</span>
                    </button>
                    <button 
                        className={`item-tab ${activeTab === 'flagged' ? 'active' : ''}`}
                        onClick={() => setActiveTab('flagged')}
                    >
                            <i className="fas fa-flag"></i> Flagged
                            <span className="count">{getTabCount('flagged')}</span>
                    </button>
                    <button 
                        className={`item-tab ${activeTab === 'banned' ? 'active' : ''}`}
                        onClick={() => setActiveTab('banned')}
                    >
                            <i className="fas fa-ban"></i> Banned
                            <span className="count">{getTabCount('banned')}</span>
                    </button>
                </div>

                <div className="search-bar">
                        <i className="fas fa-search search-icon"></i>
                    <input 
                        type="text" 
                            placeholder="Search by name or email..."
                        className="search-input"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button 
                                className="clear-search" 
                                onClick={() => setSearchTerm('')}
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        )}
                    </div>
                </div>

                <div className="users-table-container">
                    {loading ? (
                        <div className="loading-message">
                            <i className="fas fa-spinner fa-pulse"></i>
                            <p>Loading users...</p>
                        </div>
                    ) : error ? (
                        <div className="error-message">
                            <i className="fas fa-exclamation-circle"></i>
                            <p>{error}</p>
                        </div>
                    ) : filteredUsers.length > 0 ? (
                        <table className="users-table">
                        <thead>
                            <tr>
                                    <th onClick={() => requestSort('name')}>
                                        Name 
                                        {sortConfig.key === 'name' && (
                                            <i className={`fas fa-sort-${sortConfig.direction === 'ascending' ? 'up' : 'down'}`}></i>
                                        )}
                                    </th>
                                    <th>Email</th>
                                    <th onClick={() => requestSort('year_level')}>
                                        Year Level
                                        {sortConfig.key === 'year_level' && (
                                            <i className={`fas fa-sort-${sortConfig.direction === 'ascending' ? 'up' : 'down'}`}></i>
                                        )}
                                    </th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map((user, index) => (
                                    <tr key={user.id || index} className={user.status}>
                                        <td className="user-name">{user.name}</td>
                                        <td>{user.email}</td>
                                        <td>{user.year_level}</td>
                                        <td className="user-status-badge">{renderStatusBadge(user.status)}</td>
                                        <td className="actions">
                                            <button 
                                                className="action-btn flag" 
                                                aria-label={user.status === 'flagged' ? 'Unflag' : 'Flag'}
                                                onClick={() => handleFlagUser(user)}
                                                title={user.status === 'flagged' ? 'Unflag User' : 'Flag User'}
                                                disabled={user.status === 'banned'}
                                            >
                                                <i className="fas fa-flag"></i>
                                            </button>
                                            <button 
                                                className="action-btn ban" 
                                                aria-label={user.status === 'banned' ? 'Unban' : 'Ban'}
                                                onClick={() => handleBanUser(user)}
                                                title={user.status === 'banned' ? 'Unban User' : 'Ban User'}
                                            >
                                                <i className="fas fa-user-slash"></i>
                                            </button>
                                            <button 
                                                className="action-btn delete" 
                                                aria-label="Delete"
                                                onClick={() => handleDeleteUser(user)}
                                                title="Delete User"
                                            >
                                                <i className="fas fa-trash"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="no-results">
                            <i className="fas fa-search"></i>
                            <h3>No users found</h3>
                            <p>Try adjusting your search or filter criteria</p>
                        </div>
                    )}
                </div>

                {/* Pagination Controls */}
                {(() => {
                    // Calculate total users after applying current tab and search filters
                    let usersForPaginationCount = users;
                    if (activeTab !== 'all') {
                        usersForPaginationCount = usersForPaginationCount.filter(user => user.status === activeTab);
                    }
                    if (searchTerm) {
                        usersForPaginationCount = usersForPaginationCount.filter(user =>
                            user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            user.email.toLowerCase().includes(searchTerm.toLowerCase())
                        );
                    }
                    const totalPages = Math.ceil(usersForPaginationCount.length / itemsPerPage);

                    if (totalPages > 1) {
                        return (
                            <div className="pagination-controls">
                                <button 
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                >
                                    <i className="fas fa-chevron-left"></i> Previous
                                </button>
                                <span>Page {currentPage} of {totalPages}</span>
                                <button 
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                >
                                    Next <i className="fas fa-chevron-right"></i>
                                </button>
                            </div>
                        );
                    }
                    return null; // No pagination needed if only one page or no users
                })()}

                <div className="disclaimer">
                    <p><strong>Flagging:</strong> Prevents the user from sending reports or messages to the Disciplinary Office, but still allows them to claim items.</p>
                    <p><strong>Banning:</strong> Completely restricts the user from accessing the platform.</p>
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

export default UserManagement;