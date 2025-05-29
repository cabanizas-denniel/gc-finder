import React, { useState, useEffect, useRef, useCallback } from 'react';
import profilePic from '../../assets/Profile.png';
import messageService from '../../services/messageService';

const Messages = () => {
    const [activeConversation, setActiveConversation] = useState(null);
    const [conversations, setConversations] = useState([]);
    const [messages, setMessages] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('all');
    const [messageInput, setMessageInput] = useState('');
    const [isMobileView, setIsMobileView] = useState(window.innerWidth <= 768);
    const [showChat, setShowChat] = useState(false);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showNewMessageModal, setShowNewMessageModal] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const chatMessagesRef = useRef(null);
    const messageInputRef = useRef(null);
    const fileInputRef = useRef(null);
    const unsubscribeConversations = useRef(null);
    const unsubscribeMessages = useRef(null);

    // Get current user from localStorage
    useEffect(() => {
        const userData = JSON.parse(localStorage.getItem('userData'));
        console.log('Admin userData from localStorage:', userData);
        if (userData) {
            const user = {
                id: 'admin', // Use 'admin' as identifier
                name: userData.position || 'Admin',
                email: userData.email,
                type: 'admin'
            };
            console.log('Setting admin currentUser:', user);
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
                true, // is admin
                (conversationsData) => {
                    console.log('Admin conversations received:', conversationsData);
                    clearTimeout(loadingTimeout);
                    setConversations(conversationsData);
                    setLoading(false);
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

    // Search users when search term changes
    useEffect(() => {
        const searchUsers = async () => {
            if (searchTerm.trim().length > 0) {
                setIsSearching(true);
                try {
                    const results = await messageService.searchUsers(searchTerm);
                    setSearchResults(results);
                } catch (error) {
                    console.error('Error searching users:', error);
                } finally {
                    setIsSearching(false);
                }
            } else {
                setSearchResults([]);
            }
        };

        const timeoutId = setTimeout(searchUsers, 300); // Debounce search
        return () => clearTimeout(timeoutId);
    }, [searchTerm]);

    // Filter conversations based on search term and filter
    const filteredConversations = conversations.filter(conv => {
        const matchesSearch = !searchTerm || 
            conv.participant.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            (conv.lastMessage && conv.lastMessage.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesFilter = filter === 'all' || (filter === 'unread' && conv.unread);
        
        return matchesSearch && matchesFilter;
    });

    // Handle conversation click
    const handleConversationClick = useCallback((conversation) => {
        setActiveConversation(conversation);
        
        if (isMobileView) {
            setShowChat(true);
        }
    }, [isMobileView]);

    // Handle new conversation with user
    const handleStartConversation = useCallback(async (user) => {
        try {
            const conversationId = await messageService.getOrCreateConversation(
                [user.id], 
                true // is admin
            );
            
            // Find or create conversation object
            const existingConv = conversations.find(c => c.id === conversationId);
            if (existingConv) {
                setActiveConversation(existingConv);
            } else {
                // Create temporary conversation object
                const newConv = {
                    id: conversationId,
                    participant: user,
                    lastMessage: '',
                    lastMessageTime: new Date(),
                    unread: false
                };
                setActiveConversation(newConv);
            }
            
            setSearchTerm('');
            setSearchResults([]);
            setShowNewMessageModal(false);
            
            if (isMobileView) {
                setShowChat(true);
            }
        } catch (error) {
            console.error('Error starting conversation:', error);
        }
    }, [conversations, isMobileView]);

    // Handle filter change
    const handleFilterChange = useCallback((newFilter) => {
        setFilter(newFilter);
    }, []);

    // Handle attach button click
    const handleAttachClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    // Handle image selection and clear
    const handleImageSelect = useCallback((e) => {
        const file = e.target.files[0];
        if (file?.type.startsWith('image/')) {
            setSelectedImage(file);
            const reader = new FileReader();
            reader.onload = (e) => setImagePreview(e.target.result);
            reader.readAsDataURL(file);
        }
    }, []);

    const clearSelectedImage = useCallback(() => {
        setSelectedImage(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }, []);

    // Handle sending a message
    const sendMessage = useCallback(async () => {
        if ((!messageInput.trim() && !selectedImage) || !activeConversation || !currentUser) return;
        
        try {
            let messageText = messageInput.trim();
            let imageData = null;
            
            if (selectedImage) {
                imageData = await new Promise(resolve => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target.result);
                    reader.readAsDataURL(selectedImage);
                });
                if (!messageText) messageText = '[Image]';
            }
            
            await messageService.sendMessage(
                activeConversation.id,
                currentUser.id,
                currentUser.name,
                messageText,
                true,
                imageData
            );
            
            setMessageInput('');
            clearSelectedImage();
            messageInputRef.current?.focus();
        } catch (error) {
            console.error('Error sending message:', error);
        }
    }, [messageInput, selectedImage, activeConversation, currentUser, clearSelectedImage]);

    // Handle back button click in mobile view
    const handleBackClick = useCallback(() => {
        setShowChat(false);
    }, []);

    // Handle search input change
    const handleSearchChange = useCallback((e) => {
        setSearchTerm(e.target.value);
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
            {/* New Message Modal */}
            {showNewMessageModal && (
                <div className="modal-overlay" onClick={() => setShowNewMessageModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Start New Conversation</h3>
                            <button 
                                className="close-btn"
                                onClick={() => setShowNewMessageModal(false)}
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="message-search-input">
                                <i className="fas fa-search"></i>
                                <input
                                    type="text"
                                    placeholder="Search for students..."
                                    value={searchTerm}
                                    onChange={handleSearchChange}
                                    autoFocus
                                />
                            </div>
                            
                            {isSearching && (
                                <div className="search-loading">
                                    <i className="fas fa-spinner fa-spin"></i>
                                    <span>Searching...</span>
                                </div>
                            )}
                            
                            <div className="search-results">
                                {searchResults.map(user => (
                                    <div 
                                        key={user.id}
                                        className="user-result"
                                        onClick={() => handleStartConversation(user)}
                                    >
                                        <img src={profilePic} alt="Profile" className="profile-pic" />
                                        <div className="user-info">
                                            <h4>{user.name}</h4>
                                            <p>{user.email}</p>
                                        </div>
                                    </div>
                                ))}
                                
                                {searchTerm && !isSearching && searchResults.length === 0 && (
                                    <div className="no-results">
                                        <i className="fas fa-search"></i>
                                        <p>No students found</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Conversations Panel */}
            <div className={`conversations-panel ${isMobileView && showChat ? 'hidden' : ''}`}>
                <div className="conversations-header">
                    <h3>Messages</h3>
                    <button 
                        className="new-message-btn"
                        onClick={() => setShowNewMessageModal(true)}
                    >
                        <i className="fas fa-plus"></i>
                        New Message
                    </button>
                </div>
                <div className="message-search-bar">
                    <div className="message-search-input">
                        <i className="fas fa-search"></i>
                        <input 
                            type="text" 
                            placeholder="Search conversations..." 
                            value={searchTerm}
                            onChange={handleSearchChange}
                        />
                    </div>
                    <div className="filter-tabs">
                        <button 
                            className={`tab ${filter === 'all' ? 'active' : ''}`}
                            onClick={() => handleFilterChange('all')}
                        >
                            All
                        </button>
                        <button 
                            className={`tab ${filter === 'unread' ? 'active' : ''}`}
                            onClick={() => handleFilterChange('unread')}
                        >
                            Unread
                        </button>
                    </div>
                </div>
                <div className="conversations-list">
                    {filteredConversations.map(conv => (
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
                                        {formatTime(conv.lastMessageTime?.toDate?.() || conv.lastMessageTime)}
                                    </span>
                                </div>
                                <p className="preview-message">
                                    {conv.lastMessage ? (
                                        conv.lastSenderId === currentUser?.id 
                                            ? `You: ${conv.lastMessage}`
                                            : conv.lastMessage
                                    ) : 'No messages yet'}
                                </p>
                                {conv.unread && <span className="unread-badge">Reply?</span>}
                            </div>
                        </div>
                    ))}
                    
                    {filteredConversations.length === 0 && (
                        <div className="no-conversations">
                            <i className="fas fa-comments"></i>
                            <p>No conversations found</p>
                            <small>
                                {searchTerm 
                                    ? 'Try a different search term' 
                                    : 'Start a new conversation to see it here'
                                }
                            </small>
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
                                <span className="status">
                                    {activeConversation.participant.email}
                                </span>
                            </div>
                        </div>
                        <div className="chat-messages" ref={chatMessagesRef}>
                            {messages.map(msg => (
                                <div 
                                    key={msg.id} 
                                    className={`message ${msg.senderId === currentUser?.id ? 'sent' : 'received'}`}
                                >
                                    {msg.imageData && (
                                        <div className="message-image">
                                            <img src={msg.imageData} alt="Shared image" />
                                        </div>
                                    )}
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
                            <button className="attach-btn" onClick={handleAttachClick}>
                                <i className="fas fa-paperclip"></i>
                            </button>
                            
                            <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" style={{ display: 'none' }} />
                            
                            {imagePreview && (
                                <div className="image-preview">
                                    <img src={imagePreview} alt="Preview" className="preview-image" />
                                    <button className="remove-image" onClick={clearSelectedImage}><i className="fas fa-times"></i></button>
                                </div>
                            )}
                            
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
                                disabled={!messageInput.trim() && !selectedImage}
                            >
                                <i className="fas fa-paper-plane"></i>
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="no-conversation-selected">
                        <i className="fas fa-comments"></i>
                        <h3>Select a conversation to start messaging</h3>
                        <p>Choose from existing conversations or start a new one</p>
                        <button 
                            className="start-conversation-btn"
                            onClick={() => setShowNewMessageModal(true)}
                        >
                            Start New Conversation
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Messages;
