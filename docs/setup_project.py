#!/usr/bin/env python3
"""
RENTETOOL PROJECT SETUP
=======================
Voer dit script uit om de complete projectstructuur aan te maken.

Gebruik:
    python setup_project.py

Dit script maakt aan:
- src/ directory met modules
- tests/ directory met tests  
- docs/ directory met documentatie
- Alle config bestanden (pyproject.toml, requirements.txt, etc.)
- Claude CLI bestanden (.claudeignore, .claude/settings.json)
"""

import os
import shutil
from pathlib import Path

# =============================================================================
# CONFIGURATIE
# =============================================================================

PROJECT_NAME = "rentetool"
PYTHON_VERSION = "3.11"

# =============================================================================
# DIRECTORY STRUCTUUR
# =============================================================================

DIRECTORIES = [
    "src/rentetool",
    "tests",
    "data",
    "docs",
    ".claude/commands",
]

# =============================================================================
# BESTANDEN
# =============================================================================

FILES = {
    # Python version
    ".python-version": PYTHON_VERSION,
    
    # Git ignore
    ".gitignore": """# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg

# Virtual environments
.env
.venv
env/
venv/
ENV/

# IDE
.idea/
.vscode/
*.swp
*.swo

# Testing
.pytest_cache/
.coverage
htmlcov/
.tox/

# OS
.DS_Store
Thumbs.db
""",

    # Claude ignore
    ".claudeignore": """# Python
__pycache__/
*.pyc
*.pyo
.pytest_cache/
.coverage
htmlcov/
*.egg-info/
dist/
build/

# Virtual environments
.env
.venv/
venv/
env/

# IDE
.idea/
.vscode/

# OS
.DS_Store
Thumbs.db

# Logs
*.log
""",

    # Claude settings
    ".claude/settings.json": """{
  "project": "rentetool",
  "language": "python",
  "permissions": {
    "allow_file_write": true,
    "allow_shell": true
  }
}
""",

    # Claude test command
    ".claude/commands/test.md": """# Test Command

Voer de tests uit:

```bash
pytest tests/ -v
```
""",

    # Claude run command  
    ".claude/commands/run.md": """# Run Command

Voer de testcase uit:

```bash
python -m rentetool.main
```
""",

    # Requirements
    "requirements.txt": """# Core
python-dateutil>=2.8.0

# Testing
pytest>=7.0.0
pytest-cov>=4.0.0

# Development
black>=23.0.0
ruff>=0.1.0
mypy>=1.0.0
""",

    # Pyproject.toml
    "pyproject.toml": """[build-system]
requires = ["setuptools>=61.0", "wheel"]
build-backend = "setuptools.build_meta"

[project]
name = "rentetool"
version = "0.1.0"
description = "Nederlandse wettelijke rente calculator conform Burgerlijk Wetboek"
readme = "README.md"
requires-python = ">=3.10"
license = {text = "MIT"}
authors = [
    {name = "Matthi"}
]
dependencies = [
    "python-dateutil>=2.8.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=7.0.0",
    "pytest-cov>=4.0.0",
    "black>=23.0.0",
    "ruff>=0.1.0",
    "mypy>=1.0.0",
]

[project.scripts]
rentetool = "rentetool.main:main"

[tool.setuptools.packages.find]
where = ["src"]

[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = ["test_*.py"]
python_functions = ["test_*"]
addopts = "-v --tb=short"

[tool.black]
line-length = 100
target-version = ["py311"]

[tool.ruff]
line-length = 100
select = ["E", "F", "I", "N", "W"]
ignore = ["E501"]

[tool.mypy]
python_version = "3.11"
warn_return_any = true
warn_unused_ignores = true
""",

    # Environment example
    ".env.example": """# Rentetool Environment Variables
# Kopieer naar .env en pas aan

# Database (optioneel, voor toekomstige versie)
# DATABASE_URL=postgresql://user:pass@localhost:5432/rentetool

# API (optioneel, voor toekomstige versie)
# API_HOST=0.0.0.0
# API_PORT=8000
""",

    # Makefile
    "Makefile": """.PHONY: install test run lint format clean

install:
	pip install -e ".[dev]"

test:
	pytest tests/ -v

test-cov:
	pytest tests/ -v --cov=src/rentetool --cov-report=html

run:
	python -m rentetool.main

lint:
	ruff check src/ tests/
	mypy src/

format:
	black src/ tests/
	ruff check --fix src/ tests/

clean:
	rm -rf __pycache__ .pytest_cache .coverage htmlcov dist build *.egg-info
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
""",

    # Source: __init__.py
    "src/rentetool/__init__.py": '''"""
Rentetool - Nederlandse wettelijke rente calculator
===================================================

Berekent rente conform:
- Art. 6:119 BW (wettelijke rente)
- Art. 6:119a BW (handelsrente)
- Art. 6:119 lid 2 BW (samengestelde rente)
- Art. 6:43 BW (toerekening meest bezwarend)
- Art. 6:44 BW (kosten → rente → hoofdsom)
"""

__version__ = "0.1.0"

from .models import Vordering, Deelbetaling
from .calculator import RenteCalculator
from .rates import get_rente_percentage, RENTETABEL

__all__ = [
    "Vordering",
    "Deelbetaling", 
    "RenteCalculator",
    "get_rente_percentage",
    "RENTETABEL",
]
''',

    # Source: models.py
    "src/rentetool/models.py": '''"""
Data models voor renteberekening.
"""

from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal
from typing import List, Dict, Optional


@dataclass
class Vordering:
    """Een vordering met renteberekening."""
    
    kenmerk: str
    oorspronkelijk_bedrag: Decimal
    startdatum: date
    rentetype: int  # 1-7
    kosten: Decimal = Decimal("0")
    opslag: Decimal = Decimal("0")  # Voor type 6 en 7
    opslag_ingangsdatum: Optional[date] = None
    
    # Huidige staat
    hoofdsom: Decimal = field(default=Decimal("0"))
    openstaande_kosten: Decimal = field(default=Decimal("0"))
    opgebouwde_rente: Decimal = field(default=Decimal("0"))
    totale_rente: Decimal = field(default=Decimal("0"))
    voldaan: bool = False
    voldaan_datum: Optional[date] = None
    
    # Aflossingen
    afgelost_hoofdsom: Decimal = field(default=Decimal("0"))
    afgelost_kosten: Decimal = field(default=Decimal("0"))
    afgelost_rente: Decimal = field(default=Decimal("0"))
    
    # Detail logging
    periodes: List[Dict] = field(default_factory=list)
    events: List[Dict] = field(default_factory=list)
    
    # Track laatste berekende datum
    laatst_berekend_tot: Optional[date] = None
    
    def __post_init__(self):
        self.hoofdsom = self.oorspronkelijk_bedrag
        self.openstaande_kosten = self.kosten
        if self.opslag_ingangsdatum is None:
            self.opslag_ingangsdatum = self.startdatum
        self.laatst_berekend_tot = self.startdatum
    
    @property
    def is_samengesteld(self) -> bool:
        """Heeft deze vordering samengestelde rente?"""
        return self.rentetype in (1, 2, 6, 7)
    
    @property
    def is_handelsrente(self) -> bool:
        """Is dit handelsrente?"""
        return self.rentetype in (2, 4, 7)
    
    @property
    def openstaand(self) -> Decimal:
        """Totaal openstaand bedrag."""
        return self.hoofdsom + self.openstaande_kosten + self.opgebouwde_rente


@dataclass
class Deelbetaling:
    """Een ontvangen betaling."""
    
    kenmerk: str
    bedrag: Decimal
    datum: date
    aangewezen_vorderingen: List[str] = field(default_factory=list)
    
    verwerkt: Decimal = field(default=Decimal("0"))
    toerekeningen: List[Dict] = field(default_factory=list)
''',

    # Source: rates.py
    "src/rentetool/rates.py": '''"""
Rentetabel en percentage lookup.
"""

from datetime import date
from decimal import Decimal
from typing import Optional

# Rentetabel: (datum, wettelijk%, handels%)
RENTETABEL = [
    (date(2027, 1, 1), Decimal("0.04"), Decimal("0.1015")),
    (date(2026, 1, 1), Decimal("0.04"), Decimal("0.1015")),
    (date(2025, 7, 1), Decimal("0.06"), Decimal("0.1015")),
    (date(2025, 1, 1), Decimal("0.06"), Decimal("0.1115")),
    (date(2024, 7, 1), Decimal("0.07"), Decimal("0.1225")),
    (date(2024, 1, 1), Decimal("0.07"), Decimal("0.125")),
    (date(2023, 7, 1), Decimal("0.06"), Decimal("0.12")),
    (date(2023, 1, 1), Decimal("0.04"), Decimal("0.105")),
    (date(2022, 1, 1), Decimal("0.02"), Decimal("0.08")),
    (date(2021, 7, 1), Decimal("0.02"), Decimal("0.08")),
    (date(2021, 1, 1), Decimal("0.02"), Decimal("0.08")),
    (date(2020, 7, 1), Decimal("0.02"), Decimal("0.08")),
    (date(2020, 1, 1), Decimal("0.02"), Decimal("0.08")),
    (date(2019, 7, 1), Decimal("0.02"), Decimal("0.08")),
    (date(2019, 1, 1), Decimal("0.02"), Decimal("0.08")),
    (date(2018, 7, 1), Decimal("0.02"), Decimal("0.08")),
    (date(2018, 1, 1), Decimal("0.02"), Decimal("0.08")),
    (date(2017, 7, 1), Decimal("0.02"), Decimal("0.08")),
    (date(2017, 1, 1), Decimal("0.02"), Decimal("0.08")),
    (date(2016, 7, 1), Decimal("0.02"), Decimal("0.08")),
    (date(2016, 1, 1), Decimal("0.02"), Decimal("0.0805")),
    (date(2015, 7, 1), Decimal("0.02"), Decimal("0.0805")),
    (date(2015, 1, 1), Decimal("0.02"), Decimal("0.0805")),
    (date(2014, 7, 1), Decimal("0.03"), Decimal("0.0815")),
    (date(2014, 1, 1), Decimal("0.03"), Decimal("0.0825")),
    (date(2013, 7, 1), Decimal("0.03"), Decimal("0.085")),
    (date(2013, 3, 16), Decimal("0.03"), Decimal("0.0875")),
    (date(2013, 1, 1), Decimal("0.03"), Decimal("0.0775")),
    (date(2012, 7, 1), Decimal("0.03"), Decimal("0.08")),
    (date(2012, 1, 1), Decimal("0.04"), Decimal("0.08")),
    (date(2011, 7, 1), Decimal("0.04"), Decimal("0.0825")),
    (date(2011, 1, 1), Decimal("0.03"), Decimal("0.08")),
    (date(2010, 7, 1), Decimal("0.03"), Decimal("0.08")),
    (date(2010, 1, 1), Decimal("0.03"), Decimal("0.08")),
    (date(2009, 7, 1), Decimal("0.04"), Decimal("0.08")),
    (date(2009, 1, 1), Decimal("0.06"), Decimal("0.095")),
    (date(2008, 7, 1), Decimal("0.06"), Decimal("0.1107")),
    (date(2008, 1, 1), Decimal("0.06"), Decimal("0.112")),
    (date(2007, 7, 1), Decimal("0.06"), Decimal("0.1107")),
    (date(2007, 1, 1), Decimal("0.06"), Decimal("0.1058")),
    (date(2006, 7, 1), Decimal("0.04"), Decimal("0.0983")),
    (date(2006, 1, 1), Decimal("0.04"), Decimal("0.0925")),
    (date(2005, 7, 1), Decimal("0.04"), Decimal("0.0905")),
    (date(2005, 1, 1), Decimal("0.04"), Decimal("0.0909")),
    (date(2004, 7, 1), Decimal("0.04"), Decimal("0.0901")),
    (date(2004, 2, 1), Decimal("0.04"), Decimal("0.0902")),
    (date(2004, 1, 1), Decimal("0.05"), Decimal("0.0902")),
    (date(2003, 8, 1), Decimal("0.05"), Decimal("0.091")),
    (date(2003, 7, 1), Decimal("0.07"), Decimal("0.091")),
    (date(2003, 1, 1), Decimal("0.07"), Decimal("0.0985")),
    (date(2002, 12, 1), Decimal("0.07"), Decimal("0.1035")),
    (date(2002, 8, 8), Decimal("0.07"), Decimal("0.1035")),
    (date(2002, 1, 1), Decimal("0.07"), Decimal("0.07")),
    (date(2001, 7, 1), Decimal("0.08"), Decimal("0.08")),
    (date(2001, 1, 1), Decimal("0.08"), Decimal("0.08")),
    (date(2000, 7, 1), Decimal("0.06"), Decimal("0.06")),
    (date(2000, 1, 1), Decimal("0.06"), Decimal("0.06")),
    (date(1999, 7, 1), Decimal("0.06"), Decimal("0.06")),
    (date(1999, 1, 1), Decimal("0.06"), Decimal("0.06")),
]

# Extraheer alle rentewijzigingsdata
RENTE_WIJZIGINGSDATA = sorted(set(d[0] for d in RENTETABEL))


def get_rente_percentage(
    datum: date, 
    is_handelsrente: bool, 
    opslag: Decimal = Decimal("0")
) -> Decimal:
    """
    Haal het geldende rentepercentage op voor een datum.
    
    Args:
        datum: De datum waarvoor het percentage geldt
        is_handelsrente: True voor handelsrente, False voor wettelijke rente
        opslag: Optionele opslag bovenop het basispercentage
    
    Returns:
        Het geldende rentepercentage als Decimal
    """
    for rente_datum, wet, handel in RENTETABEL:
        if datum >= rente_datum:
            basis = handel if is_handelsrente else wet
            return basis + opslag
    basis = RENTETABEL[-1][2 if is_handelsrente else 1]
    return basis + opslag


def get_volgende_rentewijziging(na_datum: date, voor_datum: date) -> Optional[date]:
    """
    Vind de eerstvolgende rentewijzigingsdatum.
    
    Args:
        na_datum: Zoek wijzigingen na deze datum
        voor_datum: Zoek wijzigingen voor deze datum
    
    Returns:
        De eerstvolgende wijzigingsdatum, of None
    """
    for wijziging in RENTE_WIJZIGINGSDATA:
        if na_datum < wijziging < voor_datum:
            return wijziging
    return None
''',

    # Source: utils.py
    "src/rentetool/utils.py": '''"""
Hulpfuncties voor renteberekening.
"""

from datetime import date
from decimal import Decimal, ROUND_HALF_UP


def verjaardag(start_datum: date, jaar: int) -> date:
    """
    Bereken verjaardag in een specifiek jaar.
    
    Handelt 29 februari correct af voor niet-schrikkeljaren.
    """
    try:
        return date(jaar, start_datum.month, start_datum.day)
    except ValueError:
        # 29 februari in niet-schrikkeljaar
        return date(jaar, start_datum.month, 28)


def bereken_rente(hoofdsom: Decimal, rente_pct: Decimal, dagen: int) -> Decimal:
    """
    Bereken rentebedrag.
    
    Formule: Hoofdsom × Rentepercentage × (Dagen / 365)
    """
    if dagen <= 0 or hoofdsom <= 0:
        return Decimal("0")
    rente = hoofdsom * rente_pct * Decimal(dagen) / Decimal(365)
    return rente.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def format_bedrag(bedrag: Decimal) -> str:
    """Formatteer bedrag als euro."""
    return f"€ {bedrag:>10,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def format_datum(d: date) -> str:
    """Formatteer datum als DD-MM-JJJJ."""
    return d.strftime("%d-%m-%Y")


def format_pct(pct: Decimal) -> str:
    """Formatteer percentage."""
    return f"{pct * 100:.2f}%"
''',

    # Tests: __init__.py
    "tests/__init__.py": '''"""Tests voor rentetool."""
''',

    # Tests: conftest.py
    "tests/conftest.py": '''"""
Pytest fixtures voor rentetool tests.
"""

import pytest
from datetime import date
from decimal import Decimal

from rentetool.models import Vordering, Deelbetaling


@pytest.fixture
def vordering_wettelijk():
    """Standaard vordering met wettelijke rente."""
    return Vordering(
        kenmerk="TEST-001",
        oorspronkelijk_bedrag=Decimal("1000.00"),
        startdatum=date(2024, 1, 1),
        rentetype=1,
    )


@pytest.fixture
def vordering_handels():
    """Standaard vordering met handelsrente."""
    return Vordering(
        kenmerk="TEST-002",
        oorspronkelijk_bedrag=Decimal("2000.00"),
        startdatum=date(2024, 1, 1),
        rentetype=2,
        kosten=Decimal("100.00"),
    )


@pytest.fixture
def deelbetaling():
    """Standaard deelbetaling."""
    return Deelbetaling(
        kenmerk="BET-001",
        bedrag=Decimal("500.00"),
        datum=date(2024, 6, 1),
    )
''',

    # Tests: test_rates.py
    "tests/test_rates.py": '''"""
Tests voor rentepercentages.
"""

import pytest
from datetime import date
from decimal import Decimal

from rentetool.rates import get_rente_percentage, RENTETABEL


class TestGetRentePercentage:
    """Tests voor get_rente_percentage."""
    
    def test_wettelijke_rente_2024(self):
        """Wettelijke rente in 2024 is 7%."""
        pct = get_rente_percentage(date(2024, 3, 15), is_handelsrente=False)
        assert pct == Decimal("0.07")
    
    def test_handelsrente_2024(self):
        """Handelsrente in Q1 2024 is 12,5%."""
        pct = get_rente_percentage(date(2024, 3, 15), is_handelsrente=True)
        assert pct == Decimal("0.125")
    
    def test_handelsrente_q2_2024(self):
        """Handelsrente in Q2 2024 is 12,25%."""
        pct = get_rente_percentage(date(2024, 8, 15), is_handelsrente=True)
        assert pct == Decimal("0.1225")
    
    def test_met_opslag(self):
        """Percentage met opslag."""
        pct = get_rente_percentage(
            date(2024, 3, 15), 
            is_handelsrente=False,
            opslag=Decimal("0.02")
        )
        assert pct == Decimal("0.09")  # 7% + 2%
    
    def test_oude_datum(self):
        """Percentage voor oude datum."""
        pct = get_rente_percentage(date(2010, 6, 15), is_handelsrente=False)
        assert pct == Decimal("0.03")


class TestRentetabel:
    """Tests voor de rentetabel."""
    
    def test_tabel_niet_leeg(self):
        """Rentetabel moet gevuld zijn."""
        assert len(RENTETABEL) > 0
    
    def test_tabel_gesorteerd(self):
        """Rentetabel moet op datum gesorteerd zijn (nieuwste eerst)."""
        datums = [entry[0] for entry in RENTETABEL]
        assert datums == sorted(datums, reverse=True)
''',

    # Tests: test_calculator.py
    "tests/test_calculator.py": '''"""
Tests voor de renteberekening.
"""

import pytest
from datetime import date
from decimal import Decimal

from rentetool.models import Vordering, Deelbetaling
from rentetool.calculator import RenteCalculator


class TestRenteCalculator:
    """Tests voor RenteCalculator."""
    
    def test_simpele_berekening(self):
        """Test simpele renteberekening zonder betalingen."""
        vorderingen = [
            Vordering(
                kenmerk="V1",
                oorspronkelijk_bedrag=Decimal("1000.00"),
                startdatum=date(2024, 1, 1),
                rentetype=1,
            )
        ]
        
        calc = RenteCalculator(vorderingen, [], date(2024, 7, 1))
        result = calc.bereken()
        
        # 181 dagen @ 7% = 1000 * 0.07 * 181/365 = 34.71
        v = result["vorderingen"]["V1"]
        assert v.totale_rente > Decimal("0")
        assert not v.voldaan
    
    def test_betaling_lost_af(self):
        """Test dat betaling correct wordt toegerekend."""
        vorderingen = [
            Vordering(
                kenmerk="V1",
                oorspronkelijk_bedrag=Decimal("1000.00"),
                startdatum=date(2024, 1, 1),
                rentetype=1,
                kosten=Decimal("50.00"),
            )
        ]
        
        deelbetalingen = [
            Deelbetaling(
                kenmerk="B1",
                bedrag=Decimal("100.00"),
                datum=date(2024, 3, 1),
            )
        ]
        
        calc = RenteCalculator(vorderingen, deelbetalingen, date(2024, 6, 1))
        result = calc.bereken()
        
        v = result["vorderingen"]["V1"]
        
        # Betaling gaat eerst naar kosten (€50), dan rente, dan hoofdsom
        assert v.afgelost_kosten == Decimal("50.00")
        assert v.afgelost_rente > Decimal("0") or v.afgelost_hoofdsom > Decimal("0")


class TestTestcase3:
    """Test de volledige testcase 3."""
    
    def test_eindresultaat(self):
        """Test verwacht eindresultaat van testcase 3."""
        vorderingen = [
            Vordering(
                kenmerk="V3kWRS",
                oorspronkelijk_bedrag=Decimal("3000.00"),
                startdatum=date(2014, 5, 29),
                rentetype=1,
                kosten=Decimal("100.00"),
            ),
            Vordering(
                kenmerk="V1kWR+1",
                oorspronkelijk_bedrag=Decimal("1000.00"),
                startdatum=date(2015, 5, 6),
                rentetype=6,
                opslag=Decimal("0.02"),
            ),
            Vordering(
                kenmerk="V2kHRS",
                oorspronkelijk_bedrag=Decimal("2000.00"),
                startdatum=date(2015, 11, 11),
                rentetype=2,
                kosten=Decimal("400.00"),
            ),
        ]
        
        deelbetalingen = [
            Deelbetaling(
                kenmerk="D1500",
                bedrag=Decimal("1500.00"),
                datum=date(2014, 12, 12),
                aangewezen_vorderingen=["V3kWRS"],
            ),
            Deelbetaling(
                kenmerk="D2500",
                bedrag=Decimal("2500.00"),
                datum=date(2015, 9, 28),
                aangewezen_vorderingen=["V3kWRS", "V1kWR+1"],
            ),
        ]
        
        calc = RenteCalculator(vorderingen, deelbetalingen, date(2026, 1, 16))
        result = calc.bereken()
        
        # V3kWRS moet voldaan zijn
        assert result["vorderingen"]["V3kWRS"].voldaan
        
        # Totaal openstaand moet ongeveer € 5.542,63 zijn
        totaal = sum(v.openstaand for v in result["vorderingen"].values())
        assert Decimal("5500") < totaal < Decimal("5600")
''',

}

