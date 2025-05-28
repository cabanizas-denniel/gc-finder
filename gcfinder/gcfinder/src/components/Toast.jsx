import React, { useState, useEffect } from 'react';

const Toast = ({ message, show, onClose, type = 'success', duration = 3000 }) => {
    useEffect(() => {
        if (show) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            
            return () => clearTimeout(timer);
        }
    }, [show, duration, onClose]);

    if (!show) return null;

    const getIcon = () => {
        switch (type) {
            case 'success':
                return 'fas fa-check-circle';
            case 'error':
                return 'fas fa-exclamation-circle';
            case 'warning':
                return 'fas fa-exclamation-triangle';
            case 'info':
                return 'fas fa-info-circle';
            default:
                return 'fas fa-check-circle';
        }
    };

    return (
        <div className={`toast-notification toast-${type}`}>
            <i className={getIcon()}></i>
            <span>{message}</span>
        </div>
    );
};

// Hook for easy toast management
export const useToast = () => {
    const [toast, setToast] = useState({
        show: false,
        message: '',
        type: 'success'
    });

    const showToast = (message, type = 'success') => {
        setToast({
            show: true,
            message,
            type
        });
    };

    const hideToast = () => {
        setToast(prev => ({
            ...prev,
            show: false
        }));
    };

    return {
        toast,
        showToast,
        hideToast
    };
};

export default Toast; 