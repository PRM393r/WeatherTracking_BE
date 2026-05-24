const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const axios = require("axios");
const admin = require("../utils/admin");

const OWM_AIR_BASE = "https://api.openweathermap.org/data/2.5/air_pollution";

// Cache AQI 1 hour — dùng OpenWeatherMap Air Pollution API (cùng key với weather)
exports.getAqi = onCall({ region: "asia-southeast1" }, async (request) => {
  const { lat, lng } = request.data;
  if (typeof lat !== "number" || typeof lng !== "number") {
    throw new HttpsError("invalid-argument", "lat and lng must be numbers");
  }

  const cacheKey = `aqi_${Math.round(lat * 100) / 100}_${Math.round(lng * 100) / 100}`;
  const doc = await admin.firestore().collection("weather_cache").doc(cacheKey).get();
  if (doc.exists) {
    const data = doc.data();
    const age = (Date.now() - data.updatedAt.toMillis()) / 60000;
    if (age < 60) return data.payload;
  }

  const apiKey = process.env.OWM_API_KEY;
  try {
    const res = await axios.get(OWM_AIR_BASE, {
      params: { lat, lon: lng, appid: apiKey },
    });
    // OWM trả { list: [{ main: { aqi: 1-5 }, components: { pm2_5, pm10, no2, o3, ... } }] }
    const raw = res.data.list[0];
    const payload = {
      aqi: raw.main.aqi,           // 1=Good, 2=Fair, 3=Moderate, 4=Poor, 5=VeryPoor
      components: raw.components,  // pm2_5, pm10, no2, o3, co, so2, nh3, no
      dt: raw.dt,
    };
    await admin.firestore().collection("weather_cache").doc(cacheKey).set({
      payload,
      updatedAt: require("firebase-admin/firestore").FieldValue.serverTimestamp(),
    });
    return payload;
  } catch (err) {
    throw new HttpsError("internal", "Failed to fetch AQI data");
  }
});

// Send single FCM notification
exports.sendNotification = onCall({ region: "asia-southeast1" }, async (request) => {
  const { uid, title, body, data } = request.data;
  if (!uid || !title || !body) {
    throw new HttpsError("invalid-argument", "uid, title, body required");
  }

  const userDoc = await admin.firestore().collection("users").doc(uid).get();
  if (!userDoc.exists) throw new HttpsError("not-found", "User not found");

  const { fcmToken } = userDoc.data();
  if (!fcmToken) return { sent: false, reason: "no_token" };

  await admin.messaging().send({
    token: fcmToken,
    notification: { title, body },
    data: data || {},
  });

  await admin.firestore()
    .collection("notifications")
    .doc(uid)
    .collection("items")
    .add({
      title,
      body,
      type: data?.type || "general",
      read: false,
      createdAt: require("firebase-admin/firestore").FieldValue.serverTimestamp(),
      data: data || {},
    });

  return { sent: true };
});

// Scheduled daily alert at 6AM Vietnam time
exports.scheduledWeatherAlert = onSchedule(
  { schedule: "0 6 * * *", timeZone: "Asia/Ho_Chi_Minh", region: "asia-southeast1" },
  async () => {
    const db = admin.firestore();
    const usersSnap = await db
      .collection("users")
      .where("notificationEnabled", "==", true)
      .get();

    let totalSent = 0;
    let totalSkipped = 0;
    const errors = [];

    for (const userDoc of usersSnap.docs) {
      const uid = userDoc.id;
      const userData = userDoc.data();

      if (!userData.fcmToken || !userData.primaryLocation) {
        totalSkipped++;
        continue;
      }

      try {
        // Spam prevention: check last notification within 20 hours
        const recentSnap = await db
          .collection("notifications")
          .doc(uid)
          .collection("items")
          .where("createdAt", ">", new Date(Date.now() - 20 * 60 * 60 * 1000))
          .limit(1)
          .get();

        if (!recentSnap.empty) {
          totalSkipped++;
          continue;
        }

        const { lat, lng } = userData.primaryLocation;
        const weatherRes = await axios.get(
          "https://api.openweathermap.org/data/2.5/weather",
          {
            params: {
              lat, lon: lng,
              appid: process.env.OWM_API_KEY,
              units: "metric",
            },
          }
        );
        const w = weatherRes.data;
        const temp = w.main.temp;
        const rainProb = w.rain ? 80 : 0;

        let alertTitle = null;
        let alertBody = null;

        if (rainProb > 70) {
          alertTitle = "☂️ Dự báo mưa hôm nay";
          alertBody = "Nhớ mang ô khi ra ngoài nhé!";
        } else if (temp > 37) {
          alertTitle = "🌡️ Nắng gắt hôm nay";
          alertBody = `Nhiệt độ ${Math.round(temp)}°C — uống nhiều nước và hạn chế ra ngoài lúc trưa.`;
        }

        if (!alertTitle) {
          totalSkipped++;
          continue;
        }

        await admin.messaging().send({
          token: userData.fcmToken,
          notification: { title: alertTitle, body: alertBody },
          data: { type: "weather_alert" },
        });

        await db.collection("notifications").doc(uid).collection("items").add({
          title: alertTitle,
          body: alertBody,
          type: "weather_alert",
          read: false,
          createdAt: require("firebase-admin/firestore").FieldValue.serverTimestamp(),
          data: { type: "weather_alert" },
        });

        totalSent++;
      } catch (err) {
        errors.push({ uid, error: err.message });
      }
    }

    await db
      .collection("system_logs")
      .doc("daily_alert")
      .collection(new Date().toISOString().split("T")[0])
      .add({ totalSent, totalSkipped, errors, createdAt: require("firebase-admin/firestore").FieldValue.serverTimestamp() });
  }
);
