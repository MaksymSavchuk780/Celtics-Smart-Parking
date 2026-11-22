import { useEffect, useState } from "react";
import "./modules.css";
import {
  FLOORS_ASC,
  SPOTS,
  arrive,
  bestSector,
  countOf,
  departRandom,
  downloadFile,
  fillAll,
  fmtStay,
  hhmm,
  metrics,
  money,
  reportCsv,
  resetDemo,
  restoreFloors,
  setIntent,
  setSim,
  usePark,
  type EventKind,
  type FloorId,
} from "./parking";

export type Go = (v: "home" | "map" | "led" | "dashboard") => void;

const D = {
  download: "M12 4v11M7 10l5 5 5-5M5 20h14",
  play: "M7 5v14l11-7Z",
  pause: "M8 5v14M16 5v14",
  reset: "M4 12a8 8 0 1 0 2.3-5.7M4 4v4h4",
  map: "m3 6 5-3 8 3 5-3v15l-5 3-8-3-5 3ZM8 3v15M16 6v15",
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
            Дані з {SPOTS.length * 3} датчиків місць · ті самі, що на карті. Оновлено о{" "}
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
          <b>Керування потоком (API/JSON → спільні дані)</b>
          <small>
            «Заїзд» займає вільне місце, «Виїзд» звільняє. Зміни одразу видно на карті
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
          Карта паркінгу
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
   B2B dashboard
   ===================================================================== */
const EV_LABEL: Record<EventKind, string> = {
  in: "Заїзд",
  out: "Виїзд",
  system: "Система",
};

export function Dashboard({ go }: { go: Go }) {
  const park = usePark();
  const now = useNow(15000);
  const m = metrics(park);
  const [confirmReset, setConfirmReset] = useState(false);

  const nowH = new Date(now).getHours();
  const rev = park.revenue.slice(0, nowH + 1);
  const maxRev = Math.max(...rev, 1);
  const pts = rev.map((x, i) => `${(i / Math.max(1, nowH)) * 300},${52 - (x / maxRev) * 46}`);
  const line = pts.length > 1 ? `M${pts.join(" L")}` : "";
  const maxBucket = Math.max(...m.buckets, 1);
  const showOnMap = (floor: FloorId) => {
    setIntent({ floor });
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
              Скинути демо-статистику?
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
              title="Скинути демо-статистику"
            >
              <Ic d={D.reset} />
            </button>
          )}
        </div>
      </div>

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
            <em>{m.free}</em> вільно · {m.occupied} зайнято із {m.total}
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
          <small title="Оцінка за тривалістю стоянки">ПРИБУТОК СЬОГОДНІ</small>
          <b className="md-kpi-sm">{money(m.revenueToday)}</b>
          <svg viewBox="0 0 300 56" className="md-rev" preserveAspectRatio="none">
            {line && <path d={`${line} L300,56 L0,56Z`} className="area" />}
            {line && <path d={line} className="ln" />}
          </svg>
          <p>
            <em>{park.sessions}</em> сесій
          </p>
        </div>
      </section>

      <section className="occupancy-panel">
        <div className="panel-head">
          <div>
            <h2>Заповненість за поверхами</h2>
            <p>{m.total} місць · натисніть поверх, щоб відкрити його на карті</p>
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
                  {p.free === 0 ? "FULL" : `${p.free} вільно`} · {p.occupied} зайнято
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

      <section className="event-panel md-events">
        <div className="panel-head">
          <div>
            <h2>Стрічка подій</h2>
            <p>Події датчиків і зміни заповненості</p>
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
    </main>
  );
}
