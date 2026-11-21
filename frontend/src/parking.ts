import { useSyncExternalStore } from "react";
import {
  cancelReservation,
  createReservation,
  getParkingMap,
  sendSensorEvent,
  type BackendMap,
} from "./api";

/* =====================================================================
   ParkFlow shared parking model — single source of truth for every tab
   (navigator, LED board, booking, dashboard, home). Persisted locally.
   World units: 1 unit = 0.1 m.
   ===================================================================== */

export type Status = "free" | "occupied" | "reserved" | "unavailable";
export type FloorId = "P-1" | "P1" | "P2";
export type Pt = { x: number; y: number };
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
export const AISLE_NAMES = ["Проїзд A–B", "Проїзд C–D", "Проїзд E–F"];
export const LEFT_X = 110;
export const RIGHT_X = 890;
export const COLS = Array.from({ length: 17 }, (_, i) => 190 + 40 * i);
export const ROWS = [
  { row: "A", y0: 75, aisle: 0 },
  { row: "B", y0: 205, aisle: 0 },
  { row: "C", y0: 275, aisle: 1 },
  { row: "D", y0: 405, aisle: 1 },
  { row: "E", y0: 475, aisle: 2 },
  { row: "F", y0: 605, aisle: 2 },
];
export const ENTRANCE: Pt = { x: LEFT_X, y: 730 };
export const LIFT: Pt = { x: 500, y: 345 };
export const LIFT_N: Pt = { x: 500, y: 205 }; // second lobby door (pedestrians only)

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

export const PRICE_PER_HOUR = 30;
export const EV_SURCHARGE = 20;
export const INITIAL_FREE: Record<FloorId, number> = { "P-1": 0, P1: 15, P2: 38 };

export const DEMO_CARS = [
  { plate: "AA 7421 KI", ticket: "T-1042", floor: "P1" as FloorId, spot: "D07" },
  { plate: "KA 1189 BX", ticket: "T-2210", floor: "P2" as FloorId, spot: "B12" },
  { plate: "BI 9042 EM", ticket: "T-3307", floor: "P-1" as FloorId, spot: "F03" },
];

export const VIOLATION_TYPES: { type: string; amount: number }[] = [
  { type: "Місце для МГН", amount: 1020 },
  { type: "Поза розміткою", amount: 680 },
  { type: "Перевищено час", amount: 510 },
  { type: "Чуже бронювання", amount: 850 },
  { type: "Заблоковано проїзд", amount: 1360 },
  { type: "EV-місце без зарядки", amount: 400 },
];

/* ---------- Types ---------- */
export type Car = {
  plate: string;
  ticket: string;
  floor: FloorId;
  spotIdx: number;
  since: number;
  mine?: boolean;
};
export type Booking = {
  code: string;
  floor: FloorId;
  spotIdx: number;
  date: string;
  start: string;
  hours: number;
  plate: string;
  name: string;
  price: number;
  status: "active" | "arrived" | "cancelled";
  createdAt: number;
  online: boolean;
  byMe?: boolean;
};
export type Fine = {
  id: string;
  plate: string;
  date: string;
  time: string;
  floor: FloorId;
  spotId: string;
  type: string;
  amount: number;
  status: "unpaid" | "paid" | "review";
};
export type Violation = {
  id: string;
  plate: string;
  floor: FloorId;
  spotIdx: number;
  type: string;
  amount: number;
  at: number;
};
export type EventKind = "in" | "out" | "book" | "cancel" | "violation" | "fine" | "pay" | "system";
export type EventItem = { id: number; at: number; kind: EventKind; text: string };
export type Intent =
  | { kind: "spot"; floor: FloorId; spotIdx: number; label: string }
  | { kind: "floor"; floor: FloorId; spotIdx?: number }
  | null;

export type ParkState = {
  v: number;
  day: string;
  seq: number;
  statuses: Record<FloorId, Status[]>;
  cars: Car[];
  bookings: Booking[];
  fines: Fine[];
  violations: Violation[];
  events: EventItem[];
  revenue: number[];
  sessions: number;
  myTicket: string | null;
  sim: boolean;
  intent: Intent;
};

