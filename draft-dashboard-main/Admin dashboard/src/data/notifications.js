import profilePic from '../assets/Profile.png';

// Central notifications data
export const notifications = [
    {
        id: "notification-id-1",
        senderName: "Dench Gregory Casaul",
        senderProfile: profilePic,
        message: "Sent you a message",
        timestamp: "Mar 12, 9:42 AM",
        read: false
    },
    {
        id: "notification-id-2",
        senderName: "John Lawrence Asoro",
        senderProfile: profilePic,
        message: "Sent you a message",
        timestamp: "Mar 11, 12:21 AM",
        read: false
    }
];

// Helper functions for notifications
export const markAllAsRead = () => {
    // In a real app with backend, you would update the database here
    notifications.forEach(notification => {
        notification.read = true;
    });
    
    // Handle visual update
    updateNotificationVisuals();
    
    return [...notifications];
};

export const markAsRead = (id) => {
    // In a real app with backend, you would update the database here
    const notification = notifications.find(n => n.id === id);
    if (notification) {
        notification.read = true;
    }
    
    // Handle visual update for specific notification
    const element = document.getElementById(`notification-${id}`);
    if (element) {
        element.style.opacity = '0.7';
    }
    
    return [...notifications];
};

export const addNotification = (notification) => {
    notifications.push(notification);
    return [...notifications];
};

// Helper function to update the visual appearance of notifications
export const updateNotificationVisuals = () => {
    const notificationItems = document.querySelectorAll('.notification-item');
    notificationItems.forEach(item => {
        item.style.opacity = '0.7';
    });
}; 