import { useState } from "react";
import "./home.css";
import { metrics, usePark } from "./parking";

type Go = (v: "map" | "led" | "booking" | "dashboard") => void;

const IMG = {
  hero: "https://images.unsplash.com/photo-1767884161753-8127126a27af?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1920",
  mall: "https://images.unsplash.com/photo-1621465558419-1deb2e51b530?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1200",
  airport:
    "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1200",
  hospital:
    "https://images.unsplash.com/photo-1769147555720-71fc71bfc216?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1200",
  office:
    "https://images.unsplash.com/photo-1776659959825-59d28b50dd65?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1200",
  garage:
    "https://images.unsplash.com/photo-1771931108157-bc9b020ac035?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1400",
};

function I({ d, size = 22 }: { d: string; size?: number }) {
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
      <path d={d} />
    </svg>
  );
}
const P = {
  arrow: "M5 12h14M13 6l6 6-6 6",
  sensor:
    "M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M5.6 5.6a9 9 0 0 0 0 12.8M18.4 5.6a9 9 0 0 1 0 12.8",
  camera: "M3 7h4l2-3h6l2 3h4v13H3ZM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
  sign: "M3 4h18v10H3ZM12 14v7M8 21h8M7 9h4l-1.5-1.5M7 9l2.5 1.5",
  phone: "M7 2h10v20H7ZM11 18h2",
  cloud: "M7 18a5 5 0 1 1 1-9.9A6 6 0 0 1 19 10a4 4 0 0 1-1 8Z",
  shield: "M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6ZM9 12l2 2 4-4",
  plus: "M12 5v14M5 12h14",
  check: "M5 12l5 5 9-10",
};

const modules = [
  {
    icon: P.sensor,
    t: "Smart-сенсори місць",
    d: "Ультразвукові та бездротові IoT-датчики з точністю 99,6% визначають стан кожного місця за 1 секунду.",
    tag: "HARDWARE",
  },
  {
    icon: P.camera,
    t: "LPR-камери",
    d: "Розпізнавання номерів на в'їзді та над місцями: безквиткові заїзди, Find My Car та контроль порушень.",
    tag: "HARDWARE",
  },
  {
    icon: P.sign,
    t: "LED-табло та вказівники",
    d: "Поверхові й зональні табло з лічильниками та стрілками ведуть водія до вільного місця без зайвих кіл.",
    tag: "WAYFINDING",
    go: "led" as const,
  },
  {
    icon: P.phone,
    t: "Zero-App навігація",
    d: "QR-код на вході відкриває 2D-карту паркінгу в браузері: вільні сектори, маршрут і пошук авто.",
    tag: "DRIVER",
    go: "map" as const,
  },
  {
    icon: P.cloud,
    t: "ParkFlow Cloud",
    d: "Єдина хмарна платформа: аналітика заповненості, прибутку, бронювань та API для інтеграцій.",
    tag: "SOFTWARE",
    go: "dashboard" as const,
  },
  {
    icon: P.shield,
    t: "Compliance & Security",
    d: "Автоматичні Violation Alerts, реєстр штрафів і відеоверифікація подій 24/7.",
    tag: "SECURITY",
    go: "dashboard" as const,
  },
];

const sectors = [
  {
    id: "retail",
    n: "ТРЦ та ритейл",
    img: IMG.mall,
    kpi: ["+18%", "відвідувачів у пікові години"],
    d: "Швидкий пошук місця підвищує лояльність покупців, а бронювання й аналітика відкривають нові джерела доходу.",
  },
  {
    id: "airport",
    n: "Аеропорти",
    img: IMG.airport,
    kpi: ["−42%", "часу на пошук місця"],
    d: "Онлайн-бронювання, LPR-в'їзд і навігація для великих багаторівневих паркінгів із тисячами місць.",
  },
  {
    id: "health",
    n: "Медицина",
    img: IMG.hospital,
    kpi: ["3 хв", "середній час паркування"],
    d: "Пацієнти та персонал без стресу: пріоритетні зони, контроль місць для МГН та швидкий виїзд.",
  },
  {
    id: "office",
    n: "Бізнес-центри",
    img: IMG.office,
    kpi: ["+27%", "ефективність використання"],
    d: "Гнучкий розподіл місць між орендарями, гостьові бронювання та прозорі звіти для керуючої компанії.",
  },
];

