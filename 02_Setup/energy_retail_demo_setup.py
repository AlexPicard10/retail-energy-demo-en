#!/usr/bin/env python3
"""
Energy Retail Demo — Setup Script
===================================
Generates synthetic energy retail data (French electricity utility) and uploads
it to a Databricks UC volume for a Genie Code workshop covering Data Engineering,
Data Science (customer consumption classification), and Analytics.

Usage:
    python3 energy_retail_demo_setup.py --profile <PROFILE> --catalog <CATALOG>
    python3 energy_retail_demo_setup.py --profile <PROFILE> --catalog <CATALOG> --check
    python3 energy_retail_demo_setup.py --profile <PROFILE> --catalog <CATALOG> --teardown

Prerequisites:
    pip install polars mimesis numpy databricks-sdk
"""

import argparse
import json
import os
import sys
import tempfile
import time
from datetime import date, datetime, timedelta

import numpy as np
import polars as pl
from mimesis import Address, Person, Text
from mimesis.locales import Locale

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
SCHEMA = "energy_retail_demo"
VOLUME_NAME = "raw_data"

N_CUSTOMERS = 10_000
N_TARIFF_PLANS = 11
N_INTERACTIONS = 30_000

# Consumption volume targets:
# - 10,000 customers x 365 daily = 3,650k
# Schema is intentionally minimal — one daily reading per customer per day, no
# peak/off_peak split column. The peak signal lives in raw_billing (peak_kwh
# vs off_peak_kwh per bill) and that's where the gold layer pulls it from. If
# we expose peak_off_peak here, VDP's NL flow tends to filter on it and drop
# customers without matching rows, blanking out avg_daily_kwh.

END_DATE = date(2025, 12, 31)
START_DATE = END_DATE - timedelta(days=364)  # Full year: 2025-01-01 to 2025-12-31
SEED = 42

# ---------------------------------------------------------------------------
# Customer distributions
# ---------------------------------------------------------------------------
CUSTOMER_TYPES = ["residential", "commercial"]
CUSTOMER_TYPE_WEIGHTS = [0.85, 0.15]

CONTRACT_TYPES = ["regulated_tariff", "market_offer_fixed", "market_offer_indexed", "green_offer"]
CONTRACT_WEIGHTS = [0.35, 0.25, 0.25, 0.15]

METER_TYPES = ["linky_smart", "legacy_electromechanical", "legacy_electronic"]
METER_WEIGHTS = [0.65, 0.25, 0.10]

REGIONS = [
    "Ile-de-France", "Auvergne-Rhone-Alpes", "Nouvelle-Aquitaine",
    "Occitanie", "Hauts-de-France", "Provence-Alpes-Cote-d-Azur",
    "Grand-Est", "Pays-de-la-Loire", "Bretagne", "Normandie",
    "Bourgogne-Franche-Comte", "Centre-Val-de-Loire", "Corse",
]
REGION_WEIGHTS = [0.19, 0.12, 0.09, 0.09, 0.09, 0.08, 0.08, 0.06, 0.05, 0.05, 0.04, 0.04, 0.02]

# Southern regions: less heating in winter, more AC in summer
SOUTHERN_REGIONS = {"Provence-Alpes-Cote-d-Azur", "Occitanie", "Corse"}

SUBSCRIBED_POWER_KVA = [3, 6, 9, 12, 15, 18, 24, 30, 36]
POWER_WEIGHTS_RESIDENTIAL = [0.05, 0.35, 0.30, 0.15, 0.08, 0.04, 0.02, 0.005, 0.005]
POWER_WEIGHTS_COMMERCIAL = [0.00, 0.05, 0.10, 0.15, 0.20, 0.20, 0.15, 0.10, 0.05]

DWELLING_TYPES_RESIDENTIAL = ["apartment", "house"]
DWELLING_WEIGHTS_RESIDENTIAL = [0.55, 0.45]

HEATING_TYPES = ["electric", "gas", "heat_pump", "other"]
HEATING_WEIGHTS = [0.40, 0.35, 0.15, 0.10]

# Household size distribution (residential customers)
HOUSEHOLD_SIZES = [1, 2, 3, 4, 5, 6]
HOUSEHOLD_WEIGHTS = [0.32, 0.30, 0.18, 0.12, 0.05, 0.03]

# Appliance / green-energy prevalence (overall residential rates; further filtered in gen_customers)
EV_CHARGER_RATE = 0.12       # ~12% of houses with sufficient power
SOLAR_PANEL_RATE = 0.08      # ~8% of houses; skewed toward southern regions
SOUTHERN_SOLAR_BOOST = 1.8   # multiplier on base rate for SOUTHERN_REGIONS

# Consumption anomalies — gives K-Means and Genie something surprising to find
ANOMALY_RATE = 0.05          # ~5% of customers carry an anomaly pattern
ANOMALY_TYPES = ["spike", "flatline"]
ANOMALY_TYPE_WEIGHTS = [0.55, 0.45]

# ---------------------------------------------------------------------------
# Target consumption profiles
# ---------------------------------------------------------------------------
# Every residential customer is pre-assigned ONE of these three profiles, and
# the consumption + billing generation is driven by per-profile parameters so
# K-Means can recover three cleanly separable clusters. Commercial customers
# default to peak_heavy (their daytime/weekday pattern naturally matches).
#
# The label is written to raw_customers.target_profile — useful as a ground
# truth column to verify cluster recovery (cluster_id ↔ target_profile cross
# tab), and the prompts instruct the agent to ignore it during clustering.
TARGET_PROFILES = ["peak_heavy", "seasonal_spiker", "green_saver"]
TARGET_PROFILE_WEIGHTS = [0.34, 0.33, 0.33]

# Per-profile parameters:
#   base_daily_multiplier — (lo, hi) uniform range applied to baseline kWh/day
#   seasonal_amplitude    — multiplier on the (seasonal_factor − 1) deviation,
#                           so > 1 amplifies winter/summer swing, < 1 flattens
#   peak_fraction         — fraction of billed kWh attributed to peak hours
#                           (drives peak_consumption_pct downstream)
PROFILE_PARAMS = {
    "peak_heavy": {
        "base_daily_multiplier": (1.7, 2.4),
        "seasonal_amplitude": 1.0,
        "peak_fraction": 0.83,
    },
    "seasonal_spiker": {
        "base_daily_multiplier": (0.85, 1.30),
        "seasonal_amplitude": 2.0,
        "peak_fraction": 0.62,
    },
    "green_saver": {
        "base_daily_multiplier": (0.35, 0.55),
        "seasonal_amplitude": 0.9,
        "peak_fraction": 0.50,
    },
}

# Payment status distribution per profile — green savers pay very reliably,
# the other two profiles miss bills more often. Drives payment_reliability_pct.
PAYMENT_WEIGHTS_BY_PROFILE = {
    "peak_heavy":      [0.80, 0.10, 0.07, 0.03],   # [paid, pending, overdue, partial]
    "seasonal_spiker": [0.80, 0.10, 0.07, 0.03],
    "green_saver":     [0.97, 0.02, 0.005, 0.005],
}

# ---------------------------------------------------------------------------
# Consumption patterns
# ---------------------------------------------------------------------------
# Monthly seasonal multiplier (France climate — heating-driven)
MONTHLY_CONSUMPTION_MULTIPLIER = {
    1: 1.80, 2: 1.65, 3: 1.35, 4: 1.05, 5: 0.85, 6: 0.80,
    7: 0.90, 8: 0.85, 9: 0.90, 10: 1.10, 11: 1.45, 12: 1.75,
}

# Winter months where electric heating amplifies consumption
WINTER_MONTHS = {11, 12, 1, 2}

# Heating type winter amplification factor
HEATING_WINTER_BOOST = {
    "electric": 1.50,
    "heat_pump": 1.20,
    "gas": 1.05,
    "other": 1.10,
}

