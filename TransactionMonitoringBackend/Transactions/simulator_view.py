import random
import threading
import logging
from decimal  import Decimal
from datetime import timedelta
from django.utils import timezone
from rest_framework.views       import APIView
from rest_framework.response    import Response
from rest_framework             import status
from rest_framework.permissions import IsAuthenticated
from Merchants.models import Merchant
from .models          import Transaction, Channel, ChannelDetail
from FraudRules.risk_engine import RiskEngine

logger = logging.getLogger(__name__)

_simulator_state = {
    "running":    False,
    "thread":     None,
    "interval":   3,
    "created":    0,
    "started_at": None,
}
_state_lock = threading.Lock()

_FIRST = [
    "Chioma","Emeka","Fatima","Seun","Tunde","Amara",
    "Ngozi","Kayode","Biodun","Zainab","Ifeanyi","Yemi",
    "Bode","Sade","Chidi","Uche","Funmi","Gbenga",
]
_LAST = [
    "Adeyemi","Okonkwo","Balogun","Musa","Eze","Nwosu",
    "Ibrahim","Okafor","Adeleke","Lawal","Okeke","Chukwu",
    "Adesanya","Babatunde","Nnamdi","Olawale",
]
_DEVICE_IDS = [f"DEV-{i:04d}" for i in range(1, 30)]
_IP_POOL = [
    "102.89.45.1","105.112.3.22","197.210.64.5","41.58.200.10",
    "196.1.149.33","154.120.0.1","41.184.200.1","102.0.0.1",
]
_LOCATIONS = [
    "Lagos, NG","Abuja, NG","Kano, NG","Port Harcourt, NG",
    "Ibadan, NG","Enugu, NG","Kaduna, NG","Benin City, NG",
]
_STATUS_WEIGHTS = [
    ("completed",  55), ("pending",    20), ("failed",     12),
    ("processing",  8), ("reversed",    5),
]
_TYPE_WEIGHTS = [
    ("payment",      35), ("transfer",     25), ("card_payment", 20),
    ("bill_payment", 10), ("deposit",       7), ("withdrawal",    3),
]
 
def _weighted(pairs):
    population = [v for v, w in pairs for _ in range(w)]
    return random.choice(population)
 
def _random_amount():
    tier = random.random()
    if tier < 0.45: return Decimal(random.randint(500,        49_999))
    if tier < 0.70: return Decimal(random.randint(50_000,    249_999))
    if tier < 0.85: return Decimal(random.randint(250_000,   999_999))
    if tier < 0.95: return Decimal(random.randint(1_000_000, 4_999_999))
    return Decimal(random.randint(5_000_000, 20_000_000))
 
