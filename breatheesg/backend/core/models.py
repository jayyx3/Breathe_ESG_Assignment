import uuid
from decimal import Decimal
from django.db import models
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError

class Organization(models.Model):
    """
    Represents a tenant (client company) in the multi-tenant system.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True, help_text="Name of the client organization")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class DataSource(models.Model):
    """
    Tracks each ingested data file or payload.
    """
    SOURCE_TYPES = [
        ('SAP', 'SAP Fuel & Procurement CSV'),
        ('UTILITY', 'Utility Portal Electricity CSV'),
        ('TRAVEL', 'Concur Corporate Travel CSV'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="data_sources")
    file_name = models.CharField(max_length=255)
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="uploaded_sources")
    uploaded_at = models.DateTimeField(auto_now_add=True)
    source_type = models.CharField(max_length=20, choices=SOURCE_TYPES)
    row_count = models.IntegerField(default=0, help_text="Number of rows parsed and saved")

    def __str__(self):
        return f"{self.get_source_type_display()} - {self.file_name} ({self.organization.name})"


class EmissionFactor(models.Model):
    """
    Lookup table for UK DESNZ 2023 or other emission factor coefficients.
    """
    CATEGORIES = [
        ('FUEL', 'Fuel Combustion (Scope 1)'),
        ('ELECTRICITY', 'Electricity Consumption (Scope 2)'),
        ('FLIGHT', 'Business Flight (Scope 3)'),
        ('HOTEL', 'Hotel Accommodation (Scope 3)'),
        ('GROUND_TRANSPORT', 'Ground Transport (Scope 3)'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True, help_text="e.g. Diesel - UK DESNZ 2023")
    category = models.CharField(max_length=30, choices=CATEGORIES)
    factor_key = models.CharField(max_length=100, unique=True, help_text="e.g. DIESEL, PETROL, FLIGHT_SHORT, FLIGHT_LONG")
    factor_value = models.DecimalField(max_digits=12, decimal_places=6, help_text="kg CO2e per unit")
    unit = models.CharField(max_length=50, help_text="e.g. L, KG, M3, KWH, PKM, ROOM_NIGHT, KM")
    source_reference = models.CharField(max_length=255, default="UK DESNZ 2023", help_text="Origin of the emission factor")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.factor_value} kg CO2e / {self.unit})"


class EmissionRecord(models.Model):
    """
    Normalized core emission transaction record.
    """
    SCOPE_CHOICES = [
        (1, 'Scope 1 (Direct Emissions)'),
        (2, 'Scope 2 (Indirect Emissions)'),
        (3, 'Scope 3 (Value Chain)'),
    ]

    CATEGORY_CHOICES = [
        ('FUEL', 'Fuel Combustion'),
        ('ELECTRICITY', 'Electricity Consumption'),
        ('FLIGHT', 'Business Flight'),
        ('HOTEL', 'Hotel Stay'),
        ('GROUND_TRANSPORT', 'Ground Transport'),
    ]

    STATUS_CHOICES = [
        ('PENDING', 'Pending Review'),
        ('FLAGGED', 'Flagged for Investigation'),
        ('APPROVED', 'Approved by Analyst'),
        ('LOCKED', 'Locked for Audit'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="emission_records")
    data_source = models.ForeignKey(DataSource, on_delete=models.CASCADE, related_name="records", null=True, blank=True)
    
    scope = models.IntegerField(choices=SCOPE_CHOICES)
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES)
    
    # Raw values from the ingestion source
    activity_value = models.DecimalField(max_digits=15, decimal_places=4, help_text="Raw input activity quantity")
    activity_unit = models.CharField(max_length=50, help_text="Raw input unit (e.g. L, Gal, kWh, km)")
    
    # Normalized fields
    normalized_value_kwh = models.DecimalField(max_digits=15, decimal_places=4, null=True, blank=True, help_text="Energy content in kWh (if applicable)")
    emission_factor = models.ForeignKey(EmissionFactor, on_delete=models.PROTECT, related_name="records")
    co2e_kg = models.DecimalField(max_digits=18, decimal_places=4, null=True, blank=True, help_text="Calculated greenhouse gas emissions in kg CO2e")
    
    # Date/Time context
    period_start = models.DateField()
    period_end = models.DateField()
    
    # Traceability
    source_row_number = models.IntegerField(null=True, blank=True, help_text="Line number in the original upload")
    source_raw_json = models.JSONField(help_text="Full original raw row content from CSV")
    
    # Governance & Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    flag_reason = models.TextField(null=True, blank=True, help_text="Explanation if flagged")
    
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="reviewed_records")
    reviewed_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-period_start', '-created_at']

    def __str__(self):
        return f"{self.category} - {self.co2e_kg} kg CO2e ({self.status}) for {self.organization.name}"

    def clean(self):
        """
        Validate business rules before saving.
        """
        if self.period_start > self.period_end:
            raise ValidationError("Period start date cannot be after the end date.")
            
        if self.status == 'FLAGGED' and not self.flag_reason:
            raise ValidationError("A flag reason must be provided if the status is FLAGGED.")
            
        if self.status == 'APPROVED' and self.status == 'LOCKED':
            if not self.reviewed_by:
                raise ValidationError("An approving analyst must be specified.")

    def save(self, *args, **kwargs):
        # Quantize inputs to exactly 4 decimal places to prevent DecimalField overflow validation errors
        if self.activity_value is not None:
            self.activity_value = Decimal(str(self.activity_value)).quantize(Decimal('0.0001'))
        if self.normalized_value_kwh is not None:
            self.normalized_value_kwh = Decimal(str(self.normalized_value_kwh)).quantize(Decimal('0.0001'))

        # Calculate co2e_kg if not explicitly overridden (or always maintain it based on activity * factor)
        if self.emission_factor:
            multiplier = 1
            if self.category == 'FLIGHT' and self.source_raw_json:
                airline_class = self.source_raw_json.get('airline_class', '').upper()
                if airline_class == 'BUSINESS':
                    multiplier = 2
                elif airline_class == 'FIRST':
                    multiplier = 2.5
            
            raw_co2e = Decimal(str(self.activity_value)) * Decimal(str(self.emission_factor.factor_value)) * Decimal(str(multiplier))
            self.co2e_kg = raw_co2e.quantize(Decimal('0.0001'))

        # Enforce full validation
        self.full_clean()

        # Capture old values for AuditLog if record already exists
        is_new = self._state.adding
        old_status = None
        old_flag_reason = None
        old_co2e = None
        
        if not is_new:
            try:
                original = EmissionRecord.objects.get(pk=self.pk)
                old_status = original.status
                old_flag_reason = original.flag_reason
                old_co2e = original.co2e_kg
            except EmissionRecord.DoesNotExist:
                pass

        super().save(*args, **kwargs)

        # Write to AuditLog
        if is_new:
            AuditLog.objects.create(
                record=self,
                action='CREATE',
                new_value=f"Created with status: {self.status}, emissions: {self.co2e_kg} kg CO2e",
                changed_by=self.reviewed_by
            )
        else:
            # Log changes
            changes = []
            if old_status != self.status:
                changes.append(f"Status changed from '{old_status}' to '{self.status}'")
            if old_flag_reason != self.flag_reason:
                changes.append(f"Flag reason changed from '{old_flag_reason}' to '{self.flag_reason}'")
            if old_co2e != self.co2e_kg:
                changes.append(f"Emissions recalculated from {old_co2e} to {self.co2e_kg} kg CO2e")
                
            if changes:
                AuditLog.objects.create(
                    record=self,
                    action='UPDATE_STATUS' if old_status != self.status else 'UPDATE',
                    new_value="; ".join(changes),
                    changed_by=self.reviewed_by
                )


class AuditLog(models.Model):
    """
    Keeps a tamper-proof audit trail of modifications to each EmissionRecord.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    record = models.ForeignKey(EmissionRecord, on_delete=models.CASCADE, related_name="audit_logs")
    changed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="audit_actions")
    changed_at = models.DateTimeField(auto_now_add=True)
    action = models.CharField(max_length=20, help_text="e.g. CREATE, UPDATE, APPROVE, FLAGGED, LOCK")
    new_value = models.TextField(help_text="Description of values updated")

    class Meta:
        ordering = ['-changed_at']

    def __str__(self):
        user_str = self.changed_by.username if self.changed_by else "System"
        return f"{self.action} on {self.record.id} by {user_str} at {self.changed_at}"
