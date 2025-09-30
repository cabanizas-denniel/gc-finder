import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaIdCard, FaLock, FaEye, FaEyeSlash, FaCheckCircle, FaInfoCircle } from 'react-icons/fa';
import gcLogo from '../../assets/gc-finder.png';
import logo from '../../assets/gc-logo.png';
import { loginWithAdminEmail } from '../../admin-firebase';

const Login = () => {
  const [email, setEmail] = useState('');
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

    if (!email || !password) {
      setError('Please enter both email and password');
      // Clear error message after 3 seconds
      setTimeout(() => {
        setError('');
      }, 3000);
      setLoading(false);
      return;
    }

    try {      const userData = await loginWithAdminEmail(email, password);
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('isAdmin', 'true');
      localStorage.setItem('userData', JSON.stringify(userData));
      navigate('/admin/dashboard');
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

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    setError(''); // Clear any previous error
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
              <p>Welcome to GC Finder Admin Dashboard. By using this application, you agree to the following terms:</p>
              <ul>
                <li>You will maintain the confidentiality of your admin credentials.</li>
                <li>You will use the system only for authorized administrative purposes.</li>
                <li>You understand that unauthorized access attempts may result in administrative action.</li>
                <li>You will respect the privacy of student data and not misuse any information obtained through the system.</li>
              </ul>

              <h3>Privacy Policy</h3>
              <p>At GC Finder Admin Dashboard, we are committed to protecting your privacy:</p>
              <ul>
                <li>We collect your admin information solely for the purpose of system administration.</li>
                <li>Your personal information will never be shared with third parties outside Gordon College.</li>
                <li>System logs and activities will be stored for security and audit purposes.</li>
                <li>We use cookies and local storage to improve your experience and maintain your session.</li>
                <li>You have the right to request deletion of your data upon termination of admin privileges.</li>
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
          <h2>Welcome Admin!</h2>
          {error && <div className="error-message">{error}</div>}
          <div className="input-group">
            <FaIdCard className="input-icon" />
            <input
              type="email"
              placeholder="Admin Email"
              value={email}
              onChange={handleEmailChange}
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