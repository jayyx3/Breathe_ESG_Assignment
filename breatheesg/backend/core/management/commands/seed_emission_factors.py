from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from core.models import EmissionFactor, Organization

class Command(BaseCommand):
    help = "Seeds the database with standard UK DESNZ 2023 Emission Factors, a default Organization, and a superuser."

    def handle(self, *args, **options):
        self.stdout.write("Bootstrapping system...")

        # 1. Seed Organization (tenant)
        org, org_created = Organization.objects.get_or_create(
            name="BreatheESG Demo Corp"
        )
        if org_created:
            self.stdout.write(self.style.SUCCESS(f"Created default organization: {org.name}"))
        else:
            self.stdout.write(f"Organization '{org.name}' already exists.")

        # 2. Seed Superuser for development/testing
        if not User.objects.filter(username="admin").exists():
            User.objects.create_superuser("admin", "admin@breatheesg.com", "password123")
            self.stdout.write(self.style.SUCCESS("Created demo superuser: username='admin', password='password123'"))
        else:
            self.stdout.write("Superuser 'admin' already exists.")

        # 3. Seed UK DESNZ 2023 Emission Factors
        factors_data = [
            # Scope 1 (Direct fuel)
            {
                "name": "Diesel - UK DESNZ 2023",
                "category": "FUEL",
                "factor_key": "DIESEL",
                "factor_value": 2.680000,
                "unit": "L",
                "source_reference": "UK DESNZ 2023"
            },
            {
                "name": "Petrol - UK DESNZ 2023",
                "category": "FUEL",
                "factor_key": "PETROL",
                "factor_value": 2.310000,
                "unit": "L",
                "source_reference": "UK DESNZ 2023"
            },
            {
                "name": "Natural Gas - UK DESNZ 2023",
                "category": "FUEL",
                "factor_key": "NATURAL_GAS",
                "factor_value": 2.040000,
                "unit": "M3",
                "source_reference": "UK DESNZ 2023"
            },
            # Scope 2 (Electricity)
            {
                "name": "Electricity (grid average UK) - UK DESNZ 2023",
                "category": "ELECTRICITY",
                "factor_key": "ELECTRICITY",
                "factor_value": 0.207000,
                "unit": "KWH",
                "source_reference": "UK DESNZ 2023"
            },
            # Scope 3 (Travel - Flights)
            {
                "name": "Flight Economy Short Haul (<3700km) - UK DESNZ 2023",
                "category": "FLIGHT",
                "factor_key": "FLIGHT_SHORT_HAUL",
                "factor_value": 0.255000,
                "unit": "PKM",
                "source_reference": "UK DESNZ 2023"
            },
            {
                "name": "Flight Economy Long Haul - UK DESNZ 2023",
                "category": "FLIGHT",
                "factor_key": "FLIGHT_LONG_HAUL",
                "factor_value": 0.195000,
                "unit": "PKM",
                "source_reference": "UK DESNZ 2023"
            },
            # Scope 3 (Travel - Hotels)
            {
                "name": "Hotel Stay - UK DESNZ 2023",
                "category": "HOTEL",
                "factor_key": "HOTEL_STAY",
                "factor_value": 20.800000,
                "unit": "ROOM_NIGHT",
                "source_reference": "UK DESNZ 2023"
            },
            # Scope 3 (Travel - Ground)
            {
                "name": "Car Rental / Taxi - UK DESNZ 2023",
                "category": "GROUND_TRANSPORT",
                "factor_key": "GROUND_TRANSPORT",
                "factor_value": 0.168000,
                "unit": "KM",
                "source_reference": "UK DESNZ 2023"
            }
        ]

        for item in factors_data:
            ef, created = EmissionFactor.objects.get_or_create(
                factor_key=item["factor_key"],
                defaults={
                    "name": item["name"],
                    "category": item["category"],
                    "factor_value": item["factor_value"],
                    "unit": item["unit"],
                    "source_reference": item["source_reference"]
                }
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f"Seeded Emission Factor: {ef.name} ({ef.factor_value} kg CO2e/{ef.unit})"))
            else:
                # Update existing in case factors changed
                ef.name = item["name"]
                ef.category = item["category"]
                ef.factor_value = item["factor_value"]
                ef.unit = item["unit"]
                ef.source_reference = item["source_reference"]
                ef.save()
                self.stdout.write(f"Updated Emission Factor: {ef.name}")

        self.stdout.write(self.style.SUCCESS("Bootstrap completed successfully!"))
