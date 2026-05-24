const { auth } = require("firebase-functions/v1");
const admin = require("../utils/admin");

// Auto-create users/{uid} document on first signup
exports.onUserCreate = auth.user().onCreate(async (user) => {
  await admin.firestore().collection("users").doc(user.uid).set({
    displayName: user.displayName || "",
    email: user.email || "",
    photoURL: user.photoURL || "",
    createdAt: require("firebase-admin/firestore").FieldValue.serverTimestamp(),
    unit: "C",
    notificationEnabled: true,
    fcmToken: null,
    notificationSettings: {
      rain: true,
      highTemp: true,
      aqi: true,
    },
  });
});

// Cleanup all user data on account deletion
exports.onUserDelete = auth.user().onDelete(async (user) => {
  const uid = user.uid;
  const db = admin.firestore();
  const batch = db.batch();

  const locations = await db
    .collection("users")
    .doc(uid)
    .collection("saved_locations")
    .listDocuments();
  locations.forEach((doc) => batch.delete(doc));

  const notifications = await db
    .collection("notifications")
    .doc(uid)
    .collection("items")
    .listDocuments();
  notifications.forEach((doc) => batch.delete(doc));

  batch.delete(db.collection("users").doc(uid));
  batch.delete(db.collection("gamification").doc(uid));

  await batch.commit();
});
