# WeatherTracking — Firebase Backend

Backend cho **Smart Weather App v2** — Firebase Cloud Functions + Firestore.

**Stack:** Firebase Cloud Functions (NodeJS 24) · Firestore · Firebase Auth · FCM · Firebase Storage

---

## Thông tin project

| Mục | Giá trị |
|-----|---------|
| Firebase Project ID | `weathertracking-su26` |
| Region | `asia-southeast1` (Singapore) |
| Android Package | `com.fpt.weather_tracking` |
| iOS Bundle ID | `com.fpt.weathertracking` |
| Node version | 24 |
| Repo | https://github.com/PRM393r/WeatherTracking_BE |

---

## Cấu trúc thư mục

```
WeatherTracking-BE/
├── firebase.json              # Firebase CLI config (functions, firestore, emulators)
├── firestore.rules            # Firestore Security Rules
├── firestore.indexes.json     # Composite indexes
├── .firebaserc                # Firebase project alias
├── .gitignore
├── README.md
└── functions/
    ├── index.js               # Entry point — export tất cả Cloud Functions
    ├── package.json
    ├── .env.local             # API keys cho local emulator (KHÔNG commit)
    └── src/
        ├── models/            # Schema builders & enum constants
        │   ├── index.js       # Barrel export
        │   ├── enums.js       # UnitType, NotificationType, WeatherCondition, ...
        │   ├── user.js        # buildUserDoc, buildGamificationDoc
        │   ├── notification.js
        │   ├── weatherCache.js
        │   ├── aiCache.js
        │   ├── community.js
        │   └── gamification.js
        ├── auth/
        │   └── index.js       # onUserCreate, onUserDelete
        ├── weather/
        │   └── index.js       # getWeather, getForecast, searchCity
        ├── notification/
        │   └── index.js       # getAqi, sendNotification, scheduledWeatherAlert
        ├── ai/
        │   └── index.js       # getAiSuggestion (Groq llama-3.3-70b + fallback)
        └── utils/
            ├── admin.js       # Firebase Admin SDK singleton
            ├── auth.js        # verifyIdToken helper
            └── seedBadges.js  # Script seed 10 badges vào Firestore
```

---

## Firestore Collections Schema

```
users/{uid}
  - email: string
  - displayName: string
  - photoURL: string
  - unit: "C" | "F"
  - fcmToken: string | null
  - primaryLocationId: string | null      ← ref đến saved_locations/{id}
  - notificationEnabled: bool
  - notifRain: bool
  - notifHeat: bool
  - notifAqi: bool
  - themeMode: "system" | "light" | "dark"
  - createdAt: timestamp
  - updatedAt: timestamp

saved_locations/{id}
  - uid: string
  - name: string
  - lat: float
  - lng: float
  - country: string
  - isPrimary: bool
  - createdAt: timestamp

notifications/{docId}
  - uid: string
  - title: string
  - body: string
  - type: "rain" | "heat" | "aqi" | "wind" | "system"
  - read: bool
  - deepLink: string | null               ← route khi tap: /home | /ai | /map
  - payload: string | null               ← JSON extra data
  - createdAt: timestamp

weather_cache/{lat_lng}                  ← Cloud Functions only
  - temp, feelsLike, humidity, windSpeed, windDeg, uvIndex, visibility, pressure
  - condition: WeatherCondition enum
  - conditionText, iconCode: string
  - sunrise, sunset: timestamp
  - forecastData: string (JSON)
  - aqi, aqiCategory, mainPollutant
  - updatedAt, expiresAt: timestamp

ai_cache/{conditionKey}                  ← Cloud Functions only
  - conditionKey: string
  - outfit, doList, avoidList: string (JSON)
  - summary: string
  - isFallback: bool
  - updatedAt, expiresAt: timestamp

gamification/{uid}
  - currentStreak, maxStreak: int
  - lastCheckinAt: timestamp | null
  - lastCheckinDate: string (YYYY-MM-DD)
  - totalPoints, totalCheckins, totalReports: int
  - updatedAt: timestamp

checkin_history/{docId}
  - uid, date (YYYY-MM-DD), streakDay, points: int
  - createdAt: timestamp

community_reports/{reportId}
  - uid, displayName, avatarURL
  - type: "rain" | "flood" | "wind" | "sunny" | "fog" | "storm"
  - description, photoURL, lat, lng, locationName
  - upvoteCount: int
  - createdAt: timestamp

report_upvotes/{docId}
  - reportId, uid: string
  - createdAt: timestamp

badges/{badgeId}                         ← Public catalog, seed 1 lần
  - name, description, iconEmoji
  - conditionType: "streak" | "total_checkin" | "report_count" | "upvote_count" | "points"
  - threshold, points, sortOrder: int

user_badges/{docId}
  - uid, badgeId: string
  - unlockedAt: timestamp

system_logs/{YYYY-MM-DD_jobName}         ← Cloud Functions only
  - jobName, totalSent, totalSkipped: int
  - errors: string (JSON)
  - runAt: timestamp
```

