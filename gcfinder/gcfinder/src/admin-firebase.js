import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';
import { getStorage } from 'firebase/storage';

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
export const analytics = getAnalytics(app);
export const storage = getStorage(app);

// Admin login function
export const loginWithAdminEmail = async (email, password) => {
  try {
    // Query Firestore for the admin
    const adminsRef = collection(db, 'admin');
    const q = query(adminsRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      throw new Error('Admin email not found');
    }
    
    const adminDoc = querySnapshot.docs[0];
    const adminData = adminDoc.data();
    
    // Check if password matches
    if (adminData.password !== password) {
      throw new Error('Incorrect password');
    }
    
    return {
      id: adminDoc.id,
      ...adminData
    };
  } catch (error) {
    throw error;
  }
};

// Get all users from Firestore
export const getAllUsers = async () => {
  try {
    const usersRef = collection(db, 'students');
    const querySnapshot = await getDocs(usersRef);
    
    const users = [];
    querySnapshot.forEach((doc) => {
      const userData = doc.data();
      users.push({
        id: doc.id,
        name: userData.name || `${userData.full_name}`,
        email: userData.email || `${userData.student_id}@gordoncollege.edu.ph`,
        year_level: userData.year_level || 'N/A',
        status: userData.status || 'active'
      });
    });
    
    return users;
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

// Get items that need admin approval
export const getPendingItems = async () => {
  try {
    const itemsRef = collection(db, 'items');
    const q = query(itemsRef, where('adminApproval', '==', false));
    const querySnapshot = await getDocs(q);
    
    const items = [];
    querySnapshot.forEach((doc) => {
      const itemData = doc.data();
      items.push({
        id: doc.id,
        title: itemData.name,
        category: itemData.category,
        status: 'pending',
        date: itemData.date,
        image: itemData.imageData?.[0]?.dataUrl || 'https://via.placeholder.com/150',
        images: itemData.imageData?.map(img => img.dataUrl) || [],
        description: itemData.description,
        location: itemData.location,
        exactLocation: itemData.exactLocation,
        uniqueIdentifier: itemData.uniqueIdentifier,
        additionalDetails: itemData.additionalDetails,
        submitter: {
          full_name: itemData.submitter?.full_name || 'N/A',
          student_id: itemData.submitter?.student_id || null
        }
      });
    });
    
    return items;
  } catch (error) {
    console.error("Error getting pending items:", error);
    throw error;
  }
};

// Approve item function
export const approveItem = async (itemId) => {
  try {
    const itemRef = doc(db, 'items', itemId);
    await updateDoc(itemRef, {
      adminApproval: true,
      status: 'Unclaimed',
      updatedAt: serverTimestamp()
    });
    console.log(`Item ${itemId} approved and status set to Unclaimed.`);
    return true;
  } catch (error) {
    console.error("Error approving item:", error);
    throw error;
  }
};

// Disapprove item function
export const disapproveItem = async (itemId) => {
  try {
    const itemRef = doc(db, 'items', itemId);
    await updateDoc(itemRef, {
      status: 'Disapproved',
      adminApproval: true, // True para di nagpapakita sa pending items
      updatedAt: serverTimestamp()
    });
    console.log(`Item ${itemId} has been disapproved and status updated.`);
    return true;
  } catch (error) {
    console.error(`Error disapproving item ${itemId}:`, error);
    throw error;
  }
};

// Get all items from Firestore /ITEM MANAGEMENT
export const getAllItems = async () => {
    try {
        const itemsCollectionRef = collection(db, "items");
        const q = query(
            itemsCollectionRef,
            where('adminApproval', '==', true)
        );
        const itemSnapshot = await getDocs(q);
        const itemList = itemSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return itemList;
    } catch (error) {
        console.error("Error fetching all items: ", error);
        throw error; // Re-throw the error so the calling component can handle it
    }
};

export const deleteItemFromDb = async (itemId) => {
    try {
        const itemRef = doc(db, 'items', itemId);
        await deleteDoc(itemRef);
        console.log("Item deleted successfully from Firestore: ", itemId);

        // Delete all claims associated with the deleted item
        const claimsRef = collection(db, 'claims');
        const q = query(claimsRef, where('itemId', '==', itemId));
        const querySnapshot = await getDocs(q);

        const deletePromises = [];
        querySnapshot.forEach((claimDoc) => {
            deletePromises.push(deleteDoc(doc(db, 'claims', claimDoc.id)));
        });
        await Promise.all(deletePromises);
        console.log('All claims for deleted item removed successfully.');

    } catch (error) {
        console.error("Error deleting item from Firestore: ", error);
        throw error; // Re-throw the error so the calling component can handle it
    }
};

export const archiveItemInDb = async (itemId) => {
  try {
    const itemRef = doc(db, 'items', itemId);
    
    // First, get the current item to store its previous status
    const itemDoc = await getDoc(itemRef);
    const currentStatus = itemDoc.data()?.status;
    
    await updateDoc(itemRef, {
      status: 'archived',
      previousStatus: currentStatus, // Store the previous status
      updatedAt: serverTimestamp()
    });

    // Delete pending claims associated with the archived item
    const claimsRef = collection(db, 'claims');
    const q = query(claimsRef, where('itemId', '==', itemId), where('claimStatus', '==', 'Pending'));
    const querySnapshot = await getDocs(q);
    
    const deletePromises = [];
    querySnapshot.forEach((claimDoc) => {
      deletePromises.push(deleteDoc(doc(db, 'claims', claimDoc.id)));
    });
    await Promise.all(deletePromises);

    console.log('Item archived successfully in Firestore with ID:', itemId);
    console.log('Pending claims for archived item deleted successfully.');
  } catch (error) {
    console.error('Error archiving item in Firestore:', error);
    throw error;
  }
};

export const unarchiveItemInDb = async (itemId) => {
  try {
    const itemRef = doc(db, 'items', itemId);
    
    // Get the current item to retrieve its previous status
    const itemDoc = await getDoc(itemRef);
    const itemData = itemDoc.data();
    const previousStatus = itemData?.previousStatus || 'Unclaimed'; // Default to 'Unclaimed' if no previous status
    
    await updateDoc(itemRef, {
      status: previousStatus,
      previousStatus: null, // Clear the previous status field
      updatedAt: serverTimestamp()
    });

    console.log(`Item unarchived successfully in Firestore with ID: ${itemId}, restored to status: ${previousStatus}`);
  } catch (error) {
    console.error('Error unarchiving item in Firestore:', error);
    throw error;
  }
};

// Batch create students in Firestore
export const batchCreateStudents = async (students) => {
  try {
    const db = getFirestore();
    const studentsRef = collection(db, 'students');
    
    const createdStudents = [];
    
    for (const student of students) {
      const docRef = await addDoc(studentsRef, {
        studentId: student.studentId,
        name: student.name,
        email: student.email,
        password: student.password,
        status: student.status || 'active',
        role: student.role || 'student',
        createdAt: serverTimestamp()
      });
      
      createdStudents.push({
        id: docRef.id,
        ...student
      });
    }
    
    return createdStudents;
  } catch (error) {
    console.error("Error creating students:", error);
    throw error;
  }
};

// Update user status in Firestore
export const updateUserStatus = async (userId, statusData) => {
  try {
    const userRef = doc(db, 'students', userId);
    await updateDoc(userRef, {
      status: statusData.status,
      ...(statusData.flagReason && { flagReason: statusData.flagReason }),
      ...(statusData.banReason && { banReason: statusData.banReason }),
      ...(statusData.banDuration && { banDuration: statusData.banDuration }),
      ...(statusData.banExpiresAt && { banExpiresAt: statusData.banExpiresAt }),
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error("Error updating user status:", error);
    throw error;
  }
}; 