const { FieldValue } = require("firebase-admin/firestore");

/**
 * Build community_reports document for community_reports/{reportId}
 * @param {string} uid
 * @param {object} params
 * @param {string} params.type - ReportType enum
 * @param {string} [params.description]
 * @param {string} [params.photoURL]
 * @param {number} params.lat
 * @param {number} params.lng
 * @param {string} [params.locationName]
 * @param {string} params.displayName - snapshot of user displayName at post time
 * @param {string} [params.avatarURL] - snapshot of user photoURL at post time
 */
function buildCommunityReportDoc(uid, params) {
  return {
    uid,
    displayName: params.displayName || "",
    avatarURL: params.avatarURL || null,
    type: params.type,
    description: params.description || "",
    photoURL: params.photoURL || null,
    lat: params.lat,
    lng: params.lng,
    locationName: params.locationName || "",
    upvoteCount: 0,
    createdAt: FieldValue.serverTimestamp(),
  };
}

/**
 * Build report_upvotes document for report_upvotes/{docId}
 */
function buildReportUpvoteDoc(reportId, uid) {
  return {
    reportId,
    uid,
    createdAt: FieldValue.serverTimestamp(),
  };
}

module.exports = { buildCommunityReportDoc, buildReportUpvoteDoc };
