import { useEffect, useMemo, useState } from "react";
import "./modules.css";
import {
  EV_SURCHARGE,
  FLOORS_ASC,
  LIFT,
  PRICE_PER_HOUR,
  SPOTS,
  addViolation,
  arrive,
  bestSector,
  book,
  bookingPrice,
  cancelBooking,
  countOf,
  departRandom,
  dismissViolation,
  downloadFile,
  fillAll,
  fmtDate,
  fmtStay,
  formatPlate,
  hhmm,
  isPlate,
  isoDate,
  issueFine,
  metrics,
  money,
  norm,
  reportCsv,
  resetDemo,
  restoreFloors,
  setFineStatus,
  setIntent,
  setSim,
  usePark,
  type Booking as BookingT,
  type EventKind,
  type Fine,
  type FloorId,
  type Status,
} from "./parking";

export type Go = (v: "home" | "map" | "led" | "booking" | "dashboard") => void;

const D = {
  arrow: "M5 12h14M13 6l6 6-6 6",
  back: "M19 12H5M11 6l-6 6 6 6",
  nav: "M12 2 4 21l8-4 8 4Z",
  car: "M5 17h14M6 17v2M18 17v2M5 13l2-6h10l2 6v4H5ZM8 14h.01M16 14h.01",
  close: "M6 6l12 12M18 6 6 18",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4",
  download: "M12 4v11M7 10l5 5 5-5M5 20h14",
  play: "M7 5v14l11-7Z",
  pause: "M8 5v14M16 5v14",
  reset: "M4 12a8 8 0 1 0 2.3-5.7M4 4v4h4",
  check: "M5 12l5 5 9-10",
  cal: "M4 6h16v15H4ZM8 3v5M16 3v5M4 11h16",
  pin: "M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12ZM12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  ev: "M13 2 4 14h7l-1 8 9-12h-7Z",
  lift: "M5 3h14v18H5ZM12 3v18M8 9l1.5-2L11 9M16 15l-1.5 2L13 15",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM20 20l-4-4",
  minus: "M5 12h14",
  plus: "M12 5v14M5 12h14",
  card: "M3 6h18v12H3ZM3 10h18M7 15h3",
  phone: "M7 2h10v20H7ZM11 18h2",
  map: "m3 6 5-3 8 3 5-3v15l-5 3-8-3-5 3ZM8 3v15M16 6v15",
  chart: "M4 19V9M10 19V5M16 19v-7M22 19H2",
};
function Ic({ d, size = 18, sw = 2 }: { d: string; size?: number; sw?: number }) {
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
const pad = (n: number) => String(n).padStart(2, "0");
const useNow = (ms = 1000) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
};
const floorNum = (f: FloorId) => f.replace("P", "");

/* =====================================================================
   Mini floor map — the exact same layout the navigator uses
   ===================================================================== */
