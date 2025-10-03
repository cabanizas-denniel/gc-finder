import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';
import { getStorage } from 'firebase/storage';

// Helper function to get Firebase ID token for API requests
const getAuthToken = async () => {
  // Wait for auth to be ready
  return new Promise((resolve, reject) => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      unsubscribe();
      if (!user) {
        reject(new Error('User not authenticated. Please log in again.'));
        return;
      }
      try {
        const token = await user.getIdToken();
        resolve(token);
      } catch (error) {
        reject(error);
      }
    });
    
    // Timeout after 5 seconds
    setTimeout(() => {
      unsubscribe();
      reject(new Error('Authentication timeout. Please refresh and try again.'));
    }, 5000);
  });
};

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCyCN4ur2Z0kwZzbc1V1XVMGDnV2kvLNfk",
  authDomain: "gcfinder-database.firebaseapp.com",
  databaseURL: "https://gcfinder-database-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "gcfinder-database",
  storageBucket: "gcfinder-database.firebasestorage.app",
  messagingSenderId: "864225449977",
  appId: "1:864225449977:web:d7f60ab7074d00be7c8f28",
  measurementId: "G-VSEJBNE3BH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const analytics = getAnalytics(app);
export const storage = getStorage(app);

// Admin login function
export const loginWithAdminEmail = async (email, password) => {
  try {
    // Authenticate the admin using Firebase Auth
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // After successful authentication, get the admin's data from Firestore using their UID.
    const adminDocRef = doc(db, 'admin', user.uid);
    const adminDoc = await getDoc(adminDocRef);
    
    if (!adminDoc.exists()) {
      throw new Error('Admin data not found in Firestore. Please ensure the admin document ID matches the Firebase Auth UID.');
    }
    
    const adminData = adminDoc.data();
    
    return {
      id: adminDoc.id,
      uid: user.uid, // Include Firebase Auth UID
      ...adminData
    };
  } catch (error) {
    // Handle specific auth errors
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      throw new Error('Invalid admin email or password.');
    }
    console.error("Admin login error:", error);
    throw new Error('An unexpected error occurred during admin login.');
  }
};

// Get all users from backend API (secure)
export const getAllUsers = async () => {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${process.env.REACT_APP_API_URL}/api/users`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch users');
    }

    const data = await response.json();
    return data.users;
  } catch (error) {
    console.error("Error getting users:", error);
    throw error;
  }
};

// Submit found item to Firebase
export const submitFoundItem = async (formData, images) => {
  try {
    // Storing images directly to Firestore
    const imageData = images.map(image => ({
      id: image.id,
      dataUrl: image.src,
      name: image.name
    }));
    
    // Create item object
    const itemData = {
      name: formData.itemName,
      description: formData.description,
      location: formData.location,
      date: formData.dateFound,
      category: formData.category,
      exactLocation: formData.exactLocation,
      uniqueIdentifier: formData.uniqueIdentifier || '',
      additionalDetails: formData.additionalDetails || '',
      imageData: imageData,
      status: 'Unclaimed',
      adminApproval: true,
      submitter: {
        full_name: 'Disciplinary Office',
        student_id: 'N/A',
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    // Add to Firestore
    const itemsRef = collection(db, 'items');
    const docRef = await addDoc(itemsRef, itemData);
    
    return {
      id: docRef.id,
      ...itemData
    };
  } catch (error) {
    console.error('Error submitting item:', error);
    throw error;
  }
};

// Get items that need admin approval via backend API (secure)
export const getPendingItems = async () => {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${process.env.REACT_APP_API_URL}/api/items/pending`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to fetch pending items (${response.status})`);
    }

    const data = await response.json();
    return data.items;
  } catch (error) {
    console.error("Error getting pending items:", error);
    throw error;
  }
};

// Approve item via backend API (secure)
export const approveItem = async (itemId) => {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${process.env.REACT_APP_API_URL}/api/items/${itemId}/approve`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to approve item');
    }

    const data = await response.json();
    console.log(data.message);
    return true;
  } catch (error) {
    console.error("Error approving item:", error);
    throw error;
  }
};

// Disapprove item via backend API (secure)
export const disapproveItem = async (itemId) => {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${process.env.REACT_APP_API_URL}/api/items/${itemId}/disapprove`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to disapprove item');
    }

    const data = await response.json();
    console.log(data.message);
    return true;
  } catch (error) {
    console.error(`Error disapproving item ${itemId}:`, error);
    throw error;
  }
};

// Get all items via backend API (secure) /ITEM MANAGEMENT
export const getAllItems = async () => {
    try {
        const token = await getAuthToken();
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/items`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Failed to fetch items (${response.status})`);
        }

        const data = await response.json();
        return data.items;
    } catch (error) {
        console.error("Error fetching all items: ", error);
        throw error;
    }
};

export const deleteItemFromDb = async (itemId) => {
    try {
        const token = await getAuthToken();
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/items/${itemId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to delete item');
        }

        const data = await response.json();
        console.log(data.message);
    } catch (error) {
        console.error("Error deleting item: ", error);
        throw error;
    }
};

export const archiveItemInDb = async (itemId) => {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${process.env.REACT_APP_API_URL}/api/items/${itemId}/archive`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to archive item');
    }

    const data = await response.json();
    console.log(data.message);
  } catch (error) {
    console.error('Error archiving item:', error);
    throw error;
  }
};

export const unarchiveItemInDb = async (itemId) => {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${process.env.REACT_APP_API_URL}/api/items/${itemId}/unarchive`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to unarchive item');
    }

    const data = await response.json();
    console.log(data.message);
  } catch (error) {
    console.error('Error unarchiving item:', error);
    throw error;
  }
};

// Update user status via backend API (secure)
export const updateUserStatus = async (userId, statusData) => {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${process.env.REACT_APP_API_URL}/api/users/${userId}/status`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(statusData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update user status');
    }

    return true;
  } catch (error) {
    console.error("Error updating user status:", error);
    throw error;
  }
};

// Get dashboard statistics via backend API (secure)
export const getDashboardStats = async () => {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${process.env.REACT_APP_API_URL}/api/dashboard/stats`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to fetch dashboard stats (${response.status})`);
    }

    const data = await response.json();
    return data.stats;
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    throw error;
  }
};

// Get claims via backend API (secure, role-based)
export const getClaims = async () => {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${process.env.REACT_APP_API_URL}/api/claims`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to fetch claims (${response.status})`);
    }

    const data = await response.json();
    return data.claims;
  } catch (error) {
    console.error("Error fetching claims:", error);
    throw error;
  }
};

// Browse items for students via backend API (secure, filters claimed items)
export const browseItems = async () => {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${process.env.REACT_APP_API_URL}/api/items/browse`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to browse items (${response.status})`);
    }

    const data = await response.json();
    return data; // Returns { items, userSubmittedCount }
  } catch (error) {
    console.error("Error browsing items:", error);
    throw error;
  }
};

// Update claim status via backend API (secure, admin only)
export const updateClaimStatus = async (claimId, updateData) => {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${process.env.REACT_APP_API_URL}/api/claims/${claimId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to update claim (${response.status})`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error updating claim ${claimId}:`, error);
    throw error;
  }
}; 