# ---------------------------------------------------------------------------
# Billing
# ---------------------------------------------------------------------------
PAYMENT_STATUSES = ["paid", "pending", "overdue", "partial"]
# Recent-bill bias: months 10-12 are more likely 'pending' (still in clearing
# window) — applied on top of the per-profile reliability.
RECENT_BILL_PENDING_LIFT = 0.25

TVA_RATE = 0.20  # 20% French VAT on electricity

# ---------------------------------------------------------------------------
# Interactions
# ---------------------------------------------------------------------------
INTERACTION_CHANNELS = ["phone", "email", "online_portal", "mobile_app", "in_person"]
INTERACTION_CHANNEL_WEIGHTS = [0.30, 0.25, 0.25, 0.15, 0.05]

INTERACTION_TYPES = ["complaint", "inquiry", "feedback"]
INTERACTION_TYPE_WEIGHTS = [0.30, 0.45, 0.25]

INTERACTION_CATEGORIES = {
    "complaint": ["outage", "billing_dispute", "meter_issue", "voltage_quality", "estimated_reading"],
    "inquiry": ["tariff_change", "meter_installation", "contract_info", "consumption_question", "moving"],
    "feedback": ["positive_experience", "app_feedback", "service_review", "green_energy_comment", "general"],
}

COMPLAINT_KEYWORDS = {
    "outage": ["power cut", "no electricity", "blackout", "grid failure", "unplanned outage"],
    "billing_dispute": ["overcharged", "wrong amount", "estimated bill", "double billed", "tariff error"],
    "meter_issue": ["faulty meter", "linky problem", "meter not working", "wrong reading", "meter replacement"],
    "voltage_quality": ["voltage drop", "flickering lights", "power surge", "unstable supply", "low voltage"],
    "estimated_reading": ["estimated consumption", "no actual reading", "meter not read", "reading dispute", "consumption spike"],
}

INQUIRY_KEYWORDS = {
    "tariff_change": ["change plan", "switch tariff", "better offer", "heures creuses", "green option"],
    "meter_installation": ["linky installation", "smart meter", "appointment", "meter upgrade", "installation date"],
    "contract_info": ["contract details", "renewal", "commitment period", "termination", "conditions"],
    "consumption_question": ["high consumption", "consumption increase", "energy savings", "consumption history", "peak hours"],
    "moving": ["new address", "transfer contract", "moving out", "connection", "disconnection"],
}

FEEDBACK_KEYWORDS = {
    "positive_experience": ["excellent service", "very satisfied", "quick response", "helpful staff", "great support"],
    "app_feedback": ["easy to use", "app improvement", "mobile app", "user interface", "new feature"],
    "service_review": ["professional", "efficient", "reliable", "good communication", "on time"],
    "green_energy_comment": ["renewable energy", "solar", "green tariff", "carbon footprint", "sustainability"],
    "general": ["overall experience", "recommendation", "loyal customer", "good value", "satisfied"],
}

# Short SMS / tweet-style French messages, grouped by interaction.category.
# Picking the template from the chosen category keeps raw_message coherent
# with interaction.category, sentiment.label and keywords. The pool is kept
# small on purpose (~70 unique strings × a few placeholder variants) so the
# DISTINCT optimization in the AI step is still meaningful (~150x compression
# on 15,000 generated rows) while looking realistic.
TEMPLATES_BY_CATEGORY = {
    # ---- complaint ----
    "outage": [
        "Coupure de courant, c'est inadmissible.",
        "Plus d'electricite depuis {duration}.",
        "Coupures a repetition dans mon quartier.",
        "Pas de courant ce matin, c'est genant.",
        "Coupure soudaine sans prevenir, on fait comment ?",
    ],
    "billing_dispute": [
        "Ma facture est anormalement elevee ce mois-ci.",
        "Montant facture incorrect, je veux une verification.",
        "Je conteste cette facture, c'est trop cher.",
        "J'ai ete preleve deux fois, c'est une erreur.",
        "Facture de {amount} euros, c'est beaucoup trop.",
    ],
    "meter_issue": [
        "Le compteur Linky est en panne.",
        "Mon compteur ne s'affiche plus.",
        "Erreur sur le releve de mon compteur.",
        "Probleme d'affichage sur le compteur.",
        "Le Linky bipe sans arret, intervention svp.",
    ],
    "voltage_quality": [
        "Mon installation subit des micro-coupures.",
        "Tension instable, mes appareils en souffrent.",
        "Sautes de courant frequentes.",
        "Lumieres qui clignotent en permanence.",
    ],
    "estimated_reading": [
        "Vous avez fait une estimation, je veux un vrai releve.",
        "Le releve n'a pas ete fait, encore une estimation.",
        "Estimation trop haute par rapport a ma consommation.",
        "Pourquoi un releve estime alors que mon compteur est lisible ?",
    ],
    # ---- inquiry ----
    "tariff_change": [
        "Je voudrais changer pour l'offre heures creuses.",
        "Quels sont vos tarifs verts ?",
        "Comment passer a l'offre fixe ?",
        "Je voudrais comparer vos offres.",
        "Une offre adaptee pour une voiture electrique ?",
    ],
    "meter_installation": [
        "Quand est prevue l'installation Linky chez moi ?",
        "Comment se passe la pose du Linky ?",
        "Je voudrais un rendez-vous pour l'installation.",
        "Combien de temps pour l'installation du compteur ?",
        "Mon Linky n'est pas encore installe.",
    ],
    "contract_info": [
        "Quelles sont les conditions de mon contrat ?",
        "Comment resilier mon contrat ?",
        "Quelle est la duree d'engagement ?",
        "Renouvellement de mon contrat, comment faire ?",
        "Pouvez-vous m'envoyer mes conditions generales ?",
    ],
    "consumption_question": [
        "Pouvez-vous m'expliquer ma facture du mois de {month} ?",
        "Pourquoi ma consommation a-t-elle augmente ?",
        "Comment reduire ma consommation ?",
        "Quels sont mes pics de consommation ?",
        "Puis-je reduire ma puissance souscrite a {power} kVA ?",
    ],
    "moving": [
        "Je demenage, comment transferer mon contrat ?",
        "Mise en service a ma nouvelle adresse ?",
        "Cloture de mon contrat pour demenagement.",
        "Combien de temps pour activer le compteur a mon nouveau logement ?",
        "Demenagement en cours, je veux garder mes habitudes de consommation.",
    ],
    # ---- feedback ----
    "positive_experience": [
        "Service client au top, merci !",
        "Tres satisfait de mon nouveau contrat.",
        "Reponse rapide a ma demande, bravo.",
        "Equipe a l'ecoute, je recommande.",
    ],
    "app_feedback": [
        "Application mobile tres pratique.",
        "L'appli est claire et intuitive.",
        "Bug sur l'app a corriger, sinon nickel.",
        "L'application m'aide a suivre ma consommation.",
    ],
    "service_review": [
        "Intervention rapide du technicien, bravo.",
        "Technicien tres pro, merci.",
        "Service apres-vente reactif.",
        "Tres bon contact avec le conseiller.",
    ],
    "green_energy_comment": [
        "Heureux d'etre passe au tarif vert.",
        "Bonne demarche ecologique, je continue avec vous.",
        "L'energie verte est un vrai plus.",
        "Je soutiens votre transition energetique.",
    ],
    "general": [
        "Bon rapport qualite-prix sur mon offre.",
        "Je recommande votre service.",
        "Client depuis {years} ans, toujours satisfait.",
        "Globalement, je suis content de votre service.",
    ],
}

TEMPLATE_FILLS = {
    "duration": ["ce matin", "2h", "5h", "depuis hier"],
    "power": ["6", "9", "12"],
    "amount": ["340", "420", "510"],
    "month": ["janvier", "fevrier", "mars", "decembre"],
    "years": ["3", "5", "8"],
}

