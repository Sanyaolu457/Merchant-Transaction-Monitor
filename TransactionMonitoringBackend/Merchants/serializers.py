from rest_framework import serializers
from .models import Merchant


class MerchantSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Merchant
        fields = [
            'merchant_id',
            'business_name',
            'business_type',
            'status',
            'email',
            'phone_number',
            'address',
            'created_at',
        ]
        read_only_fields = ['merchant_id', 'created_at']


class MerchantListSerializer(serializers.ModelSerializer):
    transaction_count = serializers.SerializerMethodField()

    class Meta:
        model  = Merchant
        fields = [
            'merchant_id',
            'business_name',
            'business_type',
            'status',
            'email',
            'phone_number',
            'address',
            'bank_name', 
            'account_number',      
            'account_name',
            'transaction_count',
            'created_at',
        ]

    def get_transaction_count(self, obj):
        return obj.transactions.count()