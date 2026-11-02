"""
Re-export metrics router and helpers from app.routers.metrics
"""
from app.routers.metrics import (
    CANONICAL_MUSCLES_CONFIG,
    get_muscle_distribution,
    match_canonical_muscle,
    router,
)

__all__ = [
    "router",
    "CANONICAL_MUSCLES_CONFIG",
    "match_canonical_muscle",
    "get_muscle_distribution",
]
