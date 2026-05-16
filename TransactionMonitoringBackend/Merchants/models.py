from django.db import models
from django.conf import settings
import uuid


class Merchant(models.Model):

    STATUS_CHOICES = [
        ('active',    'Active'),
        ('inactive',  'Inactive'),
        ('suspended', 'Suspended'),
    ]

    BUSINESS_TYPE = [
        ('retail',     'Retail'),
        ('restaurant', 'Restaurant'),
        ('ecommerce',  'E-Commerce'),
        ('agent',      'Agent Banking'),
        ('pos',        'POS Business'),
        ('online',     'Online Business'),
        ('other',      'Other'),
    ]

    merchant_id   = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    business_name = models.CharField(max_length=200)
    business_type = models.CharField(max_length=30, choices=BUSINESS_TYPE)
    status        = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    email        = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    address      = models.TextField(blank=True, null=True)
    bank_name      = models.CharField(max_length=100, blank=True, null=True)
    account_number = models.CharField(max_length=20,  blank=True, null=True)
    account_name   = models.CharField(max_length=200, blank=True, null=True)
    created_by = models.ForeignKey( settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_merchants' )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.business_name} ({self.status})"