/* ---------- Helpers ---------- */
const pad = (n: number) => String(n).padStart(2, "0");
export const isoDate = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fmtDate = (iso: string) => iso.split("-").reverse().join(".");
export const hhmm = (t: number) => {
  const d = new Date(t);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
export const money = (n: number) => `${Math.round(n).toLocaleString("uk-UA")} ₴`;
export const norm = (v: string) => {
  const map: Record<string, string> = {
    А: "A",
    В: "B",
    Е: "E",
    І: "I",
    К: "K",
    М: "M",
    Н: "H",
    О: "O",
    Р: "P",
    С: "C",
    Т: "T",
    Х: "X",
  };
  return v
    .toUpperCase()
    .replace(/./g, (c) => map[c] ?? c)
    .replace(/[^A-Z0-9]/g, "");
};
export const formatPlate = (v: string) => {
  const n = norm(v);
  const m = n.match(/^([A-Z]{2})(\d{4})([A-Z]{2})$/);
  return m ? `${m[1]} ${m[2]} ${m[3]}` : v.toUpperCase().trim();
};
export const isPlate = (v: string) => /^[A-Z]{2}\d{4}[A-Z]{2}$/.test(norm(v));
export const countOf = (st: Status[], s: Status) => st.reduce((a, x) => a + (x === s ? 1 : 0), 0);
export const stayMin = (c: Car, now = Date.now()) =>
  Math.max(1, Math.round((now - c.since) / 60000));
export const fmtStay = (min: number) =>
  min >= 60 ? `${Math.floor(min / 60)} год ${pad(min % 60)} хв` : `${min} хв`;

function rng(seed: number) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
const LETTERS = "ABCEHIKMOPTX";
const REGIONS = ["AA", "KA", "AI", "BI", "AE", "BC", "KE", "AX", "BH", "CA", "BO", "AT"];
const plateFrom = (r: () => number) =>
  `${REGIONS[Math.floor(r() * REGIONS.length)]} ${1000 + Math.floor(r() * 9000)} ${LETTERS[Math.floor(r() * 12)]}${LETTERS[Math.floor(r() * 12)]}`;
const NAMES = [
  "Олена К.",
  "Андрій М.",
  "Ірина С.",
  "Тарас Б.",
  "Марія Л.",
  "Дмитро П.",
  "Оксана Г.",
];

function shuffled(r: () => number) {
  const idx = SPOTS.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx;
}

/* ---------- Seed ---------- */
function seed(): ParkState {
  const now = Date.now();
  const r = rng(20250524);
  let seq = 5000;
  const statuses = {} as Record<FloorId, Status[]>;
  const cars: Car[] = [];
  const bookings: Booking[] = [];
  const cfg: Record<FloorId, [number, number, number]> = {
    "P-1": [11, 0, 10],
    P1: [29, 14, 9],
    P2: [47, 38, 6],
  };
  FLOORS_ASC.forEach((f) => {
    const [sd, free, reserved] = cfg[f];
    const fr = rng(sd);
    const demo = DEMO_CARS.filter((c) => c.floor === f).map((c) => SPOT_INDEX[c.spot]);
    const pool = shuffled(fr).filter((i) => !demo.includes(i));
    const st: Status[] = SPOTS.map(() => "occupied");
    pool.slice(0, free).forEach((i) => (st[i] = "free"));
    pool.slice(free, free + reserved).forEach((i) => (st[i] = "reserved"));
    if (f === "P1") st[SPOT_INDEX.F16] = "free"; // one free EV charger
    statuses[f] = st;
    st.forEach((s, i) => {
      if (s === "occupied") {
        const d = DEMO_CARS.find((c) => c.floor === f && SPOT_INDEX[c.spot] === i);
        cars.push({
          plate: d?.plate ?? plateFrom(r),
          ticket: d?.ticket ?? `T-${seq++}`,
          floor: f,
          spotIdx: i,
          since: now - (12 + Math.floor(r() * 290)) * 60000,
        });
      } else if (s === "reserved") {
        const startIn = Math.floor(r() * 5) * 30 + 30;
        const t = new Date(now + startIn * 60000);
        t.setMinutes(t.getMinutes() < 30 ? 0 : 30);
        bookings.push({
          code: `BK-${seq++}`,
          floor: f,
          spotIdx: i,
          date: isoDate(new Date(now)),
          start: `${pad(t.getHours())}:${pad(t.getMinutes())}`,
          hours: 2 + Math.floor(r() * 2),
          plate: plateFrom(r),
          name: NAMES[Math.floor(r() * NAMES.length)],
          price: 90,
          status: "active",
          createdAt: now - Math.floor(r() * 600) * 60000,
          online: true,
        });
      }
    });
  });

  const fines: Fine[] = [];
  for (let k = 0; k < 9; k++) {
    const day = new Date(now - Math.floor(k / 2) * 86400000);
    const v = VIOLATION_TYPES[Math.floor(r() * VIOLATION_TYPES.length)];
    const f = FLOORS_ASC[Math.floor(r() * 3)];
    fines.push({
      id: `F-${seq++}`,
      plate: k === 0 ? "AA 7421 KI" : k === 3 ? "KA 1189 BX" : plateFrom(r),
      date: isoDate(day),
      time: `${pad(9 + Math.floor(r() * 11))}:${pad(Math.floor(r() * 60))}`,
      floor: f,
      spotId: SPOTS[Math.floor(r() * SPOTS.length)].id,
      type: v.type,
      amount: v.amount,
      status: (["unpaid", "paid", "unpaid", "review", "paid"] as const)[k % 5],
    });
  }

  const nowH = new Date(now).getHours();
  const profile = [
    2, 1, 1, 1, 1, 2, 4, 7, 10, 13, 16, 19, 22, 21, 19, 18, 20, 23, 24, 21, 16, 11, 7, 4,
  ];
  const revenue = profile.map((p, h) => (h <= nowH ? Math.round(p * 520 * (0.85 + r() * 0.3)) : 0));

  const v0 = cars.find((c) => c.floor === "P1" && SPOTS[c.spotIdx].row === "A");
  const violations: Violation[] = v0
    ? [
        {
          id: `V-${seq++}`,
          plate: v0.plate,
          floor: "P1",
          spotIdx: v0.spotIdx,
          type: "Місце для МГН",
          amount: 1020,
          at: now - 60000,
        },
      ]
    : [];

  return {
    v: 2,
    day: isoDate(new Date(now)),
    seq,
    statuses,
    cars,
    bookings,
    fines,
    violations,
    events: [
      {
        id: 1,
        at: now - 120000,
        kind: "system",
        text: "Система ParkFlow запущена · 294 датчики онлайн",
      },
      ...(v0
        ? [
            {
              id: 2,
              at: now - 60000,
              kind: "violation" as const,
              text: `Порушення: ${v0.plate} · P1 ${SPOTS[v0.spotIdx].id} · Місце для МГН`,
            },
          ]
        : []),
    ],
    revenue,
    sessions: 1184,
    myTicket: null,
    sim: false,
    intent: null,
  };
}

/* ---------- Store ---------- */
const KEY = "parkflow-state-v2";
function load(): ParkState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as ParkState;
    if (s.v !== 2 || s.day !== isoDate(new Date()) || s.statuses.P1.length !== SPOTS_PER_FLOOR)
      return null;
    return { ...s, sim: false, intent: null };
  } catch {
    return null;
  }
}
let state: ParkState = load() ?? seed();
const listeners = new Set<() => void>();
function set(fn: (s: ParkState) => ParkState) {
  const next = fn(state);
  if (next === state) return;
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable — keep in memory */
  }
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  // Local simulation is disabled for server-backed operation.
  return () => {
    listeners.delete(l);
  };
}
export const usePark = () => useSyncExternalStore(subscribe, () => state);
export const getPark = () => state;

