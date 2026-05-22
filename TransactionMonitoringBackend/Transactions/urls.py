from django.urls import path
from .views import (
    TransactionListCreateView,
    TransactionDetailView,
    TransactionIngestView,
)
from .simulator_view import TransactionSimulatorControlView

urlpatterns = [
    path('',      TransactionListCreateView.as_view()),
    path('ingest/',    TransactionIngestView.as_view()),
    path('simulator/control/',  TransactionSimulatorControlView.as_view()),
    path('<uuid:transaction_id>/',  TransactionDetailView.as_view()),
]