from datetime     import timedelta
from django.db    import models as dj_models
from django.utils import timezone
from Transactions.models import Transaction
from .models import FlagRule, TransactionFlag, FlagAuditLog
import logging
logger = logging.getLogger(__name__)


class RiskEngine:

    @classmethod
    def evaluate(cls, transaction):
        if getattr(transaction, '_risk_evaluated', False):
            return
        transaction._risk_evaluated = True

        all_rules = FlagRule.objects.filter(
            is_active=True
        ).filter(
            dj_models.Q(merchant__isnull=True) |
            dj_models.Q(merchant=transaction.merchant)
        )

        threshold_rules = [
            r for r in all_rules
            if r.rule_type == "amount_threshold"
            and r.threshold_amount is not None
            and transaction.amount >= r.threshold_amount
        ]
        best_threshold = (
            max(threshold_rules, key=lambda r: r.threshold_amount)
            if threshold_rules else None
        )
        other_rules   = [r for r in all_rules if r.rule_type != "amount_threshold"]
        rules         = other_rules + ([best_threshold] if best_threshold else [])

        total_score = 0
        reasons     = []

        for rule in rules:
            try:
                triggered, reason = cls.evaluate_rule(transaction, rule)
            except NotImplementedError:
                logger.warning(
                    'Rule type "%s" is not implemented (rule id=%s)',
                    rule.rule_type, rule.id,
                )
                continue

            if not triggered:
                continue

            total_score += rule.weight
            reasons.append(reason)

            flag, created = TransactionFlag.objects.update_or_create(
                transaction=transaction,
                rule=rule,
                defaults={'detail': reason},
            )

            if created:
                FlagAuditLog.objects.create(
                    transaction  = transaction,
                    action       = 'flagged',
                    performed_by = None,
                    reason       = reason,
                )

        cls.finalize(transaction, total_score, reasons)

    @classmethod
    def evaluate_rule(cls, txn, rule):
        handlers = {
            'amount_threshold': cls._amount_threshold,
            'duplicate':        cls._duplicate,
            'frequency':        cls._frequency,
            'velocity':         cls._velocity,
            'night_activity':   cls._night_activity,
            'failed_transactions': cls._failed_transactions,
        }
        handler = handlers.get(rule.rule_type)
        if handler:
            return handler(txn, rule)

        raise NotImplementedError(
            f'Rule type "{rule.rule_type}" has no evaluation logic yet.'
        )

    @classmethod
    def _amount_threshold(cls, txn, rule):
        if rule.threshold_amount and txn.amount >= rule.threshold_amount:
            return True, f"Amount {txn.amount} exceeds threshold {rule.threshold_amount}"
        return False, None

    @classmethod
    def _duplicate(cls, txn, rule):
        exists = Transaction.objects.filter(
            customer_name   = txn.customer_name,
            amount          = txn.amount,
            merchant        = txn.merchant,
            created_at__gte = timezone.now() - timedelta(minutes=5),
        ).exclude(pk=txn.pk).exists()

        if exists:
            return True, "Duplicate transaction detected within 5 minutes"
        return False, None

    @classmethod
    def _frequency(cls, txn, rule):
        window    = timezone.now() - timedelta(minutes=rule.threshold_minutes or 5)
        threshold = rule.threshold_count or 5

        count = Transaction.objects.filter(
            customer_name   = txn.customer_name,
            created_at__gte = window,
        ).exclude(pk=txn.pk).count()

        if count >= threshold:
            return True, (
                f"{count} transactions from customer in "
                f"{rule.threshold_minutes or 5} minutes"
            )
        return False, None

    @classmethod
    def _velocity(cls, txn, rule):
        if not txn.device_id:
            return False, None

        window    = timezone.now() - timedelta(minutes=2)
        threshold = rule.threshold_count or 10
        velocity  = Transaction.objects.filter(
            device_id       = txn.device_id,
            created_at__gte = window,
        ).exclude(pk=txn.pk).count()

        if velocity >= threshold:
            return True, (
                f"Velocity anomaly: {velocity} transactions from device in 2 minutes"
            )
        return False, None

    @classmethod
    def _night_activity(cls, txn, rule):
        hour = txn.created_at.hour
        if hour >= 23 or hour < 4:
            return True, f"Transaction at suspicious hour ({hour:02d}:xx UTC)"
        return False, None
    
    @classmethod
    def _failed_transactions(cls, txn, rule):

        window = timezone.now() - timedelta(
            minutes=rule.threshold_minutes or 5
        )

        threshold = rule.threshold_count or 3

        failed_count = Transaction.objects.filter(
            customer_name=txn.customer_name,
            status='failed',
            created_at__gte=window,
        ).count()

        if failed_count >= threshold:
            return True, (
                f"{failed_count} failed transactions "
                f"in {rule.threshold_minutes or 5} minutes"
            )

        return False, None

    @classmethod
    def finalize(cls, txn, score, reasons):
        if score >= 80:
            level = "critical"
        elif score >= 50:
            level = "high"
        elif score >= 25:
            level = "medium"
        else:
            level = "low"

        txn.risk_score      = score
        txn.risk_level      = level
        txn.risk_reasons    = reasons
        txn.is_flagged      = score >= 25
        txn.requires_review = score >= 50
        txn.save(update_fields=[
            "risk_score",
            "risk_level",
            "risk_reasons",
            "is_flagged",
            "requires_review",
        ])