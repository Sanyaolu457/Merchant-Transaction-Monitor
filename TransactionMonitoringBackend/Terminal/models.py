from django.db import models
from django.conf import settings
import uuid
from Merchants.models import Merchant
from django.utils import timezone
from django.db.models import Sum

class Terminal(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('suspended', 'Suspended'),
        ('maintenance', 'Maintainance')
    ]

    TERMINAL_TYPE_CHOICES = [
        ('pos', 'POS'),
        ('web',  'Web Terminal'),
        ('mobile', 'Mobile')
    ]

    terminal_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    serial_number = models.CharField(max_length=100, unique=True, blank=True)
    terminal_type = models.CharField(max_length=20, choices=TERMINAL_TYPE_CHOICES, default='pos')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    label = models.CharField(max_length=100, blank=True)

    merchant = models.ForeignKey(Merchant, on_delete=models.SET_NULL, null=True, blank=True, related_name='terminals')
    location = models.CharField(max_length=200, blank=True)
    supervisor_pin = models.CharField(max_length=100, blank=True, help_text='Hashed PIN')
    pin_reset_required = models.BooleanField(default=True)

    per_transaction_limit = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    daily_limit = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    enforce_limits        = models.BooleanField(default=True)

    allow_transfers     = models.BooleanField(default=True)
    allow_withdrawals   = models.BooleanField(default=True)
    allow_airtime       = models.BooleanField(default=True)
    allow_bill_payment  = models.BooleanField(default=True)
    allow_pos_purchase  = models.BooleanField(default=True)
    allow_reversal      = models.BooleanField(default=True)

    created_by  = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_terminals')
    assigned_by = models.ForeignKey( settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_terminals')
    last_active     = models.DateTimeField(null=True, blank=True)
    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):

        if not self.serial_number:

            prefix = {
                'pos': 'POS',
                'mobile': 'MOB',
                'web': 'WEB',
            }.get(self.terminal_type, 'TRM')

            self.serial_number = (
                f"{prefix}-{uuid.uuid4().hex[:8].upper()}"
            )

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.serial_number} → {self.merchant} ({self.status})"
    
    @property
    def transaction_count(self):
        return self.transactions.count()
    
    @property
    def daily_volume(self):
        today = timezone.now().date()
        result = self.transactions.filter(
            created_at__date=today
        ).aggregate(total=Sum('amount'))['total']
        return float(result or 0)
    

class TerminalAssignmentLog(models.Model):
    terminal        = models.ForeignKey(Terminal, on_delete=models.CASCADE, related_name='assignment_logs')
    from_merchant   = models.ForeignKey('Merchants.Merchant', on_delete=models.SET_NULL, null=True, blank=True, related_name='terminals_sent')
    to_merchant     = models.ForeignKey('Merchants.Merchant', on_delete=models.SET_NULL, null=True, blank=True, related_name='terminals_received')
    assigned_by     = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='terminal_assignments')
    note            = models.TextField(blank=True)
    assigned_at     = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-assigned_at']

    def __str__(self):
        return f"{self.terminal.serial_number}: {self.from_merchant} → {self.to_merchant}"