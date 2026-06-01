const admin = require("./admin");

const BADGES = [
  {
    id: "streak_3",
    name: "Khởi Đầu",
    description: "Điểm danh 3 ngày liên tiếp",
    iconEmoji: "🌱",
    conditionType: "streak",
    threshold: 3,
    points: 30,
    sortOrder: 1,
  },
  {
    id: "streak_7",
    name: "Tuần Hoàn",
    description: "Điểm danh 7 ngày liên tiếp",
    iconEmoji: "🔥",
    conditionType: "streak",
    threshold: 7,
    points: 70,
    sortOrder: 2,
  },
  {
    id: "streak_30",
    name: "Kiên Trì",
    description: "Điểm danh 30 ngày liên tiếp",
    iconEmoji: "💪",
    conditionType: "streak",
    threshold: 30,
    points: 300,
    sortOrder: 3,
  },
  {
    id: "checkin_10",
    name: "Thường Xuyên",
    description: "Tổng cộng 10 lần điểm danh",
    iconEmoji: "📅",
    conditionType: "total_checkin",
    threshold: 10,
    points: 50,
    sortOrder: 4,
  },
  {
    id: "checkin_50",
    name: "Trung Thành",
    description: "Tổng cộng 50 lần điểm danh",
    iconEmoji: "⭐",
    conditionType: "total_checkin",
    threshold: 50,
    points: 200,
    sortOrder: 5,
  },
  {
    id: "report_1",
    name: "Phóng Viên",
    description: "Đăng báo cáo thời tiết đầu tiên",
    iconEmoji: "📸",
    conditionType: "report_count",
    threshold: 1,
    points: 20,
    sortOrder: 6,
  },
  {
    id: "report_10",
    name: "Cộng Tác Viên",
    description: "Đăng 10 báo cáo thời tiết",
    iconEmoji: "🌧️",
    conditionType: "report_count",
    threshold: 10,
    points: 100,
    sortOrder: 7,
  },
  {
    id: "upvote_10",
    name: "Được Yêu Thích",
    description: "Nhận tổng cộng 10 upvote",
    iconEmoji: "👍",
    conditionType: "upvote_count",
    threshold: 10,
    points: 50,
    sortOrder: 8,
  },
  {
    id: "points_100",
    name: "Nhà Thám Hiểm",
    description: "Tích lũy 100 điểm",
    iconEmoji: "🗺️",
    conditionType: "points",
    threshold: 100,
    points: 0,
    sortOrder: 9,
  },
  {
    id: "points_500",
    name: "Chuyên Gia Thời Tiết",
    description: "Tích lũy 500 điểm",
    iconEmoji: "🏆",
    conditionType: "points",
    threshold: 500,
    points: 0,
    sortOrder: 10,
  },
];

async function seedBadges() {
  const db = admin.firestore();
  const batch = db.batch();

  for (const badge of BADGES) {
    const ref = db.collection("badges").doc(badge.id);
    batch.set(ref, badge, { merge: true });
  }

  await batch.commit();
  console.log(`Seeded ${BADGES.length} badges.`);
  process.exit(0);
}

seedBadges().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
