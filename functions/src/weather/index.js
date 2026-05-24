const { onCall, HttpsError } = require("firebase-functions/v2/https");
const axios = require("axios");
const admin = require("../utils/admin");

const OWM_BASE = "https://api.openweathermap.org/data/2.5";
const OWM_GEO = "https://api.openweathermap.org/geo/1.0";

function getCacheKey(lat, lng) {
  return `${Math.round(lat * 100) / 100}_${Math.round(lng * 100) / 100}`;
}

async function getCached(docId, ttlMinutes) {
  const doc = await admin.firestore().collection("weather_cache").doc(docId).get();
  if (!doc.exists) return null;
  const data = doc.data();
  const age = (Date.now() - data.updatedAt.toMillis()) / 60000;
  return age < ttlMinutes ? data.payload : null;
}

async function setCache(docId, payload) {
  await admin.firestore().collection("weather_cache").doc(docId).set({
    payload,
    updatedAt: require("firebase-admin/firestore").FieldValue.serverTimestamp(),
  });
}

exports.getWeather = onCall({ region: "asia-southeast1" }, async (request) => {
  const { lat, lng } = request.data;
  if (typeof lat !== "number" || typeof lng !== "number") {
    throw new HttpsError("invalid-argument", "lat and lng must be numbers");
  }

  const cacheKey = `weather_${getCacheKey(lat, lng)}`;
  const cached = await getCached(cacheKey, 30);
  if (cached) return cached;

  const apiKey = process.env.OWM_API_KEY;
  try {
    const res = await axios.get(`${OWM_BASE}/weather`, {
      params: { lat, lon: lng, appid: apiKey, units: "metric", lang: "vi" },
    });
    await setCache(cacheKey, res.data);
    return res.data;
  } catch (err) {
    console.error("getWeather error:", err.response?.status, err.response?.data || err.message);
    if (err.response?.status === 429) {
      throw new HttpsError("resource-exhausted", "OpenWeatherMap quota exceeded");
    }
    throw new HttpsError("internal", `Failed to fetch weather data: ${err.response?.data?.message || err.message}`);
  }
});

exports.getForecast = onCall({ region: "asia-southeast1" }, async (request) => {
  const { lat, lng } = request.data;
  if (typeof lat !== "number" || typeof lng !== "number") {
    throw new HttpsError("invalid-argument", "lat and lng must be numbers");
  }

  const cacheKey = `forecast_${getCacheKey(lat, lng)}`;
  const cached = await getCached(cacheKey, 120);
  if (cached) return cached;

  const apiKey = process.env.OWM_API_KEY;
  try {
    const res = await axios.get(`${OWM_BASE}/forecast`, {
      params: { lat, lon: lng, appid: apiKey, units: "metric", lang: "vi" },
    });
    await setCache(cacheKey, res.data);
    return res.data;
  } catch (err) {
    if (err.response?.status === 429) {
      throw new HttpsError("resource-exhausted", "OpenWeatherMap quota exceeded");
    }
    throw new HttpsError("internal", "Failed to fetch forecast data");
  }
});

exports.searchCity = onCall({ region: "asia-southeast1" }, async (request) => {
  const { query } = request.data;
  if (!query || typeof query !== "string") {
    throw new HttpsError("invalid-argument", "query must be a non-empty string");
  }

  const apiKey = process.env.OWM_API_KEY;
  try {
    const res = await axios.get(`${OWM_GEO}/direct`, {
      params: { q: query, limit: 5, appid: apiKey },
    });
    return res.data;
  } catch (err) {
    throw new HttpsError("internal", "Failed to search city");
  }
});
