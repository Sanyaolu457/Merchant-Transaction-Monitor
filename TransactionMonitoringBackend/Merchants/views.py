from rest_framework.views    import APIView
from rest_framework.response import Response
from rest_framework          import status
from rest_framework.permissions import IsAuthenticated
from .models       import Merchant
from .serializers  import MerchantSerializer, MerchantListSerializer


class MerchantListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        merchants  = Merchant.objects.all()

        status_filter = request.query_params.get('status')
        if status_filter:
            merchants = merchants.filter(status=status_filter)

        
        search = request.query_params.get('search')
        if search:
            merchants = merchants.filter(business_name__icontains=search)

        serializer = MerchantListSerializer(merchants, many=True)
        return Response({
            "count":   merchants.count(),
            "results": serializer.data
        })

    def post(self, request):
        if request.user.role != 'super_admin':
            return Response(
                {"error": "Only admin can create merchants"},
                status=status.HTTP_403_FORBIDDEN
            )
        serializer = MerchantSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(created_by=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class MerchantDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, merchant_id):
        try:
            return Merchant.objects.get(merchant_id=merchant_id)
        except Merchant.DoesNotExist:
            return None

    def get(self, request, merchant_id):
        merchant = self.get_object(merchant_id)
        if not merchant:
            return Response({"error": "Merchant not found"}, status=status.HTTP_404_NOT_FOUND)
        serializer = MerchantSerializer(merchant)
        return Response(serializer.data)

    def patch(self, request, merchant_id):
        if request.user.role != 'super_admin':
            return Response(
                {"error": "Only admin can update merchants"},
                status=status.HTTP_403_FORBIDDEN
            )
        merchant = self.get_object(merchant_id)
        if not merchant:
            return Response({"error": "Merchant not found"}, status=status.HTTP_404_NOT_FOUND)
        serializer = MerchantSerializer(merchant, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, merchant_id):
        if request.user.role != 'super_admin':
            return Response(
                {"error": "Only admin can deactivate merchants"},
                status=status.HTTP_403_FORBIDDEN
            )
        merchant = self.get_object(merchant_id)
        if not merchant:
            return Response({"error": "Merchant not found"}, status=status.HTTP_404_NOT_FOUND)
        merchant.status = 'inactive'
        merchant.save()
        return Response({"message": f"{merchant.business_name} deactivated"})