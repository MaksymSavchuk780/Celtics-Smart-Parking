import { useState } from "react";
import type { ParkingMap, ParkingSpot } from "./api";
import { SummaryCards } from "./Modules";
import { floorLabel } from "./parking";

const SPACE_WIDTH = 34;
const SPACE_HEIGHT = 31;

function FloorPlan({ spots }: { spots: ParkingSpot[] }) {
  if (spots.length === 0) return <p className="empty">No spaces are configured on this level.</p>;

  const xs = spots.map(({ coordinates }) => coordinates.x);
  const ys = spots.map(({ coordinates }) => coordinates.y * 0.55);
  const left = Math.min(...xs) - 48;
  const right = Math.max(...xs) + SPACE_WIDTH + 23;
  const top = Math.min(...ys) - 43;
  const bottom = Math.max(...ys) + 43;
  const sectorLabels = new Map(spots.map(({ sector, coordinates }) => [sector, coordinates.y * 0.55]));
  const rows = [...new Set(ys)].sort((a, b) => a - b);

  return (
    <div className="map-scroll" tabIndex={0} role="region" aria-label="Floor plan">
      <svg viewBox={[left, top, right - left, bottom - top].join(" ")} role="img" aria-label="Parking spaces by sector">
        {rows.slice(1).map((y, i) => {
          const previous = rows[i];
          if (y - previous < 60) return null;
          return <path key={y} className="aisle" d={"M " + (left + 24) + " " + (y + previous) / 2 + " H " + (right - 24)} />;
        })}
        {[...sectorLabels].map(([label, y]) => (
          <text key={label} className="sector-label" x={left + 20} y={y + 4}>{label}</text>
        ))}
        {spots.map(({ id, spot_code, coordinates, status }) => (
          <g key={id} className={"space space--" + status} transform={"translate(" + coordinates.x + ", " + coordinates.y * 0.55 + ")"}>
            <title>{spot_code + " · " + (status === "free" ? "Available" : "Occupied")}</title>
            <rect width={SPACE_WIDTH} height={SPACE_HEIGHT} x={0} y={-SPACE_HEIGHT / 2} rx={5} />
            <text x={SPACE_WIDTH / 2} y={4}>{spot_code}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export default function FloorMap({ data }: { data: ParkingMap }) {
  const [selectedFloor, setSelectedFloor] = useState<number>();
  const floor = data.floors.find(({ floor }) => floor === selectedFloor) ??
    data.floors.find(({ floor }) => floor === 1) ?? data.floors[0];
  const spots = data.spots.filter((spot) => spot.floor === floor?.floor);
  const sectors = new Map<string, { total: number; free: number }>();

  for (const spot of spots) {
    const counts = sectors.get(spot.sector) ?? { total: 0, free: 0 };
    counts.total += 1;
    counts.free += Number(spot.status === "free");
    sectors.set(spot.sector, counts);
  }

  return (
    <>
      <div className="page-title">
        <h1>Parking availability</h1>
        <p>Choose a level to see which spaces are free.</p>
      </div>
      <SummaryCards summary={data.summary} />
      {floor ? (
        <div className="floor-layout">
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Floor plan</h2>
                <p>{floor.free_spots} of {floor.total_spots} spaces available</p>
              </div>
              <div className="level-picker" role="group" aria-label="Parking level">
                {data.floors.map((level) => (
                  <button
                    key={level.floor}
                    aria-pressed={level.floor === floor.floor}
                    onClick={() => setSelectedFloor(level.floor)}
                  >
                    {floorLabel(level.floor)}
                  </button>
                ))}
              </div>
            </div>
            <FloorPlan spots={spots} />
            <ul className="legend" aria-label="Map legend">
              <li><span className="available" />Available</li>
              <li><span className="occupied" />Occupied</li>
            </ul>
          </section>
          <aside className="panel sector-panel" aria-labelledby="sectors-heading">
            <h2 id="sectors-heading">Available by sector</h2>
            <p>{floorLabel(floor.floor)}</p>
            <ul className="sector-list">
              {[...sectors].map(([sector, counts]) => (
                <li key={sector}>
                  <span>Sector {sector}</span>
                  <span className="sector-count"><strong>{counts.free}</strong> / {counts.total}</span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      ) : <p className="empty">No parking spaces are configured yet.</p>}
    </>
  );
}
