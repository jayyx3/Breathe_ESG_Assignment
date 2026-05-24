from django.contrib.auth.models import User
from rest_framework import serializers
from core.models import Organization, DataSource, EmissionFactor, EmissionRecord, AuditLog

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']


class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ['id', 'name', 'created_at']


class DataSourceSerializer(serializers.ModelSerializer):
    uploaded_by_details = UserSerializer(source='uploaded_by', read_only=True)
    source_type_display = serializers.CharField(source='get_source_type_display', read_only=True)

    class Meta:
        model = DataSource
        fields = [
            'id', 'organization', 'file_name', 'uploaded_by', 
            'uploaded_by_details', 'uploaded_at', 'source_type', 
            'source_type_display', 'row_count'
        ]


class EmissionFactorSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source='get_category_display', read_only=True)

    class Meta:
        model = EmissionFactor
        fields = [
            'id', 'name', 'category', 'category_display', 
            'factor_key', 'factor_value', 'unit', 'source_reference'
        ]


class AuditLogSerializer(serializers.ModelSerializer):
    changed_by_username = serializers.CharField(source='changed_by.username', read_only=True)

    class Meta:
        model = AuditLog
        fields = ['id', 'changed_by', 'changed_by_username', 'changed_at', 'action', 'new_value']


class EmissionRecordSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    data_source_file_name = serializers.CharField(source='data_source.file_name', read_only=True)
    scope_display = serializers.CharField(source='get_scope_display', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    emission_factor_details = EmissionFactorSerializer(source='emission_factor', read_only=True)
    reviewed_by_username = serializers.CharField(source='reviewed_by.username', read_only=True)

    class Meta:
        model = EmissionRecord
        fields = [
            'id', 'organization', 'organization_name', 'data_source', 
            'data_source_file_name', 'scope', 'scope_display', 'category', 
            'category_display', 'activity_value', 'activity_unit', 
            'normalized_value_kwh', 'emission_factor', 'emission_factor_details', 
            'co2e_kg', 'period_start', 'period_end', 'source_row_number', 
            'source_raw_json', 'status', 'status_display', 'flag_reason', 
            'reviewed_by', 'reviewed_by_username', 'reviewed_at', 
            'created_at', 'updated_at'
        ]
        read_only_fields = ['co2e_kg', 'reviewed_by', 'reviewed_at', 'created_at', 'updated_at']


class EmissionRecordDetailSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    data_source_file_name = serializers.CharField(source='data_source.file_name', read_only=True)
    scope_display = serializers.CharField(source='get_scope_display', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    emission_factor_details = EmissionFactorSerializer(source='emission_factor', read_only=True)
    reviewed_by_username = serializers.CharField(source='reviewed_by.username', read_only=True)
    audit_logs = AuditLogSerializer(many=True, read_only=True)

    class Meta:
        model = EmissionRecord
        fields = [
            'id', 'organization', 'organization_name', 'data_source', 
            'data_source_file_name', 'scope', 'scope_display', 'category', 
            'category_display', 'activity_value', 'activity_unit', 
            'normalized_value_kwh', 'emission_factor', 'emission_factor_details', 
            'co2e_kg', 'period_start', 'period_end', 'source_row_number', 
            'source_raw_json', 'status', 'status_display', 'flag_reason', 
            'reviewed_by', 'reviewed_by_username', 'reviewed_at', 
            'created_at', 'updated_at', 'audit_logs'
        ]
