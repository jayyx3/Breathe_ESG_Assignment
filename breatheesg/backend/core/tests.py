from datetime import date
from django.test import TestCase
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from core.models import Organization, DataSource, EmissionFactor, EmissionRecord, AuditLog

class EmissionRecordModelTests(TestCase):
    def setUp(self):
        # Create organization
        self.org = Organization.objects.create(name="Test Org")
        
        # Create user
        self.user = User.objects.create_user(username="analyst", password="password")
        
        # Create emission factors
        self.diesel_factor = EmissionFactor.objects.create(
            name="Diesel Test Factor",
            category="FUEL",
            factor_key="DIESEL",
            factor_value=2.68,
            unit="L"
        )
        self.flight_factor = EmissionFactor.objects.create(
            name="Flight Test Factor",
            category="FLIGHT",
            factor_key="FLIGHT_SHORT",
            factor_value=0.255,
            unit="PKM"
        )

    def test_standard_emission_calculation(self):
        """
        Standard record calculations: activity_value * factor_value.
        """
        record = EmissionRecord.objects.create(
            organization=self.org,
            scope=1,
            category="FUEL",
            activity_value=100.00,
            activity_unit="L",
            emission_factor=self.diesel_factor,
            period_start=date(2023, 1, 1),
            period_end=date(2023, 1, 31),
            source_raw_json={"item": "diesel fuel purchase"}
        )
        # 100 * 2.68 = 268.00
        self.assertEqual(record.co2e_kg, 268.00)

    def test_flight_multiplier_calculation(self):
        """
        Flight records apply class multiplier: economy = 1x, business = 2x.
        """
        # Economy (Default)
        econ_record = EmissionRecord.objects.create(
            organization=self.org,
            scope=3,
            category="FLIGHT",
            activity_value=1000.00,
            activity_unit="PKM",
            emission_factor=self.flight_factor,
            period_start=date(2023, 1, 1),
            period_end=date(2023, 1, 31),
            source_raw_json={"airline_class": "ECONOMY"}
        )
        self.assertEqual(econ_record.co2e_kg, 255.00)  # 1000 * 0.255 * 1

        # Business (2.0x multiplier)
        biz_record = EmissionRecord.objects.create(
            organization=self.org,
            scope=3,
            category="FLIGHT",
            activity_value=1000.00,
            activity_unit="PKM",
            emission_factor=self.flight_factor,
            period_start=date(2023, 1, 1),
            period_end=date(2023, 1, 31),
            source_raw_json={"airline_class": "BUSINESS"}
        )
        self.assertEqual(biz_record.co2e_kg, 510.00)  # 1000 * 0.255 * 2

    def test_date_validation(self):
        """
        Clean should fail if period start is after period end.
        """
        record = EmissionRecord(
            organization=self.org,
            scope=1,
            category="FUEL",
            activity_value=50.00,
            activity_unit="L",
            emission_factor=self.diesel_factor,
            period_start=date(2023, 2, 1),
            period_end=date(2023, 1, 31),  # Invalid end date before start
            source_raw_json={}
        )
        with self.assertRaises(ValidationError):
            record.full_clean()

    def test_flag_reason_required_when_flagged(self):
        """
        Clean should fail if status is FLAGGED but flag_reason is not provided.
        """
        record = EmissionRecord(
            organization=self.org,
            scope=1,
            category="FUEL",
            activity_value=50.00,
            activity_unit="L",
            emission_factor=self.diesel_factor,
            period_start=date(2023, 1, 1),
            period_end=date(2023, 1, 31),
            status="FLAGGED",
            flag_reason=None, # Missing flag reason
            source_raw_json={}
        )
        with self.assertRaises(ValidationError):
            record.full_clean()

    def test_audit_trail_on_creation_and_update(self):
        """
        Audit log entries must be created on create and updates.
        """
        record = EmissionRecord.objects.create(
            organization=self.org,
            scope=1,
            category="FUEL",
            activity_value=100.00,
            activity_unit="L",
            emission_factor=self.diesel_factor,
            period_start=date(2023, 1, 1),
            period_end=date(2023, 1, 31),
            source_raw_json={"item": "diesel"}
        )
        
        # Verify CREATE log
        logs = AuditLog.objects.filter(record=record)
        self.assertEqual(logs.count(), 1)
        self.assertEqual(logs[0].action, "CREATE")
        
        # Perform status change update
        record.status = "FLAGGED"
        record.flag_reason = "Suspiciously high value"
        record.reviewed_by = self.user
        record.save()
        
        # Verify UPDATE_STATUS log
        logs = AuditLog.objects.filter(record=record).order_by("-changed_at")
        self.assertEqual(logs.count(), 2)
        self.assertEqual(logs[0].action, "UPDATE_STATUS")
        self.assertIn("Status changed from 'PENDING' to 'FLAGGED'", logs[0].new_value)
        self.assertEqual(logs[0].changed_by, self.user)
