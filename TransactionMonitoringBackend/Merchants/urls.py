from django.urls import path
from .views import MerchantListCreateView, MerchantDetailView, MerchantSuspendView

urlpatterns = [
    path('',  MerchantListCreateView.as_view(), name='merchant-list'),
    path('<uuid:merchant_id>/', MerchantDetailView.as_view(),     name='merchant-detail'),
    path('<uuid:merchant_id>/suspend/', MerchantSuspendView.as_view(),    name='merchant-suspend'),
]