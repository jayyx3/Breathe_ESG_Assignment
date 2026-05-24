import io
from django.test import TestCase
from django.urls import reverse
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from core.models import Organization, EmissionFactor, EmissionRecord, DataSource, AuditLog

class BreatheESGAPITests(APITestCase):
    def setUp(self):
        # 1. Create Organization
        self.org = Organization.objects.create(name="BreatheESG Demo Corp")
        
        # 2. Create Users
        self.user = User.objects.create_user(username="analyst", password="password123")
        self.admin_user = User.objects.create_superuser(username="admin", email="admin@breatheesg.com", password="password123")

        # 3. Create Emission Factors (Same as seeded)
        self.diesel_factor = EmissionFactor.objects.create(
            name="Diesel - UK DESNZ 2023",
            category="FUEL",
            factor_key="DIESEL",
            factor_value=2.680000,
            unit="L",
            source_reference="UK DESNZ 2023"
        )
        self.electricity_factor = EmissionFactor.objects.create(
            name="Electricity (grid average UK) - UK DESNZ 2023",
            category="ELECTRICITY",
            factor_key="ELECTRICITY",
            factor_value=0.207000,
            unit="KWH",
            source_reference="UK DESNZ 2023"
        )
        self.flight_short = EmissionFactor.objects.create(
            name="Flight Economy Short Haul (<3700km) - UK DESNZ 2023",
            category="FLIGHT",
            factor_key="FLIGHT_SHORT_HAUL",
            factor_value=0.255000,
            unit="PKM",
            source_reference="UK DESNZ 2023"
        )

        # 4. Get JWT Token for authenticating subsequent requests
        login_url = reverse('token_obtain_pair')
        response = self.client.post(login_url, {'username': 'analyst', 'password': 'password123'})
        self.token = response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')

    def test_jwt_login_successful(self):
        """
        Verify that auth login returns valid JWT tokens.
        """
        self.client.credentials() # Clear credentials
        login_url = reverse('token_obtain_pair')
        response = self.client.post(login_url, {'username': 'analyst', 'password': 'password123'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_sap_ingestion_api(self):
        """
        Verify uploading SAP fuel CSV normalizes columns and calculates emissions.
        """
        url = reverse('ingest_sap')
        
        # Semicolon delimited SAP export format with German headers
        csv_data = (
            "Buchungsdatum;Werk;Material;Menge;Meins;Bwart\n"
            "24.05.2026;1000;B0001;100;L;101\n"
        )
        csv_file = SimpleUploadedFile("sap.csv", csv_data.encode('utf-8'), content_type="text/csv")
        
        response = self.client.post(url, {'file': csv_file}, format='multipart')
        if response.status_code != 201:
            print("SAP error response:", response.data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['rows_processed'], 1)
        
        # Verify database inserts
        records = EmissionRecord.objects.filter(category='FUEL')
        self.assertEqual(records.count(), 1)
        record = records.first()
        self.assertEqual(record.scope, 1)
        # 100L * 2.68 = 268.0 kg CO2e
        self.assertEqual(float(record.co2e_kg), 268.0)
        self.assertEqual(record.activity_unit, 'L')

    def test_utility_ingestion_api(self):
        """
        Verify uploading utility electricity CSV inserts Scope 2 records.
        """
        url = reverse('ingest_utility')
        
        csv_data = (
            "account_number,meter_id,service_address,billing_period_start,billing_period_end,usage_kwh,demand_kw,tariff_code,total_cost,currency\n"
            "ACC-12345,METER-99,123 Main St,2026-01-15,2026-02-14,2000,5.5,E-1,350.00,USD\n"
        )
        csv_file = SimpleUploadedFile("utility.csv", csv_data.encode('utf-8'), content_type="text/csv")
        
        response = self.client.post(url, {'file': csv_file}, format='multipart')
        if response.status_code != 201:
            print("Utility error response:", response.data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['rows_processed'], 1)
        
        records = EmissionRecord.objects.filter(category='ELECTRICITY')
        self.assertEqual(records.count(), 1)
        record = records.first()
        self.assertEqual(record.scope, 2)
        # 2000 kWh * 0.207 = 414.0 kg CO2e
        self.assertEqual(float(record.co2e_kg), 414.0)
        self.assertEqual(float(record.normalized_value_kwh), 2000.0)

    def test_travel_ingestion_api_haversine_distance(self):
        """
        Verify travel CSV with null distance runs Haversine airport lookup.
        """
        url = reverse('ingest_travel')
        
        # Flight from Munich (MUC) to London Heathrow (LHR) - approx 940 km
        csv_data = (
            "trip_id,employee_id,travel_date,origin,destination,travel_mode,distance_km,airline_class,hotel_nights,hotel_city,cost,currency\n"
            "TRIP-01,EMP-10,2026-03-01,MUC,LHR,FLIGHT,,ECONOMY,,,450.00,EUR\n"
        )
        csv_file = SimpleUploadedFile("travel.csv", csv_data.encode('utf-8'), content_type="text/csv")
        
        response = self.client.post(url, {'file': csv_file}, format='multipart')
        if response.status_code != 201:
            print("Travel error response:", response.data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['rows_processed'], 1)
        
        record = EmissionRecord.objects.get(category='FLIGHT')
        self.assertEqual(record.scope, 3)
        self.assertEqual(record.activity_unit, 'PKM')
        
        # Haversine distance between MUC (48.3538, 11.7861) and LHR (51.47, -0.4543) is ~940km
        self.assertAlmostEqual(float(record.activity_value), 940.7, delta=15.0)
        self.assertAlmostEqual(float(record.co2e_kg), 940.7 * 0.255, delta=5.0)

    def test_record_reviews_and_audit_logs(self):
        """
        Verify listing, retrieving detailed audit trails, and patching statuses works.
        """
        # Create record
        record = EmissionRecord.objects.create(
            organization=self.org,
            scope=1,
            category="FUEL",
            activity_value=100.00,
            activity_unit="L",
            emission_factor=self.diesel_factor,
            period_start=timezone.now().date(),
            period_end=timezone.now().date(),
            source_raw_json={"item": "fuel"}
        )

        # 1. Test GET list
        list_url = reverse('records-list')
        response = self.client.get(list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 2. Test PATCH Approve status
        detail_url = reverse('records-detail', kwargs={'pk': record.id})
        response = self.client.patch(detail_url, {'status': 'APPROVED'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Assert reviewed fields updated
        updated_record = EmissionRecord.objects.get(pk=record.id)
        self.assertEqual(updated_record.status, 'APPROVED')
        self.assertEqual(updated_record.reviewed_by, self.user)
        self.assertIsNotNone(updated_record.reviewed_at)

        # 3. Test Detail nested Audit Logs
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('audit_logs', response.data)
        self.assertEqual(len(response.data['audit_logs']), 2) # Create and UpdateStatus logs

    def test_dashboard_summary_view(self):
        """
        Verify dashboard aggregates calculate accurately.
        """
        # Create Scope 1 record
        EmissionRecord.objects.create(
            organization=self.org,
            scope=1,
            category="FUEL",
            activity_value=100.00,
            activity_unit="L",
            emission_factor=self.diesel_factor,
            period_start=timezone.now().date(),
            period_end=timezone.now().date(),
            source_raw_json={"item": "fuel"}
        )
        # Create Scope 2 record
        EmissionRecord.objects.create(
            organization=self.org,
            scope=2,
            category="ELECTRICITY",
            activity_value=1000.00,
            activity_unit="KWH",
            emission_factor=self.electricity_factor,
            period_start=timezone.now().date(),
            period_end=timezone.now().date(),
            source_raw_json={"item": "elec"}
        )
        
        url = reverse('dashboard_summary')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Scope 1 (100 * 2.68 = 268.0)
        self.assertEqual(response.data['totals_by_scope']['1'], 268.0)
        # Scope 2 (1000 * 0.207 = 207.0)
        self.assertEqual(response.data['totals_by_scope']['2'], 207.0)
        self.assertEqual(response.data['counts_by_status']['PENDING'], 2)