# =============================================================================
# SETUP FUNCTIES
# =============================================================================

def create_directories(base_path: Path):
    """Maak alle directories aan."""
    print("📁 Directories aanmaken...")
    for dir_path in DIRECTORIES:
        full_path = base_path / dir_path
        full_path.mkdir(parents=True, exist_ok=True)
        print(f"   ✓ {dir_path}/")


def create_files(base_path: Path):
    """Maak alle bestanden aan."""
    print("\n📄 Bestanden aanmaken...")
    for file_path, content in FILES.items():
        full_path = base_path / file_path
        full_path.parent.mkdir(parents=True, exist_ok=True)
        full_path.write_text(content)
        print(f"   ✓ {file_path}")


def copy_existing_files(base_path: Path):
    """Kopieer bestaande bestanden naar juiste locaties."""
    print("\n📋 Bestaande bestanden verplaatsen...")
    
    moves = [
        ("04_referentie_implementatie.py", "src/rentetool/calculator.py"),
        ("03_rentetabel.csv", "data/rentetabel.csv"),
        ("01_specificatie.md", "docs/01_specificatie.md"),
        ("02_rekenlogica.md", "docs/02_rekenlogica.md"),
        ("05_testcase3.md", "docs/05_testcase3.md"),
        ("06_api_specificatie.md", "docs/06_api_specificatie.md"),
        ("07_rentetypes.md", "docs/07_rentetypes.md"),
        ("08_expertcontrole.md", "docs/08_expertcontrole.md"),
    ]
    
    for src, dst in moves:
        src_path = base_path / src
        dst_path = base_path / dst
        if src_path.exists():
            dst_path.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src_path, dst_path)
            print(f"   ✓ {src} → {dst}")


