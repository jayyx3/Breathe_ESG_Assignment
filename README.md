# BreatheESG Ingestor 🍃

BreatheESG Ingestor is a production-quality, multi-tenant carbon emissions data ingestion and governance review platform. It processes raw transaction spreadsheets from corporate sources (SAP fuel purchases, electricity utility bills, and Concur travel expenses), normalizes consumption to unified greenhouse gas weights (`kg CO2e`), and provides an analyst verification interface with full auditing controls.

---

## 🌟 Core Features

* **Multi-Tenant Architecture**: Complete client separation with logical organization filters.
* **UK DESNZ 2023 Compliant**: Automatically converts activity streams using standard sustainability constants.
* **Unified CSV Ingestors**:
  * **SAP Ingestor**: Translates German SAP headers (`Buchungsdatum`, `Werk`, `Menge`), converts units (Gallons to Liters, Kilograms to Liters using physical fuel densities), and maps plant codes.
  * **Utility Ingestor**: Accurately handles non-calendar billing boundaries and energy metrics.
  * **Travel Ingestor (Haversine Distance)**: Uses the **Haversine formula** to calculate geographical passenger-km distances between origin/destination airport IATA codes when Concur files omit mileage.
* **Governance Review Ledger**: Filter, search, and perform inline review transitions (Approve or Flag with investigator remarks) on normalized rows.
* **Audit Trails & Change Logging**: Automatically tracks record modifications and captures history in a secure `AuditLog` timeline.
* **Premium Glassmorphic Emerald Theme**: Dark mode analytics dashboard featuring responsive Area and Bar charts showing emissions by Scope 1/2/3 and operational categories.

---

## 💻 Technology Stack

* **Backend**: Django 4.x, Django REST Framework (DRF), SimpleJWT
* **Frontend**: React 18, Vite, Tailwind CSS v4, Recharts, Axios, Lucide Icons
* **Database**: SQLite3 (Local Prototype) / PostgreSQL-ready
* **Testing**: Django standard APITestCases

---

## 🛠️ Complete Local Setup & Startup

To run the application locally, start both the backend and frontend servers:

### 1. Backend Server Setup
From the `breatheesg/backend/` directory:

```bash
# 1. Create a virtual environment
python -m venv .venv

# 2. Activate virtual environment
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

# 3. Install backend dependencies
pip install -r requirements.txt

# 4. Generate and run database migrations
python manage.py makemigrations core
python manage.py migrate

# 5. Seed carbon factors, demo tenant, and superuser
python manage.py seed_emission_factors

# 6. Launch the development backend API server
python manage.py runserver 127.0.0.1:8000
```

### 2. Frontend Dashboard Setup
From the `breatheesg/frontend/` directory in a new terminal window:

```bash
# 1. Install packages
npm install

# 2. Launch the Vite dev server
npm run dev
```

The application will be live at: **[http://localhost:5173/](http://localhost:5173/)**
Backend API routes will be exposed at: **[http://127.0.0.1:8000/api/](http://127.0.0.1:8000/api/)**

---

## 🧪 Seeding & Test Credentials

After running `seed_emission_factors`, the database is preconfigured with:
* **Default Tenant**: `BreatheESG Demo Corp`
* **Analyst Superuser Username**: `admin`
* **Analyst Superuser Password**: `password123`

---

## 🧑‍💻 Running Automated Tests

To execute the entire 11-test suite (asserting calculations, date validations, Haversine formulas, JWT auth, and uploading API parsers) run:

```bash
# From breatheesg/backend/
python manage.py test
```

Expected Output:
```text
Creating test database for alias 'default'...
Found 11 test(s).
System check identified no issues (0 silenced).
...........
----------------------------------------------------------------------
Ran 11 tests in 7.201s

OK
Destroying test database for alias 'default'...
```
