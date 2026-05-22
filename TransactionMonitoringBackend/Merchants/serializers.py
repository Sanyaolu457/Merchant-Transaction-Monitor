from rest_framework import serializers
from .models import Merchant
from django.db.models import Sum


class MerchantSerializer(serializers.ModelSerializer):
    transaction_count  = serializers.SerializerMethodField()

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
    total_volume       = serializers.SerializerMethodField() 

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
            'total_volume', 
            'created_at',
        ]

    def get_transaction_count(self, obj):
        return obj.transactions.count()
    
    def get_total_volume(self, obj):
        result = obj.transactions.aggregate(
            total=Sum('amount')
        )['total']
        return float(result or 0)