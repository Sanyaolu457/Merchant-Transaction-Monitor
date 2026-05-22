from rest_framework.views       import APIView
from rest_framework.response    import Response
from rest_framework             import status
from rest_framework.permissions import IsAuthenticated
from django.shortcuts           import get_object_or_404
from .models      import Merchant
from authentication.models import MonitorUser
from authentication.utils  import send_invite_email, set_invite_expiry
from .serializers import MerchantSerializer, MerchantListSerializer
from authentication.permissions import (
    IsAdminOrAbove, IsOperatorOrAbove, CanSuspendMerchant,
)


class MerchantListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsOperatorOrAbove]

    def get(self, request):
        merchants = Merchant.objects.all()
 
        status_filter = request.query_params.get('status')
        if status_filter:
            merchants = merchants.filter(status=status_filter)
 
        search = request.query_params.get('search')
        if search:
            merchants = merchants.filter(business_name__icontains=search)
 
        serializer = MerchantListSerializer(merchants, many=True)
        return Response({"count": merchants.count(), "results": serializer.data})

    def post(self, request):
        if not IsAdminOrAbove().has_permission(request, self):
            return Response(
                {"error": "Only admins and above can create merchants."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = MerchantSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email']

        if MonitorUser.objects.filter(email=email).exists():
            user = MonitorUser.objects.get(email=email)
            if not hasattr(user, 'merchant_profile'):
                merchant = serializer.save(
                    created_by=request.user,
                    user=user
                )
            else:
                return Response(
                    {"error": "A merchant with this email already exists."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            user = MonitorUser.objects.create_user(
                email      = email,
                first_name = serializer.validated_data.get('business_name', ''),
                role       = 'user',
            )
            user.created_by = request.user
            set_invite_expiry(user)
            user.save()

            merchant = serializer.save(
                created_by=request.user,
                user=user,
            )

            try:
                send_invite_email(user)
            except Exception as e:
                print(f"Invite email failed: {e}")

        return Response(
            MerchantListSerializer(merchant).data,
            status=status.HTTP_201_CREATED
        )


class MerchantDetailView(APIView):
    permission_classes = [IsAuthenticated, IsOperatorOrAbove]

    def get_object(self, merchant_id):
        return get_object_or_404(Merchant, merchant_id=merchant_id)

    def get(self, request, merchant_id):
        return Response(MerchantSerializer(self.get_object(merchant_id)).data)

    def patch(self, request, merchant_id):
        if not IsAdminOrAbove().has_permission(request, self):
            return Response(
                {"error": "Only admins and above can update merchants."},
                status=status.HTTP_403_FORBIDDEN,
            )
        merchant   = self.get_object(merchant_id)
        serializer = MerchantSerializer(merchant, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, merchant_id):
        if not IsAdminOrAbove().has_permission(request, self):
            return Response(
                {"error": "Only admins and above can deactivate merchants."},
                status=status.HTTP_403_FORBIDDEN,
            )
        merchant        = self.get_object(merchant_id)
        merchant.status = 'inactive'
        merchant.save()
        return Response({"message": f"{merchant.business_name} deactivated."})


class MerchantSuspendView(APIView):
    permission_classes = [IsAuthenticated, CanSuspendMerchant]

    def post(self, request, merchant_id):
        merchant        = get_object_or_404(Merchant, merchant_id=merchant_id)
        currently_suspended = merchant.status == 'suspended'

        merchant.status = 'active' if currently_suspended else 'suspended'
        merchant.save(update_fields=['status'])

        action = 'unsuspended' if currently_suspended else 'suspended'
        return Response({
            "message": f"{merchant.business_name} has been {action}.",
            "status":  merchant.status,
        })

def _create_user_for_merchant(merchant, created_by=None):
    from authentication.models import MonitorUser
    from authentication.utils  import send_invite_email, set_invite_expiry

    if MonitorUser.objects.filter(email=merchant.email).exists():
        return

    user = MonitorUser.objects.create_user(
        email      = merchant.email,
        first_name = merchant.business_name,
        role       = 'user',
    )
    user.created_by = created_by
    set_invite_expiry(user)
    user.save()

    try:
        send_invite_email(user)
    except Exception:
        pass 