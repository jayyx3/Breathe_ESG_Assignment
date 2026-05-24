import io
import pandas as pd
from datetime import datetime
from decimal import Decimal
from django.utils import timezone
from core.models import DataSource, EmissionRecord, EmissionFactor, Organization

# Plant Code Lookup Table
PLANT_LOOKUP = {
    "1000": "Munich Headquarters",
    "2000": "Frankfurt Logistics Hub",
    "3000": "Hamburg Manufacturing Site",
}

# Material Code mapping to Emission Factor key
MATERIAL_FACTOR_MAP = {
    "B0001": "DIESEL",
    "B0002": "PETROL",
    "B0003": "NATURAL_GAS",
}

def clean_row_dict(row_dict):
    """
    Cleans pandas row dictionary into pure Python JSON-serializable types.
    Converts numpy types and NaNs to prevent Django serialization errors.
    """
    cleaned = {}
    for k, v in row_dict.items():
        if pd.isna(v):
            cleaned[k] = None
        elif hasattr(v, 'item'):  # handles numpy scalars (int64, float64)
            cleaned[k] = v.item()
        elif isinstance(v, (int, float, str, bool)):
            cleaned[k] = v
        else:
            cleaned[k] = str(v)
    return cleaned

def parse_sap_csv(file_data, organization: Organization, uploaded_by, file_name: str):
    """
    Parses a SAP CSV export, normalizes units and plant codes, and inserts into EmissionRecord.
    Expects German column headers: Buchungsdatum, Werk, Material, Menge, Meins, Bwart.
    """
    # Create DataSource record
    data_source = DataSource.objects.create(
        organization=organization,
        file_name=file_name,
        uploaded_by=uploaded_by,
        source_type='SAP'
    )

    # Read CSV (semicolon or comma delimited)
    try:
        df = pd.read_csv(io.StringIO(file_data), sep=';')
        if 'Buchungsdatum' not in df.columns:
            df = pd.read_csv(io.StringIO(file_data), sep=',')
    except Exception as e:
        raise ValueError(f"Failed to parse CSV layout: {str(e)}")

    required_cols = ['Buchungsdatum', 'Werk', 'Material', 'Menge', 'Meins']
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        raise ValueError(f"Missing required SAP columns: {', '.join(missing)}")

    records_created = 0

    for idx, row in df.iterrows():
        try:
            # 1. Parse dates (DD.MM.YYYY to ISO)
            raw_date_str = str(row['Buchungsdatum']).strip()
            parsed_date = datetime.strptime(raw_date_str, "%d.%m.%Y").date()
            
            period_start = parsed_date
            period_end = parsed_date

            # 2. Plant Lookup
            raw_plant = str(row['Werk']).strip()
            facility_name = PLANT_LOOKUP.get(raw_plant, f"Unknown Plant ({raw_plant})")

            # 3. Material and Emission Factor Lookup
            raw_material = str(row['Material']).strip()
            factor_key = MATERIAL_FACTOR_MAP.get(raw_material)
            if not factor_key:
                raise ValueError(f"Unrecognized material code: {raw_material}")
            
            try:
                emission_factor = EmissionFactor.objects.get(factor_key=factor_key)
            except EmissionFactor.DoesNotExist:
                raise ValueError(f"Emission factor not found in system for key: {factor_key}")

            # 4. Quantity and Unit Normalization
            raw_qty = float(row['Menge'])
            raw_unit = str(row['Meins']).strip().upper()
            
            normalized_qty = raw_qty
            normalized_unit = raw_unit
            
            if factor_key in ['DIESEL', 'PETROL']:
                if raw_unit in ['GAL', 'GALLON', 'GALLONS']:
                    normalized_qty = raw_qty * 3.78541
                    normalized_unit = 'L'
                elif raw_unit in ['KG', 'KILOGRAM', 'KGS']:
                    density = 0.84 if factor_key == 'DIESEL' else 0.74
                    normalized_qty = raw_qty / density
                    normalized_unit = 'L'
                elif raw_unit in ['L', 'LTR', 'LITER', 'LITERS']:
                    normalized_unit = 'L'
            elif factor_key == 'NATURAL_GAS':
                if raw_unit in ['M3', 'CM', 'CUBIC_METER']:
                    normalized_unit = 'M3'
                elif raw_unit in ['L', 'LITER']:
                    normalized_qty = raw_qty / 1000.0
                    normalized_unit = 'M3'

            # 5. Populate and Save Record
            record = EmissionRecord(
                organization=organization,
                data_source=data_source,
                scope=1,
                category='FUEL',
                activity_value=Decimal(str(normalized_qty)),
                activity_unit=normalized_unit,
                emission_factor=emission_factor,
                period_start=period_start,
                period_end=period_end,
                source_row_number=idx + 1,
                source_raw_json=clean_row_dict(row.to_dict()),
                status='PENDING'
            )
            record.save()
            records_created += 1

        except Exception as e:
            raise ValueError(f"Error parsing row {idx + 1}: {str(e)}")

    # Update row count
    data_source.row_count = records_created
    data_source.save()

    return {
        "data_source_id": data_source.id,
        "rows_processed": records_created
    }
