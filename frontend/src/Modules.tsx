import { useState } from "react";
import { sendSensorEvent, type ParkingMap, type ParkingSpot } from "./api";
import { floorLabel } from "./parking";

export function SummaryCards({ summary }: { summary: ParkingMap["summary"] }) {
  const metrics = [
    { label: "Available", value: summary.free_spots, type: "available" },
    { label: "Occupied", value: summary.occupied_spots, type: "occupied" },
    { label: "Total capacity", value: summary.total_spots, type: "total" },
  ];

  return (
    <dl className="summary-cards">
      {metrics.map(({ label, value, type }) => (
        <div className={"metric metric--" + type} key={type}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function LedBoard({ data }: { data: ParkingMap }) {
  return (
    <>
      <div className="page-title">
        <h1>Entrance display</h1>
        <p>Free space counts by level.</p>
      </div>
      {data.floors.length ? (
        <section className="board" aria-label="Entrance availability">
          <div className="board-header">
            <span>Parking level</span>
            <span>Spaces available</span>
          </div>
          <ul>
            {data.floors.map((floor) => (
              <li key={floor.floor}>
                <span>{floorLabel(floor.floor)}</span>
                <strong data-full={floor.is_full}>{floor.is_full ? "FULL" : floor.free_spots}</strong>
              </li>
            ))}
          </ul>
        </section>
      ) : <p className="empty">No parking levels are configured yet.</p>}
    </>
  );
}

function exportOccupancy(data: ParkingMap) {
  const rows = data.floors.map((floor) => [floor.floor, floor.total_spots, floor.free_spots, floor.occupied_spots].join(","));
  const csv = ["Floor,Total,Available,Occupied", ...rows].join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "parking-occupancy.csv";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function SensorDemo({ data, online, refresh }: { data: ParkingMap; online: boolean; refresh: () => Promise<void> }) {
  const [selectedFloor, setSelectedFloor] = useState<number>();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const floor = data.floors.find(({ floor }) => floor === selectedFloor) ?? data.floors[0];
  const spots = data.spots.filter((spot) => spot.floor === floor?.floor);
  const available = spots.find((spot) => spot.status === "free");
  const occupied = spots.find((spot) => spot.status === "occupied");

  async function simulate(spot: ParkingSpot, isOccupied: boolean) {
    setPending(true);
    setMessage("");
    try {
      await sendSensorEvent(spot, isOccupied);
      await refresh();
      setMessage(spot.spot_code + (isOccupied ? " is now occupied." : " is now available."));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The sensor update failed.");
    } finally {
      setPending(false);
    }
  }

  if (!floor) return null;

  return (
    <details className="panel demo">
      <summary>Simulate a sensor update</summary>
      <p>Use this on a test database. An arrival or departure changes a space’s status.</p>
      <div className="demo-controls">
        <label>
          Parking level
          <select value={floor.floor} onChange={(event) => setSelectedFloor(Number(event.target.value))}>
            {data.floors.map(({ floor }) => <option key={floor} value={floor}>{floorLabel(floor)}</option>)}
          </select>
        </label>
        <button className="button" disabled={!online || pending || !available} onClick={() => available && simulate(available, true)}>
          Simulate arrival
        </button>
        <button className="button" disabled={!online || pending || !occupied} onClick={() => occupied && simulate(occupied, false)}>
          Simulate departure
        </button>
      </div>
      {message && <p role="status">{message}</p>}
    </details>
  );
}

export function Dashboard({ data, online, refresh }: { data: ParkingMap; online: boolean; refresh: () => Promise<void> }) {
  return (
    <>
      <div className="page-title">
        <h1>Occupancy dashboard</h1>
        <p>Compare parking availability across levels.</p>
      </div>
      <SummaryCards summary={data.summary} />
      <section className="panel">
        <div className="panel-header">
          <h2>Occupancy by level</h2>
          <button className="button" onClick={() => exportOccupancy(data)}>Export CSV</button>
        </div>
        {data.floors.length ? (
          <div className="table-scroll">
            <table className="occupancy-table">
              <thead>
                <tr><th scope="col">Level</th><th scope="col">Available</th><th scope="col">Occupied</th><th scope="col">Capacity</th><th scope="col">Occupancy</th></tr>
              </thead>
              <tbody>
                {data.floors.map((floor) => {
                  const percent = Math.round(100 * floor.occupied_spots / floor.total_spots);
                  return (
                    <tr key={floor.floor}>
                      <th scope="row">{floorLabel(floor.floor)}</th>
                      <td>{floor.free_spots}</td>
                      <td>{floor.occupied_spots}</td>
                      <td>{floor.total_spots}</td>
                      <td>
                        <div className="occupancy-meter">
                          <progress value={floor.occupied_spots} max={floor.total_spots} aria-label={floorLabel(floor.floor) + " occupancy"} />
                          <span>{percent}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <p className="empty">No parking levels are configured yet.</p>}
      </section>
      <SensorDemo data={data} online={online} refresh={refresh} />
    </>
  );
}
