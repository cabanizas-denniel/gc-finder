import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
    const isAuthenticated = localStorage.getItem('isAuthenticated');
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    
    if (!isAuthenticated) {
        return <Navigate to={requireAdmin ? "/admin" : "/"} />;
    }
    
    if (requireAdmin && !isAdmin) {
        return <Navigate to="/" />;
    }
    
    return children;
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
                <Route element={<AdminLayout />}>
                    <Route
                        path="/admin/dashboard"
                        element={
                            <ProtectedRoute requireAdmin={true}>
                                <AdminDashboard />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin/report-items"
                        element={
                            <ProtectedRoute requireAdmin={true}>
                                <ReportItems />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin/review-reports"
                        element={
                            <ProtectedRoute requireAdmin={true}>
                                <ReviewReports />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin/claim-verification"
                        element={
                            <ProtectedRoute requireAdmin={true}>
                                <ClaimVerification />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin/user-management"
                        element={
                            <ProtectedRoute requireAdmin={true}>
                                <UserManagement />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin/item-management"
                        element={
                            <ProtectedRoute requireAdmin={true}>
                                <ItemManagement />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin/messages"
                        element={
                            <ProtectedRoute requireAdmin={true}>
                                <AdminMessages />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin/help"
                        element={
                            <ProtectedRoute requireAdmin={true}>
                                <AdminHelp />
                            </ProtectedRoute>
                        }
                    />
                </Route>
                <Route path="*" element={<NotFound />} />
            </Routes>
        </Router>
    );
}

export default App;