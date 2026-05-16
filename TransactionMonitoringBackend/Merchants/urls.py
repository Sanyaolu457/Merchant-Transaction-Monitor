from django.urls import path
from .views import MerchantListCreateView, MerchantDetailView

urlpatterns = [
    path('',  MerchantListCreateView.as_view()),
    path('merchants/<uuid:merchant_id>/', MerchantDetailView.as_view()),
]