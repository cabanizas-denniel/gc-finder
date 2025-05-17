import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import profilePic from '../../assets/Profile.png';

const Help = () => {
    const navigate = useNavigate();

    // Handle contact button clicks
    const handleSendMessage = useCallback(() => {
        navigate('/messages');
    }, [navigate]);

    const handleVisitOffice = useCallback(() => {
        window.open('https://www.google.com/maps/search/Gordon+College+Olongapo+City', '_blank');
    }, []);

    return (
                <section className="help-center">
                    <h1>About GC Finder</h1>
                    <p className="platform-description">Gordon College's official lost and found platform. Connecting students with their missing belongings.</p>

                    <div className="mission-section">
                        <h2>Our Mission</h2>
                        <p>GC Finder was created with a simple mission: to reunite Gordon College students with their lost items quickly and efficiently. We understand how disruptive losing personal belongings can be to student life. That's why we develop a streamlined platform that leverages technology to make the lost and found process as seamless as possible.</p>
                    </div>

                    <div className="how-it-works">
                        <h2>How GC Finder works</h2>
                        <div className="steps-container">
                            <div className="step-card">
                                <div className="step-number">1</div>
                                <h3>Report lost items</h3>
                                <p>Students can easily report lost items through our platform, providing detailed descriptions and security questions that only the true owner would know.</p>
                            </div>
                            <div className="step-card">
                                <div className="step-number">2</div>
                                <h3>Browse found items</h3>
                                <p>Browse though items that have been found on campus, with detailed information about where and when they are discovered.</p>
                            </div>
                            <div className="step-card">
                                <div className="step-number">3</div>
                                <h3>Secure verification</h3>
                                <p>Our verification system ensures items are returned to their rightful owners through security questions and administrative oversight.</p>
                            </div>
                        </div>
                    </div>

                    <div className="team-section">
                        <h2>Meet the Team</h2>
                        <p>GC Finder is managed by the Gordon College Disciplinary Office, working in collaboration with the CS students named JavaWokeez.</p>
                        <div className="team-members">
                            <div className="team-member">
                                <img src={profilePic} alt="Disciplinary Office" />
                                <h3>Disciplinary Office</h3>
                                <p>Oversees the verification and approval process.</p>
                            </div>
                            <div className="team-member">
                                <img src={profilePic} alt="Javawockeez" />
                                <h3>Javawockeez</h3>
                                <p>Development & Maintenance Team</p>
                            </div>
                        </div>
                    </div>

                    <div className="contact-section">
                        <h2>Contact Us</h2>
                        <div className="contact-container">
                            <div className="contact-info">
                                <h3>Get in Touch</h3>
                                <p><i className="fas fa-map-marker-alt"></i> Gordon College, Olongapo City, Philippines</p>
                                <p><i className="fas fa-phone"></i> (63) 968-323-3287</p>
                                <p><i className="fas fa-envelope"></i> disciplinary@gordoncollege.edu.ph</p>
                                <div className="contact-buttons">
                                    <button 
                                        className="send-message-btn"
                                        onClick={handleSendMessage}
                                    >
                                        Send Message
                                    </button>
                                    <button 
                                        className="visit-office-btn"
                                        onClick={handleVisitOffice}
                                    >
                                        Visit Office
                                    </button>
                                </div>
                            </div>
                            <div className="office-hours">
                                <h3>Office Hours</h3>
                                <div className="hours-list">
                                    <div className="hours-item">
                                        <span>Monday to Friday</span>
                                        <span>8:00AM - 5:00PM</span>
                                    </div>
                                    <div className="hours-item">
                                        <span>Lunch Break</span>
                                        <span>12:00PM - 1:00PM</span>
                                    </div>
                                    <div className="hours-item">
                                        <span>Saturday & Sunday</span>
                                        <span>Closed</span>
                                    </div>
                                </div>
                                <p className="note">For queries outside office hours, please email us and we'll respond as soon as possible</p>
                            </div>
                        </div>
                    </div>
                </section>
    );
};

export default Help;
