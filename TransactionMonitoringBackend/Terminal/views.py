from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.contrib.auth.hashers import make_password
from django.utils import timezone
from .models import Terminal, TerminalAssignmentLog
from .serializers import TerminalSerializer, TerminalAssignmentLogSerializer, TerminalListSerializer, TerminalAssignSerializer, PINResetSerializer
from Merchants.models import Merchant
from authentication.permissions import IsAdminOrAbove, IsOperatorOrAbove, IsSuperAdmin

class TerminalListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsOperatorOrAbove]

    def get(self, request):
        terminals = Terminal.objects.select_related('merchant').all()
        status_filter = request.query_params.get('status')
        merchant_filter = request.query_params.get('merchant')
        type_filter = request.query_params.get('terminal_type')
        search = request.query_params.get('search')

        if status_filter:
            terminals = terminals.filter(status=status_filter)
        if merchant_filter:
            terminals = terminals.filter(merchant__merchant_id=merchant_filter)
        if type_filter:
            terminals = terminals.filter(terminal_type=type_filter)
        if search:
            terminals = terminals.filter(serial_number__icontains=search) | \
                        terminals.filter(label__icontains=search) | \
                        terminals.filter(merchant__business_name__icontains=search)

        serializer = TerminalListSerializer(terminals, many=True)
        return Response({'count': terminals.count(), 'results': serializer.data})
    
    def post(self, request):
        if not IsAdminOrAbove().has_permission(request, self):
            return Response(
                {'error': 'Only admins and above can register terminals.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = TerminalSerializer(data=request.data)
        if serializer.is_valid():
            terminal = serializer.save(created_by=request.user)
            return Response(
                TerminalListSerializer(terminal).data,
                status=status.HTTP_201_CREATED,
            )
        
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )
        
class TerminalDetailView(APIView):
    permission_classes = [IsAuthenticated, IsOperatorOrAbove]

    def get_object(self, terminal_id):
        return get_object_or_404(Terminal, terminal_id=terminal_id)

    def get(self, request, terminal_id):
        terminal   = self.get_object(terminal_id)
        serializer = TerminalSerializer(terminal)
        return Response(serializer.data)

    def patch(self, request, terminal_id):
        if not IsAdminOrAbove().has_permission(request, self):
            return Response(
                {'error': 'Only admins and above can update terminals.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        terminal   = self.get_object(terminal_id)
        serializer = TerminalSerializer(terminal, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, terminal_id):
        if not IsAdminOrAbove().has_permission(request, self):
            return Response(
                {'error': 'Only admins and above can deactivate terminals.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        terminal        = self.get_object(terminal_id)
        terminal.status = 'inactive'
        terminal.save(update_fields=['status'])
        return Response({'message': f'Terminal {terminal.serial_number} deactivated.'})


class TerminalSuspendView(APIView):
    permission_classes = [IsAuthenticated, IsAdminOrAbove]

    def post(self, request, terminal_id):
        terminal = get_object_or_404(Terminal, terminal_id=terminal_id)
        if terminal.status == 'suspended':
            terminal.status = 'active'
            action = 'unsuspended'
        else:
            terminal.status = 'suspended'
            action = 'suspended'
        terminal.save(update_fields=['status'])
        return Response({
            'message': f'Terminal {terminal.serial_number} has been {action}.',
            'status':  terminal.status,
        })
    
class TerminalAssignView(APIView):
    permission_classes = [IsAuthenticated, IsAdminOrAbove]

    def post(self, request, terminal_id):
        terminal   = get_object_or_404(Terminal, terminal_id=terminal_id)
        serializer = TerminalAssignSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            new_merchant = Merchant.objects.get(
                merchant_id=serializer.validated_data['merchant_id']
            )
        except Merchant.DoesNotExist:
            return Response(
                {'error': 'Merchant not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        old_merchant = terminal.merchant

        TerminalAssignmentLog.objects.create(
            terminal      = terminal,
            from_merchant = old_merchant,
            to_merchant   = new_merchant,
            assigned_by   = request.user,
            note          = serializer.validated_data.get('note', ''),
        )

        terminal.merchant    = new_merchant
        terminal.assigned_by = request.user
        terminal.save(update_fields=['merchant', 'assigned_by'])

        return Response({
            'message':      f'Terminal {terminal.serial_number} reassigned to {new_merchant.business_name}.',
            'from_merchant': str(old_merchant),
            'to_merchant':   str(new_merchant),
        })


class TerminalPINResetView(APIView):
    permission_classes = [IsAuthenticated, IsAdminOrAbove]

    def post(self, request, terminal_id):
        terminal   = get_object_or_404(Terminal, terminal_id=terminal_id)
        serializer = PINResetSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        terminal.supervisor_pin    = make_password(serializer.validated_data['new_pin'])
        terminal.pin_reset_required = False
        terminal.save(update_fields=['supervisor_pin', 'pin_reset_required'])

        return Response({'message': f'PIN reset successfully for terminal {terminal.serial_number}.'})


class TerminalTransactionsView(APIView):
    permission_classes = [IsAuthenticated, IsOperatorOrAbove]

    def get(self, request, terminal_id):
        terminal = get_object_or_404(Terminal, terminal_id=terminal_id)
        from Transactions.serializers import TransactionSerializer
        transactions = terminal.transactions.all().order_by('-created_at')
        serializer   = TransactionSerializer(transactions, many=True)
        return Response({
            'terminal':      terminal.serial_number,
            'count':         transactions.count(),
            'transactions':  serializer.data,
        })


class TerminalAssignmentLogsView(APIView):
    permission_classes = [IsAuthenticated, IsOperatorOrAbove]

    def get(self, request, terminal_id):
        terminal = get_object_or_404(Terminal, terminal_id=terminal_id)
        logs     = terminal.assignment_logs.all()
        serializer = TerminalAssignmentLogSerializer(logs, many=True)
        return Response({'count': logs.count(), 'results': serializer.data})
