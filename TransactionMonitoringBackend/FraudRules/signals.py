from django.db.models.signals import post_save
from django.dispatch import receiver
from Transactions.models import Transaction
from .risk_engine import RiskEngine


@receiver(post_save, sender=Transaction)
def run_risk_engine(sender, instance, created, **kwargs):
    if created:
        post_save.disconnect(run_risk_engine, sender=Transaction)
        try:
            RiskEngine.evaluate(instance)
        finally:
            post_save.connect(run_risk_engine, sender=Transaction)