let serverBacked = false;
let serverLoading = false;
let serverError: string | null = null;
let serverSnapshot = { loading: false, error: null as string | null, serverBacked: false };
const serverListeners = new Set<() => void>();
const emitServerStatus = () => {
  serverSnapshot = { loading: serverLoading, error: serverError, serverBacked };
  serverListeners.forEach((listener) => listener());
};

export const useServerStatus = () =>
  useSyncExternalStore(
    (listener) => {
      serverListeners.add(listener);
      return () => serverListeners.delete(listener);
    },
    () => serverSnapshot,
  );

function floorIdForBackend(floor: number): FloorId {
  if (floor === -1) return "P-1";
  if (floor === 1) return "P1";
  return "P2";
}

function backendSpotCode(floor: FloorId, idx: number): string | null {
  if (floor === "P-1") return null;
  const spot = SPOTS[idx];
  if (!spot) return null;
  const number = Number(spot.id.match(/\d+$/)?.[0]);
  return Number.isInteger(number) ? `${spot.row}-${String(number).padStart(2, "0")}` : null;
}

function backendFloor(floor: FloorId): number {
  return floor === "P-1" ? -1 : floor === "P1" ? 1 : 2;
}

async function setServerSpotStatus(floor: FloorId, idx: number, occupied: boolean) {
  const spotCode = backendSpotCode(floor, idx);
  if (!spotCode) return;
  await sendSensorEvent({
    device_id: "frontend-led-control",
    spot_code: spotCode,
    floor: backendFloor(floor),
    distance_cm: occupied ? 5 : 50,
    raw_state: occupied ? 1 : 0,
    is_occupied: occupied,
    timestamp: Math.floor(Date.now() / 1000),
  });
}

