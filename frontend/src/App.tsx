import { useState } from "react";
import Home from "./Home";
import Navigator from "./Navigator";
import { Dashboard, LedBoard } from "./Modules";
import { useServerStatus } from "./parking";

type View = "home" | "map" | "led" | "dashboard";

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    map: (
      <>
        <path d="m3 6 5-3 8 3 5-3v15l-5 3-8-3-5 3Z" />
        <path d="M8 3v15M16 6v15" />
      </>
    ),
    led: (
      <>
        <rect x="3" y="5" width="18" height="12" rx="2" />
        <path d="M7 9h10M7 13h6M8 17v3M16 17v3" />
      </>
    ),
    chart: (
      <>
        <path d="M4 19V9M10 19V5M16 19v-7M22 19H2" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    pin: (
      <>
        <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    car: (
      <>
        <path d="m5 17-1 2v2h3v-2h10v2h3v-2l-1-2-2-7H7Z" />
        <path d="M7 14h.01M17 14h.01M6 10h12" />
      </>
    ),
    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h14M13 6l6 6-6 6" />
      </>
    ),
    close: (
      <>
        <path d="m6 6 12 12M18 6 6 18" />
      </>
    ),
    chevron: <path d="m9 18 6-6-6-6" />,
    building: (
      <>
        <path d="M4 21V3h12v18M16 9h4v12M8 7h4M8 11h4M8 15h4M2 21h20" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {paths[name]}
    </svg>
  );
}

function AppHeader({ view, setView }: { view: View; setView: (v: View) => void }) {
  const items: { id: View; label: string; icon: string }[] = [
    { id: "home", label: "Головна", icon: "building" },
    { id: "map", label: "Карта", icon: "map" },
    { id: "led", label: "LED-табло", icon: "led" },
    { id: "dashboard", label: "B2B-аналітика", icon: "chart" },
  ];
  return (
    <header className="app-header">
      <button className="brand" onClick={() => setView("home")}>
        <span className="brand-mark">
          P<span>+</span>
        </span>
        <span>
          <b>ParkFlow</b>
          <small>PARKING GUIDANCE</small>
        </span>
      </button>
      <nav>
        {items.map((item) => (
          <button
            key={item.id}
            className={view === item.id ? "active" : ""}
            onClick={() => setView(item.id)}
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="header-status">
        <i />
        24/7 Security active
      </div>
    </header>
  );
}

export default function App() {
  const server = useServerStatus();
  const searchParams = new URLSearchParams(window.location.search);
  const isStandalone =
    searchParams.get("standalone") === "true" ||
    searchParams.get("mode") === "zeroapp" ||
    searchParams.get("zeroapp") === "true";
  const initial = searchParams.get("view") as View;
  const [view, setView] = useState<View>(
    isStandalone ? "map" : ["home", "map", "led", "dashboard"].includes(initial) ? initial : "home",
  );
  const changeView = (v: View) => {
    if (isStandalone) return;
    setView(v);
    window.history.replaceState({}, "", v === "home" ? window.location.pathname : `?view=${v}`);
    window.scrollTo({ top: 0 });
  };
  return (
    <div className={`app view-${isStandalone ? "map" : view} ${isStandalone ? "standalone-mode" : ""}`}>
      {(server.loading || server.error) && (
        <div role={server.error ? "alert" : "status"} style={{ padding: "8px 16px", background: server.error ? "#fee2e2" : "#eff6ff", color: server.error ? "#991b1b" : "#1e3a8a" }}>
          {server.loading
            ? "Завантаження актуальних даних з сервера..."
            : `Помилка сервера: ${server.error}. Дані паркінгу та керування станом недоступні.`}
        </div>
      )}
      {!isStandalone && <AppHeader view={view} setView={changeView} />}
      {isStandalone ? (
        <Navigator />
      ) : view === "home" ? (
        <Home go={changeView} />
      ) : view === "map" ? (
        <Navigator />
      ) : view === "led" ? (
        <LedBoard go={changeView} />
      ) : (
        <Dashboard go={changeView} />
      )}
    </div>
  );
}
