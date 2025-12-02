import { 
    collection, 
    doc, 
    addDoc, 
    updateDoc, 
    setDoc,
    onSnapshot, 
    query, 
    where, 
    orderBy, 
    serverTimestamp, 
    getDoc,
    getDocs,
    limit
} from 'firebase/firestore';
import { db } from '../firebase';

class MessageService {
    constructor() {
        this.listeners = new Map();
        this.testFirebaseConnection();
    }

    // Test Firebase connection
    async testFirebaseConnection() {
        try {
            const testRef = collection(db, 'conversations');
            const testQuery = query(testRef, limit(1));
            await getDocs(testQuery);
        } catch (error) {
            console.error('Firebase connection failed:', error);
        }
    }

    // Create or get existing conversation
    async getOrCreateConversation(participants, isAdmin = false) {
        try {
            // Always ensure conversation is between admin and a student
            // participants array should contain one student ID
            let studentId;
            
            if (isAdmin) {
                // Admin is creating conversation with a student
                // participants = [studentId]
                studentId = participants[0];
            } else {
                // Student is creating conversation with admin
                // participants = [studentId]
                studentId = participants[0];
            }

            // Create participants array with both admin and student
            const conversationParticipants = ['admin', studentId];
            
            // Sort participants to ensure consistent conversation ID
            const sortedParticipants = [...conversationParticipants].sort();
            const conversationId = sortedParticipants.join('_');

            const conversationRef = doc(db, 'conversations', conversationId);
            const conversationDoc = await getDoc(conversationRef);

            if (!conversationDoc.exists()) {
                // Create new conversation
                await setDoc(conversationRef, {
                    participants: sortedParticipants,
                    createdAt: serverTimestamp(),
                    lastMessage: null,
                    lastMessageTime: serverTimestamp(),
                    unreadCount: {}
                });
            }

            return conversationId;
        } catch (error) {
            console.error('Error creating/getting conversation:', error);
            throw error;
        }
    }

