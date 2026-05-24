import io
import pandas as pd
from datetime import datetime
from decimal import Decimal
from core.models import DataSource, EmissionRecord, EmissionFactor, Organization

def clean_row_dict(row_dict):
    """
    Cleans pandas row dictionary into pure Python JSON-serializable types.
    """
    cleaned = {}
    for k, v in row_dict.items():
        if pd.isna(v):
            cleaned[k] = None
        elif hasattr(v, 'item'):
            cleaned[k] = v.item()
        elif isinstance(v, (int, float, str, bool)):
            cleaned[k] = v
        else:
            cleaned[k] = str(v)
    return cleaned

def parse_utility_csv(file_data, organization: Organization, uploaded_by, file_name: str):
    """
    Parses a Utility electricity portal export CSV.
    Expects columns: account_number, meter_id, service_address, billing_period_start,
    billing_period_end, usage_kwh, demand_kw, tariff_code, total_cost, currency.
    """
    # Create DataSource record
    data_source = DataSource.objects.create(
        organization=organization,
        file_name=file_name,
        uploaded_by=uploaded_by,
        source_type='UTILITY'
    )

    try:
        df = pd.read_csv(io.StringIO(file_data))
    except Exception as e:
        raise ValueError(f"Failed to parse CSV layout: {str(e)}")

    required_cols = ['account_number', 'meter_id', 'billing_period_start', 'billing_period_end', 'usage_kwh']
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        raise ValueError(f"Missing required Utility columns: {', '.join(missing)}")

    # Retrieve ELECTRICITY factor
    try:
        electricity_factor = EmissionFactor.objects.get(factor_key='ELECTRICITY')
    except EmissionFactor.DoesNotExist:
        raise ValueError("Grid Electricity emission factor not found in database. Run seeding command first.")

    records_created = 0

    for idx, row in df.iterrows():
        try:
            # 1. Parse dates (YYYY-MM-DD or MM/DD/YYYY)
            def parse_date(date_val):
                date_str = str(date_val).strip()
                for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%Y/%m/%d"):
                    try:
                        return datetime.strptime(date_str, fmt).date()
                    except ValueError:
                        continue
                raise ValueError(f"Unsupported date format for: {date_val}")

            period_start = parse_date(row['billing_period_start'])
            period_end = parse_date(row['billing_period_end'])

            if period_start > period_end:
                raise ValueError(f"Billing period start ({period_start}) cannot be after end ({period_end})")

            # 2. Extract values
            usage_kwh = float(row['usage_kwh'])

            # 3. Create record
            record = EmissionRecord(
                organization=organization,
                data_source=data_source,
                scope=2,
                category='ELECTRICITY',
                activity_value=Decimal(str(usage_kwh)),
                activity_unit='KWH',
                normalized_value_kwh=Decimal(str(usage_kwh)),
                emission_factor=electricity_factor,
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
