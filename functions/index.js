const { setGlobalOptions } = require("firebase-functions");

// Initialize admin SDK once at module load (cold start optimization)
require("./src/utils/admin");

setGlobalOptions({ maxInstances: 10, region: "asia-southeast1" });

// Auth triggers
const auth = require("./src/auth");
exports.onUserCreate = auth.onUserCreate;
exports.onUserDelete = auth.onUserDelete;

// Weather Cloud Functions
const weather = require("./src/weather");
exports.getWeather = weather.getWeather;
exports.getForecast = weather.getForecast;
exports.searchCity = weather.searchCity;

// Notification + AQI + Scheduled Alert
const notification = require("./src/notification");
exports.getAqi = notification.getAqi;
exports.sendNotification = notification.sendNotification;
exports.scheduledWeatherAlert = notification.scheduledWeatherAlert;

// AI Suggestion
const ai = require("./src/ai");
exports.getAiSuggestion = ai.getAiSuggestion;
