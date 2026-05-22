from rest_framework.views       import APIView
from rest_framework.response    import Response
from rest_framework             import status
from rest_framework.permissions import IsAuthenticated
from django.shortcuts           import get_object_or_404
from django.db.models           import Count
from .models import ( FlagRule, TransactionFlag, FlagAuditLog, OperatorReport, )
from .serializers import ( FlagRuleSerializer, FlagRuleListSerializer,
    TransactionFlagSerializer, FlagAuditLogSerializer, OperatorReportCreateSerializer,
    OperatorReportListSerializer, OperatorReportDetailSerializer, OperatorReportResolveSerializer,
)
from authentication.permissions import (
    IsSuperAdmin, IsAdminOrAbove, IsOperatorOrAbove,
    CanFlagTransaction, ELEVATED_ROLES, get_role,
)
from Transactions.models import Transaction

def _create_flag_audit(transaction, action, user=None, reason=''):
    FlagAuditLog.objects.create(
        transaction  = transaction,
        action       = action,
        performed_by = user,
        reason       = reason,
    )

class FlagRuleListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsOperatorOrAbove]

    def get(self, request):
        rules = FlagRule.objects.select_related('merchant').annotate(
            triggered_count=Count('triggered_flags')
        )
        if rule_type := request.query_params.get('rule_type'):
            rules = rules.filter(rule_type=rule_type)
        if is_active := request.query_params.get('is_active'):
            rules = rules.filter(is_active=is_active.lower() == 'true')
        if merchant := request.query_params.get('merchant'):
            rules = rules.filter(merchant__merchant_id=merchant)
        if request.query_params.get('global', '').lower() == 'true':
            rules = rules.filter(merchant__isnull=True)
        if risk_level := request.query_params.get('risk_level'):
            rules = rules.filter(risk_level=risk_level)
        serializer = FlagRuleListSerializer(rules, many=True)
        return Response({'count': rules.count(), 'results': serializer.data})

    def post(self, request):
        if not IsAdminOrAbove().has_permission(request, self):
            return Response(
                {'detail': 'Only admins and above can create flag rules.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = FlagRuleSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class FlagRuleDetailView(APIView):
    permission_classes = [IsAuthenticated, IsOperatorOrAbove]

    def get_object(self, pk):
        return get_object_or_404(FlagRule.objects.select_related('merchant'), pk=pk)

    def get(self, request, pk):
        return Response(FlagRuleSerializer(self.get_object(pk)).data)

    def patch(self, request, pk):
        if not IsAdminOrAbove().has_permission(request, self):
            return Response(
                {'detail': 'Only admins and above can edit flag rules.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        rule       = self.get_object(pk)
        serializer = FlagRuleSerializer(rule, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        if not IsSuperAdmin().has_permission(request, self):
            return Response(
                {'detail': 'Only super admins can delete rules.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        self.get_object(pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class FlagRuleToggleView(APIView):
    permission_classes = [IsAuthenticated, IsAdminOrAbove]

    def post(self, request, pk):
        rule           = get_object_or_404(FlagRule, pk=pk)
        rule.is_active = not rule.is_active
        rule.save(update_fields=['is_active'])
        state = 'activated' if rule.is_active else 'deactivated'
        return Response({'message': f'Rule "{rule.name}" {state}.', 'is_active': rule.is_active})


class FlagRuleStatsView(APIView):
    permission_classes = [IsAuthenticated, IsOperatorOrAbove]

    def get(self, request):
        rules = FlagRule.objects.annotate(
            total_triggered=Count('triggered_flags')
        ).order_by('-total_triggered')
        return Response({'results': [
            {
                'id':              r.id,
                'name':            r.name,
                'rule_type':       r.rule_type,
                'weight':          r.weight,
                'risk_level':      r.risk_level,
                'is_active':       r.is_active,
                'total_triggered': r.total_triggered,
            }
            for r in rules
        ]})


class TransactionFlagListView(APIView):
    permission_classes = [IsAuthenticated, IsOperatorOrAbove]

    def get(self, request, transaction_id):
        transaction = get_object_or_404(Transaction, transaction_id=transaction_id)
        flags = TransactionFlag.objects.select_related('rule', 'transaction').filter(
            transaction=transaction
        )
        return Response({
            'transaction_reference': transaction.reference,
            'risk_score':            transaction.risk_score,
            'risk_level':            transaction.risk_level,
            'risk_reasons':          transaction.risk_reasons,
            'is_flagged':            transaction.is_flagged,
            'flag_count':            flags.count(),
            'flags':                 TransactionFlagSerializer(flags, many=True).data,
        })


class AllFlaggedTransactionFlagsView(APIView):
    permission_classes = [IsAuthenticated, IsOperatorOrAbove]

    def get(self, request):
        flags = TransactionFlag.objects.select_related(
            'rule', 'transaction', 'transaction__merchant'
        ).order_by('-flagged_at')
        if rule_id := request.query_params.get('rule'):
            flags = flags.filter(rule_id=rule_id)
        if risk_level := request.query_params.get('risk_level'):
            flags = flags.filter(rule__risk_level=risk_level)
        if merchant := request.query_params.get('merchant'):
            flags = flags.filter(transaction__merchant__merchant_id=merchant)
        serializer = TransactionFlagSerializer(flags, many=True)
        return Response({'count': flags.count(), 'results': serializer.data})


class TransactionFlagAuditView(APIView):
    permission_classes = [IsAuthenticated, IsOperatorOrAbove]

    def get(self, request, transaction_id):
        transaction = get_object_or_404(Transaction, transaction_id=transaction_id)
        logs = FlagAuditLog.objects.select_related('performed_by', 'transaction').filter(
            transaction=transaction
        )
        return Response({
            'transaction_reference': transaction.reference,
            'current_flag_status':   transaction.is_flagged,
            'history':               FlagAuditLogSerializer(logs, many=True).data,
        })


class AllFlagAuditLogsView(APIView):
    permission_classes = [IsAuthenticated, IsOperatorOrAbove]

    def get(self, request):
        logs = FlagAuditLog.objects.select_related(
            'transaction', 'transaction__merchant', 'performed_by'
        ).order_by('-timestamp')
        if action := request.query_params.get('action'):
            logs = logs.filter(action=action)
        if merchant := request.query_params.get('merchant'):
            logs = logs.filter(transaction__merchant__merchant_id=merchant)
        if date_from := request.query_params.get('date_from'):
            logs = logs.filter(timestamp__date__gte=date_from)
        if date_to := request.query_params.get('date_to'):
            logs = logs.filter(timestamp__date__lte=date_to)
        if request.query_params.get('unflagged_only', '').lower() == 'true':
            logs = logs.filter(action='unflagged')
        return Response({'count': logs.count(), 'results': FlagAuditLogSerializer(logs, many=True).data})


class TransactionFlagView(APIView):
    permission_classes = [IsAuthenticated, CanFlagTransaction]

    def post(self, request, transaction_id):
        transaction       = get_object_or_404(Transaction, transaction_id=transaction_id)
        currently_flagged = transaction.is_flagged

        if currently_flagged:
            if not CanFlagTransaction.can_unflag(request.user):
                return Response(
                    {'detail': 'Only admins can remove a flag. Submit a report if you disagree with this flag.'},
                    status=status.HTTP_403_FORBIDDEN,
                )
            reason = request.data.get('reason', '').strip()
            if not reason:
                return Response(
                    {'detail': 'A reason is required when unflagging a transaction.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            action = 'unflagged'
        else:
            if not CanFlagTransaction.can_flag(request.user):
                return Response(
                    {'detail': 'You do not have permission to flag transactions.'},
                    status=status.HTTP_403_FORBIDDEN,
                )
            reason = request.data.get('reason', '').strip()
            action = 'flagged'

        transaction.is_flagged = not transaction.is_flagged
        transaction.save(update_fields=['is_flagged'])
        _create_flag_audit(transaction=transaction, action=action, user=request.user, reason=reason)

        return Response({
            'message':    f'Transaction {action} successfully.',
            'is_flagged': transaction.is_flagged,
            'reference':  transaction.reference,
        })

class OperatorReportListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsOperatorOrAbove]

    def get(self, request):
        reports = OperatorReport.objects.select_related(
            'transaction', 'submitted_by', 'resolved_by'
        )
        if get_role(request.user) not in ELEVATED_ROLES:
            reports = reports.filter(submitted_by=request.user)
        if sev := request.query_params.get('severity'):
            reports = reports.filter(severity=sev)
        if st := request.query_params.get('status'):
            reports = reports.filter(status=st)
        if merchant := request.query_params.get('merchant'):
            reports = reports.filter(transaction__merchant__merchant_id=merchant)
        serializer = OperatorReportListSerializer(reports, many=True)
        return Response({'count': reports.count(), 'results': serializer.data})

    def post(self, request):
        serializer = OperatorReportCreateSerializer(
            data=request.data, context={'request': request},
        )
        if serializer.is_valid():
            serializer.save(submitted_by=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class OperatorReportDetailView(APIView):
    permission_classes = [IsAuthenticated, IsOperatorOrAbove]

    def get_object(self, pk, user):
        report = get_object_or_404(
            OperatorReport.objects.select_related('transaction', 'submitted_by', 'resolved_by'),
            pk=pk,
        )
        if get_role(user) not in ELEVATED_ROLES and report.submitted_by != user:
            return None
        return report

    def get(self, request, pk):
        report = self.get_object(pk, request.user)
        if report is None:
            return Response(
                {'detail': 'Report not found or you do not have access to it.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(OperatorReportDetailSerializer(report).data)


class OperatorReportResolveView(APIView):
    permission_classes = [IsAuthenticated, IsAdminOrAbove]

    def patch(self, request, pk):
        report     = get_object_or_404(OperatorReport, pk=pk)
        serializer = OperatorReportResolveSerializer(report, data=request.data, partial=True)
        if serializer.is_valid():
            instance = serializer.save(resolved_by=request.user)
            return Response(OperatorReportDetailSerializer(instance).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)