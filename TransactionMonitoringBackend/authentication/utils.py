from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from django.utils import timezone
from datetime import timedelta


def send_invite_email(user):
    invite_link = f"{settings.FRONTEND_URL}/set-password?token={user.invite_token}"

    subject = "You've Been Invited to MTM Operations Portal"

    text_content = f"""
    Hello {user.first_name},

    You have been invited to join the Merchant Transaction Monitoring Portal as {user.role}.

    Accept your invitation here: {invite_link}

    This link expires in 48 hours.
    If you did not expect this email, please ignore it.
    """

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background-color:#0a0e0a;font-family:'Segoe UI',sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
                <td align="center" style="padding: 40px 20px;">
                    <table width="480" cellpadding="0" cellspacing="0" 
                        style="background-color:#111711;border:1px solid #1e2e1e;border-radius:12px;padding:40px;">
                        

                        <tr>
                            <td align="center" style="padding-bottom:8px;">
                                <h1 style="color:#ffffff;font-size:20px;
                                    font-weight:700;margin:0;letter-spacing:1.5px;">
                                    MTM OPS PORTAL
                                </h1>
                            </td>
                        </tr>

                        <tr>
                            <td align="center" style="padding-bottom:28px;">
                                <p style="color:#6b7c6b;font-size:13px;margin:0;">
                                    You have been invited to join the portal
                                </p>
                            </td>
                        </tr>

                        <tr>
                            <td style="padding-bottom:28px;">
                                <p style="color:#a0b8a0;font-size:14px;line-height:1.6;margin:0;">
                                    Hello <strong style="color:#ffffff;">{user.first_name or user.email}</strong>,
                                    <br><br>
                                    You have been invited to the 
                                    <strong style="color:#348355;">
                                        Merchant Transaction Monitoring Portal
                                    </strong> 
                                    as <strong style="color:#ffffff;">{user.role.replace('_', ' ').title()}</strong>.
                                    <br><br>
                                    Click the button below to accept your invitation 
                                    and set up your password. This invitation expires in 
                                    <strong style="color:#ffffff;">48 hours</strong>.
                                </p>
                            </td>
                        </tr>

                        <tr>
                            <td align="center" style="padding-bottom:28px;">
                                <a href="{invite_link}" 
                                    style="display:inline-block;
                                        background-color:#348355;
                                        color:#000000;
                                        font-size:15px;
                                        font-weight:700;
                                        text-decoration:none;
                                        padding:14px 40px;
                                        border-radius:6px;
                                        letter-spacing:0.5px;">
                                    Accept Invitation
                                </a>
                            </td>
                        </tr>

                        <tr>
                            <td style="border-top:1px solid #1e2e1e;padding-top:20px;">
                                <p style="color:#4a5e4a;font-size:12px;
                                    line-height:1.5;margin:0;text-align:center;">
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
    </html>
    """

    email = EmailMultiAlternatives(
        subject=subject,
        body=text_content,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[user.email],
    )
    email.attach_alternative(html_content, "text/html")
    email.send()


def set_invite_expiry(user):
    user.invite_sent_at    = timezone.now()
    user.invite_expires_at = timezone.now() + timedelta(hours=48)
    user.save()
    return user