---

## Cloud Functions

| Function | Trigger | Mô tả |
|----------|---------|-------|
| `onUserCreate` | Auth: user().onCreate | Tạo `users/{uid}` + `gamification/{uid}` khi đăng ký |
| `onUserDelete` | Auth: user().onDelete | Xóa toàn bộ data user khi xóa tài khoản |
| `getWeather` | HTTPS Callable | Thời tiết hiện tại qua OpenWeatherMap (cache 30 phút) |
| `getForecast` | HTTPS Callable | Dự báo 5 ngày qua OpenWeatherMap (cache 2 giờ) |
| `searchCity` | HTTPS Callable | Tìm kiếm thành phố qua OWM Geocoding API |
| `getAqi` | HTTPS Callable | Chỉ số AQI qua OWM Air Pollution API (cache 1 giờ) |
| `sendNotification` | HTTPS Callable | Gửi FCM push notification + lưu vào `notifications` |
| `scheduledWeatherAlert` | Pub/Sub: 6AM VN | Cron job gửi cảnh báo mưa/nắng gắt hàng ngày |
| `getAiSuggestion` | HTTPS Callable | Gợi ý AI trang phục/hoạt động bằng Groq (có fallback) |

---

## Git Workflow

```
master (production)
 └── develop
      └── trungle2605  ← Dev 4 làm việc ở đây
```

- Commit trên nhánh `trungle2605`
- Tạo Pull Request → merge vào `develop`
- `develop` → merge vào `master` khi release

---

## Setup môi trường local

### 1. Yêu cầu

- Node.js 24+
- Firebase CLI: `npm install -g firebase-tools`
- Tài khoản có quyền trên Firebase project `weathertracking-su26`

### 2. Clone và cài dependencies

```bash
git clone https://github.com/PRM393r/WeatherTracking_BE.git
cd WeatherTracking_BE/functions
npm install
```

### 3. Đăng nhập Firebase

```bash
firebase login
firebase use weathertracking-su26
```

### 4. Cấu hình API keys

Tạo file `functions/.env.local` (không commit):

```bash
# OpenWeatherMap — Weather, Forecast, AQI, SearchCity
OWM_API_KEY=your_owm_api_key_here

# Groq AI — AI Suggestion (llama-3.3-70b-versatile)
GROQ_API_KEY=your_groq_api_key_here
```

---

## Hướng dẫn chạy ứng dụng

### Backend (Cloud Functions Emulator)

```bash
# Bước 1 — vào thư mục backend
cd WeatherTracking-BE

# Bước 2 — cài dependencies (chỉ cần 1 lần)
cd functions && npm install && cd ..

# Bước 3 — chạy emulator
firebase emulators:start --only functions,firestore,auth
```

Emulator sẵn sàng khi thấy:
```
✔  All emulators ready!
```

| Emulator | URL |
|----------|-----|
| Emulator UI | http://localhost:4100 |
| Functions | http://localhost:5002 |
| Firestore | http://localhost:8180 |
| Auth | http://localhost:9199 |

**Seed badges** (chạy 1 lần sau khi emulator đã sẵn sàng):
```bash
cd functions
FIRESTORE_EMULATOR_HOST=localhost:8180 node src/utils/seedBadges.js
```

---

### Frontend (Flutter App)

```bash
# Bước 1 — vào thư mục frontend
cd WeatherTracking-FE

# Bước 2 — cài dependencies (chỉ cần 1 lần)
flutter pub get

# Bước 3 — kiểm tra device
flutter devices

# Bước 4 — chạy app
flutter run
```

---

### Chạy cả 2 cùng lúc (development mode)

Mở **2 terminal**:

**Terminal 1 — Backend:**
```bash
cd WeatherTracking-BE
firebase emulators:start --only functions,firestore,auth
```

**Terminal 2 — Frontend:**
```bash
cd WeatherTracking-FE
flutter run
```

> Để Flutter trỏ vào emulator local thay vì production, thêm vào `main.dart`:
> ```dart
> FirebaseFunctions.instance.useFunctionsEmulator('localhost', 5002);
> FirebaseFirestore.instance.useFirestoreEmulator('localhost', 8180);
> FirebaseAuth.instance.useAuthEmulator('localhost', 9199);
> ```

---

### Kiểm tra kết nối thành công

| Bước | Cách kiểm tra |
|------|---------------|
| Backend chạy | http://localhost:4100 → thấy Emulator UI |
| Firestore hoạt động | Emulator UI → Firestore tab → thấy collections |
| Flutter kết nối | Đăng ký tài khoản → thấy UID hiển thị trong HomeScreen |
| Functions hoạt động | Gọi curl test hoặc dùng app → thấy data thời tiết |

---

## Test Functions (curl)

