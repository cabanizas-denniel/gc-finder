import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import gcLogo from '../../assets/gc-finder-logo.png';
import profilePic from '../../assets/Profile.png';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';

const Layout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [showLeaveDialog, setShowLeaveDialog] = useState(false);
    const [showFlaggedModal, setShowFlaggedModal] = useState(false);
    const [flaggedModalMessage, setFlaggedModalMessage] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [currentUser, setCurrentUser] = useState({
        displayName: "Loading...",
        userEmail: "",
        profilePicture: profilePic,
        status: "active",
        flagReason: null,
    });
    
    // Handle window resize and sidebar state
    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth;
            setIsMobile(width <= 768);
            if (width <= 768) {
                setIsSidebarOpen(false);
            } else {
                setIsSidebarOpen(true);
            }
        };

        // Initial check
        handleResize();

        // Add event listener
        window.addEventListener('resize', handleResize);
        
        // Cleanup
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Handle clicks outside sidebar for mobile
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (isSidebarOpen && window.innerWidth <= 768) {
                const sidebar = document.querySelector('.sidebar');
                const burgerMenu = document.querySelector('.burger-menu');
                
                if (sidebar && burgerMenu && 
                    !sidebar.contains(event.target) && 
                    !burgerMenu.contains(event.target)) {
                    setIsSidebarOpen(false);
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isSidebarOpen]);

    // Fetch user data from Firebase
    useEffect(() => {
        const fetchUserData = async () => {
            try {
                // Get user ID from localStorage or auth state
                const userData = JSON.parse(localStorage.getItem('userData'));
                
                if (userData && userData.id) {
                    // Fetch the user document from Firestore
                    const userRef = doc(db, 'students', userData.id);
                    const userSnap = await getDoc(userRef);
                    
                    if (userSnap.exists()) {
                        const data = userSnap.data();
                        
                        // Check if user is banned and redirect to login
                        if (data.status === 'banned') {
                            localStorage.removeItem('userData');
                            localStorage.removeItem('isAuthenticated');
                            navigate('/');
                            return;
                        }
                        
                        setCurrentUser({
                            displayName: data.full_name || "Unknown User",
                            userEmail: data.email || `${data.student_id}@gordoncollege.edu.ph`,
                            profilePicture: data.profileUrl || profilePic,
                            status: data.status || "active",
                            flagReason: data.flagReason || null,
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

    // Navigation items (could be filtered based on role)
    const navigationItems = [
        { path: 'dashboard', icon: 'fas fa-home', label: 'Dashboard' },
        { path: 'report-item', icon: 'fas fa-file-alt', label: 'Report Found Item' },
        { path: 'browse-items', icon: 'fas fa-search', label: 'Browse Items' },
        { path: 'my-claims', icon: 'fas fa-tasks', label: 'My Claims' },
        { path: 'messages', icon: 'fas fa-envelope', label: 'Messages' }
    ];

    const footerItems = [
        { path: 'help', icon: 'fas fa-question-circle', label: 'Help' },
        { path: 'logout', icon: 'fas fa-sign-out-alt', label: 'Log-out' }
    ];

    // Navigation handler
    const handleNavigate = useCallback((path) => {
        // Block restricted features for flagged users
        if (currentUser.status === 'flagged') {
            const restrictedPaths = ['report-item', 'messages'];
            if (restrictedPaths.includes(path)) {
                setFlaggedModalMessage(`Access restricted: Your account has been flagged. ${currentUser.flagReason || ''}`);
                setShowFlaggedModal(true);
                return;
            }
        }

        if (path === 'logout') {
            setShowLeaveDialog(true);
        } else if (path !== location.pathname.substring(1)) {
            navigate(`/${path}`);
        }
    }, [navigate, location.pathname, currentUser.status, currentUser.flagReason]);

    // Logout handler
    const handleLogout = useCallback(() => {
        // Clear user data from localStorage
        localStorage.removeItem('userData');
        localStorage.removeItem('isAuthenticated');
        navigate('/');
    }, [navigate]);

    // Toggle sidebar
    const toggleSidebar = useCallback(() => {
        setIsSidebarOpen(prev => !prev);
    }, []);

    // Check if page is active
    const isActivePath = (path) => location.pathname === `/${path}`;

    return (
        <div className="container">
            {/* Sidebar */}
            <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
                <div className="logo">
                    <img src={gcLogo} alt="Gordon College Logo" />
                    <h2>GORDON COLLEGE</h2>
                </div>
                <nav>
                    <ul>
                        {navigationItems.map((item, index) => {
                            const restrictedPaths = ['report-item', 'messages'];
                            const isRestricted = currentUser.status === 'flagged' && restrictedPaths.includes(item.path);
                            
                            return (
                                <li 
                                    key={index}
                                    className={`${isActivePath(item.path) ? 'active' : ''} ${isRestricted ? 'restricted' : ''}`}
                                    onClick={() => handleNavigate(item.path)}
                                >
                                    <i className={item.icon}></i> {item.label}
                                    {isRestricted && (
                                        <i className="fas fa-lock restricted-lock-icon"></i>
                                    )}
                                </li>
                            );
                        })}
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

            {/* Dark Overlay for Mobile */}
            {isSidebarOpen && isMobile && (
                <div className="sidebar-overlay" onClick={toggleSidebar} />
            )}

            {/* Main Content */}
            <main className={`main-content ${isSidebarOpen ? 'sidebar-open' : ''}`}>
                <header style={{
                    justifyContent: currentUser.status === 'flagged' && !isMobile ? 'space-between' : 'flex-end'
                }}>
                    {/* Burger Menu Button */}
                    <button className="burger-menu" onClick={toggleSidebar}>
                        <i className="fas fa-bars"></i>
                    </button>
                    
                    {/* Flagged user warning */}
                    {currentUser.status === 'flagged' && (
                        <div 
                            className="flagged-user-banner"
                            onClick={() => {
                                const reason = currentUser.flagReason || 'No specific reason provided';
                                setFlaggedModalMessage(`Account Flagged\n\nReason: ${reason}\n\nContact Disciplinary Office to resolve this issue.`);
                                setShowFlaggedModal(true);
                            }}
                        >
                            <i className="fas fa-exclamation-triangle"></i>
                            <p>Account Flagged</p>
                        </div>
                    )}
                    
                    <div className="user-info">
                        <div className="user-details">
                            <span className="display-name">{currentUser.displayName}</span>
                            <span className="student-id">{currentUser.userEmail}</span>
                        </div>
                        <img src={currentUser.profilePicture} alt="Profile" className="profile-pic" />
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

            {/* Flagged User Modal */}
            {showFlaggedModal && (
                <div className="leave-dialog show" onClick={(e) => {
                    if (e.target.className === 'leave-dialog show') {
                        setShowFlaggedModal(false);
                    }
                }}>
                    <div className="leave-dialog-content">
                        <h2>Access Restricted</h2>
                        <p style={{ whiteSpace: 'pre-line', marginBottom: '20px' }}>{flaggedModalMessage}</p>
                        <div className="leave-dialog-buttons">
                            <button className="btn-cancel" onClick={() => setShowFlaggedModal(false)}>
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Layout;
