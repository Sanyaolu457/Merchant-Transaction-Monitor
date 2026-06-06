from rest_framework  import serializers
from django.contrib.auth import authenticate
from django.utils    import timezone
from .models              import MonitorUser
from .permissions         import ROLE_SUPER_ADMIN, ROLE_ADMIN, ROLE_OPERATOR, ROLE_USER
from .email_verification  import EmailVerification
from Merchants.models     import Merchant
from Merchants.serializers import MerchantListSerializer


class CreateUserSerializer(serializers.ModelSerializer):
    class Meta:
        model  = MonitorUser
        fields = ['email', 'first_name', 'last_name', 'username', 'role']

    def validate_email(self, value):
        if MonitorUser.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value.lower().strip()

    def validate_role(self, value):
        valid = [r[0] for r in MonitorUser.ROLE_CHOICES]
        if value not in valid:
            raise serializers.ValidationError(f"Invalid role. Choose from {valid}")
        return value

    def validate(self, data):
        request     = self.context.get('request')
        actor_role  = getattr(request.user, 'role', None)
        target_role = data.get('role', ROLE_OPERATOR)

        if actor_role == ROLE_ADMIN and target_role in {ROLE_SUPER_ADMIN, ROLE_ADMIN}:
            raise serializers.ValidationError("Admins can only create operators and users.")
        if actor_role == ROLE_OPERATOR:
            raise serializers.ValidationError("Operators cannot create users.")
        return data

    def create(self, validated_data):
        return MonitorUser.objects.create_user(
            email      = validated_data['email'],
            first_name = validated_data.get('first_name', ''),
            last_name  = validated_data.get('last_name',  ''),
            username   = validated_data.get('username',   ''),
            role       = validated_data.get('role', ROLE_OPERATOR),
        )


class SendOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        value = value.lower().strip()
        if MonitorUser.objects.filter(email=value).exists():
            raise serializers.ValidationError(
                "An account with this email already exists."
            )
        return value


class VerifyOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    code  = serializers.CharField(max_length=6, min_length=6)

    def validate(self, data):
        email = data['email'].lower().strip()
        code  = data['code'].strip()

        try:
            record = EmailVerification.objects.get(email=email)
        except EmailVerification.DoesNotExist:
            raise serializers.ValidationError(
                {'code': 'No verification code found. Please request a new one.'}
            )

        if record.is_used:
            raise serializers.ValidationError({'code': 'This code has already been used.'})
        if record.is_expired:
            raise serializers.ValidationError({'code': 'This code has expired. Please request a new one.'})
        if record.code != code:
            raise serializers.ValidationError({'code': 'Incorrect verification code.'})

        record.is_used = True
        record.save(update_fields=['is_used'])

        data['email'] = email
        return data


class MerchantSignupSerializer(serializers.Serializer):
    email            = serializers.EmailField()
    first_name       = serializers.CharField(max_length=150)
    last_name        = serializers.CharField(max_length=150)
    username         = serializers.CharField(max_length=150, required=False, allow_blank=True)
    password         = serializers.CharField(min_length=8, write_only=True)
    confirm_password = serializers.CharField(min_length=8, write_only=True)

    business_name = serializers.CharField(max_length=200)
    business_type = serializers.ChoiceField(choices=[
        ('retail',     'Retail'),
        ('restaurant', 'Restaurant'),
        ('ecommerce',  'E-Commerce'),
        ('agent',      'Agent Banking'),
        ('pos',        'POS Business'),
        ('online',     'Online Business'),
        ('other',      'Other'),
    ])
    phone_number   = serializers.CharField(max_length=20,  required=False, allow_blank=True)
    address        = serializers.CharField(required=False, allow_blank=True)
    bank_name      = serializers.CharField(max_length=100, required=False, allow_blank=True)
    account_number = serializers.CharField(max_length=20,  required=False, allow_blank=True)
    account_name   = serializers.CharField(max_length=200, required=False, allow_blank=True)

    def validate_email(self, value):
        value = value.lower().strip()
        if MonitorUser.objects.filter(email=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})

        email = data['email']
        try:
            record = EmailVerification.objects.get(email=email)
        except EmailVerification.DoesNotExist:
            raise serializers.ValidationError(
                {'email': 'Email not verified. Please complete the OTP step first.'}
            )
        if not record.is_used:
            raise serializers.ValidationError(
                {'email': 'Email not verified. Please enter the code sent to your inbox.'}
            )
        return data

    def create(self, validated_data):
        email = validated_data['email']

        user = MonitorUser.objects.create_user(
            email      = email,
            first_name = validated_data['first_name'],
            last_name  = validated_data['last_name'],
            username   = validated_data.get('username', ''),
            role       = ROLE_USER,
        )
        user.set_password(validated_data['password'])
        user.is_active          = True
        user.invite_status      = 'accepted'
        user.invite_accepted_at = timezone.now()
        user.save()

        Merchant.objects.create(
            user           = user,
            business_name  = validated_data['business_name'],
            business_type  = validated_data['business_type'],
            email          = email,
            phone_number   = validated_data.get('phone_number',   ''),
            address        = validated_data.get('address',        ''),
            bank_name      = validated_data.get('bank_name',      ''),
            account_number = validated_data.get('account_number', ''),
            account_name   = validated_data.get('account_name',   ''),
            created_by     = None,
        )

        EmailVerification.objects.filter(email=email).delete()

        return user


