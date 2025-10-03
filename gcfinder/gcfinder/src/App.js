import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { auth, db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';
// Student imports
import Login from './components/student/Login';
import Dashboard from './components/student/Dashboard';
import ReportItem from './components/student/ReportItem';
import BrowseItems from './components/student/BrowseItems';
import MyClaims from './components/student/MyClaims';
import Messages from './components/student/Messages';
import Help from './components/student/Help';
import NotFound from './components/student/NotFound';
import Layout from './components/student/Layout';
// Admin imports
import AdminLogin from './components/admin/Login';
import AdminDashboard from './components/admin/Dashboard';
import AdminLayout from './components/admin/Layout';
import ReportItems from './components/admin/ReportItems';
import ReviewReports from './components/admin/ReviewReports';
import ClaimVerification from './components/admin/ClaimVerification';
import UserManagement from './components/admin/UserManagement';
import ItemManagement from './components/admin/ItemManagement';
import AdminMessages from './components/admin/Messages';
import AdminHelp from './components/admin/Help';
import './styles/student-styles.css';
import './styles/admin-styles.css';
import './styles/shared-styles.css';

const ProtectedRoute = ({ children, requireAdmin }) => {
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user) {
                setIsAuthenticated(true);
                
                // Check if user is admin by looking in admin collection
                if (requireAdmin) {
                    try {
                        const adminDocRef = doc(db, 'admin', user.uid);
                        const adminDoc = await getDoc(adminDocRef);
                        setIsAdmin(adminDoc.exists());
                    } catch (error) {
                        console.error('Error checking admin status:', error);
                        setIsAdmin(false);
                    }
                }
            } else {
                setIsAuthenticated(false);
                setIsAdmin(false);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [requireAdmin]);

    // Show loading spinner while checking auth
    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                fontSize: '1.2rem',
                backgroundColor: '#fff'
            }}>
                <i className="fas fa-spinner fa-pulse" style={{ marginRight: '10px' }}></i>
                Loading...
            </div>
        );
    }

    // Not authenticated - redirect to appropriate login
    if (!isAuthenticated) {
        return <Navigate to={requireAdmin ? "/admin" : "/"} replace />;
    }

    // Authenticated but not admin when admin is required
    if (requireAdmin && !isAdmin) {
        return <Navigate to="/" replace />;
    }

    return children;
};

// Protected Layout for Admin - wraps the entire layout
const ProtectedAdminLayout = () => {
    return (
        <ProtectedRoute requireAdmin={true}>
            <AdminLayout />
        </ProtectedRoute>
    );
};

function App() {
    return (
        <Router>
            <Routes>
                {/* Student Routes */}
                <Route path="/" element={<Login />} />
                <Route element={<Layout />}>
                    <Route
                        path="/dashboard"
                        element={
                            <ProtectedRoute>
                                <Dashboard />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/report-item"
                        element={
                            <ProtectedRoute>
                                <ReportItem />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/browse-items"
                        element={
                            <ProtectedRoute>
                                <BrowseItems />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/my-claims"
                        element={
                            <ProtectedRoute>
                                <MyClaims />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/messages"
                        element={
                            <ProtectedRoute>
                                <Messages />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/help"
                        element={
                            <ProtectedRoute>
                                <Help />
                            </ProtectedRoute>
                        }
                    />
                </Route>

                {/* Admin Routes */}
                <Route path="/admin" element={<AdminLogin />} />
                <Route element={<ProtectedAdminLayout />}>
                    <Route path="/admin/dashboard" element={<AdminDashboard />} />
                    <Route path="/admin/report-items" element={<ReportItems />} />
                    <Route path="/admin/review-reports" element={<ReviewReports />} />
                    <Route path="/admin/claim-verification" element={<ClaimVerification />} />
                    <Route path="/admin/user-management" element={<UserManagement />} />
                    <Route path="/admin/item-management" element={<ItemManagement />} />
                    <Route path="/admin/messages" element={<AdminMessages />} />
                    <Route path="/admin/help" element={<AdminHelp />} />
                </Route>
                <Route path="*" element={<NotFound />} />
            </Routes>
        </Router>
    );
}

export default App;