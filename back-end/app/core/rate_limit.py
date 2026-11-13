from collections import OrderedDict
from threading import Lock
from time import monotonic
from fastapi import HTTPException, Request

_buckets = OrderedDict()
_lock = Lock()


def check_rate_limit(request: Request, action: str, limit: int, seconds: int):
    # Trust the socket peer, never an unverified X-Forwarded-For header.
    key = (request.client.host if request.client else 'unknown', action)
    now = monotonic()
    with _lock:
        for old_key in list(_buckets):
            if _buckets[old_key][0] <= now - seconds:
                del _buckets[old_key]
        start, count = _buckets.get(key, (now, 0))
        if count >= limit:
            raise HTTPException(429, 'Demasiadas tentativas. Tente novamente mais tarde.',
                                headers={'Retry-After': str(max(1, int(start + seconds - now)))})
        _buckets[key] = (start, count + 1)
        if len(_buckets) > 10000:
            _buckets.popitem(last=False)
