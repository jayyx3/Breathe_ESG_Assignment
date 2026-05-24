from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from api.views import (
    SapIngestView,
    UtilityIngestView,
    TravelIngestView,
    EmissionRecordViewSet,
    DashboardSummaryView
)

# Standard DRF router
router = DefaultRouter()
router.register(r'records', EmissionRecordViewSet, basename='records')

urlpatterns = [
    # Auth (Simple JWT)
    path('auth/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Ingest uploads
    path('ingest/sap/', SapIngestView.as_view(), name='ingest_sap'),
    path('ingest/utility/', UtilityIngestView.as_view(), name='ingest_utility'),
    path('ingest/travel/', TravelIngestView.as_view(), name='ingest_travel'),
    
    # Analytics / Dashboard
    path('dashboard/summary/', DashboardSummaryView.as_view(), name='dashboard_summary'),
    
    # Model viewsets (Records listing, retrieve detail, inline reviews patch)
    path('', include(router.urls)),
]
