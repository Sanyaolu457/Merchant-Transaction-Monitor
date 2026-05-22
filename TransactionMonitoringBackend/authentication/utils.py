from django.core.mail        import EmailMultiAlternatives
from django.conf             import settings
from django.utils            import timezone
from datetime                import timedelta

def _html_wrapper(body_html: str) -> str:
    return f"""<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#0a0e0a;font-family:'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="480" cellpadding="0" cellspacing="0"
          style="background-color:#111711;border:1px solid #1e2e1e;
                 border-radius:12px;padding:40px;">
          <tr>
            <td align="center" style="padding-bottom:8px;">
              <h1 style="color:#ffffff;font-size:20px;font-weight:700;
                          margin:0;letter-spacing:1.5px;">MTM OPS PORTAL</h1>
            </td>
          </tr>
          {body_html}
          <tr>
            <td style="border-top:1px solid #1e2e1e;padding-top:20px;">
              <p style="color:#4a5e4a;font-size:12px;line-height:1.5;
                         margin:0;text-align:center;">
                This portal is for authorized personnel only.<br>
                If you did not expect this email, please ignore it.<br>
                All access attempts are monitored.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def _send(subject: str, text: str, html: str, to: str):
    msg = EmailMultiAlternatives(
        subject    = subject,
        body       = text,
        from_email = settings.DEFAULT_FROM_EMAIL,
        to         = [to],
    )
    msg.attach_alternative(html, "text/html")
    msg.send()


def send_invite_email(user):
    invite_link = f"{settings.FRONTEND_URL}/set-password?token={user.invite_token}"
    role_label  = user.role.replace('_', ' ').title()

    text = f"""Hello {user.first_name or user.email},

You have been invited to the Merchant Transaction Monitoring Portal as {role_label}.

Accept your invitation here: {invite_link}

This link expires in 48 hours.
If you did not expect this email, please ignore it.
"""

    body_html = f"""
      <tr>
        <td align="center" style="padding-bottom:8px;">
          <p style="color:#6b7c6b;font-size:13px;margin:0;">You have been invited to join the portal</p>
        </td>
      </tr>
      <tr>
        <td style="padding-bottom:28px;">
          <p style="color:#a0b8a0;font-size:14px;line-height:1.6;margin:0;">
            Hello <strong style="color:#ffffff;">{user.first_name or user.email}</strong>,<br><br>
            You have been invited to the
            <strong style="color:#348355;">Merchant Transaction Monitoring Portal</strong>
            as <strong style="color:#ffffff;">{role_label}</strong>.<br><br>
            Click the button below to accept your invitation and set your password.
            This invitation expires in <strong style="color:#ffffff;">48 hours</strong>.
          </p>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding-bottom:28px;">
          <a href="{invite_link}"
            style="display:inline-block;background-color:#348355;color:#000000;
                   font-size:15px;font-weight:700;text-decoration:none;
                   padding:14px 40px;border-radius:6px;letter-spacing:0.5px;">
            Accept Invitation
          </a>
        </td>
      </tr>
    """

    _send(
        subject = "You've Been Invited to MTM Operations Portal",
        text    = text,
        html    = _html_wrapper(body_html),
        to      = user.email,
    )

def send_otp_email(email: str, code: str):
    text = f"""Your MTM Portal verification code is: {code}

This code expires in 10 minutes.
If you did not request this, please ignore this email.
"""

    body_html = f"""
      <tr>
        <td align="center" style="padding-bottom:8px;">
          <p style="color:#6b7c6b;font-size:13px;margin:0;">Email verification code</p>
        </td>
      </tr>
      <tr>
        <td style="padding-bottom:24px;">
          <p style="color:#a0b8a0;font-size:14px;line-height:1.6;margin:0;">
            Enter the code below to verify your email address.
            It expires in <strong style="color:#ffffff;">10 minutes</strong>.
          </p>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding-bottom:28px;">
          <div style="display:inline-block;background-color:#1a2e1a;
                      border:1px solid #348355;border-radius:8px;padding:18px 40px;">
            <span style="color:#ffffff;font-size:32px;font-weight:800;
                          letter-spacing:8px;font-family:monospace;">{code}</span>
          </div>
        </td>
      </tr>
    """

    _send(
        subject = "Your MTM Portal Verification Code",
        text    = text,
        html    = _html_wrapper(body_html),
        to      = email,
    )


def set_invite_expiry(user):
    user.invite_sent_at    = timezone.now()
    user.invite_expires_at = timezone.now() + timedelta(hours=48)
    user.save(update_fields=['invite_sent_at', 'invite_expires_at'])
    return user


def create_merchant_profile(user, business_data=None):
    from Merchants.models import Merchant

    if user.role != 'user':
        return None

    if hasattr(user, 'merchant_profile') and user.merchant_profile is not None:
        return user.merchant_profile

    business_data = business_data or {}

    return Merchant.objects.create(
        user           = user,
        email          = user.email,
        business_name  = business_data.get('business_name', user.first_name or user.email),
        business_type  = business_data.get('business_type', 'other'),
        phone_number   = business_data.get('phone_number',  ''),
        address        = business_data.get('address',       ''),
        bank_name      = business_data.get('bank_name',     ''),
        account_number = business_data.get('account_number',''),
        account_name   = business_data.get('account_name',  ''),
        created_by     = user.created_by,
    )