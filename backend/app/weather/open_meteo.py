"""Local weather from Open-Meteo (free, no API key)."""

from typing import Any

import httpx

from app.weather.spraying import HourConditions

FORECAST_URL = "https://api.open-meteo.com/v1/forecast"

CURRENT_FIELDS = [
    "temperature_2m",
    "relative_humidity_2m",
    "precipitation",
    "weather_code",
    "wind_speed_10m",
    "is_day",
]
HOURLY_FIELDS = [
    "temperature_2m",
    "relative_humidity_2m",
    "precipitation_probability",
    "precipitation",
    "wind_speed_10m",
]


async def fetch_forecast(http: httpx.AsyncClient, latitude: float, longitude: float) -> dict[str, Any]:
    response = await http.get(
        FORECAST_URL,
        params={
            "latitude": latitude,
            "longitude": longitude,
            "current": ",".join(CURRENT_FIELDS),
            "hourly": ",".join(HOURLY_FIELDS),
            # Two days so "good until…" can run past midnight.
            "forecast_days": 2,
            # Times come back in the farm's own time zone.
            "timezone": "auto",
        },
    )
    response.raise_for_status()
    return response.json()


def hourly_conditions(forecast: dict[str, Any]) -> list[HourConditions]:
    hourly = forecast["hourly"]
    return [
        HourConditions(
            time=time,
            temperature_c=hourly["temperature_2m"][i],
            humidity=hourly["relative_humidity_2m"][i],
            wind_kmh=hourly["wind_speed_10m"][i],
            rain_probability=hourly["precipitation_probability"][i] or 0,
            rain_mm=hourly["precipitation"][i] or 0,
        )
        for i, time in enumerate(hourly["time"])
    ]


def current_hour_index(forecast: dict[str, Any]) -> int:
    """Index of the hourly slot containing the current observation time."""
    now = forecast["current"]["time"]  # e.g. "2026-09-18T10:15"
    times = forecast["hourly"]["time"]  # e.g. "2026-09-18T10:00"
    # ISO strings in the same format sort chronologically.
    earlier = [i for i, time in enumerate(times) if time <= now]
    return earlier[-1] if earlier else 0
