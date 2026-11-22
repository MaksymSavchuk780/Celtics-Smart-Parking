import { useSyncExternalStore } from "react";
import { getParkingMap, sendSensorEvent, type BackendMap } from "./api";

export type Status = "free" | "occupied" | "unavailable";
export type FloorId = "P-1" | "P1" | "P2";
export type SpotDef = {
  id: string;
  row: string;
  x: number;
  y: number;
  cx: number;
  cy: number;
  aisle: number;
  ev: boolean;
};

export const FLOORS: FloorId[] = ["P2", "P1", "P-1"];
export const FLOORS_ASC: FloorId[] = ["P-1", "P1", "P2"];
export const AISLES_Y = [175, 375, 575];
const COLS = Array.from({ length: 17 }, (_, i) => 190 + 40 * i);
const ROWS = [
  { row: "A", y0: 75, aisle: 0 },
  { row: "B", y0: 205, aisle: 0 },
  { row: "C", y0: 275, aisle: 1 },
  { row: "D", y0: 405, aisle: 1 },
  { row: "E", y0: 475, aisle: 2 },
  { row: "F", y0: 605, aisle: 2 },
];

export const SPOTS: SpotDef[] = [];
ROWS.forEach((r) =>
  COLS.forEach((cx, i) => {
    if ((r.row === "B" || r.row === "C") && (i === 7 || i === 8)) return; // lift lobby
    SPOTS.push({
      id: `${r.row}${String(i + 1).padStart(2, "0")}`,
      row: r.row,
      x: cx - 19,
      y: r.y0,
      cx,
      cy: r.y0 + 35,
      aisle: r.aisle,
      ev: r.row === "F" && i >= 14,
    });
  }),
);
export const SPOT_INDEX: Record<string, number> = Object.fromEntries(
  SPOTS.map((s, i) => [s.id, i]),
);
export const SPOTS_PER_FLOOR = SPOTS.length;
export const TOTAL_SPOTS = SPOTS_PER_FLOOR * FLOORS.length;

const PRICE_PER_HOUR = 30;
export type EventKind = "in" | "out" | "system";
type EventItem = { id: number; at: number; kind: EventKind; text: string };
type FloorState<T> = Record<FloorId, T>;
type ParkState = {
  statuses: FloorState<Status[]>;
  occupiedSince: Record<string, number>;
  events: EventItem[];
  revenue: number[];
  sessions: number;
  day: string;
  seq: number;
  sim: boolean;
};

const pad = (n: number) => String(n).padStart(2, "0");
const isoDate = (d: Date) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
export const hhmm = (t: number) => {
  const d = new Date(t);
  return pad(d.getHours()) + ":" + pad(d.getMinutes());
};
export const money = (n: number) => Math.round(n).toLocaleString("uk-UA") + " ₴";
export const countOf = (st: Status[], s: Status) => st.filter((status) => status === s).length;
export const fmtStay = (min: number) =>
  min >= 60 ? Math.floor(min / 60) + " год " + pad(min % 60) + " хв" : min + " хв";

const blankStatuses = (): FloorState<Status[]> => ({
  "P-1": SPOTS.map(() => "unavailable"),
  P1: SPOTS.map(() => "unavailable"),
  P2: SPOTS.map(() => "unavailable"),
});
const emptyRevenue = () => Array.from({ length: 24 }, () => 0);
const floorNumber: FloorState<number> = { "P-1": -1, P1: 1, P2: 2 };
const floorByNumber = new Map(FLOORS_ASC.map((floor) => [floorNumber[floor], floor]));
const storeKey = "parkflow-availability-state";
const listeners = new Set<() => void>();
const serverListeners = new Set<() => void>();
let serverSnapshot: { loading: boolean; error: string | null; serverBacked: boolean } = {
  loading: true,
  error: null,
  serverBacked: false,
};

function initialState(): ParkState {
  try {
    const stored = localStorage.getItem(storeKey);
    if (stored) {
      const saved = JSON.parse(stored) as ParkState;
      if (FLOORS_ASC.every((floor) => saved.statuses[floor].length === SPOTS.length)) {
        return { ...saved, sim: false };
      }
    }
  } catch {
    // Parking remains usable when browser storage is unavailable.
  }
  return {
    statuses: blankStatuses(),
    occupiedSince: {},
    events: [],
    revenue: emptyRevenue(),
    sessions: 0,
    day: isoDate(new Date()),
    seq: 0,
    sim: false,
  };
}