const faqs = [
  [
    "Чи потрібно водію встановлювати застосунок?",
    "Ні. Zero-App навігація відкривається у браузері після сканування QR-коду на в'їзді чи біля ліфтів.",
  ],
  [
    "Скільки триває впровадження?",
    "Пілот на одному поверсі — від 2 тижнів. Повний паркінг ТРЦ на 500–1500 місць — 6–10 тижнів залежно від обладнання.",
  ],
  [
    "Чи можна інтегруватися з наявними шлагбаумами та касами?",
    "Так. ParkFlow Cloud має відкритий REST API та готові конектори до популярних систем контролю доступу й оплати.",
  ],
  [
    "Як рахується окупність?",
    "Зазвичай 12–18 місяців за рахунок вищої оборотності місць, преміум-бронювань та автоматизованого контролю порушень.",
  ],
];

export default function Home({ go }: { go: Go }) {
  const park = usePark();
  const m = metrics(park);
  const free = m.free;
  const [sector, setSector] = useState(sectors[0]);
  const [faq, setFaq] = useState(0);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", company: "", spaces: "500–1500" });
  const valid = form.name.trim().length > 1 && /\S+@\S+\.\S+/.test(form.email);

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <main className="home">
      {/* HERO */}
      <section className="h-hero">
        <img src={IMG.hero} alt="Підземний паркінг з автомобілями" />
        <div className="h-hero-shade" />
        <div className="h-wrap h-hero-inner">
          <div className="h-hero-copy">
            <div className="h-kicker">
              <i /> Smart Parking Guidance System
            </div>
            <h1>
              Інтелектуальний паркінг.
              <br />
              <span>На кожному рівні.</span>
            </h1>
            <p>
              ParkFlow поєднує сенсори, LPR-камери, LED-навігацію та хмарну аналітику в одну
              систему, що веде водія до місця за секунди і збільшує дохід паркінгу.
            </p>
            <div className="h-actions">
              <button className="h-btn primary" onClick={() => scrollTo("contact")}>
                Замовити демо <I d={P.arrow} size={18} />
              </button>
              <button className="h-btn ghost" onClick={() => scrollTo("demo")}>
                Live-демо системи
              </button>
            </div>
          </div>
          <div className="h-live">
            <div className="h-live-head">
              <span>RIVER MALL · LIVE</span>
              <i />
            </div>
            <div className="h-live-num">{free}</div>
            <div className="h-live-sub">вільних місць зараз</div>
            {[...m.per].reverse().map((p) => (
              <div className="h-live-row" key={p.floor}>
                <b>{p.floor}</b>
                <div>
                  <i
                    style={{
                      width: `${p.load}%`,
                      background: p.free === 0 ? "#ef4444" : p.free < 20 ? "#f59e0b" : "#22c55e",
                    }}
                  />
                </div>
                <span className={p.free === 0 ? "full" : ""}>
                  {p.free === 0 ? "FULL" : `${p.free} вільно`}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="h-wrap h-stats">
          {[
            ["99,6%", "точність детекції"],
            ["−40%", "часу на пошук місця"],
            ["+22%", "дохід з одного місця"],
            ["24/7", "моніторинг безпеки"],
          ].map(([a, b]) => (
            <div key={a}>
              <b>{a}</b>
              <span>{b}</span>
            </div>
          ))}
        </div>
      </section>

      {/* TRUST */}
      <section className="h-trust h-wrap">
        <span>Нам довіряють оператори паркінгів</span>
        <div>
          {["RIVER MALL", "OCEAN PLAZA", "LAVINA", "BLOCKBUSTER", "RESPUBLIKA", "KBP AIRPORT"].map(
            (x) => (
              <b key={x}>{x}</b>
            ),
          )}
        </div>
      </section>

      {/* MODULES */}
      <section className="h-section h-wrap" id="solutions">
        <div className="h-head">
          <div>
            <div className="h-num">01.</div>
            <h2>Повністю інтегрована, модульна система</h2>
          </div>
          <p>
            Почніть з одного модуля та масштабуйтесь до повного комплексу. Кожен компонент працює
            автономно і разом з іншими.
          </p>
        </div>
        <div className="h-modules">
          {modules.map((m) => (
            <article key={m.t} className={m.go ? "clickable" : ""} onClick={() => m.go && go(m.go)}>
              <div className="h-mod-top">
                <span className="h-mod-icon">
                  <I d={m.icon} />
                </span>
                <small>{m.tag}</small>
              </div>
              <h3>{m.t}</h3>
              <p>{m.d}</p>
              {m.go && (
                <span className="h-link">
                  Відкрити демо <I d={P.arrow} size={16} />
                </span>
              )}
            </article>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="h-dark">
        <div className="h-wrap">
          <div className="h-head light">
            <div>
              <div className="h-num">02.</div>
              <h2>Від в'їзду до виїзду — без пошуку</h2>
            </div>
            <p>
              Система супроводжує водія на кожному кроці, а оператор бачить усе в реальному часі.
            </p>
          </div>
          <div className="h-steps">
            {[
              ["В'їзд", "LPR-камера розпізнає номер, LED-табло показує вільні місця по поверхах."],
              ["Навігація", "Зелені індикатори та стрілки ведуть до найближчого вільного сектора."],
              ["Паркування", "Сенсор фіксує зайняте місце, дані миттєво йдуть у хмару."],
              ["Повернення", "Find My Car показує пішохідний маршрут від виходу ТЦ до авто."],
            ].map(([t, d], i) => (
              <div className="h-step" key={t}>
                <span>0{i + 1}</span>
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
            ))}
          </div>
          <div className="h-colors">
            <div>
              <i style={{ background: "#22C55E" }} />
              <b>Вільно</b>
              <span>#22C55E</span>
            </div>
            <div>
              <i style={{ background: "#EF4444" }} />
              <b>Зайнято</b>
              <span>#EF4444</span>
            </div>
            <div>
              <i style={{ background: "#3B82F6" }} />
              <b>Бронь</b>
              <span>#3B82F6</span>
            </div>
          </div>
        </div>
      </section>

      {/* DEMO */}
      <section className="h-section h-wrap" id="demo">
        <div className="h-head">
          <div>
            <div className="h-num">03.</div>
            <h2>Спробуйте систему наживо</h2>
          </div>
          <p>
            Чотири робочі інтерфейси на спільних live-даних: бронюйте, паркуйтесь і дивіться, як
            змінюються табло та дашборд.
          </p>
        </div>
        <div className="h-demo">
          <button className="big" onClick={() => go("map")}>
            <small>ДЛЯ ВОДІЯ</small>
            <h3>Zero-App 2D-карта та Find My Car</h3>
            <div className="h-mini-map">
              {park.statuses.P1.slice(0, 16).map((st, i) => (
                <i key={i} className={st === "free" ? "f" : st === "reserved" ? "r" : "o"} />
              ))}
            </div>
            <span className="h-link">
              Відкрити <I d={P.arrow} size={16} />
            </span>
          </button>
          <button className="led" onClick={() => go("led")}>
            <small>В'ЇЗД</small>
            <h3>LED-табло перед шлагбаумом</h3>
            <div className="h-led-mini">
              {[...m.per].map((p) => (
                <div key={p.floor}>
                  {p.floor}{" "}
                  <b className={p.free === 0 ? "r" : ""}>{p.free === 0 ? "FULL" : p.free}</b>
                </div>
              ))}
            </div>
            <span className="h-link">
              Відкрити <I d={P.arrow} size={16} />
            </span>
          </button>
          <button onClick={() => go("booking")}>
            <small>САЙТ ТЦ</small>
            <h3>Онлайн-бронювання місця</h3>
            <span className="h-link">
              Відкрити <I d={P.arrow} size={16} />
            </span>
          </button>
          <button onClick={() => go("dashboard")}>
            <small>ДЛЯ ДИРЕКТОРА</small>
            <h3>B2B-дашборд і штрафи</h3>
            <span className="h-link">
              Відкрити <I d={P.arrow} size={16} />
            </span>
          </button>
        </div>
      </section>

      {/* SECTORS */}
      <section className="h-section h-wrap" id="sectors">
        <div className="h-head">
          <div>
            <div className="h-num">04.</div>
            <h2>Рішення для вашої галузі</h2>
          </div>
          <p>Типові сценарії, які ми вже впроваджуємо.</p>
        </div>
        <div className="h-sector-tabs">
          {sectors.map((s) => (
            <button
              key={s.id}
              className={sector.id === s.id ? "active" : ""}
              onClick={() => setSector(s)}
            >
              {s.n}
            </button>
          ))}
        </div>
        <div className="h-sector">
          <img src={sector.img} alt={sector.n} key={sector.id} />
          <div className="h-sector-card">
            <small>{sector.n.toUpperCase()}</small>
            <b>{sector.kpi[0]}</b>
            <span>{sector.kpi[1]}</span>
            <p>{sector.d}</p>
            <button className="h-btn primary" onClick={() => scrollTo("contact")}>
              Обговорити проєкт <I d={P.arrow} size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* ROI */}
      <section className="h-roi">
        <img src={IMG.garage} alt="" />
        <div className="h-wrap h-roi-inner">
          <div>
            <div className="h-num light">05.</div>
            <h2>Кожен квадратний метр — актив, що приносить дохід</h2>
            <p>
              Оптимізуйте використання місць, зменшіть затори на в'їзді та збільшіть прибутковість
              без розширення площі.
            </p>
          </div>
          <div className="h-roi-grid">
            {[
              ["12–18 міс", "окупність інвестицій"],
              ["×1,4", "оборотність місця"],
              ["−35%", "CO₂ від пошуку місця"],
              ["−60%", "часу на патрулювання"],
            ].map(([a, b]) => (
              <div key={a}>
                <b>{a}</b>
                <span>{b}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ + CONTACT */}
      <section className="h-section h-wrap h-final" id="contact">
        <div>
          <div className="h-num">06.</div>
          <h2>Часті запитання</h2>
          <div className="h-faq">
            {faqs.map(([q, a], i) => (
              <div key={q} className={faq === i ? "open" : ""}>
                <button onClick={() => setFaq(faq === i ? -1 : i)}>
                  {q}
                  <I d={P.plus} size={18} />
                </button>
                <p>{a}</p>
              </div>
            ))}
          </div>
        </div>
        <form
          className="h-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) setSent(true);
          }}
        >
          {sent ? (
            <div className="h-sent">
              <span>
                <I d={P.check} size={28} />
              </span>
              <h3>Дякуємо, {form.name}!</h3>
              <p>Ми зв'яжемося з вами протягом одного робочого дня, щоб узгодити демо.</p>
              <button
                type="button"
                className="h-btn ghost dark"
                onClick={() => {
                  setSent(false);
                  setForm({ name: "", email: "", company: "", spaces: "500–1500" });
                }}
              >
                Нова заявка
              </button>
            </div>
          ) : (
            <>
              <h3>Замовити демо</h3>
              <p>Розкажіть про ваш паркінг — підготуємо розрахунок і план пілоту.</p>
              <label>
                Ім'я*
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Олена Коваль"
                />
              </label>
              <label>
                Email*
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="olena@company.ua"
                />
              </label>
              <label>
                Компанія / об'єкт
                <input
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  placeholder="ТРЦ River Mall"
                />
              </label>
              <label>
                Кількість місць
                <div className="h-seg">
                  {["до 500", "500–1500", "1500+"].map((s) => (
                    <button
                      type="button"
                      key={s}
                      className={form.spaces === s ? "active" : ""}
                      onClick={() => setForm({ ...form, spaces: s })}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </label>
              <button className="h-btn primary full" disabled={!valid}>
                Надіслати заявку <I d={P.arrow} size={18} />
              </button>
            </>
          )}
        </form>
      </section>

      <footer className="h-footer">
        <div className="h-wrap">
          <div>
            <b>ParkFlow</b>
            <p>Smart Parking Guidance & Security. Київ, Україна.</p>
          </div>
          <div>
            <small>РІШЕННЯ</small>
            <a onClick={() => go("map")}>Zero-App навігація</a>
            <a onClick={() => go("led")}>LED-табло</a>
            <a onClick={() => go("booking")}>Бронювання</a>
            <a onClick={() => go("dashboard")}>B2B-дашборд</a>
          </div>
          <div>
            <small>КОНТАКТИ</small>
            <a href="mailto:hello@parkflow.ua">hello@parkflow.ua</a>
            <a href="tel:+380441234567">+380 44 123 45 67</a>
          </div>
        </div>
        <div className="h-wrap h-copy">© 2025 ParkFlow. Усі права захищені.</div>
      </footer>
    </main>
  );
}
