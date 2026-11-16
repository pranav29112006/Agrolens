from app.weather.spraying import HourConditions, assess_spraying


def hour(index: int, **overrides) -> HourConditions:
    values = {
        "time": f"2026-09-18T{index:02d}:00",
        "temperature_c": 24,
        "humidity": 60,
        "wind_kmh": 8,
        "rain_probability": 0,
        "rain_mm": 0,
    }
    values.update(overrides)
    return HourConditions(**values)


def test_calm_dry_mild_day_is_good_all_day():
    result = assess_spraying([hour(i) for i in range(24)], now_index=8)
    assert result.status == "good"
    assert result.reasons == []
    assert result.until is None


def test_strong_wind_is_poor():
    hours = [hour(i) for i in range(24)]
    hours[8] = hour(8, wind_kmh=25)
    result = assess_spraying(hours, now_index=8)
    assert result.status == "poor"
    assert result.reasons == ["wind_strong"]


def test_rain_soon_is_moderate():
    hours = [hour(i) for i in range(24)]
    hours[9] = hour(9, rain_probability=70)
    result = assess_spraying(hours, now_index=8)
    assert result.status == "moderate"
    assert result.reasons == ["rain"]


def test_reports_when_conditions_change():
    hours = [hour(i) for i in range(24)]
    for i in range(12, 24):
        hours[i] = hour(i, temperature_c=34)
    result = assess_spraying(hours, now_index=8)
    assert result.status == "good"
    assert result.until == "2026-09-18T12:00"
