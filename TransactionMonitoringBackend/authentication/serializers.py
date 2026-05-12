from rest_framework import serializers
from django.contrib.auth import authenticate
from django.utils import timezone
from .models import MonitorUser

# Admin Creates the Operator Manually
class CreateOperatorSerializer(serializers.ModelSerializer):
    class Meta:
        model = MonitorUser
        fields = ['email', 'first_name', 'last_name', 'username', 'role']

    def validate_email(self, value):
        if MonitorUser.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value
    
    def validate_role(self, value):
        if value not in ['super_admin', 'operator']:
            raise serializers.ValidationError("Invalid role assigned.")
        return value
        
    def create(self, validated_data):
        user = MonitorUser.objects.create_user(
            email = validated_data['email'],
            first_name = validated_data.get('first_name', ''),
            last_name = validated_data.get('last_name', ''),
            username = validated_data.get('username', ''),
            role = validated_data.get('role', 'operator'),
        )
        return user
    
class SetPasswordSerializer(serializers.Serializer):
    token = serializers.UUIDField()
    password = serializers.CharField(min_length=8, write_only=True)
    confirm_password = serializers.CharField(min_length=8, write_only=True)

    def validate_token(self, value):
        try:
            user = MonitorUser.objects.get(invite_token=value)
        except MonitorUser.DoesNotExist:
            raise serializers.ValidationError("Invalid invite token.")

        if not user.invite_is_valid:
            raise serializers.ValidationError("Invite link has expired.")

        return value

    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError("Passwords do not match.")
        return data

    def save(self):
        token = self.validated_data['token']
        password = self.validated_data['password']

        user = MonitorUser.objects.get(invite_token=token)
        user.set_password(password)
        user.is_active = True
        user.invite_status = 'accepted'
        user.invite_accepted_at = timezone.now()
        user.save()
        return user


# --- Operator Login ---
class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        email = data.get('email')
        password = data.get('password')

        try:
            user = MonitorUser.objects.get(email=email)
        except MonitorUser.DoesNotExist:
            raise serializers.ValidationError("Invalid email or password.")

        if not user.is_active:
            raise serializers.ValidationError(
                "Account not activated. Please check your invite email."
            )

        if user.invite_status == 'pending':
            raise serializers.ValidationError(
                "Please accept your invite and set a password first."
            )
        
        if user.role == 'operator' and user.invite_status == 'pending':
            raise serializers.ValidationError(
                "Please accept your invite and set a password first."
            )

        authenticated_user = authenticate(username=email, password=password)
        if not authenticated_user:
            raise serializers.ValidationError("Invalid email or password.")

        data['user'] = authenticated_user
        return data


class MonitorUserProfileSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()

    class Meta:
        model = MonitorUser
        fields = [
            'id',
            'email',
            'first_name',
            'last_name',
            'full_name',
            'username',
            'role',
            'is_active',
            'invite_status',
            'created_at',
        ]
        read_only_fields = [
            'id',
            'email',
            'role',
            'invite_status',
            'created_at'
        ]