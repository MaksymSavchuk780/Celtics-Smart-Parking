# -*- coding: utf-8 -*-
import json
import subprocess
import os

def build_epics_personas_commands():
    cmds = []
    sheet_name = 'Епіки та User-персони'
    
    # Insert new sheet after existing sheets
    cmds.append({'command': 'home.insertSheet', 'params': {'name': sheet_name}})
    cmds.append({'command': 'sheet.activate', 'params': {'sheet': sheet_name}})
    cmds.append({'command': 'sheet.tabColor', 'params': {'color': '#065F46'}})

    # Title Block
    cmds.append({'command': 'cell.set', 'params': {'cell': 'A1', 'input': 'Celtics Smart Parking System • Епіки та User-персони'}})
    cmds.append({'command': 'home.bold', 'params': {'range': 'A1', 'on': True}})
    cmds.append({'command': 'home.fontSize', 'params': {'range': 'A1', 'size': 16}})
    cmds.append({'command': 'home.fontColor', 'params': {'range': 'A1', 'color': '#064E3B'}})
    cmds.append({'command': 'home.fontName', 'params': {'range': 'A1', 'name': 'Segoe UI'}})

    cmds.append({'command': 'cell.set', 'params': {'cell': 'A2', 'input': 'Паспорт ключових стейкхолдерів проєкту та вичерпна специфікація Епіків і User Stories (згідно з концептом команди «Селтікс»)'}})
    cmds.append({'command': 'home.fontSize', 'params': {'range': 'A2', 'size': 10}})
    cmds.append({'command': 'home.fontColor', 'params': {'range': 'A2', 'color': '#4B5563'}})
    cmds.append({'command': 'home.fontName', 'params': {'range': 'A2', 'name': 'Segoe UI'}})

    # ==========================================
    # SECTION 1: ЮЗЕР-ПЕРСОНИ (Row 4)
    # ==========================================
    cmds.append({'command': 'cell.set', 'params': {'cell': 'A4', 'input': '1. ЮЗЕР-ПЕРСОНИ ТА СТЕЙКХОЛДЕРИ СИСТЕМИ (USER PERSONAS)'}})
    cmds.append({'command': 'home.bold', 'params': {'range': 'A4:F4', 'on': True}})
    cmds.append({'command': 'home.fontSize', 'params': {'range': 'A4:F4', 'size': 11}})
    cmds.append({'command': 'home.fillColor', 'params': {'range': 'A4:F4', 'color': '#D1FAE5'}})
    cmds.append({'command': 'home.fontColor', 'params': {'range': 'A4:F4', 'color': '#064E3B'}})
    cmds.append({'command': 'home.borders', 'params': {'range': 'A4:F4', 'preset': 'all', 'style': 'thin', 'color': '#A7F3D0'}})

    personas_header = [
        'Роль / Персона',
        'Цільовий профіль',
        'Ключові потреби та очікування',
        'Проблематика та «болі» (Pains)',
        'Пропоноване рішення в Celtics Smart Parking',
        'Критерій успіху для персони'
    ]

    personas_data = [
        personas_header,
        [
            'B2C (Водій / Клієнт паркінгу)',
            'Відвідувач ТЦ на авто / IT-фахівець, який цінує час та комфорт',
            'Запаркуватися за < 2 хвилини без завантаження окремих додатків; за потреби забронювати місце онлайн на сайті ТЦ; легко знайти свою машину після покупок чи кіно.',
            'Втрата 10–15 хвилин на блукання рядами; блокування в\'їзду заторами; категорична відмова завантажувати мобільні додатки заради 20 хв стоянки; складність орієнтування на поверхах після шопінгу.',
            'В\'їзне поверхове LED-табло наявності місць; швидкий Zero-App за QR-кодом на шлагбаумі/талоні (відкриття 2D-карти за 1 сек у браузері); функція «Find My Car» із пішохідним маршрутом; форма онлайн-бронювання слота на сайті ТЦ.',
            'Час пошуку місця < 2 хв, нуль встановлених додатків, точна навігація прямо до авто.'
        ],
        [
            'B2B (Замовник / Дирекція ТЦ)',
            'Операційний директор ТЦ, керуючий паркувальною інфраструктурою',
            'Збільшити оборотність паркомісць; ліквідувати черги та затори на в\'їздах; мати єдиний дашборд з аналітикою в реальному часі (пікові години, Dwell Time, теплова карта); захистити заброньовані слоти.',
            'Відсутність реальної картини завантаженості та оборотності місць; регулярні автомобільні затори, що відлякують покупців ТЦ; безкарне паркування сторонніх водіїв на чужих заброньованих місцях.',
            'Аналітичний веб-дашборд у реальному часі (живі лічильники поверхів і секторів, бінарний розрахунок завантаженості); колірні індикатори 90–100% заповненості; автоматичний штраф (+500 грн) на паркувальний талон порушника при заїзді на чужу бронь.',
            'Ліквідація заторів перед шлагбаумами, підвищення доходу паркінгу, прозора аналітика 24/7.'
        ],
        [
            'Dev / Core (Команда розробників)',
            'Команда «Селтікс» (Савчук — Backend/DB, Чабан — IoT/ESP32, Андрущенко — UI/UX/Frontend)',
            'Розробити цілісну концепцію, схему реляційної БД (PostgreSQL/SQLite), специфікацію REST API зі Swagger, апаратний стенд ESP32 та Python-симулятор для захисту PoC перед комісією.',
            'Обмеженість бюджету та неможливість монтажу дорогих камер над кожним місцем у лабораторних умовах; необхідність протестувати наскрізні сценарії та алерти без повномасштабного фізичного обладнання.',
            'Бюджетні ультразвукові датчики з триколірними LED (зелений/червоний/синій); єдина камера ANPR на шлагбаумі; Python-генератор трафіку та номерних знаків; 4 демо-сценарії для демонстрації комісії.',
            'Повністю робочий Proof of Concept із наскрізним зв\'язком апаратної плати, бекенду, БД та веб-карти.'
        ]
    ]

    p_table_range = f'A5:F8'
    cmds.append({'command': 'range.setValues', 'params': {'range': 'A5', 'values': personas_data}})
    cmds.append({'command': 'insert.table', 'params': {'range': p_table_range, 'header': True, 'style': 'TableStyleMedium7', 'name': 'PersonasTable'}})
    cmds.append({'command': 'home.bold', 'params': {'range': 'A5:F5', 'on': True}})
    cmds.append({'command': 'home.alignMiddle', 'params': {'range': p_table_range}})
    cmds.append({'command': 'home.wrapText', 'params': {'range': p_table_range, 'on': True}})
    cmds.append({'command': 'home.fontSize', 'params': {'range': p_table_range, 'size': 10}})
    cmds.append({'command': 'home.fontName', 'params': {'range': p_table_range, 'name': 'Segoe UI'}})

    # ==========================================
    # SECTION 2: ЕПІКИ ТА USER STORIES (Row 10)
    # ==========================================
    cmds.append({'command': 'cell.set', 'params': {'cell': 'A10', 'input': '2. ПОВНА ІЄРАРХІЯ ЕПІКІВ ТА USER STORIES (EPICS & STORIES HIERARCHY)'}})
    cmds.append({'command': 'home.bold', 'params': {'range': 'A10:F10', 'on': True}})
    cmds.append({'command': 'home.fontSize', 'params': {'range': 'A10:F10', 'size': 11}})
    cmds.append({'command': 'home.fillColor', 'params': {'range': 'A10:F10', 'color': '#D1FAE5'}})
    cmds.append({'command': 'home.fontColor', 'params': {'range': 'A10:F10', 'color': '#064E3B'}})
    cmds.append({'command': 'home.borders', 'params': {'range': 'A10:F10', 'preset': 'all', 'style': 'thin', 'color': '#A7F3D0'}})

    stories_header = [
        'Епік проєкту',
        'Код US',
        'Назва User Story',
        'Формулювання User Story (Шаблон: «Як... я хочу... щоб...»)',
        'Критерії готовності, бізнес-правила та логіка (з PDF)',
        'Виконавець та технологічний стек'
    ]

    stories_data = [
        stories_header,
        # Епік 1
        [
            'ЕПІК 1 (B2C): Zero-App навігація, швидкий пошук авто та веб-бронювання',
            'US 1.1',
            'В\'їзне LED-табло поверхової наявності місць',
            '«Як водій перед шлагбаумом, я хочу бачити на табло кількість вільних місць окремо по кожному поверху та статус "FULL" при заповненні, щоб не заїжджати на переповнений паркінг.»',
            '1. Подеталізована статистика по поверхах у реальному часі («Поверх -1: 0 | Поверх 1: 14 | Поверх 2: 38»).\n2. Автоматичне переключення табло на статус «МІСЦЬ НЕМАЄ / FULL» при 100% заповненості незаброньованих місць, що відсікає марний заїзд трафіку.',
            'Андрущенко (Frontend) / Чабан (Hardware) • HTML5 Canvas, JS, матричний дисплей'
        ],
        [
            'ЕПІК 1 (B2C): Zero-App навігація, швидкий пошук авто та веб-бронювання',
            'US 1.2 (+ 1.4)',
            'Zero-App 2D-карта за QR-кодом та пошук авто «Find My Car»',
            '«Як водій, я хочу відсканувати QR-код на шлагбаумі/талоні, за 1 секунду відкрити у браузері інтерактивну карту вільних місць, а після покупок ввести номер свого авто і побачити пішохідний маршрут від виходу з ТЦ до моєї машини, щоб не витрачати час на блукання рядами без встановлення додатків.»',
            '1. Відкриття інтерактивної карти за 1 сек без реєстрацій та завантаження додатків.\n2. Відображення реального стану місць за даними датчиків (зелений — вільно, червоний — зайнято, синій — заброньовано).\n3. Прив\'язка виданого талона та номера авто (ANPR) до конкретного місця у момент спрацювання датчика.\n4. Модуль «Find My Car»: пошук за держномером або ID талона та побудова точного пішохідного маршруту від виходу ТЦ до авто.',
            'Андрущенко (UI/UX) / Савчук (Backend) • SVG 2D Map, Fast Web App, алгоритм пошуку шляху'
        ],
        [
            'ЕПІК 1 (B2C): Zero-App навігація, швидкий пошук авто та веб-бронювання',
            'US 1.5',
            'Попереднє веб-бронювання на сайті ТЦ та штраф на талон порушника',
            '«Як відвідувач ТЦ, я хочу заздалегідь забронювати конкретне паркомісце на сайті ТЦ, вказавши час заїзду та номер свого авто, щоб гарантовано мати зручне місце в годину пік.»',
            '1. Форма вибору дати, часу заїзду, паркомісця на сайті ТЦ та введення номера авто (напр. BC 1234 AB).\n2. Перемикання LED над місцем на синій колір (статус: reserved).\n3. Автоматичне відкриття шлагбаума через ANPR-камеру для заброньованого авто та зміна LED на червоний.\n4. Захист броні (Штраф на талон): якщо на синє місце паркується інше авто — фіксація порушення, нарахування штрафу (+500 грн) на паркувальний талон порушника, а клієнту з бронею система виділяє сусіднє вільне місце.',
            'Савчук (Backend/API) / Андрущенко (Frontend) • REST API /reservations, ANPR кореляція'
        ],

        # Епік 2
        [
            'ЕПІК 2 (B2B): Аналітична панель управління та моніторингу паркінгу',
            'US 2.1',
            'Моніторинг заповненості паркінгу в реальному часі',
            '«Як операційний директор ТЦ, я хочу бачити на дашборді поточний відсоток заповненості всього паркінгу та кожного поверху окремо, щоб у реальному часі контролювати завантаженість інфраструктури та уникати заторів.»',
            '1. Головний екран адміністратора з живими лічильниками вільних, зайнятих і заброньованих місць по поверхах (-1, 1, 2) та секторах (А, Б).\n2. Автоматичний розрахунок загального відсотка завантаженості на базі бінарних сигналів датчиків (0/1).\n3. Візуальна колірна сигналізація критично заповнених поверхів (червоний статус при досягненні 90–100% заповненості).',
            'Андрущенко (Frontend) / Савчук (Backend) • Chart.js / WebSockets, REST API /dashboard'
        ],
        [
            'ЕПІК 2 (B2B): Аналітична панель управління та моніторингу паркінгу',
            'US 2.5',
            'Управління бронюваннями, контроль порушників та облік штрафів на талонах',
            '«Як адміністратор паркінгу, я хочу бачити список активних веб-бронювань та отримувати алерт Unauthorized Parking (коли датчик на заброньованому місці спрацьовує без заїзду власника броні) із автоматичним накладенням штрафу на талон порушника, щоб оперативно контролювати дисципліну паркування.»',
            '1. Таблиця активних броней із сайту ТЦ (номер авто, місце, очікуваний час, статус заїзду).\n2. Миттєві спливаючі сповіщення (Alerts) «Unauthorized Parking» при зайнятті синього місця стороннім авто.\n3. Журнал нарахованих штрафів на паркувальні талони порушників (Ticket ID, номер авто, місце, сума штрафу до сплати на виїзді зі шлагбаума).\n4. Функції ручного керування: редагування/скасування броней та блокування слотів адміністратором.',
            'Савчук (Backend) / Андрущенко (UI) • База violations_log, Push/Toast сповіщення'
        ],

        # Епік 3
        [
            'ЕПІК 3 (DEV / CORE): Ядро системи, REST API та симуляція IoT',
            'US 3.1',
            'Реляційна база даних системи (PostgreSQL/SQLite)',
            '«Як бекенд-розробник, я хочу спроєктувати схему реляційної БД (PostgreSQL/SQLite) для збереження поверхів, паркомісць, статусів датчиків, виданих талонів, ANPR-логів, бронювань та штрафів, щоб забезпечити цілісність даних.»',
            '1. Проєктування та створення таблиць: floors, parking_spots (free, occupied, reserved), tickets (ID талона, номер авто, fine_amount), reservations, violations_log.\n2. Налаштування первинних та зовнішніх ключів (Foreign Keys), індексів швидкого пошуку та збереження цілісності зв\'язків.',
            'Савчук (Backend) • dbdiagram.io, SQLAlchemy ORM, SQLite / PostgreSQL, Alembic'
        ],
        [
            'ЕПІК 3 (DEV / CORE): Ядро системи, REST API та симуляція IoT',
            'US 3.2',
            'Центральне REST API зі Swagger-документацією',
            '«Як фронтенд-розробник, я хочу мати задокументовані у Swagger REST API ендпоінти для отримання стану 2D-карти, пошуку авто, створення бронювань та вивантаження метрик дашборду, щоб інтегрувати інтерфейси B2C та B2B.»',
            '1. Реалізація Swagger/OpenAPI специфікації на /docs.\n2. Реалізація ключових ендпоінтів: POST /api/v1/reservations (створення броні, переведення у status: reserved), GET /api/v1/map (актуальний стан слотів і поверхів для QR-карти, LED-табло та моніторингу), GET /api/v1/vehicles/find.\n3. Забезпечення обміну даними між веб-сервісами, контролером ESP32 та симулятором.',
            'Савчук (Backend) • FastAPI, Pydantic, Swagger UI, Uvicorn'
        ],
        [
            'ЕПІК 3 (DEV / CORE): Ядро системи, REST API та симуляція IoT',
            'US 3.3',
            'Синхронізація ANPR-камери, талонів та ультразвукових датчиків місць',
            '«Як бекенд-розробник, я хочу реалізувати логіку прив\'язки зчитаного на шлагбаумі номера авто та виданого талона до спрацювання ультразвукового датчика на конкретному місці, щоб знати, де стоїть кожна машина, і автоматично виписувати штраф на талон при захопленні чужої броні.»',
            '1. Кореляція події в\'їзду через шлагбаум (plate + ticket_id) зі зміною сигналу датчика паркомісця (0 -> 1).\n2. Автоматична верифікація: якщо місце має статус reserved для іншого номера — у поле tickets.fine_amount порушника записується штраф (+500 грн).',
            'Савчук (Backend) / Чабан (IoT) • Обробник черги подій, просторово-часовий алгоритм'
        ],
        [
            'ЕПІК 3 (DEV / CORE): Ядро системи, REST API та симуляція IoT',
            'US 3.5',
            'Python-симулятор трафіку, датчиків та апаратний макет на ESP32',
            '«Як розробник, я хочу написати Python-скрипт, який генерує потік українських номерів авто та імітує бінарні сигнали ультразвукових датчиків (0/1), щоб протестувати систему без фізичного обладнання.»',
            '1. Генератор валідних номерних знаків України (BC 1234 AB, KA 7788 OO тощо) та імітація заїздів.\n2. Імітація бінарних сигналів датчиків (0/1) та передача HTTP-пакетів у REST API.\n3. Складання апаратного вузла реального паркомісця: ESP32 + ультразвуковий датчик HC-SR04 + триколірний LED.',
            'Чабан (IoT / Hardware) / Савчук (Python) • ESP32, C++ Arduino / MicroPython, Python Requests'
        ],
        [
            'ЕПІК 3 (DEV / CORE): Ядро системи, REST API та симуляція IoT',
            'US 3.6',
            'Демо-сценарії для публічного захисту Proof of Concept',
            '«Як учасник команди "Селтікс", я хочу перемикати у симуляторі готові сценарії, щоб наочно продемонструвати роботу системи перед комісією.»',
            '1. Режим 1 «Ранковий штиль»: низький трафік, швидке вільне паркування.\n2. Режим 2 «Суботній пік»: масове заповнення секцій, динамічна навігація.\n3. Режим 3 «100% FULL»: спрацювання статусу FULL на поверховому табло.\n4. Режим 4 «Порушник на броні»: заїзд чужого авто на синє місце -> нарахування штрафу на талон + миттєвий алерт у B2B-панель директора ТЦ.\n5. Наскрізне демо та фінальний захист PoC.',
            'Вся команда «Селтікс» (Савчук, Чабан, Андрущенко) • Пресети сценаріїв для захисту'
        ]
    ]

    s_table_range = f'A11:F21'
    cmds.append({'command': 'range.setValues', 'params': {'range': 'A11', 'values': stories_data}})
    cmds.append({'command': 'insert.table', 'params': {'range': s_table_range, 'header': True, 'style': 'TableStyleMedium7', 'name': 'EpicsStoriesTable'}})
    cmds.append({'command': 'home.bold', 'params': {'range': 'A11:F11', 'on': True}})
    cmds.append({'command': 'home.alignMiddle', 'params': {'range': s_table_range}})
    cmds.append({'command': 'home.wrapText', 'params': {'range': s_table_range, 'on': True}})
    cmds.append({'command': 'home.fontSize', 'params': {'range': s_table_range, 'size': 10}})
    cmds.append({'command': 'home.fontName', 'params': {'range': s_table_range, 'name': 'Segoe UI'}})

    # Alignments
    cmds.append({'command': 'home.alignLeft', 'params': {'range': 'A5:F8'}})
    cmds.append({'command': 'home.alignLeft', 'params': {'range': 'A11:F21'}})
    cmds.append({'command': 'home.alignCenter', 'params': {'range': 'B12:B21'}}) # Code US center

    # Column Widths
    cmds.append({'command': 'home.columnWidth', 'params': {'cols': 'A:A', 'chars': 26}})
    cmds.append({'command': 'home.columnWidth', 'params': {'cols': 'B:B', 'chars': 12}})
    cmds.append({'command': 'home.columnWidth', 'params': {'cols': 'C:C', 'chars': 28}})
    cmds.append({'command': 'home.columnWidth', 'params': {'cols': 'D:D', 'chars': 44}})
    cmds.append({'command': 'home.columnWidth', 'params': {'cols': 'E:E', 'chars': 52}})
    cmds.append({'command': 'home.columnWidth', 'params': {'cols': 'F:F', 'chars': 30}})

    # Freeze panes on Row 4
    cmds.append({'command': 'view.freezePanes', 'params': {'cell': 'A5'}})

    # Re-activate the primary sheet
    cmds.append({'command': 'sheet.activate', 'params': {'sheet': 'План завдань та Епіки'}})

    return cmds

def main():
    cmds = build_epics_personas_commands()
    script_path = 'add_epics_sheet.jsonl'
    
    with open(script_path, 'w', encoding='utf-8') as f:
        for c in cmds:
            f.write(json.dumps(c, ensure_ascii=False) + '\n')
            
    print(f"Executing GridCraft with {len(cmds)} commands...")
    
    # We take onedrive_latest.xlsx (the user's latest file with their custom tasks & ЧАС sheet)
    # and produce the updated Celtics_Smart_Parking_System_Tasks.xlsx
    result = subprocess.run([
        r"C:\Program Files\GridCraft\gridcraft-cli.exe",
        "run",
        "--in", "onedrive_latest.xlsx",
        "--script", script_path,
        "--out", "Celtics_Smart_Parking_System_Tasks.xlsx"
    ], capture_output=True, text=True, encoding='utf-8')

    print("STDOUT:", result.stdout[-500:] if len(result.stdout) > 500 else result.stdout)
    if result.stderr:
        print("STDERR:", result.stderr)
    print("Return code:", result.returncode)

if __name__ == '__main__':
    main()
