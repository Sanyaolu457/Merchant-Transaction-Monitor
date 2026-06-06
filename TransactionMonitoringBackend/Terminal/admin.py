from django.contrib import admin
from .models import Terminal, TerminalAssignmentLog


@admin.register(Terminal)
class TerminalAdmin(admin.ModelAdmin):
    list_display  = [
        'serial_number', 'label', 'terminal_type', 'status',
        'merchant', 'location', 'enforce_limits',
        'per_transaction_limit', 'daily_limit', 'last_active', 'created_at',
    ]
    list_filter   = ['status', 'terminal_type', 'enforce_limits']
    search_fields = ['serial_number', 'label', 'merchant__business_name', 'location']
    readonly_fields = ['terminal_id', 'created_at', 'serial_number', 'updated_at', 'last_active','created_by', 'assigned_by']
    fieldsets = (
        ('Identity',    {'fields': ('terminal_id', 'serial_number', 'terminal_type', 'label', 'status')}),
        ('Ownership',   {'fields': ('merchant', 'created_by', 'assigned_by')}),
        ('Location',    {'fields': ('location',)}),
        ('Security',    {'fields': ('supervisor_pin', 'pin_reset_required')}),
        ('Limits',      {'fields': ('enforce_limits', 'per_transaction_limit', 'daily_limit')}),
        ('Features',    {'fields': ('allow_transfers', 'allow_withdrawals', 'allow_airtime', 'allow_bill_payment', 'allow_pos_purchase', 'allow_reversal')}),
        ('Timestamps',  {'fields': ('last_active', 'created_at', 'updated_at')}),
    )

    def save_model(self, request, obj, form, change):
        if not change: 
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(TerminalAssignmentLog)
class TerminalAssignmentLogAdmin(admin.ModelAdmin):
    list_display  = ['terminal', 'from_merchant', 'to_merchant', 'assigned_by', 'assigned_at']
    list_filter   = ['assigned_at']
    search_fields = ['terminal__serial_number', 'from_merchant__business_name', 'to_merchant__business_name']
    readonly_fields = ['assigned_at']