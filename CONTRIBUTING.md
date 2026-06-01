# Hướng dẫn Contribute — WeatherTracking Backend

## Yêu cầu môi trường

- **Node.js** 24+ ([Download](https://nodejs.org/))
- **Firebase CLI**: `npm install -g firebase-tools`
- Quyền truy cập Firebase project `weathertracking-su26`

---

## Setup lần đầu

### 1. Clone repo

```bash
git clone https://github.com/PRM393r/WeatherTracking_BE.git
cd WeatherTracking_BE
```

### 2. Cài dependencies

```bash
cd functions
npm install
```

### 3. Đăng nhập Firebase

```bash
firebase login
firebase use weathertracking-su26
```

### 4. Cấu hình API keys

Copy file `.env.local` và điền API keys:

```bash
cd functions
# Mở file .env.local và điền:
# OWM_API_KEY=your_openweathermap_key
# GROQ_API_KEY=your_groq_key
```

> ⚠️ **KHÔNG commit file `.env.local` lên repo!**

---

## Chạy Local (Emulator)

```bash
# Từ thư mục gốc (WeatherTracking_BE/)
firebase emulators:start --only functions,firestore,auth
```

### Emulator URLs

| Service | URL |
|---------|-----|
| Emulator UI | http://localhost:4100 |
| Functions | http://localhost:5002 |
| Firestore | http://localhost:8180 |
| Auth | http://localhost:9199 |

### Seed badges (chạy 1 lần)

```bash
cd functions
set FIRESTORE_EMULATOR_HOST=localhost:8180
node src/utils/seedBadges.js
```

---

## Lint & Test

```bash
cd functions

# Chạy ESLint
npm run lint

# Chạy tests
npm test
```

> CI/CD sẽ tự động chạy lint + test khi push hoặc tạo PR.

---

## Git Workflow

```
main (production)
 └── develop (staging)
      └── feature/PRM-XX-description  ← Tạo branch từ develop
```

### Quy trình làm việc

1. **Tạo branch** từ `develop`:
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/PRM-XX-ten-task
   ```

2. **Code & commit** theo convention:
   ```bash
   git commit -m "feat(PRM-XX): mô tả ngắn"
   ```

3. **Push & tạo PR** vào `develop`:
   ```bash
   git push origin feature/PRM-XX-ten-task
   ```

4. **Code review** → Merge vào `develop`

5. **Release** → Merge `develop` vào `main` → CI/CD tự deploy

---

## Cấu trúc thư mục

```
functions/
├── index.js               # Entry point — export tất cả Cloud Functions
├── package.json
├── eslint.config.mjs      # ESLint config
├── .env.local             # API keys local (KHÔNG commit)
├── .env.production        # API keys production
└── src/
    ├── auth/              # onUserCreate, onUserDelete
    ├── weather/           # getWeather, getForecast, searchCity
    ├── notification/      # getAqi, sendNotification, scheduledWeatherAlert
    ├── ai/                # getAiSuggestion
    ├── community/         # createReport, upvoteReport
    ├── models/            # Schema builders & enum constants
    └── utils/             # Admin SDK, auth helpers, seed scripts
```

---

## Quy tắc code

- Dùng `const` / `let`, **không dùng** `var`
- Tất cả functions đặt region `asia-southeast1`
- Xử lý error bằng `HttpsError` với code phù hợp
- Validate input với `joi` hoặc kiểm tra thủ công
- Console.error cho error, console.log cho info
