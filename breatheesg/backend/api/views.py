from django.db import transaction
from django.db.models import Sum, Count
from django.utils import timezone
from rest_framework import viewsets, status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated

from core.models import Organization, EmissionRecord, DataSource
from api.serializers import (
    EmissionRecordSerializer, 
    EmissionRecordDetailSerializer,
    DataSourceSerializer
)

# Import our custom parsers
from ingest.sap import parse_sap_csv
from ingest.utility import parse_utility_csv
from ingest.travel import parse_travel_csv


class SapIngestView(APIView):
    """
    POST /api/ingest/sap/
    Allows uploading SAP Fuel CSV files.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser]

    def post(self, request, format=None):
        if 'file' not in request.FILES:
            return Response({"error": "No file uploaded. Please send a CSV file under the key 'file'."}, status=status.HTTP_400_BAD_REQUEST)
        
        file = request.FILES['file']
        if not file.name.endswith('.csv'):
            return Response({"error": "Invalid file format. Only CSV files are supported."}, status=status.HTTP_400_BAD_REQUEST)

        # Resolve organization (default to first or seed)
        org = Organization.objects.first()
        if not org:
            org = Organization.objects.create(name="BreatheESG Demo Corp")

        try:
            # Read file content
            file_data = file.read().decode('utf-8')
            
            # Run parser in atomic transaction
            with transaction.atomic():
                result = parse_sap_csv(
                    file_data=file_data,
                    organization=org,
                    uploaded_by=request.user,
                    file_name=file.name
                )
                
            return Response({
                "message": "SAP CSV data successfully ingested.",
                "data_source_id": result["data_source_id"],
                "rows_processed": result["rows_processed"]
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class UtilityIngestView(APIView):
    """
    POST /api/ingest/utility/
    Allows uploading Utility Portal Electricity CSV files.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser]

    def post(self, request, format=None):
        if 'file' not in request.FILES:
            return Response({"error": "No file uploaded. Please send a CSV file under the key 'file'."}, status=status.HTTP_400_BAD_REQUEST)
        
        file = request.FILES['file']
        if not file.name.endswith('.csv'):
            return Response({"error": "Invalid file format. Only CSV files are supported."}, status=status.HTTP_400_BAD_REQUEST)

        org = Organization.objects.first()
        if not org:
            org = Organization.objects.create(name="BreatheESG Demo Corp")

        try:
            file_data = file.read().decode('utf-8')
            
            with transaction.atomic():
                result = parse_utility_csv(
                    file_data=file_data,
                    organization=org,
                    uploaded_by=request.user,
                    file_name=file.name
                )
                
            return Response({
                "message": "Utility CSV data successfully ingested.",
                "data_source_id": result["data_source_id"],
                "rows_processed": result["rows_processed"]
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class TravelIngestView(APIView):
    """
    POST /api/ingest/travel/
    Allows uploading Concur Expense Travel CSV files.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser]

    def post(self, request, format=None):
        if 'file' not in request.FILES:
            return Response({"error": "No file uploaded. Please send a CSV file under the key 'file'."}, status=status.HTTP_400_BAD_REQUEST)
        
        file = request.FILES['file']
        if not file.name.endswith('.csv'):
            return Response({"error": "Invalid file format. Only CSV files are supported."}, status=status.HTTP_400_BAD_REQUEST)

        org = Organization.objects.first()
        if not org:
            org = Organization.objects.create(name="BreatheESG Demo Corp")

        try:
            file_data = file.read().decode('utf-8')
            
            with transaction.atomic():
                result = parse_travel_csv(
                    file_data=file_data,
                    organization=org,
                    uploaded_by=request.user,
                    file_name=file.name
                )
                
            return Response({
                "message": "Corporate Travel CSV data successfully ingested.",
                "data_source_id": result["data_source_id"],
                "rows_processed": result["rows_processed"]
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class EmissionRecordViewSet(viewsets.ModelViewSet):
    """
    GET  /api/records/        -> List EmissionRecords (paginated and filterable)
    GET  /api/records/{id}/   -> Get single details with full Audit Trail
    PATCH/api/records/{id}/   -> Review, Approve or Flag an EmissionRecord
    """
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = EmissionRecord.objects.all().select_related(
            'organization', 'data_source', 'emission_factor', 'reviewed_by'
        )
        
        # Filtering by scope
        scope = self.request.query_params.get('scope')
        if scope:
            queryset = queryset.filter(scope=scope)

        # Filtering by category
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)

        # Filtering by status
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)

        # Filtering by DataSource ID
        source = self.request.query_params.get('data_source')
        if source:
            queryset = queryset.filter(data_source_id=source)

        return queryset

    def get_serializer_class(self):
        if self.action in ['retrieve']:
            return EmissionRecordDetailSerializer
        return EmissionRecordSerializer

    def perform_update(self, serializer):
        # When updating status (approve/flag/lock), dynamically save reviewed metadata
        instance = self.get_object()
        new_status = self.request.data.get('status', instance.status)
        
        # If transitioning status, log reviewer metadata
        if new_status != instance.status:
            serializer.save(
                reviewed_by=self.request.user,
                reviewed_at=timezone.now()
            )
        else:
            serializer.save()


class DashboardSummaryView(APIView):
    """
    GET /api/dashboard/summary/
    Computes total metrics by scope and counts by status.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, format=None):
        # 1. Total CO2e by Scope (1, 2, 3)
        scope_aggregates = EmissionRecord.objects.values('scope').annotate(
            total_co2e=Sum('co2e_kg')
        )
        
        totals_by_scope = {"1": 0.0, "2": 0.0, "3": 0.0}
        for item in scope_aggregates:
            scope_num = str(item['scope'])
            val = item['total_co2e']
            totals_by_scope[scope_num] = float(val) if val else 0.0

        # 2. Counts by Status
        status_aggregates = EmissionRecord.objects.values('status').annotate(
            count=Count('id')
        )
        
        counts_by_status = {
            'PENDING': 0,
            'FLAGGED': 0,
            'APPROVED': 0,
            'LOCKED': 0
        }
        for item in status_aggregates:
            status_str = item['status']
            counts_by_status[status_str] = item['count']

        # 3. Aggregated Categories (for charts)
        category_aggregates = EmissionRecord.objects.values('category').annotate(
            total_co2e=Sum('co2e_kg')
        )
        totals_by_category = {}
        for item in category_aggregates:
            cat = item['category']
            val = item['total_co2e']
            totals_by_category[cat] = float(val) if val else 0.0

        # 4. Data source overview
        uploaded_sources = DataSource.objects.all().order_by('-uploaded_at')[:5]
        sources_serializer = DataSourceSerializer(uploaded_sources, many=True)

        return Response({
            "totals_by_scope": totals_by_scope,
            "counts_by_status": counts_by_status,
            "totals_by_category": totals_by_category,
            "recent_uploads": sources_serializer.data,
            "grand_total_co2e_kg": sum(totals_by_scope.values())
        }, status=status.HTTP_200_OK)
