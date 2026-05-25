const { onCall, HttpsError } = require("firebase-functions/v2/https");
const axios = require("axios");
const admin = require("../utils/admin");
const { buildCacheKey, buildAiCacheDoc, isCacheValid, parseAiCacheDoc } = require("../models/aiCache");

const FALLBACK_SUGGESTIONS = {
  clear: {
    outfit: [
      { item: "Áo thun nhẹ", reason: "Trời nắng, thoáng mát", emoji: "👕" },
      { item: "Quần short", reason: "Nhiệt độ cao", emoji: "🩳" },
      { item: "Kính mắt & kem chống nắng", reason: "UV mạnh", emoji: "🕶️" },
    ],
    doList: ["Đi dạo ngoài trời", "Tập thể dục buổi sáng", "Picnic"],
    avoidList: ["Ra ngoài lúc 11h-14h", "Bỏ quên nước uống"],
    summary: "Thời tiết đẹp, nắng nhẹ. Hãy tận dụng ngày hôm nay!",
  },
  rain: {
    outfit: [
      { item: "Áo mưa hoặc ô", reason: "Trời mưa", emoji: "☂️" },
      { item: "Giày chống nước", reason: "Tránh ướt chân", emoji: "👟" },
      { item: "Áo ấm nhẹ", reason: "Mưa làm trời mát hơn", emoji: "🧥" },
    ],
    doList: ["Ở trong nhà", "Xem phim hoặc đọc sách"],
    avoidList: ["Ra ngoài không có ô", "Đi giày vải"],
    summary: "Trời mưa hôm nay. Nhớ mang ô và đi cẩn thận trên đường trơn.",
  },
  hot: {
    outfit: [
      { item: "Áo thoáng khí màu sáng", reason: "Phản nhiệt, thoáng mát", emoji: "👕" },
      { item: "Mũ rộng vành", reason: "Che nắng", emoji: "👒" },
      { item: "Kem chống nắng SPF50+", reason: "UV cực mạnh", emoji: "🧴" },
    ],
    doList: ["Uống nhiều nước", "Ở trong phòng điều hoà"],
    avoidList: ["Ra ngoài 10h-16h", "Tập thể dục ngoài trời"],
    summary: "Nắng gắt và nóng. Hạn chế ra ngoài, giữ đủ nước.",
  },
  cold: {
    outfit: [
      { item: "Áo khoác dày", reason: "Nhiệt độ thấp", emoji: "🧥" },
      { item: "Khăn quàng cổ", reason: "Giữ ấm", emoji: "🧣" },
      { item: "Giày kín", reason: "Tránh lạnh chân", emoji: "👞" },
    ],
    doList: ["Uống đồ ấm", "Mặc nhiều lớp"],
    avoidList: ["Ra ngoài không mặc đủ ấm", "Để hở cổ và tai"],
    summary: "Thời tiết lạnh. Mặc ấm trước khi ra ngoài.",
  },
};

function getFallback(temp, condition) {
  if (condition.includes("Rain") || condition.includes("Drizzle") || condition.includes("Thunderstorm")) {
    return FALLBACK_SUGGESTIONS.rain;
  }
  if (temp > 35) return FALLBACK_SUGGESTIONS.hot;
  if (temp < 20) return FALLBACK_SUGGESTIONS.cold;
  return FALLBACK_SUGGESTIONS.clear;
}

exports.getAiSuggestion = onCall({ region: "asia-southeast1" }, async (request) => {
  const { temp, condition, aqi, conditionDescription } = request.data;
  if (typeof temp !== "number" || !condition) {
    throw new HttpsError("invalid-argument", "temp (number) and condition (string) required");
  }

  const cacheKey = buildCacheKey(temp, condition, aqi || 0);
  const db = admin.firestore();
  const cacheDoc = await db.collection("ai_cache").doc(cacheKey).get();

  if (isCacheValid(cacheDoc)) {
    return parseAiCacheDoc(cacheDoc.data());
  }

  const apiKey = process.env.GROQ_API_KEY;
  let result;
  let isFallback = false;

  if (apiKey) {
    try {
      const prompt = `Thời tiết hiện tại: ${Math.round(temp)}°C, ${conditionDescription || condition}, AQI ${aqi || "không có"}.
Hãy gợi ý bằng tiếng Việt và trả về JSON với cấu trúc sau:
{
  "outfit": [{"item": "tên trang phục", "reason": "lý do ngắn", "emoji": "emoji phù hợp"}],
  "doList": ["hoạt động nên làm"],
  "avoidList": ["điều nên tránh"],
  "summary": "tóm tắt 1-2 câu"
}
Chỉ trả về JSON hợp lệ, không có text nào khác.`;

      const res = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          temperature: 0.7,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      result = JSON.parse(res.data.choices[0].message.content);
    } catch (err) {
      console.error("Groq AI error:", err.response?.status, err.response?.data || err.message);
      result = getFallback(temp, condition);
      isFallback = true;
    }
  } else {
    result = getFallback(temp, condition);
    isFallback = true;
  }

  await db.collection("ai_cache").doc(cacheKey).set(
    buildAiCacheDoc(cacheKey, result, isFallback)
  );

  return result;
});