export async function syncServerParking(): Promise<void> {
  serverLoading = true;
  serverError = null;
  emitServerStatus();
  try {
    const map: BackendMap = await getParkingMap();
    set((s) => {
      const statuses = {
        "P-1": SPOTS.map(() => "unavailable" as Status),
        P1: SPOTS.map(() => "unavailable" as Status),
        P2: SPOTS.map(() => "unavailable" as Status),
      };
      const bookings: Booking[] = [];
      const cars: Car[] = [];

      for (const spot of map.spots) {
        const floor = floorIdForBackend(spot.floor);
        const frontendId = spot.spot_code.replace("-", "").toUpperCase();
        const idx = SPOT_INDEX[frontendId];
        if (idx === undefined) continue;
        statuses[floor][idx] = spot.current_session ? "occupied" : spot.status;

        if (spot.current_session) {
          cars.push({
            plate: spot.current_session.plate_number,
            ticket: spot.current_session.ticket_uid,
            floor,
            spotIdx: idx,
            since: Date.parse(spot.current_session.entry_time) || Date.now(),
          });
        }
        if (spot.active_reservation) {
          if (!spot.current_session) statuses[floor][idx] = "reserved";
          bookings.push({
            code: `BK-${spot.active_reservation.reservation_id}`,
            floor,
            spotIdx: idx,
            date: isoDate(new Date(spot.active_reservation.reserved_from)),
            start: hhmm(new Date(spot.active_reservation.reserved_from).getTime()).replace(".", ":"),
            hours: Math.max(
              1,
              Math.round(
                (Date.parse(spot.active_reservation.reserved_until) -
                  Date.parse(spot.active_reservation.reserved_from)) /
                  3600000,
              ),
            ),
            plate: formatPlate(spot.active_reservation.plate_number),
            name: "Online reservation",
            price: bookingPrice(idx, 1),
            status: "active",
            createdAt: Date.now(),
            online: true,
          });
        }
      }

      const sameStatuses = FLOORS_ASC.every((floor) =>
        statuses[floor].every((status, idx) => status === s.statuses[floor][idx]),
      );
      const sameCars =
        cars.length === s.cars.length &&
        cars.every((car, idx) => {
          const previous = s.cars[idx];
          return (
            previous &&
            car.ticket === previous.ticket &&
            car.plate === previous.plate &&
            car.floor === previous.floor &&
            car.spotIdx === previous.spotIdx &&
            car.since === previous.since
          );
        });
      const sameBookings =
        bookings.length === s.bookings.length &&
        bookings.every((booking, idx) => {
          const previous = s.bookings[idx];
          return (
            previous &&
            booking.code === previous.code &&
            booking.floor === previous.floor &&
            booking.spotIdx === previous.spotIdx &&
            booking.date === previous.date &&
            booking.start === previous.start &&
            booking.hours === previous.hours &&
            booking.plate === previous.plate &&
            booking.status === previous.status
          );
        });
      if (sameStatuses && sameCars && sameBookings) return s;

      return {
        ...s,
        statuses,
        cars,
        bookings,
        sim: false,
        events: [
          {
            id: s.seq + 1,
            at: Date.now(),
            kind: "system" as const,
            text: `Дані паркінгу завантажено з сервера · ${map.summary.free_spots} вільних місць`,
          },
          ...s.events,
        ].slice(0, 40),
      };
    });
    serverBacked = true;
  } catch (error) {
    serverBacked = false;
    serverError = error instanceof Error ? error.message : "Не вдалося отримати дані паркінгу";
    set((s) => ({
      ...s,
      statuses: {
        "P-1": SPOTS.map(() => "unavailable" as Status),
        P1: SPOTS.map(() => "unavailable" as Status),
        P2: SPOTS.map(() => "unavailable" as Status),
      },
      cars: [],
      bookings: [],
      sim: false,
    }));
  } finally {
    serverLoading = false;
    emitServerStatus();
  }
}

const pushEv = (s: ParkState, kind: EventKind, text: string): EventItem[] =>
  [{ id: s.seq, at: Date.now(), kind, text }, ...s.events].slice(0, 40);
const withStatus = (s: ParkState, floor: FloorId, idx: number, st: Status) => ({
  ...s.statuses,
  [floor]: s.statuses[floor].map((x, i) => (i === idx ? st : x)),
});
const addRev = (rev: number[], amount: number) => {
  const h = new Date().getHours();
  return rev.map((v, i) => (i === h ? v + amount : v));
};

