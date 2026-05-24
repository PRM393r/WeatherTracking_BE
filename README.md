# WeatherTracking — Backend (Firebase)

Cloud Functions + Firestore backend cho **Smart Weather App v2**.  
Stack: Firebase Cloud Functions (NodeJS 24) · Firestore · Firebase Auth · FCM · Firebase Storage

---

## Thông tin project

| Mục | Giá trị |
|-----|---------|
| Firebase Project ID | `weathertracking-su26` |
| Region | `asia-southeast1` (Singapore) |
| Android Package | `com.fpt.weather_tracking` |
| iOS Bundle ID | `com.fpt.weathertracking` |
| Node version | 24 |

---

## Cấu trúc thư mục

```
WeatherTracking-BE/
├── firebase.json              # Firebase CLI config (functions, firestore, emulators)
├── firestore.rules            # Firestore Security Rules
├── firestore.indexes.json     # Composite indexes
├── .gitignore
└── functions/
    ├── index.js               # Entry point — export tất cả Cloud Functions
    ├── package.json
    ├── .env.local             # API keys cho local emulator (KHÔNG commit)
    └── src/
        ├── auth/
        │   └── index.js       # onUserCreate, onUserDelete
        ├── weather/
        │   └── index.js       # getWeather, getForecast, searchCity
        ├── notification/
        │   └── index.js       # getAqi, sendNotification, scheduledWeatherAlert
        ├── ai/
        │   └── index.js       # getAiSuggestion (Gemini API + fallback)
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
  - type: string          ("weather_alert" | "general")
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
| `onUserCreate` | Auth: beforeUserCreated | Tạo `users/{uid}` document khi đăng ký |
| `onUserDelete` | Auth: beforeUserDeleted | Xóa sạch data user |
| `getWeather` | HTTPS Callable | Lấy thời tiết hiện tại (cache 30 phút) |
| `getForecast` | HTTPS Callable | Lấy dự báo 5 ngày (cache 2 giờ) |
| `searchCity` | HTTPS Callable | Tìm kiếm thành phố qua OWM Geocoding |
| `getAqi` | HTTPS Callable | Lấy chỉ số AQI (IQAir, cache 1 giờ) |
| `sendNotification` | HTTPS Callable | Gửi FCM + lưu Firestore |
| `scheduledWeatherAlert` | Scheduler: 6AM VN | Cron alert thời tiết hàng ngày |
| `getAiSuggestion` | HTTPS Callable | Gợi ý AI trang phục/hoạt động (Gemini) |

---

## Setup môi trường local

### 1. Yêu cầu

- Node.js 24
- Firebase CLI: `npm install -g firebase-tools`
- Tài khoản Firebase có quyền trên project `weathertracking-su26`

### 2. Clone và cài dependencies

```bash
git clone <repo-url>
cd WeatherTracking-BE/functions
npm install
```

### 3. Đăng nhập Firebase

```bash
firebase login
firebase use weathertracking-su26
```

### 4. Cấu hình API keys

Tạo file `functions/.env.local` (dựa trên template có sẵn):

```bash
# functions/.env.local
OWM_API_KEY=<lấy tại openweathermap.org/api>
IQAIR_API_KEY=<lấy tại iqair.com/air-pollution-data-api>
GEMINI_API_KEY=<lấy tại aistudio.google.com/app/apikey>
```

> **Lưu ý:** File `.env.local` đã có trong `.gitignore` — không commit API keys lên git.

### 5. Chạy emulator local

```bash
cd WeatherTracking-BE
firebase emulators:start --only functions,firestore,auth
```

Emulator UI: http://localhost:4000  
Functions: http://localhost:5001  
Firestore: http://localhost:8080  
Auth: http://localhost:9099

---

## Deploy lên production

```bash
# Deploy chỉ Cloud Functions
firebase deploy --only functions

# Deploy chỉ Firestore rules
firebase deploy --only firestore:rules

# Deploy tất cả
firebase deploy
```

> Chỉ Dev 4 có quyền deploy. Kiểm tra emulator chạy đúng trước khi deploy production.

---

## Test một function cụ thể

Dùng Firebase Emulator + curl hoặc Flutter app chạy với emulator:

```js
// Flutter — trỏ vào emulator local
FirebaseFunctions.instance.useFunctionsEmulator('localhost', 5001);
```

Hoặc gọi trực tiếp qua HTTP (emulator):

```bash
curl -X POST http://localhost:5001/weathertracking-su26/asia-southeast1/getWeather \
  -H "Content-Type: application/json" \
  -d '{"data": {"lat": 10.8231, "lng": 106.6297}}'
```

---

## Phân công team

| Dev | Vai trò | Không đụng vào |
|-----|---------|----------------|
| Dev 1 | Flutter UI & Animation | BE code |
| Dev 2 | Flutter Integration (Repository, FCM, Charts) | BE code |
| Dev 3 | Cloud Functions NodeJS setup, Firestore Rules, CI/CD, Map UI, Tests | `src/auth`, `src/weather`, `src/ai` |
| **Dev 4** | **Firebase Config, `src/auth`, `src/weather`, `src/ai`, `src/notification`, Deploy** | Flutter code |

---

## API Keys cần đăng ký (Dev 4)

| Service | Tier miễn phí | Dùng cho | Link |
|---------|--------------|----------|------|
| OpenWeatherMap | 1,000 calls/ngày | Weather + Forecast + SearchCity + **AQI** | https://openweathermap.org/api |
| Groq | Free tier rộng | AI Suggestion (llama-3.3-70b-versatile) | https://console.groq.com/keys |

> **Lưu ý AQI:** Dùng OWM Air Pollution API (`/data/2.5/air_pollution`) — cùng 1 API key với weather, không cần đăng ký thêm. OWM trả AQI theo thang 1–5 (1=Tốt, 5=Rất xấu) kèm các chỉ số PM2.5, PM10, NO2, O3.
