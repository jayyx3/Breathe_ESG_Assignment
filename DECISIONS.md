# Architectural Decisions (`DECISIONS.md`)

This document outlines the operational ambiguities resolved during BreatheESG Ingestor development, our design choices, and questions we would raise to a Product Manager in a real-world project.

---

## 1. Ambiguities Resolved & Solutions

### A. SAP Flat File Headers & Mixed Units
* **The Ambiguity**: SAP exports in different locales use various column sets. Quantity might be expressed in Liters (`L`), Gallons (`GAL`), Kilograms (`KG`), or Cubic Meters (`M3`).
* **Our Resolution**: We standardized on German headers reflecting a typical transaction SE16/MB51 export (`Buchungsdatum`, `Werk`, `Material`, `Menge`, `Meins`). Inside `sap.py`, we implemented physical unit conversions:
  * **Gallons (US Liquid) to Liters**: Multiplied by `3.78541`.
  * **Kilograms to Liters (Density Coercion)**: Since emissions factors are per-liter, we used standardized fuel densities to compute volume ($\text{Liters} = \text{kg} / \text{density}$):
    * Diesel density = $0.84\text{ kg/L}$.
    * Petrol density = $0.74\text{ kg/L}$.
  * **Cubic Meters to Liters**: Divided by `1000.0` for natural gas equivalents.

### B. Concur Missing Flight Distances (IATA Codes)
* **The Ambiguity**: Flight mileage is frequently left empty in travel reports, listing only the origin and destination airport codes (e.g., `MUC`, `LHR`).
* **Our Resolution**: We embedded an international repository of coordinates for 15 primary global transit hubs inside `travel.py`. When `distance_km` is missing, we calculate the surface distance dynamically using the **Haversine formula**:
  $$d = 2R \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right)}\right)$$
  This guarantees precise passenger-km (`PKM`) valuations without requiring expensive external API calls.

### C. Utility Billing Period Alignment
* **The Ambiguity**: Electricity meters cross calendar boundaries (e.g., Jan 15 to Feb 14), making monthly aggregation complex.
* **Our Resolution**: We avoided forcing arbitrary monthly splits (which introduces rounding errors). Instead, we preserved the precise `period_start` and `period_end` date metrics, allowing the backend to support granular queries across arbitrary temporal scopes.

---

## 2. Scope: What We Handled vs What We Ignored

### What We Handled (High-Fidelity Prototype)
* **Real-World Flat CSV Formats**: Standard, tabular file uploads representing realistic exports from Concur, utility portals, and SAP tables.
* **UK DESNZ 2023 Factors**: Full database-level lookups and constraints.
* **Analyst Action Workflows**: Review screens with inline transitions (Approve/Flag) and modal timelines.
* **Numpy Data Type Sanitization**: Wrote cleaning loops to prevent pandas data coercions from crashing Django `JSONField` serializers.

### What We Ignored (Out of Scope for Prototype)
* **Complex SAP IDocs**: Ignored nested SAP IDoc segments. Flat SE16 CSV reporting is the standard reporting mechanism for corporate sustainability officers.
* **Utility PDF Scans / OCR**: Reading PDFs using OCR (e.g. Tesseract) is slow and prone to errors. We assumed portal CSV downloads, which facility managers commonly have access to.
* **Multi-Currency Conversions**: We assumed a single base currency for cost tracking. In production, we'd integrate a live Exchange Rate API (e.g. OpenExchangeRates).

---

## 3. Product Manager (PM) Clarifications

In a production scenario, we would raise these key questions to our PM:
1. **Auditing Immutability**: *Once an analyst signs off and approves a record, should it be locked immediately, or can an administrator revert it?* (Currently, approval transitions to `APPROVED`, and we support audit trail histories of all state updates).
2. **Missing Ground Distances**: *If ground transport (taxi, rental) has a cost but no distance, is a flat rate estimate (e.g., 1.5 units per km) acceptable, or should we flag the row?* (Currently, we employ a standard fallback of $15\text{ km}$ or cost-based division to prevent parsing failure).
3. **Tenant Registries**: *Should tenants have fully isolated database files (physical multi-tenancy), or is logical tenant row isolation (our current implementation) sufficient?*
