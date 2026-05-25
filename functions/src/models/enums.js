// ============================================================
// Enums — mirrors Firestore schema enums
// Use these constants instead of raw strings throughout functions
// ============================================================

const UnitType = Object.freeze({
  C: "C",
  F: "F",
});

const NotificationType = Object.freeze({
  RAIN: "rain",
  HEAT: "heat",
  AQI: "aqi",
  WIND: "wind",
  SYSTEM: "system",
});

const WeatherCondition = Object.freeze({
  SUNNY: "sunny",
  CLOUDY: "cloudy",
  PARTLY_CLOUDY: "partly_cloudy",
  RAIN: "rain",
  HEAVY_RAIN: "heavy_rain",
  STORM: "storm",
  THUNDER: "thunder",
  FOG: "fog",
  SNOW: "snow",
  WINDY: "windy",
});

const ReportType = Object.freeze({
  RAIN: "rain",
  FLOOD: "flood",
  WIND: "wind",
  SUNNY: "sunny",
  FOG: "fog",
  STORM: "storm",
});

const BadgeConditionType = Object.freeze({
  STREAK: "streak",
  TOTAL_CHECKIN: "total_checkin",
  REPORT_COUNT: "report_count",
  UPVOTE_COUNT: "upvote_count",
  POINTS: "points",
});

const ThemeMode = Object.freeze({
  SYSTEM: "system",
  LIGHT: "light",
  DARK: "dark",
});

const MapLayerType = Object.freeze({
  CLOUDS: "clouds",
  RAIN: "rain",
  WIND: "wind",
  TEMP: "temp",
  PRESSURE: "pressure",
});

module.exports = {
  UnitType,
  NotificationType,
  WeatherCondition,
  ReportType,
  BadgeConditionType,
  ThemeMode,
  MapLayerType,
};
