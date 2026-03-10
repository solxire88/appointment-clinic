from __future__ import annotations

import time
from dataclasses import dataclass


@dataclass
class SlidingWindowRule:
    window_ms: int
    max_requests: int


DEFAULT_RULES = [
    SlidingWindowRule(window_ms=60_000, max_requests=6),
    SlidingWindowRule(window_ms=3_600_000, max_requests=30),
]

_store: dict[str, list[float]] = {}


def check_rate_limit(key: str, rules: list[SlidingWindowRule] | None = None) -> tuple[bool, int | None]:
    now = time.time() * 1000
    active_rules = rules or DEFAULT_RULES
    max_window = max(rule.window_ms for rule in active_rules)
    recent_hits = [ts for ts in _store.get(key, []) if now - ts < max_window]

    for rule in active_rules:
        in_window = [ts for ts in recent_hits if now - ts < rule.window_ms]
        if len(in_window) >= rule.max_requests:
            oldest = in_window[0]
            retry_after = max(1, int((rule.window_ms - (now - oldest)) / 1000))
            _store[key] = recent_hits
            return False, retry_after

    recent_hits.append(now)
    _store[key] = recent_hits
    return True, None
