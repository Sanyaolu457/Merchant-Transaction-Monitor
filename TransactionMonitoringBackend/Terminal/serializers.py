from rest_framework import serializers
from django.contrib.auth.hashers import make_password, check_password
from .models import Terminal, TerminalAssignmentLog
from Merchants.models import Merchant

class TerminalSerializer(serializers.ModelSerializer):
    transaction_count = serializers.SerializerMethodField()
    daily_volume = serializers.SerializerMethodField()
    merchant = serializers.SlugRelatedField( queryset=Merchant.objects.all(), slug_field='merchant_id')
    merchant_name = serializers.CharField(source='merchant.business_name', read_only = True)
    new_pin = serializers.CharField(write_only=True, required=False, min_length=4, max_length=6)

    class Meta:
        model = Terminal
        fields = [
            'terminal_id', 'serial_number', 'terminal_type', 'label',
            'status', 'merchant', 'merchant_name', 'location', 
            'per_transaction_limit', 'daily_limit', 'enforce_limits', 'allow_transfers', 
            'allow_withdrawals',  'allow_airtime', 'allow_bill_payment', 'allow_pos_purchase', 
            'allow_reversal', 'pin_reset_required', 'new_pin', 'transaction_count', 'daily_volume',
            'last_active', 'created_at', 'assigned_by',
        ]
        read_only_fields = ['terminal_id', 'created_at', 'created_by','serial_number', 'assigned_by', 'last_active']

    def get_transaction_count(self, obj):
        return obj.transaction_count
    
    def get_daily_volume(self, obj):
        return obj.daily_volume
    
    def create(self, validated_data):
        pin = validated_data.pop('new_pin', None)
        if pin:
            validated_data['supervisor_pin'] = make_password(pin)
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        pin = validated_data.pop('new_pin', None)
        if pin:
            validated_data['supervisor_pin'] = make_password(pin)
            validated_data['pin_reset_required'] = False

        return super().update(instance, validated_data)
    

class TerminalListSerializer(serializers.ModelSerializer):
    merchant_name     = serializers.CharField(source='merchant.business_name', read_only=True)
    transaction_count = serializers.SerializerMethodField()
    daily_volume      = serializers.SerializerMethodField()

    class Meta:
        model = Terminal
        fields = [
            'terminal_id', 'serial_number', 'terminal_type', 'label',
            'status', 'merchant', 'merchant_name', 'location',
            'enforce_limits', 'per_transaction_limit', 'daily_limit',
            'transaction_count', 'daily_volume', 'last_active', 'created_at',
        ]

    def get_transaction_count(self, obj):
        return obj.transaction_count

    def get_daily_volume(self, obj):
        return obj.daily_volume
    
class TerminalAssignmentLogSerializer(serializers.ModelSerializer):
    from_merchant_name = serializers.CharField(source='from_merchant.business_name', read_only=True)
    to_merchant_name   = serializers.CharField(source='to_merchant.business_name', read_only=True)
    assigned_by_name   = serializers.CharField(source='assigned_by.full_name', read_only=True)

    class Meta:
        model = TerminalAssignmentLog
        fields =  [
            'id', 'terminal', 'from_merchant', 'from_merchant_name', 'to_merchant',   
            'to_merchant_name', 'assigned_by',   'assigned_by_name', 'note', 'assigned_at',
        ]

class PINResetSerializer(serializers.Serializer):
    new_pin     = serializers.CharField(min_length=4, max_length=6, write_only=True)
    confirm_pin = serializers.CharField(min_length=4, max_length=6, write_only=True)

    def validate(self, data):
        if data['new_pin'] != data['confirm_pin']:
            raise serializers.ValidationError({'confirm_pin': 'PINs do not match.'})
        return data
    
class TerminalAssignSerializer(serializers.Serializer):
    merchant_id = serializers.UUIDField()
    note        = serializers.CharField(required=False, allow_blank=True)