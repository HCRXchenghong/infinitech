import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_HOME_WEATHER,
  buildHomeWeatherLifeIndexList,
  createHomeWeatherModalComponent,
  createHomeWeatherModalViewModel,
  resolveHomeWeatherForecastMax,
  resolveHomeWeatherForecastMin,
  resolveHomeWeatherHourlyTemp,
  resolveHomeWeatherIcon,
  resolveHomeWeatherRawPayload,
  stringifyHomeWeatherPayload,
} from "./home-weather-modal.js";

test("home weather modal helpers normalize raw weather payloads safely", () => {
  assert.deepEqual(resolveHomeWeatherRawPayload(null), {});
  assert.deepEqual(
    resolveHomeWeatherRawPayload({
      raw: {
        forecast: [{ date: "today" }],
      },
    }),
    {
      forecast: [{ date: "today" }],
    },
  );
});

test("home weather modal helpers build stable view models and icon text", () => {
  const viewModel = createHomeWeatherModalViewModel({
    condition: "小雨",
    raw: {
      forecast: [{ date: "周一", temp_min: 18, temp_max: 26 }],
      hourly_forecast: Array.from({ length: 14 }, (_, index) => ({
        time: `${index}:00`,
        temp: index,
      })),
      minutely_precip: {
        summary: "未来两小时有零星降雨",
        data: [{ minute: 1 }],
      },
      life_indices: {
        umbrella: {
          level: "建议携带",
        },
      },
    },
  });

  assert.equal(viewModel.icon, "🌧");
  assert.equal(viewModel.forecastList.length, 1);
  assert.equal(viewModel.hourlyList.length, 14);
  assert.equal(viewModel.hourlyPreviewList.length, 12);
  assert.equal(viewModel.minutelySummary, "未来两小时有零星降雨");
  assert.deepEqual(viewModel.lifeIndexList, [
    {
      key: "umbrella",
      label: "umbrella",
      level: "建议携带",
    },
  ]);
  assert.match(viewModel.weatherJson, /forecast/);
  assert.deepEqual(
    buildHomeWeatherLifeIndexList({
      life_indices: {
        uv: {
          brief: "较强",
        },
      },
    }),
    [
      {
        key: "uv",
        label: "uv",
        brief: "较强",
      },
    ],
  );
  assert.equal(resolveHomeWeatherIcon("晴转多云"), "⛅️");
  assert.equal(stringifyHomeWeatherPayload(undefined), "{}");
});

test("home weather modal helpers normalize forecast and hourly temperatures", () => {
  assert.equal(resolveHomeWeatherForecastMin({ temp_min: 12 }), 12);
  assert.equal(resolveHomeWeatherForecastMin({ tempMin: 13 }), 13);
  assert.equal(resolveHomeWeatherForecastMin({ nighttemp: 14 }), 14);
  assert.equal(resolveHomeWeatherForecastMin({}), "--");

  assert.equal(resolveHomeWeatherForecastMax({ temp_max: 23 }), 23);
  assert.equal(resolveHomeWeatherForecastMax({ tempMax: 24 }), 24);
  assert.equal(resolveHomeWeatherForecastMax({ daytemp: 25 }), 25);
  assert.equal(resolveHomeWeatherForecastMax({}), "--");

  assert.equal(resolveHomeWeatherHourlyTemp({ temperature: 19 }), 19);
  assert.equal(resolveHomeWeatherHourlyTemp({ temp: 20 }), 20);
  assert.equal(resolveHomeWeatherHourlyTemp({}), "--");
});

test("home weather modal component factory keeps defaults and close semantics stable", () => {
  const component = createHomeWeatherModalComponent({
    name: "ConsumerWeatherModal",
  });
  let emittedEvent = "";

  assert.equal(component.name, "ConsumerWeatherModal");
  assert.equal(component.props.show.default, false);
  assert.deepEqual(component.props.weather.default(), DEFAULT_HOME_WEATHER);
  assert.equal(component.props.address.default, "");

  const viewModel = component.computed.viewModel.call({
    weather: {
      condition: "晴",
      raw: {
        forecast: [{ date: "周二" }],
      },
    },
  });
  assert.equal(viewModel.icon, "☀️");

  component.methods.handleClose.call({
    $emit(eventName) {
      emittedEvent = eventName;
    },
  });
  assert.equal(emittedEvent, "close");
});
