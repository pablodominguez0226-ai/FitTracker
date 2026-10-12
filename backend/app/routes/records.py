"""
Re-export records router and helpers for compatibility with app.routes.records
"""
from ..routers.records import *
from ..routers.records import router

__all__ = [
    "router",
    "compute_user_records",
    "get_records",
    "calculate_1rm",
    "calculate_prime_target",
    "calculate_relative_league",
]
