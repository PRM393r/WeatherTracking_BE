const { auth } = require("firebase-functions/v1");
const admin = require("../utils/admin");
const { buildUserDoc, buildGamificationDoc } = require("../models/user");

// Auto-create users/{uid} + gamification/{uid} on first signup
exports.onUserCreate = auth.user().onCreate(async (user) => {
  const db = admin.firestore();
  const batch = db.batch();

  batch.set(db.collection("users").doc(user.uid), buildUserDoc(user));
  batch.set(db.collection("gamification").doc(user.uid), buildGamificationDoc());

  await batch.commit();
});

// Cleanup all user data on account deletion
exports.onUserDelete = auth.user().onDelete(async (user) => {
  const uid = user.uid;
  const db = admin.firestore();
  const batch = db.batch();

  const [locationDocs, notifDocs, checkinDocs, badgeDocs] = await Promise.all([
    db.collection("saved_locations").where("uid", "==", uid).listDocuments(),
    db.collection("notifications").where("uid", "==", uid).listDocuments(),
    db.collection("checkin_history").where("uid", "==", uid).listDocuments(),
    db.collection("user_badges").where("uid", "==", uid).listDocuments(),
  ]);

  [...locationDocs, ...notifDocs, ...checkinDocs, ...badgeDocs].forEach((doc) =>
    batch.delete(doc)
  );

  batch.delete(db.collection("users").doc(uid));
  batch.delete(db.collection("gamification").doc(uid));

  await batch.commit();
});