RESOLUTION_ACTIONS = [
    "service_restoration", "bill_adjustment", "meter_replacement",
    "technician_dispatch", "tariff_correction", "escalation", "apology_credit",
]
RESOLUTION_STATUSES = ["resolved", "pending", "escalated"]
DEVICES = ["mobile", "desktop", "tablet"]
BROWSERS = ["chrome", "safari", "firefox", "edge"]

# ---------------------------------------------------------------------------
# Tariff plan definitions (hardcoded — realistic French pricing)
# ---------------------------------------------------------------------------
TARIFF_PLANS = [
    {
        "plan_id": "PLAN-01", "name": "Tarif Bleu Regulee",
        "peak_rate_eur_kwh": 0.2516, "off_peak_rate_eur_kwh": 0.1568,
        "standing_charge_eur_month": 12.44, "green_energy_pct": 0, "plan_type": "regulated_tariff",
    },
    {
        "plan_id": "PLAN-02", "name": "Offre Verte Essentielle",
        "peak_rate_eur_kwh": 0.2680, "off_peak_rate_eur_kwh": 0.1650,
        "standing_charge_eur_month": 11.00, "green_energy_pct": 100, "plan_type": "green_offer",
    },
    {
        "plan_id": "PLAN-03", "name": "Offre Fixe 24 Mois",
        "peak_rate_eur_kwh": 0.2450, "off_peak_rate_eur_kwh": 0.1520,
        "standing_charge_eur_month": 13.50, "green_energy_pct": 0, "plan_type": "market_offer_fixed",
    },
    {
        "plan_id": "PLAN-04", "name": "Offre Indexee Flex",
        "peak_rate_eur_kwh": 0.2400, "off_peak_rate_eur_kwh": 0.1480,
        "standing_charge_eur_month": 10.50, "green_energy_pct": 0, "plan_type": "market_offer_indexed",
    },
    {
        "plan_id": "PLAN-05", "name": "Offre Verte Premium",
        "peak_rate_eur_kwh": 0.2800, "off_peak_rate_eur_kwh": 0.1750,
        "standing_charge_eur_month": 14.00, "green_energy_pct": 100, "plan_type": "green_offer",
    },
    {
        "plan_id": "PLAN-06", "name": "Offre Heures Creuses Plus",
        "peak_rate_eur_kwh": 0.2600, "off_peak_rate_eur_kwh": 0.1350,
        "standing_charge_eur_month": 12.00, "green_energy_pct": 0, "plan_type": "market_offer_fixed",
    },
    {
        "plan_id": "PLAN-07", "name": "Offre Eco Pro",
        "peak_rate_eur_kwh": 0.2200, "off_peak_rate_eur_kwh": 0.1400,
        "standing_charge_eur_month": 18.00, "green_energy_pct": 50, "plan_type": "market_offer_fixed",
    },
    {
        "plan_id": "PLAN-08", "name": "Offre Solaire",
        "peak_rate_eur_kwh": 0.2550, "off_peak_rate_eur_kwh": 0.1600,
        "standing_charge_eur_month": 13.00, "green_energy_pct": 75, "plan_type": "green_offer",
    },
    {
        # FLAT tariff — single rate. Worst case for off-peak-heavy customers
        # (Night Owls) and the headline upsell target in the demo.
        "plan_id": "PLAN-09", "name": "Offre Entreprise Standard",
        "peak_rate_eur_kwh": 0.2100, "off_peak_rate_eur_kwh": 0.2100,
        "standing_charge_eur_month": 25.00, "green_energy_pct": 0, "plan_type": "market_offer_fixed",
    },
    {
        "plan_id": "PLAN-10", "name": "Offre Weekend Avantage",
        "peak_rate_eur_kwh": 0.2700, "off_peak_rate_eur_kwh": 0.1200,
        "standing_charge_eur_month": 11.50, "green_energy_pct": 0, "plan_type": "market_offer_indexed",
    },
    {
        # FLAT residential tariff (near-flat — off_peak rate ~ peak rate).
        # Pairs with PLAN-09 to give the demo a non-empty upsell list of
        # Night Owls who would benefit from switching to a tiered plan.
        "plan_id": "PLAN-11", "name": "Tarif Unique Confort",
        "peak_rate_eur_kwh": 0.2200, "off_peak_rate_eur_kwh": 0.2150,
        "standing_charge_eur_month": 11.50, "green_energy_pct": 0, "plan_type": "market_offer_fixed",
    },
]

