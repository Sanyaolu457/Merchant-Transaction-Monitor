from rest_framework import serializers
from django.utils   import timezone
from .models import FlagRule, TransactionFlag, FlagAuditLog, OperatorReport

class FlagRuleSerializer(serializers.ModelSerializer):
    triggered_count = serializers.SerializerMethodField()

    class Meta:
        model  = FlagRule
        fields = [
            'id',
            'name',
            'rule_type',
            'description',
            'is_active',
            'weight',
            'risk_level',
            'threshold_amount',
            'threshold_count',
            'threshold_minutes',
            'merchant',
            'triggered_count',
            'created_at',
        ]
        read_only_fields = ['created_at', 'triggered_count']

    def get_triggered_count(self, obj):
        return obj.triggered_flags.count()

    def validate(self, data):
        rule_type = data.get('rule_type', getattr(self.instance, 'rule_type', None))

        if rule_type == 'amount_threshold':
            val = data.get('threshold_amount', getattr(self.instance, 'threshold_amount', None))
            if not val:
                raise serializers.ValidationError(
                    {'threshold_amount': 'Required for amount_threshold rules.'}
                )

        if rule_type == 'frequency':
            for field in ('threshold_count', 'threshold_minutes'):
                val = data.get(field, getattr(self.instance, field, None))
                if not val:
                    raise serializers.ValidationError(
                        {field: f'Required for frequency rules.'}
                    )
        return data


class FlagRuleListSerializer(serializers.ModelSerializer):
    merchant_name   = serializers.CharField(
        source='merchant.business_name', read_only=True, default=None
    )
    triggered_count = serializers.SerializerMethodField()

    class Meta:
        model  = FlagRule
        fields = [
            'id',
            'name',
            'rule_type',
            'is_active',
            'weight',
            'risk_level',
            'merchant_name',
            'triggered_count',
            'created_at',
        ]

    def get_triggered_count(self, obj):
        return obj.triggered_flags.count()

class TransactionFlagSerializer(serializers.ModelSerializer):
    rule_name             = serializers.CharField(source='rule.name',       read_only=True)
    rule_type             = serializers.CharField(source='rule.rule_type',  read_only=True)
    risk_level            = serializers.CharField(source='rule.risk_level', read_only=True)
    transaction_reference = serializers.CharField(source='transaction.reference', read_only=True)

    class Meta:
        model  = TransactionFlag
        fields = [
            'id',
            'transaction_reference',
            'rule_name',
            'rule_type',
            'risk_level',
            'detail',
            'flagged_at',
        ]
        read_only_fields = fields

class FlagAuditLogSerializer(serializers.ModelSerializer):
    performed_by        = serializers.SerializerMethodField()
    transaction_reference = serializers.CharField(
        source='transaction.reference', read_only=True
    )

    class Meta:
        model  = FlagAuditLog
        fields = [
            'id',
            'transaction_reference',
            'action',
            'performed_by',
            'reason',
            'timestamp',
        ]
        read_only_fields = fields

    def get_performed_by(self, obj):
        if obj.performed_by_id:
            return {
                'id':    obj.performed_by_id,
                'email': obj.performed_by.email,
                'role':  getattr(obj.performed_by, 'role', None),
            }
        return {'id': None, 'email': 'Risk Engine (automated)', 'role': 'system'}


class OperatorReportCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = OperatorReport
        fields = [
            'transaction',
            'severity',
            'title',
            'description',
        ]

    def validate_title(self, value):
        if len(value.strip()) < 5:
            raise serializers.ValidationError("Title must be at least 5 characters.")
        return value.strip()

    def validate_description(self, value):
        if len(value.strip()) < 20:
            raise serializers.ValidationError(
                "Description must be at least 20 characters. Please be specific."
            )
        return value.strip()


class OperatorReportListSerializer(serializers.ModelSerializer):
    submitted_by          = serializers.SerializerMethodField()
    transaction_reference = serializers.CharField(
        source='transaction.reference', read_only=True
    )

    class Meta:
        model  = OperatorReport
        fields = [
            'id',
            'transaction_reference',
            'severity',
            'title',
            'status',
            'submitted_by',
            'created_at',
        ]

    def get_submitted_by(self, obj):
        if obj.submitted_by_id:
            return {'id': obj.submitted_by_id, 'email': obj.submitted_by.email}
        return None


class OperatorReportDetailSerializer(serializers.ModelSerializer):
    submitted_by = serializers.SerializerMethodField()
    resolved_by  = serializers.SerializerMethodField()
    transaction_reference = serializers.CharField(
        source='transaction.reference', read_only=True
    )
    transaction_risk_level = serializers.CharField(
        source='transaction.risk_level', read_only=True
    )
    transaction_risk_score = serializers.IntegerField(
        source='transaction.risk_score', read_only=True
    )
    transaction_risk_reasons = serializers.JSONField(
        source='transaction.risk_reasons', read_only=True
    )

    class Meta:
        model  = OperatorReport
        fields = [
            'id',
            'transaction_reference',
            'transaction_risk_level',
            'transaction_risk_score',
            'transaction_risk_reasons',
            'severity',
            'title',
            'description',
            'status',
            'submitted_by',
            'resolved_by',
            'resolution_note',
            'resolved_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields

    def get_submitted_by(self, obj):
        if obj.submitted_by_id:
            return {'id': obj.submitted_by_id, 'email': obj.submitted_by.email}
        return None

    def get_resolved_by(self, obj):
        if obj.resolved_by_id:
            return {'id': obj.resolved_by_id, 'email': obj.resolved_by.email}
        return None


class OperatorReportResolveSerializer(serializers.ModelSerializer):
    class Meta:
        model  = OperatorReport
        fields = ['status', 'resolution_note']

    def validate_status(self, value):
        allowed = {'resolved', 'dismissed', 'under_review'}
        if value not in allowed:
            raise serializers.ValidationError(
                f"Status must be one of: {', '.join(allowed)}."
            )
        return value

    def validate(self, data):
        status = data.get('status')
        note   = data.get('resolution_note', '').strip()
        if status in ('resolved', 'dismissed') and not note:
            raise serializers.ValidationError(
                {'resolution_note': 'A resolution note is required when resolving or dismissing.'}
            )
        return data

    def update(self, instance, validated_data):
        instance.status          = validated_data['status']
        instance.resolution_note = validated_data.get('resolution_note', '')
        instance.resolved_by     = validated_data.get('resolved_by', instance.resolved_by)
        if instance.status in ('resolved', 'dismissed'):
            instance.resolved_at = timezone.now()
        instance.save()
        return instance