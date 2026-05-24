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
    ├── .env.local             # API keys cho local emulator (KHÔNG commit — đã gitignore)
    └── src/
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
            └── auth.js        # verifyIdToken helper
```

---

## Firestore Collections Schema

```
users/{uid}
  - displayName: string
  - email: string
  - photoURL: string
  - createdAt: timestamp
  - unit: "C" | "F"
  - notificationEnabled: boolean
  - fcmToken: string | null
  - notificationSettings: { rain: bool, highTemp: bool, aqi: bool }
  - primaryLocation: { lat: number, lng: number, name: string } | null

users/{uid}/saved_locations/{locationId}
  - name: string
  - lat: number
  - lng: number
  - country: string
  - createdAt: timestamp

notifications/{uid}/items/{itemId}
  - title: string
  - body: string
  - type: "weather_alert" | "general"
  - read: boolean
  - createdAt: timestamp
  - data: object

weather_cache/{key}              (Cloud Functions only — users denied)
  - payload: object
  - updatedAt: timestamp

ai_cache/{conditionKey}          (Cloud Functions only — users denied)
  - payload: object
  - updatedAt: timestamp

gamification/{uid}               (Cloud Functions write — users read only)
  - streak: number
  - lastCheckin: timestamp
  - points: number
  - badges: string[]

community_reports/{reportId}     (all read, auth create, owner delete)
  - uid: string
  - displayName: string
  - type: string
  - description: string
  - photoURL: string | null
  - lat: number
  - lng: number
  - upvotes: string[]
  - createdAt: timestamp

system_logs/{docId}              (Cloud Functions only — all denied)
```

---

## Cloud Functions

| Function | Trigger | Mô tả |
|----------|---------|-------|
| `onUserCreate` | Auth: user().onCreate | Tạo `users/{uid}` document tự động khi đăng ký |
| `onUserDelete` | Auth: user().onDelete | Xóa toàn bộ data user khi xóa tài khoản |
| `getWeather` | HTTPS Callable | Thời tiết hiện tại qua OpenWeatherMap (cache 30 phút) |
| `getForecast` | HTTPS Callable | Dự báo 5 ngày qua OpenWeatherMap (cache 2 giờ) |
| `searchCity` | HTTPS Callable | Tìm kiếm thành phố qua OWM Geocoding API |
| `getAqi` | HTTPS Callable | Chỉ số AQI qua OWM Air Pollution API (cache 1 giờ) |
| `sendNotification` | HTTPS Callable | Gửi FCM push notification + lưu vào Firestore |
| `scheduledWeatherAlert` | Pub/Sub: 6AM VN | Cron job gửi cảnh báo thời tiết hàng ngày |
| `getAiSuggestion` | HTTPS Callable | Gợi ý AI trang phục/hoạt động bằng Groq (có fallback) |

---

## Git Workflow

```
main (production)
 └── develop
      └── trungle2605  ← Dev 4 làm việc ở đây
```

- Commit trên nhánh `trungle2605`
- Tạo Pull Request → merge vào `develop`
- `develop` → merge vào `main` khi release

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

Tạo file `functions/.env.local`:

```bash
# functions/.env.local — KHÔNG commit file này

# OpenWeatherMap (Weather + Forecast + AQI + SearchCity)
# https://openweathermap.org/api
OWM_API_KEY=your_owm_api_key_here

# Groq AI (AI Suggestion)
# https://console.groq.com/keys
GROQ_API_KEY=your_groq_api_key_here
```

> File `.env.local` đã có trong `.gitignore` — không bao giờ commit API keys lên git.

### 5. Chạy emulator local

```bash
cd WeatherTracking_BE
firebase emulators:start --only functions,firestore,auth
```

| Emulator | URL |
|----------|-----|
| UI | http://localhost:4100 |
| Functions | http://localhost:5002 |
| Firestore | http://localhost:8180 |
| Auth | http://localhost:9199 |

---

## Test Functions

Dùng curl sau khi emulator chạy:

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

Trỏ Flutter app vào emulator:

```dart
FirebaseFunctions.instance.useFunctionsEmulator('localhost', 5002);
```

---

## Deploy lên production

```bash
# Deploy Cloud Functions
firebase deploy --only functions

# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy tất cả
firebase deploy
```

> Chỉ Dev 4 deploy. Test emulator đầy đủ trước khi deploy production.

---

## Phân công team

| Dev | Vai trò | Phụ trách trong repo này |
|-----|---------|--------------------------|
| Dev 1 | Flutter UI & Animation | Không |
| Dev 2 | Flutter Integration | Không |
| Dev 3 | Cloud Functions setup, CI/CD, Tests | `firestore.rules`, CI/CD pipeline |
| **Dev 4** | **Firebase Config & AI Lead** | **Tất cả `src/`, `firebase.json`, deploy** |

---

## API Keys (Dev 4)

| Service | Free tier | Dùng cho |
|---------|-----------|----------|
| [OpenWeatherMap](https://openweathermap.org/api) | 1,000 calls/ngày | Weather, Forecast, SearchCity, AQI |
| [Groq](https://console.groq.com/keys) | 14,400 req/ngày | AI Suggestion (llama-3.3-70b-versatile) |

> AQI dùng OWM Air Pollution API (`/data/2.5/air_pollution`) — cùng key với weather, không cần đăng ký thêm. Trả AQI thang 1–5 (1=Tốt → 5=Rất xấu) kèm PM2.5, PM10, NO2, O3.
