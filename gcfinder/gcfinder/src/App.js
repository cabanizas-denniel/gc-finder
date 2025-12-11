import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { auth, db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';
import ErrorBoundary from './components/ErrorBoundary';
import './styles/student-styles.css';
import './styles/admin-styles.css';
import './styles/shared-styles.css';

// Loading spinner component
const LoadingSpinner = () => (
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

// LAZY LOAD COMPONENTS for faster initial page load
// Student components
const Login = lazy(() => import('./components/student/Login'));
const Dashboard = lazy(() => import('./components/student/Dashboard'));
const ReportItem = lazy(() => import('./components/student/ReportItem'));
const BrowseItems = lazy(() => import('./components/student/BrowseItems'));
const MyClaims = lazy(() => import('./components/student/MyClaims'));
const Messages = lazy(() => import('./components/student/Messages'));
const Help = lazy(() => import('./components/student/Help'));
const LostRequests = lazy(() => import('./components/student/LostRequests'));
const LostItems = lazy(() => import('./components/student/LostItems'));
const NotFound = lazy(() => import('./components/student/NotFound'));
const Layout = lazy(() => import('./components/student/Layout'));

// Official/Faculty
const OfficialLogin = lazy(() => import('./components/official/Login'));

// Admin components
const AdminLogin = lazy(() => import('./components/admin/Login'));
const AdminDashboard = lazy(() => import('./components/admin/Dashboard'));
const AdminLayout = lazy(() => import('./components/admin/Layout'));
const ReviewReports = lazy(() => import('./components/admin/ReviewReports'));
const ClaimVerification = lazy(() => import('./components/admin/ClaimVerification'));
const UserManagement = lazy(() => import('./components/admin/UserManagement'));
const ItemManagement = lazy(() => import('./components/admin/ItemManagement'));
const AdminMessages = lazy(() => import('./components/admin/Messages'));
const AdminHelp = lazy(() => import('./components/admin/Help'));
const AdminLostItems = lazy(() => import('./components/admin/LostItems'));

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
        <ErrorBoundary>
            <Router>
                <Suspense fallback={<LoadingSpinner />}>
                <Routes>
                {/* Student Routes */}
                <Route path="/" element={<Login />} />
                {/* Official/Personnel Login - shares student components */}
                <Route path="/personnel" element={<OfficialLogin />} />
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
                        path="/lost-requests"
                        element={
                            <ProtectedRoute>
                                <LostRequests />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/lost-items"
                        element={
                            <ProtectedRoute>
                                <LostItems />
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
                    <Route path="/admin/review-reports" element={<ReviewReports />} />
                    <Route path="/admin/lost-items" element={<AdminLostItems />} />
                    <Route path="/admin/claim-verification" element={<ClaimVerification />} />
                    <Route path="/admin/user-management" element={<UserManagement />} />
                    <Route path="/admin/item-management" element={<ItemManagement />} />
                    <Route path="/admin/messages" element={<AdminMessages />} />
                    <Route path="/admin/help" element={<AdminHelp />} />
                </Route>
                <Route path="*" element={<NotFound />} />
                </Routes>
                </Suspense>
            </Router>
        </ErrorBoundary>
    );
}

export default App;