const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const axios = require("axios");
const admin = require("../utils/admin");
const { buildNotificationDoc } = require("../models/notification");
const { buildSystemLogDoc } = require("../models/gamification");
const { NotificationType } = require("../models/enums");

const OWM_AIR_BASE = "https://api.openweathermap.org/data/2.5/air_pollution";

// Cache AQI 1 hour
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
    const raw = res.data.list[0];
    const payload = {
      aqi: raw.main.aqi,
      components: raw.components,
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

// Send single FCM notification + write to notifications collection
exports.sendNotification = onCall({ region: "asia-southeast1" }, async (request) => {
  const { uid, title, body, type, deepLink, payload } = request.data;
  if (!uid || !title || !body) {
    throw new HttpsError("invalid-argument", "uid, title, body required");
  }

  const db = admin.firestore();
  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists) throw new HttpsError("not-found", "User not found");

  const { fcmToken } = userDoc.data();

  if (fcmToken) {
    await admin.messaging().send({
      token: fcmToken,
      notification: { title, body },
      data: payload ? { payload: JSON.stringify(payload) } : {},
    });
  }

  await db.collection("notifications").add(
    buildNotificationDoc(uid, { title, body, type, deepLink, payload })
  );

  return { sent: !!fcmToken };
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

      if (!userData.fcmToken || !userData.primaryLocationId) {
        totalSkipped++;
        continue;
      }

      try {
        // Spam prevention: skip if notified within last 20 hours
        const recentSnap = await db
          .collection("notifications")
          .where("uid", "==", uid)
          .where("createdAt", ">", new Date(Date.now() - 20 * 60 * 60 * 1000))
          .limit(1)
          .get();

        if (!recentSnap.empty) {
          totalSkipped++;
          continue;
        }

        // Fetch primary location coords
        const locationDoc = await db.collection("saved_locations").doc(userData.primaryLocationId).get();
        if (!locationDoc.exists) {
          totalSkipped++;
          continue;
        }
        const { lat, lng } = locationDoc.data();

        const [weatherRes, aqiRes] = await Promise.all([
          axios.get("https://api.openweathermap.org/data/2.5/weather", {
            params: { lat, lon: lng, appid: process.env.OWM_API_KEY, units: "metric" },
          }),
          axios.get("https://api.openweathermap.org/data/2.5/air_pollution", {
            params: { lat, lon: lng, appid: process.env.OWM_API_KEY },
          }).catch(() => null),
        ]);

        const w = weatherRes.data;
        const temp = w.main.temp;
        const hasRain = !!(w.rain || w.weather?.[0]?.main === "Rain" || w.weather?.[0]?.main === "Drizzle");
        const rainProb = hasRain ? 80 : 0;
        const aqiValue = aqiRes?.data?.list?.[0]?.main?.aqi ?? null;
        // OWM AQI scale: 1=Good,2=Fair,3=Moderate,4=Poor,5=VeryPoor — map >3 ≈ US AQI >150
        const aqiBad = aqiValue !== null && aqiValue >= 4;

        let alertTitle = null;
        let alertBody = null;
        let alertType = null;

        if (rainProb > 70 && userData.notifRain !== false) {
          alertTitle = "☂️ Dự báo mưa hôm nay";
          alertBody = "Nhớ mang ô khi ra ngoài nhé!";
          alertType = NotificationType.RAIN;
        } else if (temp > 37 && userData.notifHeat !== false) {
          alertTitle = "🌡️ Nắng gắt hôm nay";
          alertBody = `Nhiệt độ ${Math.round(temp)}°C — uống nhiều nước và hạn chế ra ngoài lúc trưa.`;
          alertType = NotificationType.HEAT;
        } else if (aqiBad && userData.notifAqi !== false) {
          alertTitle = "😷 Không khí xấu hôm nay";
          alertBody = "Chất lượng không khí ở mức kém. Hạn chế ra ngoài và đeo khẩu trang.";
          alertType = NotificationType.AQI;
        }

        if (!alertTitle) {
          totalSkipped++;
          continue;
        }

        await admin.messaging().send({
          token: userData.fcmToken,
          notification: { title: alertTitle, body: alertBody },
        });

        await db.collection("notifications").add(
          buildNotificationDoc(uid, {
            title: alertTitle,
            body: alertBody,
            type: alertType,
            deepLink: "/home",
          })
        );

        totalSent++;
      } catch (err) {
        errors.push({ uid, error: err.message });
      }
    }

    const today = new Date().toISOString().split("T")[0];
    await db
      .collection("system_logs")
      .doc(`${today}_scheduledWeatherAlert`)
      .set(buildSystemLogDoc("scheduledWeatherAlert", { totalSent, totalSkipped, errors }));
  }
);
