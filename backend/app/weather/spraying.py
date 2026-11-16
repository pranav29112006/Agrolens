"""Is now a good time to spray? Rule-based, from the hourly forecast.

Thresholds follow common extension guidance on pesticide application:
rain washes spray off before it dries, strong wind causes drift, dead calm risks
temperature inversions that carry fine droplets away, and heat or dry air makes
droplets evaporate before they reach the leaf.
"""

from dataclasses import dataclass
from typing import Literal

SprayStatus = Literal["good", "moderate", "poor"]

_RANK: dict[SprayStatus, int] = {"good": 0, "moderate": 1, "poor": 2}

# How many upcoming hours count as "rain soon".
RAIN_LOOKAHEAD_HOURS = 2


@dataclass(frozen=True)
class HourConditions:
    time: str  # local ISO time, as returned by Open-Meteo with timezone=auto
    temperature_c: float
    humidity: float
    wind_kmh: float
    rain_probability: float
    rain_mm: float


@dataclass(frozen=True)
class SprayAssessment:
    status: SprayStatus
    # Codes the app translates: rain, wind_strong, wind_calm, heat, cold, dry_air.
    reasons: list[str]
    # Local time the status next changes, if that happens within the forecast.
    until: str | None


def assess_hour(hour: HourConditions, upcoming: list[HourConditions]) -> tuple[SprayStatus, list[str]]:
    levels: dict[str, SprayStatus] = {}

    if hour.rain_mm >= 0.2 or hour.rain_probability >= 60:
        levels["rain"] = "poor"
    elif any(h.rain_mm >= 0.2 or h.rain_probability >= 50 for h in upcoming[:RAIN_LOOKAHEAD_HOURS]):
        levels["rain"] = "moderate"

    if hour.wind_kmh > 20:
        levels["wind_strong"] = "poor"
    elif hour.wind_kmh > 15:
        levels["wind_strong"] = "moderate"
    elif hour.wind_kmh < 3:
        levels["wind_calm"] = "moderate"

    if hour.temperature_c > 32:
        levels["heat"] = "poor"
    elif hour.temperature_c > 28:
        levels["heat"] = "moderate"
    elif hour.temperature_c < 5:
        levels["cold"] = "moderate"

    if hour.humidity < 40:
        levels["dry_air"] = "moderate"

    status: SprayStatus = max(levels.values(), key=_RANK.__getitem__, default="good")
    return status, [reason for reason, level in levels.items() if level == status]


def assess_spraying(hours: list[HourConditions], now_index: int) -> SprayAssessment:
    """Assesses the hour at `now_index` and finds when that assessment stops holding."""
    status, reasons = assess_hour(hours[now_index], hours[now_index + 1 :])

    until = None
    for index in range(now_index + 1, len(hours)):
        if assess_hour(hours[index], hours[index + 1 :])[0] != status:
            until = hours[index].time
            break

    return SprayAssessment(status=status, reasons=reasons, until=until)
