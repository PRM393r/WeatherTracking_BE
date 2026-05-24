const admin = require("./admin");
const { HttpsError } = require("firebase-functions/v2/https");

/**
 * Verify Firebase ID token from Authorization header or direct token string.
 * Usage: const uid = await verifyIdToken(request.auth?.token);
 */
async function verifyIdToken(token) {
  if (!token) {
    throw new HttpsError("unauthenticated", "Missing auth token");
  }
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    return decoded.uid;
  } catch {
    throw new HttpsError("unauthenticated", "Invalid or expired token");
  }
}

module.exports = { verifyIdToken };
