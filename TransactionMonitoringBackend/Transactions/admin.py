from django.contrib import admin
from .models import Transaction, TransactionAuditLog, Channel, ChannelDetail


@admin.register(Channel)
class ChannelAdmin(admin.ModelAdmin):
    list_display  = ['id', 'name']
    search_fields = ['name']


@admin.register(ChannelDetail)
class ChannelDetailAdmin(admin.ModelAdmin):
    list_display  = ['id', 'channel', 'name']
    list_filter   = ['channel']
    search_fields = ['name']


class TransactionAuditLogInline(admin.TabularInline):
    model          = TransactionAuditLog
    extra          = 0
    readonly_fields = ['old_status', 'new_status', 'changed_by', 'reason', 'timestamp']
    can_delete     = False


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display   = [
        'reference', 'merchant', 'customer_name',
        'amount', 'transaction_type', 'status',
        'channel', 'is_flagged', 'created_at',
    ]
    list_filter    = ['status', 'transaction_type', 'channel', 'is_flagged']
    search_fields  = ['reference', 'customer_name', 'merchant__business_name']
    readonly_fields = ['transaction_id', 'reference', 'created_at', 'updated_at']
    ordering       = ['-created_at']
    inlines        = [TransactionAuditLogInline]

    fieldsets = (
        ('Transaction Info', {
            'fields': ('transaction_id', 'reference', 'merchant', 'customer_name')
        }),
        ('Amount & Type', {
            'fields': ('amount', 'transaction_type', 'status')
        }),
        ('Channel', {
            'fields': ('channel', 'channel_detail')
        }),
        ('Flags & Timestamps', {
            'fields': ('is_flagged', 'created_at', 'updated_at')
        }),
    )

    actions = ['mark_completed', 'mark_failed', 'flag_transactions', 'unflag_transactions']

    @admin.action(description='Mark selected as completed')
    def mark_completed(self, request, queryset):
        queryset.update(status='completed')

    @admin.action(description='Mark selected as failed')
    def mark_failed(self, request, queryset):
        queryset.update(status='failed')

    @admin.action(description='Flag selected transactions')
    def flag_transactions(self, request, queryset):
        queryset.update(is_flagged=True)

    @admin.action(description='Unflag selected transactions')
    def unflag_transactions(self, request, queryset):
        queryset.update(is_flagged=False)


@admin.register(TransactionAuditLog)
class TransactionAuditLogAdmin(admin.ModelAdmin):
    list_display  = ['transaction', 'old_status', 'new_status', 'changed_by', 'timestamp']
    list_filter   = ['old_status', 'new_status']
    search_fields = ['transaction__reference']
    readonly_fields = ['transaction', 'old_status', 'new_status', 'changed_by', 'reason', 'timestamp']
    ordering      = ['-timestamp']