from pathlib import Path

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

DATA_DIR = Path(__file__).resolve().parents[1] / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
DATABASE_URL = f"sqlite:///{DATA_DIR / 'fittracker.db'}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_database_schema() -> None:
    with engine.begin() as connection:
        exercise_columns = {
            row[1] for row in connection.exec_driver_sql("PRAGMA table_info(exercises)").fetchall()
        }
        if exercise_columns and "is_global" not in exercise_columns:
            connection.execute(text("ALTER TABLE exercises ADD COLUMN is_global BOOLEAN NOT NULL DEFAULT 1"))
        if exercise_columns and "user_id" not in exercise_columns:
            connection.execute(text("ALTER TABLE exercises ADD COLUMN user_id VARCHAR(80)"))

        for table_name in ("workouts", "measurements", "photos", "routines", "personal_records"):
            columns = {
                row[1] for row in connection.exec_driver_sql(f"PRAGMA table_info({table_name})").fetchall()
            }
            if columns and "user_id" not in columns:
                connection.execute(text(f"ALTER TABLE {table_name} ADD COLUMN user_id INTEGER"))

        record_indexes = connection.exec_driver_sql("PRAGMA index_list(personal_records)").fetchall()
        has_old_record_unique = False
        has_user_record_unique = False
        for index in record_indexes:
            index_name = index[1]
            is_unique = bool(index[2])
            if not is_unique:
                continue
            index_columns = [
                row[2] for row in connection.exec_driver_sql(f"PRAGMA index_info({index_name})").fetchall()
            ]
            if index_columns == ["exercise_id", "record_type"]:
                has_old_record_unique = True
            if index_columns == ["user_id", "exercise_id", "record_type"]:
                has_user_record_unique = True

        if has_old_record_unique and not has_user_record_unique:
            connection.execute(text("ALTER TABLE personal_records RENAME TO personal_records_old"))
            connection.execute(text("""
                CREATE TABLE personal_records (
                    id INTEGER NOT NULL,
                    user_id INTEGER,
                    exercise_id INTEGER NOT NULL,
                    record_type VARCHAR(20) NOT NULL,
                    value FLOAT NOT NULL,
                    weight FLOAT,
                    reps INTEGER,
                    achieved_at DATE NOT NULL,
                    PRIMARY KEY (id),
                    CONSTRAINT uq_user_exercise_record_type UNIQUE (user_id, exercise_id, record_type),
                    FOREIGN KEY(user_id) REFERENCES users (id),
                    FOREIGN KEY(exercise_id) REFERENCES exercises (id)
                )
            """))
            connection.execute(text("""
                INSERT INTO personal_records (id, user_id, exercise_id, record_type, value, weight, reps, achieved_at)
                SELECT id, user_id, exercise_id, record_type, value, weight, reps, achieved_at
                FROM personal_records_old
            """))
            connection.execute(text("DROP TABLE personal_records_old"))


def assign_legacy_data_to_first_user() -> None:
    with engine.begin() as connection:
        users_table = connection.exec_driver_sql("PRAGMA table_info(users)").fetchall()
        if not users_table:
            return
        first_user = connection.execute(text("SELECT id FROM users ORDER BY id ASC LIMIT 1")).fetchone()
        if first_user is None:
            return
        first_user_id = first_user[0]
        for table_name in ("workouts", "measurements", "photos", "routines", "personal_records"):
            columns = {
                row[1] for row in connection.exec_driver_sql(f"PRAGMA table_info({table_name})").fetchall()
            }
            if "user_id" in columns:
                connection.execute(text(f"UPDATE {table_name} SET user_id = :user_id WHERE user_id IS NULL"), {"user_id": first_user_id})
