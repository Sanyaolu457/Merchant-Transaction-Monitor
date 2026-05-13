from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    CreateOperatorView,
    SetPasswordView,
    LoginView,
    LogoutView,
    ProfileView,
    ListOperatorsView,
    DeactivateOperatorView,
)

urlpatterns = [
    # Admin
    path('create-operator/', CreateOperatorView.as_view()),
    path('operators/', ListOperatorsView.as_view()),
    path('operators/<uuid:user_id>/deactivate/', DeactivateOperatorView.as_view()),

    # Invite
    path('set-password/', SetPasswordView.as_view()),

    # Auth
    path('login/', LoginView.as_view()),
    path("token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path('logout/', LogoutView.as_view()),
    path('profile/', ProfileView.as_view()),
]