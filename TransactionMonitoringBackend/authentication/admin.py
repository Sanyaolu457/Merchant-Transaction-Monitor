from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import MonitorUser

@admin.register(MonitorUser)
class MonitorAdmin(UserAdmin):
    list_display = [
        'email',
        'first_name', 
        'last_name',
        'role',
        'is_active',
        'invite_status',
        'created_at'
    ]
    list_filter = ['role', 'is_active', 'invite_status']
    search_fields = ['email', 'first_name', 'last_name']
    ordering = ['-created_at']

    fieldsets = (
        ('Personal Info', {
            'fields': ('email', 'first_name', 'last_name', 'username')
        }),
        ('Role & Status', {
            'fields': ('role', 'is_active', 'is_staff', 'invite_status')
        }),
        ('Invite Info', {
            'fields': ('invite_token', 'invite_sent_at', 'invite_expires_at')
        }),
        ('Permissions', {
            'fields': ('groups', 'user_permissions')
        }),
    )

    add_fieldsets = (
        (None, {
            'fields': ('email', 'first_name', 'last_name', 'role', 'password1', 'password2')
        }),
    )