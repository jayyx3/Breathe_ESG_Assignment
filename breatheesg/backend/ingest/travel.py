import io
import math
import pandas as pd
from datetime import datetime
from decimal import Decimal
from core.models import DataSource, EmissionRecord, EmissionFactor, Organization

# Dictionary of major international airports and their lat/lon coordinates
AIRPORT_COORDINATES = {
    "MUC": (48.3538, 11.7861),   # Munich Airport
    "LHR": (51.4700, -0.4543),  # London Heathrow
    "JFK": (40.6413, -73.7781),  # New York JFK
    "SFO": (37.6213, -122.3790), # San Francisco
    "FRA": (50.0379, 8.5622),    # Frankfurt
    "CDG": (49.0097, 2.5479),    # Paris Charles de Gaulle
    "SIN": (1.3644, 103.9915),   # Singapore Changi
    "DXB": (25.2532, 55.3657),   # Dubai International
    "BLR": (13.1986, 77.7066),   # Bengaluru Kempegowda
    "DEL": (28.5562, 77.1000),   # New Delhi Indira Gandhi
    "BOM": (19.0896, 72.8656),   # Mumbai Chhatrapati Shivaji
    "HND": (35.5494, 139.7798),  # Tokyo Haneda
    "ORD": (41.9742, -87.9073),  # Chicago O'Hare
    "LAX": (33.9416, -118.4085), # Los Angeles
    "SYD": ( -33.9461, 151.1772),# Sydney Kingsford Smith
}

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

def calculate_haversine_distance(origin_code: str, dest_code: str) -> float:
    """
    Computes distance in kilometers between two IATA airport codes using the Haversine formula.
    """
    origin = str(origin_code).strip().upper()
    dest = str(dest_code).strip().upper()

    if origin not in AIRPORT_COORDINATES or dest not in AIRPORT_COORDINATES:
        return 800.0

    lat1, lon1 = AIRPORT_COORDINATES[origin]
    lat2, lon2 = AIRPORT_COORDINATES[dest]

    R = 6371.0  # Earth's radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    
    a = (math.sin(dlat / 2) ** 2 + 
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * 
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c

def parse_travel_csv(file_data, organization: Organization, uploaded_by, file_name: str):
    """
    Parses a Concur expense corporate travel CSV.
    Expects columns: trip_id, employee_id, travel_date, origin, destination, travel_mode,
    distance_km, airline_class, hotel_nights, hotel_city, cost, currency.
    """
    # Create DataSource record
    data_source = DataSource.objects.create(
        organization=organization,
        file_name=file_name,
        uploaded_by=uploaded_by,
        source_type='TRAVEL'
    )

    try:
        df = pd.read_csv(io.StringIO(file_data))
    except Exception as e:
        raise ValueError(f"Failed to parse CSV layout: {str(e)}")

    required_cols = ['trip_id', 'travel_date', 'travel_mode']
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        raise ValueError(f"Missing required Travel columns: {', '.join(missing)}")

    records_created = 0

    for idx, row in df.iterrows():
        try:
            # 1. Parse date
            def parse_date(date_val):
                date_str = str(date_val).strip()
                for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%Y/%m/%d"):
                    try:
                        return datetime.strptime(date_str, fmt).date()
                    except ValueError:
                        continue
                raise ValueError(f"Unsupported travel date format: {date_val}")

            travel_date = parse_date(row['travel_date'])
            period_start = travel_date
            period_end = travel_date

            # 2. Process based on travel_mode
            raw_mode = str(row['travel_mode']).strip().upper()
            
            category = None
            activity_value = Decimal('0')
            activity_unit = ''
            factor_key = None
            
            if raw_mode == 'FLIGHT':
                category = 'FLIGHT'
                activity_unit = 'PKM'
                
                raw_dist = row.get('distance_km')
                if pd.isna(raw_dist) or str(raw_dist).strip().lower() in ['nan', 'null', '', '0', '0.0']:
                    origin = str(row.get('origin', ''))
                    dest = str(row.get('destination', ''))
                    distance = calculate_haversine_distance(origin, dest)
                else:
                    distance = float(raw_dist)

                activity_value = Decimal(str(distance))
                
                if distance < 3700.0:
                    factor_key = 'FLIGHT_SHORT_HAUL'
                else:
                    factor_key = 'FLIGHT_LONG_HAUL'

            elif raw_mode == 'HOTEL':
                category = 'HOTEL'
                activity_unit = 'ROOM_NIGHT'
                factor_key = 'HOTEL_STAY'
                
                nights = row.get('hotel_nights')
                if pd.isna(nights) or str(nights).strip().lower() in ['nan', 'null', '']:
                    nights = 1
                activity_value = Decimal(str(int(float(nights))))

                period_end = datetime.fromordinal(period_start.toordinal() + int(float(nights))).date()

            elif raw_mode in ['TRAIN', 'CAR_RENTAL', 'TAXI', 'GROUND']:
                category = 'GROUND_TRANSPORT'
                activity_unit = 'KM'
                factor_key = 'GROUND_TRANSPORT'
                
                raw_dist = row.get('distance_km')
                if pd.isna(raw_dist) or str(raw_dist).strip().lower() in ['nan', 'null', '', '0', '0.0']:
                    cost = row.get('cost')
                    if not pd.isna(cost) and float(cost) > 0:
                        activity_value = Decimal(str(float(cost) / 1.5))
                    else:
                        activity_value = Decimal('15.00')
                else:
                    activity_value = Decimal(str(raw_dist))

            else:
                raise ValueError(f"Unsupported travel mode: {raw_mode}")

            # 3. Retrieve factor
            try:
                emission_factor = EmissionFactor.objects.get(factor_key=factor_key)
            except EmissionFactor.DoesNotExist:
                raise ValueError(f"Emission factor not found for: {factor_key}")

            # 4. Save record
            record = EmissionRecord(
                organization=organization,
                data_source=data_source,
                scope=3,
                category=category,
                activity_value=activity_value,
                activity_unit=activity_unit,
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
