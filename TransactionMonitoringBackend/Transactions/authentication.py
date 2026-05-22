from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.utils import timezone
from .models import APIKey


class APIKeyAuthentication(BaseAuthentication):
    def authenticate(self, request):
        key = request.headers.get('X-API-Key')
        if not key:
            return None
        try:
            api_key = APIKey.objects.select_related('merchant').get(
                key=key, is_active=True
            )
        except APIKey.DoesNotExist:
            raise AuthenticationFailed('Invalid or inactive API key')
        api_key.last_used = timezone.now()
        api_key.save(update_fields=['last_used'])
        return (api_key.merchant, api_key)