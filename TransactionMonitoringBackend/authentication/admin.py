from django                     import forms
from django.contrib             import admin
from django.contrib.auth.forms  import UserCreationForm, UserChangeForm
from .models      import MonitorUser
from Merchants.models import Merchant


class MonitorUserCreationForm(UserCreationForm):
    class Meta(UserCreationForm.Meta):
        model  = MonitorUser
        fields = ('email', 'first_name', 'last_name', 'role')

    def save(self, commit=True):
        user = super().save(commit=False)
        user.set_unusable_password()
        if commit:
            user.save()
        return user


class MonitorUserChangeForm(UserChangeForm):
    class Meta(UserChangeForm.Meta):
        model  = MonitorUser
        fields = '__all__'

BUSINESS_TYPE_CHOICES = [
    ('retail',     'Retail'),
    ('restaurant', 'Restaurant'),
    ('ecommerce',  'E-Commerce'),
    ('agent',      'Agent Banking'),
    ('pos',        'POS Business'),
    ('online',     'Online Business'),
    ('other',      'Other'),
]

class MerchantUserCreationForm(forms.ModelForm):
    first_name = forms.CharField(max_length=150, required=False)
    last_name  = forms.CharField(max_length=150, required=False)

    business_name = forms.CharField(max_length=200)
    business_type = forms.ChoiceField(choices=BUSINESS_TYPE_CHOICES)
    phone_number  = forms.CharField(max_length=20,  required=False)
    address       = forms.CharField(widget=forms.Textarea(attrs={'rows': 2}), required=False)
    bank_name     = forms.CharField(max_length=100, required=False)
    account_number= forms.CharField(max_length=20,  required=False)
    account_name  = forms.CharField(max_length=200, required=False)

    class Meta:
        model  = MonitorUser
        fields = ('email', 'first_name', 'last_name')

    def save(self, commit=True):
        user = super().save(commit=False)
        user.role = 'user'
        user.set_unusable_password()
        if commit:
            user.save()
        return user


class MerchantProfileInline(admin.StackedInline):
    model        = Merchant
    fk_name      = 'user'
    can_delete   = False
    verbose_name = 'Merchant Profile'
    extra        = 0
    fields       = [
        'business_name', 'business_type', 'status',
        'phone_number', 'address',
        'bank_name', 'account_number', 'account_name',
    ]


class OperatorAdmin(admin.ModelAdmin):
    form     = MonitorUserChangeForm
    add_form = MonitorUserCreationForm

    list_display    = ['email', 'first_name', 'last_name', 'role', 'is_active', 'invite_status', 'created_at']
    list_filter     = ['role', 'is_active', 'invite_status']
    search_fields   = ['email', 'first_name', 'last_name']
    ordering        = ['-created_at']
    readonly_fields = ['invite_token', 'invite_sent_at', 'invite_accepted_at', 'created_at']

    fieldsets = (
        ('Personal Info', {'fields': ('email', 'first_name', 'last_name', 'username')}),
        ('Role & Access', {'fields': ('role', 'is_active', 'is_staff')}),
        ('Invite',        {'fields': ('invite_token', 'invite_status', 'invite_sent_at', 'invite_expires_at', 'invite_accepted_at')}),
        ('Permissions',   {'fields': ('groups', 'user_permissions')}),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields':  ('email', 'first_name', 'last_name', 'role', 'password1', 'password2'),
        }),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).filter(
            role__in=['super_admin', 'admin', 'operator']
        )

    def get_form(self, request, obj=None, **kwargs):
        if obj is None:
            kwargs['form'] = self.add_form
        return super().get_form(request, obj, **kwargs)

    def save_model(self, request, obj, form, change):
        is_new = obj.pk is None
        if is_new:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)

        if is_new:
            from .utils import send_invite_email, set_invite_expiry
            try:
                set_invite_expiry(obj)
                send_invite_email(obj)
                self.message_user(request, f"✓ Invite email sent to {obj.email}.")
            except Exception as e:
                self.message_user(request, f"User created but invite email failed: {e}", level='warning')


class MerchantUserAdmin(admin.ModelAdmin):
    form     = MonitorUserChangeForm
    add_form = MerchantUserCreationForm

    list_display    = ['email', 'first_name', 'last_name', 'business_name_display', 'merchant_status_display', 'invite_status', 'created_at']
    list_filter     = [ 'invite_status']
    search_fields   = ['email', 'first_name', 'last_name']
    readonly_fields = ['invite_token', 'invite_sent_at', 'invite_accepted_at', 'created_at']
    inlines         = [MerchantProfileInline]

    fieldsets = (
        ('Account', {'fields': ('email', 'first_name', 'last_name',)}),
        ('Invite',  {'fields': ('invite_status', 'invite_accepted_at')}),
    )

    add_fieldsets = (
        ('Account Details', {
            'classes': ('wide',),
            'fields':  ('email', 'first_name', 'last_name'),
        }),
        ('Business Details', {
            'classes': ('wide',),
            'fields':  ('business_name', 'business_type', 'phone_number', 'address'),
        }),
        ('Banking Details', {
            'classes': ('wide',),
            'fields':  ('bank_name', 'account_number', 'account_name'),
        }),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).filter(role='user')

    def get_form(self, request, obj=None, **kwargs):
        if obj is None:
            kwargs['form'] = self.add_form
        return super().get_form(request, obj, **kwargs)

    def get_fieldsets(self, request, obj=None):
        if obj is None:
            return self.add_fieldsets
        return super().get_fieldsets(request, obj)

    def _merchant(self, obj):
        try:
            return obj.merchant_profile
        except Exception:
            return None

    def business_name_display(self, obj):
        m = self._merchant(obj)
        return m.business_name if m else '—'
    business_name_display.short_description = 'Business'

    def merchant_status_display(self, obj):
        m = self._merchant(obj)
        return m.status if m else '—'
    merchant_status_display.short_description = 'Merchant Status'

    def save_model(self, request, obj, form, change):
        is_new = obj.pk is None
        if is_new:
            obj.role       = 'user'
            obj.created_by = request.user
        super().save_model(request, obj, form, change)

        if is_new:
            Merchant.objects.get_or_create(
                user  = obj,
                defaults = {
                    'email':          obj.email,
                    'business_name':  form.cleaned_data.get('business_name', obj.first_name or obj.email),
                    'business_type':  form.cleaned_data.get('business_type', 'other'),
                    'phone_number':   form.cleaned_data.get('phone_number',  ''),
                    'address':        form.cleaned_data.get('address',       ''),
                    'bank_name':      form.cleaned_data.get('bank_name',     ''),
                    'account_number': form.cleaned_data.get('account_number',''),
                    'account_name':   form.cleaned_data.get('account_name',  ''),
                    'created_by':     request.user,
                }
            )

            from .utils import send_invite_email, set_invite_expiry
            try:
                set_invite_expiry(obj)
                send_invite_email(obj)
                self.message_user(request, f"✓ Merchant created and invite sent to {obj.email}.")
            except Exception as e:
                self.message_user(request, f"Merchant created but invite email failed: {e}", level='warning')

class OperatorUser(MonitorUser):
    class Meta:
        proxy               = True
        verbose_name        = 'Operator / Admin'
        verbose_name_plural = 'Operators & Admins'


class MerchantUser(MonitorUser):
    class Meta:
        proxy               = True
        verbose_name        = 'Merchant'
        verbose_name_plural = 'Merchants'


admin.site.register(OperatorUser, OperatorAdmin)
admin.site.register(MerchantUser, MerchantUserAdmin)