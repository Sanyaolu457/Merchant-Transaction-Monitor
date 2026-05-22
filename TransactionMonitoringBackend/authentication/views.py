from rest_framework.views       import APIView
from rest_framework.response    import Response
from rest_framework             import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils import timezone

from .models  import MonitorUser
from .serializers    import (
    CreateUserSerializer, MerchantSignupSerializer,
    SetPasswordSerializer, LoginSerializer,
    MonitorUserProfileSerializer, UserListSerializer,
    SendOTPSerializer, VerifyOTPSerializer,
)
from .email_verification import EmailVerification
from .permissions import IsAdminOrAbove, IsOperatorOrAbove
from .utils       import send_invite_email, send_otp_email, set_invite_expiry


class SendOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = SendOTPSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email  = serializer.validated_data['email']
        record = EmailVerification.generate_for(email)

        try:
            send_otp_email(email, record.code)
        except Exception:
            return Response(
                {"error": "Could not send verification email. Please try again."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {"message": f"Verification code sent to {email}."},
            status=status.HTTP_200_OK,
        )


class VerifyOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        if serializer.is_valid():
            return Response({"message": "Email verified. You may now complete registration."})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class MerchantSignupView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = MerchantSignupSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response({
                "message": "Account created successfully. You can now log in.",
                "email":   user.email,
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SetPasswordView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        token = request.query_params.get('token')
        if not token:
            return Response({"error": "Token is required."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            user = MonitorUser.objects.get(invite_token=token)
        except MonitorUser.DoesNotExist:
            return Response({"valid": False, "error": "Invalid token."}, status=status.HTTP_404_NOT_FOUND)

        if user.invite_status == 'accepted':
            return Response({"valid": False, "already_accepted": True, "error": "Password already set. Please log in."})
        if not user.invite_is_valid:
            return Response({"valid": False, "expired": True, "error": "Invite link has expired."})

        return Response({"valid": True, "email": user.email, "name": user.first_name})

    def post(self, request):
        serializer = SetPasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response({"message": "Password set successfully. You can now log in."})


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = serializer.validated_data['user']
        user.last_login_ip = (
            request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0]
            or request.META.get('REMOTE_ADDR')
        )
        user.last_login = timezone.now()
        user.save(update_fields=['last_login_ip', 'last_login'])

        refresh = RefreshToken.for_user(user)
        return Response({
            "message": "Login successful",
            "role":    user.role,
            "access":  str(refresh.access_token),
            "refresh": str(refresh),
            "user":    MonitorUserProfileSerializer(user).data,
        })


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            RefreshToken(request.data['refresh']).blacklist()
            return Response({"message": "Logged out successfully"})
        except Exception:
            return Response({"error": "Invalid token"}, status=status.HTTP_400_BAD_REQUEST)


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(MonitorUserProfileSerializer(request.user).data)

    def patch(self, request):
        serializer = MonitorUserProfileSerializer(
            request.user, data=request.data, partial=True
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CreateUserView(APIView):
    permission_classes = [IsAdminOrAbove]

    def post(self, request):
        serializer = CreateUserSerializer(
            data=request.data, context={'request': request}
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = serializer.save()
        set_invite_expiry(user)
        user.created_by = request.user
        user.save(update_fields=['created_by'])

        try:
            send_invite_email(user)
            message = f"Invite sent to {user.email}"
        except Exception:
            message = "User created but invite email failed to send."

        return Response({
            "message":      message,
            "invite_token": str(user.invite_token),
            "data":         UserListSerializer(user).data,
        }, status=status.HTTP_201_CREATED)


class ListUsersView(APIView):
    permission_classes = [IsOperatorOrAbove]

    def get(self, request):
        role        = request.user.role
        role_filter = request.query_params.get('role', '')

        if role == 'super_admin':
            qs = MonitorUser.objects.all()
        elif role == 'admin':
            qs = MonitorUser.objects.filter(role__in=['operator', 'user'])
        else:
            qs = MonitorUser.objects.filter(role='user')

        if role_filter:
            qs = qs.filter(role=role_filter)

        search = request.query_params.get('search', '')
        if search:
            qs = (
                qs.filter(email__icontains=search)
                | qs.filter(first_name__icontains=search)
                | qs.filter(last_name__icontains=search)
            )

        return Response({"count": qs.count(), "results": UserListSerializer(qs, many=True).data})


class UserDetailView(APIView):
    permission_classes = [IsAdminOrAbove]

    def _get(self, user_id):
        try:    return MonitorUser.objects.get(id=user_id)
        except: return None

    def get(self, request, user_id):
        user = self._get(user_id)
        if not user:
            return Response({"error": "User not found"}, status=404)
        return Response(UserListSerializer(user).data)

    def patch(self, request, user_id):
        user = self._get(user_id)
        if not user:
            return Response({"error": "User not found"}, status=404)
        if request.user.role == 'admin' and user.role in {'super_admin', 'admin'}:
            return Response({"error": "You cannot modify this user."}, status=403)
        serializer = UserListSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    def delete(self, request, user_id):
        user = self._get(user_id)
        if not user:
            return Response({"error": "User not found"}, status=404)
        if user.id == request.user.id:
            return Response({"error": "You cannot delete your own account."}, status=400)
        if request.user.role == 'admin' and user.role in {'super_admin', 'admin'}:
            return Response({"error": "Admins cannot delete super admins or other admins."}, status=403)
        name = user.full_name or user.email
        user.delete()
        return Response({"message": f"{name} has been deleted."})


class ToggleUserActiveView(APIView):
    permission_classes = [IsAdminOrAbove]

    def post(self, request, user_id):
        try:
            user = MonitorUser.objects.get(id=user_id)
        except MonitorUser.DoesNotExist:
            return Response({"error": "User not found"}, status=404)

        if request.user.role == 'admin' and user.role == 'super_admin':
            return Response({"error": "Admins cannot deactivate super admins."}, status=403)

        user.is_active = not user.is_active
        user.save(update_fields=['is_active'])
        state = "activated" if user.is_active else "deactivated"
        return Response({"message": f"{user.email} has been {state}.", "is_active": user.is_active})


class ResendInviteView(APIView):
    permission_classes = [IsAdminOrAbove]

    def post(self, request, user_id):
        try:
            user = MonitorUser.objects.get(id=user_id)
        except MonitorUser.DoesNotExist:
            return Response({"error": "User not found"}, status=404)

        if user.invite_status == 'accepted':
            return Response({"error": "User has already accepted their invite."}, status=400)

        set_invite_expiry(user)
        try:
            send_invite_email(user)
            return Response({"message": f"Invite resent to {user.email}", "invite_token": str(user.invite_token)})
        except Exception:
            return Response({"error": "Failed to send invite email."}, status=500)