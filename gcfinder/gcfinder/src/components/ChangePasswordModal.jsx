import React, { useState } from 'react';
import { auth } from '../firebase'; 
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';

const ChangePasswordModal = ({ isOpen, onClose, showToast }) => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (newPassword !== confirmPassword) {
            setError("New passwords do not match.");
            return;
        }

        if (newPassword.length < 6) {
            setError("New password must be at least 6 characters long.");
            return;
        }

        setIsLoading(true);

        try {
            const user = auth.currentUser;
            if (!user) {
                throw new Error("No user is signed in.");
            }

            // Re-authenticate the user with their current password
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(user, credential);

            // Get the user's ID token to send to the backend
            const token = await user.getIdToken();

            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/change-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ newPassword: newPassword })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to change password.');
            }

            showToast('Password changed successfully!', 'success');
            onClose();
        } catch (error) {
            console.error("Password change error:", error);
            setError(error.message || 'An error occurred. Please try again.');
            showToast(error.message || 'Failed to change password.', 'error');
        } finally {
            setIsLoading(false);
            // Clear fields after submission attempt
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setShowCurrentPassword(false);
            setShowNewPassword(false);
            setShowConfirmPassword(false);
        }
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '500px' }}>
                <div className="modal-header">
                    <h2>Change Password</h2>
                    <button onClick={onClose} className="close-button">&times;</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {error && <p className="error-message">{error}</p>}
                        <div className="input-group">
                            <i className="fas fa-lock input-icon"></i>
                            <input
                                type={showCurrentPassword ? "text" : "password"}
                                placeholder="Current Password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                required
                                style={{ paddingRight: '45px' }}
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                tabIndex={-1}
                            >
                                <i className={showCurrentPassword ? "fas fa-eye-slash" : "fas fa-eye"}></i>
                            </button>
                        </div>
                        <div className="input-group">
                            <i className="fas fa-key input-icon"></i>
                            <input
                                type={showNewPassword ? "text" : "password"}
                                placeholder="New Password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                style={{ paddingRight: '45px' }}
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                tabIndex={-1}
                            >
                                <i className={showNewPassword ? "fas fa-eye-slash" : "fas fa-eye"}></i>
                            </button>
                        </div>
                        <div className="input-group">
                            <i className="fas fa-key input-icon"></i>
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="Confirm New Password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                style={{ paddingRight: '45px' }}
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                tabIndex={-1}
                            >
                                <i className={showConfirmPassword ? "fas fa-eye-slash" : "fas fa-eye"}></i>
                            </button>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn back" onClick={onClose} disabled={isLoading}>
                            Cancel
                        </button>
                        <button type="submit" className="btn claim" disabled={isLoading}>
                            {isLoading ? 'Updating...' : 'Update Password'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ChangePasswordModal;
