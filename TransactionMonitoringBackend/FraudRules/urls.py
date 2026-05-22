from django.urls import path
from .views import (
    FlagRuleListCreateView,
    FlagRuleDetailView,
    FlagRuleToggleView,
    FlagRuleStatsView,
    TransactionFlagListView,
    AllFlaggedTransactionFlagsView,
    TransactionFlagView,
    TransactionFlagAuditView,
    AllFlagAuditLogsView,
    OperatorReportListCreateView,
    OperatorReportDetailView,
    OperatorReportResolveView,
)

urlpatterns = [
    path('rules/',                 FlagRuleListCreateView.as_view(), name='flagrule-list-create'),
    path('rules/stats/',           FlagRuleStatsView.as_view(),      name='flagrule-stats'),
    path('rules/<int:pk>/',        FlagRuleDetailView.as_view(),     name='flagrule-detail'),
    path('rules/<int:pk>/toggle/', FlagRuleToggleView.as_view(),     name='flagrule-toggle'),
    path( 'transactions/<uuid:transaction_id>/flags/', TransactionFlagListView.as_view(), name='transaction-flags',),
    path( 'transactions/<uuid:transaction_id>/flag-history/', TransactionFlagAuditView.as_view(), name='transaction-flag-history', ),
    path( 'transactions/<uuid:transaction_id>/flag/', TransactionFlagView.as_view(), name='transaction-flag-toggle', ),
    path('flags/',  AllFlaggedTransactionFlagsView.as_view(), name='all-flags'),
    path('flag-history/', AllFlagAuditLogsView.as_view(),           name='all-flag-history'),
    path('reports/',                         OperatorReportListCreateView.as_view(), name='report-list-create'),
    path('reports/<int:pk>/',                OperatorReportDetailView.as_view(),     name='report-detail'),
    path('reports/<int:pk>/resolve/',        OperatorReportResolveView.as_view(),    name='report-resolve'),
]