```bash
# Test thời tiết HCM
curl -X POST http://localhost:5002/weathertracking-su26/asia-southeast1/getWeather \
  -H "Content-Type: application/json" \
  -d '{"data": {"lat": 10.8231, "lng": 106.6297}}'

# Test tìm thành phố
curl -X POST http://localhost:5002/weathertracking-su26/asia-southeast1/searchCity \
  -H "Content-Type: application/json" \
  -d '{"data": {"query": "Ho Chi Minh"}}'

# Test AI suggestion
curl -X POST http://localhost:5002/weathertracking-su26/asia-southeast1/getAiSuggestion \
  -H "Content-Type: application/json" \
  -d '{"data": {"temp": 35, "condition": "Clear", "aqi": 80, "conditionDescription": "trời nắng"}}'

# Test AQI
curl -X POST http://localhost:5002/weathertracking-su26/asia-southeast1/getAqi \
  -H "Content-Type: application/json" \
  -d '{"data": {"lat": 10.8231, "lng": 106.6297}}'
```

---

## Deploy lên production

```bash
# Deploy Cloud Functions
firebase deploy --only functions

# Deploy Firestore rules + indexes
firebase deploy --only firestore

# Deploy tất cả
firebase deploy
```

> Chỉ Dev 4 deploy. Test emulator đầy đủ trước khi deploy production.

---

## Kiến trúc & Quy trình hoạt động

### Tổng quan

```
Flutter App
    │
    ├── Firebase Auth        (đăng nhập/đăng ký)
    ├── Cloud Firestore      (database)
    ├── Cloud Functions      (backend logic)
    ├── FCM                  (push notification)
    └── Firebase Storage     (ảnh avatar, community)
```

### Firestore — Cấu trúc NoSQL

Firestore không có table/JOIN. Dữ liệu là Collection → Document.

```
Firestore (top-level collections)
├── users/{uid}
├── saved_locations/{id}
├── notifications/{docId}
├── weather_cache/{lat_lng}          ← Cloud Functions only
├── ai_cache/{conditionKey}          ← Cloud Functions only
├── gamification/{uid}
├── checkin_history/{docId}
├── community_reports/{reportId}
├── report_upvotes/{docId}
├── badges/{badgeId}                 ← Public catalog
├── user_badges/{docId}
└── system_logs/{docId}             ← Cloud Functions only
```

**Security Rules** kiểm soát quyền truy cập:
- `users/{uid}` → chỉ đúng user đó đọc/ghi
- `weather_cache`, `ai_cache`, `system_logs` → `if false` (block client hoàn toàn)
- `badges` → public read
- Cloud Functions dùng **Admin SDK** → bypass hoàn toàn rules

### Admin SDK vs Client SDK

| | Admin SDK (Cloud Functions) | Client SDK (Flutter) |
|---|---|---|
| Chạy ở | Server | Thiết bị người dùng |
| Bị Security Rules kiểm soát | **Không** — bypass hoàn toàn | **Có** |
| Auth | Service account | ID Token của user |

### Luồng hoạt động: User mở app lần đầu

```
1. Flutter mở → chưa login
2. User nhập email/pass → Firebase Auth tạo UID + ID Token
3. [Tự động] onUserCreate → tạo users/{uid} + gamification/{uid} trong Firestore
4. Flutter lấy FCM token → lưu vào users/{uid}.fcmToken
5. User cho phép location → Flutter có lat/lng
6. Flutter gọi getWeather({lat, lng}) → Cloud Function → cache/OWM → trả data
7. Flutter hiển thị thời tiết + AQI
8. 6AM hôm sau → scheduledWeatherAlert chạy tự động
   → đọc users notificationEnabled=true → fetch weather → gửi FCM nếu mưa/nắng gắt
9. Notification hiện trên điện thoại → tap → deepLink mở đúng màn hình
```

### Flutter không gọi API ngoài trực tiếp

```
Flutter                    Cloud Function              External API
   │                            │                        │
   │── getWeather({lat,lng}) ──▶│                        │
   │                            │── check Firestore cache│
   │                            │   còn mới → return ngay│
   │                            │   hết TTL ─────────────▶ OWM API
   │                            │◀── weather data ────────│
   │                            │── lưu cache Firestore  │
   │◀── weather data ───────────│                        │
```

---

## API Keys (Dev 4)

| Service | Free tier | Dùng cho |
|---------|-----------|----------|
| [OpenWeatherMap](https://openweathermap.org/api) | 1,000 calls/ngày | Weather, Forecast, SearchCity, AQI |
| [Groq](https://console.groq.com/keys) | 14,400 req/ngày | AI Suggestion (llama-3.3-70b-versatile) |

> AQI dùng OWM Air Pollution API — cùng key với weather, không cần đăng ký thêm.

---

## Phân công team

| Dev | Vai trò | Phụ trách trong repo này |
|-----|---------|--------------------------|
| Dev 1 | Flutter UI & Animation | Không |
| Dev 2 | Flutter Integration | Không |
| Dev 3 | Cloud Functions setup, CI/CD, Tests | `firestore.rules`, CI/CD |
| **Dev 4** | **Firebase Config & AI Lead** | **Tất cả `src/`, `firebase.json`, deploy** |