def create_main_module(base_path: Path):
    """Maak main.py module aan."""
    print("\n🚀 Main module aanmaken...")
    
    main_content = '''"""
Rentetool - Main entry point
"""

from datetime import date
from decimal import Decimal

from .models import Vordering, Deelbetaling
from .calculator import RenteCalculator


def main():
    """Voer testcase 3 uit."""
    
    vorderingen = [
        Vordering(
            kenmerk="V3kWRS",
            oorspronkelijk_bedrag=Decimal("3000.00"),
            startdatum=date(2014, 5, 29),
            rentetype=1,
            kosten=Decimal("100.00"),
        ),
        Vordering(
            kenmerk="V1kWR+1",
            oorspronkelijk_bedrag=Decimal("1000.00"),
            startdatum=date(2015, 5, 6),
            rentetype=6,
            opslag=Decimal("0.02"),
        ),
        Vordering(
            kenmerk="V2kHRS",
            oorspronkelijk_bedrag=Decimal("2000.00"),
            startdatum=date(2015, 11, 11),
            rentetype=2,
            kosten=Decimal("400.00"),
        ),
    ]
    
    deelbetalingen = [
        Deelbetaling(
            kenmerk="D1500",
            bedrag=Decimal("1500.00"),
            datum=date(2014, 12, 12),
            aangewezen_vorderingen=["V3kWRS"],
        ),
        Deelbetaling(
            kenmerk="D2500",
            bedrag=Decimal("2500.00"),
            datum=date(2015, 9, 28),
            aangewezen_vorderingen=["V3kWRS", "V1kWR+1"],
        ),
    ]
    
    einddatum = date(2026, 1, 16)
    
    calc = RenteCalculator(vorderingen, deelbetalingen, einddatum)
    result = calc.bereken()
    
    # Print resultaat
    print("=" * 60)
    print("RENTETOOL - TESTCASE 3")
    print("=" * 60)
    
    totaal_openstaand = Decimal("0")
    for kenmerk, v in result["vorderingen"].items():
        status = "VOLDAAN" if v.voldaan else "OPEN"
        print(f"{kenmerk}: € {v.openstaand:,.2f} ({status})")
        totaal_openstaand += v.openstaand
    
    print("-" * 60)
    print(f"TOTAAL OPENSTAAND: € {totaal_openstaand:,.2f}")
    print("=" * 60)


if __name__ == "__main__":
    main()
'''
    
    main_path = base_path / "src/rentetool/main.py"
    main_path.write_text(main_content)
    print(f"   ✓ src/rentetool/main.py")