let state = initialState();

function set(next: ParkState) {
  if (next === state) return;
  state = next;
  try {
    localStorage.setItem(storeKey, JSON.stringify(state));
  } catch {
    // Continue with the in-memory state.
  }
  listeners.forEach((listener) => listener());
}

function setServerStatus(snapshot: typeof serverSnapshot) {
  serverSnapshot = snapshot;
  serverListeners.forEach((listener) => listener());
}

function subscribe(listeners: Set<() => void>) {
  return (listener: () => void) => {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  };
}

const subscribeParking = subscribe(listeners);
const subscribeServer = subscribe(serverListeners);

export const usePark = () => useSyncExternalStore(subscribeParking, () => state);
export const useServerStatus = () => useSyncExternalStore(subscribeServer, () => serverSnapshot);

function applyServerMap(map: BackendMap) {
  const now = new Date();
  const day = isoDate(now);
  const sameDay = day === state.day;
  const statuses = blankStatuses();
  const occupiedSince: ParkState["occupiedSince"] = {};
  const revenue = sameDay ? [...state.revenue] : emptyRevenue();
  const events: EventItem[] = [];
  let sessions = sameDay ? state.sessions : 0;
  let seq = state.seq;

  for (const spot of map.spots) {
    const floor = floorByNumber.get(spot.floor);
    const index = SPOT_INDEX[spot.spot_code.replace("-", "").toUpperCase()];
    if (floor === undefined || index === undefined) continue;
    statuses[floor][index] = spot.status;
    const key = floor + ":" + index;
    const previous = state.statuses[floor][index];

    if (spot.status === "occupied") {
      const timestamp = spot.last_telemetry_at ? Date.parse(spot.last_telemetry_at) : NaN;
      occupiedSince[key] = state.occupiedSince[key] ?? (Number.isFinite(timestamp) ? Math.min(timestamp, +now) : +now);
    }
    if (previous === spot.status || previous === "unavailable") continue;

    const arrival = spot.status === "occupied";
    events.push({
      id: ++seq,
      at: +now,
      kind: arrival ? "in" : "out",
      text: "Місце " + SPOTS[index].id + " · " + floor + (arrival ? " · заїзд" : " · виїзд"),
    });
    if (arrival) {
      sessions += 1;
    } else if (state.occupiedSince[key] !== undefined) {
      const hours = Math.max(1, Math.ceil((+now - state.occupiedSince[key]) / 3_600_000));
      revenue[now.getHours()] += hours * PRICE_PER_HOUR;
    }
  }

  if (!FLOORS_ASC.some((floor) => statuses[floor].some((status, i) => status !== state.statuses[floor][i])) && sameDay) return;
  if (!events.length && !state.events.length) {
    events.push({
      id: ++seq,
      at: +now,
      kind: "system",
      text: "Дані паркінгу завантажено з сервера · " + map.summary.free_spots + " вільних місць",
    });
  }

  set({ ...state, statuses, occupiedSince, events: [...events.reverse(), ...state.events].slice(0, 40), revenue, sessions, seq, day });
}

let mapRequest: Promise<void> | undefined;

export function syncServerParking(): Promise<void> {
  mapRequest ??= getParkingMap()
    .then((map) => {
      applyServerMap(map);
      setServerStatus({ loading: false, error: null, serverBacked: true });
    })
    .catch((error: unknown) => {
      setSim(false);
      setServerStatus({
        loading: false,
        error: error instanceof Error ? error.message : "Не вдалося отримати дані паркінгу",
        serverBacked: false,
      });
    })
    .finally(() => { mapRequest = undefined; });
  return mapRequest;
}

let intent: { floor: FloorId } | null = null;

export function setIntent(next: typeof intent) { intent = next; }
export function consumeIntent() {
  const next = intent;
  intent = null;
  return next;
}

let changingSpots = false;

