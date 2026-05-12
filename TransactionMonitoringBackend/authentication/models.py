from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
import uuid

class MonitorUserManager(BaseUserManager):
    def create_user(self, email, password= None, **extra_fields):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        if password: 
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, password, **extra_fields):
        if not email:
            raise ValueError('Superuser MUST have an email')
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("role", 'super_admin')
        extra_fields.setdefault("invite_status", 'accepted')
        return self.create_user(email, password, **extra_fields)

class MonitorUser(AbstractBaseUser, PermissionsMixin):

    ROLE_CHOICES = [
        ('super_admin', 'Super Admin'),
        ('operator', 'Operator'),
    ]

    INVITE_STATUS = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('expired', 'Expired'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    username = models.CharField(max_length=150, blank=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='operator')

    is_active = models.BooleanField(default=False)
    is_staff = models.BooleanField(default=False)


    #  Invite Systems
    invite_token = models.UUIDField(default=uuid.uuid4, unique=True)
    invite_status= models.CharField(max_length=20, choices=INVITE_STATUS, default='pending')
    invite_sent_at= models.DateTimeField(null=True, blank=True)
    invite_expires_at = models.DateTimeField(null=True, blank=True)
    invite_accepted_at = models.DateTimeField(null=True, blank=True)

    #  Tracking 

    created_by = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL, related_name='created_users')
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = MonitorUserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ['first_name', 'last_name']

    class Meta:
        verbose_name = "Operator"
        verbose_name_plural = "Operators"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.email} ({self.role})"
    
    @property
    def is_super_admin(self):
        return self.role == 'super_admin'
    
    @property
    def is_operator(self):
        return self.role == 'operator'
    
    @property
    def invite_is_valid(self):
        from django.utils import timezone
        return (
            self.invite_status == 'pending' and
            self.invite_expires_at and
            self.invite_expires_at > timezone.now()  # ← add ()
        )