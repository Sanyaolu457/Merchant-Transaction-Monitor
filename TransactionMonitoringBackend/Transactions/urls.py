from django.urls import path
from .views import (
    TransactionListCreateView,
    TransactionDetailView,
    TransactionIngestView,
)
from .simulator_view import TransactionSimulatorControlView

urlpatterns = [
    path('transactions/',      TransactionListCreateView.as_view()),
    path('transactions/ingest/',    TransactionIngestView.as_view()),
    path('transactions/simulator/control/',  TransactionSimulatorControlView.as_view()),
    path('transactions/<uuid:transaction_id>/',  TransactionDetailView.as_view()),
]