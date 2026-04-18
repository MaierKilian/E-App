from __future__ import annotations

import html
import json
from datetime import datetime
from pathlib import Path
from textwrap import dedent
from urllib.parse import urlencode
from uuid import uuid4

import streamlit as st


st.set_page_config(
    page_title="E-App",
    page_icon="E",
    layout="centered",
    initial_sidebar_state="collapsed",
)


APP_STATE_PATH = Path(__file__).with_name("app_state.json")
TARGET_BUCKET_LITERS = 5.0
GOOD_FLOW_MIN = 7.0
GOOD_FLOW_MAX = 11.0

ROOM_OPTIONS = [
    "Wohnzimmer",
    "Schlafzimmer",
    "Kinderzimmer",
    "Kueche",
    "Bad",
    "WC",
    "Arbeitszimmer",
    "Gaestezimmer",
    "Keller",
    "Dachboden",
]

HEAT_GENERATOR_OPTIONS = [
    "Gaskessel",
    "Oelkessel",
    "Waermepumpe",
    "Holzofen",
    "Pellets",
    "Solarthermie",
]

HEAT_TRANSFER_OPTIONS = [
    "Heizkoerper",
    "Fussbodenheizung",
    "Deckenheizung",
    "Wandheizung",
]

MEASUREMENT_CATEGORIES = [
    {
        "id": "heizung",
        "label": "Heizung",
        "copy": "Messung folgt spaeter",
        "planned": 2,
        "available": 0,
        "accent": "#F06A4A",
    },
    {
        "id": "warmwasser",
        "label": "Warmwasser",
        "copy": "Mit dem Duschkopftest starten",
        "planned": 3,
        "available": 1,
        "accent": "#76BD1D",
    },
    {
        "id": "strom",
        "label": "Strom",
        "copy": "Messung folgt spaeter",
        "planned": 2,
        "available": 0,
        "accent": "#F0C631",
    },
    {
        "id": "wasser",
        "label": "Wasser",
        "copy": "Messung folgt spaeter",
        "planned": 2,
        "available": 0,
        "accent": "#3E8FCA",
    },
]


def default_questionnaire() -> dict:
    return {
        "building_year": 1990,
        "property_type": "Wohnung",
        "sqm": 80,
        "rooms": [],
        "heat_generators": [],
        "heat_distribution": [],
        "household_size": 2,
    }


def default_measurements() -> dict:
    return {
        "warmwater": {
            "completed": False,
            "attempts": [],
        }
    }


def default_user_record() -> dict:
    return {
        "name": None,
        "questionnaire": default_questionnaire(),
        "measurements": default_measurements(),
    }


def ensure_state(test_mode: bool = False) -> None:
    defaults = {
        "demo_id": None,
        "demo_name": None,
        "user_data": default_user_record(),
        "active_tab": "fragebogen",
        "active_measurement": None,
        "flash": None,
        "test_mode": test_mode,
    }
    for key, value in defaults.items():
        if key not in st.session_state:
            st.session_state[key] = value
    st.session_state["test_mode"] = test_mode


def test_identity() -> dict:
    return {
        "user_id": "demo",
        "name": "Demo",
    }


def esc(value: object) -> str:
    return html.escape("" if value is None else str(value))


