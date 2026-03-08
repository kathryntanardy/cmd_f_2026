import { useEffect, useRef } from "react";
import { API_BASE, getToken } from "../utils/auth";

const LOCATION_UPDATE_THROTTLE_MS = 15_000;
/** ~5 meters in degrees (approximate) */
const MIN_DEGREES_CHANGE = 5 / 111_320;

function sendLocation(longitude: number, latitude: number): void {
  const token = getToken();
  if (!token) return;

  fetch(`${API_BASE}/api/users/me/location`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ longitude, latitude }),
  }).catch(() => {});
}

export function useLocationTracking(): void {
  const lastSentRef = useRef<{ lng: number; lat: number; time: number } | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    function handlePosition(position: GeolocationPosition) {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const now = Date.now();
      const last = lastSentRef.current;

      if (last === null) {
        lastSentRef.current = { lng, lat, time: now };
        sendLocation(lng, lat);
        return;
      }

      const shouldSend =
        now - last.time >= LOCATION_UPDATE_THROTTLE_MS ||
        Math.hypot(lng - last.lng, lat - last.lat) >= MIN_DEGREES_CHANGE;

      if (shouldSend) {
        lastSentRef.current = { lng, lat, time: now };
        sendLocation(lng, lat);
      }
    }

    function handleError() {
      // Permission denied or unavailable; ignore
    }

    navigator.geolocation.getCurrentPosition(handlePosition, handleError, {
      enableHighAccuracy: false,
      maximumAge: 60_000,
      timeout: 10_000,
    });

    const watchId = navigator.geolocation.watchPosition(handlePosition, handleError, {
      enableHighAccuracy: false,
      maximumAge: LOCATION_UPDATE_THROTTLE_MS,
      timeout: 15_000,
    });

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);
}