class SetPasswordSerializer(serializers.Serializer):
    token            = serializers.UUIDField()
    password         = serializers.CharField(min_length=8, write_only=True)
    confirm_password = serializers.CharField(min_length=8, write_only=True)

    def validate_token(self, value):
        try:
            user = MonitorUser.objects.get(invite_token=value)
        except MonitorUser.DoesNotExist:
            raise serializers.ValidationError("Invalid invite token.")

        if user.invite_status == "accepted":
            return value

        if not user.invite_is_valid:
            raise serializers.ValidationError("Invite link has expired.")

        return value  

    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})
        return data

    def save(self):
        user = MonitorUser.objects.get(invite_token=self.validated_data['token'])

        if user.invite_status == 'accepted':
            return user

        user.set_password(self.validated_data['password'])
        user.is_active          = True
        user.invite_status      = 'accepted'
        user.invite_accepted_at = timezone.now()
        user.save()

        user.refresh_from_db()
        return user


class LoginSerializer(serializers.Serializer):
    email    = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        email    = data.get('email', '').lower().strip()
        password = data.get('password')

        try:
            user = MonitorUser.objects.get(email=email)
        except MonitorUser.DoesNotExist:
            raise serializers.ValidationError("Invalid email or password.")

        if not user.is_active:
            raise serializers.ValidationError(
                "Account not activated. Please check your email."
            )
        if user.role != ROLE_SUPER_ADMIN and user.invite_status == 'pending':
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
    merchant  = serializers.SerializerMethodField()

    class Meta:
        model  = MonitorUser
        fields = [
            'id', 'email', 'first_name', 'last_name',
            'full_name', 'username', 'role', 'is_active',
            'invite_status', 'created_at', 'merchant',
        ]
        read_only_fields = ['id', 'email', 'role', 'invite_status', 'created_at']

    def get_merchant(self, obj):
        if obj.role != ROLE_USER:
            return None
        
        try:
            return MerchantListSerializer(obj.merchant_profile).data
        except Merchant.DoesNotExist:
            return None


class UserListSerializer(serializers.ModelSerializer):
    full_name       = serializers.ReadOnlyField()
    created_by_name = serializers.SerializerMethodField()
    merchant        = serializers.SerializerMethodField()

    class Meta:
        model  = MonitorUser
        fields = [
            'id', 'email', 'full_name', 'first_name', 'last_name',
            'role', 'is_active', 'invite_status',
            'created_by_name', 'created_at', 'merchant',
        ]

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.full_name or obj.created_by.email
        return "System"

    def get_merchant(self, obj):
        if obj.role != ROLE_USER:
            return None
        
        try:
            return MerchantListSerializer(Merchant.objects.get(email=obj.email)).data
        except Merchant.DoesNotExist:
            return None


def _ensure_merchant_linked(user):
    try:
        return user.merchant_profile
    except Merchant.DoesNotExist:
        pass

    return Merchant.objects.create(
        user          = user,
        business_name = '',
        email         = user.email,
        business_type = 'other',
        created_by    = user.created_by,
    )