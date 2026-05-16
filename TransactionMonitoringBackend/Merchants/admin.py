from django.contrib import admin
from .models import Merchant
from Transactions.models import Transaction


class TransactionInline(admin.TabularInline):
    model          = Transaction
    extra          = 0
    fields         = ['reference', 'amount', 'transaction_type', 'status', 'is_flagged', 'created_at']
    readonly_fields = ['reference', 'amount', 'transaction_type', 'status', 'is_flagged', 'created_at']
    can_delete     = False
    ordering       = ['-created_at']
    max_num        = 10 


@admin.register(Merchant)
class MerchantAdmin(admin.ModelAdmin):
    list_display   = [
        'business_name', 'business_type', 'status',
        'email', 'phone_number', 'transaction_count', 'created_at',
    ]
    list_filter    = ['status', 'business_type']
    search_fields  = ['business_name', 'email', 'phone_number']
    readonly_fields = ['merchant_id', 'created_by', 'created_at', 'updated_at']
    ordering       = ['-created_at']
    inlines        = [TransactionInline]

    fieldsets = (
        ('Business Info', {
            'fields': ('merchant_id', 'business_name', 'business_type', 'status')
        }),
        ('Contact', {
            'fields': ('email', 'phone_number', 'address')
        }),
        ('Meta', {
            'fields': ('created_by', 'created_at', 'updated_at')
        }),
    )

    actions = ['activate_merchants', 'suspend_merchants', 'deactivate_merchants']

    @admin.action(description='Activate selected merchants')
    def activate_merchants(self, request, queryset):
        queryset.update(status='active')

    @admin.action(description='Suspend selected merchants')
    def suspend_merchants(self, request, queryset):
        queryset.update(status='suspended')

    @admin.action(description='Deactivate selected merchants')
    def deactivate_merchants(self, request, queryset):
        queryset.update(status='inactive')

    def transaction_count(self, obj):
        return obj.transactions.count()
    transaction_count.short_description = 'Transactions'

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)