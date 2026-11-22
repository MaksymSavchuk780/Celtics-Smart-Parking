import FloorMap from "./FloorMap";
import { Dashboard, LedBoard } from "./Modules";
import { useParkingMap } from "./parking";

const views = [
  { id: "map", label: "Parking map" },
  { id: "led", label: "Entrance display" },
  { id: "dashboard", label: "Dashboard" },
] as const;

export default function App() {
  const requestedView = new URLSearchParams(window.location.search).get("view");
  const view = views.find((item) => item.id === requestedView) ?? views[0];
  const { data, error, refresh } = useParkingMap();

  return (
    <>
      <header className="app-header">
        <div className="header-inner">
          <a className="brand" href="?view=map">
            <span className="brand-mark" aria-hidden="true">P</span>
            <span>ParkFlow<small>Celtics Smart Parking</small></span>
          </a>
          <nav aria-label="Main navigation">
            {views.map((item) => (
              <a key={item.id} href={"?view=" + item.id} aria-current={view === item ? "page" : undefined}>
                {item.label}
              </a>
            ))}
          </nav>
          <div className="connection" data-state={error ? "offline" : data ? "live" : "loading"}>
            <span aria-hidden="true" />
            {error ? "Offline" : data ? "Live data" : "Connecting"}
          </div>
        </div>
      </header>

      <main className="page">
        {error && (
          <div className="notice" role="alert">
            <span>{data ? "Connection lost. Showing the last available data." : "Parking data unavailable. " + error}</span>
            <button className="button" onClick={refresh}>Retry</button>
          </div>
        )}
        {!data && !error && <p className="loading" role="status">Loading parking data…</p>}
        {data && (
          view.id === "led" ? <LedBoard data={data} /> :
          view.id === "dashboard" ? <Dashboard data={data} online={!error} refresh={refresh} /> :
          <FloorMap data={data} />
        )}
      </main>
    </>
  );
}
