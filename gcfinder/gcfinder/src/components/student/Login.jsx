import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaIdCard, FaLock, FaEye, FaEyeSlash, FaCheckCircle, FaInfoCircle } from 'react-icons/fa';
import gcLogo from '../../assets/gc-finder.png';
import logo from '../../assets/gc-logo.png';
import { loginWithStudentId } from '../../firebase';
import { updateUserStatus } from '../../admin-firebase';

const Login = () => {
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(true);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const navigate = useNavigate();

  // Check if terms have been accepted before
  useEffect(() => {
    const hasAcceptedTerms = localStorage.getItem('termsAccepted');
    if (hasAcceptedTerms === 'true') {
      setTermsAccepted(true);
      setShowTermsModal(false);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    
    // Ensure terms are accepted before allowing login
    if (!termsAccepted) {
      setError('Please accept the Terms & Privacy Policy first');
      setTimeout(() => {
        setError('');
      }, 3000);
      setShowTermsModal(true);
      return;
    }
    
    setError('');
    setLoading(true);

    if (!studentId || !password) {
      setError('Please enter both Student ID and password');
      // Clear error message after 3 seconds
      setTimeout(() => {
        setError('');
      }, 3000);
      setLoading(false);
      return;
    }

    try {
      const userData = await loginWithStudentId(studentId, password);
      
      // Check if user is flagged
      if (userData.status === 'flagged') {
        const flagExpiresAt = userData.flagExpiresAt;
        
        // Check if flag has expired
        if (flagExpiresAt) {
          const expiryDate = flagExpiresAt.toDate ? flagExpiresAt.toDate() : new Date(flagExpiresAt);
          const now = new Date();
          if (expiryDate <= now) {
            // Flag has expired, update status to active
            updateUserStatus(userData.id, { status: 'active' }).catch(error => {
              console.error('Failed to update expired flag status:', error);
            });
          }
        }
      }
      
      // Check if user is banned
      if (userData.status === 'banned') {
        const banDuration = userData.banDuration || 'permanent';
        const banExpiresAt = userData.banExpiresAt;
        
        // Check if ban has expired
        if (banDuration !== 'permanent' && banExpiresAt) {
          const expiryDate = banExpiresAt.toDate ? banExpiresAt.toDate() : new Date(banExpiresAt);
          const now = new Date();
          if (expiryDate <= now) {
            // Ban has expired, allow login to proceed normally
            // Update user status to 'active' in database
            updateUserStatus(userData.id, { status: 'active' }).catch(error => {
              console.error('Failed to update expired ban status:', error);
            });
          } else {
            // Ban is still active
            const banReason = userData.banReason || 'No specific reason provided';
            const durationMap = {
              '1day': '1 day',
              '3days': '3 days', 
              '7days': '7 days',
              '1month': '1 month'
            };
            const readableDuration = durationMap[banDuration] || banDuration;
            const durationText = `Duration: ${readableDuration}\nExpires: ${expiryDate.toLocaleDateString()} at ${expiryDate.toLocaleTimeString()}`;
            
            setError(`Account Banned\n\nReason: ${banReason}\n\n${durationText}\n\nContact the Disciplinary Office (Room 122) to resolve this issue.`);
            setLoading(false);
            return;
          }
        } else {
          // Permanent ban
          const banReason = userData.banReason || 'No specific reason provided';
          setError(`Account Banned\n\nReason: ${banReason}\n\nThis is a permanent ban.\n\nContact the Disciplinary Office (Room 122) to resolve this issue.`);
          setLoading(false);
          return;
        }
      }
      
      // Store user data in localStorage with proper shape for our context
      const enhancedUserData = {
        ...userData,
        displayName: userData.full_name || "User",
        userEmail: userData.email || `${userData.student_id}@gordoncollege.edu.ph`,
        profilePicture: userData.profileUrl || null,
      };
      
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('userData', JSON.stringify(enhancedUserData));
      
      navigate('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message || 'An error occurred during login. Please try again.');
      // Clear error message after 3 seconds
      setTimeout(() => {
        setError('');
      }, 3000);
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleStudentIdChange = (e) => {
    const value = e.target.value;
    setStudentId(value);
    setError('');
  };

  const acceptTerms = () => {
    setTermsAccepted(true);
    setShowTermsModal(false);
    localStorage.setItem('termsAccepted', 'true');
  };

  return (
    <div className="login-container">
      {/* Terms and Privacy Policy Modal */}
      {showTermsModal && (
        <div className="terms-modal-overlay">
          <div className="terms-modal">
            <div className="terms-header">
              <FaInfoCircle className="terms-icon" />
              <h2>Terms of Service & Privacy Policy</h2>
            </div>
            <div className="terms-content">
              <h3>Terms of Service</h3>
              <p>Welcome to GC Finder, the official Lost and Found System of Gordon College. By using this application, you agree to the following terms:</p>
              <ul>
                <li>You will provide accurate information when reporting or claiming items.</li>
                <li>You understand that false reports may result in administrative action.</li>
                <li>You will respect the privacy of other users and not misuse any information obtained through the system.</li>
                <li>The administrators have the right to verify your identity before releasing claimed items.</li>
              </ul>

              <h3>Privacy Policy</h3>
              <p>At GC Finder, we are committed to protecting your privacy:</p>
              <ul>
                <li>We collect your student information solely for the purpose of facilitating the lost and found process.</li>
                <li>Your personal information will never be shared with third parties outside Gordon College.</li>
                <li>Item reports and claims will be stored for record-keeping purposes.</li>
                <li>We use cookies and local storage to improve your experience and maintain your session.</li>
                <li>You have the right to request deletion of your data upon withdrawal or graduation.</li>
              </ul>
            </div>
            <div className="terms-footer">
              <button className="accept-terms-btn" onClick={acceptTerms}>
                <FaCheckCircle />
                I Accept the Terms & Privacy Policy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Left Section */}
      <div className="login-left-section">
        <div className="login-logo-container">
          <img src={logo} alt="GC Finder Logo" className="login-logo" />
          <img src={gcLogo} alt="GC Finder Logo" className="gcfinder-login-logo" />
        </div>
        <h1>Gordon College</h1>
        <h2>Lost & Found System</h2>
      </div>

      {/* Right Section */}
      <div className="login-right-section">
        <form onSubmit={handleLogin}>
          <h2>Welcome Students!</h2>
          {error && <div className="error-message">{error}</div>}
          <div className="input-group">
            <FaIdCard className="input-icon" />
            <input
              type="text"
              placeholder="Student ID"
              value={studentId}
              onChange={handleStudentIdChange}
              disabled={loading}
            />
          </div>
          <div className="input-group">
            <FaLock className="input-icon" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
            <button
              type="button"
              className="password-toggle"
              onClick={togglePasswordVisibility}
              disabled={loading}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p className="terms-link">
            By signing in, you agree to our <button type="button" className="text-button" onClick={() => setShowTermsModal(true)}>Terms & Privacy Policy</button>
          </p>
      </div>
    </div>
  );
};

export default Login; 