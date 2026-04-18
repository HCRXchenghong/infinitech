export const DEFAULT_HOME_WEATHER = {
  temp: 26,
  condition: "多云",
};

function isRecord(value) {
  return Boolean(value) && typeof value === "object";
}

export function resolveHomeWeatherRawPayload(weather = {}) {
  return isRecord(weather) && isRecord(weather.raw) ? weather.raw : {};
}

export function buildHomeWeatherLifeIndexList(rawWeather = {}) {
  const source = rawWeather.life_indices;
  if (!isRecord(source)) {
    return [];
  }

  return Object.keys(source).map((key) => ({
    key,
    label: key,
    ...(isRecord(source[key]) ? source[key] : {}),
  }));
}

export function stringifyHomeWeatherPayload(payload) {
  try {
    return JSON.stringify(payload || {}, null, 2);
  } catch (_error) {
    return "{}";
  }
}

export function resolveHomeWeatherIcon(condition = "") {
  const text = String(condition || "").trim();
  if (text.includes("雨")) return "🌧";
  if (text.includes("云")) return "⛅️";
  if (text.includes("晴")) return "☀️";
  if (text.includes("雪")) return "❄️";
  return "☁️";
}

export function resolveHomeWeatherForecastMin(item = {}) {
  const value =
    item.temp_min !== undefined
      ? item.temp_min
      : item.tempMin !== undefined
        ? item.tempMin
        : item.nighttemp;
  return value !== undefined && value !== null && value !== "" ? value : "--";
}

export function resolveHomeWeatherForecastMax(item = {}) {
  const value =
    item.temp_max !== undefined
      ? item.temp_max
      : item.tempMax !== undefined
        ? item.tempMax
        : item.daytemp;
  return value !== undefined && value !== null && value !== "" ? value : "--";
}

export function resolveHomeWeatherHourlyTemp(item = {}) {
  const value = item.temperature !== undefined ? item.temperature : item.temp;
  return value !== undefined && value !== null && value !== "" ? value : "--";
}

export function createHomeWeatherModalViewModel(weather = {}) {
  const rawWeather = resolveHomeWeatherRawPayload(weather);
  const forecastList = Array.isArray(rawWeather.forecast)
    ? rawWeather.forecast
    : [];
  const hourlyList = Array.isArray(rawWeather.hourly_forecast)
    ? rawWeather.hourly_forecast
    : [];
  const minutelyList = Array.isArray(rawWeather.minutely_precip?.data)
    ? rawWeather.minutely_precip.data
    : [];

  return {
    rawWeather,
    forecastList,
    hourlyList,
    hourlyPreviewList: hourlyList.slice(0, 12),
    minutelyList,
    minutelySummary: String(rawWeather.minutely_precip?.summary || ""),
    lifeIndexList: buildHomeWeatherLifeIndexList(rawWeather),
    weatherJson: stringifyHomeWeatherPayload(rawWeather || weather || {}),
    icon: resolveHomeWeatherIcon(weather?.condition || ""),
  };
}

export function createHomeWeatherModalComponent(options = {}) {
  const defaultWeather =
    options.defaultWeather && isRecord(options.defaultWeather)
      ? options.defaultWeather
      : DEFAULT_HOME_WEATHER;

  return {
    name: String(options.name || "HomeWeatherModal"),
    props: {
      show: {
        type: Boolean,
        default: false,
      },
      weather: {
        type: Object,
        default: () => ({ ...defaultWeather }),
      },
      address: {
        type: String,
        default: "",
      },
    },
    computed: {
      viewModel() {
        return createHomeWeatherModalViewModel(this.weather);
      },
      rawWeather() {
        return this.viewModel.rawWeather;
      },
      forecastList() {
        return this.viewModel.forecastList;
      },
      hourlyList() {
        return this.viewModel.hourlyList;
      },
      hourlyPreviewList() {
        return this.viewModel.hourlyPreviewList;
      },
      minutelyList() {
        return this.viewModel.minutelyList;
      },
      minutelySummary() {
        return this.viewModel.minutelySummary;
      },
      lifeIndexList() {
        return this.viewModel.lifeIndexList;
      },
      weatherJson() {
        return this.viewModel.weatherJson;
      },
      icon() {
        return this.viewModel.icon;
      },
    },
    methods: {
      resolveForecastMin(item = {}) {
        return resolveHomeWeatherForecastMin(item);
      },
      resolveForecastMax(item = {}) {
        return resolveHomeWeatherForecastMax(item);
      },
      resolveHourlyTemp(item = {}) {
        return resolveHomeWeatherHourlyTemp(item);
      },
      handleClose() {
        this.$emit("close");
      },
    },
  };
}
