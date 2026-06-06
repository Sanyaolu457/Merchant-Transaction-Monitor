from django.db import models
import uuid
from django.conf import settings
from django.dispatch import receiver
import secrets
from Merchants.models import Merchant
from Terminal.models import Terminal

class Channel(models.Model):
    name = models.CharField(max_length=20, unique=True)

    def __str__(self):
        return self.name


class ChannelDetail(models.Model):
    channel = models.ForeignKey(Channel, on_delete=models.CASCADE)
    name = models.CharField(max_length=30)

    class Meta:
        unique_together = ("channel", "name")

    def __str__(self):
        return f"{self.channel.name} - {self.name}"

class Transaction(models.Model):

    TRANSACTION_TYPE = [
        ("transfer", "Transfer"),
        ("deposit", "Deposit"),
        ("withdrawal", "Withdrawal"),
        ("payment", "Payment"),
        ("bill_payment", "Bill Payment"),
        ("card_payment", "Card Payment"),
    ]

    TRANSACTION_STATUS = [
        ("pending", "Pending"),
        ("processing", "Processing"),
        ("completed", "Completed"),
        ("failed", "Failed"),
        ("reversed", "Reversed"),
    ]

    RISK_LEVELS = [
        ("low", "Low"),
        ("medium", "Medium"),
        ("high", "High"),
        ("critical", "Critical"),
    ]


    id = models.BigAutoField(primary_key=True)
    transaction_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    reference = models.CharField(max_length=30, unique=True, blank=True)
    merchant = models.ForeignKey( Merchant, on_delete=models.PROTECT, related_name='transactions', null=True, blank=True )
    terminal = models.ForeignKey(Terminal, on_delete=models.SET_NULL, null=True, blank=True, related_name='transactions')
    customer_name = models.CharField(max_length=100, blank=True, null=True)
    amount = models.DecimalField(max_digits=20, decimal_places=2)
    transaction_type = models.CharField(max_length=30, choices=TRANSACTION_TYPE)
    status = models.CharField(max_length=30, choices=TRANSACTION_STATUS, default='pending')
    channel = models.ForeignKey(Channel, on_delete=models.PROTECT)
    channel_detail = models.ForeignKey(ChannelDetail, on_delete=models.PROTECT)
    is_flagged = models.BooleanField(default=False)
    risk_score = models.IntegerField(default=0)
    risk_level = models.CharField( max_length=20, choices=RISK_LEVELS, default="low" )
    risk_reasons = models.JSONField(default=list, blank=True)
    requires_review = models.BooleanField(default=False)
    reviewed_by = models.ForeignKey( settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    ip_address = models.GenericIPAddressField( null=True, blank=True )
    device_id = models.CharField( max_length=255, null=True, blank=True )
    location = models.CharField( max_length=255, null=True, blank=True )
    idempotency_key = models.CharField( max_length=100, unique=True, null=True, blank=True )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['is_flagged']),
            models.Index(fields=['customer_name']),
            models.Index(fields=['created_at']),
            models.Index(fields=['reference']),
            models.Index(fields=['risk_score']),
            models.Index(fields=['risk_level']),
        ]

    def __str__(self):
        return f"{self.reference} - {self.amount} ({self.status})"
    

    def save(self, *args, **kwargs):
        is_new = self.pk is None

        super().save(*args, **kwargs)

        if is_new and not self.reference:
            date_part = self.created_at.strftime("%Y%m%d")
            self.reference = f"TXN-{date_part}-{self.id:06d}"

            super().save(update_fields=["reference"])


class TransactionAuditLog(models.Model):

    transaction = models.ForeignKey(
        Transaction,
        on_delete=models.CASCADE,
        related_name="audit_logs"
    )

    old_status = models.CharField(max_length=20, blank=True, null=True)
    new_status = models.CharField(max_length=20, blank=True, null=True)

    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    reason = models.TextField(blank=True, null=True)

    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.transaction.reference} | {self.old_status} → {self.new_status}"


class APIKey(models.Model):
    merchant = models.OneToOneField( 'Merchants.Merchant', on_delete=models.CASCADE, related_name='api_key' )
    key  = models.CharField(max_length=64, unique=True)
    is_active   = models.BooleanField(default=True)
    created_at  = models.DateTimeField(auto_now_add=True)
    last_used   = models.DateTimeField(null=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.key:
            self.key = secrets.token_hex(32)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.merchant.business_name} — {'Active' if self.is_active else 'Inactive'}"