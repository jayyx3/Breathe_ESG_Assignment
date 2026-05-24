# Engineering Tradeoffs (`TRADEOFFS.md`)

This document outlines three structural features we deliberately chose **not** to implement in the prototype, alongside the technical and business justifications for these tradeoffs.

---

## 1. Asynchronous Ingestion Pipelines (Celery + Redis)

* **The Feature**: Routing CSV uploads to a background task queue (e.g., Celery, Redis, or Django Q) and returning a "Job Pending" status to the client.
* **Why We Did Not Build It**: 
  * **Scale Context**: For typical prototype spreadsheets containing 100–1,000 rows, synchronous in-memory parsing using pandas completes in **less than 300ms**.
  * **Deployment Simplicity**: Introducing a message broker (Redis) and worker processes (Celery) substantially increases local developer friction and deployment overhead (especially on free tiers like Render.com, where deploying multiple services requires premium accounts).
  * **Our Tradeoff**: We utilized synchronous views wrapped in **atomic database transactions**. This guarantees that files either succeed completely or roll back entirely in real-time, providing immediate feedback to the analyst without queue delays.

---

## 2. Advanced Document PDF Scanning (OCR / Document AI)

* **The Feature**: Allowing facilities managers to drag and drop PDF bills, running an OCR pipeline (like Tesseract, AWS Textract, or Google Document AI) to extract kWh consumption.
* **Why We Did Not Build It**:
  * **Pipeline Volatility**: OCR engines are highly sensitive to document layouts, scanning qualities, and resolutions. Building a robust document layout parser requires complex regular expressions and deep learning visual models to achieve production accuracy.
  * **Alternative Standards**: Modern utility corporations (like PG&E, National Grid, and Con Edison) provide secure customer portals allowing managers to download tabular `billing_history.csv` spreadsheets directly.
  * **Our Tradeoff**: We focused our engineering resources on parsing structured, clean portal CSV formats. This provides a reliable, robust integration vector.

---

## 3. Real-Time Currency Exchange Conversion APIs

* **The Feature**: Integrating a live currency exchange rates API (e.g., OpenExchangeRates) to convert GBP, EUR, and other travel expenses to USD or EUR in real-time.
* **Why We Did Not Build It**:
  * **External Dependency Risk**: Querying external rate systems during CSV ingestion introduces single points of failure (e.g., API limits, network latency, or downtime).
  * **Audit Consistency**: In sustainability accounting, corporations use fixed monthly, quarterly, or yearly financial exchange book-rates rather than volatile real-time spot rates.
  * **Our Tradeoff**: We recorded currency costs as raw metrics from source systems. This ensures data integrity.
