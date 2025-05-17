import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import profilePic from '../assets/Profile.png';

const Messages = () => {
    const [activeConversation, setActiveConversation] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('all');
    const [messageInput, setMessageInput] = useState('');
    const [isMobileView, setIsMobileView] = useState(window.innerWidth <= 768);
    const [showChat, setShowChat] = useState(false);
    const chatMessagesRef = useRef(null);
    const messageInputRef = useRef(null);

    // Sample data for conversations - using useMemo to prevent recreation on every render
    const conversations = useMemo(() => [
        {
            id: 1,
            name: 'Dench Gregory Casaul',
            image: profilePic,
            messages: [
                {
                    id: 1,
                    text: 'Hello, I reported a lost cellphone yesterday.',
                    sent: true,
                    time: '8:12 PM'
                },
                {
                    id: 2,
                    text: 'Yes, I received a report. I will review it shortly.',
                    sent: false,
                    time: '8:42 PM'
                },
                {
                    id: 3,
                    text: 'Your lost item has been approved.',
                    sent: false,
                    time: '8:42 PM'
                }
            ],
            unread: true,
            lastMessage: 'Your lost item has been approved.',
            lastMessageTime: 'Today',
            preview: 'Your lost item has been approved.'
        },
        {
            id: 2,
            name: 'John Lawrence Asoro',
            image: profilePic,
            messages: [
                {
                    id: 1,
                    text: 'When can i pick up my cellphone?',
                    sent: true,
                    time: 'Yesterday'
                }
            ],
            unread: false,
            lastMessage: 'You: When can i pick up my cellphone?',
            lastMessageTime: 'Yesterday',
            preview: 'You: When can i pick up my cellphone?'
        }
    ], []);

    // Handle window resize to update sidebar state and mobile view
    useEffect(() => {
        const handleResize = () => {
            const isMobile = window.innerWidth <= 768;
            setIsMobileView(isMobile);
            
            // Reset mobile chat view when switching to desktop
            if (!isMobile) {
                setShowChat(false);
            }
        };
        
        // Add event listener
        window.addEventListener('resize', handleResize);
        
        // Clean up event listener on component unmount
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    // Scroll to bottom of chat messages when messages change
    useEffect(() => {
        if (chatMessagesRef.current && activeConversation) {
            chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
        }
    }, [activeConversation]);

    // Filter conversations based on search term and filter
    const filteredConversations = useMemo(() => {
        return conversations.filter(conv => {
            const matchesSearch = conv.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                 conv.preview.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesFilter = filter === 'all' || (filter === 'unread' && conv.unread);
            
            return matchesSearch && matchesFilter;
        });
    }, [conversations, searchTerm, filter]);

    // Handle conversation click
    const handleConversationClick = useCallback((conversation) => {
        setActiveConversation(conversation);
        
        if (isMobileView) {
            setShowChat(true);
        }
        
        // Mark as read (in a real app, this would update the database)
        if (conversation.unread) {
            conversation.unread = false;
        }
    }, [isMobileView]);

    // Handle sending a message
    const sendMessage = useCallback(() => {
        if (!messageInput.trim() || !activeConversation) return;
        
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // Create a new message
        const newMessage = {
            id: activeConversation.messages.length + 1,
            text: messageInput,
            sent: true,
            time: time
        };
        
        // Update the conversation with the new message
        const updatedConversation = {
            ...activeConversation,
            messages: [...activeConversation.messages, newMessage],
            lastMessage: `You: ${messageInput}`,
            lastMessageTime: 'Just now',
            preview: `You: ${messageInput}`
        };
        
        // Update the active conversation
        setActiveConversation(updatedConversation);
        
        // Clear the input
        setMessageInput('');
        
        // Focus the input for the next message
        if (messageInputRef.current) {
            messageInputRef.current.focus();
        }
    }, [messageInput, activeConversation]);

    // Handle back button click in mobile view
    const handleBackClick = useCallback(() => {
        setShowChat(false);
    }, []);

    // Handle search input change
    const handleSearchChange = useCallback((e) => {
        setSearchTerm(e.target.value);
    }, []);

    // Handle filter change
    const handleFilterChange = useCallback((newFilter) => {
        setFilter(newFilter);
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

    return (
                <div className="messages-section">
                    {/* Conversations Panel */}
                    <div className={`conversations-panel ${isMobileView && showChat ? 'hidden' : ''}`}>
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
                                    <img src={conv.image} alt="Profile" className="profile-pic" />
                                    <div className="conversation-content">
                                        <div className="conversation-header">
                                            <h4>{conv.name}</h4>
                                            <span className="time">{conv.lastMessageTime}</span>
                                        </div>
                                        <p className="preview-message">{conv.preview}</p>
                                        {conv.unread && <span className="unread-badge">1 new</span>}
                                    </div>
                                </div>
                            ))}
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
                                    <img src={activeConversation.image} alt="Profile" className="profile-pic" />
                                    <div className="chat-header-info">
                                        <h3>{activeConversation.name}</h3>
                                    </div>
                                </div>
                                <div className="chat-messages" ref={chatMessagesRef}>
                                    {activeConversation.messages.map(msg => (
                                        <div 
                                            key={msg.id} 
                                            className={`message ${msg.sent ? 'sent' : 'received'}`}
                                        >                                            
                                            <p>{msg.text}</p>
                                            <span className="time">{msg.time}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="chat-input-area">
                                    <button className="attach-btn">
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
                                    >
                                        <i className="fas fa-paper-plane"></i>
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="no-conversation-selected">
                                <i className="fas fa-comments"></i>
                                <h3>Select a conversation to start messaging</h3>
                            </div>
                        )}
                    </div>
                </div>
    );
};

export default Messages;
