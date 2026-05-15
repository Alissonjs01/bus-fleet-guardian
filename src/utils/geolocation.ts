export interface GeoPointSnapshot {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  capturedAt: string;
  timestamp: string;
  source: "gps";
}

export interface GeoPointFailure {
  code: "unsupported" | "permission_denied" | "position_unavailable" | "timeout" | "unknown";
  message: string;
  capturedAt: string;
  timestamp: string;
}

export interface GeoPointResult {
  location: GeoPointSnapshot | null;
  error: GeoPointFailure | null;
}

const GEOLOCATION_TIMEOUT_MS = 10000;

function mapPositionError(error: GeolocationPositionError): GeoPointFailure["code"] {
  if (error.code === error.PERMISSION_DENIED) return "permission_denied";
  if (error.code === error.POSITION_UNAVAILABLE) return "position_unavailable";
  if (error.code === error.TIMEOUT) return "timeout";
  return "unknown";
}

export function getMapUrl(location: Pick<GeoPointSnapshot, "latitude" | "longitude">) {
  return `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`;
}

export async function captureCurrentLocation(): Promise<GeoPointResult> {
  const capturedAt = new Date().toISOString();

  if (!("geolocation" in navigator)) {
    return {
      location: null,
      error: {
        code: "unsupported",
        message: "Geolocalizacao nao suportada neste dispositivo.",
        capturedAt,
        timestamp: capturedAt,
      },
    };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          location: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null,
            capturedAt: new Date().toISOString(),
            timestamp: new Date().toISOString(),
            source: "gps",
          },
          error: null,
        });
      },
      (error) => {
        resolve({
          location: null,
          error: {
            code: mapPositionError(error),
            message: error.message || "Nao foi possivel capturar a localizacao.",
            capturedAt: new Date().toISOString(),
            timestamp: new Date().toISOString(),
          },
        });
      },
      {
        enableHighAccuracy: true,
        maximumAge: 30000,
        timeout: GEOLOCATION_TIMEOUT_MS,
      },
    );
  });
}
