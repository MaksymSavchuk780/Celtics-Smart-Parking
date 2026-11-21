export type BackendStatus = "free" | "occupied" | "reserved";

export type BackendSpot = {
  id: number;
  spot_code: string;
  floor: number;
  sector: string;
  status: BackendStatus;
  coordinates: { x: number; y: number };
  led_indicator: {
    color: "green" | "red" | "blue" | "blink_red";
    hex_color: string;
    mode: "steady" | "blinking";
  };
  current_session: {
    ticket_uid: string;
    plate_number: string;
    entry_time: string;
    fine_amount: number;
  } | null;
  active_reservation: {
    reservation_id: number;
    plate_number: string;
    reserved_from: string;
    reserved_until: string;
  } | null;
  last_telemetry_at: string | null;
};

export type BackendMap = {
  summary: {
    total_spots: number;
    free_spots: number;
    occupied_spots: number;
    reserved_spots: number;
    is_parking_full: boolean;
    recommended_sector: string | null;
  };
  floors: Array<{
    floor: number;
    total_spots: number;
    free_spots: number;
    occupied_spots: number;
    reserved_spots: number;
    is_full: boolean;
  }>;
  spots: BackendSpot[];
};

export type ReservationRequest = {
  plate_number: string;
  spot_code: string;
  floor: number;
  reserved_from: string;
  reserved_until: string;
};

export type ReservationResponse = {
  id: number;
  plate_number: string;
  spot_code: string;
  floor: number;
  reserved_from: string;
  reserved_until: string;
  status: string;
  message: string;
};

export type SensorEventRequest = {
  device_id: string;
  spot_code: string;
  floor: number;
  distance_cm: number;
  raw_state: 0 | 1;
  is_occupied: boolean;
  timestamp: number;
};

export type SensorEventResponse = {
  status: "success" | "warning" | "error";
  spot_code: string;
  led_color: "green" | "red" | "blue" | "blink_red";
  violation_detected: boolean;
  fine_amount: number;
  message: string;
};

const configuredUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
export const API_URL = configuredUrl || "/api";

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const base = API_URL.replace(/\/$/, "");
  const isV1 = base.endsWith("/v1");
  const url = `${base}${isV1 ? "" : "/v1"}${path}`;
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    let detail = `API request failed (${response.status})`;
    try {
      const body = await response.json();
      detail = typeof body.detail === "string" ? body.detail : detail;
    } catch {
      // Keep the status-based error.
    }
    throw new Error(detail);
  }
  return response.json() as Promise<T>;
}

export const getParkingMap = () => apiRequest<BackendMap>("/map");

export const createReservation = (payload: ReservationRequest) =>
  apiRequest<ReservationResponse>("/reservations", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const cancelReservation = (id: number) =>
  apiRequest<ReservationResponse>(`/reservations/${id}`, {
    method: "DELETE",
  });

export const sendSensorEvent = (payload: SensorEventRequest) =>
  apiRequest<SensorEventResponse>("/telemetry/sensor-event", {
    method: "POST",
    body: JSON.stringify(payload),
  });
