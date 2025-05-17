import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login'; 
import Dashboard from './components/Dashboard';
import ReportItems from './components/ReportItems';
import ReviewReports from './components/ReviewReports';
import ClaimVerification from './components/ClaimVerification';
import UserManagement from './components/UserManagement';
import ItemManagement from './components/ItemManagement';
import NotFound from './components/NotFound';
import Messages from './components/Messages';
import Help from './components/Help';
import Layout from './components/Layout';
import './styles/styles.css';

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem('isAuthenticated');
  return isAuthenticated ? children : <Navigate to="/" />;
};

function App() {
  return (
      <Router>
          <Routes>
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
                  path="/reportitems"
                  element={
                      <ProtectedRoute>
                          <ReportItems />
                      </ProtectedRoute>
                  }
              />
              <Route
                  path="/reviewreports"
                  element={
                      <ProtectedRoute>
                          <ReviewReports />
                      </ProtectedRoute>
                  }
              />
              <Route
                  path="/claimverification"
                  element={
                      <ProtectedRoute>
                          <ClaimVerification />
                      </ProtectedRoute>
                  }
              />
              <Route
                  path="/user-management"
                  element={
                      <ProtectedRoute>
                          <UserManagement />
                      </ProtectedRoute>
                  }
              />
              <Route
                  path="/item-management"
                  element={
                      <ProtectedRoute>
                          <ItemManagement />
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
              {/* <Route path="/login" element={<Login />} /> */}
              
              {/* 404 Page - Laging nasa baba */}
              </Route>
              <Route path="*" element={<NotFound />} />
          </Routes>
      </Router>
  );
}

export default App; 