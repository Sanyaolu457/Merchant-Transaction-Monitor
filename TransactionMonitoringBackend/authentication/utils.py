from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from datetime import timedelta

def send_invite_email(user):
    invite_link = f"{settings.FRONTEND_URL}/set-password/?token={user.invite_token}"
    
    subject = "You've Been Invited to Merchant Dashboard"
    message = f"""
    Hello {user.first_name},

    You have been invited to join the Merchant Transaction Dashboard as an {user.role}.
    
    Click the link below to set your password and activate your account:
    
    {invite_link}
    
    This link expires in 48 hours.

    If you did not expect this email, please ignore it.
    """

    send_mail(
        subject=subject,
        message=message,
        from_email=settings.EMAIL_HOST_USER,
        recipient_list=[user.email],
        fail_silently=False,
    )

def set_invite_expiry(user):
    # Set to 48 hours
    user.invite_sent_at= timezone.now()
    user.invite_expires_at= timezone.now() + timedelta(hours=48)
    user.save()
    return user

