import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { notifications, markAllAsRead, markAsRead } from '../data/notifications';
import gcLogo from '../assets/gc-finder-logo.png';
import profilePic from '../assets/Profile.png';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

const Layout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [showNotifications, setShowNotifications] = useState(false);
    const [showLeaveDialog, setShowLeaveDialog] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
    const [currentUser, setCurrentUser] = useState({
        displayName: "Loading...",
        userEmail: "",
        profilePicture: profilePic,
    });

    const navigationItems = [
        { path: 'dashboard', icon: 'fas fa-home', label: 'Dashboard' },
        { path: 'reportitems', icon: 'fas fa-file-alt', label: 'Report Found Item' },
        { path: 'reviewreports', icon: 'fas fa-clipboard-list', label: 'Review Reports' },
        { path: 'claimverification', icon: 'fas fa-check-circle', label: 'Verify Claims' },
        { path: 'user-management', icon: 'fas fa-users', label: 'Manage Users' },
        { path: 'item-management', icon: 'fas fa-box', label: 'Manage Items' },
        { path: 'messages', icon: 'fas fa-envelope', label: 'Messages' }
    ];

    const footerItems = [
        { path: 'help', icon: 'fas fa-question-circle', label: 'Help' },
        { path: 'logout', icon: 'fas fa-sign-out-alt', label: 'Log-out' }
    ];

    const handleNavigate = useCallback((path) => {
        if (path === 'logout') {
            setShowLeaveDialog(true);
        } else if (path !== location.pathname.substring(1)) {
            navigate(`/${path}`);
        }
    }, [navigate, location.pathname]);

    const handleLogout = useCallback(() => {
        // Remove authentication data from localStorage
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('userData');
        navigate('/');
    }, [navigate]);

    // Toggle notifications panel
    const toggleNotifications = useCallback((e) => {
        e?.stopPropagation();
        setShowNotifications(prev => !prev);
    }, []);

    // Mark all notifications as read
    const handleMarkAllRead = useCallback(() => {
        markAllAsRead();
    }, []);

    // Mark individual notification as read
    const handleIndividualNotificationClick = useCallback((id) => {
        markAsRead(id);
    }, []);

    const toggleSidebar = useCallback(() => {
        setIsSidebarOpen(prev => !prev);
    }, []);

    // Check if current path includes the navigation item path
    const isActivePath = (path) => location.pathname.includes(`/${path}`);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const userData = JSON.parse(localStorage.getItem('userData'));
                
                if (userData && userData.id) {
                    // Fetch the user document from Firestore
                    const userRef = doc(db, 'admin', userData.id);
                    const userSnap = await getDoc(userRef);
                    
                    if (userSnap.exists()) {
                        const data = userSnap.data();
                        setCurrentUser({
                            displayName: data.position || "Unknown User",
                            userEmail: data.email || "Unknown Email",
                            profilePicture: data.profileUrl || profilePic
                        });
                    }
                } else {
                    // No user data in localStorage, redirect to login
                    navigate('/');
                }
            } catch (error) {
                console.error("Error fetching user data:", error);
            }
        };
        
        fetchUserData();
    }, [navigate]);

    return (
        <div className="layout">
            {/* Sidebar */}
            <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
                <div className="logo">
                    <img src={gcLogo} alt="Gordon College Logo" />
                    <h2>GORDON COLLEGE</h2>
                </div>
                <nav>
                    <ul>
                        {navigationItems.map((item, index) => (
                            <li 
                                key={index}
                                className={isActivePath(item.path) ? 'active' : ''}
                                onClick={() => handleNavigate(item.path)}
                            >
                                <i className={item.icon}></i> {item.label}
                            </li>
                        ))}
                    </ul>
                </nav>
                <div className="bottom-nav">
                    <ul>
                        {footerItems.map((item, index) => (
                            <li 
                                key={index}
                                className={isActivePath(item.path) ? 'active' : ''}
                                onClick={() => handleNavigate(item.path)}
                            >
                                <i className={item.icon}></i> {item.label}
                            </li>
                        ))}
                    </ul>
                </div>
            </aside>

            {/* Main Content */}
            <main className={`main-content ${isSidebarOpen ? 'sidebar-open' : ''}`}>
                <header>
                    {/* Burger Menu Button */}
                    <button className="burger-menu" onClick={toggleSidebar}>
                        <i className="fas fa-bars"></i>
                    </button>
                    
                    <div className="user-info">
                        <div className="user-details">
                            <span className="display-name">{currentUser.displayName}</span>
                            <span className="email">{currentUser.userEmail}</span>
                        </div>
                        <img src={currentUser.profilePicture} alt="Profile" className="profile-pic" />
                        <div className="notification-wrapper">
                            <i 
                                className="fas fa-bell" 
                                id="notification-bell"
                                onClick={toggleNotifications}
                            ></i>
                            <div className={`notification-panel ${showNotifications ? 'show' : ''}`}>
                                <div className="notification-header">
                                    <h3>Notification</h3>
                                    <button className="mark-all-read" onClick={handleMarkAllRead}>
                                        Mark all as read
                                    </button>
                                </div>
                                <div className="notification-list">
                                    {notifications.map(notification => (
                                        <div 
                                            key={notification.id}
                                            className={`notification-item ${notification.read ? 'read' : ''}`}
                                            onClick={() => handleIndividualNotificationClick(notification.id)}
                                        >
                                            <img 
                                                src={notification.senderProfile} 
                                                alt="Profile" 
                                                className="notification-profile"
                                            />
                                            <div className="notification-content">
                                                <p className="notification-name">{notification.senderName}</p>
                                                <p className="notification-text">{notification.message}</p>
                                                <p className="notification-time">{notification.timestamp}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <Outlet />

            </main>

            {/* Leave Confirmation Dialog */}
            {showLeaveDialog && (
                <div className="leave-dialog show" onClick={(e) => {
                    if (e.target.className === 'leave-dialog show') {
                        setShowLeaveDialog(false);
                    }
                }}>
                    <div className="leave-dialog-content">
                        <h2>Leaving GCFINDER?</h2>
                        <div className="leave-dialog-buttons">
                            <button className="btn-yes" onClick={handleLogout}>Yes</button>
                            <button className="btn-cancel" onClick={() => setShowLeaveDialog(false)}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Layout;