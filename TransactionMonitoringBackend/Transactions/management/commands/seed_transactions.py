from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from datetime import timedelta
import random
from decimal import Decimal
from Merchants.models    import Merchant
from Transactions.models import Transaction, Channel, ChannelDetail
from FraudRules.risk_engine import RiskEngine


FIRST_NAMES = [
    "Chioma", "Emeka", "Fatima", "Seun", "Tunde", "Amara", "Bode",
    "Ngozi", "Kayode", "Laide", "Biodun", "Zainab", "Ifeanyi", "Adaeze",
    "Yemi", "Kunle", "Sade", "Chidi", "Uche", "Blessing", "Omotola",
    "Rotimi", "Funmi", "Gbenga", "Ifeoma", "Oluwaseun", "Chukwuemeka",
]
LAST_NAMES = [
    "Adeyemi", "Okonkwo", "Balogun", "Musa", "Abubakar", "Eze",
    "Nwosu", "Ibrahim", "Abdullahi", "Okafor", "Adeleke", "Chukwu",
    "Olawale", "Nnamdi", "Adesanya", "Okeke", "Lawal", "Babatunde",
]

_DEVICE_IDS = [f"DEV-{i:04d}" for i in range(1, 30)]
_IP_POOL    = [
    "102.89.45.1", "105.112.3.22", "197.210.64.5", "41.58.200.10",
    "196.1.149.33", "154.120.0.1",  "41.184.200.1", "102.0.0.1",
]
_LOCATIONS  = [
    "Lagos, NG", "Abuja, NG", "Kano, NG", "Port Harcourt, NG",
    "Ibadan, NG", "Enugu, NG", "Kaduna, NG", "Benin City, NG",
]

TXN_TYPES   = [c[0] for c in Transaction.TRANSACTION_TYPE]
TXN_STATUSES = [c[0] for c in Transaction.TRANSACTION_STATUS]

STATUS_WEIGHTS = [
    ("completed",  55),
    ("pending",    20),
    ("failed",     12),
    ("processing",  8),
    ("reversed",    5),
]

TXN_TYPE_WEIGHTS = [
    ("payment",      35),
    ("transfer",     25),
    ("card_payment", 20),
    ("bill_payment", 10),
    ("deposit",       7),
    ("withdrawal",    3),
]

CHANNEL_MAP = {
    "Card":    ["Online Card", "POS TERMINAL"],
    "Digital": ["Mobile App", "Web", "USSD"],
    "Api":     ["Internal System Api", "Partner Api"],
    "Bank":    ["Bank Branch Counter"],
    "Cash":    ["Agent(Cash Out/In)", "ATM"],
}


def weighted_choice(pairs):
    population = [v for v, w in pairs for _ in range(w)]
    return random.choice(population)


def random_amount():
    tier = random.random()
    if tier < 0.50:
        return Decimal(random.randint(500,     9_999))
    if tier < 0.80:
        return Decimal(random.randint(10_000,  99_999))
    if tier < 0.95:
        return Decimal(random.randint(100_000, 999_999))
    return Decimal(random.randint(1_000_000, 9_999_999))


def random_created_at(days_back=90):
    delta = timedelta(
        days=random.randint(0, days_back),
        hours=random.randint(0, 23),
        minutes=random.randint(0, 59),
        seconds=random.randint(0, 59),
    )
    return timezone.now() - delta


class Command(BaseCommand):
    help = "Seed fake transactions for dashboard testing. Risk scores are assigned by the risk engine, not randomly."

    def add_arguments(self, parser):
        parser.add_argument(
            "--count", type=int, default=150,
            help="Number of transactions to create (default: 150)",
        )
        parser.add_argument(
            "--clear", action="store_true",
            help="Delete all existing transactions before seeding",
        )

    def handle(self, *args, **options):
        count = options["count"]

        if options["clear"]:
            deleted, _ = Transaction.objects.all().delete()
            self.stdout.write(self.style.WARNING(
                f"Deleted {deleted} existing transactions."
            ))

        merchants = list(Merchant.objects.filter(status="active"))
        if not merchants:
            raise CommandError(
                "No active merchants found. Run seed_merchants first."
            )

        from FraudRules.models import FlagRule
        if not FlagRule.objects.filter(is_active=True).exists():
            raise CommandError(
                "No active FlagRules found. Run: python manage.py seed_flag_rules"
            )

        channels = self._get_or_create_channels()
        created  = 0

        self.stdout.write(f"Seeding {count} transactions (risk engine will evaluate each)...")

        for _ in range(count):
            channel_name   = random.choice(list(channels.keys()))
            channel_obj    = channels[channel_name]["channel"]
            channel_detail = random.choice(channels[channel_name]["details"])

            txn_type   = weighted_choice(TXN_TYPE_WEIGHTS)
            txn_status = weighted_choice(STATUS_WEIGHTS)

            txn = Transaction(
                merchant         = random.choice(merchants),
                customer_name    = f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}",
                amount           = random_amount(),
                transaction_type = txn_type,
                status           = txn_status,
                channel          = channel_obj,
                channel_detail   = channel_detail,
                ip_address       = random.choice(_IP_POOL),
                device_id        = random.choice(_DEVICE_IDS) if random.random() < 0.3 else None,
                location         = random.choice(_LOCATIONS),
            )
            txn.save()
            Transaction.objects.filter(pk=txn.pk).update(
                created_at=random_created_at()
            )

            created += 1
            if created % 25 == 0:
                self.stdout.write(f"  {created}/{count} done...")

        self.stdout.write(self.style.SUCCESS(
            f"\n✓ Seeded {created} transactions across {len(merchants)} merchant(s)."
        ))
        self.stdout.write(
            "Risk levels and flags are now set by the engine based on your active FlagRules."
        )

    def _get_or_create_channels(self):
        result = {}
        for chan_name, detail_names in CHANNEL_MAP.items():
            channel, _ = Channel.objects.get_or_create(name=chan_name)
            details    = []
            for d_name in detail_names:
                detail, _ = ChannelDetail.objects.get_or_create(
                    channel=channel, name=d_name
                )
                details.append(detail)
            result[chan_name] = {"channel": channel, "details": details}
        return result