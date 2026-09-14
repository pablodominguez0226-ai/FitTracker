"""
Seed entrypoint for FitTracker.
Imports official seeds from app.db.seeds.
"""
from sqlalchemy.orm import Session
from .db.seeds import (
    DEFAULT_MUSCLE_GROUPS,
    OFFICIAL_EXERCISES_CATALOG,
    seed_initial_data,
)

if __name__ == "__main__":
    from .database import SessionLocal
    with SessionLocal() as session:
        seed_initial_data(session)
        print("Seed completado exitosamente.")
