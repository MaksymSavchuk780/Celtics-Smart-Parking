# -*- coding: utf-8 -*-
import json
import os
import subprocess

def make_script():
    cmds = []
    
    # ==========================================
    # SHEET 1: План завдань та Епіки (Backlog)
    # ==========================================
    cmds.append({'command': 'sheet.rename', 'params': {'name': 'План завдань та Епіки'}})
    cmds.append({'command': 'sheet.tabColor', 'params': {'color': '#064E3B'}})
    
    # Title Block
    cmds.append({'command': 'cell.set', 'params': {'cell': 'A1', 'input': 'Celtics Smart Parking System • Беклог завдань та Епіки'}})
    cmds.append({'command': 'home.bold', 'params': {'range': 'A1', 'on': True}})
    cmds.append({'command': 'home.fontSize', 'params': {'range': 'A1', 'size': 16}})
    cmds.append({'command': 'home.fontColor', 'params': {'range': 'A1', 'color': '#064E3B'}})
    cmds.append({'command': 'home.fontName', 'params': {'range': 'A1', 'name': 'Segoe UI'}})
    
    cmds.append({'command': 'cell.set', 'params': {'cell': 'A2', 'input': 'Гібридна смарт-система навігації, веб-бронювання та аналітики для паркінгу ТЦ'}})
    cmds.append({'command': 'home.fontSize', 'params': {'range': 'A2', 'size': 11}})
    cmds.append({'command': 'home.fontColor', 'params': {'range': 'A2', 'color': '#374151'}})
    cmds.append({'command': 'home.fontName', 'params': {'range': 'A2', 'name': 'Segoe UI'}})

    cmds.append({'command': 'cell.set', 'params': {'cell': 'A3', 'input': 'Команда «Селтікс» • Формат: Academic Proof of Concept (PoC) • Шаблон беклогу'}})
    cmds.append({'command': 'home.italic', 'params': {'range': 'A3', 'on': True}})
    cmds.append({'command': 'home.fontSize', 'params': {'range': 'A3', 'size': 10}})
    cmds.append({'command': 'home.fontColor', 'params': {'range': 'A3', 'color': '#6B7280'}})
    cmds.append({'command': 'home.fontName', 'params': {'range': 'A3', 'name': 'Segoe UI'}})

    # KPI summary bar (Row 4)
    kpi_values = [
        ['Всього завдань:', '=COUNTA(B6:B38)', 'Виконано:', '=COUNTIF(E6:E38, "Готово")', 'В процесі:', '=COUNTIF(E6:E38, "В процесі")']
    ]
    cmds.append({'command': 'range.setValues', 'params': {'range': 'A4', 'values': kpi_values}})
    cmds.append({'command': 'home.fillColor', 'params': {'range': 'A4:F4', 'color': '#ECFDF5'}})
    cmds.append({'command': 'home.borders', 'params': {'range': 'A4:F4', 'preset': 'all', 'style': 'thin', 'color': '#A7F3D0'}})
    cmds.append({'command': 'home.bold', 'params': {'range': 'A4:F4', 'on': True}})
    cmds.append({'command': 'home.fontSize', 'params': {'range': 'A4:F4', 'size': 10}})
    cmds.append({'command': 'home.fontName', 'params': {'range': 'A4:F4', 'name': 'Segoe UI'}})
    cmds.append({'command': 'home.alignMiddle', 'params': {'range': 'A4:F4'}})
    cmds.append({'command': 'home.alignCenter', 'params': {'range': 'B4,D4,F4'}})
    cmds.append({'command': 'home.alignRight', 'params': {'range': 'A4,C4,E4'}})

    # Table Header (Row 5) + Tasks Data (Rows 6-38) + Template Rows (Rows 39-43)
    header = ['Епік / Юзер Сторі', 'Завдання', 'Виконавець', 'Дедлайн', 'Статус', 'Очікуваний результат / Артефакт']
    
    rows = [
        header,
        # --- ЕПІК 1: US 1.1 ---
        [
            'ЕПІК 1 (B2C) • US 1.1: В\'їзне LED-табло наявності місць',
            'Розробка логіки підрахунку вільних, зайнятих та заброньованих місць по поверхах (-1, 1, 2) у реальному часі',
            'Backend-розробник',
            '06.11.2026',
            'До виконання',
            'REST ендпоінт агрегації поверхової статистики'
        ],
        [
            'ЕПІК 1 (B2C) • US 1.1: В\'їзне LED-табло наявності місць',
            'Автоматичне переключення світлодіодного табло на статус «МІСЦЬ НЕМАЄ / FULL» при 100% заповненості незаброньованих місць',
            'IoT / Embedded-розробник',
            '08.11.2026',
            'До виконання',
            'Контролер світлодіодного табло перед шлагбаумом'
        ],
        # --- ЕПІК 1: US 1.2 (+1.4) ---
        [
            'ЕПІК 1 (B2C) • US 1.2: Zero-App 2D-карта та Find My Car',
            'Розробка швидкого мобільного веб-інтерфейсу 2D-карти (Zero-App відкриття за 1 сек за QR-кодом без встановлення додатків)',
            'Frontend-розробник',
            '10.11.2026',
            'До виконання',
            'Клікабельний веб-компонент інтерактивної карти'
        ],
        [
            'ЕПІК 1 (B2C) • US 1.2: Zero-App 2D-карта та Find My Car',
            'Відображення кольорових статусів паркомісць на 2D-карті (зелений — вільно, червоний — зайнято, синій — заброньовано)',
            'Frontend-розробник',
            '12.11.2026',
            'До виконання',
            'Динамічна палітра індикації паркомісць'
        ],
        [
            'ЕПІК 1 (B2C) • US 1.2: Zero-App 2D-карта та Find My Car',
            'Прив\'язка виданого на шлагбаумі талона та номера авто (ANPR) до конкретного місця за подією ультразвукового датчика',
            'Backend-розробник',
            '13.11.2026',
            'До виконання',
            'Сервіс прив\'язки паркування у БД'
        ],
        [
            'ЕПІК 1 (B2C) • US 1.2: Zero-App 2D-карта та Find My Car',
            'Реалізація функції «Find My Car»: введення номера авто/талона та побудова пішохідного маршруту від виходу ТЦ до авто',
            'Frontend / Core',
            '15.11.2026',
            'До виконання',
            'Маршрутизатор та візуалізація пішохідного шляху'
        ],
        # --- ЕПІК 1: US 1.5 ---
        [
            'ЕПІК 1 (B2C) • US 1.5: Веб-бронювання та штраф на талон',
            'Розробка веб-форми попереднього бронювання на сайті ТЦ (вибір дати, часу заїзду, бажаного місця та введення держномера)',
            'Frontend-розробник',
            '14.11.2026',
            'До виконання',
            'Інтерфейс бронювання на сайті ТЦ'
        ],
        [
            'ЕПІК 1 (B2C) • US 1.5: Веб-бронювання та штраф на талон',
            'Зміна LED-індикатора паркомісця на синій колір та автоматичне відкриття шлагбаума через ANPR-камеру для заброньованого авто',
            'IoT / Backend-розробник',
            '16.11.2026',
            'До виконання',
            'Синхронізація броні з ANPR і шлагбаумом'
        ],
        [
            'ЕПІК 1 (B2C) • US 1.5: Веб-бронювання та штраф на талон',
            'Алгоритм виявлення несанкціонованого паркування на чужій броні (таймінг датчика без відповідності активній броні)',
            'Backend-розробник',
            '17.11.2026',
            'До виконання',
            'Детектор порушень бронювання'
        ],
        [
            'ЕПІК 1 (B2C) • US 1.5: Веб-бронювання та штраф на талон',
            'Автоматичне нарахування грошового штрафу (+500 грн) на паркувальний талон порушника та виділення сусіднього місця клієнту',
            'Backend-розробник',
            '18.11.2026',
            'До виконання',
            'Білінг штрафу у tickets.fine_amount та перенесення броні'
        ],

        # --- ЕПІК 2: US 2.1 ---
        [
            'ЕПІК 2 (B2B) • US 2.1: Моніторинг заповненості Real-Time',
            'Розробка головного екрана B2B-дашборда з живими лічильниками вільних, зайнятих і заброньованих місць по поверхах і секторах',
            'Frontend-розробник',
            '19.11.2026',
            'До виконання',
            'Панель моніторингу директора ТЦ'
        ],
        [
            'ЕПІК 2 (B2B) • US 2.1: Моніторинг заповненості Real-Time',
            'Автоматичний розрахунок загального відсотка завантаженості всього паркінгу на основі бінарних сигналів датчиків (0/1)',
            'Backend-розробник',
            '20.11.2026',
            'До виконання',
            'Модуль розрахунку occupancy rate та метрик Dwell Time'
        ],
        [
            'ЕПІК 2 (B2B) • US 2.1: Моніторинг заповненості Real-Time',
            'Візуальна колірна сигналізація критично заповнених поверхів (червоний індикатор при заповненні >= 90–100%)',
            'Frontend-розробник',
            '21.11.2026',
            'До виконання',
            'Віджети заповненості з порогами тривоги'
        ],

        # --- ЕПІК 2: US 2.5 ---
        [
            'ЕПІК 2 (B2B) • US 2.5: Управління бронями та штрафами',
            'Таблиця активних веб-бронювань із сайту ТЦ (номер авто, зарезервоване місце, час очікуваного прибуття, статус заїзду)',
            'Frontend-розробник',
            '22.11.2026',
            'До виконання',
            'Таблиця оперативного обліку бронювань'
        ],
        [
            'ЕПІК 2 (B2B) • US 2.5: Управління бронями та штрафами',
            'Модуль миттєвих сповіщень «Unauthorized Parking» в адмін-панелі при несанкціонованому зайнятті синього місця стороннім авто',
            'Fullstack-розробник',
            '23.11.2026',
            'До виконання',
            'Система алертів у реальному часі (Toasts/WebSockets)'
        ],
        [
            'ЕПІК 2 (B2B) • US 2.5: Управління бронями та штрафами',
            'Журнал нарахованих штрафів на талони порушників (Ticket ID, розпізнаний номер авто, зайняте місце, сума штрафу до сплати)',
            'Backend-розробник',
            '24.11.2026',
            'До виконання',
            'Реєстр штрафів та історії санкцій'
        ],
        [
            'ЕПІК 2 (B2B) • US 2.5: Управління бронями та штрафами',
            'Функціонал ручного управління: перенесення або скасування броней та примусове блокування окремих місць адміністратором',
            'Fullstack-розробник',
            '25.11.2026',
            'До виконання',
            'Адміністративні дії над слотами паркінгу'
        ],

        # --- ЕПІК 3: US 3.1 ---
        [
            'ЕПІК 3 (DEV / CORE) • US 3.1: Реляційна база даних',
            'Проєктування схеми реляційної БД (PostgreSQL/SQLite): сутності floors, parking_spots, tickets, reservations',
            'Backend-розробник',
            '05.11.2026',
            'До виконання',
            'ER-діаграма та DDL-скрипт бази даних'
        ],
        [
            'ЕПІК 3 (DEV / CORE) • US 3.1: Реляційна база даних',
            'Створення міграцій, enum-типів статусів (free, occupied, reserved) та індексів швидкого пошуку за номерами авто і талонами',
            'Backend-розробник',
            '07.11.2026',
            'До виконання',
            'Файли міграцій БД та тестові дані (seeds)'
        ],

        # --- ЕПІК 3: US 3.2 ---
        [
            'ЕПІК 3 (DEV / CORE) • US 3.2: REST API та Swagger',
            'Специфікація та налаштування інтерактивної документації Swagger/OpenAPI UI для центрального REST API',
            'Backend-розробник',
            '08.11.2026',
            'До виконання',
            'Swagger UI на /docs з описом моделей та помилок'
        ],
        [
            'ЕПІК 3 (DEV / CORE) • US 3.2: REST API та Swagger',
            'Реалізація ендпоінту POST /api/v1/reservations (створення бронювання за номером авто, переведення місця в status: reserved)',
            'Backend-розробник',
            '09.11.2026',
            'До виконання',
            'Контролер бронювання паркомісць'
        ],
        [
            'ЕПІК 3 (DEV / CORE) • US 3.2: REST API та Swagger',
            'Реалізація ендпоінту GET /api/v1/map (видача актуального стану паркомісць і поверхів для QR-карти, LED-табло і B2B-дашборду)',
            'Backend-розробник',
            '11.11.2026',
            'До виконання',
            'Контролер карти та поверхової статистики'
        ],
        [
            'ЕПІК 3 (DEV / CORE) • US 3.2: REST API та Swagger',
            'Забезпечення двостороннього обміну даними між сайтом ТЦ, мобільною QR-картою водія, адмінкою та Python-симулятором',
            'Backend-розробник',
            '12.11.2026',
            'До виконання',
            'Шина інтеграції компонентів системи'
        ],

        # --- ЕПІК 3: US 3.3 ---
        [
            'ЕПІК 3 (DEV / CORE) • US 3.3: Синхронізація ANPR та IoT',
            'Обробка події заїзду через шлагбаум: фіксація розпізнаного номера авто (ANPR) та виданого паркувального талона (ticket_id)',
            'Backend-розробник',
            '14.11.2026',
            'До виконання',
            'Сервіс реєстрації в\'їзду автомобілів'
        ],
        [
            'ЕПІК 3 (DEV / CORE) • US 3.3: Синхронізація ANPR та IoT',
            'Алгоритм просторово-часової кореляції заїзду авто зі зміною сигналу датчика місця (0 -> 1) для точної прив\'язки машини',
            'Backend-розробник',
            '16.11.2026',
            'До виконання',
            'Алгоритм локалізації машини на паркомісці'
        ],
        [
            'ЕПІК 3 (DEV / CORE) • US 3.3: Синхронізація ANPR та IoT',
            'Автоматична перевірка: якщо на заброньоване місце стає інше авто — нарахування штрафу у tickets.fine_amount порушника',
            'Backend-розробник',
            '17.11.2026',
            'До виконання',
            'Бізнес-правило захисту броні та штрафування'
        ],

        # --- ЕПІК 3: US 3.5 ---
        [
            'ЕПІК 3 (DEV / CORE) • US 3.5: Python-симулятор трафіку',
            'Розробка генератора валідних українських номерних знаків (напр. BC 1234 AB, KA 7788 OO) та подій заїзду через шлагбаум',
            'Python / Data-розробник',
            '18.11.2026',
            'До виконання',
            'Модуль generator_plates.py'
        ],
        [
            'ЕПІК 3 (DEV / CORE) • US 3.5: Python-симулятор трафіку',
            'Імітація бінарних сигналів (0/1) масиву ультразвукових датчиків присутності та надсилання тестових пакетів у REST API',
            'Python / Data-розробник',
            '19.11.2026',
            'До виконання',
            'Модуль sensor_stream_simulator.py'
        ],

        # --- ЕПІК 3: US 3.6 ---
        [
            'ЕПІК 3 (DEV / CORE) • US 3.6: Демо-сценарії для захисту',
            'Реалізація Демо-сценарію 1: «Ранковий штиль» (мінімальне навантаження, вільний заїзд, зелені статуси датчиків)',
            'Python / Data-розробник',
            '21.11.2026',
            'До виконання',
            'Пресет demo_scenario_1_morning.py'
        ],
        [
            'ЕПІК 3 (DEV / CORE) • US 3.6: Демо-сценарії для захисту',
            'Реалізація Демо-сценарію 2: «Суботній пік» (високе навантаження, масове заповнення секцій, динаміка табло)',
            'Python / Data-розробник',
            '22.11.2026',
            'До виконання',
            'Пресет demo_scenario_2_peak.py'
        ],
        [
            'ЕПІК 3 (DEV / CORE) • US 3.6: Демо-сценарії для захисту',
            'Реалізація Демо-сценарію 3: «100% FULL» (перемикання в\'їзного LED-табло у яскравий попереджувальний статус FULL)',
            'Python / Data-розробник',
            '23.11.2026',
            'До виконання',
            'Пресет demo_scenario_3_full.py'
        ],
        [
            'ЕПІК 3 (DEV / CORE) • US 3.6: Демо-сценарії для захисту',
            'Реалізація Демо-сценарію 4: «Порушник на броні» (заїзд чужого авто на синє місце -> штраф на талон + алерт на B2B-дашборді)',
            'Python / Data-розробник',
            '24.11.2026',
            'До виконання',
            'Пресет demo_scenario_4_violator.py'
        ],
        [
            'ЕПІК 3 (DEV / CORE) • US 3.6: Демо-сценарії для захисту',
            'Наскрізний прогін PoC, підготовка сценарію живого захисту перед комісією та фінальна перевірка REST API і дашборду',
            'Team Lead / Команда «Селтікс»',
            '26.11.2026',
            'До виконання',
            'Готовий Proof of Concept для успішного захисту'
        ],

        # --- 5 ШАБЛОННИХ ПОРОЖНІХ РЯДКІВ ДЛЯ КОРИСТУВАЧА ---
        [
            '[Епік / User Story - введіть свій текст]',
            '[Опишіть завдання або вставте необхідний текст]',
            '[Виконавець]',
            'DD.MM.YYYY',
            'До виконання',
            '[Очікуваний результат]'
        ],
        [
            '[Епік / User Story - введіть свій текст]',
            '[Опишіть завдання або вставте необхідний текст]',
            '[Виконавець]',
            'DD.MM.YYYY',
            'До виконання',
            '[Очікуваний результат]'
        ],
        [
            '[Епік / User Story - введіть свій текст]',
            '[Опишіть завдання або вставте необхідний текст]',
            '[Виконавець]',
            'DD.MM.YYYY',
            'До виконання',
            '[Очікуваний результат]'
        ],
        [
            '[Епік / User Story - введіть свій текст]',
            '[Опишіть завдання або вставте необхідний текст]',
            '[Виконавець]',
            'DD.MM.YYYY',
            'До виконання',
            '[Очікуваний результат]'
        ],
        [
            '[Епік / User Story - введіть свій текст]',
            '[Опишіть завдання або вставте необхідний текст]',
            '[Виконавець]',
            'DD.MM.YYYY',
            'До виконання',
            '[Очікуваний результат]'
        ]
    ]

    total_rows = len(rows) # 1 header + 33 tasks + 5 template rows = 39 rows
    table_range = f'A5:F{4 + total_rows}' # A5:F43

    cmds.append({'command': 'range.setValues', 'params': {'range': 'A5', 'values': rows}})
    cmds.append({'command': 'insert.table', 'params': {'range': table_range, 'header': True, 'style': 'TableStyleMedium7', 'name': 'BacklogTable'}})

    # Styling and formatting for Backlog
    cmds.append({'command': 'home.fontName', 'params': {'range': table_range, 'name': 'Segoe UI'}})
    cmds.append({'command': 'home.fontSize', 'params': {'range': table_range, 'size': 10}})
    
    # Header row styling
    cmds.append({'command': 'home.bold', 'params': {'range': 'A5:F5', 'on': True}})
    cmds.append({'command': 'home.fontSize', 'params': {'range': 'A5:F5', 'size': 11}})
    cmds.append({'command': 'home.alignMiddle', 'params': {'range': 'A5:F5'}})
    cmds.append({'command': 'home.alignCenter', 'params': {'range': 'A5:F5'}})

    # Data rows alignment
    data_range = f'A6:F{4 + total_rows}'
    cmds.append({'command': 'home.wrapText', 'params': {'range': data_range, 'on': True}})
    cmds.append({'command': 'home.alignMiddle', 'params': {'range': data_range}})
    cmds.append({'command': 'home.alignLeft', 'params': {'range': f'A6:B{4 + total_rows}'}})
    cmds.append({'command': 'home.alignCenter', 'params': {'range': f'C6:E{4 + total_rows}'}})
    cmds.append({'command': 'home.alignLeft', 'params': {'range': f'F6:F{4 + total_rows}'}})

    # Highlight template rows in subtle gray/italic so user easily spots them
    tmpl_range = f'A39:F43'
    cmds.append({'command': 'home.italic', 'params': {'range': tmpl_range, 'on': True}})
    cmds.append({'command': 'home.fontColor', 'params': {'range': tmpl_range, 'color': '#6B7280'}})

    # Set generous column widths
    cmds.append({'command': 'home.columnWidth', 'params': {'cols': 'A:A', 'chars': 38}})
    cmds.append({'command': 'home.columnWidth', 'params': {'cols': 'B:B', 'chars': 60}})
    cmds.append({'command': 'home.columnWidth', 'params': {'cols': 'C:C', 'chars': 24}})
    cmds.append({'command': 'home.columnWidth', 'params': {'cols': 'D:D', 'chars': 15}})
    cmds.append({'command': 'home.columnWidth', 'params': {'cols': 'E:E', 'chars': 16}})
    cmds.append({'command': 'home.columnWidth', 'params': {'cols': 'F:F', 'chars': 40}})

    # Freeze panes at A6 (so header rows 1-5 remain visible when scrolling)
    cmds.append({'command': 'view.freezePanes', 'params': {'cell': 'A6'}})

    # Add light gridlines borders
    cmds.append({'command': 'home.borders', 'params': {'range': table_range, 'preset': 'all', 'style': 'thin', 'color': '#E2E8F0'}})

    # ==========================================
    # SHEET 2: Специфікація та Архітектура (Specs)
    # ==========================================
    cmds.append({'command': 'home.insertSheet', 'params': {'name': 'Специфікація та Архітектура'}})
    cmds.append({'command': 'sheet.tabColor', 'params': {'color': '#047857'}})

    specs_title = [
        ['Celtics Smart Parking System • Архітектурна специфікація та Концепція'],
        ['Технічний паспорт, трирівнева архітектура, схема бази даних та REST API (з концептуального документу)']
    ]
    cmds.append({'command': 'range.setValues', 'params': {'range': 'A1', 'values': specs_title}})
    cmds.append({'command': 'home.bold', 'params': {'range': 'A1', 'on': True}})
    cmds.append({'command': 'home.fontSize', 'params': {'range': 'A1', 'size': 15}})
    cmds.append({'command': 'home.fontColor', 'params': {'range': 'A1', 'color': '#064E3B'}})
    cmds.append({'command': 'home.fontName', 'params': {'range': 'A1', 'name': 'Segoe UI'}})
    cmds.append({'command': 'home.fontSize', 'params': {'range': 'A2', 'size': 10}})
    cmds.append({'command': 'home.fontColor', 'params': {'range': 'A2', 'color': '#4B5563'}})

    specs_rows = [
        ['Розділ / Категорія', 'Компонент / Сутність', 'Детальний опис та технічні параметри (з PDF)', 'Призначення в системі Celtics'],
        
        # Рівні архітектури
        ['1. Архітектура', 'Фізичний рівень (IoT)', 'В\'їзне LED-табло поверхової наявності, єдина ANPR-камера та видача талона на шлагбаумі + бюджетні ультразвукові датчики з 3-колірними LED над кожним місцем (зелений/червоний/синій)', 'Апаратний рівень без використання дорогих відеокамер над кожним паркомісцем'],
        ['1. Архітектура', 'Цифровий рівень (Zero-App)', 'QR-код на шлагбаумі/талоні миттєво відкриває 2D-карту в браузері (< 1 сек) без встановлення окремих додатків + веб-бронювання на сайті ТЦ з автоматичним штрафом на талон за порушення броні', 'Швидка та безбар\'єрна взаємодія з відвідувачем ТЦ'],
        ['1. Архітектура', 'Функція «Find My Car»', 'Зіставлення номера авто (або ID талона) зі спрацюванням датчика місця будує точний пішохідний маршрут від виходу з ТЦ до запаркованої машини', 'Ліквідація блукання після шопінгу та економія часу клієнта'],

        # Юзер-персони
        ['2. Стейкхолдери', 'B2C (Водій)', 'Відвідувач ТЦ на авто / IT-фахівець. Потреба: запаркуватися < 2 хв без завантаження додатків, забронювати місце на сайті, легко знайти авто після покупок чи кіно', 'Кінцевий клієнт (споживач навігаційного сервісу)'],
        ['2. Стейкхолдери', 'B2B (Замовник)', 'Операційний директор ТЦ. Потреба: збільшити оборотність паркомісць, ліквідувати затори на в\'їздах, бачити дашборд з аналітикою (пікові години, Dwell Time, теплова карта)', 'Бізнес-замовник та адміністратор інфраструктури'],
        ['2. Стейкхолдери', 'Dev (Розробники)', 'Команда «Селтікс». Розробка схеми БД, REST API, Python-симулятора даних та клікабельного фронтенд-прототипу для захисту', 'Інженерна команда PoC'],

        # REST API
        ['3. REST API', 'POST /api/v1/reservations', 'Створення попереднього бронювання на сайті ТЦ за номером авто (напр. BC 1234 AB), вибір слота та переведення індикатора місця у синій колір (reserved)', 'Захист місця для постійних або преміум-клієнтів'],
        ['3. REST API', 'GET /api/v1/map', 'Видача актуального стану паркомісць і поверхів для 2D QR-карти, в\'їзного LED-табло (включно зі статусом FULL) та B2B-моніторингу', 'Єдине джерело правди про стан паркінгу'],
        ['3. REST API', 'POST /api/v1/anpr/entry', 'Фіксація зчитаного номера авто в\'їзною камерою ANPR та прив\'язка до виданого талона (Ticket ID) на шлагбаумі', 'Ідентифікація транспортного засобу при в\'їзді'],
        ['3. REST API', 'POST /api/v1/sensors/event', 'Прийом події від ультразвукового датчика місця (0 -> 1 зайнято, 1 -> 0 звільнено). Перевірка відповідності активній броні та нарахування штрафу при порушенні', 'Ядро відстеження фізичного зайняття слотів'],
        ['3. REST API', 'GET /api/v1/vehicles/find', 'Пошук поточного поверху та координат паркомісця за номером авто або номером талона порушника/клієнта з генерацією пішохідного треку', 'Бекенд функціоналу «Find My Car»'],

        # База даних
        ['4. Схема БД', 'Таблиця: floors', 'Поля: id (PK), name (Поверх -1, 1, 2), total_spots, free_spots, occupied_spots, is_full', 'Збереження конфігурації поверхів ТЦ'],
        ['4. Схема БД', 'Таблиця: parking_spots', 'Поля: id (PK), floor_id (FK), spot_code (A-15), status (free, occupied, reserved), led_color, sensor_state (0/1)', 'Реєстр усіх паркомісць з поточним фізичним статусом'],
        ['4. Схема БД', 'Таблиця: tickets', 'Поля: id (Ticket ID, TCK-8041), plate_number, entry_time, exit_time, fine_amount (сума штрафу), is_paid', 'Паркувальні талони, розпізнані держномери та штрафи'],
        ['4. Схема БД', 'Таблиця: reservations', 'Поля: id (PK), ticket_id (FK), plate_number, spot_id (FK), reserved_from, reserved_to, status', 'Облік активних, виконаних та порушених бронювань'],

        # Демо-сценарії
        ['5. Демо-сценарії', 'Сценарій 1: «Ранковий штиль»', 'Низька завантаженість (20-30%), зелені індикатори датчиків, миттєвий заїзд авто без затримок', 'Демонстрація базової роботи системи'],
        ['5. Демо-сценарії', 'Сценарій 2: «Суботній пік»', 'Інтенсивний потік машин, заповнення паркінгу понад 75%, динамічна зміна лічильників на поверховому табло', 'Демонстрація стресостійкості та швидкої ротації'],
        ['5. Демо-сценарії', 'Сценарій 3: «100% FULL»', 'Повне заповнення незаброньованих місць, автоматичне перемикання LED-табло перед шлагбаумом на статус FULL для відсікання затору', 'Демонстрація автоматизованого контролю трафіку'],
        ['5. Демо-сценарії', 'Сценарій 4: «Порушник на броні»', 'Автомобіль (напр. KA 7788 OO) стає на зарезервоване синє місце (A-18). Система нараховує штраф +500 грн на талон TCK-8049, відправляє алерт директору та виділяє клієнту місце A-19', 'Ключова бізнес-фіча захисту бронювань']
    ]

    cmds.append({'command': 'range.setValues', 'params': {'range': 'A4', 'values': specs_rows}})
    specs_range = f'A4:D{3 + len(specs_rows)}'
    cmds.append({'command': 'insert.table', 'params': {'range': specs_range, 'header': True, 'style': 'TableStyleMedium7', 'name': 'SpecsTable'}})
    cmds.append({'command': 'home.fontName', 'params': {'range': specs_range, 'name': 'Segoe UI'}})
    cmds.append({'command': 'home.fontSize', 'params': {'range': specs_range, 'size': 10}})
    cmds.append({'command': 'home.bold', 'params': {'range': 'A4:D4', 'on': True}})
    cmds.append({'command': 'home.fontSize', 'params': {'range': 'A4:D4', 'size': 11}})
    cmds.append({'command': 'home.alignMiddle', 'params': {'range': specs_range}})
    cmds.append({'command': 'home.wrapText', 'params': {'range': specs_range, 'on': True}})
    cmds.append({'command': 'home.columnWidth', 'params': {'cols': 'A:A', 'chars': 20}})
    cmds.append({'command': 'home.columnWidth', 'params': {'cols': 'B:B', 'chars': 30}})
    cmds.append({'command': 'home.columnWidth', 'params': {'cols': 'C:C', 'chars': 65}})
    cmds.append({'command': 'home.columnWidth', 'params': {'cols': 'D:D', 'chars': 45}})
    cmds.append({'command': 'view.freezePanes', 'params': {'cell': 'A5'}})

    # ==========================================
    # SHEET 3: Інструкція шаблону (Guide)
    # ==========================================
    cmds.append({'command': 'home.insertSheet', 'params': {'name': 'Інструкція до шаблону'}})
    cmds.append({'command': 'sheet.tabColor', 'params': {'color': '#059669'}})

    guide_rows = [
        ['ЯК КОРИСТУВАТИСЯ ЦИМ ШАБЛОНОМ EXCEL', ''],
        ['', ''],
        ['Функція / Властивість', 'Пояснення та поради щодо використання'],
        ['Автоналаштування висоти рядків під текст', 'На всіх клітинках увімкнено функцію «Перенос тексту» (Wrap Text). Коли ви вставляєте або друкуєте довший текст у завдання чи епік, Excel автоматично розширює висоту рядка, щоб весь текст було видно без ручної підгонки.'],
        ['Автоматичне розширення таблиці', 'Таблиця беклогу на першому аркуші створена як офіційна розумна таблиця Excel (Table). Якщо ви почнете писати новий рядок одразу під останнім рядком таблиці — Excel автоматично додасть новий рядок до таблиці, збереже всі стилі, шрифти, чергування кольорів та включить нові завдання до підсумкових формул.'],
        ['Зручні порожні рядки-шаблони', 'У кінці беклогу (рядки 39–43) додано 5 готових рядків-заготовок із плейсхолдерами. Ви можете відразу клікати на них і вносити реальні завдання вашої команди.'],
        ['Фільтрація та сортування за 1 клік', 'У заголовках кожного стовпця (стрілочки поруч із назвою) можна в один клік відфільтрувати завдання за конкретним Виконавцем (напр. тільки "Backend-розробник"), за Статусом ("До виконання", "В процесі", "Готово") або відсортувати за Дедлайном.'],
        ['Закріплення заголовків (Freeze Panes)', 'Верхні інформаційні рядки та рядок заголовків таблиці зафіксовані. При прокручуванні навіть великого беклогу вниз, ви завжди бачитимете назви колонок та зведену панель показників.'],
        ['Зміна ширини стовпців під ваш екран', 'Якщо ви захочете швидко змінити ширину будь-якого стовпця під свій екран — просто двічі клікніть лівою кнопкою миші на розділювач між літерами стовпців (A, B, C...) вгорі аркуша для миттєвого авто-підлаштування.']
    ]

    cmds.append({'command': 'range.setValues', 'params': {'range': 'A1', 'values': guide_rows}})
    cmds.append({'command': 'home.fontName', 'params': {'range': 'A1:B10', 'name': 'Segoe UI'}})
    cmds.append({'command': 'home.fontSize', 'params': {'range': 'A1', 'size': 15}})
    cmds.append({'command': 'home.bold', 'params': {'range': 'A1', 'on': True}})
    cmds.append({'command': 'home.fontColor', 'params': {'range': 'A1', 'color': '#064E3B'}})
    
    cmds.append({'command': 'home.bold', 'params': {'range': 'A3:B3', 'on': True}})
    cmds.append({'command': 'home.fontSize', 'params': {'range': 'A3:B3', 'size': 11}})
    cmds.append({'command': 'home.fillColor', 'params': {'range': 'A3:B3', 'color': '#ECFDF5'}})
    cmds.append({'command': 'home.fontColor', 'params': {'range': 'A3:B3', 'color': '#064E3B'}})
    cmds.append({'command': 'home.borders', 'params': {'range': 'A3:B10', 'preset': 'all', 'style': 'thin', 'color': '#CBD5E1'}})
    cmds.append({'command': 'home.wrapText', 'params': {'range': 'A4:B10', 'on': True}})
    cmds.append({'command': 'home.alignMiddle', 'params': {'range': 'A3:B10'}})
    cmds.append({'command': 'home.bold', 'params': {'range': 'A4:A10', 'on': True}})
    cmds.append({'command': 'home.columnWidth', 'params': {'cols': 'A:A', 'chars': 35}})
    cmds.append({'command': 'home.columnWidth', 'params': {'cols': 'B:B', 'chars': 85}})

    # Activate main sheet
    cmds.append({'command': 'sheet.activate', 'params': {'sheet': 'План завдань та Епіки'}})

    return cmds

def main():
    cmds = make_script()
    script_path = 'build_celtics_workbook.jsonl'
    out_xlsx = 'Celtics_Smart_Parking_System_Tasks.xlsx'
    
    with open(script_path, 'w', encoding='utf-8') as f:
        for c in cmds:
            f.write(json.dumps(c, ensure_ascii=False) + '\n')
            
    print(f"Generated {len(cmds)} commands. Executing GridCraft...")
    result = subprocess.run([
        r"C:\Program Files\GridCraft\gridcraft-cli.exe",
        "run",
        "--script", script_path,
        "--out", out_xlsx
    ], capture_output=True, text=True, encoding='utf-8')

    print("STDOUT:", result.stdout[-500:] if len(result.stdout) > 500 else result.stdout)
    if result.stderr:
        print("STDERR:", result.stderr)
    print("Return code:", result.returncode)

if __name__ == '__main__':
    main()
