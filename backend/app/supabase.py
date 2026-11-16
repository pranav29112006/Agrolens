"""Minimal Supabase REST calls, made on behalf of the signed-in user."""

from typing import Any

import httpx

from app.config import Settings

LEAF_PHOTOS_BUCKET = "leaf-photos"


class SupabaseClient:
    def __init__(self, settings: Settings, http: httpx.AsyncClient):
        self._url = settings.supabase_url.rstrip("/")
        self._anon_key = settings.supabase_anon_key
        self._http = http

    def _headers(self, token: str) -> dict[str, str]:
        return {"apikey": self._anon_key, "Authorization": f"Bearer {token}"}

    async def get_user(self, token: str) -> dict[str, Any] | None:
        """Returns the user a login token belongs to, or None if it isn't valid."""
        response = await self._http.get(f"{self._url}/auth/v1/user", headers=self._headers(token))
        return response.json() if response.status_code == 200 else None

    async def upload_leaf_photo(self, token: str, path: str, data: bytes) -> None:
        response = await self._http.post(
            f"{self._url}/storage/v1/object/{LEAF_PHOTOS_BUCKET}/{path}",
            headers={**self._headers(token), "Content-Type": "image/jpeg"},
            content=data,
        )
        response.raise_for_status()

    async def insert_diagnosis(self, token: str, row: dict[str, Any]) -> dict[str, Any]:
        response = await self._http.post(
            f"{self._url}/rest/v1/diagnoses",
            headers={**self._headers(token), "Prefer": "return=representation"},
            json=row,
        )
        response.raise_for_status()
        return response.json()[0]