def update_claude_md(base_path: Path):
    """Update CLAUDE.md voor nieuwe structuur."""
    print("\n📝 CLAUDE.md updaten...")
    
    claude_content = '''# CLAUDE.md - Rentetool Project

## Project Overview

Nederlandse wettelijke rente calculator conform Burgerlijk Wetboek.

## Quick Start

```bash
# Installeer dependencies
pip install -e ".[dev]"

# Of alleen requirements
pip install -r requirements.txt

# Run testcase
python -m rentetool.main

# Run tests
pytest tests/ -v
```

## Project Structure

```
rentetool/
├── src/rentetool/       # Source code
│   ├── __init__.py
│   ├── main.py          # Entry point
│   ├── calculator.py    # Berekening logic
│   ├── models.py        # Vordering, Deelbetaling
│   ├── rates.py         # Rentetabel
│   └── utils.py         # Hulpfuncties
├── tests/               # Tests
├── docs/                # Documentatie
└── data/                # Data bestanden
```

## Kernregels

### Wettelijke basis
- **Art. 6:119 BW**: Wettelijke rente
- **Art. 6:119a BW**: Handelsrente
- **Art. 6:43 BW**: Toerekening meest bezwarend (DEFAULT)
- **Art. 6:44 BW**: Volgorde: kosten → rente → hoofdsom

### KRITIEK: Periodesplitsing
Renteperiodes MOETEN worden gesplitst op:
1. Rentewijzigingsdata (01-01 en 01-07)
2. Verjaardagen (kapitalisatiemomenten)
3. Betalingsdata

## 7 Rentetypes

| Code | Type | Kapitalisatie |
|------|------|---------------|
| 1 | Wettelijke rente | Samengesteld |
| 2 | Handelsrente | Samengesteld |
| 3 | Wettelijke rente | Enkelvoudig |
| 4 | Handelsrente | Enkelvoudig |
| 5 | Contractueel vast | Keuze |
| 6 | Wettelijke + opslag | Keuze |
| 7 | Handelsrente + opslag | Keuze |

## Testcase 3 - Verwacht resultaat

| Vordering | Openstaand | Status |
|-----------|----------:|--------|
| V3kWRS | € 0,00 | VOLDAAN |
| V1kWR+1 | € 322,20 | OPEN |
| V2kHRS | € 5.220,43 | OPEN |
| **TOTAAL** | **€ 5.542,63** | |

## Commands

```bash
make install   # Installeer project
make test      # Run tests
make run       # Run testcase
make lint      # Check code
make format    # Format code
```

## Code conventies

- Decimals voor geldbedragen (NOOIT floats!)
- Afronding: 2 decimalen, ROUND_HALF_UP
- Datums: ISO formaat intern
- Type hints gebruiken

## Documentatie

Zie `docs/` voor:
- Specificaties
- Rekenlogica
- API formaat
- Testcases
'''
    
    claude_path = base_path / "CLAUDE.md"
    claude_path.write_text(claude_content)
    print(f"   ✓ CLAUDE.md")


