const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("../utils/admin");
const { buildCommunityReportDoc } = require("../models/community");

// Create a community weather report
exports.createReport = onCall({ region: "asia-southeast1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in");
  }

  const { type, description, lat, lng, locationName, photoURL } = request.data;
  if (!type || !description || typeof lat !== "number" || typeof lng !== "number") {
    throw new HttpsError("invalid-argument", "type, description, lat, lng required");
  }

  const uid = request.auth.uid;
  const userDoc = await admin.firestore().collection("users").doc(uid).get();
  const userData = userDoc.exists ? userDoc.data() : {};

  const doc = buildCommunityReportDoc({
    uid,
    displayName: userData.displayName || "Anonymous",
    avatarURL: userData.photoURL || null,
    type,
    description,
    lat,
    lng,
    locationName: locationName || "",
    photoURL: photoURL || null,
  });

  const ref = await admin.firestore().collection("community_reports").add(doc);

  // Update gamification totalReports
  await admin.firestore().collection("gamification").doc(uid).update({
    totalReports: require("firebase-admin/firestore").FieldValue.increment(1),
    updatedAt: require("firebase-admin/firestore").FieldValue.serverTimestamp(),
  });

  return { id: ref.id };
});

// Upvote a community report
exports.upvoteReport = onCall({ region: "asia-southeast1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in");
  }

  const { reportId } = request.data;
  if (!reportId) {
    throw new HttpsError("invalid-argument", "reportId required");
  }

  const uid = request.auth.uid;
  const db = admin.firestore();

  // Check if already upvoted
  const existing = await db
    .collection("report_upvotes")
    .where("reportId", "==", reportId)
    .where("uid", "==", uid)
    .limit(1)
    .get();

  if (!existing.empty) {
    throw new HttpsError("already-exists", "Already upvoted this report");
  }

  const batch = db.batch();

  // Add upvote record
  const upvoteRef = db.collection("report_upvotes").doc();
  batch.set(upvoteRef, {
    reportId,
    uid,
    createdAt: require("firebase-admin/firestore").FieldValue.serverTimestamp(),
  });

  // Increment upvoteCount on the report
  const reportRef = db.collection("community_reports").doc(reportId);
  batch.update(reportRef, {
    upvoteCount: require("firebase-admin/firestore").FieldValue.increment(1),
  });

  await batch.commit();
  return { success: true };
});
