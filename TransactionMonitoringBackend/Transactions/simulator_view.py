import random
import threading
import logging
from decimal  import Decimal
from django.utils import timezone

from rest_framework.views       import APIView
from rest_framework.response    import Response
from rest_framework             import status
from rest_framework.permissions import IsAuthenticated

from Merchants.models import Merchant
from .models          import Transaction, Channel, ChannelDetail

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
    "Chioma", "Emeka", "Fatima", "Seun", "Tunde", "Amara",
    "Ngozi",  "Kayode","Biodun", "Zainab","Ifeanyi","Yemi",
    "Bode",   "Sade",  "Chidi",  "Uche",  "Funmi", "Gbenga",
]
_LAST = [
    "Adeyemi","Okonkwo","Balogun","Musa","Eze","Nwosu",
    "Ibrahim","Okafor", "Adeleke","Lawal","Okeke","Chukwu",
    "Adesanya","Okeke","Lawal","Babatunde","Nnamdi","Olawale",
]

_STATUS_WEIGHTS = [
    ("completed",  55),
    ("pending",    20),
    ("failed",     12),
    ("processing",  8),
    ("reversed",    5),
]

_TYPE_WEIGHTS = [
    ("payment",      35),
    ("transfer",     25),
    ("card_payment", 20),
    ("bill_payment", 10),
    ("deposit",       7),
    ("withdrawal",    3),
]


def _weighted(pairs):
    population = [v for v, w in pairs for _ in range(w)]
    return random.choice(population)


def _random_amount():
    tier = random.random()
    if tier < 0.50:
        return Decimal(random.randint(500,       9_999))
    if tier < 0.80:
        return Decimal(random.randint(10_000,   99_999))
    if tier < 0.95:
        return Decimal(random.randint(100_000,  999_999))
    return Decimal(random.randint(1_000_000, 4_999_999))


def _create_one_transaction():
    valid_types    = [c[0] for c in Transaction.TRANSACTION_TYPE]
    valid_statuses = [c[0] for c in Transaction.TRANSACTION_STATUS]

    merchants = list(
        Merchant.objects.filter(status="active").values_list("id", flat=True)
    )
    if not merchants:
        return None

    channels = list(Channel.objects.values_list("id", flat=True))
    if not channels:
        return None

    channel_id      = random.choice(channels)
    channel_details = list(
        ChannelDetail.objects.filter(channel_id=channel_id)
        .values_list("id", flat=True)
    )
    if not channel_details:
        return None

    txn_type   = _weighted(_TYPE_WEIGHTS)
    txn_status = _weighted(_STATUS_WEIGHTS)

    if txn_type   not in valid_types:    txn_type   = valid_types[0]
    if txn_status not in valid_statuses: txn_status = valid_statuses[0]

    txn = Transaction.objects.create(
        merchant_id       = random.choice(merchants),
        customer_name     = f"{random.choice(_FIRST)} {random.choice(_LAST)}",
        amount            = _random_amount(),
        transaction_type  = txn_type,
        status            = txn_status,
        channel_id        = channel_id,
        channel_detail_id = random.choice(channel_details),
        is_flagged        = random.random() < 0.08,
    )
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
        except Exception as e:
            logger.error(f"Simulator error: {e}")

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

            _simulator_state["running"]    = True
            _simulator_state["interval"]   = interval
            _simulator_state["created"]    = 0
            _simulator_state["started_at"] = timezone.now().isoformat()

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