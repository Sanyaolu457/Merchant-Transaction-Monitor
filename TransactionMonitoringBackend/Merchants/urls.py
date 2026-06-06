from django.urls import path
from .views import MerchantListCreateView, MerchantDetailView, MerchantSuspendView

urlpatterns = [
    path('merchants/',  MerchantListCreateView.as_view(), name='merchant-list'),
    path('merchants/<uuid:merchant_id>/', MerchantDetailView.as_view(),     name='merchant-detail'),
    path('merchants/<uuid:merchant_id>/suspend/', MerchantSuspendView.as_view(),    name='merchant-suspend'),
]