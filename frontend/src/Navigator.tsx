import { useEffect, useMemo, useRef, useState } from "react";
import "./navigator.css";

import {
  AISLES_Y,
  AISLE_NAMES,
  COLS,
  DEMO_CARS,
  ENTRANCE,
  FLOORS,
  LEFT_X,
  LIFT,
  LIFT_N,
  RIGHT_X,
  SPOTS,
  countOf,
  findCar,
  fmtStay,
  hhmm,
  norm,
  parkMine,
  consumeIntent,
  setNavLock,
  stayMin,
  usePark,
  type FloorId,
  type Pt,
  type SpotDef,
  type Status,
} from "./parking";

type StepType = "start" | "left" | "right" | "arrive";
type Step = { at: number; type: StepType; name: string };
type Route = {
  pts: Pt[];
  cum: number[];
  total: number;
  steps: Step[];
  mode: "drive" | "walk";
  label: string;
  short: string;
  floor: FloorId;
  spotIdx: number | null;
};
type Phase = "idle" | "preview" | "nav" | "arrived";

/* ---------- Graph & routing ---------- */
const key = (p: Pt) => `${p.x},${p.y}`;
type Graph = Map<string, { p: Pt; adj: { k: string; w: number }[] }>;
const buildGraph = (walk: boolean): Graph => {
  const g: Graph = new Map();
  const add = (p: Pt) => {
    const k = key(p);
    if (!g.has(k)) g.set(k, { p, adj: [] });
    return k;
  };
  const link = (a: Pt, b: Pt) => {
    const ka = add(a);
    const kb = add(b);
    const w = Math.hypot(a.x - b.x, a.y - b.y);
    g.get(ka)!.adj.push({ k: kb, w });
    g.get(kb)!.adj.push({ k: ka, w });
  };
  const xs = [LEFT_X, ...COLS.slice(0, 8), 500, ...COLS.slice(8), RIGHT_X];
  AISLES_Y.forEach((y) => xs.slice(1).forEach((x, i) => link({ x: xs[i], y }, { x, y })));
  [LEFT_X, RIGHT_X].forEach((x) =>
    AISLES_Y.slice(1).forEach((y, i) => link({ x, y: AISLES_Y[i] }, { x, y })),
  );
  link(ENTRANCE, { x: LEFT_X, y: 575 });
  link(LIFT, { x: 500, y: 375 });
  if (walk) {
    link(LIFT, LIFT_N);
    link(LIFT_N, { x: 500, y: 175 });
  }
  return g;
};
const GRAPHS = { drive: buildGraph(false), walk: buildGraph(true) };

function dijkstra(graph: Graph, start: string) {
  const dist = new Map<string, number>([[start, 0]]);
  const prev = new Map<string, string>();
  const open = new Set([start]);
  while (open.size) {
    let u = "";
    let best = Infinity;
    open.forEach((k) => {
      const d = dist.get(k)!;
      if (d < best) [best, u] = [d, k];
    });
    open.delete(u);
    for (const { k, w } of graph.get(u)!.adj) {
      const nd = best + w;
      if (nd < (dist.get(k) ?? Infinity)) {
        dist.set(k, nd);
        prev.set(k, u);
        open.add(k);
      }
    }
  }
  return { dist, prev };
}
const DIJ: Record<string, ReturnType<typeof dijkstra>> = {
  [`drive:${key(ENTRANCE)}`]: dijkstra(GRAPHS.drive, key(ENTRANCE)),
  [`walk:${key(ENTRANCE)}`]: dijkstra(GRAPHS.walk, key(ENTRANCE)),
  [`walk:${key(LIFT)}`]: dijkstra(GRAPHS.walk, key(LIFT)),
};
const aisleKey = (s: SpotDef) => key({ x: s.cx, y: AISLES_Y[s.aisle] });

function segName(a: Pt, b: Pt, last: boolean, short: string) {
  if (last) return short;
  if (a.y === b.y) return AISLE_NAMES[AISLES_Y.indexOf(a.y)] ?? "проїзд";
  if (a.x === LEFT_X) return "Західна рампа";
  if (a.x === RIGHT_X) return "Східна рампа";
  return a.x === LIFT.x && a.y === LIFT.y ? "вихід від ліфтів" : short;
}

function makeRoute(
  from: Pt,
  toKey: string,
  extra: Pt | null,
  mode: Route["mode"],
  label: string,
  short: string,
  floor: FloorId,
  spotIdx: number | null,
): Route {
  const { prev } = DIJ[`${mode}:${key(from)}`];
  const raw: Pt[] = [];
  let k: string | undefined = toKey;
  while (k) {
    raw.unshift(GRAPHS.walk.get(k)!.p);
    k = prev.get(k);
  }
  if (extra) raw.push(extra);
  const pts = raw.filter((p, i) => {
    if (i === 0 || i === raw.length - 1) return true;
    const a = raw[i - 1];
    const b = raw[i + 1];
    return (p.x - a.x) * (b.y - p.y) - (p.y - a.y) * (b.x - p.x) !== 0;
  });
  const cum = [0];
  for (let i = 1; i < pts.length; i++)
    cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  const total = cum[cum.length - 1];
  const steps: Step[] = [
    { at: 0, type: "start", name: segName(pts[0], pts[1], pts.length === 2, short) },
  ];
  for (let i = 1; i < pts.length - 1; i++) {
    const d1 = { x: pts[i].x - pts[i - 1].x, y: pts[i].y - pts[i - 1].y };
    const d2 = { x: pts[i + 1].x - pts[i].x, y: pts[i + 1].y - pts[i].y };
    const cross = d1.x * d2.y - d1.y * d2.x;
    steps.push({
      at: cum[i],
      type: cross > 0 ? "right" : "left",
      name: segName(pts[i], pts[i + 1], i === pts.length - 2, short),
    });
  }
  steps.push({ at: total, type: "arrive", name: short });
  return { pts, cum, total, steps, mode, label, short, floor, spotIdx };
}

