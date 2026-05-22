from django.core.management.base import BaseCommand
from FraudRules.models import FlagRule

DEFAULT_RULES = [    {
        "name":             "Large Transaction — Critical",
        "rule_type":        "amount_threshold",
        "description":      "Single transaction at or above ₦5,000,000.",
        "weight":           40,
        "risk_level":       "critical",
        "threshold_amount": 5_000_000,
    },
    {
        "name":             "Large Transaction — High",
        "rule_type":        "amount_threshold",
        "description":      "Single transaction at or above ₦1,000,000.",
        "weight":           25,
        "risk_level":       "high",
        "threshold_amount": 1_000_000,
    },
    {
        "name":             "Large Transaction — Medium",
        "rule_type":        "amount_threshold",
        "description":      "Single transaction at or above ₦500,000.",
        "weight":           15,
        "risk_level":       "medium",
        "threshold_amount": 500_000,
    },

    {
        "name":        "Duplicate Transaction",
        "rule_type":   "duplicate",
        "description": "Same customer, same amount, same merchant within 5 minutes.",
        "weight":      30,
        "risk_level":  "high",
    },

    {
        "name":              "High Frequency — 5 in 10 min",
        "rule_type":         "frequency",
        "description":       "Customer submits 5+ transactions within 10 minutes.",
        "weight":            20,
        "risk_level":        "medium",
        "threshold_count":   5,
        "threshold_minutes": 10,
    },
    {
        "name":              "Extreme Frequency — 10 in 10 min",
        "rule_type":         "frequency",
        "description":       "Customer submits 10+ transactions within 10 minutes.",
        "weight":            40,
        "risk_level":        "critical",
        "threshold_count":   10,
        "threshold_minutes": 10,
    },

    {
        "name":        "Device Velocity Anomaly",
        "rule_type":   "velocity",
        "description": "10+ transactions from the same device within 2 minutes.",
        "weight":      35,
        "risk_level":  "high",
    },

    {
        "name":        "Night-Time Transaction",
        "rule_type":   "night_activity",
        "description": "Transaction submitted between 11 PM and 4 AM (server time).",
        "weight":      15,
        "risk_level":  "medium",
    },
]


class Command(BaseCommand):
    help = "Seed the database with default FlagRule records."

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Delete all existing global FlagRules before seeding.",
        )

    def handle(self, *args, **options):
        if options["clear"]:
            deleted, _ = FlagRule.objects.filter(merchant__isnull=True).delete()
            self.stdout.write(self.style.WARNING(f"Deleted {deleted} existing global rules."))

        created = 0
        skipped = 0

        for rule_data in DEFAULT_RULES:
            obj, was_created = FlagRule.objects.get_or_create(
                name      = rule_data["name"],
                rule_type = rule_data["rule_type"],
                merchant  = None,
                defaults  = {
                    "description":      rule_data.get("description", ""),
                    "weight":           rule_data.get("weight", 10),
                    "risk_level":       rule_data.get("risk_level", "medium"),
                    "threshold_amount": rule_data.get("threshold_amount"),
                    "threshold_count":  rule_data.get("threshold_count"),
                    "threshold_minutes":rule_data.get("threshold_minutes"),
                    "is_active":        True,
                },
            )
            if was_created:
                created += 1
                self.stdout.write(f"  ✓ Created: {obj.name}")
            else:
                skipped += 1
                self.stdout.write(f"  — Exists:  {obj.name}")

        self.stdout.write(self.style.SUCCESS(
            f"\nDone. {created} created, {skipped} already existed."
        ))
        self.stdout.write(
            "Run the simulator and check transactions — "
            "risk_level/risk_reasons should now be populated."
        )