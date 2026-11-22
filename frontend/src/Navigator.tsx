import { useEffect, useId, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { AISLES_Y, FLOORS, SPOTS, consumeIntent, countOf, usePark, type FloorId, type Status } from "./parking";
import "./navigator.css";

const portraitQuery = "(max-width: 600px) and (min-height: 650px) and (orientation: portrait)";
const landscapeQuery = "(max-height: 500px) and (orientation: landscape)";

function getLayout() {
  if (window.matchMedia(portraitQuery).matches) return "portrait";
  if (window.matchMedia(landscapeQuery).matches) return "short";
  return "standard";
}

function watchLayout(change: () => void) {
  const queries = [portraitQuery, landscapeQuery].map((query) => window.matchMedia(query));
  queries.forEach((query) => query.addEventListener("change", change));
  return () => queries.forEach((query) => query.removeEventListener("change", change));
}

const statusLabel: Record<Status, string> = {
  free: "Вільне",
  occupied: "Зайняте",
  unavailable: "Немає даних",
};

export default function Navigator() {
  const { statuses } = usePark();
  const [floor, setFloor] = useState<FloorId>("P1");
  const [selected, setSelected] = useState<number | null>(null);
  const layout = useSyncExternalStore(watchLayout, getLayout);
  const portrait = layout === "portrait";
  const hatchId = useId();
  const spots = statuses[floor];
  const visible = SPOTS.map((spot, index) => ({ spot, index, status: spots[index] }))
    .filter(({ status }) => status !== "unavailable");
  const selectedSpot = visible.find(({ index }) => index === selected);
  const focusIndex = selectedSpot?.index ?? visible[0]?.index;

  useEffect(() => {
    const intent = consumeIntent();
    if (intent) setFloor(intent.floor);
  }, []);

  function chooseFloor(level: FloorId) {
    setFloor(level);
    setSelected(null);
  }

  function handleSpotKey(event: KeyboardEvent<SVGGElement>, index: number) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setSelected(index);
      return;
    }

    const previous = event.key === "ArrowLeft" || event.key === "ArrowUp";
    const next = event.key === "ArrowRight" || event.key === "ArrowDown";
    if (!previous && !next) return;

    event.preventDefault();
    const position = visible.findIndex((spot) => spot.index === index);
    const neighbor = visible[position + (previous ? -1 : 1)];
    if (!neighbor) return;
    setSelected(neighbor.index);
    event.currentTarget.parentElement
      ?.querySelector<SVGGElement>('[data-spot="' + neighbor.index + '"]')
      ?.focus();
  }

  // Fit the same floor plan to narrow or short screens while keeping labels upright.
  const planTransform = portrait ? "matrix(0 1 -.65 0 515 0)" : layout === "short" ? "scale(1 .62)" : undefined;
  const labelAdjustment = portrait ? " matrix(0 -1.53846 1 0 0 0)" : layout === "short" ? " scale(1 1.6129)" : "";
  const labelTransform = (x: number, y: number) =>
    "translate(" + x + " " + y + ")" + labelAdjustment;

  return (
    <main className="nv">
      <div className="nv-toolbar">
        <h1>Карта паркінгу</h1>
        <div className="nv-floors" role="group" aria-label="Поверх паркінгу">
          {FLOORS.map((level) => (
            <button key={level} type="button" aria-pressed={floor === level} onClick={() => chooseFloor(level)}>
              {level}
            </button>
          ))}
        </div>
      </div>

      <div className="nv-stage">
        <svg
          className={"nv-svg" + (portrait ? " nv-portrait" : "")}
          viewBox={portrait ? "6 116 494 788" : layout === "short" ? "116 16 788 473" : "116 27 788 760"}
          preserveAspectRatio="xMidYMid meet"
          role="group"
          aria-label={"План поверху " + floor}
        >
          <defs>
            <pattern id={hatchId} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="10" height="10" fill="#eef0f2" />
              <line x1="0" y1="0" x2="0" y2="10" stroke="#dfe3e7" strokeWidth="4" />
            </pattern>
          </defs>
          <g transform={planTransform}>
            <rect x={130} y={40} width={760} height={660} rx={8} fill="#f8f9fa" stroke="#c3c9d0" strokeWidth={6} />
            {AISLES_Y.map((y) => (
              <rect key={y} x={144} y={y - 30} width={730} height={60} fill="#fff" />
            ))}
            {[144, 850].map((x) => (
              <g key={x}>
                <rect x={x} y={145} width={24} height={555} fill="#fff" />
                <rect x={x} y={700} width={24} height={60} fill={"url(#" + hatchId + ")"} />
                <line x1={x + 12} x2={x + 12} y1={175} y2={726} className="nv-dash" />
              </g>
            ))}
            {AISLES_Y.map((y) => (
              <line key={y} x1={156} x2={862} y1={y} y2={y} className="nv-dash" />
            ))}
            {[170, 330, 490, 650, 810].flatMap((x) =>
              [275, 475].map((y) => (
                <rect key={x + "-" + y} x={x - 5} y={y - 5} width={10} height={10} className="nv-pillar" />
              )),
            )}

            {visible.map(({ spot, index, status }) => {
              const aboveAisle = AISLES_Y[spot.aisle] > spot.cy;
              const label = spot.id + " · " + statusLabel[status] + (spot.ev ? " · EV" : "");

              return (
                <g
                  key={spot.id}
                  data-spot={index}
                  className={"nv-spot " + status}
                  role="button"
                  tabIndex={focusIndex === index ? 0 : -1}
                  aria-label={label}
                  aria-pressed={selected === index}
                  onClick={() => setSelected(index)}
                  onKeyDown={(event) => handleSpotKey(event, index)}
                >
                  <title>{label}</title>
                  <rect className="nv-space" x={spot.x} y={spot.y} width={38} height={70} rx={3} />
                  {status === "occupied" && !portrait && (
                    <g className="nv-car">
                      <rect x={spot.cx - 12} y={spot.y + 10} width={24} height={47} rx={8} />
                      <rect x={spot.cx - 9} y={spot.y + (aboveAisle ? 18 : 36)} width={18} height={12} rx={3} className="glass" />
                    </g>
                  )}
                  {spot.ev && (
                    <circle cx={portrait ? spot.cx - 11 : spot.cx} cy={aboveAisle ? spot.y + 16 : spot.y + 54} r={portrait ? 5 : 7} className="nv-ev" />
                  )}
                  <text
                    transform={labelTransform(spot.cx, portrait ? spot.cy : aboveAisle ? spot.y + 63 : spot.y + 8)}
                    className="nv-id"
                  >
                    {spot.id}
                  </text>
                </g>
              );
            })}

            <rect x={454} y={205} width={72} height={140} rx={6} className="nv-core" />
            <g transform={labelTransform(490, 275)}>
              <text y={-8} className="nv-core-t">ЛІФТИ</text>
              <text y={9} className="nv-core-s">вихід у ТЦ</text>
            </g>
            <text transform={labelTransform(156, 750)} className="nv-gate">В’ЇЗД</text>
            <text transform={labelTransform(862, 750)} className="nv-gate">ВИЇЗД</text>
          </g>
        </svg>
      </div>

      <div className="nv-summary">
        <ul className="nv-legend" aria-label="Позначення та кількість місць">
          <li><i className="free" /><strong>{countOf(spots, "free")}</strong> вільно</li>
          <li><i className="occupied" /><strong>{countOf(spots, "occupied")}</strong> зайнято</li>
          <li><i className="ev" /> EV</li>
        </ul>
        <p className="nv-selection" aria-live="polite">
          {selectedSpot
            ? "Місце " + selectedSpot.spot.id + " · " + statusLabel[selectedSpot.status] + (selectedSpot.spot.ev ? " · EV" : "")
            : visible.length ? "Поверх " + floor : "Немає даних про місця"}
        </p>
      </div>
    </main>
  );
}