def load_store() -> dict:
    if not APP_STATE_PATH.exists():
        return {"users": {}}

    try:
        payload = json.loads(APP_STATE_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {"users": {}}

    if not isinstance(payload, dict):
        return {"users": {}}

    users = payload.get("users")
    if not isinstance(users, dict):
        users = {}

    return {"users": users}


def save_store(store: dict) -> None:
    APP_STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    APP_STATE_PATH.write_text(
        json.dumps(store, indent=2, ensure_ascii=True),
        encoding="utf-8",
    )


def merged_user_record(raw: dict | None) -> dict:
    record = default_user_record()
    if not isinstance(raw, dict):
        return record

    record["name"] = raw.get("name")

    questionnaire = raw.get("questionnaire")
    if isinstance(questionnaire, dict):
        merged_questionnaire = default_questionnaire()
        merged_questionnaire.update(
            {
                "building_year": int(questionnaire.get("building_year", merged_questionnaire["building_year"])),
                "property_type": questionnaire.get("property_type", merged_questionnaire["property_type"]),
                "sqm": int(questionnaire.get("sqm", merged_questionnaire["sqm"])),
                "rooms": list(questionnaire.get("rooms", merged_questionnaire["rooms"])),
                "heat_generators": list(
                    questionnaire.get("heat_generators", merged_questionnaire["heat_generators"])
                ),
                "heat_distribution": list(
                    questionnaire.get("heat_distribution", merged_questionnaire["heat_distribution"])
                ),
                "household_size": int(
                    questionnaire.get("household_size", merged_questionnaire["household_size"])
                ),
            }
        )
        record["questionnaire"] = merged_questionnaire

    measurements = raw.get("measurements")
    if isinstance(measurements, dict):
        merged_measurements = default_measurements()
        warmwater = measurements.get("warmwater")
        if isinstance(warmwater, dict):
            merged_measurements["warmwater"]["completed"] = bool(warmwater.get("completed", False))
            attempts = warmwater.get("attempts", [])
            if isinstance(attempts, list):
                merged_measurements["warmwater"]["attempts"] = [
                    attempt for attempt in attempts if isinstance(attempt, dict)
                ]
        record["measurements"] = merged_measurements

    return record


def current_demo_id() -> str | None:
    demo_id = st.session_state.get("demo_id")
    if isinstance(demo_id, str) and demo_id.strip():
        return demo_id.strip()

    query_demo = query_value("demo")
    if query_demo:
        return query_demo.strip()

    return None


def resolve_user_identity() -> dict | None:
    demo_id = current_demo_id()
    if not demo_id:
        return None

    name = str(st.session_state.get("demo_name") or query_value("name") or "").strip()
    if not name:
        store = load_store()
        stored_record = merged_user_record(store["users"].get(demo_id))
        name = str(stored_record.get("name") or "").strip()
    if not name:
        name = test_identity()["name"]
    return {"user_id": demo_id, "name": name}


def sync_user_state() -> dict | None:
    identity = resolve_user_identity()
    if not identity:
        st.session_state["demo_id"] = None
        st.session_state["demo_name"] = None
        st.session_state["user_data"] = default_user_record()
        st.session_state["active_tab"] = "fragebogen"
        st.session_state["active_measurement"] = None
        return None

    store = load_store()
    stored_record = merged_user_record(store["users"].get(identity["user_id"]))
    current_record = merged_user_record(st.session_state.get("user_data"))
    record = stored_record if stored_record != default_user_record() else current_record
    record["name"] = identity["name"]
    st.session_state["demo_id"] = identity["user_id"]
    st.session_state["demo_name"] = identity["name"]
    st.session_state["user_data"] = record
    return identity


def persist_current_user() -> None:
    identity = resolve_user_identity()
    if not identity:
        return

    payload = merged_user_record(st.session_state.get("user_data"))
    payload["name"] = identity["name"]

    store = load_store()
    store["users"][identity["user_id"]] = payload
    save_store(store)


def replace_query_params(params: dict[str, str]) -> None:
    try:
        st.query_params.clear()
    except Exception:
        for key in list(st.query_params.keys()):
            del st.query_params[key]

    for key, value in params.items():
        st.query_params[key] = value


def query_value(name: str) -> str | None:
    value = st.query_params.get(name)
    if isinstance(value, list):
        return value[0] if value else None
    return value


def navigation_params(**params: str) -> dict[str, str]:
    clean = {key: value for key, value in params.items() if value}

    demo_id = current_demo_id()
    if demo_id:
        clean["demo"] = demo_id

    demo_name = str(st.session_state.get("demo_name") or query_value("name") or "").strip()
    if demo_name:
        clean["name"] = demo_name

    return clean


def build_href(**params: str) -> str:
    clean = navigation_params(**params)
    if not clean:
        return "?"
    return f"?{urlencode(clean)}"


def set_flash(kind: str, message: str) -> None:
    st.session_state["flash"] = {"kind": kind, "message": message}


def render_flash() -> None:
    flash = st.session_state.get("flash")
    if not isinstance(flash, dict):
        return

    message = flash.get("message")
    kind = flash.get("kind", "info")
    if message:
        getattr(st, kind, st.info)(message)
    st.session_state["flash"] = None


def apply_navigation_from_query(is_authenticated: bool) -> None:
    if not is_authenticated:
        if query_value("goal") or query_value("tab") or query_value("measurement"):
            replace_query_params({})
            st.rerun()
        return

    tab = query_value("tab")
    if tab == "report":
        tab = "auswertung"
    if tab in {"fragebogen", "messungen", "auswertung"}:
        st.session_state["active_tab"] = tab

    measurement = query_value("measurement")
    if st.session_state["active_tab"] == "messungen" and measurement == "warmwasser":
        st.session_state["active_measurement"] = "warmwasser"
    else:
        st.session_state["active_measurement"] = None


def logout_current_user() -> None:
    demo_id = current_demo_id()
    if demo_id:
        store = load_store()
        if demo_id in store["users"]:
            del store["users"][demo_id]
            save_store(store)

    st.session_state["demo_id"] = None
    st.session_state["demo_name"] = None
    st.session_state["user_data"] = default_user_record()
    st.session_state["active_tab"] = "fragebogen"
    st.session_state["active_measurement"] = None
    st.session_state["flash"] = None
    replace_query_params({})

    st.rerun()


def first_name(identity: dict | None) -> str:
    if not identity:
        return "da"
    name = identity.get("name") or "da"
    return name.split(" ", 1)[0]


def reset_test_session() -> None:
    record = default_user_record()
    record["name"] = resolve_user_identity()["name"] if resolve_user_identity() else test_identity()["name"]
    st.session_state["user_data"] = record
    persist_current_user()
    st.session_state["active_tab"] = "fragebogen"
    st.session_state["active_measurement"] = None
    set_flash("success", "Die Testdaten wurden zurueckgesetzt.")
    replace_query_params(navigation_params(tab="fragebogen"))
    st.rerun()


def open_test_measurement() -> None:
    st.session_state["active_tab"] = "messungen"
    st.session_state["active_measurement"] = "warmwasser"
    replace_query_params(navigation_params(tab="messungen", measurement="warmwasser"))
    st.rerun()


def questionnaire_completion(questionnaire: dict) -> tuple[int, int]:
    checks = [
        bool(questionnaire.get("building_year")),
        questionnaire.get("property_type") in {"Wohnung", "Haus"},
        int(questionnaire.get("sqm", 0)) > 0,
        bool(questionnaire.get("rooms")),
        bool(questionnaire.get("heat_generators")),
        bool(questionnaire.get("heat_distribution")),
        int(questionnaire.get("household_size", 0)) > 0,
    ]
    return sum(checks), len(checks)


def summary_chips(questionnaire: dict) -> list[str]:
    chips: list[str] = []
    if questionnaire.get("building_year"):
        chips.append(f"Baujahr {questionnaire['building_year']}")
    if questionnaire.get("property_type"):
        chips.append(questionnaire["property_type"])
    if questionnaire.get("sqm"):
        chips.append(f"{questionnaire['sqm']} m2")
    if questionnaire.get("household_size"):
        chips.append(f"{questionnaire['household_size']} Personen")
    if questionnaire.get("heat_generators"):
        chips.append(", ".join(questionnaire["heat_generators"][:2]))
    return chips


def latest_warmwater_attempt(user_data: dict) -> dict | None:
    attempts = user_data["measurements"]["warmwater"]["attempts"]
    return attempts[-1] if attempts else None


def warmwater_completed_count(user_data: dict) -> int:
    return 1 if latest_warmwater_attempt(user_data) else 0


def active_measurement_progress(user_data: dict) -> tuple[int, int]:
    completed = warmwater_completed_count(user_data)
    total_active = sum(entry["available"] for entry in MEASUREMENT_CATEGORIES)
    return completed, max(total_active, 1)


def warmwater_sector_progress(user_data: dict) -> tuple[int, int]:
    return warmwater_completed_count(user_data), 1


def heat_cost_factor(generators: list[str]) -> float:
    if not generators:
        return 1.0

    factor = 1.0
    if "Waermepumpe" in generators:
        factor *= 0.75
    if "Solarthermie" in generators:
        factor *= 0.82
    if "Pellets" in generators or "Holzofen" in generators:
        factor *= 0.88
    return max(factor, 0.55)


def estimate_shower_savings(questionnaire: dict, flow_lpm: float) -> int:
    extra_flow = max(flow_lpm - 9.0, 0.0)
    if extra_flow <= 0:
        return 0

    household_size = max(int(questionnaire.get("household_size", 1)), 1)
    avg_minutes = 6.5 if questionnaire.get("property_type") == "Wohnung" else 7.2
    if int(questionnaire.get("sqm", 0)) >= 140:
        avg_minutes += 0.4

    showers_per_person_per_week = 5.5
    water_cost_per_liter = 0.0051
    heat_cost_per_liter = 0.0036 * heat_cost_factor(questionnaire.get("heat_generators", []))

    annual_liters = extra_flow * avg_minutes * showers_per_person_per_week * 52 * household_size
    annual_cost = annual_liters * (water_cost_per_liter + heat_cost_per_liter)
    return int(round(annual_cost / 5.0) * 5)


def evaluate_shower_test(volume_liters: float, time_seconds: float) -> dict:
    flow_lpm = round((volume_liters / time_seconds) * 60, 1)

    if flow_lpm > GOOD_FLOW_MAX:
        return {
            "status": "high",
            "tone": "warn",
            "pill": "Durchfluss zu hoch",
            "headline": "Reduziere die Durchflussmenge.",
            "summary": (
                "Dein Duschkopf gibt aktuell recht viel Warmwasser frei. "
                "Dadurch steigt das Sparpotenzial direkt mit."
            ),
            "actions": [
                "Pruefe einen Sparduschkopf oder den Mengenregler.",
                "Miss nach der Anpassung noch einmal neu.",
            ],
            "flow_lpm": flow_lpm,
        }

    if flow_lpm >= GOOD_FLOW_MIN:
        return {
            "status": "good",
            "tone": "good",
            "pill": "Gute Durchflussmenge",
            "headline": "Der Duschkopftest liegt im guten Bereich.",
            "summary": (
                "Deine aktuelle Durchflussmenge passt gut. "
                "Hier besteht ueber den Duschkopf gerade kein akuter Handlungsbedarf."
            ),
            "actions": [
                "Behalte den Wert als Referenz fuer spaetere Vergleichsmessungen.",
                "Du kannst als Naechstes weitere Warmwasser-Tests freischalten, sobald sie verfuegbar sind.",
            ],
            "flow_lpm": flow_lpm,
        }

    return {
        "status": "low",
        "tone": "soft",
        "pill": "Durchfluss eher niedrig",
        "headline": "Pruefe Komfort, Verkalkung und Leckagen.",
        "summary": (
            "Der Duschkopf liefert eher wenig Wasser. Das spart zwar schon, "
            "kann aber auf Verkalkungen oder einen sehr schwachen Strahl hindeuten."
        ),
        "actions": [
            "Wenn sich der Strahl zu schwach anfuehlt, Durchfluss leicht erhoehen.",
            "Duschkopf auf Verkalkung oder Leckagen pruefen und danach erneut messen.",
        ],
        "flow_lpm": flow_lpm,
    }


def format_euro(amount: int) -> str:
    return f"{amount} EUR"


def logo_svg(size: int = 88) -> str:
    return f"""
    <svg width="{size}" height="{size}" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" aria-label="E-App Logo">
        <g fill="none" stroke="#76BD1D" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 62L64 18L110 62" stroke-width="8"/>
            <path d="M26 58V106H102V58" stroke-width="8"/>
            <path d="M32 30V48" stroke-width="8"/>
            <path d="M58 40C41 49 35 70 42 89C49 106 66 108 79 94C90 82 92 61 86 42C76 42 67 40 58 40Z" stroke-width="6"/>
            <path d="M52 84L69 58" stroke-width="6"/>
            <path d="M59 73L70 75" stroke-width="6"/>
            <path d="M57 67L48 58" stroke-width="6"/>
            <path d="M86 66L74 89H90L82 108" stroke-width="8"/>
        </g>
    </svg>
    """


def progress_bar_html(title: str, current: int, total: int, meta: str) -> str:
    total = max(total, 1)
    ratio = min(max(current / total, 0.0), 1.0)
    percent = int(round(ratio * 100))
    return f"""
    <div class="progress-shell">
        <div class="progress-head">
            <span>{esc(title)}</span>
            <strong>{percent}%</strong>
        </div>
        <div class="progress-track">
            <span class="progress-fill" style="width:{percent}%"></span>
        </div>
        <div class="progress-meta">{current}/{total} abgeschlossen - {esc(meta)}</div>
    </div>
    """


def metric_grid_html(metrics: list[tuple[str, str]]) -> str:
    blocks = []
    for label, value in metrics:
        blocks.append(
            f"""
            <div class="metric-card">
                <div class="metric-value">{esc(value)}</div>
                <div class="metric-label">{esc(label)}</div>
            </div>
            """
        )
    return f'<div class="metric-grid">{"".join(blocks)}</div>'


def chips_html(values: list[str]) -> str:
    if not values:
        return ""
    return f"""
    <div class="chip-row">
        {''.join(f'<span class="chip">{esc(value)}</span>' for value in values)}
    </div>
    """


def measurement_tiles_html(user_data: dict) -> str:
    completed_warmwater = warmwater_completed_count(user_data)
    tiles = []

    for category in MEASUREMENT_CATEGORIES:
        is_active = category["available"] > 0
        is_warmwater = category["id"] == "warmwasser"
        completed = completed_warmwater if is_warmwater else 0
        tile_tag = "a" if is_warmwater else "div"
        href_attr = (
            f' href="{build_href(tab="messungen", measurement="warmwasser")}"'
            if is_warmwater
            else ""
        )
        disabled_class = "" if is_active else " disabled"
        done_class = " done" if completed else ""

        tiles.append(
            f"""
            <{tile_tag} class="measure-tile{disabled_class}{done_class}"{href_attr} style="--tile-accent:{category['accent']};">
                <span class="tile-strip"></span>
                <span class="tile-meta">{category['available']} von {category['planned']} Tests aktiv</span>
                <strong class="tile-title">{esc(category['label'])}</strong>
                <span class="tile-copy">{esc(category['copy'])}</span>
                <span class="tile-progress">{completed}/{max(category['available'], 1)} abgeschlossen</span>
            </{tile_tag}>
            """
        )

    return f'<div class="tiles-grid">{"".join(tiles)}</div>'


def warmwater_result_card(attempt: dict) -> str:
    evaluation = attempt["evaluation"]
    savings = attempt["estimated_savings_eur"]
    savings_text = (
        f"Bis zu {format_euro(savings)} pro Jahr moeglich"
        if savings > 0
        else "Aktuell nur geringes Zusatzpotenzial ueber den Duschkopf"
    )
    action_lines = "".join(
        f'<div class="action-line">{esc(action)}</div>' for action in evaluation.get("actions", [])
    )
    measured_on = attempt.get("measured_at", "heute")

    return f"""
    <div class="result-card">
        <span class="status-pill {esc(evaluation['tone'])}">{esc(evaluation['pill'])}</span>
        <h3 class="result-title">{esc(evaluation['headline'])}</h3>
        <p class="result-copy">{esc(evaluation['summary'])}</p>
        {metric_grid_html([
            ("Durchfluss", f"{attempt['flow_lpm']} L/min"),
            ("Sparpotenzial", savings_text),
        ])}
        <div class="recommend-list">{action_lines}</div>
        <div class="ghost-note">Letzte Messung gespeichert am {esc(measured_on)}</div>
    </div>
    """


def empty_state_html(title: str, copy: str, href: str | None = None, label: str | None = None) -> str:
    cta = ""
    if href and label:
        cta = f'<a class="inline-link button-link" href="{href}">{esc(label)}</a>'
    return f"""
    <div class="empty-state">
        <h3>{esc(title)}</h3>
        <p>{esc(copy)}</p>
        {cta}
    </div>
    """


def inject_styles() -> None:
    st.markdown(
        dedent(
            """
            <style>
                :root {
                    --bg: #eaf6d9;
                    --surface: #ffffff;
                    --surface-soft: #F7FBEF;
                    --text: #163012;
                    --muted: #607257;
                    --line: rgba(22, 48, 18, 0.12);
                    --brand: #76BD1D;
                    --brand-deep: #4E9200;
                    --brand-soft: #E8F7CC;
                    --shadow: 0 24px 64px rgba(36, 76, 15, 0.14);
                    --radius-xl: 28px;
                    --radius-lg: 22px;
                    --radius-md: 18px;
                }

                html, body, [class*="css"] {
                    font-family: "Aptos", "Trebuchet MS", "Segoe UI", sans-serif;
                    color: var(--text);
                }

                [data-testid="stAppViewContainer"] {
                    background:
                        radial-gradient(circle at top left, rgba(118, 189, 29, 0.28), transparent 26%),
                        radial-gradient(circle at bottom right, rgba(78, 146, 0, 0.16), transparent 28%),
                        linear-gradient(180deg, #f4fbe9 0%, #ebf6dc 45%, #e5f2d5 100%);
                }

                [data-testid="stHeader"] {
                    background: transparent;
                }

                #MainMenu, footer {
                    visibility: hidden;
                }

                .block-container {
                    max-width: 430px;
                    min-height: calc(100vh - 1.2rem);
                    margin-top: 0.6rem;
                    margin-bottom: 0.6rem;
                    padding-top: 1rem;
                    padding-left: 1rem;
                    padding-right: 1rem;
                    padding-bottom: 6.6rem;
                    border-radius: 34px;
                    border: 1px solid rgba(22, 48, 18, 0.08);
                    background: rgba(255, 255, 255, 0.94);
                    box-shadow: var(--shadow);
                }

                h1, h2, h3 {
                    font-family: "Palatino Linotype", "Book Antiqua", serif;
                    color: #14310D;
                }

                .hero-panel,
                .section-panel,
                .result-card,
                .empty-state {
                    padding: 1.1rem;
                    border: 1px solid var(--line);
                    border-radius: var(--radius-lg);
                    background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(245, 251, 236, 0.96));
                    box-shadow: 0 16px 36px rgba(36, 76, 15, 0.06);
                }

                .hero-panel {
                    margin-bottom: 1rem;
                    text-align: left;
                }

                .welcome-panel {
                    padding: 1.25rem;
                    border-radius: 28px;
                    background:
                        radial-gradient(circle at top right, rgba(118, 189, 29, 0.14), transparent 34%),
                        linear-gradient(180deg, rgba(255, 255, 255, 1), rgba(247, 251, 239, 0.98));
                }

                .welcome-logo,
                .topbar-logo {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 88px;
                    height: 88px;
                    margin-bottom: 0.85rem;
                    border-radius: 26px;
                    background: linear-gradient(145deg, rgba(118, 189, 29, 0.14), rgba(118, 189, 29, 0.04));
                }

                .topbar {
                    display: flex;
                    gap: 0.95rem;
                    align-items: flex-start;
                    margin-bottom: 0.8rem;
                }

                .topbar-logo {
                    width: 62px;
                    height: 62px;
                    margin-bottom: 0;
                    border-radius: 20px;
                    flex: 0 0 auto;
                }

                .topbar-copy {
                    flex: 1;
                }

                .topbar-kicker,
                .eyebrow {
                    margin: 0 0 0.35rem;
                    font-size: 0.78rem;
                    font-weight: 800;
                    letter-spacing: 0.16em;
                    text-transform: uppercase;
                    color: var(--brand-deep);
                }

                .screen-title {
                    margin: 0;
                    font-size: 2.15rem;
                    line-height: 0.96;
                    letter-spacing: -0.04em;
                    color: #17310F !important;
                }

                .screen-copy,
                .topbar-copy p,
                .result-copy,
                .empty-state p {
                    margin: 0.7rem 0 0;
                    font-size: 0.98rem;
                    line-height: 1.6;
                    color: var(--muted);
                }

                .panel-head {
                    margin: 1.1rem 0 0.35rem;
                    font-size: 0.84rem;
                    font-weight: 800;
                    letter-spacing: 0.12em;
                    text-transform: uppercase;
                    color: var(--brand-deep);
                }

                .chip-row {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.5rem;
                    margin-top: 1rem;
                }

                .chip {
                    display: inline-flex;
                    align-items: center;
                    padding: 0.55rem 0.8rem;
                    border-radius: 999px;
                    border: 1px solid rgba(22, 48, 18, 0.08);
                    background: var(--surface-soft);
                    font-size: 0.85rem;
                    color: #28411f;
                }

                .choice-card-list {
                    display: grid;
                    gap: 0.85rem;
                    margin-top: 1rem;
                }

                .choice-card {
                    position: relative;
                    display: flex;
                    align-items: center;
                    gap: 0.9rem;
                    padding: 1rem;
                    border-radius: var(--radius-lg);
                    border: 1px solid var(--line);
                    text-decoration: none;
                    background: var(--surface);
                    color: inherit;
                    box-shadow: 0 14px 32px rgba(36, 76, 15, 0.05);
                }

                .choice-card:hover,
                .measure-tile:hover,
                .nav-link:hover {
                    transform: translateY(-2px);
                }

                .choice-accent {
                    width: 0.42rem;
                    align-self: stretch;
                    border-radius: 999px;
                    background: var(--goal-accent);
                }

                .choice-copy {
                    display: grid;
                    gap: 0.28rem;
                    flex: 1;
                }

                .choice-copy strong,
                .tile-title,
                .result-title {
                    font-size: 1.08rem;
                    color: #17310F;
                }

                .choice-copy span,
                .tile-meta,
                .tile-copy,
                .tile-progress,
                .ghost-note,
                .metric-label,
                .progress-meta {
                    font-size: 0.84rem;
                    line-height: 1.45;
                    color: var(--muted);
                }

                .choice-arrow {
                    font-size: 0.84rem;
                    font-weight: 700;
                    color: var(--brand-deep);
                }

                .progress-shell {
                    margin: 0.9rem 0 1rem;
                    padding: 0.95rem 1rem;
                    border-radius: var(--radius-lg);
                    border: 1px solid var(--line);
                    background: var(--surface-soft);
                }

                .progress-head {
                    display: flex;
                    justify-content: space-between;
                    gap: 0.5rem;
                    margin-bottom: 0.6rem;
                    font-size: 0.92rem;
                    font-weight: 700;
                }

                .progress-track {
                    width: 100%;
                    height: 0.65rem;
                    border-radius: 999px;
                    background: rgba(118, 189, 29, 0.16);
                    overflow: hidden;
                }

                .progress-fill {
                    display: block;
                    height: 100%;
                    border-radius: 999px;
                    background: linear-gradient(90deg, #76BD1D 0%, #4E9200 100%);
                }

                .metric-grid {
                    display: grid;
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    gap: 0.7rem;
                    margin-top: 0.95rem;
                }

                .metric-card {
                    padding: 0.85rem;
                    border-radius: 18px;
                    border: 1px solid rgba(22, 48, 18, 0.08);
                    background: rgba(255, 255, 255, 0.86);
                }

                .metric-value {
                    font-size: 1rem;
                    font-weight: 800;
                    color: #17310F;
                }

                .tiles-grid {
                    display: grid;
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    gap: 0.8rem;
                    margin-top: 1rem;
                }

                .measure-tile {
                    display: flex;
                    flex-direction: column;
                    gap: 0.36rem;
                    min-height: 9rem;
                    padding: 0.9rem;
                    border-radius: 22px;
                    border: 1px solid var(--line);
                    background: var(--surface);
                    text-decoration: none;
                    color: inherit;
                    box-shadow: 0 16px 34px rgba(36, 76, 15, 0.05);
                    transition: transform 0.18s ease, box-shadow 0.18s ease;
                }

                .measure-tile.disabled {
                    opacity: 0.72;
                }

                .measure-tile.done {
                    border-color: rgba(118, 189, 29, 0.28);
                    background: linear-gradient(180deg, rgba(248, 252, 242, 1), rgba(235, 246, 220, 0.82));
                }

                .tile-strip {
                    width: 100%;
                    height: 0.55rem;
                    border-radius: 999px;
                    background: var(--tile-accent);
                }

                .status-pill {
                    display: inline-flex;
                    align-items: center;
                    width: fit-content;
                    padding: 0.42rem 0.7rem;
                    border-radius: 999px;
                    font-size: 0.78rem;
                    font-weight: 800;
                    letter-spacing: 0.04em;
                    text-transform: uppercase;
                }

                .status-pill.good {
                    color: #255C12;
                    background: rgba(118, 189, 29, 0.14);
                }

                .status-pill.warn {
                    color: #7A4300;
                    background: rgba(230, 156, 47, 0.18);
                }

                .status-pill.soft {
                    color: #275A4F;
                    background: rgba(44, 143, 123, 0.16);
                }

                .recommend-list {
                    display: grid;
                    gap: 0.5rem;
                    margin-top: 1rem;
                }

                .action-line {
                    padding: 0.72rem 0.84rem;
                    border-radius: 16px;
                    background: var(--surface-soft);
                    color: #28411f;
                    line-height: 1.5;
                }

                .test-steps {
                    display: grid;
                    gap: 0.55rem;
                    margin-bottom: 0.8rem;
                }

                .step-chip {
                    display: block;
                    padding: 0.78rem 0.86rem;
                    border-radius: 16px;
                    border: 1px solid rgba(22, 48, 18, 0.08);
                    background: #FCFEF8;
                    color: #294420;
                    line-height: 1.45;
                }

                .nav-shell {
                    position: sticky;
                    bottom: 0.6rem;
                    display: grid;
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                    gap: 0.55rem;
                    margin-top: 1.1rem;
                    padding: 0.55rem;
                    border-radius: 22px;
                    border: 1px solid rgba(22, 48, 18, 0.08);
                    background: rgba(255, 255, 255, 0.92);
                    box-shadow: 0 18px 36px rgba(36, 76, 15, 0.12);
                    backdrop-filter: blur(8px);
                }

                .nav-link {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 3.1rem;
                    padding: 0.65rem;
                    border-radius: 16px;
                    text-decoration: none;
                    color: #36512D;
                    font-weight: 700;
                    background: rgba(247, 251, 239, 0.7);
                    transition: transform 0.18s ease, background 0.18s ease;
                }

                .nav-link.active {
                    background: linear-gradient(180deg, rgba(118, 189, 29, 0.18), rgba(118, 189, 29, 0.08));
                    color: #17310F;
                }

                .inline-link {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.35rem;
                    margin-bottom: 0.5rem;
                    color: var(--brand-deep);
                    text-decoration: none;
                    font-weight: 700;
                }

                .button-link {
                    margin-top: 0.85rem;
                }

                .welcome-note {
                    margin: 0.55rem 0 0;
                    font-size: 0.85rem;
                    color: var(--muted);
                }

                .empty-state {
                    margin-top: 1rem;
                    text-align: left;
                }

                .empty-state h3 {
                    margin: 0;
                }

                div[data-testid="stButton"] > button,
                div[data-testid="stFormSubmitButton"] > button {
                    min-height: 3.15rem;
                    border-radius: 18px;
                    border: 1px solid var(--line);
                    background: var(--surface);
                    color: #17310F;
                    font-weight: 800;
                    transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
                }

                div[data-testid="stButton"] > button:hover,
                div[data-testid="stFormSubmitButton"] > button:hover {
                    transform: translateY(-2px);
                    border-color: rgba(118, 189, 29, 0.34);
                    box-shadow: 0 14px 28px rgba(36, 76, 15, 0.08);
                }

                div[data-testid="stButton"] > button[kind="primary"],
                div[data-testid="stFormSubmitButton"] > button[kind="primary"] {
                    background: linear-gradient(180deg, #76BD1D 0%, #5EA70A 100%);
                    color: white;
                    border-color: #5EA70A;
                }

                div[data-baseweb="input"] > div,
                div[data-baseweb="select"] > div {
                    border-radius: 18px !important;
                    border-color: rgba(22, 48, 18, 0.12) !important;
                    background: #FBFDF7 !important;
                }

                div[data-baseweb="input"] input,
                div[data-baseweb="input"] textarea,
                div[data-baseweb="select"] span,
                [data-testid="stWidgetLabel"] p,
                [data-testid="stMarkdownContainer"] h1,
                [data-testid="stMarkdownContainer"] h2,
                [data-testid="stMarkdownContainer"] h3 {
                    color: #17310F !important;
                }

                div[data-baseweb="input"] input::placeholder,
                div[data-baseweb="input"] textarea::placeholder {
                    color: #7A8E6D !important;
                    opacity: 1;
                }

                div[role="radiogroup"] label,
                div[role="radiogroup"] label span {
                    color: #17310F !important;
                }

                div[data-baseweb="tag"] {
                    border-radius: 999px !important;
                    background: rgba(118, 189, 29, 0.14) !important;
                }

                div[role="radiogroup"] > label {
                    border-radius: 999px !important;
                    padding-top: 0.3rem !important;
                    padding-bottom: 0.3rem !important;
                }

                @media (max-width: 640px) {
                    .block-container {
                        max-width: none;
                        min-height: 100vh;
                        margin: 0;
                        border-radius: 0;
                        border: none;
                        box-shadow: none;
                        padding-top: 1rem;
                        padding-bottom: 6.6rem;
                    }

                    .screen-title {
                        font-size: 1.9rem;
                    }
                }
            </style>
            """
        ),
        unsafe_allow_html=True,
    )


def render_welcome_screen() -> None:
    st.markdown(
        dedent(
            f"""
        <section class="hero-panel welcome-panel">
            <div class="welcome-logo">{logo_svg(88)}</div>
            <p class="eyebrow">E-App</p>
            <h1 class="screen-title">Willkommen beim Prototypen unserer E-App!</h1>
            <p class="screen-copy">
                Starte direkt in die Demo und teste die ersten rudimentären Funktionen.
            </p>
            {chips_html([
                "Zuhause messen",
                "Energie sparen",
                "Ergebnisse tracken",
            ])}
        </section>
        """
        ),
        unsafe_allow_html=True,
    )

    st.markdown(
        dedent(
            """
        <div class="panel-head">Direkt starten</div>
        <p class="welcome-note">Wenn du magst, gib nur deinen Namen an. Danach landest du sofort im ersten Testprototyp.</p>
        """
        ),
        unsafe_allow_html=True,
    )

    with st.form("demo-start"):
        name = st.text_input("Name", placeholder="Zum Beispiel Kilian")
        submitted = st.form_submit_button("Zur Demo starten", type="primary", use_container_width=True)

    if submitted:
        normalized_name = name.strip()
        st.session_state["demo_id"] = uuid4().hex
        st.session_state["demo_name"] = normalized_name or test_identity()["name"]
        sync_user_state()
        persist_current_user()
        replace_query_params(navigation_params(tab="fragebogen"))
        st.rerun()


def render_energycheck_header(identity: dict, questionnaire: dict, test_mode: bool = False) -> None:
    st.markdown(
        dedent(
            f"""
        <div class="topbar">
            <div class="topbar-logo">{logo_svg(54)}</div>
            <div class="topbar-copy">
                <p class="topbar-kicker">Energiecheck</p>
                <h1 class="screen-title">Hallo {esc(first_name(identity))}</h1>
                <p>
                    Beginne mit dem Onboarding deiner Wohnung!
                </p>
            </div>
        </div>
        {chips_html(summary_chips(questionnaire))}
        """
        ),
        unsafe_allow_html=True,
    )

    st.markdown(
        """
        <div class="section-panel">
            <div class="panel-head">Erste Demo</div>
            <p class="screen-copy">
                Diese Version ist bewusst einfach: unten zwischen Fragebogen, Messungen
                und Report wechseln, Werte eintragen und den Duschkopftest direkt testen.
            </p>
        </div>
        """,
        unsafe_allow_html=True,
    )

    left, right = st.columns(2)
    with left:
        if st.button("Zum Duschkopftest", type="primary", use_container_width=True):
            open_test_measurement()
    with right:
        if st.button("Name aendern", use_container_width=True):
            logout_current_user()

    reset_left, reset_right = st.columns(2)
    with reset_left:
        if st.button("Testdaten reset", use_container_width=True):
            reset_test_session()
    with reset_right:
        if st.button("Fragebogen starten", use_container_width=True):
            st.session_state["active_tab"] = "fragebogen"
            replace_query_params(navigation_params(tab="fragebogen"))
            st.rerun()


def render_questionnaire_tab(user_data: dict) -> None:
    questionnaire = user_data["questionnaire"]
    filled, total = questionnaire_completion(questionnaire)

    st.markdown(
        """
        <div class="panel-head">Fragebogen</div>
        <h2 class="screen-title">Grunddaten fuer bessere Empfehlungen</h2>
        <p class="screen-copy">
            Je genauer diese Angaben sind, desto glaubwuerdiger werden spaetere
            Hinweise, Fortschritte und die Einschaetzung in Euro.
        </p>
        """,
        unsafe_allow_html=True,
    )

    st.markdown(
        progress_bar_html("Profilstaerke", filled, total, "Basis fuer spaetere Hinweise und Einsparwerte"),
        unsafe_allow_html=True,
    )

    with st.form("questionnaire-form"):
        building_year = st.slider(
            "Baujahr des Gebaeudes",
            min_value=1850,
            max_value=2026,
            value=int(questionnaire["building_year"]),
        )
        property_type = st.radio(
            "Welcher Gebaeudeteil wird betrachtet?",
            options=["Wohnung", "Haus"],
            horizontal=True,
            index=0 if questionnaire["property_type"] == "Wohnung" else 1,
        )
        sqm = st.number_input(
            "Wie gross ist die Flaeche in m2?",
            min_value=15,
            max_value=1000,
            value=int(questionnaire["sqm"]),
            step=1,
        )
        rooms = st.multiselect(
            "Welche Zimmer gibt es?",
            options=ROOM_OPTIONS,
            default=questionnaire["rooms"],
        )
        heat_generators = st.multiselect(
            "Welche Waermeerzeuger sind vorhanden?",
            options=HEAT_GENERATOR_OPTIONS,
            default=questionnaire["heat_generators"],
        )
        heat_distribution = st.multiselect(
            "Wie wird die Waerme uebertragen?",
            options=HEAT_TRANSFER_OPTIONS,
            default=questionnaire["heat_distribution"],
        )
        household_size = st.number_input(
            "Wie viele Personen leben im Haushalt?",
            min_value=1,
            max_value=12,
            value=int(questionnaire["household_size"]),
            step=1,
        )
        submitted = st.form_submit_button("Angaben speichern", type="primary", use_container_width=True)

    if submitted:
        user_data["questionnaire"] = {
            "building_year": int(building_year),
            "property_type": property_type,
            "sqm": int(sqm),
            "rooms": rooms,
            "heat_generators": heat_generators,
            "heat_distribution": heat_distribution,
            "household_size": int(household_size),
        }
        st.session_state["user_data"] = user_data
        persist_current_user()
        set_flash("success", "Deine Basisdaten sind gespeichert.")
        st.rerun()


def render_measurements_overview(user_data: dict) -> None:
    completed, total_active = active_measurement_progress(user_data)
    latest_attempt = latest_warmwater_attempt(user_data)

    st.markdown(
        """
        <div class="panel-head">Messungen</div>
        <h2 class="screen-title">Kacheln fuer deine ersten Gewerke</h2>
        <p class="screen-copy">
            Jede Kachel steht fuer ein Gewerk. Warmwasser ist bereits klickbar und
            fuehrt direkt zum Duschkopftest. Die anderen Kacheln bleiben vorerst Platzhalter.
        </p>
        """,
        unsafe_allow_html=True,
    )

    st.markdown(
        progress_bar_html("Gesamtfortschritt", completed, total_active, "aktive Tests in deiner App"),
        unsafe_allow_html=True,
    )

    if latest_attempt:
        st.markdown(
            metric_grid_html(
                [
                    ("Letzter Warmwasserwert", f"{latest_attempt['flow_lpm']} L/min"),
                    (
                        "Sparpotenzial",
                        format_euro(latest_attempt["estimated_savings_eur"])
                        if latest_attempt["estimated_savings_eur"] > 0
                        else "aktuell eher klein",
                    ),
                ]
            ),
            unsafe_allow_html=True,
        )

    st.markdown(measurement_tiles_html(user_data), unsafe_allow_html=True)
    st.caption("Aktuell ist nur Warmwasser aktiv. Heizung, Strom und Wasser bleiben sichtbar, sind aber noch nicht anklickbar.")


def render_warmwater_detail(user_data: dict) -> None:
    questionnaire = user_data["questionnaire"]
    completed, total = warmwater_sector_progress(user_data)
    latest_attempt = latest_warmwater_attempt(user_data)

    st.markdown(
        f'<a class="inline-link" href="{build_href(tab="messungen")}">Zurueck zur Messungsuebersicht</a>',
        unsafe_allow_html=True,
    )

    st.markdown(
        """
        <div class="panel-head">Warmwasser</div>
        <h2 class="screen-title">Duschkopftest</h2>
        <p class="screen-copy">
            Der Test soll schnell gehen: Eimer fuellen, Zeit stoppen, Werte eintragen.
            Danach bekommst du sofort eine Einordnung und ein erstes Sparpotenzial.
        </p>
        """,
        unsafe_allow_html=True,
    )

    st.markdown(
        progress_bar_html("Warmwasser-Fortschritt", completed, total, "aktive Tests in diesem Gewerk"),
        unsafe_allow_html=True,
    )

    st.markdown(
        """
        <div class="test-steps">
            <span class="step-chip">1. Markiere etwa 5 Liter an einem Eimer oder Messbehaelter.</span>
            <span class="step-chip">2. Stelle den Duschkopf auf deine uebliche Stellung und stoppe die Zeit bis zur Markierung.</span>
            <span class="step-chip">3. Trage Fuellmenge und Zeit ein. Bei Auffaelligkeiten misst du nach der Anpassung einfach erneut.</span>
        </div>
        """,
        unsafe_allow_html=True,
    )

    filled, total_fields = questionnaire_completion(questionnaire)
    if filled < total_fields:
        st.info(
            "Du kannst den Test schon starten. Die Einschaetzung in Euro wird noch genauer, "
            "sobald dein Fragebogen vollstaendig ist."
        )

    with st.form("warmwater-form"):
        volume_liters = st.number_input(
            "Fuellmenge in Litern",
            min_value=1.0,
            max_value=12.0,
            value=float(latest_attempt["volume_liters"]) if latest_attempt else TARGET_BUCKET_LITERS,
            step=0.1,
        )
        time_seconds = st.number_input(
            "Zeit in Sekunden",
            min_value=1.0,
            max_value=180.0,
            value=float(latest_attempt["time_seconds"]) if latest_attempt else 30.0,
            step=0.5,
        )
        submitted = st.form_submit_button("Duschkopftest speichern", type="primary", use_container_width=True)

    if submitted:
        evaluation = evaluate_shower_test(float(volume_liters), float(time_seconds))
        savings = estimate_shower_savings(questionnaire, evaluation["flow_lpm"])
        attempt = {
            "volume_liters": round(float(volume_liters), 1),
            "time_seconds": round(float(time_seconds), 1),
            "flow_lpm": evaluation["flow_lpm"],
            "estimated_savings_eur": savings,
            "evaluation": evaluation,
            "measured_at": datetime.now().strftime("%d.%m.%Y %H:%M"),
        }

        user_data["measurements"]["warmwater"]["attempts"].append(attempt)
        user_data["measurements"]["warmwater"]["completed"] = True
        st.session_state["user_data"] = user_data
        persist_current_user()
        set_flash("success", "Dein Duschkopftest wurde gespeichert.")
        st.rerun()

    latest_attempt = latest_warmwater_attempt(st.session_state["user_data"])
    if latest_attempt:
        st.markdown(warmwater_result_card(latest_attempt), unsafe_allow_html=True)
    else:
        st.markdown(
            empty_state_html(
                "Noch keine Messung gespeichert",
                "Sobald du den ersten Duschkopftest eintraegst, erscheint hier direkt die Einordnung.",
            ),
            unsafe_allow_html=True,
        )


def render_measurements_tab(user_data: dict) -> None:
    if st.session_state["active_measurement"] == "warmwasser":
        render_warmwater_detail(user_data)
        return

    render_measurements_overview(user_data)


def render_results_tab(user_data: dict) -> None:
    questionnaire = user_data["questionnaire"]
    filled, total_fields = questionnaire_completion(questionnaire)
    completed_tests, total_tests = active_measurement_progress(user_data)
    latest_attempt = latest_warmwater_attempt(user_data)

    st.markdown(
        """
        <div class="panel-head">Report</div>
        <h2 class="screen-title">Deine ersten Hinweise auf einen Blick</h2>
        <p class="screen-copy">
            Hier laufen Profil, Messung und moegliches Sparpotenzial zusammen.
            So wirkt die App nicht wie ein Datenformular, sondern wie ein klarer Begleiter.
        </p>
        """,
        unsafe_allow_html=True,
    )

    if not latest_attempt:
        st.markdown(
            empty_state_html(
                "Es fehlt noch mindestens eine Messung.",
                "Starte zuerst den Duschkopftest. Danach erscheint hier die erste Handlungsempfehlung.",
                href=build_href(tab="messungen", measurement="warmwasser"),
                label="Zum Duschkopftest",
            ),
            unsafe_allow_html=True,
        )
        return

    savings_value = (
        format_euro(latest_attempt["estimated_savings_eur"])
        if latest_attempt["estimated_savings_eur"] > 0
        else "aktuell gering"
    )
    st.markdown(
        metric_grid_html(
            [
                ("Profilstaerke", f"{filled}/{total_fields} Angaben"),
                ("Aktive Tests", f"{completed_tests}/{total_tests} abgeschlossen"),
                ("Moegliche Einsparung", savings_value),
                ("Letzter Warmwasserwert", f"{latest_attempt['flow_lpm']} L/min"),
            ]
        ),
        unsafe_allow_html=True,
    )

    st.markdown(warmwater_result_card(latest_attempt), unsafe_allow_html=True)

    st.markdown(
        dedent(
            f"""
        <div class="section-panel">
            <div class="panel-head">Grundlage der Einschaetzung</div>
            <p class="screen-copy">
                Die Euro-Schaetzung kombiniert deinen letzten Warmwasserwert mit Haushalt,
                Gebaeudetyp und Heizsystem aus dem Fragebogen. Sie ist bewusst als erste,
                leicht verstaendliche Orientierung gedacht.
            </p>
            {chips_html(summary_chips(questionnaire))}
        </div>
        """
        ),
        unsafe_allow_html=True,
    )


def render_bottom_nav(active_tab: str) -> None:
    links = [
        ("fragebogen", "Fragebogen"),
        ("messungen", "Messungen"),
        ("auswertung", "Report"),
    ]
    html_links = []
    for tab_id, label in links:
        active_class = " active" if active_tab == tab_id else ""
        html_links.append(
            f'<a class="nav-link{active_class}" href="{build_href(tab=tab_id)}">{esc(label)}</a>'
        )

    st.markdown(f'<nav class="nav-shell">{"".join(html_links)}</nav>', unsafe_allow_html=True)


def render_energycheck(identity: dict, user_data: dict, test_mode: bool = False) -> None:
    render_energycheck_header(identity, user_data["questionnaire"], test_mode=test_mode)
    render_flash()

    active_tab = st.session_state["active_tab"]
    if active_tab == "fragebogen":
        render_questionnaire_tab(user_data)
    elif active_tab == "messungen":
        render_measurements_tab(user_data)
    else:
        render_results_tab(user_data)

    render_bottom_nav(active_tab)

def run_app(test_mode: bool = False) -> None:
    ensure_state(test_mode=test_mode)
    if test_mode and not st.session_state.get("demo_id"):
        st.session_state["demo_id"] = "test-mode"
    if test_mode and not st.session_state.get("demo_name"):
        st.session_state["demo_name"] = test_identity()["name"]
    identity = sync_user_state()
    apply_navigation_from_query(identity is not None)
    inject_styles()

    if identity is None:
        render_welcome_screen()
    else:
        render_energycheck(identity, st.session_state["user_data"], test_mode=test_mode)


def run_test_app() -> None:
    run_app(test_mode=True)


if __name__ == "__main__":
    run_app()
