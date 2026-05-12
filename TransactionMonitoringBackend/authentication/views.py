from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils import timezone

from .models import MonitorUser
from .serializers import (
    CreateOperatorSerializer,
    SetPasswordSerializer,
    LoginSerializer,
    MonitorUserProfileSerializer,
)
from .utils import send_invite_email, set_invite_expiry

class IsSuperAdmin(IsAuthenticated):
    def has_permission(self, request, view):
        return (
            super().has_permission(request, view) and
            request.user.role == 'super_admin'
        )


#  Admin Creates Operator
class CreateOperatorView(APIView):
    permission_classes = [IsSuperAdmin]

    def post(self, request):
        serializer = CreateOperatorSerializer(data=request.data)

        if serializer.is_valid():
            user = serializer.save()

            set_invite_expiry(user)

            user.created_by = request.user
            user.save()

            try:
                send_invite_email(user)
            except Exception as e:
                print(f"Email error: {e}")
                return Response({
                    "message": "Operator created but email failed to send.",
                    "invite_token": str(user.invite_token),
                    "data": serializer.data
                }, status=status.HTTP_201_CREATED)

            return Response({
                "message": f"Invite sent to {user.email}",
                "data": serializer.data
            }, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# Operator Sets Password from Invite Link
class SetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = SetPasswordSerializer(data=request.data)

        if serializer.is_valid():
            user = serializer.save()
            return Response({
                "message": "Password set successfully. You can now log in.",
            }, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# Operator Login
class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)

        if serializer.is_valid():
            user = serializer.validated_data['user']

            # Save last login IP
            x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
            if x_forwarded_for:
                ip = x_forwarded_for.split(',')[0]
            else:
                ip = request.META.get('REMOTE_ADDR')

            user.last_login_ip = ip
            user.last_login = timezone.now()
            user.save()

            refresh = RefreshToken.for_user(user)

            return Response({
                "message": "Login successful",
                "role": user.role,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": MonitorUserProfileSerializer(user).data,
            }, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# Logout
class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data['refresh']
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({
                "message": "Logged out successfully"
            }, status=status.HTTP_200_OK)
        except Exception:
            return Response({
                "error": "Invalid token"
            }, status=status.HTTP_400_BAD_REQUEST)


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = MonitorUserProfileSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)


# List All Operators
class ListOperatorsView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        operators = MonitorUser.objects.filter(role='operator')
        serializer = MonitorUserProfileSerializer(operators, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


# Deactivate Operator Account
class DeactivateOperatorView(APIView):
    permission_classes = [IsSuperAdmin]

    def post(self, request, user_id):
        try:
            operator = MonitorUser.objects.get(id=user_id, role='operator')
            operator.is_active = False
            operator.save()
            return Response({
                "message": f"{operator.email} has been deactivated."
            }, status=status.HTTP_200_OK)
        except MonitorUser.DoesNotExist:
            return Response({
                "error": "Operator not found."
            }, status=status.HTTP_404_NOT_FOUND)