/* spot the navigator is currently routing to — never taken by the simulation */
let navLock: { floor: FloorId; idx: number } | null = null;
export function setNavLock(l: { floor: FloorId; idx: number } | null) {
  navLock = l;
}
const locked = (f: FloorId, i: number) => navLock?.floor === f && navLock.idx === i;

/* ---------- Actions ---------- */
export async function arrive(floor: FloorId, idx?: number, plate?: string) {
  if (serverBacked) {
    const free = state.statuses[floor]
      .map((status, spotIdx) => (status === "free" && !locked(floor, spotIdx) ? spotIdx : -1))
      .filter((spotIdx) => spotIdx >= 0);
    const spotIdx = idx ?? free[0];
    if (spotIdx === undefined) return;
    try {
      await setServerSpotStatus(floor, spotIdx, true);
      await syncServerParking();
    } catch (error) {
      serverError = error instanceof Error ? error.message : "Не вдалося оновити місце";
      emitServerStatus();
    }
    return;
  }
  set((s) => {
    const st = s.statuses[floor];
    const free = st
      .map((x, i) => (x === "free" && !locked(floor, i) ? i : -1))
      .filter((i) => i >= 0);
    const i = idx ?? free[Math.floor(Math.random() * free.length)];
    if (i === undefined || st[i] !== "free") return s;
    const p = plate ?? plateFrom(Math.random);
    return {
      ...s,
      seq: s.seq + 1,
      statuses: withStatus(s, floor, i, "occupied"),
      cars: [...s.cars, { plate: p, ticket: `T-${s.seq}`, floor, spotIdx: i, since: Date.now() }],
      sessions: s.sessions + 1,
      events: pushEv(s, "in", `${p} заїхав · ${floor} · ${SPOTS[i].id}`),
    };
  });
}

export function depart(ticket: string) {
  if (serverBacked) return;
  set((s) => {
    const c = s.cars.find((x) => x.ticket === ticket);
    if (!c) return s;
    const fee = Math.max(1, Math.ceil((Date.now() - c.since) / 3600000)) * PRICE_PER_HOUR;
    return {
      ...s,
      seq: s.seq + 1,
      statuses: withStatus(s, c.floor, c.spotIdx, "free"),
      cars: s.cars.filter((x) => x !== c),
      revenue: addRev(s.revenue, fee),
      myTicket: s.myTicket === ticket ? null : s.myTicket,
      events: pushEv(
        s,
        "out",
        `${c.plate} виїхав · ${c.floor} · ${SPOTS[c.spotIdx].id} · оплата ${money(fee)}`,
      ),
    };
  });
}

export async function departRandom(floor: FloorId, n = 1) {
  if (serverBacked) {
    const occupied = state.statuses[floor]
      .map((status, spotIdx) => (status === "occupied" ? spotIdx : -1))
      .filter((spotIdx) => spotIdx >= 0)
      .slice(0, n);
    try {
      for (const spotIdx of occupied) await setServerSpotStatus(floor, spotIdx, false);
      if (occupied.length) await syncServerParking();
    } catch (error) {
      serverError = error instanceof Error ? error.message : "Не вдалося оновити місце";
      emitServerStatus();
    }
    return;
  }
  for (let k = 0; k < n; k++) {
    const pool = state.cars.filter(
      (c) => c.floor === floor && !c.mine && !DEMO_CARS.some((d) => d.ticket === c.ticket),
    );
    if (!pool.length) return;
    depart(pool[Math.floor(Math.random() * pool.length)].ticket);
  }
}

export async function fillAll() {
  if (serverBacked) {
    const free = FLOORS_ASC.flatMap((floor) =>
      state.statuses[floor]
        .map((status, spotIdx) => (status === "free" ? { floor, spotIdx } : null))
        .filter((spot): spot is { floor: FloorId; spotIdx: number } => spot !== null),
    );
    try {
      for (const spot of free) await setServerSpotStatus(spot.floor, spot.spotIdx, true);
      if (free.length) await syncServerParking();
    } catch (error) {
      serverError = error instanceof Error ? error.message : "Не вдалося заповнити місця";
      emitServerStatus();
    }
    return;
  }
  set((s) => {
    let seq = s.seq;
    const cars = [...s.cars];
    const statuses = { ...s.statuses };
    let added = 0;
    FLOORS_ASC.forEach((f) => {
      statuses[f] = s.statuses[f].map((x, i) => {
        if (x !== "free" || locked(f, i)) return x;
        cars.push({
          plate: plateFrom(Math.random),
          ticket: `T-${seq++}`,
          floor: f,
          spotIdx: i,
          since: Date.now(),
        });
        added++;
        return "occupied";
      });
    });
    if (!added) return s;
    return {
      ...s,
      seq: seq + 1,
      statuses,
      cars,
      sessions: s.sessions + added,
      events: pushEv(
        s,
        "system",
        `Пікове навантаження: заїхало ${added} авто · паркінг заповнений`,
      ),
    };
  });
}

