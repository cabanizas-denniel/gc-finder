import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import gcLogo from '../../assets/gc-finder-logo.png';
import profilePic from '../../assets/Profile.png';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../admin-firebase';
import ChangePasswordModal from '../ChangePasswordModal';
import Toast, { useToast } from '../Toast';

const Layout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [showLeaveDialog, setShowLeaveDialog] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
    const { toast, showToast, hideToast } = useToast();
    const [currentUser, setCurrentUser] = useState({
        displayName: "Loading...",
        userEmail: "",
        profilePicture: profilePic,
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

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (isProfileDropdownOpen) {
                const dropdown = document.querySelector('.profile-dropdown');
                const userInfo = document.querySelector('.user-info');
                if (dropdown && userInfo && !dropdown.contains(event.target) && !userInfo.contains(event.target)) {
                    setIsProfileDropdownOpen(false);
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isProfileDropdownOpen]);

    const navigationItems = [
        { path: 'admin/dashboard', icon: 'fas fa-home', label: 'Dashboard' },
        { path: 'admin/report-items', icon: 'fas fa-file-alt', label: 'Report Found Item' },
        { path: 'admin/review-reports', icon: 'fas fa-clipboard-list', label: 'Review Reports' },
        { path: 'admin/lost-requests', icon: 'fas fa-question-circle', label: 'Lost Requests' },
        { path: 'admin/lost-items', icon: 'fas fa-bullhorn', label: 'Lost Items' },
        { path: 'admin/claim-verification', icon: 'fas fa-check-circle', label: 'Verify Claims' },
        { path: 'admin/user-management', icon: 'fas fa-users', label: 'Manage Users' },
        { path: 'admin/item-management', icon: 'fas fa-box', label: 'Manage Items' },
        { path: 'admin/messages', icon: 'fas fa-envelope', label: 'Messages' }
    ];

    const footerItems = [
        { path: 'admin/help', icon: 'fas fa-question-circle', label: 'Help' },
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
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('isAdmin');
        localStorage.removeItem('userData');
        navigate('/admin');
    }, [navigate]);

    const toggleSidebar = useCallback(() => {
        setIsSidebarOpen(prev => !prev);
    }, []);

    const toggleProfileDropdown = () => {
        setIsProfileDropdownOpen(prev => !prev);
    };

    const openChangePasswordModal = () => {
        setIsChangePasswordModalOpen(true);
        setIsProfileDropdownOpen(false);
    };

    const isActivePath = (path) => location.pathname === `/${path}`;

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const userData = JSON.parse(localStorage.getItem('userData'));
                
                if (userData && userData.id) {
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
                }
            } catch (error) {
                console.error("Error fetching user data:", error);
            }
        };
        
        if (location.pathname !== '/admin') {
            fetchUserData();
        }
    }, [location.pathname]);


    return (
        <div className="layout">
            <Toast
                message={toast.message}
                show={toast.show}
                onClose={hideToast}
                type={toast.type}
            />
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

            {isSidebarOpen && isMobile && (
                <div className="sidebar-overlay" onClick={toggleSidebar} />
            )}

            {/* Main Content */}
            <main className={`main-content ${isSidebarOpen ? 'sidebar-open' : ''}`}>
                <header>
                    {/* Burger Menu Button */}
                    <button className="burger-menu" onClick={toggleSidebar}>
                        <i className="fas fa-bars"></i>
                    </button>
                    
                    <div className="user-info" onClick={toggleProfileDropdown} style={{ cursor: 'pointer' }}>
                        <div className="user-details">
                            <span className="display-name">{currentUser.displayName}</span>
                            <span className="email">{currentUser.userEmail}</span>
                        </div>
                        <img src={currentUser.profilePicture} alt="Profile" className="profile-pic" />
                        {isProfileDropdownOpen && (
                            <div className="profile-dropdown">
                                <button onClick={openChangePasswordModal}>
                                    <i className="fas fa-key"></i> Change Password
                                </button>
                                <button onClick={() => setShowLeaveDialog(true)}>
                                    <i className="fas fa-sign-out-alt"></i> Log Out
                                </button>
                            </div>
                        )}
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
            <ChangePasswordModal
                isOpen={isChangePasswordModalOpen}
                onClose={() => setIsChangePasswordModalOpen(false)}
                showToast={showToast}
            />
        </div>
    );
};

export default Layout;