async function updateSpots(spots: { floor: FloorId; idx: number }[], occupied: boolean) {
  if (!serverSnapshot.serverBacked || changingSpots || !spots.length) return;
  changingSpots = true;
  try {
    for (const { floor, idx } of spots) {
      const id = SPOTS[idx].id;
      await sendSensorEvent({
        device_id: "frontend-led-control",
        spot_code: id[0] + "-" + id.slice(1),
        floor: floorNumber[floor],
        distance_cm: occupied ? 5 : 50,
        raw_state: occupied ? 1 : 0,
        is_occupied: occupied,
        timestamp: Math.floor(Date.now() / 1000),
      });
    }
    await mapRequest;
    await syncServerParking();
  } catch (error) {
    await syncServerParking();
    setServerStatus({ ...serverSnapshot, error: error instanceof Error ? error.message : "Не вдалося оновити місце" });
  } finally {
    changingSpots = false;
  }
}

function selectSpots(floors: FloorId[], status: Status) {
  return floors.flatMap((floor) =>
    state.statuses[floor].flatMap((current, idx) => current === status ? [{ floor, idx }] : []),
  );
}

export const arrive = (floor: FloorId) => updateSpots(selectSpots([floor], "free").slice(0, 1), true);
export const departRandom = (floor: FloorId, n = 1) => updateSpots(selectSpots([floor], "occupied").slice(0, n), false);
export const fillAll = () => updateSpots(selectSpots(FLOORS_ASC, "free"), true);
export const restoreFloors = () => updateSpots(selectSpots(FLOORS_ASC, "occupied"), false);

let simTimer: ReturnType<typeof setInterval> | undefined;

export function setSim(on: boolean) {
  if (simTimer !== undefined) {
    clearInterval(simTimer);
    simTimer = undefined;
  }
  if (state.sim !== on) set({ ...state, sim: on });
  if (!on) return;

  simTimer = setInterval(() => {
    const floor = FLOORS_ASC[Math.floor(Math.random() * FLOORS_ASC.length)];
    if (Math.random() < 0.45) void arrive(floor);
    else void departRandom(floor);
  }, 6000);
}

export function resetDemo() {
  set({ ...state, events: [], sessions: 0, revenue: emptyRevenue(), day: isoDate(new Date()) });
}

export function metrics(s: ParkState) {
  const per = FLOORS_ASC.map((floor) => {
    const free = countOf(s.statuses[floor], "free");
    const occupied = countOf(s.statuses[floor], "occupied");
    const total = free + occupied;
    return { floor, free, occupied, total, load: total ? Math.round(100 * occupied / total) : 0 };
  });
  const free = per.reduce((sum, floor) => sum + floor.free, 0);
  const occupied = per.reduce((sum, floor) => sum + floor.occupied, 0);
  const total = free + occupied;
  const now = Date.now();
  const stays = Object.values(s.occupiedSince).map((since) => Math.max(1, Math.round((now - since) / 60000)));
  const avgStay = stays.length ? Math.round(stays.reduce((sum, stay) => sum + stay, 0) / stays.length) : 0;
  const buckets = [0, 0, 0, 0, 0];
  stays.forEach((min) => { buckets[min < 30 ? 0 : min < 60 ? 1 : min < 120 ? 2 : min < 180 ? 3 : 4]++; });

  return { per, free, occupied, total, load: total ? Math.round(100 * occupied / total) : 0, avgStay, buckets,
    revenueToday: s.revenue.reduce((sum, hour) => sum + hour, 0) };
}

export function bestSector(st: Status[]) {
  const counts: Record<string, number> = {};
  SPOTS.forEach((sp, i) => {
    if (st[i] === "free") counts[sp.row] = (counts[sp.row] ?? 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

export function downloadFile(name: string, content: string, type = "text/csv;charset=utf-8") {
  const blob = new Blob(["\ufeff" + content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function reportCsv(s: ParkState) {
  const m = metrics(s);
  const lines = [
    ["ParkFlow · звіт за", s.day.split("-").reverse().join(".")],
    [],
    ["Поверх", "Вільно", "Зайнято", "Заповненість %"],
    ...m.per.map((p) => [p.floor, p.free, p.occupied, p.load]),
    [],
    ["Прибуток сьогодні (оцінка), грн", m.revenueToday],
    ["Середній час стоянки, хв", m.avgStay],
  ];
  return lines.map((row) => row.map((cell) => '"' + cell + '"').join(";")).join("\n");
}
