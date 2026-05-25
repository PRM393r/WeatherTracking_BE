const { FieldValue } = require("firebase-admin/firestore");

/**
 * Build checkin_history document for checkin_history/{docId}
 */
function buildCheckinDoc(uid, { date, streakDay, points = 10 }) {
  return {
    uid,
    date,
    streakDay,
    points,
    createdAt: FieldValue.serverTimestamp(),
  };
}

/**
 * Build user_badges document for user_badges/{docId}
 */
function buildUserBadgeDoc(uid, badgeId) {
  return {
    uid,
    badgeId,
    unlockedAt: FieldValue.serverTimestamp(),
  };
}

/**
 * Build system_logs document for system_logs/{id}
 * id convention: "YYYY-MM-DD_jobName"
 */
function buildSystemLogDoc(jobName, { totalSent, totalSkipped, errors = [] }) {
  return {
    jobName,
    totalSent,
    totalSkipped,
    errors: JSON.stringify(errors),
    runAt: FieldValue.serverTimestamp(),
  };
}

module.exports = { buildCheckinDoc, buildUserBadgeDoc, buildSystemLogDoc };