    // Send a message
    async sendMessage(conversationId, senderId, senderName, text, isAdmin = false, imageData = null, lostItemId = null, lostItemImage = null, lostItemName = null) {
        try {
            const messagesRef = collection(db, 'conversations', conversationId, 'messages');
            
            const messageData = {
                text: text.trim(),
                senderId,
                senderName,
                senderType: isAdmin ? 'admin' : 'student',
                timestamp: serverTimestamp(),
                read: false
            };

            // Add image data if provided
            if (imageData) {
                messageData.imageData = imageData;
            }

            // Add lost item reference if provided
            if (lostItemId) {
                messageData.lostItemId = lostItemId;
                if (lostItemImage) {
                    messageData.lostItemImage = lostItemImage;
                }
                if (lostItemName) {
                    messageData.lostItemName = lostItemName;
                }
            }

            // Add message to subcollection
            await addDoc(messagesRef, messageData);

            // Update conversation with last message info
            const conversationRef = doc(db, 'conversations', conversationId);
            await updateDoc(conversationRef, {
                lastMessage: text.trim(),
                lastMessageTime: serverTimestamp(),
                lastSenderId: senderId,
                lastSenderName: senderName
            });

            return true;
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    }

    // Get conversations for a user - SIMPLE VERSION (no extra reads)
    getConversations(userId, isAdmin, callback) {
        try {
            let q;
            
            if (isAdmin) {
                // Admin can see all conversations
                q = query(collection(db, 'conversations'));
            } else {
                // Students can only see conversations they're part of
                q = query(
                    collection(db, 'conversations'),
                    where('participants', 'array-contains', userId)
                );
            }

            const unsubscribe = onSnapshot(q, async (snapshot) => {
                try {
                    const conversations = [];
                    
                    for (const doc of snapshot.docs) {
                        const data = doc.data();
                        
                        // Get participant info
                        let otherParticipant = null;
                        if (isAdmin) {
                            // For admin, find the student participant
                            const studentId = data.participants.find(p => p !== 'admin');
                            if (studentId) {
                                otherParticipant = await this.getUserInfo(studentId, false);
                            }
                        } else {
                            // For students, always show "Disciplinary Office"
                            otherParticipant = {
                                name: 'Disciplinary Office',
                                id: 'admin',
                                type: 'admin'
                            };
                        }

                        if (otherParticipant) {
                            conversations.push({
                                id: doc.id,
                                participant: otherParticipant,
                                lastMessage: data.lastMessage || '',
                                lastMessageTime: data.lastMessageTime,
                                lastSenderId: data.lastSenderId,
                                lastSenderName: data.lastSenderName,
                                unread: data.lastSenderId !== userId && data.lastMessage
                            });
                        }
                    }
                    
                    // Sort by lastMessageTime if available
                    conversations.sort((a, b) => {
                        const timeA = a.lastMessageTime?.toDate?.() || a.lastMessageTime || new Date(0);
                        const timeB = b.lastMessageTime?.toDate?.() || b.lastMessageTime || new Date(0);
                        return timeB - timeA;
                    });
                    
                    callback(conversations);
                } catch (error) {
                    console.error('Error processing conversations snapshot:', error);
                    callback([]);
                }
            }, (error) => {
                console.error('Error in conversations listener:', error);
                callback([]);
            });

            return unsubscribe;
        } catch (error) {
            console.error('Error setting up conversations listener:', error);
            callback([]);
            return () => {};
        }
    }

    // Get messages for a conversation
    getMessages(conversationId, callback) {
        try {
            const messagesRef = collection(db, 'conversations', conversationId, 'messages');
            const q = query(messagesRef, orderBy('timestamp', 'asc'));

            const unsubscribe = onSnapshot(q, (snapshot) => {
                const messages = [];
                snapshot.forEach((doc) => {
                    const data = doc.data();
                    messages.push({
                        id: doc.id,
                        ...data,
                        timestamp: data.timestamp?.toDate() || new Date()
                    });
                });
                callback(messages);
            });

            return unsubscribe;
        } catch (error) {
            console.error('Error getting messages:', error);
            throw error;
        }
    }

    // Get user info (student, official, or admin)
    async getUserInfo(userId, isAdmin) {
        try {
            // If looking for admin, check admin collection
            if (isAdmin) {
                const adminRef = doc(db, 'admin', userId);
                const adminDoc = await getDoc(adminRef);
                if (adminDoc.exists()) {
                    const data = adminDoc.data();
                    return {
                        id: userId,
                        name: data.position || 'Admin',
                        email: data.email,
                        type: 'admin'
                    };
                }
            }
            
            // Check students collection first
            const studentRef = doc(db, 'students', userId);
            const studentDoc = await getDoc(studentRef);
            if (studentDoc.exists()) {
                const data = studentDoc.data();
                return {
                    id: userId,
                    name: data.full_name || 'Student',
                    email: data.email || `${data.student_id}@gordoncollege.edu.ph`,
                    student_id: data.student_id,
                    type: 'student'
                };
            }
            
            // Check officials collection if not found in students
            const officialRef = doc(db, 'officials', userId);
            const officialDoc = await getDoc(officialRef);
            if (officialDoc.exists()) {
                const data = officialDoc.data();
                return {
                    id: userId,
                    name: data.full_name || data.name || 'Official',
                    email: data.email || `${data.employee_id}@gordoncollege.edu.ph`,
                    employee_id: data.employee_id,
                    type: 'official'
                };
            }
            
            return null;
        } catch (error) {
            console.error('Error getting user info:', error);
            return null;
        }
    }

    // Search for users (admin only) - searches both students and officials
    async searchUsers(searchTerm) {
        try {
            const users = [];
            const searchLower = searchTerm.toLowerCase();
            
            // Search students collection
            const studentsRef = collection(db, 'students');
            const studentsSnapshot = await getDocs(studentsRef);
            
            studentsSnapshot.forEach((doc) => {
                const data = doc.data();
                const fullName = data.full_name || '';
                const studentId = data.student_id || '';
                const email = data.email || `${studentId}@gordoncollege.edu.ph`;
                
                if (
                    fullName.toLowerCase().includes(searchLower) ||
                    studentId.includes(searchTerm) ||
                    email.toLowerCase().includes(searchLower)
                ) {
                    users.push({
                        id: doc.id,
                        name: fullName,
                        email: email,
                        student_id: studentId,
                        type: 'student'
                    });
                }
            });
            
            // Search officials collection
            const officialsRef = collection(db, 'officials');
            const officialsSnapshot = await getDocs(officialsRef);
            
            officialsSnapshot.forEach((doc) => {
                const data = doc.data();
                const fullName = data.full_name || data.name || '';
                const employeeId = data.employee_id || '';
                const email = data.email || `${employeeId}@gordoncollege.edu.ph`;
                
                if (
                    fullName.toLowerCase().includes(searchLower) ||
                    employeeId.includes(searchTerm) ||
                    email.toLowerCase().includes(searchLower)
                ) {
                    users.push({
                        id: doc.id,
                        name: fullName,
                        email: email,
                        employee_id: employeeId,
                        type: 'official'
                    });
                }
            });
            
            return users;
        } catch (error) {
            console.error('Error searching users:', error);
            return [];
        }
    }

    // Mark messages as read - SIMPLE VERSION (no extra reads)
    async markMessagesAsRead(conversationId, userId) {
        try {
            const messagesRef = collection(db, 'conversations', conversationId, 'messages');
            const q = query(
                messagesRef, 
                where('senderId', '!=', userId),
                where('read', '==', false)
            );
            
            const snapshot = await getDocs(q);
            const batch = [];
            
            snapshot.forEach((doc) => {
                batch.push(updateDoc(doc.ref, { read: true }));
            });
            
            await Promise.all(batch);
        } catch (error) {
            console.error('Error marking messages as read:', error);
        }
    }

    // Clean up listeners
    cleanup() {
        this.listeners.forEach((unsubscribe) => {
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        });
        this.listeners.clear();
    }
}

export default new MessageService(); 