export async function restoreFloors() {
  if (serverBacked) {
    const occupied = FLOORS_ASC.flatMap((floor) =>
      state.statuses[floor]
        .map((status, spotIdx) => (status === "occupied" ? { floor, spotIdx } : null))
        .filter((spot): spot is { floor: FloorId; spotIdx: number } => spot !== null),
    );
    try {
      for (const spot of occupied) await setServerSpotStatus(spot.floor, spot.spotIdx, false);
      if (occupied.length) await syncServerParking();
    } catch (error) {
      serverError = error instanceof Error ? error.message : "Не вдалося відновити місця";
      emitServerStatus();
    }
    return;
  }
  FLOORS_ASC.forEach((f) => {
    const diff = INITIAL_FREE[f] - countOf(state.statuses[f], "free");
    if (diff > 0) departRandom(f, diff);
  });
}

export type BookingInput = {
  floor: FloorId;
  spotIdx: number;
  date: string;
  start: string;
  hours: number;
  plate: string;
  name: string;
};
export const bookingPrice = (spotIdx: number, hours: number) =>
  hours * PRICE_PER_HOUR + (SPOTS[spotIdx].ev ? EV_SURCHARGE : 0);

export function book(input: BookingInput): Booking | null {
  let created: Booking | null = null;
  set((s) => {
    if (s.statuses[input.floor][input.spotIdx] !== "free" || locked(input.floor, input.spotIdx))
      return s;
    const b: Booking = {
      ...input,
      plate: formatPlate(input.plate),
      code: `BK-${s.seq}`,
      price: bookingPrice(input.spotIdx, input.hours),
      status: "active",
      createdAt: Date.now(),
      online: true,
      byMe: true,
    };
    created = b;
    return {
      ...s,
      seq: s.seq + 1,
      statuses: withStatus(s, input.floor, input.spotIdx, "reserved"),
      bookings: [b, ...s.bookings],
      revenue: addRev(s.revenue, b.price),
      events: pushEv(
        s,
        "book",
        `Бронь ${b.code} · ${b.floor} · ${SPOTS[b.spotIdx].id} · ${b.plate}`,
      ),
    };
  });
  return created;
}

export async function bookFromServer(input: BookingInput): Promise<Booking> {
  const spot = SPOTS[input.spotIdx];
  const spotNumber = Number(spot.id.match(/\d+$/)?.[0] ?? input.spotIdx + 1);
  const spotCode = `${spot.row}-${String(spotNumber).padStart(2, "0")}`;
  const reservedFrom = new Date(`${input.date}T${input.start}:00`).toISOString();
  const reservedUntil = new Date(
    new Date(`${input.date}T${input.start}:00`).getTime() + input.hours * 3600000,
  ).toISOString();

  const reservation = await createReservation({
    plate_number: formatPlate(input.plate),
    spot_code: spotCode,
    floor: backendFloor(input.floor),
    reserved_from: reservedFrom,
    reserved_until: reservedUntil,
  });

  const booking: Booking = {
    ...input,
    plate: formatPlate(input.plate),
    code: `BK-${reservation.id}`,
    price: bookingPrice(input.spotIdx, input.hours),
    status: "active",
    createdAt: Date.now(),
    online: true,
    byMe: true,
  };
  set((s) => ({
    ...s,
    seq: s.seq + 1,
    statuses: withStatus(s, input.floor, input.spotIdx, "reserved"),
    bookings: [booking, ...s.bookings],
    revenue: addRev(s.revenue, booking.price),
    events: pushEv(
      s,
      "book",
      `Бронь ${booking.code} · ${booking.floor} · ${spot.id} · ${booking.plate}`,
    ),
  }));
  return booking;
}

