from __future__ import annotations

import secrets


def cuid() -> str:
    # Prisma-compatible length/prefix is not strictly required; keep stable c-prefixed id.
    return "c" + secrets.token_hex(12)
