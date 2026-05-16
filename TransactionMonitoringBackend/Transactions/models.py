from django.db import models
import uuid
from django.conf import settings
from django.db.models.signals import pre_save
from django.dispatch import receiver
from Merchants.models import Merchant

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


    id = models.BigAutoField(primary_key=True)
    transaction_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    reference = models.CharField(max_length=30, unique=True, blank=True)
    merchant = models.ForeignKey( Merchant, on_delete=models.PROTECT, related_name='transactions', null=True, blank=True )
    customer_name = models.CharField(max_length=100, blank=True, null=True)
    amount = models.DecimalField(max_digits=20, decimal_places=2)
    transaction_type = models.CharField(max_length=30, choices=TRANSACTION_TYPE)
    status = models.CharField(max_length=30, choices=TRANSACTION_STATUS, default='pending')
    channel = models.ForeignKey(Channel, on_delete=models.PROTECT)
    channel_detail = models.ForeignKey(ChannelDetail, on_delete=models.PROTECT)
    is_flagged = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes  = [
            models.Index(fields=['status']),
            models.Index(fields=['is_flagged']),
            models.Index(fields=['customer_name']),
            models.Index(fields=['created_at']),
            models.Index(fields=['reference']),
            # models.Index(fields=['merchant']),
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

@receiver(pre_save, sender=Transaction)
def track_status_change(sender, instance, **kwargs):
    if instance.pk is None:
        return

    try:
        old = Transaction.objects.get(pk=instance.pk)
    except Transaction.DoesNotExist:
        return

    if old.status != instance.status:
        TransactionAuditLog.objects.create(
            transaction=instance,
            old_status=old.status,
            new_status=instance.status,
        )