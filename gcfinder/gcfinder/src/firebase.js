import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCyCN4ur2Z0kwZzbc1V1XVMGDnV2kvLNfk",
  authDomain: "gcfinder-database.firebaseapp.com",
  databaseURL: "https://gcfinder-database-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "gcfinder-database",
  storageBucket: "gcfinder-database.appspot.com",
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

// Login function
export const loginWithStudentId = async (studentId, password) => {
  try {
    // Student IDs are not emails, so we need to construct the email.
    const email = `${studentId}@gordoncollege.edu.ph`;
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // After successful authentication, get the user's data from Firestore using their UID.
    const studentDocRef = doc(db, 'students', user.uid);
    const studentDoc = await getDoc(studentDocRef);

    if (!studentDoc.exists()) {
      // This case should be rare if auth succeeded, but good for data consistency.
      throw new Error('Student data not found in Firestore.');
    }
    
    const studentData = studentDoc.data();
    
    return {
      id: studentDoc.id,
      ...studentData
    };
  } catch (error) {
    // Handle specific auth errors
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      throw new Error('Invalid student ID or password.');
    }
    console.error("Login error:", error);
    throw new Error('An unexpected error occurred. Please try again.');
  }
};

// Submit found item to Firebase
export const submitFoundItem = async (formData, images) => {
  try {
    // Instead of uploading to Storage, store image data directly
    const imageData = images.map(image => ({
      id: image.id,
      dataUrl: image.src, // Already contains the resized data URL
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
      imageData: imageData, // Store full image data
      status: 'Pending', // Initial status - matching what's shown in the UI
      adminApproval: false, // Set to false by default for admin review
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      // Add submitter information
      submitter: {
        student_id: formData.student_id,
        full_name: formData.full_name,
        submitted_at: formData.submitted_at
      }
    };
    
    // Add to Firestore collection
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

// Utility function to approve/unapprove an item
export const setItemApproval = async (itemId, isApproved) => {
  try {
    const itemRef = doc(db, 'items', itemId);
    const updateData = {
      adminApproval: isApproved,
      updatedAt: serverTimestamp()
    };

    if (isApproved === false) {
      updateData.status = "Disapproved";
    }
    // If isApproved is true, we might want to set status to 'Available'
    // or handle it based on prior status, but for now, only handling disapproval.

    await updateDoc(itemRef, updateData);
    return true;
  } catch (error) {
    console.error('Error updating item approval status:', error);
    throw error;
  }
};

// Submit a claim for an item
export const submitItemClaim = async (itemData, claimerData, claimDetails) => {
  try {
    const claimsCollectionRef = collection(db, 'claims');
    const itemRef = doc(db, 'items', itemData.id); // Reference to the original item
    
    const newClaim = {
      itemId: itemData.id,                  
      itemName: itemData.name,              
      itemImage: itemData.image || (itemData.imageData && itemData.imageData.length > 0 ? itemData.imageData[0].dataUrl : null), 
      claimerId: claimerData.student_id,    
      claimerName: claimerData.full_name,   
      lastSeenLocation: claimDetails.lastSeenLocation,
      uniqueIdentifier: claimDetails.uniqueIdentifier || '',
      additionalDetails: claimDetails.additionalDetails || '',
      proofImageUrl: claimDetails.proofImage, 
      claimStatus: 'Pending', 
      createdAt: serverTimestamp(), 
      updatedAt: serverTimestamp()
    };
    
    // 1. Add the new claim document
    const claimDocRef = await addDoc(claimsCollectionRef, newClaim);

    // 2. Don't update item status - keep it 'Unclaimed' for other students to see
    // await updateDoc(itemRef, {
    //   status: newStatusForItem,
    //   updatedAt: serverTimestamp()
    // });
    
    return {
      id: claimDocRef.id,
      ...newClaim
      // itemNewStatus: newStatusForItem // Remove since we're not updating status
    };
  } catch (error) {
    console.error('Error submitting item claim and updating item status:', error);
    throw error; 
  }
};

// Function for students to delete their own reported item if it's still pending approval
export const deleteStudentReportedItem = async (itemId) => {
  try {
    const itemRef = doc(db, 'items', itemId);
    // Optional: You might want to add a security check here to ensure the item
    // indeed belongs to the current user and is pending, though the UI should enforce this.
    // For example, fetch the item, check submitter ID and adminApproval status before deleting.
    await deleteDoc(itemRef);
    console.log("Student reported item deleted successfully: ", itemId);
    return true;
  } catch (error) {
    console.error("Error deleting student reported item: ", error);
    throw error; 
  }
};