export async function cancelBooking(code: string): Promise<void> {
  const booking = state.bookings.find((item) => item.code === code);
  if (!booking || booking.status !== "active") return;
  if (serverBacked) {
    const reservationId = Number(code.replace(/^BK-/, ""));
    if (!Number.isInteger(reservationId)) {
      serverError = `Некоректний ідентифікатор бронювання: ${code}`;
      emitServerStatus();
      return;
    }
    try {
      await cancelReservation(reservationId);
      await syncServerParking();
    } catch (error) {
      serverError = error instanceof Error ? error.message : "Не вдалося скасувати бронювання";
      emitServerStatus();
    }
    return;
  }
  set((s) => {
    const b = s.bookings.find((x) => x.code === code);
    if (!b || b.status !== "active") return s;
    return {
      ...s,
      seq: s.seq + 1,
      statuses:
        s.statuses[b.floor][b.spotIdx] === "reserved"
          ? withStatus(s, b.floor, b.spotIdx, "free")
          : s.statuses,
      bookings: s.bookings.map((x) => (x.code === code ? { ...x, status: "cancelled" } : x)),
      revenue: addRev(s.revenue, -b.price),
      events: pushEv(s, "cancel", `Бронь ${b.code} скасовано · кошти ${money(b.price)} повернено`),
    };
  });
}

/** Driver finished navigation on a spot: park "my" car there and return its ticket. */
export function parkMine(floor: FloorId, idx: number): string {
  let ticket = "";
  set((s) => {
    const b = s.bookings.find(
      (x) => x.status === "active" && x.floor === floor && x.spotIdx === idx,
    );
    ticket = `T-${s.seq}`;
    const plate = b?.plate ?? "Ваше авто";
    return {
      ...s,
      seq: s.seq + 1,
      statuses: withStatus(s, floor, idx, "occupied"),
      cars: [
        ...s.cars.filter((c) => !(c.floor === floor && c.spotIdx === idx)),
        { plate, ticket, floor, spotIdx: idx, since: Date.now(), mine: true },
      ],
      bookings: b ? s.bookings.map((x) => (x === b ? { ...x, status: "arrived" } : x)) : s.bookings,
      sessions: s.sessions + 1,
      myTicket: ticket,
      events: pushEv(
        s,
        "in",
        `${plate} заїхав за навігатором · ${floor} · ${SPOTS[idx].id}${b ? ` · бронь ${b.code}` : ""}`,
      ),
    };
  });
  return ticket;
}

export function addViolation() {
  set((s) => {
    const pool = s.cars.filter((c) => !c.mine);
    if (!pool.length) return s;
    const c = pool[Math.floor(Math.random() * pool.length)];
    const v = VIOLATION_TYPES[Math.floor(Math.random() * VIOLATION_TYPES.length)];
    const item: Violation = {
      id: `V-${s.seq}`,
      plate: c.plate,
      floor: c.floor,
      spotIdx: c.spotIdx,
      type: v.type,
      amount: v.amount,
      at: Date.now(),
    };
    return {
      ...s,
      seq: s.seq + 1,
      violations: [item, ...s.violations].slice(0, 6),
      events: pushEv(
        s,
        "violation",
        `Порушення: ${c.plate} · ${c.floor} ${SPOTS[c.spotIdx].id} · ${v.type}`,
      ),
    };
  });
}
export function issueFine(vid: string) {
  set((s) => {
    const v = s.violations.find((x) => x.id === vid);
    if (!v) return s;
    const now = Date.now();
    const fine: Fine = {
      id: `F-${s.seq}`,
      plate: v.plate,
      date: isoDate(new Date(now)),
      time: hhmm(now),
      floor: v.floor,
      spotId: SPOTS[v.spotIdx].id,
      type: v.type,
      amount: v.amount,
      status: "unpaid",
    };
    return {
      ...s,
      seq: s.seq + 1,
      violations: s.violations.filter((x) => x.id !== vid),
      fines: [fine, ...s.fines],
      events: pushEv(
        s,
        "fine",
        `Штраф ${fine.id} виписано · ${fine.plate} · ${money(fine.amount)}`,
      ),
    };
  });
}
export function dismissViolation(vid: string) {
  set((s) => ({ ...s, violations: s.violations.filter((x) => x.id !== vid) }));
}
export function setFineStatus(id: string, status: Fine["status"]) {
  set((s) => {
    const f = s.fines.find((x) => x.id === id);
    if (!f || f.status === status) return s;
    return {
      ...s,
      seq: s.seq + 1,
      fines: s.fines.map((x) => (x.id === id ? { ...x, status } : x)),
      revenue: status === "paid" ? addRev(s.revenue, f.amount) : s.revenue,
      events:
        status === "paid"
          ? pushEv(s, "pay", `Штраф ${f.id} сплачено · ${f.plate} · ${money(f.amount)}`)
          : s.events,
    };
  });
}

