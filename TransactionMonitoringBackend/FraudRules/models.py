from django.db   import models
from django.conf import settings
from Transactions.models import Transaction
from Merchants.models    import Merchant
 
 
class FlagRule(models.Model):
    RULE_TYPES = [
        ("amount_threshold", "Amount Threshold"),
        ("frequency",        "Frequency"),
        ("velocity",         "Velocity"),
        ("duplicate",        "Duplicate"),
        ("geo_mismatch",     "Geo Mismatch"),
        ("device_change",    "Device Change"),
        ("night_activity",   "Night Activity"),
        ('failed_transactions', 'Failed Transactions'),
    ]
    RISK_LEVELS = [
        ("low",      "Low"),
        ("medium",   "Medium"),
        ("high",     "High"),
        ("critical", "Critical"),
    ]
 
    name        = models.CharField(max_length=100)
    rule_type   = models.CharField(max_length=50, choices=RULE_TYPES)
    description = models.TextField(blank=True)
    is_active   = models.BooleanField(default=True)
    weight      = models.IntegerField(default=10)
    risk_level  = models.CharField(max_length=20, choices=RISK_LEVELS, default="medium")
    threshold_amount  = models.DecimalField(max_digits=20, decimal_places=2, null=True, blank=True)
    threshold_count   = models.IntegerField(null=True, blank=True)
    threshold_minutes = models.IntegerField(null=True, blank=True)
 
    merchant = models.ForeignKey(
        Merchant,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,  
        related_name='flag_rules',
    )
 
    created_at = models.DateTimeField(auto_now_add=True)
 
    class Meta:
        ordering = ['-created_at']
 
    def __str__(self):
        scope = self.merchant.business_name if self.merchant_id else 'Global'
        return f"[{scope}] {self.name}"
 
    @property
    def is_global(self):
        return self.merchant_id is None
 
 
class TransactionFlag(models.Model):
    transaction = models.ForeignKey(
        Transaction,
        on_delete=models.CASCADE,
        related_name='flags',
    )
    rule = models.ForeignKey(
        FlagRule,
        on_delete=models.CASCADE,
        related_name='triggered_flags',
    )
    flagged_at = models.DateTimeField(auto_now_add=True)
    detail     = models.TextField(blank=True)
 
    class Meta:
        unique_together = ("transaction", "rule")
        ordering        = ['-flagged_at']
 
    def __str__(self):
        return f"{self.transaction.reference} → {self.rule.name}"
 
 
class FlagAuditLog(models.Model):
    ACTION_CHOICES = [
        ('flagged',   'Flagged'),
        ('unflagged', 'Unflagged'),
    ]
 
    transaction  = models.ForeignKey(
        Transaction,
        on_delete=models.CASCADE,
        related_name='flag_audit_logs',
    )
    action       = models.CharField(max_length=20, choices=ACTION_CHOICES)
    performed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='flag_actions',
        help_text="Null when flagged automatically by the risk engine.",
    )
    reason    = models.TextField(blank=True, help_text="Required when unflagging.")
    timestamp = models.DateTimeField(auto_now_add=True)
 
    class Meta:
        ordering = ['-timestamp']
 
    def __str__(self):
        actor = self.performed_by.email if self.performed_by_id else 'Risk Engine'
        return f"{self.transaction.reference} {self.action} by {actor}"
 
 
class OperatorReport(models.Model):
    SEVERITY_CHOICES = [
        ('low',      'Low'),
        ('medium',   'Medium'),
        ('high',     'High'),
        ('critical', 'Critical'),
    ]
    STATUS_CHOICES = [
        ('open',         'Open'),
        ('under_review', 'Under Review'),
        ('resolved',     'Resolved'),
        ('dismissed',    'Dismissed'),
    ]
 
    transaction  = models.ForeignKey(
        Transaction,
        on_delete=models.CASCADE,
        related_name='operator_reports',
    )
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='submitted_reports',
    )
    severity    = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default='medium')
    title       = models.CharField(max_length=200)
    description = models.TextField()
    status      = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
 
    resolved_by     = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='resolved_reports',
    )
    resolution_note = models.TextField(blank=True)
    resolved_at     = models.DateTimeField(null=True, blank=True)
 
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
 
    class Meta:
        ordering = ['-created_at']
 
    def __str__(self):
        return f"[{self.severity.upper()}] {self.title} — {self.transaction.reference}"
 
