from django.apps import AppConfig

class FraudrulesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'FraudRules'

    def ready(self):
        import FraudRules.signals