export const setSim = (_on: boolean) => set((s) => ({ ...s, sim: false }));
export const setIntent = (intent: Intent) => set((s) => ({ ...s, intent }));
export function consumeIntent(): Intent {
  const it = state.intent;
  if (it) set((s) => ({ ...s, intent: null }));
  return it;
}
export function resetDemo() {
  if (serverBacked) return;
  set(() => seed());
}

export function findCar(q: string): { car?: Car; booking?: Booking } {
  const n = norm(q);
  if (n.length < 3) return {};
  const booking = state.bookings.find((b) => norm(b.code) === n && b.status === "active");
  if (booking) return { booking };
  const car = state.cars.find(
    (c) =>
      norm(c.plate) === n ||
      norm(c.ticket) === n ||
      (/^\d{4}$/.test(n) && norm(c.plate).includes(n)),
  );
  if (car) return { car };
  const bookingByPlate = state.bookings.find((b) => b.status === "active" && norm(b.plate) === n);
  return bookingByPlate ? { booking: bookingByPlate } : {};
}

/* ---------- Derived metrics ---------- */
export function metrics(s: ParkState) {
  const per = FLOORS_ASC.map((f) => {
    const st = s.statuses[f];
    const free = countOf(st, "free");
    const reserved = countOf(st, "reserved");
    const occupied = countOf(st, "occupied");
    return {
      floor: f,
      free,
      reserved,
      occupied,
      total: st.length,
      load: Math.round(((occupied + reserved) / st.length) * 100),
    };
  });
  const free = per.reduce((a, p) => a + p.free, 0);
  const reserved = per.reduce((a, p) => a + p.reserved, 0);
  const occupied = per.reduce((a, p) => a + p.occupied, 0);
  const now = Date.now();
  const stays = s.cars.map((c) => stayMin(c, now));
  const avgStay = stays.length ? Math.round(stays.reduce((a, b) => a + b, 0) / stays.length) : 0;
  const buckets = [0, 0, 0, 0, 0];
  stays.forEach((m) => buckets[m < 30 ? 0 : m < 60 ? 1 : m < 120 ? 2 : m < 180 ? 3 : 4]++);
  const revenueToday = s.revenue.reduce((a, b) => a + b, 0);
  return {
    per,
    free,
    reserved,
    occupied,
    total: TOTAL_SPOTS,
    load: Math.round(((occupied + reserved) / TOTAL_SPOTS) * 100),
    avgStay,
    buckets,
    revenueToday,
    activeBookings: s.bookings.filter((b) => b.status === "active").length,
    unpaid: s.fines.filter((f) => f.status !== "paid").reduce((a, f) => a + f.amount, 0),
  };
}

/** Row with the most free spots — used for "go to sector X" hints. */
export function bestSector(st: Status[]) {
  const counts: Record<string, number> = {};
  SPOTS.forEach((sp, i) => st[i] === "free" && (counts[sp.row] = (counts[sp.row] ?? 0) + 1));
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return best ? best[0] : null;
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
  const q = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [
    ["ParkFlow · звіт за", fmtDate(s.day)].map(q).join(";"),
    "",
    ["Поверх", "Вільно", "Зайнято", "Бронь", "Заповненість %"].map(q).join(";"),
    ...m.per.map((p) => [p.floor, p.free, p.occupied, p.reserved, p.load].map(q).join(";")),
    "",
    ["Прибуток сьогодні, грн", m.revenueToday].map(q).join(";"),
    ["Середній час стоянки, хв", m.avgStay].map(q).join(";"),
    ["Активних бронювань", m.activeBookings].map(q).join(";"),
    "",
    ["ID", "Номер", "Дата", "Час", "Поверх", "Місце", "Порушення", "Сума", "Статус"]
      .map(q)
      .join(";"),
    ...s.fines.map((f) =>
      [f.id, f.plate, fmtDate(f.date), f.time, f.floor, f.spotId, f.type, f.amount, f.status]
        .map(q)
        .join(";"),
    ),
  ];
  return lines.join("\n");
}

/* ---------- Live simulation ---------- */
let simTimer: number | null = null;
function tick() {
  const s = state;
  if (!s.sim) return;
  const roll = Math.random();
  const f: FloorId = Math.random() < 0.55 ? "P1" : "P2";
  const free = countOf(s.statuses[f], "free");
  if (roll < 0.45) {
    if (free > 4) arrive(f);
  } else if (roll < 0.9) {
    if (free < (f === "P1" ? 30 : 55)) departRandom(f, 1);
  } else if (s.violations.length < 3) addViolation();
}
function ensureSim() {
  if (simTimer !== null || typeof window === "undefined") return;
  simTimer = window.setInterval(tick, 6000);
}
