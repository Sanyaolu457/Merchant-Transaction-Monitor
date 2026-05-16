from rest_framework import serializers
from .models import Transaction, TransactionAuditLog, Channel, ChannelDetail
from Merchants.models import Merchant


class ChannelSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Channel
        fields = ['id', 'name']


class ChannelDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model  = ChannelDetail
        fields = ['id', 'name']


class TransactionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Transaction
        fields = [
            'merchant',
            'customer_name',
            'amount',
            'transaction_type',
            'status',
            'channel',
            'channel_detail',
        ]

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Amount must be greater than 0")
        return value

    def validate(self, data):
        channel        = data.get('channel')
        channel_detail = data.get('channel_detail')
        if channel_detail and channel:
            if channel_detail.channel != channel:
                raise serializers.ValidationError(
                    "Channel detail does not belong to selected channel"
                )
        return data


class TransactionListSerializer(serializers.ModelSerializer):
    merchant_name  = serializers.CharField(source='merchant.business_name', read_only=True)
    channel_name   = serializers.CharField(source='channel.name',           read_only=True)
    channel_detail_name = serializers.CharField( source='channel_detail.name', read_only=True)

    class Meta:
        model  = Transaction
        fields = [
            'id',
            'transaction_id',
            'reference',
            'merchant_name',
            'customer_name',
            'amount',
            'transaction_type',
            'status',
            'channel_name',
            'channel_detail_name',
            'is_flagged',
            'created_at',
        ]


class TransactionDetailSerializer(serializers.ModelSerializer):
    merchant       = serializers.CharField(source='merchant.business_name', read_only=True)
    channel        = ChannelSerializer(read_only=True)
    channel_detail = ChannelDetailSerializer(read_only=True)
    audit_logs     = serializers.SerializerMethodField()

    class Meta:
        model  = Transaction
        fields = [
            'id',
            'transaction_id',
            'reference',
            'merchant',
            'customer_name',
            'amount',
            'transaction_type',
            'status',
            'channel',
            'channel_detail',
            'is_flagged',
            'created_at',
            'updated_at',
            'audit_logs',
        ]

    def get_audit_logs(self, obj):
        logs = obj.audit_logs.all().order_by('-timestamp')
        return AuditLogSerializer(logs, many=True).data


class TransactionUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Transaction
        fields = ['status']

    def validate_status(self, value):
        valid = [s[0] for s in Transaction.TRANSACTION_STATUS]
        if value not in valid:
            raise serializers.ValidationError(f"Invalid status. Choose from {valid}")
        return value


class AuditLogSerializer(serializers.ModelSerializer):
    changed_by = serializers.CharField(source='changed_by.email', read_only=True)

    class Meta:
        model  = TransactionAuditLog
        fields = ['old_status', 'new_status', 'changed_by', 'reason', 'timestamp']