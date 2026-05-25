const { FieldValue, Timestamp } = require("firebase-admin/firestore");

const TTL_MINUTES = 30;

/**
 * Build weather_cache document for weather_cache/{id}
 * id format: "{lat_rounded}_{lng_rounded}"
 *
 * @param {object} owmCurrent - raw OWM current weather response
 * @param {object} owmForecast - raw OWM forecast response (list[])
 * @param {object} aqiData - { aqi, aqiCategory, mainPollutant }
 */
function buildWeatherCacheDoc(owmCurrent, owmForecast = null, aqiData = null) {
  const w = owmCurrent;
  const expiresAt = new Date(Date.now() + TTL_MINUTES * 60 * 1000);

  return {
    temp: w.main.temp,
    feelsLike: w.main.feels_like,
    humidity: w.main.humidity,
    windSpeed: w.wind?.speed ?? 0,
    windDeg: w.wind?.deg ?? 0,
    uvIndex: null,
    visibility: (w.visibility ?? 0) / 1000,
    pressure: w.main.pressure,
    condition: mapOwmCondition(w.weather?.[0]?.main),
    conditionText: w.weather?.[0]?.description || "",
    iconCode: w.weather?.[0]?.icon || "",
    sunrise: w.sys?.sunrise ? Timestamp.fromMillis(w.sys.sunrise * 1000) : null,
    sunset: w.sys?.sunset ? Timestamp.fromMillis(w.sys.sunset * 1000) : null,
    forecastData: owmForecast ? JSON.stringify(owmForecast) : null,
    aqi: aqiData?.aqi ?? null,
    aqiCategory: aqiData?.aqiCategory ?? null,
    mainPollutant: aqiData?.mainPollutant ?? null,
    updatedAt: FieldValue.serverTimestamp(),
    expiresAt: Timestamp.fromDate(expiresAt),
  };
}

// Map OWM main condition string → WeatherCondition enum
function mapOwmCondition(owmMain) {
  const map = {
    Clear: "sunny",
    Clouds: "cloudy",
    Rain: "rain",
    Drizzle: "rain",
    Thunderstorm: "thunder",
    Snow: "snow",
    Fog: "fog",
    Mist: "fog",
    Haze: "fog",
    Dust: "fog",
    Sand: "fog",
    Ash: "fog",
    Squall: "windy",
    Tornado: "storm",
  };
  return map[owmMain] || "partly_cloudy";
}

module.exports = { buildWeatherCacheDoc, mapOwmCondition, TTL_MINUTES };
