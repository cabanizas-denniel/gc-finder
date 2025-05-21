import React from 'react';
import { useNavigate } from 'react-router-dom';
import gcLogo from '../../assets/gc-finder-logo.png';

const NotFound = () => {
    const navigate = useNavigate();
    
    const goBack = () => {
        navigate(-1); // Go back to the previous page
    };

    return (
        <div className="not-found-container">
            <div className="not-found-content">
                <img src={gcLogo} alt="GC Finder Logo" className="not-found-logo" />
                <h1>404</h1>
                <h2>Page Not Found</h2>
                <p>
                    The page you were looking for was moved or doesn't exist. 
                    You may have typed the address incorrectly or you may have used an outdated link.
                </p>
                <div className="not-found-buttons">
                    <button className="go-back-btn" onClick={goBack}>
                        <i className="fas fa-arrow-left"></i> Go Back
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NotFound; 