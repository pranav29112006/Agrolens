import httpx
from fastapi import APIRouter, HTTPException, Query, Request, status

from app.schemas import SprayingOut, WeatherOut
from app.weather.open_meteo import current_hour_index, fetch_forecast, hourly_conditions
from app.weather.spraying import assess_spraying

router = APIRouter()


@router.get("/weather", response_model=WeatherOut)
async def weather(
    request: Request,
    lat: float = Query(ge=-90, le=90),
    lon: float = Query(ge=-180, le=180),
) -> WeatherOut:
    try:
        forecast = await fetch_forecast(request.app.state.http, lat, lon)
    except httpx.HTTPError as error:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Weather service unavailable") from error

    current = forecast["current"]
    spraying = assess_spraying(hourly_conditions(forecast), current_hour_index(forecast))

    return WeatherOut(
        time=current["time"],
        temperature_c=current["temperature_2m"],
        humidity=current["relative_humidity_2m"],
        wind_kmh=current["wind_speed_10m"],
        weather_code=current["weather_code"],
        is_day=bool(current["is_day"]),
        spraying=SprayingOut(status=spraying.status, reasons=spraying.reasons, until=spraying.until),
    )
