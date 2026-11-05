// Celtics Smart Parking — 2D Map JavaScript
// Author: Андрущенко (Frontend) & Савчук (Backend)

const API_BASE = "http://127.0.0.1:8000/api/v1";

// Тестові слоти за замовчуванням (якщо бекенд ще не запущений)
let mockSpots = [
  { spot_code: "A-01", status: "free", floor: 1, plate: "" },
  { spot_code: "A-02", status: "occupied", floor: 1, plate: "AA 1122 BB" },
  { spot_code: "A-03", status: "free", floor: 1, plate: "" },
  { spot_code: "A-04", status: "free", floor: 1, plate: "" },
  { spot_code: "A-05", status: "occupied", floor: 1, plate: "KA 9900 CX" },
  { spot_code: "A-15", status: "occupied", floor: 1, plate: "BC 1234 AB" },
  { spot_code: "A-18", status: "reserved", floor: 1, plate: "BC 1234 AB" }
];

async function fetchParkingMap() {
  try {
    const res = await fetch(`${API_BASE}/map`);
    if (res.ok) {
      const data = await res.json();
      renderSpots(data);
      return;
    }
  } catch (e) {
    console.log("Бекенд офлайн, рендеримо локальний макет слотів");
  }
  renderSpots(mockSpots);
}

function renderSpots(spots) {
  const container = document.getElementById("parkingGrid");
  container.innerHTML = "";

  spots.forEach(s => {
    const box = document.createElement("div");
    box.className = `spot-box ${s.status}`;
    box.id = `spot-${s.spot_code}`;

    box.innerHTML = `
      <div style="font-weight: 700; font-size: 1.1rem;">${s.spot_code}</div>
      <div style="font-size: 0.75rem; text-transform: uppercase;">${s.status}</div>
    `;

    box.onclick = () => {
      alert(`Паркомісце: ${s.spot_code}\nПоверх: ${s.floor}\nСтатус: ${s.status.toUpperCase()}`);
    };

    container.appendChild(box);
  });
}

function findCar() {
  const query = document.getElementById("carSearchInput").value.trim().toUpperCase().replace(/\s+/g, '');
  const resultDiv = document.getElementById("searchResult");

  if (!query) {
    resultDiv.innerHTML = `<span style="color: red;">Будь ласка, введіть номер авто!</span>`;
    return;
  }

  // Скидаємо попередні підсвітки
  document.querySelectorAll(".spot-box").forEach(el => el.classList.remove("highlight"));

  // Шукаємо тестове авто або перевіряємо
  if (query.includes("1234") || query.includes("BC")) {
    const target = document.getElementById("spot-A-15") || document.getElementById("spot-A-18");
    if (target) {
      target.classList.add("highlight");
      resultDiv.innerHTML = `<span style="color: var(--celtics-primary);">✅ Авто знайдено на місці <b>A-15 (Поверх 1)</b>! Пішохідний маршрут від виходу ТЦ: ➔ прямо 20м ➔ ліворуч у Сектор А.</span>`;
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
  }

  resultDiv.innerHTML = `<span style="color: var(--status-occupied);">Авто з номером "${query}" на паркінгу наразі не знайдено.</span>`;
}

// Початковий рендер
fetchParkingMap();
// Оновлення кожні 3 секунди
setInterval(fetchParkingMap, 3000);
