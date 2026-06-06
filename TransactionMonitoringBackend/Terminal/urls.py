from django.urls import path
from .views import (
    TerminalListCreateView, TerminalDetailView,
    TerminalSuspendView, TerminalAssignView,
    TerminalPINResetView, TerminalTransactionsView,
    TerminalAssignmentLogsView,
)


urlpatterns = [
    path('terminals/', TerminalListCreateView.as_view(),    name='terminal-list'),
    path('terminals/<uuid:terminal_id>/', TerminalDetailView.as_view(),        name='terminal-detail'),
    path('terminals/<uuid:terminal_id>/suspend/', TerminalSuspendView.as_view(),       name='terminal-suspend'),
    path('terminals/<uuid:terminal_id>/assign/', TerminalAssignView.as_view(),        name='terminal-assign'),
    path('terminals/<uuid:terminal_id>/reset-pin/', TerminalPINResetView.as_view(),      name='terminal-reset-pin'),
    path('terminals/<uuid:terminal_id>/transactions/', TerminalTransactionsView.as_view(),  name='terminal-transactions'),
    path('terminals/<uuid:terminal_id>/logs/', TerminalAssignmentLogsView.as_view(),name='terminal-logs'),
]
