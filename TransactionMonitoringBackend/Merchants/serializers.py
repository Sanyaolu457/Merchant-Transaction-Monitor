from rest_framework import serializers
from .models import Merchant
from django.db.models import Sum


class MerchantSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(max_length=150, required=False, write_only=True)
    last_name  = serializers.CharField(max_length=150, required=False, write_only=True)
    terminal_count = serializers.SerializerMethodField()
    
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
            'first_name', 
            'last_name',
            'bank_name',
            'account_number',
            'terminal_count'
            'account_name',
            'created_at',
        ]
        read_only_fields = ['merchant_id', 'created_at']

    def get_terminal_count(self, obj):
        return obj.terminals_count()
    
    def create(self, validated_data):
        validated_data.pop('first_name', None)
        validated_data.pop('last_name', None)
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        first_name = validated_data.pop('first_name', None)
        last_name  = validated_data.pop('last_name', None)

        if instance.user and (first_name or last_name):
            if first_name:
                instance.user.first_name = first_name
            if last_name:
                instance.user.last_name = last_name
            instance.user.save(update_fields=[
                f for f in ['first_name', 'last_name']
                if (f == 'first_name' and first_name) or (f == 'last_name' and last_name)
            ])

        return super().update(instance, validated_data)


class MerchantListSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField( source='user.first_name', read_only=True )
    last_name = serializers.CharField( source='user.last_name', read_only=True )
    invite_status = serializers.CharField(source='user.invite_status', read_only=True )
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
            'first_name',
            'last_name',
            'address',
            'bank_name', 
            'account_number',      
            'account_name',
            'invite_status',
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