def _create_one_transaction():
    merchants = list(Merchant.objects.filter(status="active").values_list("id", flat=True))
    if not merchants: return None
 
    channels = list(Channel.objects.values_list("id", flat=True))
    if not channels: return None
 
    channel_id      = random.choice(channels)
    channel_details = list(ChannelDetail.objects.filter(channel_id=channel_id).values_list("id", flat=True))
    if not channel_details: return None
 
    roll = random.random()
 
    if roll < 0.12:
        recent = (Transaction.objects
                  .filter(created_at__gte=timezone.now() - timedelta(minutes=5))
                  .order_by('-created_at')[:20])
        if recent:
            src           = random.choice(list(recent))
            customer_name = src.customer_name
            amount        = src.amount
            merchant_id   = src.merchant_id or random.choice(merchants)
        else:
            customer_name = f"{random.choice(_FIRST)} {random.choice(_LAST)}"
            amount        = _random_amount()
            merchant_id   = random.choice(merchants)
 
    elif roll < 0.22:
        recent_names = list(
            Transaction.objects
            .filter(created_at__gte=timezone.now() - timedelta(minutes=10))
            .values_list('customer_name', flat=True)
            .distinct()[:10]
        )
        customer_name = random.choice(recent_names) if recent_names else f"{random.choice(_FIRST)} {random.choice(_LAST)}"
        amount        = _random_amount()
        merchant_id   = random.choice(merchants)
 
    elif roll < 0.30:
        recent_devices = list(
            Transaction.objects
            .filter(
                created_at__gte=timezone.now() - timedelta(minutes=2),
                device_id__isnull=False,
            )
            .values_list('device_id', flat=True)
            .distinct()[:5]
        )
        device_id     = random.choice(recent_devices) if recent_devices else random.choice(_DEVICE_IDS)
        customer_name = f"{random.choice(_FIRST)} {random.choice(_LAST)}"
        amount        = _random_amount()
        merchant_id   = random.choice(merchants)
 
        txn = Transaction.objects.create(
            merchant_id       = merchant_id,
            customer_name     = customer_name,
            amount            = amount,
            transaction_type  = _weighted(_TYPE_WEIGHTS),
            status            = _weighted(_STATUS_WEIGHTS),
            channel_id        = channel_id,
            channel_detail_id = random.choice(channel_details),
            ip_address        = random.choice(_IP_POOL),
            device_id         = device_id,          # forced reuse
            location          = random.choice(_LOCATIONS),
        )
        txn.refresh_from_db()
        RiskEngine.evaluate(txn)
        return txn
 
    else:
        customer_name = f"{random.choice(_FIRST)} {random.choice(_LAST)}"
        amount        = _random_amount()
        merchant_id   = random.choice(merchants)
 
    device_id = random.choice(_DEVICE_IDS) if random.random() < 0.30 else None
 
    txn = Transaction.objects.create(
        merchant_id       = merchant_id,
        customer_name     = customer_name,
        amount            = amount,
        transaction_type  = _weighted(_TYPE_WEIGHTS),
        status            = _weighted(_STATUS_WEIGHTS),
        channel_id        = channel_id,
        channel_detail_id = random.choice(channel_details),
        ip_address        = random.choice(_IP_POOL),
        device_id         = device_id,
        location          = random.choice(_LOCATIONS),
    )
 
    if random.random() < 0.15:
        today  = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        offset = timedelta(hours=random.choice([23, 0, 1, 2, 3]), minutes=random.randint(0, 59))
        Transaction.objects.filter(pk=txn.pk).update(created_at=today + offset)
 
    txn.refresh_from_db()
    RiskEngine.evaluate(txn)
    return txn



def _simulator_loop(interval_seconds):
    while True:
        with _state_lock:
            if not _simulator_state["running"]:
                break
        try:
            txn = _create_one_transaction()
            if txn:
                with _state_lock:
                    _simulator_state["created"] += 1
                logger.debug(
                    "Simulator created %s | risk_level=%s | risk_score=%s "
                    "| is_flagged=%s | reasons=%s",
                    txn.reference, txn.risk_level, txn.risk_score,
                    txn.is_flagged, txn.risk_reasons,
                )
        except Exception as e:
            logger.error("Simulator error: %s", e, exc_info=True)

        slept = 0.0
        while slept < interval_seconds:
            with _state_lock:
                if not _simulator_state["running"]:
                    return
            threading.Event().wait(0.5)
            slept += 0.5


class TransactionSimulatorControlView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        action = request.data.get("action")

        if action not in ("start", "stop", "status"):
            return Response(
                {"error": "action must be 'start', 'stop', or 'status'"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if action == "status":
            with _state_lock:
                return Response(self._status_payload())

        if action == "stop":
            with _state_lock:
                if not _simulator_state["running"]:
                    return Response({"message": "Simulator is not running."})
                _simulator_state["running"] = False
            _simulator_state["thread"].join(timeout=5)
            with _state_lock:
                _simulator_state["thread"] = None
                return Response({
                    "message":       "Simulator stopped.",
                    "total_created": _simulator_state["created"],
                })

        with _state_lock:
            if _simulator_state["running"]:
                return Response(
                    {"message": "Already running.", **self._status_payload()},
                    status=status.HTTP_200_OK,
                )
            try:
                interval = max(1, int(request.data.get("interval", 3)))
            except (TypeError, ValueError):
                interval = 3

            _simulator_state.update({
                "running":    True,
                "interval":   interval,
                "created":    0,
                "started_at": timezone.now().isoformat(),
            })

            thread = threading.Thread(
                target=_simulator_loop,
                args=(interval,),
                daemon=True,
                name="txn-simulator",
            )
            _simulator_state["thread"] = thread

        thread.start()
        return Response({
            "message": f"Simulator started. 1 transaction every {interval}s.",
            **self._status_payload(),
        }, status=status.HTTP_200_OK)

    @staticmethod
    def _status_payload():
        return {
            "running":    _simulator_state["running"],
            "interval_s": _simulator_state["interval"],
            "created":    _simulator_state["created"],
            "started_at": _simulator_state["started_at"],
        }