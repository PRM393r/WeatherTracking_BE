const { FieldValue, Timestamp } = require("firebase-admin/firestore");

const TTL_MINUTES = 60;

/**
 * Generate cache key: MD5-like deterministic string from rounded inputs
 * Format: "{condition}_{temp_rounded5}_{aqi_rounded50}"
 */
function buildCacheKey(temp, condition, aqi = 0) {
  const t = Math.round(temp / 5) * 5;
  const a = Math.round(aqi / 50) * 50;
  return `${condition}_${t}_${a}`;
}

/**
 * Build ai_cache document for ai_cache/{id}
 * @param {string} conditionKey - raw key for debug
 * @param {object} result - { outfit: [{item, reason, emoji}], doList, avoidList, summary }
 * @param {boolean} isFallback - true if AI failed and hardcode used
 */
function buildAiCacheDoc(conditionKey, result, isFallback = false) {
  const expiresAt = new Date(Date.now() + TTL_MINUTES * 60 * 1000);

  return {
    conditionKey,
    outfit: JSON.stringify(result.outfit || []),
    doList: JSON.stringify(result.doList || []),
    avoidList: JSON.stringify(result.avoidList || []),
    summary: result.summary || "",
    isFallback,
    updatedAt: FieldValue.serverTimestamp(),
    expiresAt: Timestamp.fromDate(expiresAt),
  };
}

/**
 * Check if cached doc is still valid (not expired)
 */
function isCacheValid(doc) {
  if (!doc.exists) return false;
  const data = doc.data();
  if (!data.expiresAt) return false;
  return data.expiresAt.toMillis() > Date.now();
}

/**
 * Parse stored ai_cache doc back to result object
 */
function parseAiCacheDoc(data) {
  return {
    outfit: JSON.parse(data.outfit || "[]"),
    doList: JSON.parse(data.doList || "[]"),
    avoidList: JSON.parse(data.avoidList || "[]"),
    summary: data.summary || "",
    isFallback: data.isFallback || false,
  };
}

module.exports = { buildCacheKey, buildAiCacheDoc, isCacheValid, parseAiCacheDoc, TTL_MINUTES };
