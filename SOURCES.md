# Ingestion Data Sources (`SOURCES.md`)

This document outlines the real-world research behind our three ingestion formats, what our sample data represents, and potential break-points in a production deployment.

---

## 1. SAP Fuel & Procurement Ingestion

### Real-World Format Researched
In enterprise environments, direct SAP database access via APIs is heavily restricted. Sustainability officers typically request accounting exports from SAP transactions **SE16** (Table Viewer) or **MB51** (Material Document List) targeting fuel and procurement accounts. These export as flat, tabular text files delimited by semicolons.

### What We Learned
* **German Locales**: Column headers reflect German SAP abbreviations: `Buchungsdatum` (posting date), `Werk` (plant code), `Material` (material number), `Menge` (quantity), `Meins` (unit of measure), and `Bwart` (movement type, e.g. `101` for goods receipt).
* **Mixed Units of Measure**: Purchases are in liters (`L`), gallons (`GAL`), or kilograms (`KG`). Kilograms are used for billing weights, which must be converted to volume using density coefficients.
* **Opaque Codes**: Plants are identified by numbers (e.g. `1000` for Munich HQ) rather than names.

### What Our Sample Data Looks Like & Why
Our sample data utilizes a standard tabular SE16 format:
```csv
Buchungsdatum;Werk;Material;Menge;Meins;Bwart
24.05.2026;1000;B0001;500.00;L;101
24.05.2026;2000;B0002;120.00;GAL;101
25.05.2026;3000;B0003;1500.00;M3;101
```
* `B0001` (Diesel) is evaluated in Liters (`L`).
* `B0002` (Petrol) is evaluated in US Gallons (`GAL`) and converted.
* `B0003` (Natural Gas) is evaluated in Cubic Meters (`M3`).

### What Would Break in Production
* **Varying Encodings**: SAP exports often use legacy encodings (like `ISO-8859-1` or `Windows-1252`) instead of `UTF-8`. In production, a robust encoding detector (like `chardet`) must pre-process the files.
* **Custom Material Codes**: Companies use customized material codes (e.g., `MAT_99482` instead of `B0001`). In production, this requires mapping tables in the DB.

---

## 2. Utility Electricity Ingestion

### Real-World Format Researched
Utility providers (like PG&E, National Grid, or ConEd) allow facility managers to download billing history CSVs containing monthly summaries of meter IDs and usage metrics.

### What We Learned
* **Non-Calendar Boundaries**: Billing cycles start and end on arbitrary dates crossing month thresholds.
* **Tariff Structuring**: Meters map to commercial rate structures (e.g. `E-1` or `E-19`).
* **Demand Penalties**: Large facilities are charged for peak capacity (`demand_kw`) in addition to energy usage (`usage_kwh`).

### What Our Sample Data Looks Like & Why
Our sample data represents standard commercial portal CSV exports:
```csv
account_number,meter_id,service_address,billing_period_start,billing_period_end,usage_kwh,demand_kw,tariff_code,total_cost,currency
ACC-12345,METER-99,Munich HQ,2026-01-15,2026-02-14,4500.00,8.5,E-1,950.00,EUR
```
* Preserves billing start and end date boundaries.
* Safely accommodates missing `demand_kw` metrics without failing.

### What Would Break in Production
* **Duplicate Meter Overlaps**: If a single facility uploads overlapping billing cycles for the same meter ID, it would double-count carbon. Production would need overlapping date window checks.
* **Varying Layout Styles**: Different utility companies place header columns in different order. Production requires standard header mapping engines.

---

## 3. Concur Corporate Travel Ingestion

### Real-World Format Researched
SAP Concur is the enterprise standard for business travel. Concur exports standard expense reports in CSV formats detailing flights, hotels, and ground travel costs.

### What We Learned
* **Missing Flight Mileages**: Expense records contain airport codes (like `MUC`, `LHR`) instead of flight distances.
* **Airline Classifications**: Carbon weights depend heavily on flight seat classes. Business and first-class have higher allocations because they occupy more physical space.
* **Mixed Travel Modalities**: Single reports aggregate hotels, flights, and taxis.

### What Our Sample Data Looks Like & Why
```csv
trip_id,employee_id,travel_date,origin,destination,travel_mode,distance_km,airline_class,hotel_nights,hotel_city,cost,currency
TRIP-101,EMP-20,2026-04-10,MUC,LHR,FLIGHT,,BUSINESS,,,400.00,EUR
TRIP-103,EMP-20,2026-04-10,,,HOTEL,,3,,London,450.00,GBP
```
* Flight contains airport codes, forcing our Haversine algorithm to calculate distances.
* Hotel specifies nights, translating automatically to room-night metrics.

### What Would Break in Production
* **Unregistered Airports**: If employees book flights through tiny regional airports not indexed in our coordinate database, the distance calculation would default to a standard regional average, which might under- or over-estimate carbon.
* **Complex Multi-City Trips**: Flights with multiple layovers (e.g., `MUC -> LHR -> JFK`) need multi-segment tracking.
