const { FieldValue } = require("firebase-admin/firestore");
const { NotificationType } = require("./enums");

/**
 * Build notification document for notifications/{docId} (top-level collection)
 * @param {string} uid
 * @param {object} params
 * @param {string} params.title
 * @param {string} params.body
 * @param {string} params.type - NotificationType enum value
 * @param {string} [params.deepLink] - route when tapped: /home | /ai | /map
 * @param {object} [params.payload] - extra JSON data
 */
function buildNotificationDoc(uid, { title, body, type, deepLink = null, payload = null }) {
  return {
    uid,
    title,
    body: body || "",
    type: type || NotificationType.SYSTEM,
    read: false,
    deepLink,
    payload: payload ? JSON.stringify(payload) : null,
    createdAt: FieldValue.serverTimestamp(),
  };
}

module.exports = { buildNotificationDoc };
