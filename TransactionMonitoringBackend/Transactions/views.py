from rest_framework.views       import APIView
from rest_framework.response    import Response
from rest_framework             import status
from rest_framework.permissions import IsAuthenticated
from django.shortcuts           import get_object_or_404
from .models      import Transaction, TransactionAuditLog
from .serializers import (
    TransactionCreateSerializer,
    TransactionListSerializer,
    TransactionDetailSerializer,
    TransactionUpdateSerializer,
)


class TransactionListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        transactions = Transaction.objects.select_related(
            'merchant', 'channel', 'channel_detail'
        ).all()

        txn_status = request.query_params.get('status')
        if txn_status:
            transactions = transactions.filter(status=txn_status)

        is_flagged = request.query_params.get('is_flagged')
        if is_flagged is not None:
            transactions = transactions.filter(is_flagged=is_flagged.lower() == 'true')

        merchant = request.query_params.get('merchant')
        if merchant:
            transactions = transactions.filter(merchant__merchant_id=merchant)

        txn_type = request.query_params.get('type')
        if txn_type:
            transactions = transactions.filter(transaction_type=txn_type)

        search = request.query_params.get('search')
        if search:
            transactions = transactions.filter(
                customer_name__icontains=search
            ) | transactions.filter(
                reference__icontains=search
            )

        channel_detail = request.query_params.get('channel_detail')
        if channel_detail:
            transactions = transactions.filter(
                channel_detail__name__icontains=channel_detail
            )

        amount_min = request.query_params.get('amount_min')
        amount_max = request.query_params.get('amount_max')
        if amount_min:
            transactions = transactions.filter(amount__gte=amount_min)
        if amount_max:
            transactions = transactions.filter(amount__lte=amount_max)

        date_from = request.query_params.get('date_from')
        date_to   = request.query_params.get('date_to')
        if date_from:
            transactions = transactions.filter(created_at__date__gte=date_from)
        if date_to:
            transactions = transactions.filter(created_at__date__lte=date_to)

        count        = transactions.count()
        serializer   = TransactionListSerializer(transactions, many=True)
        return Response({"count": count, "results": serializer.data})

    def post(self, request):
        serializer = TransactionCreateSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TransactionDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, transaction_id):
        return get_object_or_404(
            Transaction.objects.select_related(
                'merchant', 'channel', 'channel_detail'
            ),
            transaction_id=transaction_id,
        )

    def get(self, request, transaction_id):
        return Response(TransactionDetailSerializer(self.get_object(transaction_id)).data)

    def patch(self, request, transaction_id):
        transaction = self.get_object(transaction_id)
        old_status  = transaction.status

        serializer = TransactionUpdateSerializer(
            transaction, data=request.data, partial=True
        )
        if serializer.is_valid():
            updated    = serializer.save()
            new_status = updated.status

            if old_status != new_status:
                TransactionAuditLog.objects.create(
                    transaction=updated,
                    old_status=old_status,
                    new_status=new_status,
                    changed_by=request.user,
                    reason=request.data.get('reason', ''),
                )

            return Response(TransactionDetailSerializer(updated).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class TransactionIngestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = TransactionCreateSerializer(data=request.data)
        if serializer.is_valid():
            txn = serializer.save()
            return Response({
                "status":    "received",
                "reference": txn.reference,
                "message":   "Transaction recorded successfully",
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def is_valid_key(self, key):
        from .models import APIKey
        return APIKey.objects.filter(key=key, is_active=True).exists()