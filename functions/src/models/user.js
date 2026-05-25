const { FieldValue } = require("firebase-admin/firestore");
const { UnitType, ThemeMode } = require("./enums");

/**
 * Build default user document for users/{uid}
 * Called by onUserCreate trigger
 */
function buildUserDoc(firebaseUser) {
  return {
    email: firebaseUser.email || "",
    displayName: firebaseUser.displayName || "",
    photoURL: firebaseUser.photoURL || "",
    unit: UnitType.C,
    fcmToken: null,
    primaryLocationId: null,
    notificationEnabled: true,
    notifRain: true,
    notifHeat: true,
    notifAqi: true,
    themeMode: ThemeMode.SYSTEM,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
}

/**
 * Build default gamification document for gamification/{uid}
 * Created alongside users/{uid} on first signup
 */
function buildGamificationDoc() {
  return {
    currentStreak: 0,
    maxStreak: 0,
    lastCheckinAt: null,
    lastCheckinDate: null,
    totalPoints: 0,
    totalCheckins: 0,
    totalReports: 0,
    updatedAt: FieldValue.serverTimestamp(),
  };
}

module.exports = { buildUserDoc, buildGamificationDoc };
