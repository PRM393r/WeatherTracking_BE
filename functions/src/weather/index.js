const { onCall, HttpsError } = require("firebase-functions/v2/https");
const axios = require("axios");
const admin = require("../utils/admin");
const { buildWeatherCacheDoc, TTL_MINUTES } = require("../models/weatherCache");

const OWM_BASE = "https://api.openweathermap.org/data/2.5";
const OWM_GEO = "https://api.openweathermap.org/geo/1.0";

function getCacheKey(lat, lng) {
  return `${Math.round(lat * 100) / 100}_${Math.round(lng * 100) / 100}`;
}

async function getCachedWeather(docId) {
  const doc = await admin.firestore().collection("weather_cache").doc(docId).get();
  if (!doc.exists) return null;
  const data = doc.data();
  if (!data.expiresAt) return null;
  return data.expiresAt.toMillis() > Date.now() ? data : null;
}

exports.getWeather = onCall({ region: "asia-southeast1" }, async (request) => {
  const { lat, lng } = request.data;
  if (typeof lat !== "number" || typeof lng !== "number") {
    throw new HttpsError("invalid-argument", "lat and lng must be numbers");
  }

  const cacheKey = getCacheKey(lat, lng);
  const cached = await getCachedWeather(cacheKey);
  if (cached) return cached;

  const apiKey = process.env.OWM_API_KEY;
  try {
    const res = await axios.get(`${OWM_BASE}/weather`, {
      params: { lat, lon: lng, appid: apiKey, units: "metric", lang: "vi" },
    });
    const doc = buildWeatherCacheDoc(res.data);
    await admin.firestore().collection("weather_cache").doc(cacheKey).set(doc);
    return doc;
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

  const forecastKey = `forecast_${getCacheKey(lat, lng)}`;
  const doc = await admin.firestore().collection("weather_cache").doc(forecastKey).get();
  if (doc.exists) {
    const data = doc.data();
    if (data.expiresAt && data.expiresAt.toMillis() > Date.now()) return data;
  }

  const apiKey = process.env.OWM_API_KEY;
  try {
    const res = await axios.get(`${OWM_BASE}/forecast`, {
      params: { lat, lon: lng, appid: apiKey, units: "metric", lang: "vi" },
    });
    // Store forecast raw — it's a large list, keep as-is with TTL
    const { Timestamp, FieldValue } = require("firebase-admin/firestore");
    const expiresAt = new Date(Date.now() + 120 * 60 * 1000);
    const payload = {
      list: res.data.list,
      city: res.data.city,
      updatedAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromDate(expiresAt),
    };
    await admin.firestore().collection("weather_cache").doc(forecastKey).set(payload);
    return payload;
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