function routeToSpot(from: Pt, idx: number, mode: Route["mode"], label: string, floor: FloorId) {
  const s = SPOTS[idx];
  return makeRoute(
    from,
    aisleKey(s),
    { x: s.cx, y: s.cy },
    mode,
    label,
    `місце ${s.id}`,
    floor,
    idx,
  );
}

function nearestFree(st: Status[], pred: (s: SpotDef) => boolean = () => true) {
  const { dist } = DIJ[`drive:${key(ENTRANCE)}`];
  let best: number | null = null;
  let bestCost = Infinity;
  SPOTS.forEach((s, i) => {
    if (st[i] !== "free" || !pred(s)) return;
    const c = (dist.get(aisleKey(s)) ?? Infinity) + Math.abs(AISLES_Y[s.aisle] - s.cy);
    if (c < bestCost) [bestCost, best] = [c, i];
  });
  return best;
}

function pointAt(r: Route, s: number) {
  let i = 0;
  while (i < r.cum.length - 2 && r.cum[i + 1] < s) i++;
  const a = r.pts[i];
  const b = r.pts[i + 1];
  const len = r.cum[i + 1] - r.cum[i] || 1;
  const t = Math.max(0, Math.min(1, (s - r.cum[i]) / len));
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    heading: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI,
    seg: i,
  };
}

const metres = (u: number) => {
  const m = u / 10;
  return m > 20 ? `${Math.round(m / 5) * 5} м` : `${Math.max(1, Math.round(m))} м`;
};
const etaMin = (u: number, mode: Route["mode"]) =>
  Math.max(1, Math.round(u / 10 / (mode === "drive" ? 2.5 : 1.2) / 60));
const clock = (min: number) =>
  new Date(Date.now() + min * 60000).toLocaleTimeString("uk-UA", {
    hour: "2-digit",
    minute: "2-digit",
  });
const angleLerp = (a: number, b: number, k: number) => {
  const d = ((((b - a) % 360) + 540) % 360) - 180;
  return a + d * k;
};

/* ---------- Icons ---------- */
const D = {
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM20 20l-4-4",
  back: "M15 6l-6 6 6 6",
  close: "M6 6l12 12M18 6 6 18",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  locate: "M12 2v3M12 19v3M2 12h3M19 12h3M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z",
  car: "M5 17h14M6 17v2M18 17v2M5 13l2-6h10l2 6v4H5ZM8 14h.01M16 14h.01",
  walk: "M13 4a1.5 1.5 0 1 0 0 .01M10 21l2-6 3 3v3M9 12l2-4 4 2 2 3M11 8l-2 7",
  lift: "M5 3h14v18H5ZM12 3v18M8 9l1.5-2L11 9M16 15l-1.5 2L13 15",
  ev: "M13 2 4 14h7l-1 8 9-12h-7Z",
  spot: "M7 21V3h6a5 5 0 0 1 0 10H7",
  straight: "M12 20V5M6 11l6-6 6 6",
  left: "M16 20v-7a4 4 0 0 0-4-4H5M9 5 5 9l4 4",
  right: "M8 20v-7a4 4 0 0 1 4-4h7M15 5l4 4-4 4",
  flag: "M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12ZM12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  layers: "M12 3 2 8l10 5 10-5ZM2 13l10 5 10-5",
  nav: "M12 2 4 21l8-4 8 4Z",
};
function Ic({ d, size = 20, sw = 2 }: { d: string; size?: number; sw?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={d} />
    </svg>
  );
}
const stepIcon = (t: StepType) =>
  t === "left" ? D.left : t === "right" ? D.right : t === "arrive" ? D.flag : D.straight;
const stepText = (s: Step) =>
  s.type === "left"
    ? "Поверніть ліворуч"
    : s.type === "right"
      ? "Поверніть праворуч"
      : s.type === "arrive"
        ? "Ви прибули"
        : "Рухайтесь прямо";

