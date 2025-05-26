import React, { useState, useEffect, useRef, useCallback } from 'react';
import profilePic from '../../assets/Profile.png';
import messageService from '../../services/messageService';

const Messages = () => {
    const [activeConversation, setActiveConversation] = useState(null);
    const [conversations, setConversations] = useState([]);
    const [messages, setMessages] = useState([]);
    const [messageInput, setMessageInput] = useState('');
    const [isMobileView, setIsMobileView] = useState(window.innerWidth <= 768);
    const [showChat, setShowChat] = useState(false);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);
    const chatMessagesRef = useRef(null);
    const messageInputRef = useRef(null);
    const unsubscribeConversations = useRef(null);
    const unsubscribeMessages = useRef(null);

    // Get current user from localStorage
    useEffect(() => {
        const userData = JSON.parse(localStorage.getItem('userData'));
        console.log('Student userData from localStorage:', userData);
        if (userData) {
            const user = {
                id: userData.student_id,
                name: userData.full_name || 'Student',
                email: userData.email || `${userData.student_id}@gordoncollege.edu.ph`,
                type: 'student'
            };
            console.log('Setting student currentUser:', user);
            setCurrentUser(user);
        } else {
            console.log('No userData found in localStorage');
            setLoading(false); // Stop loading if no user data
        }
    }, []);

    // Handle window resize
    useEffect(() => {
        const handleResize = () => {
            const isMobile = window.innerWidth <= 768;
            setIsMobileView(isMobile);
            
            if (!isMobile) {
                setShowChat(false);
            }
        };
        
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Load conversations when user is available
    useEffect(() => {
        if (!currentUser) return;

        setLoading(true);
        
        // Set a timeout to ensure loading doesn't get stuck
        const loadingTimeout = setTimeout(() => {
            console.log('Loading timeout reached, setting loading to false');
            setLoading(false);
        }, 10000); // 10 seconds timeout
        
        try {
            // Subscribe to conversations
            unsubscribeConversations.current = messageService.getConversations(
                currentUser.id, 
                false, // not admin
                (conversationsData) => {
                    console.log('Student conversations received:', conversationsData);
                    clearTimeout(loadingTimeout);
                    setConversations(conversationsData);
                    setLoading(false);
                    
                    // Auto-select the Disciplinary Office conversation if it exists
                    if (conversationsData.length > 0 && !activeConversation) {
                        setActiveConversation(conversationsData[0]);
                    }
                }
            );
        } catch (error) {
            console.error('Error setting up conversations listener:', error);
            clearTimeout(loadingTimeout);
            setLoading(false);
        }

        return () => {
            clearTimeout(loadingTimeout);
            if (unsubscribeConversations.current) {
                unsubscribeConversations.current();
            }
        };
    }, [currentUser]);

    // Function to create conversation when student wants to send a message
    const createConversationWithAdmin = useCallback(async () => {
        if (!currentUser) return null;
        
        try {
            const conversationId = await messageService.getOrCreateConversation(
                [currentUser.id], 
                false
            );
            
            // Create a temporary conversation object for immediate use
            const newConversation = {
                id: conversationId,
                participant: {
                    name: 'Disciplinary Office',
                    id: 'admin',
                    type: 'admin'
                },
                lastMessage: '',
                lastMessageTime: new Date(),
                unread: false
            };
            
            setActiveConversation(newConversation);
            return conversationId;
        } catch (error) {
            console.error('Error creating conversation:', error);
            return null;
        }
    }, [currentUser]);

    // Load messages when active conversation changes
    useEffect(() => {
        if (!activeConversation) return;

        // Unsubscribe from previous messages
        if (unsubscribeMessages.current) {
            unsubscribeMessages.current();
        }

        // Subscribe to messages for the active conversation
        unsubscribeMessages.current = messageService.getMessages(
            activeConversation.id,
            (messagesData) => {
                setMessages(messagesData);
            }
        );

        // Mark messages as read
        messageService.markMessagesAsRead(activeConversation.id, currentUser?.id);

        return () => {
            if (unsubscribeMessages.current) {
                unsubscribeMessages.current();
            }
        };
    }, [activeConversation, currentUser]);

    // Scroll to bottom when messages change
    useEffect(() => {
        if (chatMessagesRef.current) {
            chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
        }
    }, [messages]);

    // Handle conversation click
    const handleConversationClick = useCallback((conversation) => {
        setActiveConversation(conversation);
        
        if (isMobileView) {
            setShowChat(true);
        }
    }, [isMobileView]);

    // Handle sending a message
    const sendMessage = useCallback(async () => {
        if (!messageInput.trim() || !currentUser) return;
        
        let conversationId = activeConversation?.id;
        
        // If no active conversation, create one
        if (!conversationId) {
            conversationId = await createConversationWithAdmin();
            if (!conversationId) {
                console.error('Failed to create conversation');
                return;
            }
        }
        
        try {
            await messageService.sendMessage(
                conversationId,
                currentUser.id,
                currentUser.name,
                messageInput,
                false // not admin
            );
            
            setMessageInput('');
            
            if (messageInputRef.current) {
                messageInputRef.current.focus();
            }
        } catch (error) {
            console.error('Error sending message:', error);
        }
    }, [messageInput, activeConversation, currentUser, createConversationWithAdmin]);

    // Handle back button click in mobile view
    const handleBackClick = useCallback(() => {
        setShowChat(false);
    }, []);

    // Handle message input change
    const handleMessageInputChange = useCallback((e) => {
        setMessageInput(e.target.value);
    }, []);

    // Handle key press in message input
    const handleKeyPress = useCallback((e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    }, [sendMessage]);

    // Format timestamp
    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        
        const now = new Date();
        const messageDate = new Date(timestamp);
        const isToday = now.toDateString() === messageDate.toDateString();
        
        if (isToday) {
            return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            const isYesterday = yesterday.toDateString() === messageDate.toDateString();
            
            if (isYesterday) {
                return 'Yesterday';
            } else {
                return messageDate.toLocaleDateString();
            }
        }
    };

    if (loading) {
        return (
            <div className="messages-section loading">
                <div className="loading-spinner">
                    <i className="fas fa-spinner fa-spin"></i>
                    <p>Loading messages...</p>
                </div>
            </div>
        );
    }

    return (
                <div className="messages-section">
                    {/* Conversations Panel */}
                    <div className={`conversations-panel ${isMobileView && showChat ? 'hidden' : ''}`}>
                        <div className="message-search-bar">
                    <div className="student-conversations-header">
                        <h3>Messages</h3>
                        <p>Chat with Disciplinary Office</p>
                            </div>
                        </div>
                        <div className="conversations-list">
                    {conversations.map(conv => (
                                <div 
                                    key={conv.id} 
                                    className={`conversation-item ${activeConversation?.id === conv.id ? 'active' : ''}`}
                                    onClick={() => handleConversationClick(conv)}
                                >
                            <img src={profilePic} alt="Profile" className="profile-pic" />
                                    <div className="conversation-content">
                                        <div className="conversation-header">
                                    <h4>{conv.participant.name}</h4>
                                    <span className="time">
                                        {formatTime(conv.lastMessageTime?.toDate())}
                                    </span>
                                        </div>
                                <p className="preview-message">
                                    {conv.lastMessage ? (
                                        conv.lastSenderId === currentUser?.id 
                                            ? `You: ${conv.lastMessage}`
                                            : conv.lastMessage
                                    ) : 'Start a conversation'}
                                </p>
                                        {conv.unread && <span className="unread-badge">1 new</span>}
                                    </div>
                                </div>
                            ))}
                    
                    {conversations.length === 0 && (
                        <div className="no-conversations">
                            <i className="fas fa-comments"></i>
                            <p>No conversations yet</p>
                            <small>Start a conversation with the Disciplinary Office by typing a message below</small>
                        </div>
                    )}
                        </div>
                    </div>

                    {/* Chat Panel */}
                    <div className={`chat-panel ${isMobileView && !showChat ? 'hidden' : ''}`}>
                        {activeConversation ? (
                            <>
                                <div className="chat-header">
                                    {isMobileView && (
                                        <button className="back-button" onClick={handleBackClick}>
                                            <i className="fas fa-arrow-left"></i>
                                        </button>
                                    )}
                            <img src={profilePic} alt="Profile" className="profile-pic" />
                                    <div className="chat-header-info">
                                <h3>{activeConversation.participant.name}</h3>
                                <span className="status">Available</span>
                                    </div>
                                </div>
                                <div className="chat-messages" ref={chatMessagesRef}>
                            {messages.map(msg => (
                                        <div 
                                            key={msg.id} 
                                    className={`message ${msg.senderId === currentUser?.id ? 'sent' : 'received'}`}
                                        >                                            
                                            <p>{msg.text}</p>
                                    <span className="time">{formatTime(msg.timestamp)}</span>
                                        </div>
                                    ))}
                            
                            {messages.length === 0 && (
                                <div className="no-messages">
                                    <i className="fas fa-comments"></i>
                                    <p>No messages yet</p>
                                    <small>Start the conversation by sending a message below</small>
                                </div>
                            )}
                                </div>
                                <div className="chat-input-area">
                            <button className="attach-btn" disabled>
                                        <i className="fas fa-paperclip"></i>
                                    </button>
                                    <input 
                                        type="text" 
                                        placeholder="Type a message..." 
                                        value={messageInput}
                                        onChange={handleMessageInputChange}
                                        onKeyPress={handleKeyPress}
                                        ref={messageInputRef}
                                    />
                                    <button 
                                        className="send-btn"
                                        onClick={sendMessage}
                                disabled={!messageInput.trim()}
                                    >
                                        <i className="fas fa-paper-plane"></i>
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="no-conversation-selected">
                                    <i className="fas fa-comments"></i>
                                    <h3>Chat with Disciplinary Office</h3>
                                    <p>Type a message below to start a conversation</p>
                                </div>
                                <div className="chat-input-area">
                                    <button className="attach-btn" disabled>
                                        <i className="fas fa-paperclip"></i>
                                    </button>
                                    <input 
                                        type="text" 
                                        placeholder="Type your first message..." 
                                        value={messageInput}
                                        onChange={handleMessageInputChange}
                                        onKeyPress={handleKeyPress}
                                        ref={messageInputRef}
                                    />
                                    <button 
                                        className="send-btn"
                                        onClick={sendMessage}
                                        disabled={!messageInput.trim()}
                                    >
                                        <i className="fas fa-paper-plane"></i>
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
    );
};

export default Messages;
