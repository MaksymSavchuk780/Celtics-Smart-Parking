export type ParkingStatus = "free" | "occupied";

export type ParkingSpot = {
  id: number;
  spot_code: string;
  floor: number;
  sector: string;
  status: ParkingStatus;
  coordinates: { x: number; y: number };
};

export type FloorSummary = {
  floor: number;
  total_spots: number;
  free_spots: number;
  occupied_spots: number;
  is_full: boolean;
};

export type ParkingMap = {
  summary: {
    total_spots: number;
    free_spots: number;
    occupied_spots: number;
    is_parking_full: boolean;
    recommended_sector: string | null;
  };
  floors: FloorSummary[];
  spots: ParkingSpot[];
};

const configuredUrl = import.meta.env.VITE_API_URL?.trim();
const apiBase = (configuredUrl || "/api").replace(/\/$/, "");
const apiVersion = apiBase.endsWith("/v1") ? apiBase : apiBase + "/v1";

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiVersion + path, init);
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    const detail = typeof error?.detail === "string" ? error.detail : "Request failed (" + response.status + ")";
    throw new Error(detail);
  }
  return response.json() as Promise<T>;
}

export const getParkingMap = (signal: AbortSignal) => apiRequest<ParkingMap>("/map", { signal });

export const sendSensorEvent = (spot: ParkingSpot, occupied: boolean) =>
  apiRequest("/telemetry/sensor-event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      device_id: "dashboard-demo",
      spot_code: spot.spot_code,
      floor: spot.floor,
      distance_cm: occupied ? 5 : 100,
      raw_state: occupied ? 1 : 0,
      is_occupied: occupied,
      timestamp: Math.floor(Date.now() / 1000),
    }),
  });
