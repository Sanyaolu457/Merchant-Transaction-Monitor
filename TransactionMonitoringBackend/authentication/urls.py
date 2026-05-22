from django.urls import path
from .views import (
    LoginView, LogoutView, SetPasswordView, SendOTPView, VerifyOTPView,
    ProfileView, CreateUserView, ListUsersView, MerchantSignupView,
    UserDetailView, ToggleUserActiveView, ResendInviteView,
)
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('auth/otp/send/',  SendOTPView.as_view(),  name='otp-send'),
    path('auth/otp/verify/',  VerifyOTPView.as_view(), name='otp-verify'),
    path('auth/signup/', MerchantSignupView.as_view(), name='merchant-signup'),
    path('auth/set-password/', SetPasswordView.as_view(), name='set-password'),
    path('auth/login/',        LoginView.as_view(),        name='login'),
    path('auth/logout/',       LogoutView.as_view(),       name='logout'),
    path('auth/token/refresh/',TokenRefreshView.as_view(), name='token-refresh'),
    path('auth/profile/',      ProfileView.as_view(),      name='profile'),

    path('auth/create-user/', CreateUserView.as_view(),  name='create-user'),
    path('auth/users/', ListUsersView.as_view(), name='list-users'),
    path('auth/users/<int:user_id>/',  UserDetailView.as_view(), name='user-detail'),
    path('auth/users/<int:user_id>/toggle/', ToggleUserActiveView.as_view(), name='toggle-active'),
    path('auth/users/<int:user_id>/resend/', ResendInviteView.as_view(),     name='resend-invite'),
]