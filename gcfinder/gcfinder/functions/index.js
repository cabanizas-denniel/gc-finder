/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

// Initialize Firebase Admin SDK ONCE at the top
try {
  admin.initializeApp();
} catch (e) {
  console.error("Firebase admin initialization error", e);
}

const db = admin.firestore();

/**
 * Cloud Function to notify a student when the status of their reported item changes.
 */
exports.notifyStudentOnItemStatusUpdate = functions.firestore
  .document("items/{itemId}") // Listens to changes in the 'items' collection
  .onUpdate(async (change, context) => {
    const previousData = change.before.data();
    const newData = change.after.data();
    const itemId = context.params.itemId;

    // Check if the status has actually changed
    if (previousData.status === newData.status) {
      console.log(`Item ${itemId}: Status unchanged (${newData.status}), no notification needed.`);
      return null;
    }

    // Ensure necessary data is present
    if (!newData.studentId || !newData.itemName) {
      console.error(`Item ${itemId}: Missing studentId or itemName. Cannot send notification.`);
      return null;
    }

    const studentId = newData.studentId;
    const itemName = newData.itemName;
    const newStatus = newData.status;
    const itemImage = newData.imageUrl || null; // Optional image for context

    const notificationPayload = {
      userId: studentId, // The student who reported the item
      senderName: "GCFinder Admin", // Or a more generic "System"
      senderProfile: null, // Optional: URL to a generic admin/system profile pic
      message: `Your reported item "${itemName}" has been updated to: ${newStatus}.`,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      read: false,
      type: "item_update",
      relatedItemId: itemId,
      link: `/my-claims/${itemId}`, // Or a relevant link for the student
      itemImage: itemImage // You can add this to your notification model
    };

    try {
      await db.collection("notifications").add(notificationPayload);
      console.log(`Notification sent to student ${studentId} for item ${itemId} status update to ${newStatus}.`);
    } catch (error) {
      console.error(`Error sending notification for item ${itemId}:`, error);
    }
    return null;
  });

// --- Placeholder for notifying admins ---
// You would need a way to get a list of admin UIDs
// For example, from a dedicated 'admins' collection or users with an 'admin' custom claim.

async function getAdminUserIds() {
  // This is a placeholder - implement your logic to get admin UIDs
  // Option 1: Query an 'admins' collection that stores documents with admin user UIDs
  // const adminSnapshot = await db.collection('admins').get();
  // const adminIds = adminSnapshot.docs.map(doc => doc.id); // Assuming doc ID is the admin UID
  // return adminIds;

  // Option 2: If you have fewer, fixed admins, you could hardcode them (less flexible)
  return ["admin_uid_1", "admin_uid_2"]; // REPLACE WITH ACTUAL ADMIN UIDs or query logic
}


exports.notifyAdminsOnNewReport = functions.firestore
  .document("reported_items/{reportId}") // Assuming 'reported_items' collection for new reports
  .onCreate(async (snapshot, context) => {
    const newReport = snapshot.data();
    const reportId = context.params.reportId;

    if (!newReport.itemName || !newReport.studentId) { // studentId here is the reporter
      console.error(`New report ${reportId}: Missing itemName or studentId (reporter). Cannot send admin notification.`);
      return null;
    }

    const itemName = newReport.itemName;
    // You might want to fetch reporter's name for a richer notification
    // const reporterName = (await db.collection('students').doc(newReport.studentId).get()).data()?.full_name || 'A student';


    const adminUserIds = await getAdminUserIds();
    if (!adminUserIds || adminUserIds.length === 0) {
      console.warn("No admin UIDs found to send notification for new report:", reportId);
      return null;
    }

    const notificationPromises = adminUserIds.map(adminId => {
      const notificationPayload = {
        userId: adminId, // Send to this admin
        senderName: "System Notification", // or `Reporter: ${reporterName}`
        message: `A new item has been reported: "${itemName}". Needs verification.`,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        read: false,
        type: "new_report_admin",
        relatedItemId: reportId, // This is the ID of the document in 'reported_items'
        link: `/admin/verify-items/${reportId}` // Link for admin to verify
      };
      return db.collection("notifications").add(notificationPayload);
    });

    try {
      await Promise.all(notificationPromises);
      console.log(`Admin notifications sent for new report ${reportId}.`);
    } catch (error) {
      console.error(`Error sending admin notifications for new report ${reportId}:`, error);
    }
    return null;
  });

// You would create a similar function for 'notifyAdminsOnNewClaim'
// triggered by .onCreate on your 'claims' collection.