/* ---------- Component ---------- */
export default function Navigator() {
  const park = usePark();
  const statuses = park.statuses;
  const [floor, setFloor] = useState<FloorId>("P1");
  const [origin, setOrigin] = useState<"car" | "walk">("car");
  const [phase, setPhase] = useState<Phase>("idle");
  const [route, setRoute] = useState<Route | null>(null);
  const [follow, setFollow] = useState(true);
  const [tilt3d, setTilt3d] = useState(() => window.innerWidth < 1000);
  const [northUp, setNorthUp] = useState(false);
  const [query, setQuery] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const mineCar = park.cars.find((c) => c.ticket === park.myTicket);
  const myCar = mineCar
    ? { floor: mineCar.floor, idx: mineCar.spotIdx, ticket: mineCar.ticket }
    : null;
  const [vp, setVp] = useState({ w: 390, h: 700 });
  const [, setTick] = useState(0);

  const stageRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<SVGGElement>(null);
  const markerRef = useRef<SVGGElement>(null);
  const coneRef = useRef<SVGGElement>(null);
  const routeOutRef = useRef<SVGPathElement>(null);
  const routeInRef = useRef<SVGPathElement>(null);
  const compassRef = useRef<HTMLSpanElement>(null);
  const cam = useRef({ cx: ENTRANCE.x, cy: ENTRANCE.y - 80, zoom: 1.3, rot: 0 });
  const target = useRef({ cx: ENTRANCE.x, cy: ENTRANCE.y - 80, zoom: 1.3, rot: 0 });
  const sRef = useRef(0);
  const headRef = useRef(-90);
  const navZoom = useRef(2);
  const state = useRef({ phase, route, follow, northUp, origin, vp });
  state.current = { phase, route, follow, northUp, origin, vp };
  const arriveRef = useRef<() => void>(() => {});

  const st = statuses[floor];
  const counts = useMemo(() => {
    const c = { free: 0, occupied: 0, reserved: 0 };
    st.forEach((s) => c[s]++);
    return c;
  }, [st]);
  const floorFree = (f: FloorId) => countOf(statuses[f], "free");
  const bookingAt = (f: FloorId, i: number) =>
    park.bookings.find((b) => b.status === "active" && b.floor === f && b.spotIdx === i);
  const carAt = (f: FloorId, i: number) => park.cars.find((c) => c.floor === f && c.spotIdx === i);

  const isDesk = vp.w >= 1000;
  const navLike = phase === "nav" || phase === "arrived";
  const anchor = (ph: Phase, v: { w: number; h: number }) => ({
    x: v.w / 2 + (v.w >= 1000 ? 210 : 0),
    y: ph === "nav" || ph === "arrived" ? v.h * 0.68 : v.w >= 1000 ? v.h * 0.5 : v.h * 0.4,
  });
  const tiltOn = phase === "nav" && follow && tilt3d;
  const anc = anchor(phase, vp);

  /* viewport size */
  useEffect(() => {
    const el = stageRef.current!;
    const ro = new ResizeObserver(() => setVp({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* animation loop: simulation + camera */
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let lastUi = 0;
    let lastRot = 999;
    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      const { phase: ph, route: r, follow: fol, northUp: nu, origin: org, vp: v } = state.current;
      if (ph === "nav" && r) {
        sRef.current = Math.min(r.total, sRef.current + (r.mode === "drive" ? 46 : 22) * dt);
        if (sRef.current >= r.total) arriveRef.current();
      }
      let pos: Pt;
      let heading: number;
      if (r && ph !== "idle") {
        const a = pointAt(r, ph === "preview" ? 0 : sRef.current);
        pos = a;
        heading = a.heading;
      } else {
        pos = org === "car" ? ENTRANCE : LIFT;
        heading = org === "car" ? -90 : 90;
      }
      headRef.current = angleLerp(headRef.current, heading, 0.12);
      const c = cam.current;
      const tg = target.current;
      if (fol) {
        tg.cx = pos.x;
        tg.cy = pos.y;
        if (ph === "nav" || ph === "arrived") {
          tg.rot = nu ? 0 : -90 - headRef.current;
          tg.zoom = navZoom.current;
        }
      }
      const k = 0.14;
      c.cx += (tg.cx - c.cx) * k;
      c.cy += (tg.cy - c.cy) * k;
      c.zoom += (tg.zoom - c.zoom) * k;
      c.rot = angleLerp(c.rot, tg.rot, 0.1);
      const an = anchor(ph, v);
      worldRef.current?.setAttribute(
        "transform",
        `translate(${an.x} ${an.y}) rotate(${c.rot}) scale(${c.zoom}) translate(${-c.cx} ${-c.cy})`,
      );
      markerRef.current?.setAttribute(
        "transform",
        `translate(${pos.x} ${pos.y}) scale(${1 / c.zoom})`,
      );
      coneRef.current?.setAttribute("transform", `rotate(${headRef.current + 90})`);
      if (compassRef.current) compassRef.current.style.transform = `rotate(${c.rot}deg)`;
      if (r && routeOutRef.current && routeInRef.current) {
        const s = ph === "preview" ? 0 : sRef.current;
        const a = pointAt(r, s);
        const rest = [a, ...r.pts.slice(a.seg + 1)];
        const d = "M" + rest.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join("L");
        routeOutRef.current.setAttribute("d", d);
        routeInRef.current.setAttribute("d", d);
      }
      const svg = worldRef.current;
      if (svg) {
        svg.querySelectorAll<SVGGElement>("[data-pin]").forEach((el) => {
          el.setAttribute(
            "transform",
            `translate(${el.dataset.x} ${el.dataset.y}) rotate(${-c.rot}) scale(${1 / c.zoom})`,
          );
        });
        if (Math.abs(c.rot - lastRot) > 0.4) {
          lastRot = c.rot;
          svg.querySelectorAll<SVGTextElement>("[data-up]").forEach((el) => {
            el.setAttribute(
              "transform",
              `translate(${el.dataset.x} ${el.dataset.y}) rotate(${-c.rot})`,
            );
          });
        }
      }
      if (ph === "nav" && t - lastUi > 150) {
        lastUi = t;
        setTick((x) => x + 1);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  /* cross-tab intents: "route to my booking", "show violation on map" */
  useEffect(() => {
    const t = setTimeout(() => {
      const it = consumeIntent();
      if (!it) return;
      setFloor(it.floor);
      if (it.kind === "spot") {
        setOrigin("car");
        begin(routeToSpot(ENTRANCE, it.spotIdx, "drive", it.label, it.floor));
      } else if (it.spotIdx !== undefined) {
        const sp = SPOTS[it.spotIdx];
        state.current.follow = false;
        setFollow(false);
        target.current = { cx: sp.cx, cy: sp.cy, zoom: 1.8, rot: 0 };
        setSelected(it.spotIdx);
      }
    }, 120);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => () => setNavLock(null), []);

  /* wheel zoom */
  useEffect(() => {
    const el = stageRef.current!;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomBy(Math.exp(-e.deltaY * 0.0016));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const zoomBy = (f: number) => {
    const z = Math.max(0.35, Math.min(3.2, target.current.zoom * f));
    target.current.zoom = z;
    if (state.current.phase === "nav") navZoom.current = z;
  };
  const stopFollow = () => {
    if (state.current.follow) setFollow(false);
    state.current.follow = false;
  };
  const recenter = () => {
    setFollow(true);
    state.current.follow = true;
    if (state.current.phase !== "nav") {
      target.current.zoom = 1.3;
      target.current.rot = 0;
    }
  };

  /* gestures */
  const ptrs = useRef(new Map<number, { x: number; y: number }>());
  const gest = useRef({ moved: 0, pinch: 0 });
  const onDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.current.size === 1) gest.current.moved = 0;
    if (ptrs.current.size === 2) {
      const [a, b] = [...ptrs.current.values()];
      gest.current.pinch = Math.hypot(a.x - b.x, a.y - b.y);
      gest.current.moved = 99;
    }
  };
  const onMove = (e: React.PointerEvent) => {
    const p = ptrs.current.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    p.x = e.clientX;
    p.y = e.clientY;
    if (ptrs.current.size === 1) {
      gest.current.moved += Math.abs(dx) + Math.abs(dy);
      if (gest.current.moved < 6) return;
      stopFollow();
      const c = cam.current;
      const r = (c.rot * Math.PI) / 180;
      const wx = (dx * Math.cos(r) + dy * Math.sin(r)) / c.zoom;
      const wy = (-dx * Math.sin(r) + dy * Math.cos(r)) / c.zoom;
      c.cx -= wx;
      c.cy -= wy;
      target.current.cx = c.cx;
      target.current.cy = c.cy;
    } else if (ptrs.current.size === 2) {
      const [a, b] = [...ptrs.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (gest.current.pinch) zoomBy(d / gest.current.pinch);
      gest.current.pinch = d;
    }
  };
  const onUp = (e: React.PointerEvent) => {
    const single = ptrs.current.size === 1;
    ptrs.current.delete(e.pointerId);
    if (single && gest.current.moved < 6) {
      const el = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-spot]");
      if (el && phase !== "nav") setSelected(Number(el.getAttribute("data-spot")));
      else if (phase === "idle") setSelected(null);
    }
  };

  /* route lifecycle */
  const fit = (r: Route) => {
    const xs = r.pts.map((p) => p.x);
    const ys = r.pts.map((p) => p.y);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const v = state.current.vp;
    const desk = v.w >= 1000;
    const availW = v.w - (desk ? 460 : 60);
    const availH = v.h * (desk ? 0.7 : 0.42);
    target.current = {
      cx: (x0 + x1) / 2,
      cy: (y0 + y1) / 2,
      zoom: Math.max(0.35, Math.min(2, availW / (x1 - x0 + 60), availH / (y1 - y0 + 60))),
      rot: 0,
    };
  };
  const begin = (r: Route) => {
    setNavLock(
      r.spotIdx !== null && r.mode === "drive" ? { floor: r.floor, idx: r.spotIdx } : null,
    );
    setRoute(r);
    state.current.route = r;
    sRef.current = 0;
    setPhase("preview");
    setSelected(null);
    setMsg(null);
    setFollow(false);
    state.current.follow = false;
    fit(r);
  };
  const startNav = () => {
    sRef.current = 0;
    navZoom.current = isDesk ? 2.2 : 1.9;
    setNorthUp(false);
    setPhase("nav");
    setFollow(true);
  };
  const endNav = () => {
    setNavLock(null);
    setPhase("idle");
    setRoute(null);
    state.current.route = null;
    target.current.rot = 0;
    recenter();
  };
  arriveRef.current = () => {
    if (state.current.phase !== "nav") return;
    state.current.phase = "arrived";
    setPhase("arrived");
    const r = state.current.route;
    if (r?.mode === "drive" && r.spotIdx !== null) {
      parkMine(r.floor, r.spotIdx);
      setNavLock(null);
    }
  };
  const finish = () => {
    if (route?.mode === "drive") setOrigin("walk");
    endNav();
  };

  const goFree = (ev = false) => {
    setOrigin("car");
    const idx = nearestFree(st, ev ? (s) => s.ev : undefined);
    if (idx === null) {
      const alt = FLOORS.filter((f) => f !== floor).sort((a, b) => floorFree(b) - floorFree(a))[0];
      setMsg(
        ev
          ? `На ${floor} немає вільних EV-зарядок.`
          : `На ${floor} вільних місць немає. Найбільше місць на ${alt} — ${floorFree(alt)}.`,
      );
      return;
    }
    begin(
      routeToSpot(
        ENTRANCE,
        idx,
        "drive",
        ev ? "Найближча EV-зарядка" : "Найближче вільне місце",
        floor,
      ),
    );
  };
  const goSpot = (idx: number, label = "Обране місце") =>
    begin(routeToSpot(ENTRANCE, idx, "drive", label, floor));
  const goLift = () => {
    if (origin === "walk") {
      setMsg("Ви вже біля ліфтів і виходу в ТЦ.");
      return;
    }
    begin(makeRoute(ENTRANCE, key(LIFT), null, "walk", "Ліфти · вихід у ТЦ", "ліфти", floor, null));
  };
  const routeMyCar = (f: FloorId, idx: number, label: string) => {
    setFloor(f);
    setOrigin("walk");
    begin(routeToSpot(LIFT, idx, "walk", label, f));
  };
  const search = (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = norm(query);
    if (q.length < 3) {
      setMsg("Введіть номер авто або талона, наприклад AA 7421 KI або T-2210.");
      return;
    }
    const hit = findCar(query);
    if (hit.booking) {
      const b = hit.booking;
      setFloor(b.floor);
      setOrigin("car");
      begin(routeToSpot(ENTRANCE, b.spotIdx, "drive", `Ваша бронь ${b.code}`, b.floor));
      return;
    }
    if (!hit.car) {
      setMsg(`Авто або бронь «${query}» не знайдено. Перевірте номер авто, талона чи коду броні.`);
      return;
    }
    routeMyCar(hit.car.floor, hit.car.spotIdx, `Ваше авто · ${hit.car.plate}`);
  };
  const changeFloor = (f: FloorId) => {
    if (phase === "nav") return;
    setFloor(f);
    setSelected(null);
    setMsg(null);
    if (route) endNav();
  };

  /* derived nav info */
  const s = sRef.current;
  const next = route?.steps.find((x) => x.at > s + 3 && x.type !== "start");
  const after = next && route ? route.steps[route.steps.indexOf(next) + 1] : undefined;
  const remaining = route ? route.total - (phase === "preview" ? 0 : s) : 0;
  const eta = route ? etaMin(remaining, route.mode) : 0;
  const sel = selected !== null ? SPOTS[selected] : null;
  const selSt = selected !== null ? st[selected] : null;
  const selBooking =
    selected !== null && selSt === "reserved" ? bookingAt(floor, selected) : undefined;
  const selCar = selected !== null && selSt === "occupied" ? carAt(floor, selected) : undefined;
  const walking = route?.mode === "walk";

  return (
    <main className={`nv ${phase}`}>
      <div
        ref={stageRef}
        className="nv-stage"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <svg
          className="nv-svg"
          style={{
            transform: tiltOn ? "perspective(1100px) rotateX(52deg) scale(1.5)" : "none",
            transformOrigin: `${(anc.x / vp.w) * 100}% ${(anc.y / vp.h) * 100}%`,
          }}
        >
          <defs>
            <radialGradient id="nvCone" cx="0.5" cy="1" r="1">
              <stop offset="0" stopColor="#4285F4" stopOpacity="0.55" />
              <stop offset="1" stopColor="#4285F4" stopOpacity="0" />
            </radialGradient>
            <pattern
              id="nvHatch"
              width="10"
              height="10"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <rect width="10" height="10" fill="#eef0f2" />
              <line x1="0" y1="0" x2="0" y2="10" stroke="#dfe3e7" strokeWidth="4" />
            </pattern>
          </defs>
          <g ref={worldRef}>
            <rect x={-1500} y={760} width={4000} height={140} fill="#d7dce1" />
            <rect
              x={40}
              y={40}
              width={920}
              height={660}
              rx={8}
              fill="#f8f9fa"
              stroke="#c3c9d0"
              strokeWidth={6}
            />
            {/* aisles */}
            {AISLES_Y.map((y) => (
              <rect key={y} x={80} y={y - 30} width={840} height={60} fill="#fff" />
            ))}
            <rect x={80} y={145} width={60} height={620} fill="#fff" />
            <rect x={860} y={145} width={60} height={620} fill="#fff" />
            <rect x={80} y={700} width={60} height={60} fill="url(#nvHatch)" />
            <rect x={860} y={700} width={60} height={60} fill="url(#nvHatch)" />
            {AISLES_Y.map((y) => (
              <line key={y} x1={110} x2={890} y1={y} y2={y} className="nv-dash" />
            ))}
            <line x1={110} x2={110} y1={175} y2={760} className="nv-dash" />
            <line x1={890} x2={890} y1={175} y2={760} className="nv-dash" />
            {AISLES_Y.flatMap((y) =>
              [300, 650].map((x) => (
                <path key={`${x}${y}`} d={`M${x - 6} ${y - 7}l9 7-9 7`} className="nv-flow" />
              )),
            )}
            {/* pillars */}
            {[170, 330, 490, 650, 810].flatMap((x) =>
              [275, 475].map((y) => (
                <rect
                  key={`${x}-${y}`}
                  x={x - 5}
                  y={y - 5}
                  width={10}
                  height={10}
                  className="nv-pillar"
                />
              )),
            )}
            {/* spots */}
            {SPOTS.map((sp, i) => {
              const status = st[i];
              const above = AISLES_Y[sp.aisle] > sp.cy;
              const isCar = myCar && myCar.floor === floor && myCar.idx === i;
              const target = route && route.floor === floor && route.spotIdx === i;
              return (
                <g
                  key={sp.id}
                  data-spot={i}
                  className={`nv-spot ${status} ${selected === i ? "sel" : ""} ${target ? "tgt" : ""}`}
                >
                  <rect x={sp.x} y={sp.y} width={38} height={70} rx={3} />
                  {status === "occupied" && (
                    <g className={`nv-car ${isCar ? "mine" : ""}`}>
                      <rect x={sp.cx - 12} y={sp.y + 10} width={24} height={50} rx={8} />
                      <rect
                        x={sp.cx - 9}
                        y={sp.y + (above ? 18 : 36)}
                        width={18}
                        height={12}
                        rx={3}
                        className="glass"
                      />
                    </g>
                  )}
                  {status === "reserved" && (
                    <path d={`M${sp.cx - 7} ${sp.cy - 10}h14v20l-7-5-7 5z`} className="nv-bm" />
                  )}
                  {sp.ev && (
                    <circle cx={sp.cx} cy={above ? sp.y + 14 : sp.y + 56} r={7} className="nv-ev" />
                  )}
                  <text
                    data-up
                    data-x={sp.cx}
                    data-y={above ? sp.y + 63 : sp.y + 8}
                    transform={`translate(${sp.cx} ${above ? sp.y + 63 : sp.y + 8})`}
                    className="nv-id"
                  >
                    {sp.id}
                  </text>
                </g>
              );
            })}
            {/* lift core */}
            <rect x={455} y={205} width={90} height={140} rx={6} className="nv-core" />
            <g data-up data-x={500} data-y={275} transform="translate(500 275)">
              <text y={-8} className="nv-core-t">
                ЛІФТИ
              </text>
              <text y={9} className="nv-core-s">
                вихід у ТЦ · каса
              </text>
            </g>
            <text
              data-up
              data-x={110}
              data-y={748}
              transform="translate(110 748)"
              className="nv-gate"
            >
              В'ЇЗД
            </text>
            <text
              data-up
              data-x={890}
              data-y={748}
              transform="translate(890 748)"
              className="nv-gate"
            >
              ВИЇЗД
            </text>
            <text
              data-up
              data-x={500}
              data-y={815}
              transform="translate(500 815)"
              className="nv-street"
            >
              вул. Набережна
            </text>

            {/* route */}
            {route && route.floor === floor && (
              <>
                <path ref={routeOutRef} className={`nv-route-out ${route.mode}`} />
                <path ref={routeInRef} className={`nv-route-in ${route.mode}`} />
                <g
                  data-pin
                  data-x={route.pts[route.pts.length - 1].x}
                  data-y={route.pts[route.pts.length - 1].y}
                >
                  <path
                    d="M0 0c-3-9-13-14-13-24a13 13 0 0 1 26 0c0 10-10 15-13 24Z"
                    className="nv-pin"
                  />
                  <circle cx={0} cy={-24} r={5} fill="#fff" />
                </g>
              </>
            )}
            {myCar && myCar.floor === floor && route?.spotIdx !== myCar.idx && (
              <g data-pin data-x={SPOTS[myCar.idx].cx} data-y={SPOTS[myCar.idx].cy}>
                <circle r={13} className="nv-mycar" />
                <path
                  d="M-6 3h12M-6 3l2-6h8l2 6v3h-12Z"
                  fill="none"
                  stroke="#fff"
                  strokeWidth={2}
                />
              </g>
            )}
            {/* me */}
            <g ref={markerRef} className={`nv-me ${navLike ? "navmode" : ""}`}>
              <circle r={26} className="nv-acc" />
              <g ref={coneRef}>
                <path
                  d="M0 0L-17 -46A50 50 0 0 1 17 -46Z"
                  fill="url(#nvCone)"
                  className="nv-cone"
                />
                <path d="M0 -16L12 12L0 6L-12 12Z" className="nv-chev" />
              </g>
              <circle r={9} className="nv-dot" />
            </g>
          </g>
        </svg>
      </div>

      {/* ---------- TOP ---------- */}
      {phase === "nav" && route && next ? (
        <div className="nv-banner">
          <div className="nv-banner-main">
            <span className="nv-man">
              <Ic d={stepIcon(next.type)} size={38} sw={2.6} />
            </span>
            <div>
              <b>{next.type === "arrive" ? `${metres(next.at - s)}` : metres(next.at - s)}</b>
              <p>
                {next.type === "arrive"
                  ? `Пункт призначення — ${next.name}`
                  : `${stepText(next)} · ${next.name}`}
              </p>
            </div>
          </div>
          {after && (
            <div className="nv-banner-then">
              Потім <Ic d={stepIcon(after.type)} size={18} sw={2.4} />{" "}
              {after.type === "arrive" ? after.name : stepText(after).toLowerCase()}
            </div>
          )}
        </div>
      ) : phase === "preview" && route ? (
        <div className="nv-top">
          <div className="nv-dir">
            <button className="nv-icon-btn" onClick={endNav} aria-label="Назад">
              <Ic d={D.back} />
            </button>
            <div className="nv-dir-pts">
              <span>
                <i className="o" />
                {route.pts[0].y === LIFT.y ? "Ліфти · вихід із ТЦ" : "В'їзд на паркінг"}
              </span>
              <span>
                <i className="d" />
                {route.label} · {route.short}
              </span>
            </div>
          </div>
        </div>
      ) : phase === "idle" ? (
        <div className="nv-top">
          <form className="nv-search" onSubmit={search}>
            <Ic d={D.search} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Номер авто, талона або броні"
            />
            {query && (
              <button
                type="button"
                className="nv-clear"
                onClick={() => {
                  setQuery("");
                  setMsg(null);
                }}
                aria-label="Очистити"
              >
                <Ic d={D.close} size={18} />
              </button>
            )}
            <button className="nv-go">Знайти</button>
          </form>
          <div className="nv-chips">
            <button onClick={() => goFree()}>
              <span className="g">
                <Ic d={D.spot} size={16} />
              </span>
              Вільне місце
            </button>
            <button
              onClick={() =>
                myCar
                  ? routeMyCar(myCar.floor, myCar.idx, `Ваше авто · ${myCar.ticket}`)
                  : (setQuery("AA 7421 KI"),
                    setMsg("Демо: натисніть «Знайти», щоб прокласти маршрут до авто."))
              }
            >
              <span className="b">
                <Ic d={D.car} size={16} />
              </span>
              Моє авто
            </button>
            <button onClick={goLift}>
              <span className="s">
                <Ic d={D.lift} size={16} />
              </span>
              Ліфти та вихід
            </button>
            <button onClick={() => goFree(true)}>
              <span className="y">
                <Ic d={D.ev} size={16} />
              </span>
              EV-зарядка
            </button>
          </div>
          {msg && (
            <div className="nv-msg">
              <span>{msg}</span>
              <div>
                {DEMO_CARS.map((c) => (
                  <button
                    key={c.plate}
                    onClick={() => {
                      setQuery(c.plate);
                      setMsg(null);
                    }}
                  >
                    {c.plate}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* ---------- FABS ---------- */}
      <div className="nv-fabs">
        <div className="nv-floors">
          {FLOORS.map((f) => (
            <button
              key={f}
              className={floor === f ? "active" : ""}
              onClick={() => changeFloor(f)}
              disabled={phase === "nav" && f !== floor}
            >
              {f}
              <small className={floorFree(f) === 0 ? "full" : ""}>
                {floorFree(f) === 0 ? "FULL" : floorFree(f)}
              </small>
            </button>
          ))}
        </div>
        <button
          className="nv-fab"
          onClick={() => (phase === "nav" ? setNorthUp(!northUp) : (target.current.rot = 0))}
          aria-label="Компас"
          title={
            phase === "nav" ? (northUp ? "За напрямком руху" : "Північ угорі") : "Північ угорі"
          }
        >
          <span ref={compassRef} className="nv-compass">
            <i />
            <b>N</b>
          </span>
        </button>
        {phase === "nav" && (
          <button className={`nv-fab txt ${tilt3d ? "on" : ""}`} onClick={() => setTilt3d(!tilt3d)}>
            {tilt3d ? "3D" : "2D"}
          </button>
        )}
        <div className="nv-zoom">
          <button onClick={() => zoomBy(1.35)} aria-label="Збільшити">
            <Ic d={D.plus} />
          </button>
          <button onClick={() => zoomBy(1 / 1.35)} aria-label="Зменшити">
            <Ic d={D.minus} />
          </button>
        </div>
        {phase !== "nav" && (
          <button
            className={`nv-fab ${follow ? "on" : ""}`}
            onClick={recenter}
            aria-label="Моє місцезнаходження"
          >
            <Ic d={D.locate} />
          </button>
        )}
      </div>

      {phase === "nav" && !follow && (
        <button className="nv-recenter" onClick={recenter}>
          <Ic d={D.nav} size={18} />
          Повернутися до маршруту
        </button>
      )}

      {/* ---------- SHEET ---------- */}
      <section className="nv-sheet">
        <span className="nv-grab" />
        {phase === "nav" && route ? (
          <div className="nv-trip">
            <button className="nv-exit" onClick={endNav} aria-label="Завершити навігацію">
              <Ic d={D.close} size={22} />
            </button>
            <div className="nv-trip-mid">
              <b>{eta} хв</b>
              <span>
                {metres(remaining)} · прибуття {clock(eta)}
              </span>
            </div>
            <span className="nv-mode">{walking ? <Ic d={D.walk} /> : <Ic d={D.car} />}</span>
          </div>
        ) : phase === "arrived" && route ? (
          <div className="nv-arrived">
            <span className="nv-arr-ic">
              <Ic d={D.flag} size={26} />
            </span>
            <div>
              <b>
                {route.mode === "drive"
                  ? `Ви на місці ${route.short.replace("місце ", "")}`
                  : route.spotIdx !== null
                    ? "Ваше авто поруч"
                    : "Ви біля ліфтів"}
              </b>
              <p>
                {route.mode === "drive"
                  ? `Поверх ${route.floor}. Місце збережено: знайдіть авто за талоном ${myCar?.ticket ?? ""}.`
                  : route.spotIdx !== null
                    ? `${route.short} · поверх ${route.floor}. Гарної дороги!`
                    : "Вихід у торговий центр праворуч."}
              </p>
            </div>
            <button className="nv-primary" onClick={finish}>
              Готово
            </button>
          </div>
        ) : phase === "preview" && route ? (
          <div className="nv-preview">
            <div className="nv-prev-head">
              <div>
                <b className="eta">
                  {eta} хв <span>({metres(route.total)})</span>
                </b>
                <p>
                  {route.label} · {route.short} · поверх {route.floor}
                </p>
              </div>
              <span className="nv-mode">{walking ? <Ic d={D.walk} /> : <Ic d={D.car} />}</span>
            </div>
            <div className="nv-actions">
              <button className="nv-primary" onClick={startNav}>
                <Ic d={D.nav} size={18} />
                Старт
              </button>
              <button className="nv-secondary" onClick={endNav}>
                Скасувати
              </button>
            </div>
            <ol className="nv-steps">
              {route.steps.map((stp, i) => (
                <li key={i}>
                  <span>
                    <Ic d={stepIcon(stp.type)} size={18} />
                  </span>
                  <div>
                    <b>
                      {stp.type === "start"
                        ? `${walking ? "Ідіть" : "Рухайтесь"} по: ${stp.name}`
                        : stp.type === "arrive"
                          ? `Прибуття: ${stp.name}`
                          : `${stepText(stp)} — ${stp.name}`}
                    </b>
                    {i < route.steps.length - 1 && (
                      <small>{metres(route.steps[i + 1].at - stp.at)}</small>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ) : sel ? (
          <div className="nv-spotcard">
            <div className="nv-prev-head">
              <div>
                <b className="title">
                  Місце {sel.id}
                  {sel.ev ? " · EV" : ""}
                </b>
                <p>
                  Поверх {floor} · ряд {sel.row} ·{" "}
                  <span className={`st ${selSt}`}>
                    {selSt === "free"
                      ? "Вільне"
                      : selSt === "reserved"
                        ? "Заброньоване"
                        : "Зайняте"}
                  </span>
                </p>
              </div>
              <button
                className="nv-icon-btn"
                onClick={() => setSelected(null)}
                aria-label="Закрити"
              >
                <Ic d={D.close} size={18} />
              </button>
            </div>
            {selBooking && (
              <div className="nv-info">
                <span>Бронь {selBooking.code}</span>
                <b>
                  {selBooking.plate} · {selBooking.start}, {selBooking.hours} год
                </b>
              </div>
            )}
            {selCar && (
              <div className="nv-info">
                <span>
                  {selCar.mine ? "Ваше авто" : "Стоїть"} · талон {selCar.ticket}
                </span>
                <b>
                  {selCar.plate} · {fmtStay(stayMin(selCar))} (з {hhmm(selCar.since)})
                </b>
              </div>
            )}
            {selSt === "free" || selBooking ? (
              <button
                className="nv-primary wide"
                onClick={() =>
                  goSpot(selected!, selBooking ? `Бронь ${selBooking.code}` : "Обране місце")
                }
              >
                <Ic d={D.nav} size={18} />
                {selBooking ? "Маршрут до заброньованого місця" : "Маршрут сюди"}
              </button>
            ) : selCar ? (
              <button
                className="nv-secondary wide"
                onClick={() => routeMyCar(floor, selected!, `Авто ${selCar.plate}`)}
              >
                Пішки від ліфтів до цього авто
              </button>
            ) : (
              <p className="nv-note">Оберіть зелене місце або скористайтеся «Вільне місце».</p>
            )}
          </div>
        ) : (
          <div className="nv-around">
            <div className="nv-prev-head">
              <div>
                <small>AROUND ME</small>
                <b className="title">
                  {origin === "car" ? "Ви біля в'їзду" : "Ви біля ліфтів"} · {floor}
                </b>
              </div>
              <div className="nv-seg">
                <button className={origin === "car" ? "on" : ""} onClick={() => setOrigin("car")}>
                  <Ic d={D.car} size={16} />
                  Авто
                </button>
                <button className={origin === "walk" ? "on" : ""} onClick={() => setOrigin("walk")}>
                  <Ic d={D.walk} size={16} />
                  Пішки
                </button>
              </div>
            </div>
            <div className="nv-counts">
              <div>
                <i className="free" />
                <b>{counts.free}</b>
                <span>вільно</span>
              </div>
              <div>
                <i className="occupied" />
                <b>{counts.occupied}</b>
                <span>зайнято</span>
              </div>
              <div>
                <i className="reserved" />
                <b>{counts.reserved}</b>
                <span>бронь</span>
              </div>
            </div>
            {counts.free === 0 && (
              <div className="nv-full">
                Поверх {floor} заповнений.
                <button onClick={() => changeFloor("P2")}>
                  Перейти на P2 · {floorFree("P2")} вільно
                </button>
              </div>
            )}
            <button
              className="nv-primary wide"
              onClick={() =>
                origin === "car"
                  ? goFree()
                  : myCar
                    ? routeMyCar(myCar.floor, myCar.idx, `Ваше авто · ${myCar.ticket}`)
                    : search()
              }
            >
              <Ic d={D.nav} size={18} />
              {origin === "car" ? "До найближчого вільного місця" : "Знайти моє авто"}
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