export function FloorMap({
  statuses,
  selected,
  onSelect,
  dimOthers,
  mineSpots = [],
}: {
  statuses: Status[];
  selected?: number | null;
  onSelect?: (i: number) => void;
  dimOthers?: (i: number) => boolean;
  mineSpots?: number[];
}) {
  return (
    <svg className="fm" viewBox="40 40 920 730" role="img" aria-label="План поверху паркінгу">
      <rect x={40} y={40} width={920} height={660} rx={8} className="fm-slab" />
      {[175, 375, 575].map((y) => (
        <rect key={y} x={80} y={y - 30} width={840} height={60} className="fm-aisle" />
      ))}
      <rect x={80} y={145} width={60} height={620} className="fm-aisle" />
      <rect x={860} y={145} width={60} height={620} className="fm-aisle" />
      {[175, 375, 575].map((y) => (
        <line key={y} x1={110} x2={890} y1={y} y2={y} className="fm-dash" />
      ))}
      <rect x={455} y={205} width={90} height={140} rx={6} className="fm-core" />
      <text x={500} y={270} className="fm-core-t">
        ЛІФТИ
      </text>
      <text x={500} y={290} className="fm-core-s">
        вихід у ТЦ
      </text>
      <text x={110} y={752} className="fm-gate">
        В'ЇЗД ↑
      </text>
      <text x={890} y={752} className="fm-gate">
        ВИЇЗД ↓
      </text>
      {SPOTS.map((sp, i) => {
        const st = statuses[i];
        const clickable = !!onSelect && st === "free" && !(dimOthers && dimOthers(i));
        return (
          <g
            key={sp.id}
            className={`fm-spot ${st} ${selected === i ? "sel" : ""} ${clickable ? "click" : ""} ${dimOthers && dimOthers(i) && st === "free" ? "dim" : ""} ${mineSpots.includes(i) ? "mine" : ""}`}
            onClick={() => clickable && onSelect!(i)}
          >
            <rect x={sp.x} y={sp.y} width={38} height={70} rx={4} />
            {st === "occupied" && (
              <rect x={sp.cx - 11} y={sp.y + 12} width={22} height={46} rx={7} className="fm-car" />
            )}
            {st === "reserved" && (
              <path d={`M${sp.cx - 7} ${sp.cy - 10}h14v20l-7-5-7 5z`} className="fm-bm" />
            )}
            {sp.ev && (
              <circle
                cx={sp.cx}
                cy={sp.aisle * 200 + 175 > sp.cy ? sp.y + 12 : sp.y + 58}
                r={6}
                className="fm-ev"
              />
            )}
            <text
              x={sp.cx}
              y={sp.aisle * 200 + 175 > sp.cy ? sp.y + 62 : sp.y + 13}
              className="fm-id"
            >
              {sp.id}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* =====================================================================
   LED entrance board (virtual twin)
   ===================================================================== */
export function LedBoard({ go }: { go: Go }) {
  const park = usePark();
  const now = useNow();
  const rows = FLOORS_ASC.map((f) => ({
    f,
    free: countOf(park.statuses[f], "free"),
    sector: bestSector(park.statuses[f]),
    dir: f === "P-1" ? "down" : f === "P1" ? "right" : "up",
  }));
  const allFull = rows.every((r) => r.free === 0);
  const sensorEvents = park.events.filter((e) => e.kind === "in" || e.kind === "out").slice(0, 5);

  return (
    <main className="led-page">
      <div className="section-heading">
        <div>
          <div className="eyebrow">
            <span>LIVE TWIN</span> Віртуальний дублер
          </div>
          <h1>В'їзне LED-табло</h1>
          <p>
            Дані з {SPOTS.length * 3} датчиків місць · ті самі, що бачить навігатор. Оновлено о{" "}
            {hhmm(now)}.
          </p>
        </div>
        <div className="md-actions">
          <button className={`md-btn ${park.sim ? "on" : ""}`} onClick={() => setSim(!park.sim)}>
            <Ic d={park.sim ? D.pause : D.play} />
            {park.sim ? "Live-потік увімкнено" : "Live-потік на паузі"}
          </button>
          <button
            className={`mode-button ${allFull ? "danger" : ""}`}
            onClick={() => (allFull ? restoreFloors() : fillAll())}
          >
            {allFull ? "Відновити місця" : "Тест: заповнити все"}
          </button>
        </div>
      </div>

      <section className={`led-frame ${allFull ? "full-mode" : ""}`}>
        <div className="led-pixels" />
        <div className="led-brand">
          <span>P+</span> PARKFLOW <i /> LIVE{" "}
          <em className="led-clock">{new Date(now).toLocaleTimeString("uk-UA")}</em>
        </div>
        {allFull ? (
          <div className="full-message">
            <small>УВАГА</small>
            <b>
              МІСЦЬ
              <br />
              НЕМАЄ
            </b>
            <strong>FULL</strong>
            <p>Скористайтеся паркінгом на вул. Дніпровська, 12</p>
          </div>
        ) : (
          <div className="floor-list">
            <div className="board-title">
              ВІЛЬНІ МІСЦЯ <span>FREE SPACES</span>
            </div>
            {rows.map((r) => (
              <div className={`floor-row ${r.free === 0 ? "is-full" : ""}`} key={r.f}>
                <div>
                  <small>ПОВЕРХ</small>
                  <b>{floorNum(r.f)}</b>
                </div>
                <strong>{String(r.free).padStart(2, "0")}</strong>
                <span>
                  {r.free === 0 ? "[FULL]" : "ВІЛЬНО"}
                  {r.free > 0 && r.sector && <em className="led-sector">СЕКТОР {r.sector}</em>}
                </span>
                <div className={`light-arrow ${r.free === 0 ? "" : r.dir}`}>
                  {r.free === 0 ? (
                    <b className="led-x">✕</b>
                  ) : (
                    <>
                      <i />
                      <i />
                      <i />
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="board-footer">
          {allFull
            ? "ВСІ ПОВЕРХИ ЗАПОВНЕНІ · ШЛАГБАУМ ЗАБЛОКОВАНО"
            : rows
                .map(
                  (r) =>
                    `ПОВЕРХ ${floorNum(r.f)}: ${r.free === 0 ? "0 [FULL]" : `${r.free} ВІЛЬНО`}`,
                )
                .join("  |  ")}
        </div>
      </section>

      <section className="led-controls md-led-controls">
        <div>
          <b>Керування потоком (Mock-JSON → спільні дані)</b>
          <small>
            «Заїзд» займає випадкове вільне місце, «Виїзд» звільняє. Зміни одразу видно в навігаторі
            та дашборді.
          </small>
        </div>
        {rows.map((r) => (
          <div className="counter-control" key={r.f}>
            <span>{r.f}</span>
            <button title="Заїзд авто" disabled={r.free === 0} onClick={() => arrive(r.f)}>
              −
            </button>
            <b>{r.free}</b>
            <button title="Виїзд авто" onClick={() => departRandom(r.f, 1)}>
              +
            </button>
          </div>
        ))}
        <button className="md-btn" onClick={() => go("map")}>
          <Ic d={D.map} />
          Навігатор
        </button>
      </section>
      <section className="md-ticker">
        <b>Останні спрацювання датчиків</b>
        {sensorEvents.length ? (
          sensorEvents.map((e) => (
            <div key={e.id}>
              <i className={e.kind} />
              <span>{hhmm(e.at)}</span>
              {e.text}
            </div>
          ))
        ) : (
          <p>Поки що подій немає — увімкніть Live-потік або натисніть «−» / «+».</p>
        )}
      </section>
    </main>
  );
}

/* =====================================================================
   Booking — 3 steps on the real floor plan
   ===================================================================== */
function slotsFor(iso: string) {
  const out: string[] = [];
  const now = new Date();
  const today = iso === isoDate(now);
  for (let h = 7; h <= 22; h++)
    for (const mm of [0, 30]) {
      if (today && h * 60 + mm < now.getHours() * 60 + now.getMinutes() + 15) continue;
      out.push(`${pad(h)}:${pad(mm)}`);
    }
  return out;
}
function QR({ text, size = 132 }: { text: string; size?: number }) {
  const n = 25;
  let h = 2166136261;
  const cells: boolean[] = [];
  for (let i = 0; i < n * n; i++) {
    h ^= text.charCodeAt(i % text.length) + i;
    h = Math.imul(h, 16777619) >>> 0;
    cells.push((h & 7) < 3);
  }
  const finder = (x: number, y: number) => (cx: number, cy: number) => {
    const dx = cx - x;
    const dy = cy - y;
    if (dx < 0 || dy < 0 || dx > 6 || dy > 6) return null;
    return (
      dx === 0 || dy === 0 || dx === 6 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4)
    );
  };
  const fs = [finder(0, 0), finder(n - 7, 0), finder(0, n - 7)];
  const rects = [];
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      let on = cells[y * n + x];
      for (const f of fs) {
        const r = f(x, y);
        if (r !== null) on = r;
      }
      if ((x === 7 || y === 7) && (x < 8 || x > n - 9) && (y < 8 || y > n - 9)) on = false;
      if (on) rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} />);
    }
  return (
    <svg
      width={size}
      height={size}
      viewBox={`-2 -2 ${n + 4} ${n + 4}`}
      className="qr"
      aria-label={`QR-код ${text}`}
    >
      <rect x={-2} y={-2} width={n + 4} height={n + 4} fill="#fff" />
      <g fill="#1c2637">{rects}</g>
    </svg>
  );
}
function icsFor(b: BookingT) {
  const [y, m, d] = b.date.split("-");
  const [hh, mm] = b.start.split(":").map(Number);
  const end = hh * 60 + mm + b.hours * 60;
  const t = (mins: number) => `${y}${m}${d}T${pad(Math.floor(mins / 60) % 24)}${pad(mins % 60)}00`;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ParkFlow//UA",
    "BEGIN:VEVENT",
    `UID:${b.code}@parkflow`,
    `DTSTART:${t(hh * 60 + mm)}`,
    `DTEND:${t(end)}`,
    `SUMMARY:Паркінг ParkFlow · ${b.floor} · ${SPOTS[b.spotIdx].id}`,
    `DESCRIPTION:Бронь ${b.code}. Авто ${b.plate}. Місце утримується 15 хв після початку.`,
    "LOCATION:ТРЦ River Mall · паркінг",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function Booking({ go }: { go: Go }) {
  const park = usePark();
  const today = isoDate(new Date());
  const dates = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(Date.now() + i * 86400000);
        return {
          iso: isoDate(d),
          wd: i === 0 ? "Сьогодні" : d.toLocaleDateString("uk-UA", { weekday: "short" }),
          day: d.getDate(),
        };
      }),
    [],
  );
  const firstDate = slotsFor(today).length ? today : dates[1].iso;
  const [step, setStep] = useState(1);
  const [date, setDate] = useState(firstDate);
  const slots = slotsFor(date);
  const [start, setStart] = useState(slotsFor(firstDate)[0]);
  const [hours, setHours] = useState(2);
  const [floor, setFloor] = useState<FloorId>(
    () =>
      [...FLOORS_ASC].sort(
        (a, b) => countOf(park.statuses[b], "free") - countOf(park.statuses[a], "free"),
      )[0],
  );
  const [spot, setSpot] = useState<number | null>(null);
  const [evOnly, setEvOnly] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [plate, setPlate] = useState("");
  const [phone, setPhone] = useState("");
  const [pay, setPay] = useState<"card" | "wallet">("card");
  const [cardNo, setCardNo] = useState("");
  const [exp, setExp] = useState("");
  const [cvc, setCvc] = useState("");
  const [tried, setTried] = useState(false);
  const [paying, setPaying] = useState(false);
  const [doneCode, setDoneCode] = useState<string | null>(null);

  const st = park.statuses[floor];
  const freeCount = countOf(st, "free");
  const done = doneCode ? (park.bookings.find((b) => b.code === doneCode) ?? null) : null;
  const myBookings = park.bookings.filter((b) => b.byMe);
  const price = spot !== null ? bookingPrice(spot, hours) : hours * PRICE_PER_HOUR;

  useEffect(() => {
    if (!slots.includes(start)) setStart(slots[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);
  // a live car may take the chosen spot — tell the user instead of failing at payment
  useEffect(() => {
    if (spot !== null && st[spot] !== "free" && step < 4) {
      setNotice(`Місце ${SPOTS[spot].id} щойно зайняли. Оберіть інше.`);
      setSpot(null);
      if (step === 3) setStep(2);
    }
  }, [st, spot, step]);

  const errors = {
    name: name.trim().length < 2 ? "Вкажіть ім'я" : "",
    plate: !isPlate(plate) ? "Формат: AA 1234 BC" : "",
    phone: phone && phone.replace(/\D/g, "").length < 10 ? "Перевірте номер" : "",
    card: pay === "card" && cardNo.replace(/\D/g, "").length !== 16 ? "16 цифр" : "",
    exp:
      pay === "card" &&
      !(() => {
        const m = exp.match(/^(\d{2})\/(\d{2})$/);
        if (!m) return false;
        const mo = +m[1];
        const yr = 2000 + +m[2];
        const now = new Date();
        return (
          mo >= 1 &&
          mo <= 12 &&
          (yr > now.getFullYear() || (yr === now.getFullYear() && mo >= now.getMonth() + 1))
        );
      })()
        ? "ММ/РР"
        : "",
    cvc: pay === "card" && !/^\d{3}$/.test(cvc) ? "3 цифри" : "",
  };
  const valid = Object.values(errors).every((e) => !e);

  const nearestToLift = () => {
    let best: number | null = null;
    let bd = Infinity;
    SPOTS.forEach((sp, i) => {
      if (st[i] !== "free" || (evOnly && !sp.ev)) return;
      const d = Math.hypot(sp.cx - LIFT.x, sp.cy - 275);
      if (d < bd) [bd, best] = [d, i];
    });
    if (best === null)
      setNotice(
        evOnly ? `На ${floor} немає вільних EV-місць.` : `На ${floor} немає вільних місць.`,
      );
    else {
      setSpot(best);
      setNotice(null);
    }
  };
  const submit = () => {
    setTried(true);
    if (!valid || spot === null) return;
    setPaying(true);
    setTimeout(() => {
      const b = book({ floor, spotIdx: spot, date, start, hours, plate, name: name.trim() });
      setPaying(false);
      if (!b) {
        setNotice("Місце щойно зайняли. Оберіть інше — оплату не списано.");
        setSpot(null);
        setStep(2);
        return;
      }
      setDoneCode((b as BookingT).code);
      setStep(4);
    }, 1100);
  };
  const restart = () => {
    setStep(1);
    setSpot(null);
    setDoneCode(null);
    setTried(false);
    setCardNo("");
    setExp("");
    setCvc("");
  };
  const routeTo = (b: BookingT) => {
    setIntent({ kind: "spot", floor: b.floor, spotIdx: b.spotIdx, label: `Ваша бронь ${b.code}` });
    go("map");
  };
  const dateLabel = (iso: string) => (iso === today ? "сьогодні" : fmtDate(iso));

  return (
    <main className="booking-page bk-page">
      <section className="booking-copy">
        <div className="eyebrow">
          <span>ONLINE</span> Попереднє бронювання
        </div>
        <h1>
          Паркуйтесь без
          <br />
          <em>зайвих кіл.</em>
        </h1>
        <p>
          Справжній план паркінгу в реальному часі. Місце чекатиме на вас 15 хвилин після
          запланованого часу, а навігатор приведе прямо до нього.
        </p>
        <div className="bk-steps">
          {["Час", "Місце", "Оплата"].map((l, i) => (
            <button
              key={l}
              className={step > i + 1 ? "done" : step === i + 1 ? "active" : ""}
              disabled={step === 4 || step < i + 1}
              onClick={() => setStep(i + 1)}
            >
              <span>{step > i + 1 ? <Ic d={D.check} size={14} sw={3} /> : i + 1}</span>
              {l}
            </button>
          ))}
        </div>
        <div className="bk-mine">
          <h3>Мої бронювання {myBookings.length ? `· ${myBookings.length}` : ""}</h3>
          {myBookings.length === 0 && <p>Тут з'являться ваші бронювання.</p>}
          {myBookings.slice(0, 4).map((b) => (
            <div key={b.code} className={`bk-mine-row ${b.status}`}>
              <div>
                <b>
                  {b.floor} · {SPOTS[b.spotIdx].id}
                </b>
                <small>
                  {b.code} · {dateLabel(b.date)}, {b.start} · {b.hours} год
                </small>
              </div>
              {b.status === "active" ? (
                <div className="bk-mine-act">
                  <button onClick={() => routeTo(b)} title="Маршрут">
                    <Ic d={D.nav} size={15} />
                  </button>
                  <button onClick={() => cancelBooking(b.code)} title="Скасувати">
                    <Ic d={D.close} size={15} />
                  </button>
                </div>
              ) : (
                <span className="bk-tag">{b.status === "arrived" ? "На місці" : "Скасовано"}</span>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="booking-card bk-card">
        {step === 1 && (
          <>
            <div className="booking-card-head">
              <div>
                <small>КРОК 1 З 3</small>
                <h2>Коли ви приїдете?</h2>
              </div>
            </div>
            <div className="date-strip bk-dates">
              {dates.map((d) => (
                <button
                  key={d.iso}
                  className={date === d.iso ? "active" : ""}
                  disabled={!slotsFor(d.iso).length}
                  onClick={() => setDate(d.iso)}
                >
                  <small>{d.wd}</small>
                  <b>{d.day}</b>
                </button>
              ))}
            </div>
            <div className="bk-label">ЧАС ПРИБУТТЯ</div>
            <div className="bk-slots">
              {slots.map((t) => (
                <button key={t} className={start === t ? "active" : ""} onClick={() => setStart(t)}>
                  {t}
                </button>
              ))}
            </div>
            <div className="bk-row">
              <div>
                <div className="bk-label">ТРИВАЛІСТЬ</div>
                <div className="bk-stepper">
                  <button onClick={() => setHours(Math.max(1, hours - 1))} disabled={hours <= 1}>
                    <Ic d={D.minus} />
                  </button>
                  <b>{hours} год</b>
                  <button onClick={() => setHours(Math.min(8, hours + 1))} disabled={hours >= 8}>
                    <Ic d={D.plus} />
                  </button>
                </div>
              </div>
              <div className="bk-price">
                <small>ВАРТІСТЬ</small>
                <b>{money(hours * PRICE_PER_HOUR)}</b>
                <span>{PRICE_PER_HOUR} ₴ / год</span>
              </div>
            </div>
            <button className="bk-next" disabled={!start} onClick={() => setStep(2)}>
              Далі: обрати місце <Ic d={D.arrow} />
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <div className="booking-card-head">
              <div>
                <small>
                  КРОК 2 З 3 · {dateLabel(date)}, {start}
                </small>
                <h2>Оберіть місце</h2>
              </div>
              <span className="bk-live">
                <i /> {freeCount} вільно на {floor}
              </span>
            </div>
            <div className="bk-toolbar">
              <div className="bk-floors">
                {FLOORS_ASC.map((f) => {
                  const n = countOf(park.statuses[f], "free");
                  return (
                    <button
                      key={f}
                      className={floor === f ? "active" : ""}
                      onClick={() => {
                        setFloor(f);
                        setSpot(null);
                        setNotice(null);
                      }}
                    >
                      {f}
                      <small className={n === 0 ? "full" : ""}>{n === 0 ? "FULL" : n}</small>
                    </button>
                  );
                })}
              </div>
              <button
                className={`bk-chip ${evOnly ? "on" : ""}`}
                onClick={() => {
                  setEvOnly(!evOnly);
                  setSpot(null);
                }}
              >
                <Ic d={D.ev} size={15} /> EV-зарядка
              </button>
              <button className="bk-chip" onClick={nearestToLift}>
                <Ic d={D.lift} size={15} /> Найближче до ліфтів
              </button>
            </div>
            {notice && <div className="bk-notice">{notice}</div>}
            <div className="bk-map">
              {freeCount === 0 ? (
                <div className="bk-full">
                  <b>Поверх {floor} повністю заповнений</b>
                  <span>Оберіть інший поверх — місця на ньому оновлюються в реальному часі.</span>
                </div>
              ) : null}
              <FloorMap
                statuses={st}
                selected={spot}
                onSelect={(i) => {
                  setSpot(i);
                  setNotice(null);
                }}
                dimOthers={evOnly ? (i) => !SPOTS[i].ev : undefined}
                mineSpots={myBookings
                  .filter((b) => b.status === "active" && b.floor === floor)
                  .map((b) => b.spotIdx)}
              />
            </div>
            <div className="bk-legend">
              <span>
                <i className="free" />
                Вільно
              </span>
              <span>
                <i className="occupied" />
                Зайнято
              </span>
              <span>
                <i className="reserved" />
                Бронь
              </span>
              <span>
                <i className="sel" />
                Ваш вибір
              </span>
            </div>
            <div className="booking-summary">
              <div>
                <small>ВАШЕ МІСЦЕ</small>
                <b>
                  {spot !== null
                    ? `${floor} · ${SPOTS[spot].id}${SPOTS[spot].ev ? " · EV" : ""}`
                    : "Не обрано"}
                </b>
              </div>
              <div>
                <small>ВАРТІСТЬ</small>
                <b>
                  {money(price)}{" "}
                  <em>
                    / {hours} год{spot !== null && SPOTS[spot].ev ? ` + EV ${EV_SURCHARGE} ₴` : ""}
                  </em>
                </b>
              </div>
              <button disabled={spot === null} onClick={() => setStep(3)}>
                Далі <Ic d={D.arrow} />
              </button>
            </div>
          </>
        )}

        {step === 3 && spot !== null && (
          <>
            <div className="booking-card-head">
              <div>
                <small>КРОК 3 З 3</small>
                <h2>Дані та оплата</h2>
              </div>
              <button className="bk-link" onClick={() => setStep(2)}>
                <Ic d={D.back} size={16} /> Змінити місце
              </button>
            </div>
            <div className="bk-sum">
              <div>
                <small>Місце</small>
                <b>
                  {floor} · {SPOTS[spot].id}
                </b>
              </div>
              <div>
                <small>Коли</small>
                <b>
                  {dateLabel(date)}, {start}
                </b>
              </div>
              <div>
                <small>Тривалість</small>
                <b>{hours} год</b>
              </div>
              <div>
                <small>До сплати</small>
                <b className="accent">{money(price)}</b>
              </div>
            </div>
            <div className="bk-form">
              <label className={tried && errors.name ? "err" : ""}>
                Ім'я
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Олена Коваль"
                />
                {tried && errors.name && <em>{errors.name}</em>}
              </label>
              <label className={tried && errors.plate ? "err" : ""}>
                Номер авто
                <input
                  value={plate}
                  onChange={(e) => setPlate(e.target.value.toUpperCase())}
                  onBlur={() => setPlate(formatPlate(plate))}
                  placeholder="AA 1234 BC"
                  className="mono"
                />
                {tried && errors.plate && <em>{errors.plate}</em>}
              </label>
              <label className={`wide ${tried && errors.phone ? "err" : ""}`}>
                Телефон (необов'язково — для SMS з QR)
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+380 67 123 45 67"
                  inputMode="tel"
                />
                {tried && errors.phone && <em>{errors.phone}</em>}
              </label>
            </div>
            <div className="bk-label">СПОСІБ ОПЛАТИ</div>
            <div className="bk-pay">
              <button className={pay === "card" ? "active" : ""} onClick={() => setPay("card")}>
                <Ic d={D.card} /> Картка
              </button>
              <button className={pay === "wallet" ? "active" : ""} onClick={() => setPay("wallet")}>
                <Ic d={D.phone} /> Apple / Google Pay
              </button>
            </div>
            {pay === "card" && (
              <div className="bk-form card">
                <label className={`wide ${tried && errors.card ? "err" : ""}`}>
                  Номер картки
                  <input
                    value={cardNo}
                    inputMode="numeric"
                    onChange={(e) =>
                      setCardNo(
                        e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 16)
                          .replace(/(\d{4})(?=\d)/g, "$1 "),
                      )
                    }
                    placeholder="4242 4242 4242 4242"
                    className="mono"
                  />
                  {tried && errors.card && <em>{errors.card}</em>}
                </label>
                <label className={tried && errors.exp ? "err" : ""}>
                  Термін
                  <input
                    value={exp}
                    inputMode="numeric"
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                      setExp(v.length > 2 ? `${v.slice(0, 2)}/${v.slice(2)}` : v);
                    }}
                    placeholder="12/28"
                    className="mono"
                  />
                  {tried && errors.exp && <em>{errors.exp}</em>}
                </label>
                <label className={tried && errors.cvc ? "err" : ""}>
                  CVC
                  <input
                    value={cvc}
                    inputMode="numeric"
                    onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 3))}
                    placeholder="123"
                    className="mono"
                  />
                  {tried && errors.cvc && <em>{errors.cvc}</em>}
                </label>
              </div>
            )}
            {notice && <div className="bk-notice">{notice}</div>}
            <button className="bk-next" onClick={submit} disabled={paying}>
              {paying ? "Обробка платежу…" : `Оплатити ${money(price)}`}
            </button>
            <p className="bk-fine">
              Демо-оплата: кошти не списуються. Скасування безкоштовне до початку бронювання.
            </p>
          </>
        )}

        {step === 4 && done && (
          <div className={`bk-ticket ${done.status}`}>
            <div className="bk-ticket-head">
              <span className="bk-ok">
                <Ic d={done.status === "cancelled" ? D.close : D.check} size={22} sw={3} />
              </span>
              <div>
                <small>
                  {done.status === "cancelled"
                    ? "БРОНЮВАННЯ СКАСОВАНО"
                    : done.status === "arrived"
                      ? "ВИ ВЖЕ НА МІСЦІ"
                      : "БРОНЮВАННЯ ПІДТВЕРДЖЕНО"}
                </small>
                <h2>
                  {done.floor} · місце {SPOTS[done.spotIdx].id}
                </h2>
              </div>
            </div>
            <div className="bk-ticket-body">
              <QR text={done.code + done.plate} />
              <div className="bk-ticket-info">
                <div>
                  <small>Код броні</small>
                  <b className="mono">{done.code}</b>
                </div>
                <div>
                  <small>Авто</small>
                  <b className="mono">{done.plate}</b>
                </div>
                <div>
                  <small>Коли</small>
                  <b>
                    {dateLabel(done.date)}, {done.start} · {done.hours} год
                  </b>
                </div>
                <div>
                  <small>Сплачено</small>
                  <b>{money(done.price)}</b>
                </div>
              </div>
            </div>
            <p className="bk-fine">
              Покажіть QR на в'їзді або назвіть номер авто — LPR-камера відкриє шлагбаум. Код{" "}
              {done.code} також працює в пошуку навігатора.
            </p>
            <div className="bk-ticket-actions">
              {done.status === "active" && (
                <button className="bk-next" onClick={() => routeTo(done)}>
                  <Ic d={D.nav} /> Маршрут до місця
                </button>
              )}
              <button
                className="md-btn"
                onClick={() =>
                  downloadFile(`${done.code}.ics`, icsFor(done), "text/calendar;charset=utf-8")
                }
              >
                <Ic d={D.cal} /> Додати в календар
              </button>
              {done.status === "active" && (
                <button className="md-btn danger" onClick={() => cancelBooking(done.code)}>
                  Скасувати бронь
                </button>
              )}
              <button className="md-btn" onClick={restart}>
                Нове бронювання
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

/* =====================================================================
   B2B dashboard
   ===================================================================== */
const EV_LABEL: Record<EventKind, string> = {
  in: "Заїзд",
  out: "Виїзд",
  book: "Бронь",
  cancel: "Скасування",
  violation: "Порушення",
  fine: "Штраф",
  pay: "Оплата",
  system: "Система",
};
const FINE_STATUS: Record<Fine["status"], string> = {
  unpaid: "Не сплачено",
  paid: "Сплачено",
  review: "На розгляді",
};

export function Dashboard({ go }: { go: Go }) {
  const park = usePark();
  const now = useNow(15000);
  const m = metrics(park);
  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");
  const [status, setStatus] = useState<"all" | Fine["status"]>("all");
  const [showAll, setShowAll] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const filtered = park.fines.filter(
    (f) =>
      norm(f.plate).includes(norm(search)) &&
      (!date || f.date === date) &&
      (status === "all" || f.status === status),
  );
  const visible = showAll ? filtered : filtered.slice(0, 6);
  const v = park.violations[0];
  const nowH = new Date(now).getHours();
  const rev = park.revenue.slice(0, nowH + 1);
  const maxRev = Math.max(...rev, 1);
  const pts = rev.map((x, i) => `${(i / Math.max(1, nowH)) * 300},${52 - (x / maxRev) * 46}`);
  const line = pts.length > 1 ? `M${pts.join(" L")}` : "";
  const maxBucket = Math.max(...m.buckets, 1);
  const activeBookings = park.bookings.filter((b) => b.status === "active");
  const showOnMap = (floor: FloorId, spotIdx?: number) => {
    setIntent({ kind: "floor", floor, spotIdx });
    go("map");
  };

  return (
    <main className="dashboard-page">
      <div className="dashboard-head">
        <div>
          <div className="eyebrow">
            <span>B2B CONTROL</span> River Mall
          </div>
          <h1>Операційний центр</h1>
          <p>
            Огляд паркінгу в реальному часі ·{" "}
            {new Date(now).toLocaleDateString("uk-UA", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}{" "}
            · {hhmm(now)}
          </p>
        </div>
        <div className="md-actions">
          <button className={`md-btn ${park.sim ? "on" : ""}`} onClick={() => setSim(!park.sim)}>
            <Ic d={park.sim ? D.pause : D.play} />
            {park.sim ? "LIVE" : "Пауза"}
          </button>
          <button
            className="report-button"
            onClick={() => downloadFile(`parkflow-report-${park.day}.csv`, reportCsv(park))}
          >
            <Ic d={D.download} />
            Завантажити звіт
          </button>
          {confirmReset ? (
            <span className="md-confirm">
              Скинути всі демо-дані?
              <button
                className="md-btn danger"
                onClick={() => {
                  resetDemo();
                  setConfirmReset(false);
                }}
              >
                Так
              </button>
              <button className="md-btn" onClick={() => setConfirmReset(false)}>
                Ні
              </button>
            </span>
          ) : (
            <button
              className="md-btn"
              onClick={() => setConfirmReset(true)}
              title="Скинути демо-дані"
            >
              <Ic d={D.reset} />
            </button>
          )}
        </div>
      </div>

      {v ? (
        <div className="alert-banner md-alert" key={v.id}>
          <span>
            <Ic d={D.bell} size={20} />
          </span>
          <div>
            <b>
              Violation Alert
              {park.violations.length > 1 ? ` · ще ${park.violations.length - 1}` : ""}
            </b>
            <p>
              {v.type}: <b className="plate">{v.plate}</b> · Поверх {v.floor}, місце{" "}
              {SPOTS[v.spotIdx].id} · {hhmm(v.at)}
            </p>
          </div>
          <div className="md-alert-act">
            <button className="md-btn danger" onClick={() => issueFine(v.id)}>
              Виписати штраф {money(v.amount)}
            </button>
            <button className="md-btn" onClick={() => showOnMap(v.floor, v.spotIdx)}>
              <Ic d={D.pin} /> На карті
            </button>
            <button className="md-x" onClick={() => dismissViolation(v.id)} aria-label="Відхилити">
              <Ic d={D.close} />
            </button>
          </div>
        </div>
      ) : (
        <div className="md-ok">
          <Ic d={D.check} /> Активних порушень немає. Камери контролюють {m.occupied} авто.
          <button className="md-btn" onClick={addViolation}>
            Тест: згенерувати порушення
          </button>
        </div>
      )}

      <section className="kpi-grid">
        <div className="kpi-card">
          <small>ЗАГАЛЬНА ЗАПОВНЕНІСТЬ</small>
          <b>
            {m.load}
            <span>%</span>
          </b>
          <div className="progress">
            <i
              style={{
                width: `${m.load}%`,
                background: m.load > 90 ? "#ef4444" : m.load > 75 ? "#f59e0b" : "#3b82f6",
              }}
            />
          </div>
          <p>
            <em>{m.free}</em> вільно · {m.occupied} зайнято · {m.reserved} бронь із {m.total}
          </p>
        </div>
        <div className="kpi-card">
          <small>СЕРЕДНІЙ ЧАС СТОЯНКИ</small>
          <b className="md-kpi-sm">{fmtStay(m.avgStay)}</b>
          <div className="md-buckets">
            {["<30хв", "30–60", "1–2 год", "2–3 год", "3+ год"].map((l, i) => (
              <div key={l} title={`${m.buckets[i]} авто`}>
                <i style={{ height: `${(m.buckets[i] / maxBucket) * 100}%` }} />
                <span>{l}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="kpi-card">
          <small>ПРИБУТОК СЬОГОДНІ</small>
          <b className="md-kpi-sm">{money(m.revenueToday)}</b>
          <svg viewBox="0 0 300 56" className="md-rev" preserveAspectRatio="none">
            {line && <path d={`${line} L300,56 L0,56Z`} className="area" />}
            {line && <path d={line} className="ln" />}
          </svg>
          <p>
            <em>{park.sessions}</em> сесій · {m.activeBookings} активних броней · борг штрафів{" "}
            {money(m.unpaid)}
          </p>
        </div>
      </section>

      <section className="occupancy-panel">
        <div className="panel-head">
          <div>
            <h2>Заповненість за поверхами</h2>
            <p>{m.total} місць · натисніть поверх, щоб відкрити його в навігаторі</p>
          </div>
          <span className="live-pill">
            <i /> {park.sim ? "LIVE" : "ПАУЗА"}
          </span>
        </div>
        <div className="floor-stat-wrap">
          {m.per.map((p) => (
            <button
              className="floor-stat md-floor"
              key={p.floor}
              onClick={() => showOnMap(p.floor)}
            >
              <div>
                <b>{p.floor}</b>
                <span>
                  {p.free === 0 ? "FULL" : `${p.free} вільно`} · {p.reserved} бронь
                </span>
              </div>
              <div className="stat-bar">
                <i
                  style={{
                    width: `${p.load}%`,
                    background: p.load >= 100 ? "#ef4444" : p.load > 80 ? "#f59e0b" : "#22c55e",
                  }}
                />
              </div>
              <strong>{p.load}%</strong>
            </button>
          ))}
        </div>
      </section>

      <div className="md-two">
        <section className="fines-panel md-events">
          <div className="panel-head">
            <div>
              <h2>Стрічка подій</h2>
              <p>Датчики, бронювання, порушення</p>
            </div>
          </div>
          <ul>
            {park.events.slice(0, 8).map((e) => (
              <li key={e.id}>
                <i className={e.kind} />
                <span className="t">{hhmm(e.at)}</span>
                <span className="k">{EV_LABEL[e.kind]}</span>
                <span className="x">{e.text}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="fines-panel md-bookings">
          <div className="panel-head">
            <div>
              <h2>Активні бронювання · {activeBookings.length}</h2>
              <p>Онлайн-броні з сайту ТЦ</p>
            </div>
            <button className="text-button" onClick={() => go("booking")}>
              Нове <Ic d={D.arrow} size={16} />
            </button>
          </div>
          <ul>
            {activeBookings.slice(0, 6).map((b) => (
              <li key={b.code}>
                <div>
                  <b className="plate">{b.plate}</b>
                  <small>
                    {b.code} · {b.floor} {SPOTS[b.spotIdx].id} · {b.start}, {b.hours} год
                  </small>
                </div>
                <button className="md-btn sm" onClick={() => cancelBooking(b.code)}>
                  Скасувати
                </button>
              </li>
            ))}
            {!activeBookings.length && <li className="empty">Активних бронювань немає</li>}
          </ul>
        </section>
      </div>

      <section className="fines-panel">
        <div className="panel-head">
          <div>
            <h2>Виписані штрафи</h2>
            <p>
              {park.fines.length} штрафів · не сплачено {money(m.unpaid)}
            </p>
          </div>
          {filtered.length > 6 && (
            <button className="text-button" onClick={() => setShowAll(!showAll)}>
              {showAll ? "Згорнути" : `Переглянути всі (${filtered.length})`}{" "}
              <Ic d={D.arrow} size={16} />
            </button>
          )}
        </div>
        <div className="table-filters">
          <label>
            <Ic d={D.search} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Пошук за номером авто"
            />
          </label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            className="md-select"
          >
            <option value="all">Усі статуси</option>
            <option value="unpaid">Не сплачено</option>
            <option value="review">На розгляді</option>
            <option value="paid">Сплачено</option>
          </select>
          {(search || date || status !== "all") && (
            <button
              className="md-btn sm"
              onClick={() => {
                setSearch("");
                setDate("");
                setStatus("all");
              }}
            >
              Скинути
            </button>
          )}
          <span>{filtered.length} записів</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>НОМЕР АВТО</th>
                <th>ДАТА І ЧАС</th>
                <th>ЛОКАЦІЯ</th>
                <th>ПОРУШЕННЯ</th>
                <th>СУМА</th>
                <th>СТАТУС</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visible.map((f) => (
                <tr key={f.id}>
                  <td>
                    <b className="plate">{f.plate}</b>
                    <small>{f.id}</small>
                  </td>
                  <td>
                    {fmtDate(f.date)}
                    <small>{f.time}</small>
                  </td>
                  <td>
                    {f.floor} · {f.spotId}
                  </td>
                  <td>{f.type}</td>
                  <td>
                    <b>{money(f.amount)}</b>
                  </td>
                  <td>
                    <span
                      className={`fine-status ${f.status === "paid" ? "paid" : f.status === "review" ? "pending" : "unpaid"}`}
                    >
                      {FINE_STATUS[f.status]}
                    </span>
                  </td>
                  <td className="md-row-act">
                    {f.status !== "paid" && (
                      <button className="md-btn sm" onClick={() => setFineStatus(f.id, "paid")}>
                        Сплачено
                      </button>
                    )}
                    {f.status === "unpaid" && (
                      <button className="md-btn sm" onClick={() => setFineStatus(f.id, "review")}>
                        Оскаржено
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!visible.length && (
                <tr>
                  <td colSpan={7} className="md-empty">
                    Нічого не знайдено за цими фільтрами
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