def print_summary(base_path: Path):
    """Print samenvatting."""
    print("\n" + "=" * 60)
    print("✅ PROJECT SETUP COMPLEET")
    print("=" * 60)
    print(f"\nProject aangemaakt in: {base_path}")
    print("\nVolgende stappen:")
    print("  1. cd rentetool_compleet")
    print("  2. pip install -e '.[dev]'")
    print("  3. pytest tests/ -v")
    print("  4. python -m rentetool.main")
    print("\nOf gebruik make:")
    print("  make install && make test && make run")
    print("=" * 60)


# =============================================================================
# MAIN
# =============================================================================

def main():
    """Voer de setup uit."""
    print("=" * 60)
    print("RENTETOOL PROJECT SETUP")
    print("=" * 60)
    
    # Bepaal base path
    base_path = Path.cwd()
    
    # Als we in de juiste directory zijn
    if base_path.name != "rentetool_compleet":
        # Check of subdirectory bestaat
        if (base_path / "rentetool_compleet").exists():
            base_path = base_path / "rentetool_compleet"
        else:
            print(f"\n⚠️  Voer dit script uit vanuit de rentetool_compleet directory")
            print(f"   of maak eerst de directory aan.")
            return
    
    print(f"\nBase path: {base_path}")
    
    # Voer setup uit
    create_directories(base_path)
    create_files(base_path)
    copy_existing_files(base_path)
    create_main_module(base_path)
    update_claude_md(base_path)
    print_summary(base_path)


if __name__ == "__main__":
    main()
