from sqlalchemy.orm import Session

from . import models

PUSH_LEGS = [
    "Press Inclinado Barra", "Press Inclinado Mancuernas", "Press Plano Barra",
    "Cruce Polea Medio", "Cruce Polea Alto-Bajo", "Press Militar",
    "Elevaciones Laterales", "Face Pull", "Extensión Tríceps Sobre Cabeza",
    "Jalón Tríceps", "Press Cerrado", "Sentadilla", "Prensa", "Extensión Cuádriceps",
]

PULL_POSTERIOR = [
    "Jalón al Pecho", "Remo Alto", "Remo con Barra", "Remo Sentado", "Peso Muerto",
    "Encogimientos", "Remo al Mentón", "Curl Inclinado", "Curl Scott", "Curl Martillo",
    "Curl EZ", "Peso Muerto Rumano", "Hip Thrust", "Gemelos",
]


def seed_initial_data(db: Session) -> None:
    if db.query(models.Exercise).first():
        return

    exercise_map: dict[str, models.Exercise] = {}
    for name in PUSH_LEGS + PULL_POSTERIOR:
        muscle = "Pecho/Hombro/Tríceps/Pierna" if name in PUSH_LEGS else "Espalda/Bíceps/Posterior"
        exercise = models.Exercise(name=name, muscle_group=muscle, min_reps=8, max_reps=12, default_sets=4, is_global=True)
        db.add(exercise)
        exercise_map[name] = exercise
    db.flush()

    routines = [
        ("Lunes/Jueves", "Lunes,Jueves", PUSH_LEGS),
        ("Martes/Viernes", "Martes,Viernes", PULL_POSTERIOR),
    ]
    for routine_name, days, exercise_names in routines:
        routine = models.Routine(name=routine_name, days=days)
        db.add(routine)
        db.flush()
        for index, name in enumerate(exercise_names, start=1):
            db.add(models.RoutineExercise(routine_id=routine.id, exercise_id=exercise_map[name].id, position=index))

    db.add(models.Measurement(weight=80, waist=86, chest=102, arm=38, leg=60, calf=39, goal_weight=75))
    db.commit()
