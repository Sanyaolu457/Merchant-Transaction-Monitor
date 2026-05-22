import random
from django.db   import models
from django.utils import timezone
from datetime    import timedelta


class EmailVerification(models.Model):
    email      = models.EmailField(unique=True)
    code       = models.CharField(max_length=6)
    is_used    = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    class Meta:
        app_label = 'authentication'

    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(minutes=10)
        super().save(*args, **kwargs)

    @property
    def is_expired(self):
        return timezone.now() > self.expires_at

    @classmethod
    def generate_for(cls, email):
        """Delete any existing record and create a fresh 6-digit OTP."""
        cls.objects.filter(email=email).delete()
        code = str(random.randint(100_000, 999_999))
        return cls.objects.create(
            email      = email,
            code       = code,
            expires_at = timezone.now() + timedelta(minutes=10),
        )

    def __str__(self):
        return f"{self.email} — {'used' if self.is_used else 'pending'}"