# Map contract types to eligible plans
CONTRACT_TO_PLANS = {
    "regulated_tariff": ["PLAN-01"],
    "market_offer_fixed": ["PLAN-03", "PLAN-06", "PLAN-07", "PLAN-09", "PLAN-11"],
    "market_offer_indexed": ["PLAN-04", "PLAN-10"],
    "green_offer": ["PLAN-02", "PLAN-05", "PLAN-08"],
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

class Colors:
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    RED = "\033[91m"
    BLUE = "\033[94m"
    BOLD = "\033[1m"
    RESET = "\033[0m"


def ok(msg):
    print(f"  {Colors.GREEN}\u2713{Colors.RESET} {msg}")


def warn(msg):
    print(f"  {Colors.YELLOW}\u26a0{Colors.RESET} {msg}")


def fail(msg):
    print(f"  {Colors.RED}\u2717{Colors.RESET} {msg}")


def info(msg):
    print(f"  {Colors.BLUE}\u2192{Colors.RESET} {msg}")


def header(msg):
    print(f"\n{Colors.BOLD}{msg}{Colors.RESET}")
    print("\u2500" * len(msg))


def get_workspace_client(profile=None):
    try:
        from databricks.sdk import WorkspaceClient
        if profile:
            info(f"Using Databricks profile: {profile}")
            return WorkspaceClient(profile=profile)
        return WorkspaceClient()
    except ImportError:
        fail("databricks-sdk not installed. Run: pip install databricks-sdk")
        sys.exit(1)
    except Exception as e:
        fail(f"Cannot connect to Databricks workspace: {e}")
        sys.exit(1)


def _seasonal_factor(month, heating_type, region):
    """Compute the seasonal consumption multiplier for a given month/heating/region."""
    base = MONTHLY_CONSUMPTION_MULTIPLIER[month]
    # Winter heating boost
    if month in WINTER_MONTHS:
        base *= HEATING_WINTER_BOOST.get(heating_type, 1.0)
    # Southern region climate adjustment
    if region in SOUTHERN_REGIONS:
        if month in WINTER_MONTHS:
            base *= 0.85  # milder winters
        elif month in {6, 7, 8}:
            base *= 1.10  # more AC
    return base


# ---------------------------------------------------------------------------
# Data Generation
# ---------------------------------------------------------------------------

def gen_tariff_plans() -> pl.DataFrame:
    """Return the 10 hardcoded tariff plans as a DataFrame."""
    header("Generating raw_tariff_plans")
    df = pl.DataFrame(TARIFF_PLANS)
    ok(f"{len(df)} tariff plans generated")
    return df


def gen_customers(rng: np.random.Generator) -> pl.DataFrame:
    """Generate raw_customers with French locale and energy-specific attributes."""
    header("Generating raw_customers")
    person = Person(locale=Locale.FR, seed=SEED)
    address = Address(locale=Locale.FR, seed=SEED)

    first_names = [person.first_name() for _ in range(N_CUSTOMERS)]
    last_names = [person.last_name() for _ in range(N_CUSTOMERS)]
    domains = ["gmail.com", "orange.fr", "free.fr", "sfr.fr", "laposte.net", "outlook.fr", "yahoo.fr"]

    emails = [
        f"{fn.lower()}.{ln.lower()}{i}@{rng.choice(domains)}"
        for i, (fn, ln) in enumerate(zip(first_names, last_names))
    ]
    # Sanitize emails: remove accents for email addresses
    import unicodedata
    emails = [
        unicodedata.normalize("NFD", e).encode("ascii", "ignore").decode("ascii")
        for e in emails
    ]

    customer_types = rng.choice(CUSTOMER_TYPES, size=N_CUSTOMERS, p=CUSTOMER_TYPE_WEIGHTS).tolist()
    contract_types = rng.choice(CONTRACT_TYPES, size=N_CUSTOMERS, p=CONTRACT_WEIGHTS).tolist()

    # Assign tariff plan based on contract type
    tariff_plan_ids = [
        rng.choice(CONTRACT_TO_PLANS[ct]) for ct in contract_types
    ]

    # Subscribed power: depends on customer type
    subscribed_power = []
    for ct in customer_types:
        if ct == "commercial":
            subscribed_power.append(int(rng.choice(SUBSCRIBED_POWER_KVA, p=POWER_WEIGHTS_COMMERCIAL)))
        else:
            subscribed_power.append(int(rng.choice(SUBSCRIBED_POWER_KVA, p=POWER_WEIGHTS_RESIDENTIAL)))

    # Meter type: commercial customers 90% smart
    meter_types = []
    for ct in customer_types:
        if ct == "commercial":
            meter_types.append("linky_smart" if rng.random() < 0.90 else "legacy_electronic")
        else:
            meter_types.append(rng.choice(METER_TYPES, p=METER_WEIGHTS))

    regions = rng.choice(REGIONS, size=N_CUSTOMERS, p=REGION_WEIGHTS).tolist()
    cities = [address.city() for _ in range(N_CUSTOMERS)]

    # Signup dates: 3 years before START_DATE, beta-skewed toward recent
    signup_start = START_DATE - timedelta(days=1095)
    signup_days = (START_DATE - signup_start).days
    signup_offsets = rng.beta(2, 5, size=N_CUSTOMERS) * signup_days
    signup_dates = [signup_start + timedelta(days=int(d)) for d in signup_offsets]

    # Dwelling type
    dwelling_types = []
    for ct in customer_types:
        if ct == "commercial":
            dwelling_types.append("commercial_premises")
        else:
            dwelling_types.append(rng.choice(DWELLING_TYPES_RESIDENTIAL, p=DWELLING_WEIGHTS_RESIDENTIAL))

    heating_types = rng.choice(HEATING_TYPES, size=N_CUSTOMERS, p=HEATING_WEIGHTS).tolist()

    # --- Household size (residential only; commercial = 0) ---
    household_sizes: list[int] = []
    for ct in customer_types:
        if ct == "commercial":
            household_sizes.append(0)
        else:
            household_sizes.append(int(rng.choice(HOUSEHOLD_SIZES, p=HOUSEHOLD_WEIGHTS)))

    # --- EV charger: only houses with >=9 kVA can plausibly host one ---
    has_ev_charger: list[bool] = []
    for ct, dt, kva in zip(customer_types, dwelling_types, subscribed_power):
        eligible = ct == "residential" and dt == "house" and kva >= 9
        has_ev_charger.append(bool(eligible and rng.random() < EV_CHARGER_RATE))

    # --- Solar panels: residential houses only, biased toward southern regions ---
    has_solar_panels: list[bool] = []
    for ct, dt, region in zip(customer_types, dwelling_types, regions):
        if ct != "residential" or dt != "house":
            has_solar_panels.append(False)
            continue
        rate = SOLAR_PANEL_RATE * (SOUTHERN_SOLAR_BOOST if region in SOUTHERN_REGIONS else 1.0)
        has_solar_panels.append(bool(rng.random() < rate))

    # --- Anomaly flag (~5%): used by gen_consumption to inject realistic patterns ---
    anomaly_draw = rng.random(N_CUSTOMERS)
    anomaly_flag = (anomaly_draw < ANOMALY_RATE).tolist()
    anomaly_type = [
        str(rng.choice(ANOMALY_TYPES, p=ANOMALY_TYPE_WEIGHTS)) if flagged else ""
        for flagged in anomaly_flag
    ]

    # --- Target consumption profile (ground truth for cluster recovery) ---
    # Commercial customers map to peak_heavy (daytime/weekday-driven pattern);
    # residentials get one of the three profiles per the configured weights.
    target_profile = []
    for ctype in customer_types:
        if ctype == "commercial":
            target_profile.append("peak_heavy")
        else:
            target_profile.append(str(rng.choice(TARGET_PROFILES, p=TARGET_PROFILE_WEIGHTS)))

    # --- Baseline churn_risk_score (0..1) — bumped later by interactions in main() ---
    # Drivers: electric heating in winter regions, recent signup (less stickiness),
    # high subscribed power on regulated tariff (mismatch), plus noise.
    base = rng.beta(1.6, 5.0, size=N_CUSTOMERS)  # right-skewed, most customers low risk
    days_since_signup = np.array(
        [(START_DATE - sd).days for sd in signup_dates], dtype=float
    )
    recency_factor = np.clip(1.0 - days_since_signup / 1095.0, 0.0, 1.0)  # newer = higher
    heating_risk = np.array(
        [0.10 if h == "electric" else (0.05 if h == "heat_pump" else 0.0) for h in heating_types]
    )
    churn_risk_score = np.clip(base + 0.15 * recency_factor + heating_risk, 0.0, 1.0)
    churn_risk_score = np.round(churn_risk_score, 3).tolist()

    df = pl.DataFrame({
        "customer_id": [f"CUST-{i:05d}" for i in range(N_CUSTOMERS)],
        "first_name": first_names,
        "last_name": last_names,
        "email": emails,
        "customer_type": customer_types,
        "contract_type": contract_types,
        "tariff_plan_id": tariff_plan_ids,
        "subscribed_power_kva": subscribed_power,
        "meter_type": meter_types,
        "region": regions,
        "city": cities,
        "signup_date": signup_dates,
        "dwelling_type": dwelling_types,
        "heating_type": heating_types,
        "household_size": household_sizes,
        "has_ev_charger": has_ev_charger,
        "has_solar_panels": has_solar_panels,
        "anomaly_flag": anomaly_flag,
        "anomaly_type": anomaly_type,
        "churn_risk_score": churn_risk_score,
        "target_profile": target_profile,
    })
    profile_counts = {p: target_profile.count(p) for p in TARGET_PROFILES}
    ok(
        f"{len(df):,} customers generated · "
        f"{sum(anomaly_flag):,} anomaly · "
        f"{sum(has_ev_charger):,} EV · "
        f"{sum(has_solar_panels):,} solar"
    )
    info(
        "Target profiles: "
        + " · ".join(f"{p}={profile_counts[p]:,}" for p in TARGET_PROFILES)
    )
    return df


def gen_consumption(rng: np.random.Generator, customers_df: pl.DataFrame) -> pl.DataFrame:
    """Generate raw_consumption — one daily kWh reading per customer per day.

    Schema is deliberately flat: reading_id, customer_id, timestamp,
    kwh_consumed, meter_type. No peak/off_peak split, no reading_type
    discriminator. The peak signal lives in raw_billing (peak_kwh vs
    off_peak_kwh) where every customer has 12 bills — so the Gold layer
    derives peak_consumption_pct from there.

    This keeps the canvas simple: VDP just does GROUP BY customer_id on a
    single uniform table and avg_daily_kwh / weekend_ratio / seasonal_ratio
    fall out of date arithmetic on the timestamp column — no risk of
    silently dropping customers via a filter on a sparse column.
    """
    header("Generating raw_consumption")

    customer_ids = customers_df["customer_id"].to_list()
    customer_types = customers_df["customer_type"].to_list()
    heating_types = customers_df["heating_type"].to_list()
    regions = customers_df["region"].to_list()
    meter_types = customers_df["meter_type"].to_list()
    subscribed_power = customers_df["subscribed_power_kva"].to_list()
    anomaly_flags = customers_df["anomaly_flag"].to_list()
    anomaly_types = customers_df["anomaly_type"].to_list()
    target_profiles = customers_df["target_profile"].to_list()

    # Base daily consumption per customer (kWh)
    # Residential: ~1.5 kWh per kVA subscribed; Commercial: ~3.0 kWh per kVA
    base_daily = np.array([
        power * (3.0 if ctype == "commercial" else 1.5)
        for power, ctype in zip(subscribed_power, customer_types)
    ])
    # Per-customer random variation (lognormal)
    customer_factor = np.exp(rng.normal(0, 0.25, size=N_CUSTOMERS))
    base_daily = base_daily * customer_factor

    # Profile-driven multiplier — residentials get spread out across the three
    # target clusters; commercials keep their base (no extra boost since 3.0
    # kWh/kVA already puts them in peak_heavy territory).
    profile_multiplier = np.array([
        rng.uniform(*PROFILE_PARAMS[p]["base_daily_multiplier"]) if ct == "residential" else 1.0
        for ct, p in zip(customer_types, target_profiles)
    ])
    base_daily = base_daily * profile_multiplier

    # Build full day list
    all_days = []
    current = START_DATE
    while current <= END_DATE:
        all_days.append(current)
        current += timedelta(days=1)
    n_days = len(all_days)

    # Pre-compute seasonal factor per customer per month: (N_CUSTOMERS, 12)
    seasonal_matrix = np.array([
        [_seasonal_factor(m, heating_types[c], regions[c]) for m in range(1, 13)]
        for c in range(N_CUSTOMERS)
    ])

    # Apply profile-driven seasonal amplification: seasonal_spiker doubles the
    # winter/summer deviation around 1.0 (so seasonal_ratio downstream lands
    # ~3-4 vs ~2 for the other profiles); green_saver flattens it slightly.
    seasonal_amp = np.array([
        PROFILE_PARAMS[p]["seasonal_amplitude"] for p in target_profiles
    ])
    seasonal_matrix = 1.0 + (seasonal_matrix - 1.0) * seasonal_amp[:, np.newaxis]

    day_months = np.array([d.month - 1 for d in all_days])
    day_weekdays = np.array([d.weekday() for d in all_days])
    is_weekend = day_weekdays >= 5

    # Compute full daily_kwh matrix for ALL customers (needed for billing too)
    seasonal_per_day = seasonal_matrix[:, day_months]
    weekend_factor = np.ones((N_CUSTOMERS, n_days))
    is_commercial = np.array([ct == "commercial" for ct in customer_types])
    weekend_factor[is_commercial[:, None] & is_weekend[None, :]] = 0.40
    weekend_factor[(~is_commercial[:, None]) & is_weekend[None, :]] = 1.10

    daily_kwh = base_daily[:, np.newaxis] * seasonal_per_day * weekend_factor
    noise = rng.normal(1.0, 0.05, size=daily_kwh.shape)
    # Floor at 0.5 kWh/day so every customer averages > 0 even on the lightest
    # green_saver + low-power + commercial-weekend combo. Anomaly injection
    # below can still push a flatline window below this (down to 0.05).
    daily_kwh = np.clip(daily_kwh * noise, 0.5, None)

    # --- Inject anomalies (~5% of customers carry a spike or flatline pattern) ---
    n_spike = 0
    n_flat = 0
    for c_idx, (flagged, atype) in enumerate(zip(anomaly_flags, anomaly_types)):
        if not flagged:
            continue
        if atype == "spike":
            n_anom_days = int(rng.integers(2, 6))                     # 2-5 spike days
            spike_days = rng.choice(n_days, size=n_anom_days, replace=False)
            multiplier = float(rng.uniform(4.0, 8.0))
            daily_kwh[c_idx, spike_days] *= multiplier
            n_spike += 1
        elif atype == "flatline":
            window = int(rng.integers(3, 11))                          # 3-10 day window
            start = int(rng.integers(0, max(1, n_days - window)))
            daily_kwh[c_idx, start:start + window] = 0.05              # near-zero, stays >0 for the @dp.expect_or_drop check
            n_flat += 1

    daily_kwh = np.round(daily_kwh, 3)
    if n_spike + n_flat > 0:
        info(f"Injected anomalies: {n_spike} spike, {n_flat} flatline ({n_spike + n_flat:,} customers)")

    # --- Daily readings for ALL customers ---
    info(f"Generating daily readings for {N_CUSTOMERS:,} customers...")

    n_rows = N_CUSTOMERS * n_days
    customer_col = np.repeat(customer_ids, n_days).tolist()
    meter_col = np.repeat(meter_types, n_days).tolist()
    # Timestamp template: build the 365 day-anchored datetimes once, then
    # replicate the list reference N_CUSTOMERS times. Datetimes are immutable
    # so the list just holds N_CUSTOMERS×n_days references — memory stays flat.
    day_ts_template = [
        datetime(d.year, d.month, d.day, 0, 0, 0) for d in all_days
    ]
    timestamps = day_ts_template * N_CUSTOMERS

    combined = pl.DataFrame({
        "reading_id": [f"READ-{i:07d}" for i in range(n_rows)],
        "customer_id": customer_col,
        "timestamp": timestamps,
        "kwh_consumed": daily_kwh.ravel().tolist(),
        "meter_type": meter_col,
    })

    ok(f"{n_rows:,} daily readings (all customers)")
    return combined, daily_kwh, all_days


def gen_billing(
    rng: np.random.Generator,
    customers_df: pl.DataFrame,
    daily_kwh: np.ndarray,
    all_days: list,
) -> pl.DataFrame:
    """Generate raw_billing: 12 monthly bills per customer, consistent with consumption data."""
    header("Generating raw_billing")

    customer_ids = customers_df["customer_id"].to_list()
    tariff_plan_ids = customers_df["tariff_plan_id"].to_list()
    customer_types = customers_df["customer_type"].to_list()
    target_profiles = customers_df["target_profile"].to_list()

    # Build plan lookup
    plan_lookup = {p["plan_id"]: p for p in TARIFF_PLANS}

    # Group daily_kwh by month for each customer
    # daily_kwh shape: (N_CUSTOMERS, n_days)
    day_months = [d.month for d in all_days]

    # Pre-compute monthly totals per customer
    monthly_kwh = np.zeros((N_CUSTOMERS, 12))
    for d_idx, d in enumerate(all_days):
        m_idx = d.month - 1
        monthly_kwh[:, m_idx] += daily_kwh[:, d_idx]

    bill_rows = {
        "bill_id": [],
        "customer_id": [],
        "billing_period": [],
        "billing_start_date": [],
        "billing_end_date": [],
        "kwh_billed": [],
        "peak_kwh": [],
        "off_peak_kwh": [],
        "amount_ht_eur": [],
        "tax_eur": [],
        "amount_eur": [],
        "payment_status": [],
        "due_date": [],
        "payment_date": [],
    }

    bill_counter = 0
    for c in range(N_CUSTOMERS):
        plan = plan_lookup[tariff_plan_ids[c]]
        peak_rate = plan["peak_rate_eur_kwh"]
        off_peak_rate = plan["off_peak_rate_eur_kwh"]
        standing = plan["standing_charge_eur_month"]
        profile = target_profiles[c]

        # Peak/off-peak split — driven by the target consumption profile so
        # peak_consumption_pct downstream cleanly separates Peak Heavy (~0.83),
        # Seasonal Spiker (~0.62) and Green Saver (~0.50).
        peak_frac_base = PROFILE_PARAMS[profile]["peak_fraction"]
        # Per-bill noise so a customer's bills don't all share the exact same ratio
        peak_frac = float(np.clip(rng.normal(peak_frac_base, 0.025), 0.30, 0.95))

        # Payment status weights: per-profile reliability, with a mild bias
        # toward 'pending' for the most recent bills (still in clearing window).
        base_weights = PAYMENT_WEIGHTS_BY_PROFILE[profile]

        for m in range(12):
            month = m + 1  # 1-12
            kwh = float(monthly_kwh[c, m])
            peak_kwh = round(kwh * peak_frac, 2)
            off_peak_kwh = round(kwh * (1 - peak_frac), 2)

            amount_ht = round(peak_kwh * peak_rate + off_peak_kwh * off_peak_rate + standing, 2)
            tax = round(amount_ht * TVA_RATE, 2)
            amount = round(amount_ht + tax, 2)

            # Billing period dates
            year = START_DATE.year
            billing_start = date(year, month, 1)
            if month == 12:
                billing_end = date(year, 12, 31)
            else:
                billing_end = date(year, month + 1, 1) - timedelta(days=1)
            due = billing_end + timedelta(days=30)

            # Apply recent-bill bias: months 10-12 shift some 'paid' weight to
            # 'pending' (still inside clearing window in real life).
            if month >= 10:
                lift = min(RECENT_BILL_PENDING_LIFT, base_weights[0])
                weights = [
                    base_weights[0] - lift,
                    base_weights[1] + lift,
                    base_weights[2],
                    base_weights[3],
                ]
            else:
                weights = base_weights
            status = rng.choice(PAYMENT_STATUSES, p=weights)

            # Payment date for paid bills
            pay_date = None
            if status == "paid":
                pay_offset = int(rng.integers(0, 25))
                pay_date = due - timedelta(days=pay_offset)

            billing_period = f"{year}-{month:02d}"

            bill_rows["bill_id"].append(f"BILL-{bill_counter:06d}")
            bill_rows["customer_id"].append(customer_ids[c])
            bill_rows["billing_period"].append(billing_period)
            bill_rows["billing_start_date"].append(billing_start)
            bill_rows["billing_end_date"].append(billing_end)
            bill_rows["kwh_billed"].append(round(kwh, 2))
            bill_rows["peak_kwh"].append(peak_kwh)
            bill_rows["off_peak_kwh"].append(off_peak_kwh)
            bill_rows["amount_ht_eur"].append(amount_ht)
            bill_rows["tax_eur"].append(tax)
            bill_rows["amount_eur"].append(amount)
            bill_rows["payment_status"].append(status)
            bill_rows["due_date"].append(due)
            bill_rows["payment_date"].append(pay_date)
            bill_counter += 1

    df = pl.DataFrame(bill_rows)
    ok(f"{len(df):,} billing records generated")
    return df


def _fill_template(rng: np.random.Generator, template: str) -> str:
    """Fill a comment template with random values."""
    result = template
    for key, values in TEMPLATE_FILLS.items():
        placeholder = "{" + key + "}"
        while placeholder in result:
            result = result.replace(placeholder, rng.choice(values), 1)
    return result


def gen_interactions(rng: np.random.Generator, customers_df: pl.DataFrame) -> list[dict]:
    """Generate raw_customer_interactions as list of nested dicts (for NDJSON)."""
    header("Generating raw_customer_interactions (JSON)")

    customer_ids = customers_df["customer_id"].to_list()
    customer_types = customers_df["customer_type"].to_list()

    # Commercial customers interact more
    interaction_boost = {"residential": 1.0, "commercial": 2.5}
    propensity = np.array([interaction_boost[ct] for ct in customer_types])
    probs = propensity / propensity.sum()

    # Date range
    all_days = []
    current = START_DATE
    while current <= END_DATE:
        all_days.append(current)
        current += timedelta(days=1)

    records = []
    for i in range(N_INTERACTIONS):
        cust_id = rng.choice(customer_ids, p=probs)
        interaction_type = rng.choice(INTERACTION_TYPES, p=INTERACTION_TYPE_WEIGHTS)
        channel = rng.choice(INTERACTION_CHANNELS, p=INTERACTION_CHANNEL_WEIGHTS)
        day = rng.choice(all_days)
        hour = int(rng.integers(8, 20))
        minute = int(rng.integers(0, 60))
        interaction_dt = datetime(day.year, day.month, day.day, hour, minute, 0)

        # Category and priority — picking subcat FIRST so the templates,
        # keywords and sentiment all stay coherent with the chosen category.
        if interaction_type == "complaint":
            cat_options = INTERACTION_CATEGORIES["complaint"]
            priority = rng.choice(["high", "medium", "low"], p=[0.30, 0.50, 0.20])
            kw_map = COMPLAINT_KEYWORDS
            score = round(float(np.clip(rng.normal(2.0, 0.8), 1.0, 5.0)), 1)
            label = "negative" if score < 2.5 else "neutral"
        elif interaction_type == "inquiry":
            cat_options = INTERACTION_CATEGORIES["inquiry"]
            priority = rng.choice(["high", "medium", "low"], p=[0.10, 0.40, 0.50])
            kw_map = INQUIRY_KEYWORDS
            score = round(float(np.clip(rng.normal(3.5, 0.8), 1.0, 5.0)), 1)
            label = "neutral" if score < 4.0 else "positive"
        else:
            cat_options = INTERACTION_CATEGORIES["feedback"]
            priority = rng.choice(["high", "medium", "low"], p=[0.05, 0.25, 0.70])
            kw_map = FEEDBACK_KEYWORDS
            score = round(float(np.clip(rng.normal(3.8, 0.7), 1.0, 5.0)), 1)
            label = "positive" if score >= 3.5 else "neutral"

        subcat = rng.choice(cat_options)
        kw_pool = kw_map.get(subcat, ["question", "help", "info"])
        n_keywords = int(rng.integers(2, 5))
        keywords = rng.choice(kw_pool, size=min(n_keywords, len(kw_pool)), replace=False).tolist()

        raw_message = _fill_template(rng, rng.choice(TEMPLATES_BY_CATEGORY[subcat]))

        # Resolution: 40% have resolution
        resolution = None
        if rng.random() < 0.40:
            resolution = {
                "status": rng.choice(RESOLUTION_STATUSES),
                "action": rng.choice(RESOLUTION_ACTIONS),
                "resolved_by": f"agent_{int(rng.integers(1, 100)):03d}",
                "resolution_time_hours": int(rng.integers(1, 168)),
            }

        record = {
            "interaction_id": f"INT-{i:05d}",
            "customer_id": cust_id,
            "interaction_date": interaction_dt.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "channel": channel,
            # raw_message is intentionally at the root so that schema inference
            # in Visual Data Prep gives it as a plain string column — no need
            # for a struct path like `details.raw_message`.
            "raw_message": raw_message,
            "interaction": {
                "type": interaction_type,
                "priority": priority,
                "category": subcat,
            },
            "sentiment": {
                "score": score,
                "label": label,
                "keywords": keywords,
            },
            "details": {
                "resolution": resolution,
                "metadata": {
                    "device": rng.choice(DEVICES),
                    "browser": rng.choice(BROWSERS),
                    "session_duration_sec": int(rng.integers(30, 1800)),
                },
            },
        }
        records.append(record)

    ok(f"{len(records):,} interactions generated (nested JSON)")
    return records


def bump_churn_with_interactions(customers_df: pl.DataFrame, interactions: list[dict]) -> pl.DataFrame:
    """Bump churn_risk_score for customers with repeated complaints or negative sentiment.

    The base score (set in gen_customers) reflects structural risk only; this pass folds
    in actual customer-service signal so Genie can answer questions like
    "which Night Owl customers are also churn-flagged?" with a defensible result.
    """
    header("Bumping churn_risk_score from interactions")
    complaint_count: dict[str, int] = {}
    negative_count: dict[str, int] = {}
    for r in interactions:
        cid = r["customer_id"]
        if r["interaction"]["type"] == "complaint":
            complaint_count[cid] = complaint_count.get(cid, 0) + 1
        if r["sentiment"]["label"] == "negative":
            negative_count[cid] = negative_count.get(cid, 0) + 1

    customer_ids = customers_df["customer_id"].to_list()
    base_scores = customers_df["churn_risk_score"].to_list()
    bumped: list[float] = []
    n_changed = 0
    for cid, score in zip(customer_ids, base_scores):
        cc = complaint_count.get(cid, 0)
        nc = negative_count.get(cid, 0)
        bump = 0.0
        if cc >= 2:
            bump += 0.18
        elif cc == 1:
            bump += 0.06
        if nc >= 2:
            bump += 0.12
        elif nc == 1:
            bump += 0.04
        new_score = round(min(1.0, score + bump), 3)
        if bump > 0:
            n_changed += 1
        bumped.append(new_score)

    out = customers_df.with_columns(pl.Series("churn_risk_score", bumped))
    ok(f"{n_changed:,} customers had churn_risk_score bumped from interactions")
    return out


# ---------------------------------------------------------------------------
# Infrastructure
# ---------------------------------------------------------------------------

def create_schema(w, catalog):
    header("Creating Schema")
    full_name = f"{catalog}.{SCHEMA}"
    try:
        w.schemas.get(full_name=full_name)
        ok(f"Schema '{full_name}' already exists")
    except Exception:
        info(f"Creating schema '{full_name}'...")
        w.schemas.create(
            name=SCHEMA, catalog_name=catalog,
            comment="Energy retail demo — raw data for Genie Code workshop",
        )
        ok(f"Schema '{full_name}' created")


def create_volume(w, catalog):
    header("Creating Volume")
    full_name = f"{catalog}.{SCHEMA}.{VOLUME_NAME}"
    try:
        w.volumes.read(full_name)
        ok(f"Volume '{full_name}' already exists")
    except Exception:
        info(f"Creating managed volume '{full_name}'...")
        from databricks.sdk.service.catalog import VolumeType
        w.volumes.create(
            catalog_name=catalog,
            schema_name=SCHEMA,
            name=VOLUME_NAME,
            volume_type=VolumeType.MANAGED,
            comment="Raw energy retail data files (CSV + JSON) for Genie Code demo",
        )
        ok(f"Volume '{full_name}' created")


def upload_files(w, catalog, tmpdir):
    header("Uploading Files to Volume")
    volume_path = f"/Volumes/{catalog}/{SCHEMA}/{VOLUME_NAME}"
    files = [f for f in os.listdir(tmpdir) if f.startswith("raw_")]
    for fname in sorted(files):
        local_path = os.path.join(tmpdir, fname)
        remote_path = f"{volume_path}/{fname}"
        file_size = os.path.getsize(local_path)
        info(f"Uploading {fname} ({file_size / 1024 / 1024:.1f} MB)...")
        with open(local_path, "rb") as f:
            w.files.upload(remote_path, f, overwrite=True)
        ok(f"{fname} uploaded")
    ok(f"All {len(files)} files uploaded to {volume_path}")


def check_all(w, catalog):
    header("Verification")
    all_ok = True

    full_schema = f"{catalog}.{SCHEMA}"
    try:
        w.schemas.get(full_name=full_schema)
        ok(f"Schema '{full_schema}' exists")
    except Exception:
        fail(f"Schema '{full_schema}' not found")
        all_ok = False

    full_volume = f"{catalog}.{SCHEMA}.{VOLUME_NAME}"
    try:
        w.volumes.read(full_volume)
        ok(f"Volume '{full_volume}' exists")
    except Exception:
        fail(f"Volume '{full_volume}' not found")
        all_ok = False

    volume_path = f"/Volumes/{catalog}/{SCHEMA}/{VOLUME_NAME}"
    expected_files = [
        "raw_tariff_plans.csv",
        "raw_customers.csv",
        "raw_consumption.csv",
        "raw_billing.csv",
        "raw_customer_interactions.json",
    ]
    try:
        entries = list(w.files.list_directory_contents(volume_path))
        found_names = {e.name for e in entries if e.name}
        for fname in expected_files:
            if fname in found_names:
                ok(f"File '{fname}' present")
            else:
                fail(f"File '{fname}' missing")
                all_ok = False
    except Exception as e:
        fail(f"Cannot list volume files: {e}")
        all_ok = False

    return all_ok


def teardown(w, catalog, full=False):
    """Clean up demo artifacts created during the workshop.

    Preserves by default: schema, raw_data volume, and uploaded raw files.
    Removes: declarative pipelines (e.g., energy_retail_classification_pipeline),
             dashboards, MLflow experiments, Genie spaces, registered models,
             and all bronze/silver/gold tables.

    When ``full=True``, ALSO deletes the raw files in the volume so the next
    ``setup`` run lands in a perfectly clean directory. Schema and volume are
    left in place because setup is idempotent on those.

    Visual Data Prep flows are NOT removed automatically — the script prints a
    reminder at the end to delete them manually from the workspace UI.
    """
    header("Teardown — Cleaning up demo artifacts")
    info("Preserving: schema, raw_data volume, and uploaded raw files")
    info("Removing: pipelines, dashboards, experiments, models, derived tables")

    name_match = lambda n: n and ("energy_retail" in n.lower() or "energy retail" in n.lower())

    # 1. Declarative Pipelines
    header("Declarative Pipelines")
    try:
        deleted = 0
        for p in w.pipelines.list_pipelines():
            if name_match(p.name):
                try:
                    w.pipelines.delete(p.pipeline_id)
                    ok(f"Pipeline deleted: {p.name}")
                    deleted += 1
                except Exception as e:
                    warn(f"Could not delete pipeline {p.name}: {e}")
        if deleted == 0:
            info("No matching pipelines found")
    except Exception as e:
        warn(f"Could not list pipelines: {e}")

    # 2. Lakeview Dashboards
    header("Lakeview Dashboards")
    try:
        deleted = 0
        for d in w.lakeview.list():
            if name_match(d.display_name):
                try:
                    w.lakeview.trash(d.dashboard_id)
                    ok(f"Dashboard trashed: {d.display_name}")
                    deleted += 1
                except Exception as e:
                    warn(f"Could not trash dashboard {d.display_name}: {e}")
        if deleted == 0:
            info("No matching dashboards found")
    except Exception as e:
        warn(f"Could not list dashboards: {e}")

    # 3. MLflow Experiments
    header("MLflow Experiments")
    try:
        deleted = 0
        for e in w.experiments.list_experiments():
            n = e.name or ""
            if name_match(n) or "consumption_classif" in n.lower() or "consumption_clustering" in n.lower():
                try:
                    w.experiments.delete_experiment(e.experiment_id)
                    ok(f"Experiment deleted: {n}")
                    deleted += 1
                except Exception as exc:
                    warn(f"Could not delete experiment {n}: {exc}")
        if deleted == 0:
            info("No matching experiments found")
    except Exception as e:
        warn(f"Could not list experiments: {e}")

    # 4. Genie Spaces
    header("Genie Spaces")
    try:
        resp = w.api_client.do("GET", "/api/2.0/genie/spaces")
        spaces = resp.get("spaces", [])
        deleted = 0
        for s in spaces:
            title = s.get("title") or ""
            desc = s.get("description") or ""
            if name_match(title) or name_match(desc) or SCHEMA in desc:
                space_id = s.get("space_id")
                try:
                    w.api_client.do("DELETE", f"/api/2.0/genie/spaces/{space_id}")
                    ok(f"Genie space deleted: {title}")
                    deleted += 1
                except Exception as exc:
                    warn(f"Could not delete Genie space {title}: {exc}")
        if deleted == 0:
            info("No matching Genie spaces found")
    except Exception as e:
        warn(f"Could not list Genie spaces: {e}")

    # 5. Registered Models in the schema (delete versions first)
    header(f"Registered Models in {catalog}.{SCHEMA}")
    try:
        models = list(w.registered_models.list(catalog_name=catalog, schema_name=SCHEMA))
        if not models:
            info("No registered models found")
        for m in models:
            # Delete all model versions first
            try:
                versions = list(w.model_versions.list(full_name=m.full_name))
                for v in versions:
                    try:
                        w.model_versions.delete(full_name=m.full_name, version=v.version)
                        ok(f"Model version deleted: {m.full_name} v{v.version}")
                    except Exception as exc:
                        warn(f"Could not delete version {v.version} of {m.full_name}: {exc}")
            except Exception as exc:
                warn(f"Could not list versions of {m.full_name}: {exc}")
            # Then delete the model itself
            try:
                w.registered_models.delete(m.full_name)
                ok(f"Model deleted: {m.full_name}")
            except Exception as exc:
                warn(f"Could not delete model {m.full_name}: {exc}")
    except Exception as e:
        warn(f"Could not list registered models: {e}")

    # 6. Tables in the schema (bronze/silver/gold)
    header(f"Tables in {catalog}.{SCHEMA}")
    try:
        tables = list(w.tables.list(catalog_name=catalog, schema_name=SCHEMA))
        if not tables:
            info("No tables found")
        for t in tables:
            try:
                w.tables.delete(t.full_name)
                ok(f"Table dropped: {t.name}")
            except Exception as exc:
                warn(f"Could not drop table {t.name}: {exc}")
    except Exception as e:
        warn(f"Could not list tables: {e}")

    # 7. Functions in the schema
    header(f"Functions in {catalog}.{SCHEMA}")
    try:
        functions = list(w.functions.list(catalog_name=catalog, schema_name=SCHEMA))
        if not functions:
            info("No functions found")
        for f in functions:
            try:
                w.functions.delete(f.full_name)
                ok(f"Function dropped: {f.name}")
            except Exception as exc:
                warn(f"Could not drop function {f.name}: {exc}")
    except Exception as e:
        warn(f"Could not list functions: {e}")

    # 8. Optional: wipe raw files (full reinit)
    volume_path = f"/Volumes/{catalog}/{SCHEMA}/{VOLUME_NAME}"
    if full:
        header("Raw files in volume (--full)")
        try:
            entries = list(w.files.list_directory_contents(volume_path))
            deleted = 0
            for e in entries:
                if not e.name:
                    continue
                file_path = f"{volume_path}/{e.name}"
                try:
                    w.files.delete(file_path)
                    ok(f"File deleted: {e.name}")
                    deleted += 1
                except Exception as exc:
                    warn(f"Could not delete file {e.name}: {exc}")
            if deleted == 0:
                info("No raw files to delete")
            else:
                info(f"Raw files deleted ({deleted}) — next setup run will repopulate the volume.")
        except Exception as e:
            warn(f"Could not list volume files: {e}")

    # 9. Verify volume and raw data state
    header("Verifying preserved resources")
    try:
        entries = list(w.files.list_directory_contents(volume_path))
        n_files = sum(1 for e in entries if e.name)
        if full:
            ok(f"Volume preserved (empty): {n_files} file(s) in {volume_path}")
        else:
            ok(f"Volume preserved: {n_files} raw file(s) remain in {volume_path}")
    except Exception as e:
        warn(f"Could not verify volume: {e}")

    print()
    if full:
        ok("Teardown complete (--full) — schema and volume remain, raw files removed.")
    else:
        ok("Teardown complete — only the schema, raw_data volume, and uploaded files remain.")

    print()
    warn("Visual Data Prep flows are not removed automatically.")
    info("Open the Databricks workspace UI and delete any 'energy_retail_visual_prep'")
    info("flow manually (no SDK teardown path is available yet).")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Energy Retail Demo — Setup Script",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--profile", "-p",
        help="Databricks CLI/SDK profile name (from ~/.databrickscfg)",
    )
    parser.add_argument(
        "--catalog", "-c",
        required=True,
        help="Unity Catalog name (e.g., my_catalog)",
    )
    parser.add_argument(
        "--check", action="store_true",
        help="Verification only — do not create any resources or generate data",
    )
    parser.add_argument(
        "--teardown", action="store_true",
        help="Clean up derived demo resources (pipelines, dashboards, models, tables)",
    )
    parser.add_argument(
        "--full", action="store_true",
        help="With --teardown: also wipe raw files in the volume for a true reinit",
    )
    args = parser.parse_args()

    print(f"\n{Colors.BOLD}\u2554{'=' * 48}\u2557{Colors.RESET}")
    print(f"{Colors.BOLD}\u2551   Energy Retail Demo \u2014 Setup                    \u2551{Colors.RESET}")
    print(f"{Colors.BOLD}\u255a{'=' * 48}\u255d{Colors.RESET}")

    w = get_workspace_client(profile=args.profile)

    if args.teardown:
        teardown(w, args.catalog, full=args.full)
        return

    if args.check:
        all_ok = check_all(w, args.catalog)
        print()
        if all_ok:
            print(f"  {Colors.GREEN}{Colors.BOLD}All checks passed \u2014 ready for demo!{Colors.RESET}")
        else:
            print(f"  {Colors.YELLOW}Some checks failed. Run without --check to create resources.{Colors.RESET}")
        print()
        return

    # -- Create infrastructure --
    create_schema(w, args.catalog)
    create_volume(w, args.catalog)

    # -- Generate data --
    rng = np.random.default_rng(SEED)

    tariff_plans_df = gen_tariff_plans()
    customers_df = gen_customers(rng)
    consumption_df, daily_kwh, all_days = gen_consumption(rng, customers_df)
    billing_df = gen_billing(rng, customers_df, daily_kwh, all_days)
    interactions = gen_interactions(rng, customers_df)
    customers_df = bump_churn_with_interactions(customers_df, interactions)

    # -- Write to temp directory and upload --
    with tempfile.TemporaryDirectory() as tmpdir:
        header("Writing files to disk")

        tariff_plans_df.write_csv(os.path.join(tmpdir, "raw_tariff_plans.csv"))
        ok("raw_tariff_plans.csv")

        customers_df.write_csv(os.path.join(tmpdir, "raw_customers.csv"))
        ok("raw_customers.csv")

        consumption_df.write_csv(os.path.join(tmpdir, "raw_consumption.csv"))
        ok("raw_consumption.csv")

        billing_df.write_csv(os.path.join(tmpdir, "raw_billing.csv"))
        ok("raw_billing.csv")

        json_path = os.path.join(tmpdir, "raw_customer_interactions.json")
        with open(json_path, "w") as f:
            for record in interactions:
                f.write(json.dumps(record) + "\n")
        ok("raw_customer_interactions.json (NDJSON)")

        upload_files(w, args.catalog, tmpdir)

    # -- Verify --
    all_ok = check_all(w, args.catalog)

    # -- Summary --
    header("Summary")
    volume_path = f"/Volumes/{args.catalog}/{SCHEMA}/{VOLUME_NAME}"
    n_consumption = len(consumption_df)
    n_billing = len(billing_df)
    print()
    if all_ok:
        print(f"  {Colors.GREEN}{Colors.BOLD}Setup complete \u2014 ready for demo!{Colors.RESET}")
        print()
        info(f"Schema: {args.catalog}.{SCHEMA}")
        info(f"Volume: {volume_path}")
        print()
        info("Files uploaded:")
        info(f"  raw_tariff_plans.csv              ({N_TARIFF_PLANS:>7,} rows)")
        info(f"  raw_customers.csv                 ({N_CUSTOMERS:>7,} rows)")
        info(f"  raw_consumption.csv               ({n_consumption:>7,} rows)")
        info(f"  raw_billing.csv                   ({n_billing:>7,} rows)")
        info(f"  raw_customer_interactions.json     ({N_INTERACTIONS:>7,} records, nested JSON)")
        print()
        info(f"Open Genie Code and start with:")
        info(f'  "Show me the raw files in volume {volume_path}"')
    else:
        print(f"  {Colors.RED}Some issues remain. Review the output above.{Colors.RESET}")
    print()


if __name__ == "__main__":
    main()
