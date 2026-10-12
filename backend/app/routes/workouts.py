"""
Re-export workouts router and handlers for compatibility with app.routes.workouts
"""
from ..routers.workouts import *
from ..routers.workouts import router

__all__ = [
    "router",
    "get_user_records",
    "list_workouts",
    "get_active_workout",
    "start_workout",
    "record_workout_set",
    "add_workout_set",
    "update_workout_set",
    "delete_workout_set",
    "finish_workout",
    "create_workout",
    "save_workout_session",
    "get_workout",
    "delete_workout",
]
